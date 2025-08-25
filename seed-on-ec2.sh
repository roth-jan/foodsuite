#!/bin/bash
# Script zum Seeden der PostgreSQL Datenbank direkt auf EC2

echo "🚀 Kopiere und führe Seed-Script auf EC2 aus..."

# SSH Verbindung und Script-Ausführung
ssh -i ~/foodsuite-key.pem ubuntu@18.195.206.72 << 'ENDSSH'

# Erstelle das Seed-Script auf EC2
cat > /home/ubuntu/seed-database.js << 'EOF'
const { Client } = require('pg');

async function seedDatabase() {
    console.log('🚀 Seed PostgreSQL Database from EC2...\n');
    
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

        // Clean existing data
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

        // Create admin user
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
            ('Gewürze', 'spices')
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
            ['METRO AG', 'Großhandel', 'bestellung@metro.de'],
            ['Transgourmet', 'Großhandel', 'order@transgourmet.de'],
            ['Metzgerei Wagner', 'Regional', 'info@metzgerei-wagner.de'],
            ['Bio-Hof Schmidt', 'Regional', 'bio@schmidt-hof.de']
        ];
        
        const supplierIds = [];
        for (const [name, type, email] of supplierData) {
            const result = await client.query(`
                INSERT INTO suppliers (tenant_id, name, type, email, status) 
                VALUES (1, $1, $2, $3, 'active')
                RETURNING id
            `, [name, type, email]);
            supplierIds.push(result.rows[0].id);
        }

        // Create supplier articles
        console.log('📦 Creating supplier articles...');
        const articles = [
            ['ART-001', 'Tomaten rot Klasse I', categories['Gemüse'], supplierIds[0], 'kg', 2.50],
            ['ART-002', 'Zwiebeln gelb 5kg', categories['Gemüse'], supplierIds[0], 'kg', 1.80],
            ['ART-003', 'Kartoffeln festkochend', categories['Gemüse'], supplierIds[1], 'kg', 1.20],
            ['ART-004', 'Rindergulasch frisch', categories['Fleisch'], supplierIds[2], 'kg', 12.90],
            ['ART-005', 'Hähnchenbrust ohne Haut', categories['Fleisch'], supplierIds[2], 'kg', 8.90],
            ['ART-006', 'Basmati Reis Premium', categories['Grundnahrung'], supplierIds[1], 'kg', 3.50],
            ['ART-007', 'Spaghetti No.5', categories['Grundnahrung'], supplierIds[1], 'kg', 1.80],
            ['ART-008', 'Olivenöl Extra Vergine', categories['Grundnahrung'], supplierIds[0], 'l', 8.90],
            ['ART-009', 'Vollmilch 3,5%', categories['Milchprodukte'], supplierIds[0], 'l', 1.19],
            ['ART-010', 'Pfeffer schwarz gemahlen', categories['Gewürze'], supplierIds[0], 'kg', 18.90]
        ];

        const articleIds = {};
        for (const [articleNum, name, categoryId, supplierId, unit, price] of articles) {
            const result = await client.query(`
                INSERT INTO supplier_articles (
                    article_number, name, category_id, supplier_id, unit, 
                    purchase_price, nutrition_info, allergen_info, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, '{}', '{}', true)
                RETURNING id
            `, [articleNum, name, categoryId, supplierId, unit, price]);
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
                ingredients: [
                    { article: 'ART-007', quantity: 1.5 },
                    { article: 'ART-004', quantity: 1.0 },
                    { article: 'ART-001', quantity: 0.5 },
                    { article: 'ART-002', quantity: 0.2 }
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
                ingredients: [
                    { article: 'ART-005', quantity: 1.5 },
                    { article: 'ART-006', quantity: 1.0 },
                    { article: 'ART-002', quantity: 0.3 },
                    { article: 'ART-009', quantity: 0.5 }
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
                ingredients: [
                    { article: 'ART-003', quantity: 2.0 },
                    { article: 'ART-004', quantity: 0.5 },
                    { article: 'ART-002', quantity: 0.3 }
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
                ingredients: [
                    { article: 'ART-001', quantity: 0.5 },
                    { article: 'ART-002', quantity: 0.3 },
                    { article: 'ART-003', quantity: 1.0 },
                    { article: 'ART-008', quantity: 0.1 }
                ]
            }
        ];

        for (const recipe of recipes) {
            const recipeResult = await client.query(`
                INSERT INTO recipes (
                    tenant_id, name, category_id, servings, 
                    cost_per_serving, selling_price, is_active,
                    preparation_time, cooking_time
                ) VALUES (1, $1, $2, $3, $4, $5, true, $6, $7)
                RETURNING id
            `, [recipe.name, recipe.category_id, recipe.servings, recipe.cost, recipe.price, recipe.prep_time, recipe.cook_time]);
            
            const recipeId = recipeResult.rows[0].id;
            
            // Add ingredients
            for (const ing of recipe.ingredients) {
                await client.query(`
                    INSERT INTO recipe_ingredients (
                        recipe_id, supplier_article_id, quantity, unit
                    ) VALUES ($1, $2, $3, (SELECT unit FROM supplier_articles WHERE id = $2))
                `, [recipeId, articleIds[ing.article], ing.quantity]);
            }
        }

        // Initialize inventory
        console.log('📊 Initializing inventory...');
        for (const [articleNum, articleId] of Object.entries(articleIds)) {
            const stock = Math.floor(Math.random() * 80) + 20;
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
                (SELECT COUNT(*) FROM inventory WHERE tenant_id = 1) as inventory_items
        `);

        console.log('\n' + '='.repeat(60));
        console.log('✅ DATABASE SUCCESSFULLY SEEDED!');
        console.log('='.repeat(60));
        console.log('📊 Statistics:');
        console.log(`   - ${stats.rows[0].suppliers} Suppliers`);
        console.log(`   - ${stats.rows[0].articles} Articles`);
        console.log(`   - ${stats.rows[0].recipes} Recipes`);
        console.log(`   - ${stats.rows[0].inventory_items} Inventory items`);
        console.log('\n🔗 App URL: http://18.195.206.72:3005');
        console.log('👤 Login: admin / Demo123!');
        console.log('🎉 PostgreSQL database is now fully populated!');

    } catch (error) {
        console.error('❌ ERROR:', error.message);
        console.error(error);
    } finally {
        await client.end();
    }
}

seedDatabase();
EOF

# Führe das Script aus
cd /home/ubuntu
node seed-database.js

# Lösche das Script nach Ausführung
rm seed-database.js

ENDSSH

echo "✅ Seed-Script auf EC2 ausgeführt!"