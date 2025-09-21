// BUSINESS LOGIC MODULE - Core calculations and integrations
const express = require('express');
const router = express.Router();
const db = require('../database/db-memory');

// ========================================
// 1. RECIPE COST CALCULATION
// ========================================

// Calculate actual recipe cost from ingredients
router.post('/api/recipes/:id/calculate-cost', async (req, res) => {
    try {
        const recipeId = parseInt(req.params.id);
        const tenantId = req.tenantId || 1;

        // Get recipe
        const recipes = db.data.recipes || [];
        const recipe = recipes.find(r => r.id === recipeId &&
            (r.tenant_id === tenantId || r.tenant_id === 'demo' || r.tenant_id === 1));

        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        // Get recipe ingredients with articles
        const ingredients = db.data.recipe_ingredients_new || [];
        const recipeIngredients = ingredients.filter(i => i.recipe_id === recipeId);

        // Get supplier articles for pricing
        const supplierArticles = db.data.supplier_articles || [];

        let totalCost = 0;
        let costDetails = [];

        for (const ingredient of recipeIngredients) {
            // Find the supplier article
            const article = supplierArticles.find(a =>
                a.id === ingredient.supplier_article_id ||
                a.article_number === ingredient.supplier_article_id
            );

            if (article) {
                // Calculate cost for this ingredient
                const quantity = parseFloat(ingredient.quantity) || 0;
                const pricePerUnit = parseFloat(article.price_per_unit) || 0;
                const ingredientCost = quantity * pricePerUnit;

                totalCost += ingredientCost;

                costDetails.push({
                    article_name: article.name,
                    supplier: article.supplier_name,
                    quantity: quantity,
                    unit: article.unit,
                    price_per_unit: pricePerUnit,
                    total_cost: ingredientCost.toFixed(2)
                });
            }
        }

        // Calculate cost per portion
        const portions = recipe.portions || 1;
        const costPerPortion = totalCost / portions;

        // Update recipe with calculated cost
        recipe.cost_per_portion = costPerPortion;
        recipe.total_cost = totalCost;
        recipe.cost_calculated_at = new Date().toISOString();

        res.json({
            recipe_id: recipeId,
            recipe_name: recipe.name,
            portions: portions,
            total_cost: totalCost.toFixed(2),
            cost_per_portion: costPerPortion.toFixed(2),
            cost_details: costDetails,
            calculation_date: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error calculating recipe cost:', error);
        res.status(500).json({ error: 'Failed to calculate recipe cost' });
    }
});

// ========================================
// 2. GOODS RECEIPT → INVENTORY UPDATE
// ========================================

router.post('/api/goods-receipt/process', async (req, res) => {
    try {
        const { receipt_id } = req.body;
        const tenantId = req.tenantId || 1;

        // Get the goods receipt
        const receipts = db.data.goods_receipts || [];
        const receipt = receipts.find(r => r.id === receipt_id);

        if (!receipt) {
            return res.status(404).json({ error: 'Receipt not found' });
        }

        // Get receipt items
        const receiptItems = db.data.goods_receipt_items || [];
        const items = receiptItems.filter(i => i.receipt_id === receipt_id);

        let inventoryUpdates = [];

        for (const item of items) {
            // Find the product
            const products = db.data.products || [];
            const product = products.find(p => p.id === item.product_id);

            if (product) {
                // Calculate new inventory values
                const oldStock = parseFloat(product.stock) || 0;
                const oldValue = oldStock * (parseFloat(product.price) || 0);

                const newQuantity = parseFloat(item.quantity) || 0;
                const newPrice = parseFloat(item.unit_price) || product.price;
                const newValue = newQuantity * newPrice;

                // Calculate new average price (weighted average)
                const totalStock = oldStock + newQuantity;
                const totalValue = oldValue + newValue;
                const newAveragePrice = totalStock > 0 ? totalValue / totalStock : newPrice;

                // Update product stock and price
                product.stock = totalStock;
                product.price = newAveragePrice;
                product.last_restock_date = new Date().toISOString();
                product.last_receipt_id = receipt_id;

                // Create inventory transaction
                const transaction = {
                    id: Math.max(0, ...(db.data.inventory_transactions || []).map(t => t.id || 0)) + 1,
                    tenant_id: tenantId,
                    product_id: product.id,
                    type: 'receipt',
                    quantity: newQuantity,
                    unit_price: newPrice,
                    total_value: newValue,
                    reference_type: 'goods_receipt',
                    reference_id: receipt_id,
                    timestamp: new Date().toISOString(),
                    stock_before: oldStock,
                    stock_after: totalStock,
                    price_before: product.price,
                    price_after: newAveragePrice
                };

                if (!db.data.inventory_transactions) db.data.inventory_transactions = [];
                db.data.inventory_transactions.push(transaction);

                inventoryUpdates.push({
                    product_id: product.id,
                    product_name: product.name,
                    quantity_added: newQuantity,
                    new_stock: totalStock,
                    new_average_price: newAveragePrice.toFixed(2)
                });
            }
        }

        // Mark receipt as processed
        receipt.processed = true;
        receipt.processed_at = new Date().toISOString();

        res.json({
            success: true,
            receipt_id: receipt_id,
            items_processed: inventoryUpdates.length,
            inventory_updates: inventoryUpdates
        });

    } catch (error) {
        console.error('Error processing goods receipt:', error);
        res.status(500).json({ error: 'Failed to process goods receipt' });
    }
});

// ========================================
// 3. UNIT/PACKAGE CONVERSION
// ========================================

router.post('/api/convert-units', async (req, res) => {
    try {
        const { value, from_unit, to_unit, article_id } = req.body;

        // Conversion factors (base unit = kg for weight, L for volume, piece for count)
        const conversions = {
            // Weight conversions
            'kg': 1,
            'g': 0.001,
            'mg': 0.000001,
            't': 1000,
            'lb': 0.453592,

            // Volume conversions
            'L': 1,
            'ml': 0.001,
            'cl': 0.01,
            'dl': 0.1,

            // Package conversions (need article-specific data)
            'Kiste': null,  // Depends on article
            'Karton': null,
            'Palette': null,
            'Sack': null,
            'Fass': null
        };

        // If article_id provided, get article-specific conversions
        if (article_id) {
            const articles = db.data.supplier_articles || [];
            const article = articles.find(a => a.id === article_id);

            if (article && article.package_size) {
                // Example: "10kg Sack" means 1 Sack = 10kg
                const match = article.package_size.match(/(\d+(?:\.\d+)?)\s*(\w+)/);
                if (match) {
                    const packageQty = parseFloat(match[1]);
                    const baseUnit = match[2];

                    if (article.packaging) {
                        conversions[article.packaging] = packageQty * (conversions[baseUnit] || 1);
                    }
                }
            }
        }

        // Perform conversion
        let result;
        if (conversions[from_unit] !== null && conversions[to_unit] !== null) {
            // Convert to base unit first, then to target unit
            const baseValue = value * conversions[from_unit];
            result = baseValue / conversions[to_unit];
        } else {
            return res.status(400).json({
                error: 'Cannot convert between these units',
                message: 'Package conversions require article information'
            });
        }

        res.json({
            original: {
                value: value,
                unit: from_unit
            },
            converted: {
                value: result.toFixed(3),
                unit: to_unit
            },
            article_id: article_id
        });

    } catch (error) {
        console.error('Error converting units:', error);
        res.status(500).json({ error: 'Failed to convert units' });
    }
});

// ========================================
// 4. PRICE HISTORY TRACKING
// ========================================

router.get('/api/products/:id/price-history', async (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const tenantId = req.tenantId || 1;

        // Get all inventory transactions for this product
        const transactions = db.data.inventory_transactions || [];
        const productTransactions = transactions.filter(t =>
            t.product_id === productId &&
            t.type === 'receipt' &&
            (t.tenant_id === tenantId || t.tenant_id === 'demo' || t.tenant_id === 1)
        );

        // Build price history
        const priceHistory = productTransactions.map(t => ({
            date: t.timestamp,
            price: t.unit_price,
            quantity: t.quantity,
            supplier: t.supplier_name || 'Unknown',
            reference: `${t.reference_type} #${t.reference_id}`
        })).sort((a, b) => new Date(b.date) - new Date(a.date));

        // Calculate price statistics
        const prices = priceHistory.map(h => h.price).filter(p => p > 0);
        const stats = {
            current_price: prices[0] || 0,
            average_price: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
            min_price: prices.length > 0 ? Math.min(...prices) : 0,
            max_price: prices.length > 0 ? Math.max(...prices) : 0,
            price_trend: prices.length > 1 ?
                (prices[0] > prices[1] ? 'increasing' : prices[0] < prices[1] ? 'decreasing' : 'stable') :
                'stable'
        };

        res.json({
            product_id: productId,
            history: priceHistory,
            statistics: stats,
            total_records: priceHistory.length
        });

    } catch (error) {
        console.error('Error fetching price history:', error);
        res.status(500).json({ error: 'Failed to fetch price history' });
    }
});

// ========================================
// 5. RECIPE COOKING → INVENTORY REDUCTION
// ========================================

router.post('/api/recipes/:id/cook', async (req, res) => {
    try {
        const recipeId = parseInt(req.params.id);
        const { portions_to_cook } = req.body;
        const tenantId = req.tenantId || 1;

        // Get recipe
        const recipes = db.data.recipes || [];
        const recipe = recipes.find(r => r.id === recipeId);

        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        // Get recipe ingredients
        const ingredients = db.data.recipe_ingredients_new || [];
        const recipeIngredients = ingredients.filter(i => i.recipe_id === recipeId);

        // Calculate multiplier for portions
        const multiplier = portions_to_cook / (recipe.portions || 1);

        let inventoryReductions = [];
        let insufficientStock = [];

        // Check stock availability first
        for (const ingredient of recipeIngredients) {
            const requiredQuantity = (ingredient.quantity || 0) * multiplier;

            // Find the product linked to this article
            const products = db.data.products || [];
            const product = products.find(p =>
                p.supplier_article_id === ingredient.supplier_article_id ||
                p.id === ingredient.product_id
            );

            if (product) {
                if (product.stock < requiredQuantity) {
                    insufficientStock.push({
                        product_name: product.name,
                        required: requiredQuantity,
                        available: product.stock,
                        shortage: requiredQuantity - product.stock
                    });
                }
            }
        }

        // If insufficient stock, return error
        if (insufficientStock.length > 0) {
            return res.status(400).json({
                error: 'Insufficient stock',
                shortages: insufficientStock
            });
        }

        // Process inventory reduction
        for (const ingredient of recipeIngredients) {
            const requiredQuantity = (ingredient.quantity || 0) * multiplier;

            const products = db.data.products || [];
            const product = products.find(p =>
                p.supplier_article_id === ingredient.supplier_article_id ||
                p.id === ingredient.product_id
            );

            if (product) {
                // Reduce stock
                const oldStock = product.stock;
                product.stock -= requiredQuantity;

                // Create inventory transaction
                const transaction = {
                    id: Math.max(0, ...(db.data.inventory_transactions || []).map(t => t.id || 0)) + 1,
                    tenant_id: tenantId,
                    product_id: product.id,
                    type: 'consumption',
                    quantity: -requiredQuantity,
                    reference_type: 'recipe_cooking',
                    reference_id: recipeId,
                    timestamp: new Date().toISOString(),
                    stock_before: oldStock,
                    stock_after: product.stock
                };

                if (!db.data.inventory_transactions) db.data.inventory_transactions = [];
                db.data.inventory_transactions.push(transaction);

                inventoryReductions.push({
                    product_name: product.name,
                    quantity_used: requiredQuantity,
                    stock_remaining: product.stock
                });
            }
        }

        // Record the cooking event
        const cookingEvent = {
            id: Math.max(0, ...(db.data.cooking_events || []).map(e => e.id || 0)) + 1,
            tenant_id: tenantId,
            recipe_id: recipeId,
            recipe_name: recipe.name,
            portions_cooked: portions_to_cook,
            timestamp: new Date().toISOString(),
            inventory_reductions: inventoryReductions,
            total_cost: (recipe.cost_per_portion || 0) * portions_to_cook
        };

        if (!db.data.cooking_events) db.data.cooking_events = [];
        db.data.cooking_events.push(cookingEvent);

        res.json({
            success: true,
            cooking_event_id: cookingEvent.id,
            recipe: recipe.name,
            portions_cooked: portions_to_cook,
            inventory_reductions: inventoryReductions,
            total_cost: cookingEvent.total_cost.toFixed(2)
        });

    } catch (error) {
        console.error('Error cooking recipe:', error);
        res.status(500).json({ error: 'Failed to cook recipe' });
    }
});

// ========================================
// 6. SUPPLIER PRICE COMPARISON
// ========================================

router.get('/api/articles/:name/compare-prices', async (req, res) => {
    try {
        const articleName = req.params.name;
        const tenantId = req.tenantId || 1;

        // Find all supplier articles with similar names
        const supplierArticles = db.data.supplier_articles || [];
        const matchingArticles = supplierArticles.filter(a =>
            a.name.toLowerCase().includes(articleName.toLowerCase())
        );

        // Group by supplier and find best prices
        const priceComparison = matchingArticles.map(article => ({
            supplier: article.supplier_name,
            article_number: article.article_number,
            name: article.name,
            packaging: article.packaging,
            package_size: article.package_size,
            price_per_unit: parseFloat(article.price_per_unit) || 0,
            unit: article.unit,
            availability: article.availability || 'in_stock'
        })).sort((a, b) => a.price_per_unit - b.price_per_unit);

        // Calculate savings
        const lowestPrice = priceComparison[0]?.price_per_unit || 0;
        const highestPrice = priceComparison[priceComparison.length - 1]?.price_per_unit || 0;
        const averagePrice = priceComparison.length > 0 ?
            priceComparison.reduce((sum, p) => sum + p.price_per_unit, 0) / priceComparison.length : 0;

        res.json({
            article_search: articleName,
            results_count: priceComparison.length,
            price_comparison: priceComparison,
            statistics: {
                lowest_price: lowestPrice.toFixed(2),
                highest_price: highestPrice.toFixed(2),
                average_price: averagePrice.toFixed(2),
                potential_savings: (highestPrice - lowestPrice).toFixed(2),
                best_supplier: priceComparison[0]?.supplier || 'N/A'
            }
        });

    } catch (error) {
        console.error('Error comparing prices:', error);
        res.status(500).json({ error: 'Failed to compare prices' });
    }
});

module.exports = router;