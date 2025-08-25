#!/bin/bash
# Remote Database Seeding ohne SSH

echo "🚀 REMOTE DATABASE SEEDING"
echo "========================="
echo ""

# Erstelle ein Node.js Script das auf EC2 ausgeführt werden kann
cat > remote-seed.js << 'EOF'
const { Client } = require('pg');

async function seedDatabase() {
    console.log('🌱 Starting database seed...\n');
    
    const client = new Client({
        host: 'foodsuite-db.cdwrysfxunos.eu-central-1.rds.amazonaws.com',
        port: 5432,
        database: 'foodsuite',
        user: 'foodsuite',
        password: 'FoodSuite2025Secure!'
    });

    try {
        await client.connect();
        console.log('✅ Connected to PostgreSQL\n');

        // Basic seed data
        await client.query(`
            -- Tenant
            INSERT INTO tenants (id, tenant_key, name, email, settings) 
            VALUES (1, 'demo', 'Demo Restaurant', 'demo@foodsuite.com', '{}')
            ON CONFLICT (id) DO NOTHING;

            -- Admin user
            INSERT INTO users (tenant_id, username, email, password_hash, role, is_active) 
            VALUES (1, 'admin', 'admin@foodsuite.com', '$2a$10$xGqwkmPXAKnWCeXdUe8uEu/MqCt2xUanPOqx1IpxKH6vNlN.4o5H2', 'admin', true)
            ON CONFLICT (username) DO NOTHING;

            -- Categories
            INSERT INTO product_categories (name, code) VALUES 
            ('Fleisch', 'meat'),
            ('Gemüse', 'vegetables'),
            ('Milchprodukte', 'dairy'),
            ('Grundnahrung', 'staples'),
            ('Gewürze', 'spices')
            ON CONFLICT (code) DO NOTHING;
        `);

        console.log('✅ Basic data created!');
        console.log('🔗 Test at: http://18.195.206.72:3005');
        console.log('👤 Login: admin / Demo123!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

seedDatabase();
EOF

echo "📝 Script erstellt: remote-seed.js"
echo ""
echo "OPTIONEN ZUM AUSFÜHREN:"
echo "======================="
echo ""
echo "Option 1 - Direkt auf EC2 (wenn du SSH hast):"
echo "  ssh -i YOUR-KEY.pem ubuntu@18.195.206.72"
echo "  cat > seed.js << 'EOF'"
echo "  [Füge den Inhalt von remote-seed.js ein]"
echo "  EOF"
echo "  node seed.js"
echo ""
echo "Option 2 - Verwende Memory DB (temporär):"
echo "  Starte den Server mit: DB_TYPE=memory"
echo "  Die Daten sind dann vorgeladen"
echo ""
echo "Option 3 - Warte auf meine EC2 Zugriff"
echo "  Ich brauche SSH Key um direkt zu seeden"