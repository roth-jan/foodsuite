const { Client } = require('pg');

async function seedDatabase() {
    console.log('🚀 Starte Datenbank-Seed für RDS...\n');
    
    const client = new Client({
        host: 'foodsuite-db.cdwrysfxunos.eu-central-1.rds.amazonaws.com',
        port: 5432,
        database: 'foodsuite',
        user: 'foodsuite',
        password: 'FoodSuite2025Secure!'
    });

    try {
        await client.connect();
        console.log('✅ Mit RDS verbunden!');

        // 1. Erst mal Tenant prüfen/erstellen
        console.log('\n📋 Erstelle Tenant...');
        await client.query(`
            INSERT INTO tenants (id, tenant_key, name, email) 
            VALUES (1, 'demo', 'Demo Restaurant', 'demo@foodsuite.com')
            ON CONFLICT (id) DO NOTHING
        `);

        // 2. Admin User
        console.log('👤 Erstelle Admin User...');
        await client.query(`
            INSERT INTO users (tenant_id, username, email, password_hash, role) 
            VALUES (1, 'admin', 'admin@foodsuite.com', '$2a$10$xGqwkmPXAKnWCeXdUe8uEu/MqCt2xUanPOqx1IpxKH6vNlN.4o5H2', 'admin')
            ON CONFLICT (username) DO NOTHING
        `);

        // 3. Kategorien
        console.log('📁 Erstelle Kategorien...');
        const categories = [
            ['Fleisch', 'meat'],
            ['Gemüse', 'vegetables'],
            ['Milchprodukte', 'dairy'],
            ['Getränke', 'beverages'],
            ['Tiefkühl', 'frozen'],
            ['Gewürze', 'spices'],
            ['Grundnahrung', 'staples']
        ];
        
        for (const [name, code] of categories) {
            await client.query(
                'INSERT INTO product_categories (name, code) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING',
                [name, code]
            );
        }

        // 4. Lieferanten
        console.log('🚚 Erstelle Lieferanten...');
        const suppliers = [
            ['METRO AG', 'Großhandel'],
            ['Transgourmet Deutschland', 'Großhandel'],
            ['EDEKA Foodservice', 'Großhandel'],
            ['Metzgerei Wagner', 'Lokal'],
            ['Bio-Hof Schmidt', 'Regional']
        ];

        for (let i = 0; i < suppliers.length; i++) {
            await client.query(`
                INSERT INTO suppliers (id, tenant_id, name, type, status) 
                VALUES ($1, 1, $2, $3, 'active')
                ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
            `, [i + 1, suppliers[i][0], suppliers[i][1]]);
        }

        // 5. Produkte
        console.log('📦 Erstelle Produkte...');
        const products = [
            // [article_number, name, category, unit, price, supplier_id]
            ['TOM-001', 'Tomaten frisch', 'Gemüse', 'kg', 2.50, 1],
            ['ZWI-001', 'Zwiebeln gelb', 'Gemüse', 'kg', 1.80, 1],
            ['KAR-001', 'Kartoffeln festkochend', 'Gemüse', 'kg', 1.20, 2],
            ['RIN-001', 'Rindergulasch', 'Fleisch', 'kg', 12.90, 4],
            ['HAE-001', 'Hähnchenbrust', 'Fleisch', 'kg', 8.90, 4],
            ['MIL-001', 'Vollmilch 3,5%', 'Milchprodukte', 'l', 1.19, 3],
            ['REI-001', 'Basmati Reis', 'Grundnahrung', 'kg', 3.50, 2],
            ['NUD-001', 'Spaghetti', 'Grundnahrung', 'kg', 1.80, 2],
            ['OEL-001', 'Olivenöl Extra Vergine', 'Grundnahrung', 'l', 8.90, 1],
            ['SAL-001', 'Meersalz', 'Gewürze', 'kg', 2.20, 1],
            ['PFE-001', 'Pfeffer schwarz', 'Gewürze', 'kg', 18.90, 1],
            ['PAP-001', 'Paprika edelsüß', 'Gewürze', 'kg', 12.50, 1]
        ];

        for (const product of products) {
            await client.query(`
                INSERT INTO products (
                    tenant_id, article_number, name, category, unit, price, 
                    supplier_id, status, stock, min_stock, max_stock
                ) VALUES (1, $1, $2, $3, $4, $5, $6, 'active', $7, 5, 100)
                ON CONFLICT (article_number) DO UPDATE 
                SET name = EXCLUDED.name, price = EXCLUDED.price
            `, [...product, Math.floor(Math.random() * 50) + 20]);
        }

        // 6. Rezepte
        console.log('🍳 Erstelle Rezepte...');
        const recipes = [
            {
                name: 'Spaghetti Bolognese',
                category: 'Hauptgericht',
                servings: 10,
                cost: 2.80,
                price: 5.90,
                ingredients: [
                    { product: 'NUD-001', quantity: 1.5, unit: 'kg' },
                    { product: 'RIN-001', quantity: 1.0, unit: 'kg' },
                    { product: 'TOM-001', quantity: 0.5, unit: 'kg' },
                    { product: 'ZWI-001', quantity: 0.2, unit: 'kg' }
                ]
            },
            {
                name: 'Hähnchencurry mit Reis',
                category: 'Hauptgericht',
                servings: 10,
                cost: 3.50,
                price: 6.90,
                ingredients: [
                    { product: 'HAE-001', quantity: 1.5, unit: 'kg' },
                    { product: 'REI-001', quantity: 1.0, unit: 'kg' },
                    { product: 'ZWI-001', quantity: 0.3, unit: 'kg' },
                    { product: 'MIL-001', quantity: 0.5, unit: 'l' }
                ]
            },
            {
                name: 'Kartoffelgulasch',
                category: 'Hauptgericht',
                servings: 10,
                cost: 2.20,
                price: 4.50,
                ingredients: [
                    { product: 'KAR-001', quantity: 2.0, unit: 'kg' },
                    { product: 'RIN-001', quantity: 0.5, unit: 'kg' },
                    { product: 'ZWI-001', quantity: 0.3, unit: 'kg' },
                    { product: 'PAP-001', quantity: 0.02, unit: 'kg' }
                ]
            },
            {
                name: 'Gemüsepfanne',
                category: 'Vegetarisch',
                servings: 10,
                cost: 1.80,
                price: 3.90,
                ingredients: [
                    { product: 'TOM-001', quantity: 0.5, unit: 'kg' },
                    { product: 'ZWI-001', quantity: 0.3, unit: 'kg' },
                    { product: 'KAR-001', quantity: 1.0, unit: 'kg' },
                    { product: 'OEL-001', quantity: 0.1, unit: 'l' }
                ]
            }
        ];

        for (const recipe of recipes) {
            // Rezept erstellen
            const recipeResult = await client.query(`
                INSERT INTO recipes (
                    tenant_id, name, category, servings, 
                    cost_per_serving, selling_price, is_active
                ) VALUES (1, $1, $2, $3, $4, $5, true)
                RETURNING id
            `, [recipe.name, recipe.category, recipe.servings, recipe.cost, recipe.price]);
            
            const recipeId = recipeResult.rows[0].id;
            
            // Zutaten hinzufügen
            for (const ing of recipe.ingredients) {
                // Produkt ID finden
                const productResult = await client.query(
                    'SELECT id FROM products WHERE article_number = $1',
                    [ing.product]
                );
                
                if (productResult.rows.length > 0) {
                    await client.query(`
                        INSERT INTO recipe_ingredients (
                            recipe_id, product_id, quantity, unit
                        ) VALUES ($1, $2, $3, $4)
                    `, [recipeId, productResult.rows[0].id, ing.quantity, ing.unit]);
                }
            }
        }

        // 7. Lagerbestand initialisieren
        console.log('📊 Initialisiere Lagerbestand...');
        await client.query(`
            INSERT INTO inventory (tenant_id, product_id, current_stock, min_stock, max_stock, unit)
            SELECT 1, id, stock, min_stock, max_stock, unit
            FROM products
            WHERE tenant_id = 1
            ON CONFLICT DO NOTHING
        `);

        // Statistik
        const stats = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM products WHERE tenant_id = 1) as products,
                (SELECT COUNT(*) FROM recipes WHERE tenant_id = 1) as recipes,
                (SELECT COUNT(*) FROM suppliers WHERE tenant_id = 1) as suppliers,
                (SELECT COUNT(*) FROM inventory WHERE tenant_id = 1) as inventory
        `);

        console.log('\n✅ Datenbank erfolgreich gefüllt!');
        console.log('📊 Statistik:');
        console.log(`   - ${stats.rows[0].products} Produkte`);
        console.log(`   - ${stats.rows[0].recipes} Rezepte`);
        console.log(`   - ${stats.rows[0].suppliers} Lieferanten`);
        console.log(`   - ${stats.rows[0].inventory} Lagerbestände`);

    } catch (error) {
        console.error('❌ Fehler:', error.message);
        console.error(error);
    } finally {
        await client.end();
    }
}

// Ausführen
seedDatabase();