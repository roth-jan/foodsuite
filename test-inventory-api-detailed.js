const http = require('http');
const fs = require('fs');

console.log('🔍 Detaillierter Test der Lagerverwaltung...\n');

// First, let's check if the HTML file has our fix
console.log('1️⃣ Prüfe ob die HTML-Datei korrekt gepatcht wurde...');
const htmlContent = fs.readFileSync('foodsuite-complete-app.html', 'utf8');
const hasOldCode = htmlContent.includes('await api.getProducts({ limit: 100 });');
const hasNewCode = htmlContent.includes("await api.get('/inventory?limit=100');");

console.log(`   ❌ Alter Code vorhanden: ${hasOldCode}`);
console.log(`   ✅ Neuer Code vorhanden: ${hasNewCode}`);

if (hasOldCode && !hasNewCode) {
    console.log('\n⚠️  WARNUNG: Die HTML-Datei wurde nicht korrekt gepatcht!');
}

// Test the API
console.log('\n2️⃣ Teste Inventory API direkt...');

const testApi = (path, description) => {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 3003,
            path: path,
            method: 'GET',
            headers: {
                'x-tenant-id': 'demo'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    console.log(`\n   ${description}:`);
                    console.log(`   Status: ${res.statusCode}`);
                    console.log(`   Items: ${response.items ? response.items.length : 0}`);
                    
                    if (response.items && response.items.length > 0) {
                        console.log(`   Beispiel: ${response.items[0].name} - ${response.items[0].stock} ${response.items[0].unit}`);
                    }
                    
                    resolve({ success: true, data: response });
                } catch (error) {
                    console.log(`   ❌ Fehler: ${error.message}`);
                    resolve({ success: false, error });
                }
            });
        });

        req.on('error', (error) => {
            console.log(`   ❌ Verbindungsfehler: ${error.message}`);
            resolve({ success: false, error });
        });

        req.end();
    });
};

// Run tests
(async () => {
    // Test inventory endpoint
    await testApi('/api/inventory?limit=10', 'Inventory API');
    
    // Test products endpoint (old way)
    await testApi('/api/products?limit=10', 'Products API (alter Weg)');
    
    console.log('\n3️⃣ Zusammenfassung:');
    console.log('='.repeat(50));
    
    if (hasNewCode && !hasOldCode) {
        console.log('✅ HTML-Datei wurde korrekt gepatcht');
        console.log('✅ loadInventory() nutzt jetzt /api/inventory');
        console.log('\n📝 Nächste Schritte:');
        console.log('   1. Öffnen Sie http://localhost:3003');
        console.log('   2. Melden Sie sich an: admin / Demo123!');
        console.log('   3. Gehen Sie zu: Mehr → Lagerverwaltung');
        console.log('   4. Die Lagerdaten sollten jetzt angezeigt werden!');
    } else {
        console.log('❌ Problem: HTML-Datei hat noch den alten Code');
        console.log('   Die loadInventory() Funktion muss korrigiert werden');
    }
    
    console.log('='.repeat(50));
})();