require('dotenv').config();

const express = require('express');
const router = express.Router();
const dbType = process.env.DB_TYPE || 'memory';
const db = dbType === 'postgres' ? require('../database/postgres-adapter') : require('../database/db-memory');
const Joi = require('joi');

// Validation schemas
const productSchema = Joi.object({
    article_number: Joi.string().required(),
    name: Joi.string().required(),
    category_id: Joi.number().integer().required(),
    supplier_id: Joi.number().integer().required(),
    price: Joi.number().positive().required(),
    stock: Joi.number().integer().min(0).default(0),
    min_stock: Joi.number().integer().min(0).default(0),
    max_stock: Joi.number().integer().min(0).default(1000),
    unit: Joi.string().default('kg'),
    storage_location: Joi.string().optional(),
    shelf_life_days: Joi.number().integer().min(1).default(7),
    description: Joi.string().optional(),
    allergens: Joi.string().optional(),
    nutritional_info: Joi.string().optional(),
    status: Joi.string().valid('active', 'inactive').default('active')
});

const updateProductSchema = productSchema.fork(
    ['article_number', 'name', 'category_id', 'supplier_id', 'price'],
    (schema) => schema.optional()
);

// Helper function to get tenant ID
function getTenantId(req, res, next) {
    // In a real app, this would come from authentication
    // For now, we'll use a header or default to 1
    const tenantKey = req.headers['x-tenant-id'] || 'demo';
    
    // For PostgreSQL, we'll use tenant ID directly
    if (process.env.DB_TYPE === 'postgres') {
        // Always use tenant ID 1 for demo
        req.tenantId = 1;
    } else {
        // Use findAll method compatible with in-memory database
        const tenants = db.data.tenants || [];
        const tenant = tenants.find(t => t.tenant_key === tenantKey);
        
        if (!tenant) {
            return res.status(404).json({ error: 'Tenant not found' });
        }
        
        req.tenantId = tenant.id;
    }
    next();
}

// Apply tenant middleware to all routes
router.use(getTenantId);

// GET /api/products - Get all products
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, search, category, supplier, status } = req.query;
        
        // Check if using memory database
        console.log(`DB has getProducts method: ${!!db.getProducts}`);
        console.log(`DB has data property: ${!!db.data}`);
        
        // Use NEW article system method if available
        if (db.getProducts) {
            console.log('Using NEW article system: db.getProducts method');
            const filters = {
                tenant_id: req.tenantId,
                search,
                category,
                supplier_id: supplier,
                status
            };
            
            const products = await db.getProducts(filters);
            
            // Pagination
            const startIndex = (parseInt(page) - 1) * parseInt(limit);
            const endIndex = startIndex + parseInt(limit);
            const paginatedProducts = products.slice(startIndex, endIndex);
            
            res.json({
                success: true,
                items: paginatedProducts,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalItems: products.length,
                    totalPages: Math.ceil(products.length / parseInt(limit))
                }
            });
            return;
        }
        
        // Handle in-memory database
        if (db.data && db.data.products) {
            let products = db.data.products.filter(p => p.tenant_id === req.tenantId);
            
            // Apply filters
            if (search) {
                const searchLower = search.toLowerCase();
                products = products.filter(p => 
                    p.name.toLowerCase().includes(searchLower) ||
                    (p.article_number && p.article_number.toLowerCase().includes(searchLower))
                );
            }
            
            if (category) {
                products = products.filter(p => p.category === category || p.category_id === parseInt(category));
            }
            
            if (supplier) {
                products = products.filter(p => p.supplier_id === parseInt(supplier));
            }
            
            if (status) {
                products = products.filter(p => p.status === status);
            }
            
            // Sort by name
            products.sort((a, b) => a.name.localeCompare(b.name));
            
            // Paginate
            const totalItems = products.length;
            const totalPages = Math.ceil(totalItems / limit);
            const offset = (page - 1) * limit;
            const paginatedProducts = products.slice(offset, offset + parseInt(limit));
            
            // Enrich with supplier info
            paginatedProducts.forEach(product => {
                if (product.supplier_id) {
                    const supplier = db.data.suppliers.find(s => s.id === product.supplier_id);
                    if (supplier) {
                        product.supplier = {
                            id: supplier.id,
                            name: supplier.name,
                            contact_person: supplier.contact_person,
                            email: supplier.email
                        };
                    }
                }
            });
            
            res.json({
                items: paginatedProducts,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalItems,
                    totalPages
                }
            });
        } else {
            // If memory database is not initialized
            res.json({
                items: [],
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalItems: 0,
                    totalPages: 0
                }
            });
        }
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/products/:id - Get single product
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Use NEW article system method if available
        if (db.getProductById) {
            console.log('Using NEW article system: db.getProductById method');
            
            const product = await db.getProductById(parseInt(id));
            
            if (!product) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Product not found' 
                });
            }
            
            // Check tenant access
            if (product.tenant_id !== req.tenantId && product.tenant_id !== 1) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Product not found' 
                });
            }
            
            res.json({
                success: true,
                data: product
            });
            return;
        }
        
        // Legacy fallback
        const product = await db.findById('products', id, req.tenantId);
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // Enrich with category and supplier info
        if (product.category_id) {
            product.category = await db.get('SELECT * FROM product_categories WHERE id = ?', [product.category_id]);
        }
        if (product.supplier_id) {
            product.supplier = await db.get('SELECT * FROM suppliers WHERE id = ?', [product.supplier_id]);
        }
        
        res.json(product);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/products - Create new product
router.post('/', async (req, res) => {
    try {
        const { error, value } = productSchema.validate(req.body);
        
        if (error) {
            return res.status(400).json({ 
                error: 'Validation error', 
                details: error.details 
            });
        }
        
        // Check if article number already exists
        const existingProduct = await db.get(
            'SELECT id FROM products WHERE article_number = ? AND tenant_id = ?',
            [value.article_number, req.tenantId]
        );
        
        if (existingProduct) {
            return res.status(400).json({ 
                error: 'Article number already exists' 
            });
        }
        
        // Add tenant_id to product data
        value.tenant_id = req.tenantId;
        
        const product = await db.create('products', value);
        
        // Enrich with category and supplier info
        if (product.category_id) {
            product.category = await db.get('SELECT * FROM product_categories WHERE id = ?', [product.category_id]);
        }
        if (product.supplier_id) {
            product.supplier = await db.get('SELECT * FROM suppliers WHERE id = ?', [product.supplier_id]);
        }
        
        res.status(201).json(product);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/products/:id - Update product
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error, value } = updateProductSchema.validate(req.body);
        
        if (error) {
            return res.status(400).json({ 
                error: 'Validation error', 
                details: error.details 
            });
        }
        
        // Check if product exists
        const existingProduct = await db.findById('products', id, req.tenantId);
        if (!existingProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // Check if article number already exists (if being updated)
        if (value.article_number && value.article_number !== existingProduct.article_number) {
            const duplicateProduct = await db.get(
                'SELECT id FROM products WHERE article_number = ? AND tenant_id = ? AND id != ?',
                [value.article_number, req.tenantId, id]
            );
            
            if (duplicateProduct) {
                return res.status(400).json({ 
                    error: 'Article number already exists' 
                });
            }
        }
        
        const product = await db.update('products', id, value, req.tenantId);
        
        // Enrich with category and supplier info
        if (product.category_id) {
            product.category = await db.get('SELECT * FROM product_categories WHERE id = ?', [product.category_id]);
        }
        if (product.supplier_id) {
            product.supplier = await db.get('SELECT * FROM suppliers WHERE id = ?', [product.supplier_id]);
        }
        
        res.json(product);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if product exists
        const existingProduct = await db.findById('products', id, req.tenantId);
        if (!existingProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // Check if product is used in recipes
        const usedInRecipes = await db.get(
            'SELECT COUNT(*) as count FROM recipe_ingredients WHERE product_id = ?',
            [id]
        );
        
        if (usedInRecipes.count > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete product that is used in recipes' 
            });
        }
        
        const deleted = await db.delete('products', id, req.tenantId);
        
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).json({ error: 'Product not found' });
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/products/categories - Get all product categories
router.get('/categories/all', async (req, res) => {
    try {
        const categories = await db.query('SELECT * FROM product_categories ORDER BY name ASC');
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/products/low-stock - Get products with low stock
router.get('/stock/low', async (req, res) => {
    try {
        const products = await db.query(
            `SELECT p.*, pc.name as category_name, s.name as supplier_name 
             FROM products p 
             LEFT JOIN product_categories pc ON p.category_id = pc.id
             LEFT JOIN suppliers s ON p.supplier_id = s.id
             WHERE p.tenant_id = ? AND p.stock <= p.min_stock
             ORDER BY p.stock ASC`,
            [req.tenantId]
        );
        
        res.json(products);
    } catch (error) {
        console.error('Error fetching low stock products:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/products/:id/stock - Update product stock
router.put('/:id/stock', async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, reason, notes } = req.body;
        
        if (!quantity || !reason) {
            return res.status(400).json({ 
                error: 'Quantity and reason are required' 
            });
        }
        
        // Check if product exists
        const product = await db.findById('products', id, req.tenantId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        const newStock = product.stock + quantity;
        
        if (newStock < 0) {
            return res.status(400).json({ 
                error: 'Cannot reduce stock below zero' 
            });
        }
        
        // Use transaction to update stock and create inventory transaction
        await db.transaction(async (db) => {
            // Update product stock
            await db.update('products', id, { stock: newStock }, req.tenantId);
            
            // Create inventory transaction
            await db.create('inventory_transactions', {
                tenant_id: req.tenantId,
                product_id: id,
                transaction_type: quantity > 0 ? 'in' : 'out',
                quantity: Math.abs(quantity),
                reference_type: 'manual',
                notes: notes || `Stock ${reason}`
            });
        });
        
        const updatedProduct = await db.findById('products', id, req.tenantId);
        res.json(updatedProduct);
        
    } catch (error) {
        console.error('Error updating stock:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/products/:id/alternatives - Get alternative supplier articles
router.get('/:id/alternatives', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Use NEW article system method if available
        if (db.getProductById) {
            const product = await db.getProductById(parseInt(id));
            
            if (!product) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Product not found' 
                });
            }
            
            // Check tenant access
            if (product.tenant_id !== req.tenantId && product.tenant_id !== 1) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Product not found' 
                });
            }
            
            res.json({
                success: true,
                data: {
                    current_article: {
                        id: product.id,
                        name: product.name,
                        article_number: product.article_number,
                        supplier_name: product.supplier_name,
                        price: product.price,
                        quality_grade: product.quality_grade,
                        organic: product.organic,
                        regional: product.regional
                    },
                    alternatives: product.alternatives || [],
                    neutral_article: product.neutral_article
                }
            });
            return;
        }
        
        res.status(404).json({ 
            success: false,
            error: 'Alternatives not available with current database setup' 
        });
    } catch (error) {
        console.error('Error fetching product alternatives:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/products/neutral/:neutralId/suppliers - Get all suppliers for neutral article
router.get('/neutral/:neutralId/suppliers', async (req, res) => {
    try {
        const { neutralId } = req.params;
        
        if (db.data && db.data.supplier_articles) {
            const alternatives = db.data.supplier_articles
                .filter(article => 
                    article.neutral_article_id === parseInt(neutralId) && 
                    article.status === 'active' &&
                    (article.tenant_id === req.tenantId || article.tenant_id === 1)
                )
                .map(article => {
                    const supplier = db.data.suppliers.find(s => s.id === article.supplier_id);
                    return {
                        id: article.id,
                        article_number: article.article_number,
                        name: article.name,
                        supplier_id: article.supplier_id,
                        supplier_name: supplier?.name || 'Unbekannt',
                        price: article.price,
                        unit: article.unit,
                        quality_grade: article.quality_grade,
                        organic: article.organic,
                        regional: article.regional,
                        fairtrade: article.fairtrade,
                        lead_time_days: article.lead_time_days,
                        availability: article.availability,
                        nutrition: article.nutrition,
                        allergens: article.allergens
                    };
                })
                .sort((a, b) => a.price - b.price); // Sortiert nach Preis
            
            const neutralArticle = db.data.neutral_articles.find(n => n.id === parseInt(neutralId));
            
            res.json({
                success: true,
                data: {
                    neutral_article: neutralArticle,
                    supplier_articles: alternatives,
                    total_suppliers: alternatives.length
                }
            });
            return;
        }
        
        res.status(404).json({ 
            success: false,
            error: 'Supplier comparison not available' 
        });
    } catch (error) {
        console.error('Error fetching supplier comparison:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;