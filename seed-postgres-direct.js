const { Client } = require('pg');

async function seedDatabase() {
    console.log('🚀 Direkte PostgreSQL Datenfüllung...\n');
    
    const client = new Client({
        host: 'foodsuite-db.cdwrysfxunos.eu-central-1.rds.amazonaws.com',
        port: 5432,
        database: 'foodsuite',
        user: 'foodsuite',
        password: 'FoodSuite2025Secure!',
        ssl: {
            rejectUnauthorized: false
        },
        connectionTimeoutMillis: 30000
    });

    try {
        console.log('⏳ Verbinde mit RDS (kann 30s dauern)...');
        await client.connect();
        console.log('✅ Verbunden!\n');

        // 1. Tenant
        console.log('📋 Erstelle Tenant...');
        await client.query(`
            INSERT INTO tenants (id, tenant_key, name, email, settings) 
            VALUES (1, 'demo', 'Demo Restaurant', 'demo@foodsuite.com', '{}')
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
        `);

        // 2. User
        console.log('👤 Erstelle Admin User...');
        await client.query(`
            INSERT INTO users (tenant_id, username, email, password_hash, role, is_active) 
            VALUES (1, 'admin', 'admin@foodsuite.com', '$2a$10$xGqwkmPXAKnWCeXdUe8uEu/MqCt2xUanPOqx1IpxKH6vNlN.4o5H2', 'admin', true)
            ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email
        `);

        // 3. Kategorien
        console.log('📁 Erstelle Kategorien...');
        const categoryResult = await client.query(`
            INSERT INTO product_categories (name, code) VALUES 
            ('Fleisch', 'meat'),
            ('Gemüse', 'vegetables'),
            ('Milchprodukte', 'dairy'),
            ('Grundnahrung', 'staples'),
            ('Gewürze', 'spices')
            ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
            RETURNING id, name, code
        `);
        
        const categories = {};
        categoryResult.rows.forEach(cat => {
            categories[cat.name] = cat.id;
        });
        console.log('   Kategorien erstellt:', Object.keys(categories).join(', '));

        // 4. Lieferanten
        console.log('\n🚚 Erstelle Lieferanten...');
        const supplierResult = await client.query(`
            INSERT INTO suppliers (tenant_id, name, type, email, status) VALUES 
            (1, 'METRO AG', 'Großhandel', 'bestellung@metro.de', 'active'),
            (1, 'Transgourmet', 'Großhandel', 'order@transgourmet.de', 'active'),
            (1, 'Metzgerei Wagner', 'Regional', 'info@metzgerei-wagner.de', 'active'),
            (1, 'Bio-Hof Schmidt', 'Regional', 'bio@schmidt-hof.de', 'active')
            ON CONFLICT DO NOTHING
            RETURNING id, name
        `);
        
        const suppliers = {};
        supplierResult.rows.forEach((sup, idx) => {
            suppliers[sup.name] = sup.id;
        });

        // 5. Lieferanten-Artikel (NEU!)
        console.log('\n📦 Erstelle Lieferanten-Artikel...');
        const supplierArticles = [
            // METRO Artikel
            ['ART-001', 'Tomaten rot Klasse I', categories['Gemüse'], suppliers['METRO AG'], 'kg', 2.50, 
             '{"calories": 18, "protein": 0.9, "carbs": 3.9, "fat": 0.2, "fiber": 1.2}', '{}'],
            ['ART-002', 'Zwiebeln gelb 5kg', categories['Gemüse'], suppliers['METRO AG'], 'kg', 1.80,
             '{"calories": 40, "protein": 1.1, "carbs": 9.3, "fat": 0.1, "fiber": 1.7}', '{}'],
            ['ART-003', 'Olivenöl Extra Vergine', categories['Grundnahrung'], suppliers['METRO AG'], 'l', 8.90,
             '{"calories": 884, "protein": 0, "carbs": 0, "fat": 100, "fiber": 0}', '{}'],
            ['ART-004', 'Pfeffer schwarz gemahlen', categories['Gewürze'], suppliers['METRO AG'], 'kg', 18.90,
             '{"calories": 251, "protein": 10.4, "carbs": 63.9, "fat": 3.3, "fiber": 25.3}', '{}'],
            
            // Transgourmet Artikel
            ['TG-001', 'Kartoffeln festkochend', categories['Gemüse'], suppliers['Transgourmet'], 'kg', 1.20,
             '{"calories": 77, "protein": 2, "carbs": 17, "fat": 0.1, "fiber": 2.2}', '{}'],
            ['TG-002', 'Basmati Reis Premium', categories['Grundnahrung'], suppliers['Transgourmet'], 'kg', 3.50,
             '{"calories": 360, "protein": 6.8, "carbs": 79.5, "fat": 0.6, "fiber": 1.3}', '{}'],
            ['TG-003', 'Spaghetti No.5', categories['Grundnahrung'], suppliers['Transgourmet'], 'kg', 1.80,
             '{"calories": 371, "protein": 13, "carbs": 75, "fat": 1.5, "fiber": 3}', '{}'],
            
            // Metzgerei Wagner Artikel
            ['MW-001', 'Rindergulasch frisch', categories['Fleisch'], suppliers['Metzgerei Wagner'], 'kg', 12.90,
             '{"calories": 201, "protein": 26.3, "carbs": 0, "fat": 10.1, "fiber": 0}', '{"gluten": false}'],
            ['MW-002', 'Hähnchenbrust ohne Haut', categories['Fleisch'], suppliers['Metzgerei Wagner'], 'kg', 8.90,
             '{"calories": 165, "protein": 31, "carbs": 0, "fat": 3.6, "fiber": 0}', '{"gluten": false}']
        ];

        for (const article of supplierArticles) {
            await client.query(`
                INSERT INTO supplier_articles (
                    article_number, name, category_id, supplier_id, unit, 
                    purchase_price, nutrition_info, allergen_info, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, true)
                ON CONFLICT (article_number) DO UPDATE 
                SET name = EXCLUDED.name, purchase_price = EXCLUDED.purchase_price
            `, article);
        }
        console.log(`✅ ${supplierArticles.length} Lieferanten-Artikel erstellt`);

        // 6. Neutrale Artikel
        console.log('\n🏷️ Erstelle Neutrale Artikel...');
        const neutralArticles = [
            ['NEUT-001', 'Tomaten', categories['Gemüse'], 'kg'],
            ['NEUT-002', 'Zwiebeln', categories['Gemüse'], 'kg'],
            ['NEUT-003', 'Kartoffeln', categories['Gemüse'], 'kg'],
            ['NEUT-004', 'Rindfleisch', categories['Fleisch'], 'kg'],
            ['NEUT-005', 'Hähnchen', categories['Fleisch'], 'kg'],
            ['NEUT-006', 'Reis', categories['Grundnahrung'], 'kg'],
            ['NEUT-007', 'Nudeln', categories['Grundnahrung'], 'kg'],
            ['NEUT-008', 'Speiseöl', categories['Grundnahrung'], 'l'],
            ['NEUT-009', 'Pfeffer', categories['Gewürze'], 'kg']
        ];

        for (const article of neutralArticles) {
            await client.query(`
                INSERT INTO neutral_articles (article_number, name, category_id, unit)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (article_number) DO UPDATE SET name = EXCLUDED.name
            `, article);
        }

        // 7. Artikel-Verknüpfungen
        console.log('\n🔗 Verknüpfe Artikel...');
        const mappings = [
            ['ART-001', 'NEUT-001', 1], // METRO Tomaten -> Neutrale Tomaten
            ['ART-002', 'NEUT-002', 1], // METRO Zwiebeln -> Neutrale Zwiebeln
            ['TG-001', 'NEUT-003', 1],  // Transgourmet Kartoffeln -> Neutrale Kartoffeln
            ['MW-001', 'NEUT-004', 1],  // Wagner Rind -> Neutrales Rindfleisch
            ['MW-002', 'NEUT-005', 1],  // Wagner Hähnchen -> Neutrales Hähnchen
            ['TG-002', 'NEUT-006', 1],  // Transgourmet Reis -> Neutraler Reis
            ['TG-003', 'NEUT-007', 1],  // Transgourmet Nudeln -> Neutrale Nudeln
            ['ART-003', 'NEUT-008', 1], // METRO Olivenöl -> Neutrales Speiseöl
            ['ART-004', 'NEUT-009', 1]  // METRO Pfeffer -> Neutraler Pfeffer
        ];

        for (const [supplierArt, neutralArt, priority] of mappings) {
            await client.query(`
                INSERT INTO article_mappings (supplier_article_id, neutral_article_id, priority)
                SELECT s.id, n.id, $3
                FROM supplier_articles s, neutral_articles n
                WHERE s.article_number = $1 AND n.article_number = $2
                ON CONFLICT DO NOTHING
            `, [supplierArt, neutralArt, priority]);
        }

        // 8. Rezepte mit Artikel-System
        console.log('\n🍳 Erstelle Rezepte...');
        const recipes = [
            {
                name: 'Spaghetti Bolognese',
                category_id: categories['Grundnahrung'],
                servings: 10,
                cost: 2.80,
                price: 5.90,
                ingredients: [
                    { supplier_article: 'TG-003', quantity: 1.5 }, // Spaghetti
                    { supplier_article: 'MW-001', quantity: 1.0 }, // Rindergulasch
                    { supplier_article: 'ART-001', quantity: 0.5 }, // Tomaten
                    { supplier_article: 'ART-002', quantity: 0.2 }  // Zwiebeln
                ]
            },
            {
                name: 'Hähnchencurry mit Reis',
                category_id: categories['Fleisch'],
                servings: 10,
                cost: 3.50,
                price: 6.90,
                ingredients: [
                    { supplier_article: 'MW-002', quantity: 1.5 }, // Hähnchen
                    { supplier_article: 'TG-002', quantity: 1.0 }, // Reis
                    { supplier_article: 'ART-002', quantity: 0.3 }, // Zwiebeln
                    { supplier_article: 'ART-004', quantity: 0.01 } // Pfeffer
                ]
            },
            {
                name: 'Kartoffelgulasch',
                category_id: categories['Grundnahrung'],
                servings: 10,
                cost: 2.20,
                price: 4.50,
                ingredients: [
                    { supplier_article: 'TG-001', quantity: 2.0 }, // Kartoffeln
                    { supplier_article: 'MW-001', quantity: 0.5 }, // Rindergulasch
                    { supplier_article: 'ART-002', quantity: 0.3 }  // Zwiebeln
                ]
            }
        ];

        for (const recipe of recipes) {
            // Rezept erstellen
            const recipeResult = await client.query(`
                INSERT INTO recipes (
                    tenant_id, name, category_id, servings, 
                    cost_per_serving, selling_price, is_active,
                    preparation_time, cooking_time
                ) VALUES (1, $1, $2, $3, $4, $5, true, 30, 45)
                RETURNING id
            `, [recipe.name, recipe.category_id, recipe.servings, recipe.cost, recipe.price]);
            
            const recipeId = recipeResult.rows[0].id;
            
            // Zutaten mit neuem System
            for (const ing of recipe.ingredients) {
                await client.query(`
                    INSERT INTO recipe_ingredients (
                        recipe_id, supplier_article_id, quantity, unit
                    )
                    SELECT $1, id, $2, unit
                    FROM supplier_articles
                    WHERE article_number = $3
                `, [recipeId, ing.quantity, ing.supplier_article]);
            }
            console.log(`   ✅ ${recipe.name}`);
        }

        // 9. Lagerbestand für Artikel
        console.log('\n📊 Initialisiere Lagerbestand...');
        await client.query(`
            INSERT INTO inventory (tenant_id, supplier_article_id, current_stock, min_stock, max_stock, unit, last_updated)
            SELECT 1, id, 
                   CASE 
                       WHEN unit = 'kg' THEN 50 + random() * 50
                       WHEN unit = 'l' THEN 20 + random() * 30
                       ELSE 100
                   END,
                   10, 200, unit, CURRENT_TIMESTAMP
            FROM supplier_articles
            WHERE supplier_id IN (SELECT id FROM suppliers WHERE tenant_id = 1)
            ON CONFLICT DO NOTHING
        `);

        // 10. Statistik
        const stats = await client.query(`
            SELECT 
                (SELECT COUNT(*) FROM supplier_articles WHERE is_active = true) as supplier_articles,
                (SELECT COUNT(*) FROM neutral_articles) as neutral_articles,
                (SELECT COUNT(*) FROM recipes WHERE tenant_id = 1) as recipes,
                (SELECT COUNT(*) FROM suppliers WHERE tenant_id = 1) as suppliers,
                (SELECT COUNT(*) FROM inventory WHERE tenant_id = 1) as inventory_items,
                (SELECT COUNT(*) FROM users WHERE tenant_id = 1) as users
        `);

        console.log('\n' + '='.repeat(60));
        console.log('✅ DATENBANK ERFOLGREICH GEFÜLLT!');
        console.log('='.repeat(60));
        console.log('📊 Statistik:');
        console.log(`   - ${stats.rows[0].supplier_articles} Lieferanten-Artikel`);
        console.log(`   - ${stats.rows[0].neutral_articles} Neutrale Artikel`);
        console.log(`   - ${stats.rows[0].recipes} Rezepte`);
        console.log(`   - ${stats.rows[0].suppliers} Lieferanten`);
        console.log(`   - ${stats.rows[0].inventory_items} Lagerbestände`);
        console.log(`   - ${stats.rows[0].users} Benutzer`);
        console.log('\n🔗 App URL: http://18.195.206.72:3005');
        console.log('👤 Login: admin / Demo123!');
        console.log('🎉 Die Datenbank ist jetzt voll funktionsfähig!');

    } catch (error) {
        console.error('\n❌ FEHLER:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('   → Kann nicht zu RDS verbinden');
            console.error('   → Prüfe Sicherheitsgruppen in AWS');
        }
    } finally {
        await client.end();
    }
}

// Start
seedDatabase();