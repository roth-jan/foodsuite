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
        const suppliers = db.data.suppliers || [];
        const existingSupplier = suppliers.find(s =>
            s.name === value.name &&
            (s.tenant_id === req.tenantId || s.tenant_id === 'demo' || s.tenant_id === 1)
        );

        if (existingSupplier) {
            return res.status(400).json({
                error: 'Supplier name already exists'
            });
        }
        
        // Add tenant_id to supplier data
        value.tenant_id = req.tenantId;
        value.products_count = 0;
        value.id = Math.max(0, ...(db.data.suppliers || []).map(s => s.id || 0)) + 1;
        value.created_at = new Date().toISOString();
        value.updated_at = new Date().toISOString();

        // Add to in-memory database
        if (!db.data.suppliers) db.data.suppliers = [];
        db.data.suppliers.push(value);

        const supplier = value;
        
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
        const suppliers = db.data.suppliers || [];
        const existingSupplier = suppliers.find(s =>
            s.id === parseInt(id) &&
            (s.tenant_id === req.tenantId || s.tenant_id === 'demo' || s.tenant_id === 1)
        );
        if (!existingSupplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        
        // Check if supplier name already exists (if being updated)
        if (value.name && value.name !== existingSupplier.name) {
            const duplicateSupplier = suppliers.find(s =>
                s.name === value.name &&
                (s.tenant_id === req.tenantId || s.tenant_id === 'demo' || s.tenant_id === 1) &&
                s.id !== parseInt(id)
            );

            if (duplicateSupplier) {
                return res.status(400).json({
                    error: 'Supplier name already exists'
                });
            }
        }

        // Update supplier in memory
        Object.assign(existingSupplier, value, { updated_at: new Date().toISOString() });
        const supplier = existingSupplier;
        
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
        const suppliers = db.data.suppliers || [];
        const existingSupplier = suppliers.find(s =>
            s.id === parseInt(id) &&
            (s.tenant_id === req.tenantId || s.tenant_id === 'demo' || s.tenant_id === 1)
        );
        if (!existingSupplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        
        // Check if supplier has products
        const products = db.data.products || [];
        const hasProducts = products.some(p =>
            p.supplier_id === parseInt(id) &&
            (p.tenant_id === req.tenantId || p.tenant_id === 'demo' || p.tenant_id === 1)
        );

        if (hasProducts) {
            return res.status(400).json({
                error: 'Cannot delete supplier that has products'
            });
        }

        // Delete supplier from memory
        const index = db.data.suppliers.indexOf(existingSupplier);
        if (index > -1) {
            db.data.suppliers.splice(index, 1);
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
        const suppliers = db.data.suppliers || [];
        const supplier = suppliers.find(s =>
            s.id === parseInt(id) &&
            (s.tenant_id === req.tenantId || s.tenant_id === 'demo' || s.tenant_id === 1)
        );
        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        // Update supplier rating (simple average for now)
        supplier.rating = rating;
        supplier.updated_at = new Date().toISOString();
        const updatedSupplier = supplier;
        
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
        const suppliers = db.data.suppliers || [];
        const supplier = suppliers.find(s =>
            s.id === parseInt(id) &&
            (s.tenant_id === req.tenantId || s.tenant_id === 'demo' || s.tenant_id === 1)
        );
        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        // Get products for this supplier
        const products = (db.data.products || []).filter(p =>
            p.supplier_id === parseInt(id) &&
            (p.tenant_id === req.tenantId || p.tenant_id === 'demo' || p.tenant_id === 1)
        );

        // Add category names
        const categories = db.data.product_categories || [];
        const productsWithCategory = products.map(p => {
            const category = categories.find(c => c.id === p.category_id);
            return { ...p, category_name: category ? category.name : null };
        }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        
        res.json(productsWithCategory);
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
        const suppliers = db.data.suppliers || [];
        const supplier = suppliers.find(s =>
            s.id === parseInt(id) &&
            (s.tenant_id === req.tenantId || s.tenant_id === 'demo' || s.tenant_id === 1)
        );
        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        // Get orders for this supplier
        let orders = (db.data.orders || []).filter(o =>
            o.supplier_id === parseInt(id) &&
            (o.tenant_id === req.tenantId || o.tenant_id === 'demo' || o.tenant_id === 1)
        );

        // Sort by order date descending
        orders.sort((a, b) => new Date(b.order_date || 0) - new Date(a.order_date || 0));

        // Paginate results
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedOrders = orders.slice(startIndex, endIndex);

        // Enrich with order items
        const orderItems = db.data.order_items || [];
        const products = db.data.products || [];
        for (let order of paginatedOrders) {
            const items = orderItems.filter(oi => oi.order_id === order.id);
            order.items = items.map(item => {
                const product = products.find(p => p.id === item.product_id);
                return { ...item, product_name: product ? product.name : null };
            });
        }

        const result = {
            items: paginatedOrders,
            total: orders.length,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(orders.length / limit)
        };
        
        res.json(result);
    } catch (error) {
        console.error('Error fetching supplier orders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;