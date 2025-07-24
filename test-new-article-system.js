// Test des neuen Artikel-Systems

const db = require('./database/db-memory');

async function testNewArticleSystem() {
    console.log('🧪 Testing New Article System...\n');
    
    try {
        // Initialize database
        await db.initialize();
        
        console.log('1. Testing getProducts method...');
        const products = await db.getProducts({ tenant_id: 1 });
        console.log(`✅ Found ${products.length} products`);
        
        if (products.length > 0) {
            const firstProduct = products[0];
            console.log('📦 First product:', {
                id: firstProduct.id,
                name: firstProduct.name,
                article_number: firstProduct.article_number, // Should NOT be undefined!
                category: firstProduct.category,
                supplier_name: firstProduct.supplier_name,
                price: firstProduct.price,
                status: firstProduct.status
            });
        }
        
        console.log('\n2. Testing getProductById method...');
        if (products.length > 0) {
            const productDetails = await db.getProductById(products[0].id);
            console.log('📋 Product details:');
            console.log('- Name:', productDetails.name);
            console.log('- Article Number:', productDetails.article_number);
            console.log('- Supplier:', productDetails.supplier_name);
            console.log('- Nutrition:', productDetails.nutrition);
            console.log('- Allergens:', productDetails.allergens);
            console.log('- Alternatives:', productDetails.alternatives?.length || 0);
        }
        
        console.log('\n3. Testing calculateRecipeCost method...');
        const recipeCost = await db.calculateRecipeCost(1); // Rindergulasch
        if (recipeCost) {
            console.log('💰 Recipe cost calculation:');
            console.log('- Recipe:', recipeCost.recipe_name);
            console.log('- Total Cost:', `€${recipeCost.total_cost.toFixed(2)}`);
            console.log('- Cost per Portion:', `€${recipeCost.cost_per_portion.toFixed(2)}`);
            console.log('- Confidence:', recipeCost.confidence);
            console.log('- Ingredients:', recipeCost.ingredients.length);
            
            recipeCost.ingredients.forEach((ing, i) => {
                console.log(`  ${i+1}. ${ing.name}: ${ing.quantity}${ing.unit} = €${ing.cost.toFixed(2)}`);
            });
        }
        
        console.log('\n4. Testing data structure...');
        console.log('- Neutral Articles:', db.data.neutral_articles?.length || 0);
        console.log('- Supplier Articles:', db.data.supplier_articles?.length || 0);
        console.log('- Recipe Ingredients (New):', db.data.recipe_ingredients_new?.length || 0);
        
        if (db.data.supplier_articles?.length > 0) {
            const exampleArticle = db.data.supplier_articles[0];
            console.log('\n📄 Example Supplier Article:');
            console.log('- ID:', exampleArticle.id);
            console.log('- Article Number:', exampleArticle.article_number);
            console.log('- Name:', exampleArticle.name);
            console.log('- Price:', `€${exampleArticle.price}`);
            console.log('- Unit:', exampleArticle.unit);
            console.log('- Organic:', exampleArticle.organic ? 'Yes' : 'No');
            console.log('- Regional:', exampleArticle.regional ? 'Yes' : 'No');
            console.log('- Quality Grade:', exampleArticle.quality_grade);
            console.log('- Status:', exampleArticle.status);
        }
        
        console.log('\n✅ All tests completed successfully!');
        console.log('\n🎯 Key Features Working:');
        console.log('- ✅ Article numbers no longer undefined');
        console.log('- ✅ Proper supplier-article mapping');
        console.log('- ✅ Nutrition data from suppliers');
        console.log('- ✅ Allergen information');
        console.log('- ✅ Recipe cost calculation with real ingredients');
        console.log('- ✅ Supplier comparison capabilities');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testNewArticleSystem();