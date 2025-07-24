const { chromium } = require('playwright');
const path = require('path');

(async () => {
    console.log('🚀 Teste Lagerverwaltung mit Chrome für Testing...\n');
    
    const chromePath = path.join(__dirname, 'chrome/linux_arm-138.0.7204.168/chrome-linux64/chrome');
    console.log(`Chrome-Pfad: ${chromePath}\n`);
    
    let browser;
    try {
        browser = await chromium.launch({ 
            executablePath: chromePath,
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        
        const page = await browser.newPage();
        
        console.log('1️⃣ Öffne FoodSuite...');
        await page.goto('http://localhost:3003', { waitUntil: 'networkidle' });
        await page.screenshot({ path: 'chrome-test-1-login.png' });
        
        console.log('2️⃣ Login als admin...');
        await page.fill('input[type="text"]', 'admin');
        await page.fill('input[type="password"]', 'Demo123!');
        await page.click('button:has-text("Anmelden")');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'chrome-test-2-logged-in.png' });
        
        console.log('3️⃣ Navigiere zur Lagerverwaltung...');
        // Click Mehr dropdown
        await page.click('a.dropdown-toggle:has-text("Mehr")');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'chrome-test-3-dropdown.png' });
        
        // Click Lagerverwaltung
        await page.click('a[data-tab="inventory"]');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'chrome-test-4-inventory.png', fullPage: true });
        
        console.log('4️⃣ Analysiere Inventory-Tabelle...\n');
        
        // Check table
        const tableVisible = await page.isVisible('#inventoryTable');
        console.log(`   ✓ Tabelle sichtbar: ${tableVisible}`);
        
        // Count rows
        const rows = await page.locator('#inventoryTable tbody tr').count();
        console.log(`   ✓ Anzahl Zeilen: ${rows}`);
        
        // Check for messages
        const hasLoading = await page.isVisible('td:has-text("Lade Inventar")');
        const hasNoData = await page.isVisible('td:has-text("Keine Produkte")');
        
        if (hasLoading) console.log('   ⚠️  Lade-Nachricht sichtbar');
        if (hasNoData) console.log('   ⚠️  "Keine Produkte" Nachricht sichtbar');
        
        // Get first few rows if available
        if (rows > 0 && !hasLoading && !hasNoData) {
            console.log('\n   📦 Erste Lagerartikel:');
            for (let i = 0; i < Math.min(5, rows); i++) {
                const row = page.locator(`#inventoryTable tbody tr`).nth(i);
                const cells = await row.locator('td').all();
                
                if (cells.length >= 3) {
                    const name = await cells[0].textContent();
                    const category = await cells[1].textContent();
                    const stock = await cells[2].textContent();
                    console.log(`      ${i + 1}. ${name} | ${category} | ${stock}`);
                }
            }
            if (rows > 5) {
                console.log(`      ... und ${rows - 5} weitere Artikel`);
            }
        }
        
        // Final result
        console.log('\n' + '='.repeat(60));
        if (rows > 0 && !hasLoading && !hasNoData) {
            console.log(`✅ ERFOLG: Lagerverwaltung zeigt ${rows} Artikel an!`);
            console.log('✅ Die Korrektur funktioniert!');
        } else {
            console.log('❌ FEHLER: Keine Lagerdaten werden angezeigt!');
            
            // Debug API call
            console.log('\n🔍 Debug: Teste API direkt vom Browser...');
            const apiResult = await page.evaluate(async () => {
                try {
                    const response = await fetch('/api/inventory?limit=10', {
                        headers: { 'x-tenant-id': 'demo' }
                    });
                    const data = await response.json();
                    return {
                        status: response.status,
                        itemCount: data.items ? data.items.length : 0,
                        firstItem: data.items ? data.items[0] : null
                    };
                } catch (err) {
                    return { error: err.message };
                }
            });
            console.log('API Test Ergebnis:', apiResult);
        }
        console.log('='.repeat(60));
        
        console.log('\nBrowser bleibt 15 Sekunden offen zum Verifizieren...');
        await page.waitForTimeout(15000);
        
    } catch (error) {
        console.error('❌ Fehler:', error.message);
        if (error.message.includes('executable doesn\'t exist')) {
            console.log('\n⚠️  Chrome nicht gefunden. Verwende System-Chrome...');
            
            // Retry with system Chrome
            try {
                browser = await chromium.launch({ 
                    channel: 'chrome',
                    headless: false,
                    args: ['--no-sandbox']
                });
                console.log('✅ System-Chrome gestartet!');
                // ... rest of test
            } catch (err2) {
                console.error('Auch System-Chrome fehlgeschlagen:', err2.message);
            }
        }
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();