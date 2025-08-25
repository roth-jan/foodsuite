#!/bin/bash
# DIESES SCRIPT MUSS AUF EC2 AUSGEFÜHRT WERDEN!

echo "🚀 FOODSUITE COMPLETE SETUP ON EC2"
echo "=================================="
echo ""
echo "Dieses Script muss auf der EC2-Instanz ausgeführt werden!"
echo ""

# Erstelle das PostgreSQL Seed Script
cat > /tmp/seed-foodsuite.js << 'EOF'
const { Client } = require('pg');

async function seedDatabase() {
    console.log('🌱 Seeding PostgreSQL Database...\n');
    
    const client = new Client({
        host: 'foodsuite-db.cdwrysfxunos.eu-central-1.rds.amazonaws.com',
        port: 5432,
        database: 'foodsuite',
        user: 'foodsuite',
        password: 'FoodSuite2025Secure!'
    });

    try {
        await client.connect();
        console.log('✅ Connected to RDS PostgreSQL\n');

        // Drop and recreate all data
        console.log('🧹 Cleaning database...');
        await client.query(`
            -- Clean all tables
            TRUNCATE TABLE 
                recipe_ingredients, 
                inventory, 
                recipes, 
                supplier_articles, 
                suppliers, 
                users, 
                tenants 
            RESTART IDENTITY CASCADE;
        `);

        // 1. Tenant
        console.log('📋 Creating tenant...');
        await client.query(`
            INSERT INTO tenants (id, tenant_key, name, email, settings, is_active) 
            VALUES (1, 'demo', 'Demo Restaurant', 'demo@foodsuite.com', '{}', true)
        `);

        // 2. Admin User
        console.log('👤 Creating admin user...');
        await client.query(`
            INSERT INTO users (tenant_id, username, email, password_hash, role, is_active) 
            VALUES (1, 'admin', 'admin@foodsuite.com', '$2a$10$xGqwkmPXAKnWCeXdUe8uEu/MqCt2xUanPOqx1IpxKH6vNlN.4o5H2', 'admin', true)
        `);

        // 3. Categories
        console.log('📁 Creating categories...');
        await client.query(`
            INSERT INTO product_categories (id, name, code) VALUES 
            (1, 'Fleisch', 'meat'),
            (2, 'Gemüse', 'vegetables'),
            (3, 'Milchprodukte', 'dairy'),
            (4, 'Grundnahrung', 'staples'),
            (5, 'Gewürze', 'spices')
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
        `);

        // 4. Suppliers
        console.log('🚚 Creating suppliers...');
        await client.query(`
            INSERT INTO suppliers (id, tenant_id, name, type, email, phone, status) VALUES 
            (1, 1, 'METRO AG', 'Großhandel', 'bestellung@metro.de', '+49 211 6886-0', 'active'),
            (2, 1, 'Transgourmet', 'Großhandel', 'order@transgourmet.de', '+49 69 9450-0', 'active'),
            (3, 1, 'Metzgerei Wagner', 'Regional', 'info@metzgerei-wagner.de', '+49 911 123456', 'active'),
            (4, 1, 'Bio-Hof Schmidt', 'Regional', 'bio@schmidt-hof.de', '+49 911 234567', 'active')
        `);

        // 5. Supplier Articles
        console.log('📦 Creating supplier articles...');
        await client.query(`
            INSERT INTO supplier_articles (
                id, article_number, name, category_id, supplier_id, 
                unit, purchase_price, nutrition_info, allergen_info, is_active
            ) VALUES 
            (1, 'ART-001', 'Tomaten rot Klasse I', 2, 1, 'kg', 2.50, 
             '{"calories": 18, "protein": 0.9, "carbs": 3.9, "fat": 0.2}', 
             '{"gluten": false}', true),
            (2, 'ART-002', 'Zwiebeln gelb 5kg', 2, 1, 'kg', 1.80,
             '{"calories": 40, "protein": 1.1, "carbs": 9.3, "fat": 0.1}',
             '{"gluten": false}', true),
            (3, 'ART-003', 'Kartoffeln festkochend', 2, 2, 'kg', 1.20,
             '{"calories": 77, "protein": 2, "carbs": 17, "fat": 0.1}',
             '{"gluten": false}', true),
            (4, 'ART-004', 'Rindergulasch frisch', 1, 3, 'kg', 12.90,
             '{"calories": 201, "protein": 26.3, "carbs": 0, "fat": 10.1}',
             '{"gluten": false}', true),
            (5, 'ART-005', 'Hähnchenbrust ohne Haut', 1, 3, 'kg', 8.90,
             '{"calories": 165, "protein": 31, "carbs": 0, "fat": 3.6}',
             '{"gluten": false}', true),
            (6, 'ART-006', 'Basmati Reis Premium', 4, 2, 'kg', 3.50,
             '{"calories": 360, "protein": 6.8, "carbs": 79.5, "fat": 0.6}',
             '{"gluten": false}', true),
            (7, 'ART-007', 'Spaghetti No.5', 4, 2, 'kg', 1.80,
             '{"calories": 371, "protein": 13, "carbs": 75, "fat": 1.5}',
             '{"gluten": true}', true),
            (8, 'ART-008', 'Olivenöl Extra Vergine', 4, 1, 'l', 8.90,
             '{"calories": 884, "protein": 0, "carbs": 0, "fat": 100}',
             '{"gluten": false}', true),
            (9, 'ART-009', 'Vollmilch 3,5%', 3, 1, 'l', 1.19,
             '{"calories": 64, "protein": 3.3, "carbs": 4.8, "fat": 3.5}',
             '{"lactose": true}', true),
            (10, 'ART-010', 'Pfeffer schwarz gemahlen', 5, 1, 'kg', 18.90,
             '{"calories": 251, "protein": 10.4, "carbs": 63.9, "fat": 3.3}',
             '{"gluten": false}', true)
        `);

        // 6. Recipes
        console.log('🍳 Creating recipes...');
        await client.query(`
            INSERT INTO recipes (
                id, tenant_id, name, category_id, servings, 
                cost_per_serving, selling_price, is_active,
                preparation_time, cooking_time, description
            ) VALUES 
            (1, 1, 'Spaghetti Bolognese', 4, 10, 2.80, 5.90, true, 30, 45,
             'Klassische italienische Pasta mit Fleischsauce'),
            (2, 1, 'Hähnchencurry mit Reis', 1, 10, 3.50, 6.90, true, 20, 30,
             'Würziges Curry mit zartem Hähnchenfleisch'),
            (3, 1, 'Kartoffelgulasch', 4, 10, 2.20, 4.50, true, 20, 40,
             'Deftiger Eintopf mit Kartoffeln und Rindfleisch'),
            (4, 1, 'Gemüsepfanne', 2, 10, 1.80, 3.90, true, 15, 20,
             'Bunte Gemüsepfanne mit frischen Zutaten')
        `);

        // 7. Recipe Ingredients
        console.log('🥘 Adding recipe ingredients...');
        await client.query(`
            INSERT INTO recipe_ingredients (recipe_id, supplier_article_id, quantity, unit) VALUES 
            -- Spaghetti Bolognese
            (1, 7, 1.5, 'kg'),  -- Spaghetti
            (1, 4, 1.0, 'kg'),  -- Rindergulasch
            (1, 1, 0.5, 'kg'),  -- Tomaten
            (1, 2, 0.2, 'kg'),  -- Zwiebeln
            -- Hähnchencurry
            (2, 5, 1.5, 'kg'),  -- Hähnchen
            (2, 6, 1.0, 'kg'),  -- Reis
            (2, 2, 0.3, 'kg'),  -- Zwiebeln
            (2, 9, 0.5, 'l'),   -- Milch
            -- Kartoffelgulasch  
            (3, 3, 2.0, 'kg'),  -- Kartoffeln
            (3, 4, 0.5, 'kg'),  -- Rindergulasch
            (3, 2, 0.3, 'kg'),  -- Zwiebeln
            -- Gemüsepfanne
            (4, 1, 0.5, 'kg'),  -- Tomaten
            (4, 2, 0.3, 'kg'),  -- Zwiebeln
            (4, 3, 1.0, 'kg'),  -- Kartoffeln
            (4, 8, 0.1, 'l')    -- Olivenöl
        `);

        // 8. Inventory
        console.log('📊 Creating inventory...');
        await client.query(`
            INSERT INTO inventory (
                tenant_id, supplier_article_id, current_stock, 
                min_stock, max_stock, unit, last_updated
            )
            SELECT 1, id, 
                   CASE 
                       WHEN unit = 'kg' AND category_id = 1 THEN 30  -- Meat
                       WHEN unit = 'kg' THEN 50                      -- Other kg
                       WHEN unit = 'l' THEN 25                       -- Liquids
                       ELSE 100                                       -- Default
                   END,
                   10, 200, unit, CURRENT_TIMESTAMP
            FROM supplier_articles
            WHERE is_active = true
        `);

        // 9. Final check
        const stats = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM tenants) as tenants,
                (SELECT COUNT(*) FROM users WHERE tenant_id = 1) as users,
                (SELECT COUNT(*) FROM suppliers WHERE tenant_id = 1) as suppliers,
                (SELECT COUNT(*) FROM supplier_articles) as articles,
                (SELECT COUNT(*) FROM recipes WHERE tenant_id = 1) as recipes,
                (SELECT COUNT(*) FROM recipe_ingredients) as ingredients,
                (SELECT COUNT(*) FROM inventory WHERE tenant_id = 1) as inventory
        `);

        console.log('\n' + '='.repeat(60));
        console.log('✅ DATABASE SUCCESSFULLY SEEDED!');
        console.log('='.repeat(60));
        console.log('📊 Final Statistics:');
        console.log(`   - ${stats.rows[0].tenants} Tenants`);
        console.log(`   - ${stats.rows[0].users} Users`);
        console.log(`   - ${stats.rows[0].suppliers} Suppliers`);
        console.log(`   - ${stats.rows[0].articles} Articles`);
        console.log(`   - ${stats.rows[0].recipes} Recipes`);
        console.log(`   - ${stats.rows[0].ingredients} Recipe Ingredients`);
        console.log(`   - ${stats.rows[0].inventory} Inventory Items`);
        console.log('\n🔗 Access FoodSuite at: http://18.195.206.72:3005');
        console.log('👤 Login: admin / Demo123!');
        console.log('🎉 Everything is ready to use!');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

seedDatabase();
EOF

echo ""
echo "📋 ANLEITUNG:"
echo "============="
echo ""
echo "1. Kopiere dieses Script auf EC2:"
echo "   scp -i YOUR-KEY.pem EXECUTE_ON_EC2.sh ubuntu@18.195.206.72:~/"
echo ""
echo "2. SSH auf EC2:"
echo "   ssh -i YOUR-KEY.pem ubuntu@18.195.206.72"
echo ""
echo "3. Führe aus:"
echo "   chmod +x EXECUTE_ON_EC2.sh"
echo "   ./EXECUTE_ON_EC2.sh"
echo "   node /tmp/seed-foodsuite.js"
echo ""
echo "4. Fertig! Teste: http://18.195.206.72:3005"
echo "   Login: admin / Demo123!"
echo ""
echo "ODER führe direkt auf EC2 aus:"
echo "   node /tmp/seed-foodsuite.js"