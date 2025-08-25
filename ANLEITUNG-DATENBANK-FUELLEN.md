# 🚨 ANLEITUNG: PostgreSQL Datenbank auf AWS füllen

Die PostgreSQL Datenbank auf AWS RDS ist noch leer! Hier sind 3 Möglichkeiten, sie zu füllen:

## Option 1: Direkt auf EC2 ausführen (EMPFOHLEN)

1. **SSH auf die EC2-Instanz:**
```bash
ssh -i DEIN-KEY.pem ubuntu@18.195.206.72
```

2. **Script herunterladen und ausführen:**
```bash
# Script herunterladen
curl -o fill-db.sh https://raw.githubusercontent.com/DEIN-REPO/main/fill-database-ec2.sh

# Oder direkt das Script erstellen:
cat > fill-db.js << 'EOF'
const { Client } = require('pg');

async function seedDatabase() {
    console.log('🚀 Fülle PostgreSQL Datenbank...\n');
    
    const client = new Client({
        host: 'foodsuite-db.cdwrysfxunos.eu-central-1.rds.amazonaws.com',
        port: 5432,
        database: 'foodsuite',
        user: 'foodsuite',
        password: 'FoodSuite2025Secure!'
    });

    try {
        await client.connect();
        console.log('✅ Mit RDS verbunden!\n');

        // Tenant erstellen
        await client.query(`
            INSERT INTO tenants (id, tenant_key, name, email, settings) 
            VALUES (1, 'demo', 'Demo Restaurant', 'demo@foodsuite.com', '{}')
            ON CONFLICT (id) DO NOTHING
        `);

        // Admin User erstellen
        await client.query(`
            INSERT INTO users (tenant_id, username, email, password_hash, role, is_active) 
            VALUES (1, 'admin', 'admin@foodsuite.com', '$2a$10$xGqwkmPXAKnWCeXdUe8uEu/MqCt2xUanPOqx1IpxKH6vNlN.4o5H2', 'admin', true)
            ON CONFLICT (username) DO NOTHING
        `);

        // Kategorien
        await client.query(`
            INSERT INTO product_categories (name, code) VALUES 
            ('Fleisch', 'meat'),
            ('Gemüse', 'vegetables'),
            ('Milchprodukte', 'dairy'),
            ('Grundnahrung', 'staples'),
            ('Gewürze', 'spices')
            ON CONFLICT (code) DO NOTHING
        `);

        console.log('✅ Basisdaten erstellt!');
        console.log('🔗 Teste die App: http://18.195.206.72:3005');
        console.log('👤 Login: admin / Demo123!');

    } catch (error) {
        console.error('❌ Fehler:', error.message);
    } finally {
        await client.end();
    }
}

seedDatabase();
EOF

# Script ausführen
node fill-db.js
```

## Option 2: Von lokalem Computer mit korrekter Security Group

Falls die RDS Security Group deinen lokalen Computer erlaubt:

```bash
cd "/mnt/c/Users/JanHendrikRoth/OneDrive - NTConsult Software & Service GmbH/Claude/Foodsuite"
node seed-postgres-direct.js
```

## Option 3: Memory-Datenbank verwenden (TEMPORÄR)

Ändere die EC2-Umgebungsvariable:
```bash
# Auf EC2:
export DB_TYPE=memory
pm2 restart foodsuite

# Oder starte neu:
DB_TYPE=memory node server.js
```

## Aktueller Status

- ✅ EC2 läuft: http://18.195.206.72:3005
- ✅ PostgreSQL RDS läuft
- ❌ Datenbank ist LEER (0 Produkte, 0 Rezepte)
- ✅ Login-Seite funktioniert

## Was fehlt:

1. Tenant (ID: 1)
2. Admin User (admin/Demo123!)
3. Kategorien
4. Lieferanten
5. Artikel
6. Rezepte
7. Lagerbestände

**WICHTIG:** Die Datenbank MUSS gefüllt werden, damit die App funktioniert!