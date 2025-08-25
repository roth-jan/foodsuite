#!/bin/bash
# Komplettes Deployment Script für FoodSuite auf AWS

echo "🚀 FOODSUITE COMPLETE DEPLOYMENT SCRIPT"
echo "======================================"
echo ""

# Variablen
EC2_IP="18.195.206.72"
EC2_URL="http://${EC2_IP}:3005"
API_URL="${EC2_URL}/api"

# 1. Erstelle Deployment Package
echo "📦 Erstelle Deployment Package..."

mkdir -p foodsuite-deploy-complete
cd foodsuite-deploy-complete

# Kopiere alle notwendigen Dateien
cp ../foodsuite-complete-app.html .
cp ../server.js .
cp ../package.json .
cp ../package-lock.json .
cp -r ../database .
cp -r ../routes .
cp -r ../middleware .
cp -r ../utils .

# Erstelle Seed-Script für PostgreSQL
cat > seed-postgres.js << 'EOF'
const { Client } = require('pg');

async function seedDatabase() {
    console.log('🚀 Seeding PostgreSQL Database...\n');
    
    const client = new Client({
        host: 'foodsuite-db.cdwrysfxunos.eu-central-1.rds.amazonaws.com',
        port: 5432,
        database: 'foodsuite',
        user: 'foodsuite',
        password: 'FoodSuite2025Secure!',
        ssl: false
    });

    try {
        await client.connect();
        console.log('✅ Connected to RDS!\n');

        // Clean existing data
        console.log('🧹 Cleaning existing data...');
        await client.query('TRUNCATE TABLE recipe_ingredients, inventory, recipes, supplier_articles, neutral_articles, article_mappings, suppliers, users, tenants RESTART IDENTITY CASCADE');

        // 1. Create tenant
        console.log('📋 Creating tenant...');
        await client.query(`
            INSERT INTO tenants (id, tenant_key, name, email, settings) 
            VALUES (1, 'demo', 'Demo Restaurant', 'demo@foodsuite.com', '{}')
        `);

        // 2. Create admin user
        console.log('👤 Creating admin user...');
        await client.query(`
            INSERT INTO users (tenant_id, username, email, password_hash, role, is_active) 
            VALUES (1, 'admin', 'admin@foodsuite.com', '$2a$10$xGqwkmPXAKnWCeXdUe8uEu/MqCt2xUanPOqx1IpxKH6vNlN.4o5H2', 'admin', true)
        `);

        // 3. Create categories
        console.log('📁 Creating categories...');
        const categories = [
            ['Fleisch', 'meat'],
            ['Gemüse', 'vegetables'], 
            ['Milchprodukte', 'dairy'],
            ['Grundnahrung', 'staples'],
            ['Gewürze', 'spices']
        ];
        
        const categoryIds = {};
        for (const [name, code] of categories) {
            const result = await client.query(
                'INSERT INTO product_categories (name, code) VALUES ($1, $2) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id',
                [name, code]
            );
            categoryIds[name] = result.rows[0].id;
        }

        // 4. Create suppliers
        console.log('🚚 Creating suppliers...');
        const suppliers = [
            ['METRO AG', 'Großhandel', 'bestellung@metro.de'],
            ['Transgourmet', 'Großhandel', 'order@transgourmet.de'],
            ['Metzgerei Wagner', 'Regional', 'info@metzgerei-wagner.de'],
            ['Bio-Hof Schmidt', 'Regional', 'bio@schmidt-hof.de']
        ];
        
        const supplierIds = {};
        for (const [name, type, email] of suppliers) {
            const result = await client.query(
                'INSERT INTO suppliers (tenant_id, name, type, email, status) VALUES (1, $1, $2, $3, \'active\') RETURNING id',
                [name, type, email]
            );
            supplierIds[name] = result.rows[0].id;
        }

        // 5. Create supplier articles
        console.log('📦 Creating supplier articles...');
        const articles = [
            ['ART-001', 'Tomaten rot Klasse I', categoryIds['Gemüse'], supplierIds['METRO AG'], 'kg', 2.50],
            ['ART-002', 'Zwiebeln gelb 5kg', categoryIds['Gemüse'], supplierIds['METRO AG'], 'kg', 1.80],
            ['ART-003', 'Kartoffeln festkochend', categoryIds['Gemüse'], supplierIds['Transgourmet'], 'kg', 1.20],
            ['ART-004', 'Rindergulasch frisch', categoryIds['Fleisch'], supplierIds['Metzgerei Wagner'], 'kg', 12.90],
            ['ART-005', 'Hähnchenbrust ohne Haut', categoryIds['Fleisch'], supplierIds['Metzgerei Wagner'], 'kg', 8.90],
            ['ART-006', 'Basmati Reis Premium', categoryIds['Grundnahrung'], supplierIds['Transgourmet'], 'kg', 3.50],
            ['ART-007', 'Spaghetti No.5', categoryIds['Grundnahrung'], supplierIds['Transgourmet'], 'kg', 1.80],
            ['ART-008', 'Olivenöl Extra Vergine', categoryIds['Grundnahrung'], supplierIds['METRO AG'], 'l', 8.90],
            ['ART-009', 'Vollmilch 3,5%', categoryIds['Milchprodukte'], supplierIds['METRO AG'], 'l', 1.19],
            ['ART-010', 'Pfeffer schwarz gemahlen', categoryIds['Gewürze'], supplierIds['METRO AG'], 'kg', 18.90]
        ];

        const articleIds = {};
        for (const [number, name, categoryId, supplierId, unit, price] of articles) {
            const result = await client.query(`
                INSERT INTO supplier_articles (
                    article_number, name, category_id, supplier_id, unit, 
                    purchase_price, nutrition_info, allergen_info, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, '{}', '{}', true)
                RETURNING id
            `, [number, name, categoryId, supplierId, unit, price]);
            articleIds[number] = result.rows[0].id;
        }

        // 6. Create recipes
        console.log('🍳 Creating recipes...');
        const recipes = [
            {
                name: 'Spaghetti Bolognese',
                category: categoryIds['Grundnahrung'],
                servings: 10,
                cost: 2.80,
                price: 5.90,
                ingredients: [
                    { article: articleIds['ART-007'], quantity: 1.5 },
                    { article: articleIds['ART-004'], quantity: 1.0 },
                    { article: articleIds['ART-001'], quantity: 0.5 },
                    { article: articleIds['ART-002'], quantity: 0.2 }
                ]
            },
            {
                name: 'Hähnchencurry mit Reis',
                category: categoryIds['Fleisch'],
                servings: 10,
                cost: 3.50,
                price: 6.90,
                ingredients: [
                    { article: articleIds['ART-005'], quantity: 1.5 },
                    { article: articleIds['ART-006'], quantity: 1.0 },
                    { article: articleIds['ART-002'], quantity: 0.3 },
                    { article: articleIds['ART-009'], quantity: 0.5 }
                ]
            },
            {
                name: 'Kartoffelgulasch',
                category: categoryIds['Grundnahrung'],
                servings: 10,
                cost: 2.20,
                price: 4.50,
                ingredients: [
                    { article: articleIds['ART-003'], quantity: 2.0 },
                    { article: articleIds['ART-004'], quantity: 0.5 },
                    { article: articleIds['ART-002'], quantity: 0.3 }
                ]
            },
            {
                name: 'Gemüsepfanne',
                category: categoryIds['Gemüse'],
                servings: 10,
                cost: 1.80,
                price: 3.90,
                ingredients: [
                    { article: articleIds['ART-001'], quantity: 0.5 },
                    { article: articleIds['ART-002'], quantity: 0.3 },
                    { article: articleIds['ART-003'], quantity: 1.0 },
                    { article: articleIds['ART-008'], quantity: 0.1 }
                ]
            }
        ];

        for (const recipe of recipes) {
            const recipeResult = await client.query(`
                INSERT INTO recipes (
                    tenant_id, name, category_id, servings, 
                    cost_per_serving, selling_price, is_active,
                    preparation_time, cooking_time
                ) VALUES (1, $1, $2, $3, $4, $5, true, 30, 45)
                RETURNING id
            `, [recipe.name, recipe.category, recipe.servings, recipe.cost, recipe.price]);
            
            const recipeId = recipeResult.rows[0].id;
            
            for (const ing of recipe.ingredients) {
                await client.query(`
                    INSERT INTO recipe_ingredients (
                        recipe_id, supplier_article_id, quantity, unit
                    ) VALUES ($1, $2, $3, (SELECT unit FROM supplier_articles WHERE id = $2))
                `, [recipeId, ing.article, ing.quantity]);
            }
            console.log(`   ✅ ${recipe.name}`);
        }

        // 7. Initialize inventory
        console.log('📊 Initializing inventory...');
        await client.query(`
            INSERT INTO inventory (
                tenant_id, supplier_article_id, current_stock, 
                min_stock, max_stock, unit, last_updated
            )
            SELECT 1, id, 
                   CASE 
                       WHEN unit = 'kg' THEN 50 + random() * 50
                       WHEN unit = 'l' THEN 20 + random() * 30
                       ELSE 100
                   END,
                   10, 200, unit, CURRENT_TIMESTAMP
            FROM supplier_articles
            WHERE is_active = true
        `);

        // Stats
        const stats = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM suppliers WHERE tenant_id = 1) as suppliers,
                (SELECT COUNT(*) FROM supplier_articles) as articles,
                (SELECT COUNT(*) FROM recipes WHERE tenant_id = 1) as recipes,
                (SELECT COUNT(*) FROM inventory WHERE tenant_id = 1) as inventory
        `);

        console.log('\n✅ DATABASE SUCCESSFULLY SEEDED!');
        console.log(`   - ${stats.rows[0].suppliers} Suppliers`);
        console.log(`   - ${stats.rows[0].articles} Articles`);
        console.log(`   - ${stats.rows[0].recipes} Recipes`);
        console.log(`   - ${stats.rows[0].inventory} Inventory items`);

    } catch (error) {
        console.error('❌ ERROR:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

seedDatabase();
EOF

# Erstelle Deployment Script
cat > deploy.sh << 'EOF'
#!/bin/bash
echo "🚀 Deploying FoodSuite..."

# Install dependencies
npm install

# Seed database
echo "🌱 Seeding database..."
node seed-postgres.js

# Start with PM2
pm2 delete foodsuite 2>/dev/null || true
DB_TYPE=postgres pm2 start server.js --name foodsuite

echo "✅ Deployment complete!"
echo "🔗 Access at: http://18.195.206.72:3005"
EOF

chmod +x deploy.sh

cd ..

# Erstelle TAR
tar -czf foodsuite-complete-deploy.tar.gz foodsuite-deploy-complete/

echo ""
echo "✅ Deployment package created: foodsuite-complete-deploy.tar.gz"
echo ""
echo "📋 NÄCHSTE SCHRITTE:"
echo "================================================"
echo "1. Kopiere das Package auf EC2:"
echo "   scp -i YOUR-KEY.pem foodsuite-complete-deploy.tar.gz ubuntu@${EC2_IP}:~/"
echo ""
echo "2. SSH auf EC2 und führe aus:"
echo "   ssh -i YOUR-KEY.pem ubuntu@${EC2_IP}"
echo "   tar -xzf foodsuite-complete-deploy.tar.gz"
echo "   cd foodsuite-deploy-complete"
echo "   ./deploy.sh"
echo ""
echo "3. Teste die App: ${EC2_URL}"
echo "   Login: admin / Demo123!"
echo "================================================"

# Cleanup
rm -rf foodsuite-deploy-complete/