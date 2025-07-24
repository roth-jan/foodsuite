const { chromium } = require('playwright');

console.log('🚀 FINALER BROWSER-TEST MIT PLAYWRIGHT\n');

(async () => {
    let browser;
    try {
        console.log('Starte Browser mit minimalen Dependencies...');
        
        // Versuche verschiedene Optionen
        const launchOptions = [
            // Option 1: Headless mit minimal config
            {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
            },
            // Option 2: Mit executablePath
            {
                executablePath: '/usr/bin/chromium-browser',
                headless: true,
                args: ['--no-sandbox']
            },
            // Option 3: Channel
            {
                channel: 'chromium',
                headless: true,
                args: ['--no-sandbox']
            }
        ];
        
        let launched = false;
        for (const options of launchOptions) {
            try {
                console.log(`Versuche: ${JSON.stringify(options)}`);
                browser = await chromium.launch(options);
                launched = true;
                console.log('✅ Browser gestartet!');
                break;
            } catch (err) {
                console.log(`❌ Fehlgeschlagen: ${err.message.split('\n')[0]}`);
            }
        }
        
        if (!launched) {
            throw new Error('Konnte Browser nicht starten');
        }
        
        const page = await browser.newPage();
        
        // Test durchführen
        console.log('\n📋 Führe Test durch...');
        
        await page.goto('http://localhost:3003');
        console.log('1. Seite geladen');
        
        await page.fill('input[type="text"]', 'admin');
        await page.fill('input[type="password"]', 'Demo123!');
        await page.click('button:has-text("Anmelden")');
        console.log('2. Eingeloggt');
        
        await page.waitForTimeout(2000);
        
        await page.click('a.dropdown-toggle:has-text("Mehr")');
        await page.waitForTimeout(500);
        await page.click('a[data-tab="inventory"]');
        console.log('3. Lagerverwaltung geöffnet');
        
        await page.waitForTimeout(2000);
        
        // Zähle Zeilen
        const rows = await page.locator('#inventoryTable tbody tr').count();
        console.log(`\n📊 ERGEBNIS: ${rows} Zeilen in der Inventar-Tabelle`);
        
        if (rows > 0) {
            console.log('✅ ERFOLG: Lagerverwaltung zeigt Daten an!');
            
            // Hole erste Zeile
            const firstRow = await page.locator('#inventoryTable tbody tr').first();
            const cells = await firstRow.locator('td').all();
            if (cells.length >= 3) {
                const name = await cells[0].textContent();
                const category = await cells[1].textContent();
                const stock = await cells[2].textContent();
                console.log(`\nErste Zeile: ${name} | ${category} | ${stock}`);
            }
        } else {
            console.log('❌ FEHLER: Keine Daten angezeigt!');
        }
        
    } catch (error) {
        console.error('\n❌ Test fehlgeschlagen:', error.message);
        
        // Fallback: Teste API direkt
        console.log('\n🔧 Fallback: Teste API direkt...');
        const http = require('http');
        
        const req = http.get('http://localhost:3003/api/inventory?limit=5', {
            headers: { 'x-tenant-id': 'demo' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log(`API liefert ${result.items?.length || 0} Items`);
                    if (result.items?.[0]) {
                        console.log(`Beispiel: ${result.items[0].name} - ${result.items[0].stock} ${result.items[0].unit}`);
                    }
                } catch (e) {
                    console.error('API Fehler:', e.message);
                }
            });
        });
        req.on('error', console.error);
        
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();