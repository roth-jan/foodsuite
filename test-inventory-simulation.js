const http = require('http');

console.log('🔬 Simuliere Browser-Verhalten für Lagerverwaltung...\n');

// Simulate what the browser does
function simulateLoadInventory() {
    return new Promise((resolve) => {
        console.log('📋 Simuliere loadInventory() Funktion...');
        console.log('   - Rufe api.get("/inventory?limit=100") auf...');
        
        const options = {
            hostname: 'localhost',
            port: 3003,
            path: '/api/inventory?limit=100',
            method: 'GET',
            headers: {
                'x-tenant-id': 'demo',
                'Accept': 'application/json'
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
                    console.log(`   - Status: ${res.statusCode}`);
                    console.log(`   - Anzahl Items: ${response.items ? response.items.length : 0}`);
                    
                    if (response.items && response.items.length > 0) {
                        console.log('\n📦 Inventar-Tabelle würde zeigen:');
                        console.log('━'.repeat(70));
                        console.log('Name'.padEnd(30) + '│ Kategorie'.padEnd(20) + '│ Bestand'.padEnd(20));
                        console.log('─'.repeat(70));
                        
                        response.items.slice(0, 10).forEach(item => {
                            const name = item.name.padEnd(30).substring(0, 30);
                            const category = (item.category || 'N/A').padEnd(20).substring(0, 20);
                            const stock = `${item.stock} ${item.unit}`.padEnd(20);
                            console.log(`${name}│ ${category}│ ${stock}`);
                        });
                        
                        if (response.items.length > 10) {
                            console.log(`... und ${response.items.length - 10} weitere Artikel`);
                        }
                        console.log('━'.repeat(70));
                        
                        resolve({ success: true, itemCount: response.items.length });
                    } else {
                        console.log('\n❌ PROBLEM: Keine Items in der Response!');
                        console.log('   Response:', JSON.stringify(response).substring(0, 200));
                        resolve({ success: false, error: 'Keine Items' });
                    }
                } catch (error) {
                    console.log(`\n❌ FEHLER beim Parsen: ${error.message}`);
                    console.log('   Raw data:', data.substring(0, 200));
                    resolve({ success: false, error: error.message });
                }
            });
        });

        req.on('error', (error) => {
            console.log(`\n❌ Verbindungsfehler: ${error.message}`);
            resolve({ success: false, error: error.message });
        });

        req.end();
    });
}

// Run simulation
(async () => {
    const result = await simulateLoadInventory();
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 TESTERGEBNIS:');
    console.log('='.repeat(70));
    
    if (result.success) {
        console.log(`✅ ERFOLG: ${result.itemCount} Lagerartikel würden angezeigt werden!`);
        console.log('\n✅ Die Lagerverwaltung sollte im Browser funktionieren.');
        console.log('\n📝 Bitte öffnen Sie jetzt manuell:');
        console.log('   1. http://localhost:3003');
        console.log('   2. Login: admin / Demo123!');
        console.log('   3. Mehr → Lagerverwaltung');
        console.log('\n   Die Tabelle sollte die oben gezeigten Daten anzeigen.');
    } else {
        console.log('❌ FEHLER: Lagerverwaltung würde keine Daten anzeigen!');
        console.log(`   Problem: ${result.error}`);
    }
    console.log('='.repeat(70));
})();