const express = require('express');
const router = express.Router();
const db = require('../database/db-memory');
const Joi = require('joi');

// Validation schemas
const supplierSchema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string().optional(),
    contact_person: Joi.string().optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().optional(),
    address: Joi.string().optional(),
    rating: Joi.number().min(0).max(5).default(0),
    status: Joi.string().valid('active', 'inactive').default('active')
});

const updateSupplierSchema = supplierSchema.fork(['name'], (schema) => schema.optional());

// Helper function to get tenant ID
function getTenantId(req, res, next) {
    const tenantKey = req.headers['x-tenant-id'] || 'demo';

    // For demo tenant, use simplified logic
    if (tenantKey === 'demo') {
        req.tenantId = 1; // Default tenant ID for demo
        return next();
    }

    // Use findAll method compatible with in-memory database
    const tenants = db.data.tenants || [];
    const tenant = tenants.find(t => t.tenant_key === tenantKey);

    if (!tenant) {
        // Fallback to demo tenant
        req.tenantId = 1;
        return next();
    }

    req.tenantId = tenant.id;
    next();
}

// Apply tenant middleware to all routes
router.use(getTenantId);

// GET /api/suppliers - Get all suppliers
router.get('/', async (req, res) => {
    try {
        console.log('[SUPPLIERS] GET request received');
        const { page = 1, limit = 10, search, status } = req.query;
        const tenantId = req.tenantId;
        console.log('[SUPPLIERS] TenantId:', tenantId, 'Query:', req.query);

        // Get all suppliers from memory database
        let suppliers = db.data.suppliers || [];

        // Filter by tenant
        suppliers = suppliers.filter(s => s.tenant_id === tenantId || s.tenant_id === 'demo' || s.tenant_id === 1);

        // Apply search filter
        if (search) {
            const searchLower = search.toLowerCase();
            suppliers = suppliers.filter(s =>
                (s.name && s.name.toLowerCase().includes(searchLower)) ||
                (s.contact_person && s.contact_person.toLowerCase().includes(searchLower)) ||
                (s.email && s.email.toLowerCase().includes(searchLower))
            );
        }

        // Apply status filter
        if (status) {
            suppliers = suppliers.filter(s => s.status === status);
        }

        // Sort by name
        suppliers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        // Enrich with product count
        const products = db.data.products || [];
        suppliers = suppliers.map(supplier => {
            const productCount = products.filter(p =>
                p.supplier_id === supplier.id &&
                (p.tenant_id === tenantId || p.tenant_id === 'demo' || p.tenant_id === 1)
            ).length;
            return { ...supplier, products_count: productCount };
        });

        // Paginate results
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedItems = suppliers.slice(startIndex, endIndex);

        const result = {
            items: paginatedItems,
            total: suppliers.length,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(suppliers.length / limit)
        };

        res.json(result);
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/suppliers/:id - Get single supplier
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;

        // Find supplier in memory database
        const suppliers = db.data.suppliers || [];
        const supplier = suppliers.find(s =>
            s.id === parseInt(id) &&
            (s.tenant_id === tenantId || s.tenant_id === 'demo' || s.tenant_id === 1)
        );

        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        // Get supplier's products from memory
        const products = (db.data.products || []).filter(p =>
            p.supplier_id === parseInt(id) &&
            (p.tenant_id === tenantId || p.tenant_id === 'demo' || p.tenant_id === 1)
        ).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        
        supplier.products = products;
        supplier.products_count = products.length;
        
        res.json(supplier);
    } catch (error) {
        console.error('Error fetching supplier:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/suppliers - Create new supplier
router.post('/', async (req, res) => {
    try {
        const { error, value } = supplierSchema.validate(req.body);
        
        if (error) {
            return res.status(400).json({ 
                error: 'Validation error', 
                details: error.details 
            });
        }
        
        // Check if supplier name already exists
        const existingSupplier = await db.get(
            'SELECT id FROM suppliers WHERE name = ? AND tenant_id = ?',
            [value.name, req.tenantId]
        );
        
        if (existingSupplier) {
            return res.status(400).json({ 
                error: 'Supplier name already exists' 
            });
        }
        
        // Add tenant_id to supplier data
        value.tenant_id = req.tenantId;
        value.products_count = 0;
        
        const supplier = await db.create('suppliers', value);
        
        res.status(201).json(supplier);
    } catch (error) {
        console.error('Error creating supplier:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/suppliers/:id - Update supplier
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error, value } = updateSupplierSchema.validate(req.body);
        
        if (error) {
            return res.status(400).json({ 
                error: 'Validation error', 
                details: error.details 
            });
        }
        
        // Check if supplier exists
        const existingSupplier = await db.findById('suppliers', id, req.tenantId);
        if (!existingSupplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        
        // Check if supplier name already exists (if being updated)
        if (value.name && value.name !== existingSupplier.name) {
            const duplicateSupplier = await db.get(
                'SELECT id FROM suppliers WHERE name = ? AND tenant_id = ? AND id != ?',
                [value.name, req.tenantId, id]
            );
            
            if (duplicateSupplier) {
                return res.status(400).json({ 
                    error: 'Supplier name already exists' 
                });
            }
        }
        
        const supplier = await db.update('suppliers', id, value, req.tenantId);
        
        res.json(supplier);
    } catch (error) {
        console.error('Error updating supplier:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/suppliers/:id - Delete supplier
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if supplier exists
        const existingSupplier = await db.findById('suppliers', id, req.tenantId);
        if (!existingSupplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        
        // Check if supplier has products
        const hasProducts = await db.get(
            'SELECT COUNT(*) as count FROM products WHERE supplier_id = ? AND tenant_id = ?',
            [id, req.tenantId]
        );
        
        if (hasProducts.count > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete supplier that has products' 
            });
        }
        
        const deleted = await db.delete('suppliers', id, req.tenantId);
        
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Supplier not found' });
        }
    } catch (error) {
        console.error('Error deleting supplier:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/suppliers/:id/rate - Rate a supplier
router.post('/:id/rate', async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;
        
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ 
                error: 'Rating must be between 1 and 5' 
            });
        }
        
        // Check if supplier exists
        const supplier = await db.findById('suppliers', id, req.tenantId);
        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        
        // Update supplier rating (simple average for now)
        const updatedSupplier = await db.update('suppliers', id, { rating }, req.tenantId);
        
        // In a real app, you'd store individual ratings in a separate table
        // For now, we'll just update the average rating
        
        res.json({
            message: 'Supplier rated successfully',
            supplier: updatedSupplier,
            rating,
            comment
        });
        
    } catch (error) {
        console.error('Error rating supplier:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/suppliers/:id/products - Get supplier's products
router.get('/:id/products', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if supplier exists
        const supplier = await db.findById('suppliers', id, req.tenantId);
        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        
        const products = await db.query(
            `SELECT p.*, pc.name as category_name 
             FROM products p 
             LEFT JOIN product_categories pc ON p.category_id = pc.id
             WHERE p.supplier_id = ? AND p.tenant_id = ? 
             ORDER BY p.name ASC`,
            [id, req.tenantId]
        );
        
        res.json(products);
    } catch (error) {
        console.error('Error fetching supplier products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/suppliers/:id/orders - Get supplier's orders
router.get('/:id/orders', async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;
        
        // Check if supplier exists
        const supplier = await db.findById('suppliers', id, req.tenantId);
        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        
        const options = {
            where: 'supplier_id = ?',
            params: [id],
            orderBy: 'order_date DESC'
        };
        
        const result = await db.paginate('orders', parseInt(page), parseInt(limit), req.tenantId, options);
        
        // Enrich with order items
        for (let order of result.items) {
            const items = await db.query(
                `SELECT oi.*, p.name as product_name 
                 FROM order_items oi 
                 JOIN products p ON oi.product_id = p.id 
                 WHERE oi.order_id = ?`,
                [order.id]
            );
            order.items = items;
        }
        
        res.json(result);
    } catch (error) {
        console.error('Error fetching supplier orders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;