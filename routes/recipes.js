require('dotenv').config();

const express = require('express');
const router = express.Router();
const dbType = process.env.DB_TYPE || 'memory';
const db = dbType === 'postgres' ? require('../database/postgres-adapter') : require('../database/db-memory');
const Joi = require('joi');

// Validation schemas for NEW article system
const newRecipeIngredientSchema = Joi.object({
    supplier_article_id: Joi.number().integer().optional(), // Priority 1
    neutral_article_id: Joi.number().integer().optional(),  // Priority 2 (fallback)
    quantity: Joi.number().positive().required(),
    unit: Joi.string().required(),
    preparation_note: Joi.string().optional().allow(''),
    optional: Joi.boolean().default(false)
}).xor('supplier_article_id', 'neutral_article_id'); // At least one must be provided

// Legacy schema for backward compatibility
const legacyRecipeIngredientSchema = Joi.object({
    product_id: Joi.number().integer().required(),
    quantity: Joi.number().positive().required(),
    unit: Joi.string().required()
});

// NEW recipe schema with article system support
const newRecipeSchema = Joi.object({
    name: Joi.string().required(),
    category_id: Joi.number().integer().required(),
    portions: Joi.number().integer().min(1).default(4),
    prep_time: Joi.number().integer().min(0).default(30),
    cook_time: Joi.number().integer().min(0).default(30),
    instructions: Joi.string().required(),
    notes: Joi.string().optional().allow(''),
    tags: Joi.string().optional().allow(''),
    ingredients: Joi.array().items(newRecipeIngredientSchema).min(1).required()
});

// Legacy recipe schema for backward compatibility
const legacyRecipeSchema = Joi.object({
    name: Joi.string().required(),
    category_id: Joi.number().integer().required(),
    portions: Joi.number().integer().min(1).default(4),
    prep_time: Joi.number().integer().min(0).default(30),
    cook_time: Joi.number().integer().min(0).default(30),
    instructions: Joi.string().required(),
    notes: Joi.string().optional(),
    tags: Joi.string().optional(),
    ingredients: Joi.array().items(legacyRecipeIngredientSchema).min(1).required()
});

// Helper function to get tenant ID
function getTenantId(req, res, next) {
    const tenantKey = req.headers['x-tenant-id'] || 'demo';
    
    if (process.env.DB_TYPE === 'postgres') {
        req.tenantId = 1; // Always use tenant 1 for demo
        next();
        return;
    }
    
    // Auto-create demo tenant if not exists (for in-memory database)
    if (!db.data) {
        db.data = { tenants: [], recipes: [] };
    }
    if (!db.data.tenants) {
        db.data.tenants = [];
    }
    
    let tenant = db.data.tenants.find(t => t.tenant_key === tenantKey);
    if (!tenant && tenantKey === 'demo') {
        tenant = {
            id: 1,
            tenant_key: 'demo',
            name: 'Demo Tenant',
            created_at: new Date().toISOString()
        };
        db.data.tenants.push(tenant);
        console.log('✅ Demo tenant auto-created for recipes');
    }
    
    if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
    }
    
    req.tenantId = tenant.id;
    next();
}

router.use(getTenantId);

// GET /api/recipes - Get all recipes

// Helper function to ensure tenant exists (removed - handled by getTenantId)

router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 60, search, category, tags } = req.query;
        
        // Use adapter method if available (PostgreSQL)
        if (db.getRecipes) {
            const filters = {
                search,
                category,
                tags,
                limit: parseInt(limit),
                offset: (parseInt(page) - 1) * parseInt(limit)
            };
            
            const recipes = await db.getRecipes(req.tenantId, filters);
            
            res.json({
                items: recipes,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalItems: recipes.length,
                    totalPages: Math.ceil(recipes.length / limit)
                }
            });
            return;
        }
        
        // Fallback for in-memory database
        const allRecipes = db.data.recipes || [];
        
        // Filter by tenant
        let filteredRecipes = allRecipes.filter(recipe => recipe.tenant_id === req.tenantId);
        
        if (search) {
            filteredRecipes = filteredRecipes.filter(recipe => 
                recipe.name.toLowerCase().includes(search.toLowerCase())
            );
        }
        
        if (category) {
            filteredRecipes = filteredRecipes.filter(recipe => 
                recipe.category_id === parseInt(category)
            );
        }
        
        if (tags) {
            filteredRecipes = filteredRecipes.filter(recipe => 
                recipe.tags && recipe.tags.toLowerCase().includes(tags.toLowerCase())
            );
        }
        
        // Sort by name
        filteredRecipes.sort((a, b) => a.name.localeCompare(b.name));
        
        // Pagination
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const endIndex = startIndex + parseInt(limit);
        const paginatedRecipes = filteredRecipes.slice(startIndex, endIndex);
        
        const result = {
            items: paginatedRecipes,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalItems: filteredRecipes.length,
                totalPages: Math.ceil(filteredRecipes.length / parseInt(limit)),
                hasNextPage: endIndex < filteredRecipes.length,
                hasPreviousPage: parseInt(page) > 1
            }
        };
        
        // Enrich with category and calculate cost
        for (let recipe of result.items) {
            if (recipe.category_id) {
                const recipeCategories = db.data.recipe_categories || [];
                recipe.category = recipeCategories.find(cat => cat.id === recipe.category_id);
            }
            
            // Get ingredients from in-memory database
            const recipeIngredients = db.data.recipe_ingredients || [];
            const products = db.data.products || [];
            
            const ingredients = recipeIngredients
                .filter(ri => ri.recipe_id === recipe.id)
                .map(ri => {
                    const product = products.find(p => p.id === ri.product_id);
                    return {
                        ...ri,
                        product_name: product ? product.name : 'Unknown Product',
                        price: product ? product.price : 0,
                        product_unit: product ? product.unit : 'kg'
                    };
                });
            
            let totalCost = 0;
            for (const ingredient of ingredients) {
                totalCost += ingredient.quantity * ingredient.price;
            }
            
            recipe.cost_per_portion = totalCost / recipe.portions;
            recipe.ingredients = ingredients;
        }
        
        res.json(result);
    } catch (error) {
        console.error('Error fetching recipes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/recipes/:id - Get single recipe
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const recipe = await db.findById('recipes', id, req.tenantId);
        
        if (!recipe) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        
        // Enrich with category
        if (recipe.category_id) {
            const recipeCategories = db.data.recipe_categories || [];
            recipe.category = recipeCategories.find(cat => cat.id === recipe.category_id);
        }
        
        // Get ingredients from in-memory database
        const recipeIngredients = db.data.recipe_ingredients || [];
        const products = db.data.products || [];
        
        const ingredients = recipeIngredients
            .filter(ri => ri.recipe_id === parseInt(id))
            .map(ri => {
                const product = products.find(p => p.id === ri.product_id);
                return {
                    ...ri,
                    product_name: product ? product.name : 'Unknown Product',
                    price: product ? product.price : 0,
                    product_unit: product ? product.unit : 'kg',
                    article_number: product ? product.article_number : ''
                };
            });
        
        recipe.ingredients = ingredients;
        
        // Calculate cost
        let totalCost = 0;
        for (const ingredient of ingredients) {
            totalCost += ingredient.quantity * ingredient.price;
        }
        recipe.cost_per_portion = totalCost / recipe.portions;
        
        res.json(recipe);
    } catch (error) {
        console.error('Error fetching recipe:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/recipes - Create new recipe with NEW article system
router.post('/', async (req, res) => {
    try {
        // Try NEW recipe schema first
        let validation = newRecipeSchema.validate(req.body);
        let useNewSystem = true;
        
        // Fallback to legacy schema if new validation fails
        if (validation.error) {
            validation = legacyRecipeSchema.validate(req.body);
            useNewSystem = false;
            
            if (validation.error) {
                return res.status(400).json({ 
                    error: 'Validation error', 
                    details: validation.error.details,
                    hint: 'Use either supplier_article_id or neutral_article_id for ingredients'
                });
            }
        }
        
        const value = validation.value;
        
        if (useNewSystem) {
            console.log('✅ Creating recipe with NEW article system');
            
            // Validate NEW system ingredients
            for (const ingredient of value.ingredients) {
                let articleFound = false;
                
                // Check supplier article
                if (ingredient.supplier_article_id) {
                    const supplierArticle = db.data?.supplier_articles?.find(a => 
                        a.id === ingredient.supplier_article_id && a.status === 'active'
                    );
                    if (supplierArticle) {
                        articleFound = true;
                    }
                }
                
                // Check neutral article as fallback
                if (!articleFound && ingredient.neutral_article_id) {
                    const neutralArticle = db.data?.neutral_articles?.find(a => 
                        a.id === ingredient.neutral_article_id
                    );
                    if (neutralArticle) {
                        articleFound = true;
                    }
                }
                
                if (!articleFound) {
                    return res.status(400).json({ 
                        error: `Article not found for ingredient`,
                        details: `Supplier article ID: ${ingredient.supplier_article_id}, Neutral article ID: ${ingredient.neutral_article_id}`
                    });
                }
            }
            
        } else {
            console.log('⚠️ Creating recipe with LEGACY system');
            
            // Validate legacy ingredients
            for (const ingredient of value.ingredients) {
                const product = await db.findById('products', ingredient.product_id, req.tenantId);
                if (!product) {
                    return res.status(400).json({ 
                        error: `Product with ID ${ingredient.product_id} not found` 
                    });
                }
            }
        }
        
        const recipe = await db.transaction(async (database) => {
            // Create recipe
            const recipeData = {
                tenant_id: req.tenantId,
                name: value.name,
                category_id: value.category_id,
                portions: value.portions,
                prep_time: value.prep_time,
                cook_time: value.cook_time,
                cost_per_portion: 0, // Will be calculated after creation
                instructions: value.instructions,
                notes: value.notes,
                tags: value.tags,
                status: 'active'
            };
            
            const newRecipe = await database.create('recipes', recipeData);
            
            // Create recipe ingredients
            for (const ingredient of value.ingredients) {
                if (useNewSystem) {
                    // New article system
                    await database.create('recipe_ingredients_new', {
                        recipe_id: newRecipe.id,
                        supplier_article_id: ingredient.supplier_article_id || null,
                        neutral_article_id: ingredient.neutral_article_id || null,
                        quantity: ingredient.quantity,
                        unit: ingredient.unit,
                        preparation_note: ingredient.preparation_note || '',
                        optional: ingredient.optional || false
                    });
                } else {
                    // Legacy system
                    await database.create('recipe_ingredients', {
                        recipe_id: newRecipe.id,
                        product_id: ingredient.product_id,
                        quantity: ingredient.quantity,
                        unit: ingredient.unit
                    });
                }
            }
            
            return newRecipe;
        });
        
        // Get complete recipe with ingredients
        const completeRecipe = await db.findById('recipes', recipe.id, req.tenantId);
        completeRecipe.ingredients = value.ingredients;
        
        res.status(201).json(completeRecipe);
    } catch (error) {
        console.error('Error creating recipe:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/recipes/categories - Get all recipe categories
router.get('/categories/all', async (req, res) => {
    try {
        const categories = db.data.recipe_categories || [];
        // Sort by name
        const sortedCategories = categories.sort((a, b) => a.name.localeCompare(b.name));
        res.json(sortedCategories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/recipes/:id/cost - Calculate recipe cost with new article system
router.get('/:id/cost', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Use NEW article system method if available
        if (db.calculateRecipeCost) {
            console.log('Using NEW article system: db.calculateRecipeCost method');
            
            const costCalculation = await db.calculateRecipeCost(parseInt(id));
            
            if (!costCalculation) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Recipe not found' 
                });
            }
            
            res.json({
                success: true,
                data: costCalculation
            });
            return;
        }
        
        // Legacy fallback
        const recipe = db.data?.recipes?.find(r => r.id === parseInt(id) && r.tenant_id === req.tenantId);
        
        if (!recipe) {
            return res.status(404).json({ 
                success: false,
                error: 'Recipe not found' 
            });
        }
        
        res.json({
            success: true,
            data: {
                recipe_id: recipe.id,
                recipe_name: recipe.name,
                total_cost: 0,
                cost_per_portion: recipe.cost_per_portion || 0,
                confidence: 'low',
                warnings: ['Legacy cost calculation - no detailed ingredient tracking'],
                ingredients: [],
                currency: 'EUR'
            }
        });
        
    } catch (error) {
        console.error('Error calculating recipe cost:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/recipes/:id/ingredients - Get recipe ingredients with article details
router.get('/:id/ingredients', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (db.data && db.data.recipe_ingredients_new) {
            const ingredients = db.data.recipe_ingredients_new
                .filter(ri => ri.recipe_id === parseInt(id))
                .map(ingredient => {
                    let resolvedArticle = null;
                    let article_name = 'Unbekannt';
                    let price_info = null;
                    
                    // 1. Versuche Lieferantenartikel
                    if (ingredient.supplier_article_id) {
                        const supplierArticle = db.data.supplier_articles?.find(a => 
                            a.id === ingredient.supplier_article_id
                        );
                        
                        if (supplierArticle) {
                            const supplier = db.data.suppliers?.find(s => s.id === supplierArticle.supplier_id);
                            resolvedArticle = supplierArticle;
                            article_name = supplierArticle.name;
                            price_info = {
                                price: supplierArticle.price,
                                unit: supplierArticle.unit,
                                supplier_name: supplier?.name || 'Unbekannt'
                            };
                        }
                    }
                    
                    // 2. Fallback auf neutralen Artikel
                    if (!resolvedArticle && ingredient.neutral_article_id) {
                        const neutralArticle = db.data.neutral_articles?.find(n => 
                            n.id === ingredient.neutral_article_id
                        );
                        
                        if (neutralArticle) {
                            resolvedArticle = neutralArticle;
                            article_name = neutralArticle.name;
                            price_info = {
                                price: neutralArticle.estimated_price_range.min,
                                unit: neutralArticle.base_unit,
                                supplier_name: 'Geschätzt'
                            };
                        }
                    }
                    
                    return {
                        id: ingredient.id,
                        quantity: ingredient.quantity,
                        unit: ingredient.unit,
                        preparation_note: ingredient.preparation_note,
                        optional: ingredient.optional,
                        article: {
                            name: article_name,
                            type: resolvedArticle ? (ingredient.supplier_article_id ? 'supplier_article' : 'neutral_article') : 'unknown',
                            ...resolvedArticle
                        },
                        price_info: price_info,
                        sort_order: ingredient.sort_order
                    };
                })
                .sort((a, b) => a.sort_order - b.sort_order);
            
            res.json({
                success: true,
                data: {
                    recipe_id: parseInt(id),
                    ingredients: ingredients,
                    total_ingredients: ingredients.length
                }
            });
            return;
        }
        
        // Legacy fallback
        const ingredients = db.data?.recipe_ingredients?.filter(ri => ri.recipe_id === parseInt(id)) || [];
        
        res.json({
            success: true,
            data: {
                recipe_id: parseInt(id),
                ingredients: ingredients.map(ing => ({
                    id: ing.id,
                    product_id: ing.product_id,
                    quantity: ing.quantity,
                    unit: ing.unit,
                    notes: ing.notes
                })),
                total_ingredients: ingredients.length
            }
        });
        
    } catch (error) {
        console.error('Error fetching recipe ingredients:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/recipes/articles - Get available articles for recipe creation
router.get('/articles/all', async (req, res) => {
    try {
        console.log('🔍 Fetching available articles for recipe creation...');
        
        const result = {
            success: true,
            data: {
                supplier_articles: [],
                neutral_articles: [],
                usage_guide: {
                    priority: "Use supplier_article_id first, neutral_article_id as fallback",
                    example: {
                        ingredient: {
                            supplier_article_id: 1001,
                            quantity: 2.5,
                            unit: "kg",
                            preparation_note: "gewürfelt",
                            optional: false
                        }
                    }
                }
            }
        };
        
        // Load supplier articles
        if (db.data?.supplier_articles) {
            result.data.supplier_articles = db.data.supplier_articles
                .filter(article => 
                    article.status === 'active' && 
                    (article.tenant_id === req.tenantId || article.tenant_id === 1)
                )
                .map(article => {
                    const supplier = db.data.suppliers?.find(s => s.id === article.supplier_id);
                    const neutralArticle = db.data.neutral_articles?.find(n => n.id === article.neutral_article_id);
                    const category = db.data.product_categories?.find(c => c.id === neutralArticle?.category_id);
                    
                    return {
                        id: article.id,
                        article_number: article.article_number,
                        name: article.name,
                        supplier_name: supplier?.name || 'Unbekannt',
                        category: category?.name || 'Unbekannt',
                        price: article.price,
                        unit: article.unit,
                        organic: article.organic,
                        regional: article.regional,
                        quality_grade: article.quality_grade,
                        nutrition: article.nutrition,
                        allergens: article.allergens,
                        neutral_article_id: article.neutral_article_id
                    };
                })
                .sort((a, b) => a.name.localeCompare(b.name));
        }
        
        // Load neutral articles
        if (db.data?.neutral_articles) {
            result.data.neutral_articles = db.data.neutral_articles.map(article => {
                const category = db.data.product_categories?.find(c => c.id === article.category_id);
                
                return {
                    id: article.id,
                    name: article.name,
                    category: category?.name || 'Unbekannt',
                    base_unit: article.base_unit,
                    estimated_price_range: article.estimated_price_range,
                    avg_nutrition: article.avg_nutrition,
                    common_allergens: article.common_allergens,
                    description: article.description
                };
            }).sort((a, b) => a.name.localeCompare(b.name));
        }
        
        console.log(`✅ Found ${result.data.supplier_articles.length} supplier articles, ${result.data.neutral_articles.length} neutral articles`);
        
        res.json(result);
        
    } catch (error) {
        console.error('Error fetching articles for recipes:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

// POST /api/recipes/validate-ingredients - Validate ingredients before recipe creation
router.post('/validate-ingredients', async (req, res) => {
    try {
        const { ingredients } = req.body;
        
        if (!Array.isArray(ingredients)) {
            return res.status(400).json({
                success: false,
                error: 'Ingredients must be an array'
            });
        }
        
        const validationResults = [];
        let allValid = true;
        
        for (const [index, ingredient] of ingredients.entries()) {
            const result = {
                index: index,
                valid: false,
                article: null,
                estimated_cost: 0,
                warnings: []
            };
            
            // Validate schema
            const { error } = newRecipeIngredientSchema.validate(ingredient);
            if (error) {
                result.error = error.details[0].message;
                allValid = false;
                validationResults.push(result);
                continue;
            }
            
            // Check supplier article first
            if (ingredient.supplier_article_id) {
                const supplierArticle = db.data?.supplier_articles?.find(a => 
                    a.id === ingredient.supplier_article_id && a.status === 'active'
                );
                
                if (supplierArticle) {
                    const supplier = db.data.suppliers?.find(s => s.id === supplierArticle.supplier_id);
                    result.valid = true;
                    result.article = {
                        type: 'supplier_article',
                        name: supplierArticle.name,
                        article_number: supplierArticle.article_number,
                        supplier_name: supplier?.name || 'Unbekannt',
                        price: supplierArticle.price,
                        unit: supplierArticle.unit,
                        availability: supplierArticle.availability
                    };
                    
                    // Calculate estimated cost
                    const unitWeight = db.parseUnit ? db.parseUnit(supplierArticle.unit) : 1;
                    const costPerKg = supplierArticle.price / unitWeight;
                    result.estimated_cost = costPerKg * ingredient.quantity;
                    
                    if (supplierArticle.availability !== 'available') {
                        result.warnings.push('Article may not be available');
                    }
                }
            }
            
            // Fallback to neutral article
            if (!result.valid && ingredient.neutral_article_id) {
                const neutralArticle = db.data?.neutral_articles?.find(a => 
                    a.id === ingredient.neutral_article_id
                );
                
                if (neutralArticle) {
                    result.valid = true;
                    result.article = {
                        type: 'neutral_article',
                        name: neutralArticle.name,
                        base_unit: neutralArticle.base_unit,
                        estimated_price_range: neutralArticle.estimated_price_range
                    };
                    
                    result.estimated_cost = neutralArticle.estimated_price_range.min * ingredient.quantity;
                    result.warnings.push('Using estimated pricing - no specific supplier article');
                }
            }
            
            if (!result.valid) {
                result.error = 'Article not found';
                allValid = false;
            }
            
            validationResults.push(result);
        }
        
        const totalEstimatedCost = validationResults.reduce((sum, r) => sum + r.estimated_cost, 0);
        
        res.json({
            success: true,
            data: {
                all_valid: allValid,
                total_ingredients: ingredients.length,
                valid_ingredients: validationResults.filter(r => r.valid).length,
                total_estimated_cost: totalEstimatedCost,
                currency: 'EUR',
                results: validationResults
            }
        });
        
    } catch (error) {
        console.error('Error validating recipe ingredients:', error);
        res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
});

module.exports = router;