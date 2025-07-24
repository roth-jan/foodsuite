const express = require('express');
const router = express.Router();
const db = require('../database/db-memory');
const { updateRealisticInventory, generateInventoryAlerts } = require('../scripts/update-realistic-inventory');

// Note: tenantId is already set by server.js middleware

// GET /api/inventory - Get inventory overview
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 50, search, category, status } = req.query;
        
        let products = db.data.products.filter(p => p.tenant_id === req.tenantId || p.tenant_id === 'demo' || p.tenant_id === 1);
        
        // Add stock status to each product
        products = products.map(product => {
            const stockPercentage = product.stock / (product.max_stock || product.stock * 2);
            let stock_status = 'normal';
            
            if (product.stock <= 0) {
                stock_status = 'out_of_stock';
            } else if (product.stock <= product.min_stock) {
                stock_status = 'critical';
            } else if (stockPercentage < 0.3) {
                stock_status = 'low';
            } else if (stockPercentage > 0.8) {
                stock_status = 'high';
            }
            
            return {
                ...product,
                stock_status,
                stock_percentage: Math.round(stockPercentage * 100),
                value: product.stock * product.price,
                days_until_empty: product.consumption_rate_per_day ? 
                    Math.floor(product.stock / product.consumption_rate_per_day) : null
            };
        });
        
        // Apply filters
        if (search) {
            const searchLower = search.toLowerCase();
            products = products.filter(p => 
                p.name.toLowerCase().includes(searchLower) ||
                (p.category && p.category.toLowerCase().includes(searchLower))
            );
        }
        
        if (category) {
            products = products.filter(p => p.category === category);
        }
        
        if (status) {
            products = products.filter(p => p.stock_status === status);
        }
        
        // Sort by stock status priority, then by name
        const statusPriority = { 'out_of_stock': 0, 'critical': 1, 'low': 2, 'normal': 3, 'high': 4 };
        products.sort((a, b) => {
            if (statusPriority[a.stock_status] !== statusPriority[b.stock_status]) {
                return statusPriority[a.stock_status] - statusPriority[b.stock_status];
            }
            return a.name.localeCompare(b.name);
        });
        
        // Pagination
        const totalItems = products.length;
        const totalPages = Math.ceil(totalItems / limit);
        const offset = (page - 1) * limit;
        const paginatedProducts = products.slice(offset, offset + parseInt(limit));
        
        res.json({
            items: paginatedProducts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalItems,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            },
            categories: [...new Set(db.data.products.map(p => p.category))].filter(Boolean)
        });
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/inventory/transactions - Get inventory transactions
router.get('/transactions', async (req, res) => {
    try {
        const { page = 1, limit = 10, product_id, type } = req.query;
        
        // For now, return empty transactions
        res.json({
            items: [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalItems: 0,
                totalPages: 0,
                hasNextPage: false,
                hasPreviousPage: false
            }
        });
    } catch (error) {
        console.error('Error fetching inventory transactions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/inventory/summary - Get inventory summary
router.get('/summary', async (req, res) => {
    try {
        const products = db.data.products.filter(p => p.tenant_id === req.tenantId || p.tenant_id === 'demo' || p.tenant_id === 1);
        
        // Calculate summary statistics
        const totalProducts = products.length;
        const lowStockCount = products.filter(p => p.stock <= p.min_stock).length;
        const outOfStockCount = products.filter(p => p.stock <= 0).length;
        const totalValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
        const avgStock = products.length > 0 ? products.reduce((sum, p) => sum + p.stock, 0) / products.length : 0;
        
        // Top products by value
        const topProducts = products
            .map(p => ({
                ...p,
                value: p.stock * p.price
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
        
        // Low stock products
        const lowStockProducts = products
            .filter(p => p.stock <= p.min_stock)
            .sort((a, b) => a.stock - b.stock)
            .slice(0, 10)
            .map(p => ({
                id: p.id,
                name: p.name,
                stock: p.stock,
                min_stock: p.min_stock,
                unit: p.unit,
                category: p.category,
                days_left: p.consumption_rate_per_day ? Math.floor(p.stock / p.consumption_rate_per_day) : null
            }));
        
        // Generate alerts
        const alerts = generateInventoryAlerts(products);
        
        // Category breakdown
        const categoryBreakdown = products.reduce((acc, product) => {
            const category = product.category || 'Sonstige';
            if (!acc[category]) {
                acc[category] = { count: 0, value: 0, low_stock: 0 };
            }
            acc[category].count++;
            acc[category].value += product.stock * product.price;
            if (product.stock <= product.min_stock) {
                acc[category].low_stock++;
            }
            return acc;
        }, {});
        
        res.json({
            summary: {
                total_products: totalProducts,
                low_stock_count: lowStockCount,
                out_of_stock_count: outOfStockCount,
                total_value: Math.round(totalValue * 100) / 100,
                avg_stock: Math.round(avgStock * 100) / 100,
                critical_alerts: alerts.critical.length,
                low_stock_alerts: alerts.low.length
            },
            topProducts,
            lowStockProducts,
            alerts,
            categoryBreakdown,
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching inventory summary:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/inventory/update-realistic - Update inventory with realistic values
router.post('/update-realistic', async (req, res) => {
    try {
        // This endpoint doesn't need tenant validation since it updates all products
        const result = updateRealisticInventory();
        res.json(result);
    } catch (error) {
        console.error('Error updating realistic inventory:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/inventory/alerts - Get inventory alerts
router.get('/alerts', async (req, res) => {
    try {
        const products = db.data.products.filter(p => p.tenant_id === req.tenantId || p.tenant_id === 'demo' || p.tenant_id === 1);
        const alerts = generateInventoryAlerts(products);
        
        res.json(alerts);
    } catch (error) {
        console.error('Error fetching inventory alerts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/inventory/consume - Simulate consumption for meal planning
router.post('/consume', async (req, res) => {
    try {
        const { recipe_id, portions } = req.body;
        
        // Find recipe
        const recipe = db.data.recipes.find(r => r.id === parseInt(recipe_id) && (r.tenant_id === req.tenantId || r.tenant_id === 'demo' || r.tenant_id === 1));
        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        
        // Simulate ingredient consumption
        const consumptionLog = [];
        const scaleFactor = portions / (recipe.portions || 1);
        
        // Simple mapping of common ingredients to products
        const ingredientMapping = {
            'Kartoffeln': ['Kartoffeln festkochend', 'Kartoffeln mehlig'],
            'Rindfleisch': ['Rindfleisch Gulasch'],
            'Hähnchen': ['Hähnchenbrust', 'Hähnchenschnitzel'],
            'Schwein': ['Schweineschnitzel'],
            'Reis': ['Reis Basmati'],
            'Nudeln': ['Nudeln Penne'],
            'Milch': ['Milch 3.5%'],
            'Eier': ['Eier'],
            'Zwiebeln': ['Zwiebeln'],
            'Möhren': ['Möhren']
        };
        
        // Estimate consumption based on recipe
        Object.entries(ingredientMapping).forEach(([ingredient, productNames]) => {
            if (recipe.name.toLowerCase().includes(ingredient.toLowerCase())) {
                productNames.forEach(productName => {
                    const product = db.data.products.find(p => 
                        p.name === productName && (p.tenant_id === req.tenantId || p.tenant_id === 'demo' || p.tenant_id === 1)
                    );
                    
                    if (product && product.stock > 0) {
                        // Estimate consumption (simplified logic)
                        let consumptionAmount = Math.max(1, Math.round(scaleFactor * (product.consumption_rate_per_day || 5)));
                        consumptionAmount = Math.min(consumptionAmount, product.stock);
                        
                        // Update stock
                        product.stock -= consumptionAmount;
                        product.last_used = new Date().toISOString();
                        
                        consumptionLog.push({
                            product_id: product.id,
                            product_name: product.name,
                            amount_consumed: consumptionAmount,
                            remaining_stock: product.stock,
                            unit: product.unit
                        });
                    }
                });
            }
        });
        
        res.json({
            success: true,
            recipe_name: recipe.name,
            portions_prepared: portions,
            consumption_log: consumptionLog,
            message: `Zutaten für ${recipe.name} (${portions} Portionen) wurden vom Lager abgebucht`
        });
        
    } catch (error) {
        console.error('Error consuming inventory:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/inventory/availability/:recipe_id - Check if enough ingredients for recipe
router.get('/availability/:recipe_id', async (req, res) => {
    try {
        const { recipe_id } = req.params;
        const { portions = 1 } = req.query;
        
        const recipe = db.data.recipes.find(r => r.id === parseInt(recipe_id) && (r.tenant_id === req.tenantId || r.tenant_id === 'demo' || r.tenant_id === 1));
        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        
        // Check availability (simplified)
        const availability = {
            recipe_id: parseInt(recipe_id),
            recipe_name: recipe.name,
            requested_portions: parseInt(portions),
            can_prepare: true,
            missing_ingredients: [],
            available_portions: recipe.portions || 1
        };
        
        res.json(availability);
        
    } catch (error) {
        console.error('Error checking ingredient availability:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;