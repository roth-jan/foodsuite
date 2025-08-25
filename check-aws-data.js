const fetch = require('node-fetch');

async function checkAWSData() {
    console.log('🔍 Prüfe AWS FoodSuite Daten...\n');
    
    const baseUrl = 'http://18.195.206.72:3005/api';
    
    try {
        // 1. Health Check
        const healthRes = await fetch(baseUrl + '/health');
        const health = await healthRes.json();
        console.log('✅ Server Status:', health.status);
        console.log('   Database:', health.database);
        
        // 2. Login
        console.log('\n🔐 Login als Admin...');
        const loginRes = await fetch(baseUrl + '/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': '1'
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'Demo123!'
            })
        });
        
        if (!loginRes.ok) {
            console.error('❌ Login fehlgeschlagen:', loginRes.status);
            const error = await loginRes.text();
            console.error(error);
            return;
        }
        
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('✅ Login erfolgreich!');
        
        // 3. Daten prüfen
        const headers = {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': '1'
        };
        
        // Produkte
        const productsRes = await fetch(baseUrl + '/products', { headers });
        const products = await productsRes.json();
        console.log('\n📦 Produkte:', products.items?.length || 0);
        if (products.items && products.items.length > 0) {
            console.log('   Beispiel:', products.items[0].name);
        }
        
        // Rezepte
        const recipesRes = await fetch(baseUrl + '/recipes', { headers });
        const recipes = await recipesRes.json();
        console.log('\n🍳 Rezepte:', recipes.items?.length || 0);
        if (recipes.items && recipes.items.length > 0) {
            console.log('   Beispiel:', recipes.items[0].name);
        }
        
        // Lieferanten
        const suppliersRes = await fetch(baseUrl + '/suppliers', { headers });
        const suppliers = await suppliersRes.json();
        console.log('\n🚚 Lieferanten:', suppliers.items?.length || 0);
        if (suppliers.items && suppliers.items.length > 0) {
            console.log('   Beispiel:', suppliers.items[0].name);
        }
        
        // Inventory
        const inventoryRes = await fetch(baseUrl + '/inventory', { headers });
        const inventory = await inventoryRes.json();
        console.log('\n📊 Lagerbestände:', inventory.items?.length || 0);
        
        // Zusammenfassung
        console.log('\n' + '='.repeat(50));
        if (products.items?.length > 0 && recipes.items?.length > 0) {
            console.log('✅ DATENBANK IST GEFÜLLT!');
            console.log('🎉 FoodSuite ist einsatzbereit!');
        } else {
            console.log('⚠️ DATENBANK IST NOCH LEER!');
            console.log('Führe das fill-database-ec2.sh Script auf EC2 aus!');
        }
        console.log('='.repeat(50));
        
    } catch (error) {
        console.error('❌ Fehler:', error.message);
    }
}

checkAWSData();