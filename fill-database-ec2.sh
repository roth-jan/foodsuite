#!/bin/bash
# Script zum Füllen der PostgreSQL Datenbank - direkt auf EC2 ausführen

echo "🚀 FoodSuite PostgreSQL Database Seeding Script"
echo "================================================"
echo ""
echo "Dieses Script muss auf der EC2-Instanz ausgeführt werden!"
echo ""
echo "ANLEITUNG:"
echo "1. Kopiere dieses Script auf die EC2-Instanz"
echo "2. Mache es ausführbar: chmod +x fill-database-ec2.sh"
echo "3. Führe es aus: ./fill-database-ec2.sh"
echo ""
echo "Oder führe es direkt aus mit:"
echo "curl -sL https://raw.githubusercontent.com/YOUR_REPO/main/fill-database-ec2.sh | bash"
echo ""
echo "================================================"

# Erstelle das Seed-Script
cat > /tmp/seed-foodsuite-db.js << 'EOF'
const { Client } = require('pg');

async function seedDatabase() {
    console.log('🚀 Seeding PostgreSQL Database...\n');
    
    const client = new Client({
        host: 'foodsuite-db.cdwrysfxunos.eu-central-1.rds.amazonaws.com',
        port: 5432,
        database: 'foodsuite',
        user: 'foodsuite',
        password: 'FoodSuite2025Secure!'
    });

    try {
        await client.connect();
        console.log('✅ Connected to RDS!\n');

        // Clean existing data for tenant 1
        console.log('🧹 Cleaning existing data...');
        await client.query('DELETE FROM recipe_ingredients WHERE recipe_id IN (SELECT id FROM recipes WHERE tenant_id = 1)');
        await client.query('DELETE FROM recipes WHERE tenant_id = 1');
        await client.query('DELETE FROM inventory WHERE tenant_id = 1');
        await client.query('DELETE FROM supplier_articles WHERE supplier_id IN (SELECT id FROM suppliers WHERE tenant_id = 1)');
        await client.query('DELETE FROM suppliers WHERE tenant_id = 1');
        await client.query('DELETE FROM users WHERE tenant_id = 1');
        await client.query('DELETE FROM tenants WHERE id = 1');

        // Create tenant
        console.log('📋 Creating tenant...');
        await client.query(`
            INSERT INTO tenants (id, tenant_key, name, email, settings) 
            VALUES (1, 'demo', 'Demo Restaurant', 'demo@foodsuite.com', '{}')
        `);

        // Create admin user (password: Demo123!)
        console.log('👤 Creating admin user...');
        await client.query(`
            INSERT INTO users (tenant_id, username, email, password_hash, role, is_active) 
            VALUES (1, 'admin', 'admin@foodsuite.com', '$2a$10$xGqwkmPXAKnWCeXdUe8uEu/MqCt2xUanPOqx1IpxKH6vNlN.4o5H2', 'admin', true)
        `);

        // Create categories
        console.log('📁 Creating categories...');
        const categoryResult = await client.query(`
            INSERT INTO product_categories (name, code) VALUES 
            ('Fleisch', 'meat'),
            ('Gemüse', 'vegetables'),
            ('Milchprodukte', 'dairy'),
            ('Grundnahrung', 'staples'),
            ('Gewürze', 'spices'),
            ('Getränke', 'beverages'),
            ('Tiefkühl', 'frozen')
            ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
            RETURNING id, name
        `);
        
        const categories = {};
        categoryResult.rows.forEach(cat => {
            categories[cat.name] = cat.id;
        });

        // Create suppliers
        console.log('🚚 Creating suppliers...');
        const supplierData = [
            ['METRO AG', 'Großhandel', 'bestellung@metro.de', '+49 211 6886-0'],
            ['Transgourmet', 'Großhandel', 'order@transgourmet.de', '+49 69 9450-0'],
            ['Metzgerei Wagner', 'Regional', 'info@metzgerei-wagner.de', '+49 911 123456'],
            ['Bio-Hof Schmidt', 'Regional', 'bio@schmidt-hof.de', '+49 911 234567']
        ];
        
        const supplierIds = {};
        for (const [name, type, email, phone] of supplierData) {
            const result = await client.query(`
                INSERT INTO suppliers (tenant_id, name, type, email, phone, status) 
                VALUES (1, $1, $2, $3, $4, 'active')
                RETURNING id
            `, [name, type, email, phone]);
            supplierIds[name] = result.rows[0].id;
        }

        // Create supplier articles with nutrition data
        console.log('📦 Creating supplier articles...');
        const articles = [
            // METRO Articles
            ['ART-001', 'Tomaten rot Klasse I', categories['Gemüse'], supplierIds['METRO AG'], 'kg', 2.50,
             '{"calories": 18, "protein": 0.9, "carbs": 3.9, "fat": 0.2, "fiber": 1.2}', '{"gluten": false, "lactose": false}'],
            ['ART-002', 'Zwiebeln gelb 5kg', categories['Gemüse'], supplierIds['METRO AG'], 'kg', 1.80,
             '{"calories": 40, "protein": 1.1, "carbs": 9.3, "fat": 0.1, "fiber": 1.7}', '{"gluten": false, "lactose": false}'],
            ['ART-003', 'Kartoffeln festkochend', categories['Gemüse'], supplierIds['METRO AG'], 'kg', 1.20,
             '{"calories": 77, "protein": 2, "carbs": 17, "fat": 0.1, "fiber": 2.2}', '{"gluten": false, "lactose": false}'],
            ['ART-008', 'Olivenöl Extra Vergine', categories['Grundnahrung'], supplierIds['METRO AG'], 'l', 8.90,
             '{"calories": 884, "protein": 0, "carbs": 0, "fat": 100, "fiber": 0}', '{"gluten": false, "lactose": false}'],
            ['ART-009', 'Vollmilch 3,5%', categories['Milchprodukte'], supplierIds['METRO AG'], 'l', 1.19,
             '{"calories": 64, "protein": 3.3, "carbs": 4.8, "fat": 3.5, "fiber": 0}', '{"gluten": false, "lactose": true}'],
            ['ART-010', 'Pfeffer schwarz gemahlen', categories['Gewürze'], supplierIds['METRO AG'], 'kg', 18.90,
             '{"calories": 251, "protein": 10.4, "carbs": 63.9, "fat": 3.3, "fiber": 25.3}', '{"gluten": false, "lactose": false}'],
            
            // Transgourmet Articles  
            ['TG-002', 'Basmati Reis Premium', categories['Grundnahrung'], supplierIds['Transgourmet'], 'kg', 3.50,
             '{"calories": 360, "protein": 6.8, "carbs": 79.5, "fat": 0.6, "fiber": 1.3}', '{"gluten": false, "lactose": false}'],
            ['TG-003', 'Spaghetti No.5', categories['Grundnahrung'], supplierIds['Transgourmet'], 'kg', 1.80,
             '{"calories": 371, "protein": 13, "carbs": 75, "fat": 1.5, "fiber": 3}', '{"gluten": true, "lactose": false}'],
            
            // Metzgerei Wagner Articles
            ['MW-001', 'Rindergulasch frisch', categories['Fleisch'], supplierIds['Metzgerei Wagner'], 'kg', 12.90,
             '{"calories": 201, "protein": 26.3, "carbs": 0, "fat": 10.1, "fiber": 0}', '{"gluten": false, "lactose": false}'],
            ['MW-002', 'Hähnchenbrust ohne Haut', categories['Fleisch'], supplierIds['Metzgerei Wagner'], 'kg', 8.90,
             '{"calories": 165, "protein": 31, "carbs": 0, "fat": 3.6, "fiber": 0}', '{"gluten": false, "lactose": false}'],
            
            // Bio-Hof Schmidt Articles
            ['BIO-001', 'Bio-Karotten', categories['Gemüse'], supplierIds['Bio-Hof Schmidt'], 'kg', 2.90,
             '{"calories": 41, "protein": 0.9, "carbs": 9.6, "fat": 0.2, "fiber": 2.8}', '{"gluten": false, "lactose": false}'],
            ['BIO-002', 'Bio-Paprika rot', categories['Gemüse'], supplierIds['Bio-Hof Schmidt'], 'kg', 4.50,
             '{"calories": 31, "protein": 1, "carbs": 6, "fat": 0.3, "fiber": 2.1}', '{"gluten": false, "lactose": false}']
        ];

        const articleIds = {};
        for (const [articleNum, name, categoryId, supplierId, unit, price, nutrition, allergens] of articles) {
            const result = await client.query(`
                INSERT INTO supplier_articles (
                    article_number, name, category_id, supplier_id, unit, 
                    purchase_price, nutrition_info, allergen_info, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, true)
                RETURNING id
            `, [articleNum, name, categoryId, supplierId, unit, price, nutrition, allergens]);
            articleIds[articleNum] = result.rows[0].id;
        }

        // Create recipes with new article system
        console.log('🍳 Creating recipes...');
        const recipes = [
            {
                name: 'Spaghetti Bolognese',
                category_id: categories['Grundnahrung'],
                servings: 10,
                cost: 2.80,
                price: 5.90,
                prep_time: 30,
                cook_time: 45,
                description: 'Klassische italienische Pasta mit Fleischsauce',
                ingredients: [
                    { article: 'TG-003', quantity: 1.5 },  // Spaghetti
                    { article: 'MW-001', quantity: 1.0 },  // Rindergulasch
                    { article: 'ART-001', quantity: 0.5 }, // Tomaten
                    { article: 'ART-002', quantity: 0.2 }  // Zwiebeln
                ]
            },
            {
                name: 'Hähnchencurry mit Reis',
                category_id: categories['Fleisch'],
                servings: 10,
                cost: 3.50,
                price: 6.90,
                prep_time: 20,
                cook_time: 30,
                description: 'Würziges Curry mit zartem Hähnchenfleisch',
                ingredients: [
                    { article: 'MW-002', quantity: 1.5 },  // Hähnchen
                    { article: 'TG-002', quantity: 1.0 },  // Reis
                    { article: 'ART-002', quantity: 0.3 }, // Zwiebeln
                    { article: 'ART-009', quantity: 0.5 }  // Milch für Sauce
                ]
            },
            {
                name: 'Kartoffelgulasch',
                category_id: categories['Grundnahrung'],
                servings: 10,
                cost: 2.20,
                price: 4.50,
                prep_time: 20,
                cook_time: 40,
                description: 'Deftiger Eintopf mit Kartoffeln und Rindfleisch',
                ingredients: [
                    { article: 'ART-003', quantity: 2.0 },  // Kartoffeln
                    { article: 'MW-001', quantity: 0.5 },  // Rindergulasch
                    { article: 'ART-002', quantity: 0.3 },  // Zwiebeln
                    { article: 'BIO-002', quantity: 0.2 }   // Paprika
                ]
            },
            {
                name: 'Gemüsepfanne',
                category_id: categories['Gemüse'],
                servings: 10,
                cost: 1.80,
                price: 3.90,
                prep_time: 15,
                cook_time: 20,
                description: 'Bunte Gemüsepfanne mit frischen Zutaten',
                ingredients: [
                    { article: 'ART-001', quantity: 0.5 },  // Tomaten
                    { article: 'ART-002', quantity: 0.3 },  // Zwiebeln
                    { article: 'BIO-001', quantity: 0.5 },  // Karotten
                    { article: 'BIO-002', quantity: 0.4 },  // Paprika
                    { article: 'ART-008', quantity: 0.1 }   // Olivenöl
                ]
            }
        ];

        for (const recipe of recipes) {
            const recipeResult = await client.query(`
                INSERT INTO recipes (
                    tenant_id, name, category_id, servings, 
                    cost_per_serving, selling_price, is_active,
                    preparation_time, cooking_time, description
                ) VALUES (1, $1, $2, $3, $4, $5, true, $6, $7, $8)
                RETURNING id
            `, [recipe.name, recipe.category_id, recipe.servings, recipe.cost, 
                recipe.price, recipe.prep_time, recipe.cook_time, recipe.description]);
            
            const recipeId = recipeResult.rows[0].id;
            
            // Add ingredients
            for (const ing of recipe.ingredients) {
                await client.query(`
                    INSERT INTO recipe_ingredients (
                        recipe_id, supplier_article_id, quantity, unit
                    ) VALUES ($1, $2, $3, (SELECT unit FROM supplier_articles WHERE id = $2))
                `, [recipeId, articleIds[ing.article], ing.quantity]);
            }
            console.log(`   ✅ ${recipe.name}`);
        }

        // Initialize inventory with realistic stock levels
        console.log('📊 Initializing inventory...');
        for (const [articleNum, articleId] of Object.entries(articleIds)) {
            // Realistic stock levels based on article type
            let stock = 50;
            if (articleNum.startsWith('MW-')) stock = 30; // Meat products
            else if (articleNum.startsWith('ART-0')) stock = 80; // Basic vegetables
            else if (articleNum.startsWith('TG-')) stock = 100; // Dry goods
            else if (articleNum.startsWith('BIO-')) stock = 40; // Bio products
            
            await client.query(`
                INSERT INTO inventory (
                    tenant_id, supplier_article_id, current_stock, 
                    min_stock, max_stock, unit, last_updated
                )
                SELECT 1, $1, $2, 10, 200, unit, CURRENT_TIMESTAMP
                FROM supplier_articles WHERE id = $1
            `, [articleId, stock]);
        }

        // Final statistics
        const stats = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM suppliers WHERE tenant_id = 1) as suppliers,
                (SELECT COUNT(*) FROM supplier_articles WHERE is_active = true) as articles,
                (SELECT COUNT(*) FROM recipes WHERE tenant_id = 1) as recipes,
                (SELECT COUNT(*) FROM inventory WHERE tenant_id = 1) as inventory_items,
                (SELECT COUNT(*) FROM users WHERE tenant_id = 1) as users
        `);

        console.log('\n' + '='.repeat(60));
        console.log('✅ DATABASE SUCCESSFULLY SEEDED!');
        console.log('='.repeat(60));
        console.log('📊 Statistics:');
        console.log(`   - ${stats.rows[0].suppliers} Suppliers`);
        console.log(`   - ${stats.rows[0].articles} Articles`);
        console.log(`   - ${stats.rows[0].recipes} Recipes with ingredients`);
        console.log(`   - ${stats.rows[0].inventory_items} Inventory items`);
        console.log(`   - ${stats.rows[0].users} Users`);
        console.log('\n🔗 App URL: http://18.195.206.72:3005');
        console.log('👤 Login: admin / Demo123!');
        console.log('🎉 PostgreSQL database is now fully populated!');

    } catch (error) {
        console.error('❌ ERROR:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

seedDatabase();
EOF

# Führe das Script aus
cd /tmp
node seed-foodsuite-db.js

# Cleanup
rm -f seed-foodsuite-db.js

echo ""
echo "✅ Database seeding complete!"