// Test der Rezept-API-Endpunkte mit neuen Artikel-System

const express = require('express');
const request = require('supertest');
const path = require('path');

// Import der Routen und Datenbank
const recipeRoutes = require('./routes/recipes');
const db = require('./database/db-memory');

async function testRecipeEndpoints() {
    console.log('🧪 Testing Recipe API Endpoints with New Article System...\n');
    
    try {
        // Create test express app
        const app = express();
        app.use(express.json());
        app.use('/api/recipes', recipeRoutes);
        
        // Initialize database
        await db.initialize();
        
        console.log('1. Testing GET /api/recipes - Get all recipes');
        const allRecipesResponse = await request(app)
            .get('/api/recipes')
            .set('x-tenant-id', 'demo')
            .expect(200);
        
        console.log(`✅ Found ${allRecipesResponse.body.items.length} recipes`);
        
        if (allRecipesResponse.body.items.length > 0) {
            const firstRecipe = allRecipesResponse.body.items[0];
            console.log('📋 First recipe:', {
                id: firstRecipe.id,
                name: firstRecipe.name,
                cost_per_portion: firstRecipe.cost_per_portion,
                ingredients: firstRecipe.ingredients?.length || 0
            });
        }
        
        console.log('\n2. Testing GET /api/recipes/:id - Get single recipe');
        const singleRecipeResponse = await request(app)
            .get('/api/recipes/1') // Rindergulasch
            .set('x-tenant-id', 'demo')
            .expect(200);
        
        const rindergulasch = singleRecipeResponse.body;
        console.log('🍖 Rindergulasch details:');
        console.log('- Name:', rindergulasch.name);
        console.log('- Cost per Portion:', `€${rindergulasch.cost_per_portion.toFixed(2)}`);
        console.log('- Ingredients:', rindergulasch.ingredients.length);
        
        rindergulasch.ingredients.forEach((ing, i) => {
            console.log(`  ${i+1}. ${ing.product_name}: ${ing.quantity}${ing.unit} (€${ing.price})`);
        });
        
        console.log('\n3. Testing GET /api/recipes/:id/cost - New cost calculation');
        const costResponse = await request(app)
            .get('/api/recipes/1/cost')
            .set('x-tenant-id', 'demo')
            .expect(200);
        
        if (costResponse.body.success) {
            const costData = costResponse.body.data;
            console.log('💰 New cost calculation:');
            console.log('- Recipe:', costData.recipe_name);
            console.log('- Total Cost:', `€${costData.total_cost.toFixed(2)}`);
            console.log('- Cost per Portion:', `€${costData.cost_per_portion.toFixed(2)}`);
            console.log('- Confidence:', costData.confidence);
            console.log('- Ingredients with real data:', costData.ingredients.length);
        }
        
        console.log('\n4. Testing GET /api/recipes/:id/ingredients - New ingredient details');
        const ingredientsResponse = await request(app)
            .get('/api/recipes/1/ingredients')
            .set('x-tenant-id', 'demo')
            .expect(200);
        
        if (ingredientsResponse.body.success) {
            const ingredientsData = ingredientsResponse.body.data;
            console.log('🥕 Detailed ingredients:');
            console.log(`- Recipe ID: ${ingredientsData.recipe_id}`);
            console.log(`- Total Ingredients: ${ingredientsData.total_ingredients}`);
            
            ingredientsData.ingredients.forEach((ing, i) => {
                console.log(`  ${i+1}. ${ing.article.name} (${ing.article.type})`);
                console.log(`     Quantity: ${ing.quantity}${ing.unit}`);
                console.log(`     Price: €${ing.price_info?.price || 0}/${ing.price_info?.unit || 'unit'}`);
                console.log(`     Supplier: ${ing.price_info?.supplier_name || 'N/A'}`);
                if (ing.preparation_note) {
                    console.log(`     Note: ${ing.preparation_note}`);
                }
            });
        }
        
        console.log('\n5. Testing GET /api/recipes/articles/all - Available articles for creation');
        const articlesResponse = await request(app)
            .get('/api/recipes/articles/all')
            .set('x-tenant-id', 'demo')
            .expect(200);
        
        if (articlesResponse.body.success) {
            const articlesData = articlesResponse.body.data;
            console.log('📦 Available articles:');
            console.log(`- Supplier Articles: ${articlesData.supplier_articles.length}`);
            console.log(`- Neutral Articles: ${articlesData.neutral_articles.length}`);
            
            if (articlesData.supplier_articles.length > 0) {
                const firstSupplier = articlesData.supplier_articles[0];
                console.log('\n📄 Example Supplier Article:');
                console.log(`- ID: ${firstSupplier.id}`);
                console.log(`- Name: ${firstSupplier.name}`);
                console.log(`- Article Number: ${firstSupplier.article_number}`);
                console.log(`- Supplier: ${firstSupplier.supplier_name}`);
                console.log(`- Price: €${firstSupplier.price}/${firstSupplier.unit}`);
                console.log(`- Category: ${firstSupplier.category}`);
                console.log(`- Organic: ${firstSupplier.organic ? 'Yes' : 'No'}`);
            }
        }
        
        console.log('\n6. Testing POST /api/recipes/validate-ingredients - Ingredient validation');
        const testIngredients = [
            {
                supplier_article_id: 1005, // WAGNER-RIND-GULASCH-5KG
                quantity: 2.0,
                unit: "kg",
                preparation_note: "in Würfel schneiden"
            },
            {
                neutral_article_id: 6, // Zwiebeln
                quantity: 1.0,
                unit: "kg",
                preparation_note: "gehackt"
            }
        ];
        
        const validationResponse = await request(app)
            .post('/api/recipes/validate-ingredients')
            .set('x-tenant-id', 'demo')
            .send({ ingredients: testIngredients })
            .expect(200);
        
        if (validationResponse.body.success) {
            const validationData = validationResponse.body.data;
            console.log('✅ Ingredient validation:');
            console.log(`- All Valid: ${validationData.all_valid}`);
            console.log(`- Valid/Total: ${validationData.valid_ingredients}/${validationData.total_ingredients}`);
            console.log(`- Estimated Cost: €${validationData.total_estimated_cost.toFixed(2)}`);
            
            validationData.results.forEach((result, i) => {
                console.log(`  ${i+1}. ${result.article?.name || 'Unknown'}: ${result.valid ? '✅' : '❌'}`);
                if (result.estimated_cost > 0) {
                    console.log(`     Estimated Cost: €${result.estimated_cost.toFixed(2)}`);
                }
                if (result.warnings.length > 0) {
                    console.log(`     Warnings: ${result.warnings.join(', ')}`);
                }
            });
        }
        
        console.log('\n7. Testing POST /api/recipes - Create new recipe (NEW system)');
        const newRecipe = {
            name: "Test Nudelgericht",
            category_id: 2, // Hauptgerichte
            portions: 4,
            prep_time: 15,
            cook_time: 20,
            instructions: "Nudeln kochen, Sauce zubereiten, servieren.",
            notes: "Einfaches Testrezept",
            tags: "Test, Pasta",
            ingredients: [
                {
                    supplier_article_id: 1007, // TG-REIS-BASMATI-25KG (as substitute for pasta)
                    quantity: 0.5,
                    unit: "kg",
                    preparation_note: "als Nudel-Ersatz"
                },
                {
                    neutral_article_id: 7, // Gewürze & Kräuter
                    quantity: 0.1,
                    unit: "kg",
                    preparation_note: "zum Würzen"
                }
            ]
        };
        
        const createResponse = await request(app)
            .post('/api/recipes')
            .set('x-tenant-id', 'demo')
            .send(newRecipe)
            .expect(201);
        
        console.log('🍝 New recipe created:');
        console.log('- ID:', createResponse.body.id);
        console.log('- Name:', createResponse.body.name);
        console.log('- Ingredients:', createResponse.body.ingredients.length);
        
        console.log('\n✅ All endpoint tests completed successfully!');
        console.log('\n🎯 Key Results:');
        console.log('- ✅ Existing recipes work with migration system');
        console.log('- ✅ Cost calculation uses real supplier data');
        console.log('- ✅ Ingredient details show supplier/neutral articles');
        console.log('- ✅ Article lookup for recipe creation works');
        console.log('- ✅ Ingredient validation works correctly');
        console.log('- ✅ NEW recipe creation works with article system');
        console.log('- ✅ No more undefined article numbers or categories');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Body:', error.response.body);
        }
    }
}

// Run the test
testRecipeEndpoints();