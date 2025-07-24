const { firefox } = require('playwright');

(async () => {
    console.log('🚀 Starte Firefox Browser-Test für Lagerverwaltung...\n');
    
    let browser;
    try {
        browser = await firefox.launch({ 
            headless: true
        });
        
        const page = await browser.newPage();
        
        // Navigate to application
        console.log('1️⃣ Navigiere zu FoodSuite...');
        await page.goto('http://localhost:3003', { waitUntil: 'networkidle' });
        
        // Take screenshot of login page
        await page.screenshot({ path: 'test-1-login-page.png' });
        console.log('   📸 Screenshot: test-1-login-page.png');
        
        // Login
        console.log('\n2️⃣ Melde mich an...');
        await page.fill('input[type="text"]', 'admin');
        await page.fill('input[type="password"]', 'Demo123!');
        await page.click('button:has-text("Anmelden")');
        await page.waitForTimeout(3000);
        
        // Take screenshot after login
        await page.screenshot({ path: 'test-2-after-login.png' });
        console.log('   📸 Screenshot: test-2-after-login.png');
        
        // Navigate to inventory
        console.log('\n3️⃣ Navigiere zur Lagerverwaltung...');
        
        // Click on "Mehr" dropdown
        await page.click('a.dropdown-toggle:has-text("Mehr")');
        await page.waitForTimeout(1000);
        
        // Take screenshot of dropdown
        await page.screenshot({ path: 'test-3-dropdown-open.png' });
        console.log('   📸 Screenshot: test-3-dropdown-open.png');
        
        // Click on Lagerverwaltung
        await page.click('a[data-tab="inventory"]');
        await page.waitForTimeout(3000);
        
        // Take screenshot of inventory page
        await page.screenshot({ path: 'test-4-inventory-page.png', fullPage: true });
        console.log('   📸 Screenshot: test-4-inventory-page.png');
        
        // Check if inventory content is loaded
        console.log('\n4️⃣ Prüfe Lagerbestand-Anzeige...');
        
        // Check if inventory table is visible
        const tableVisible = await page.locator('#inventoryTable').isVisible();
        console.log(`   ✓ Tabelle sichtbar: ${tableVisible}`);
        
        // Count rows in inventory table
        const rows = await page.locator('#inventoryTable tbody tr').all();
        console.log(`   ✓ Anzahl Zeilen gefunden: ${rows.length}`);
        
        // Check for specific messages
        const loadingVisible = await page.locator('td:has-text("Lade Inventar")').isVisible();
        const noDataVisible = await page.locator('td:has-text("Keine Produkte")').isVisible();
        
        console.log(`   ✓ Lade-Nachricht sichtbar: ${loadingVisible}`);
        console.log(`   ✓ Keine-Daten-Nachricht sichtbar: ${noDataVisible}`);
        
        // Get actual content if rows exist
        if (rows.length > 0 && !loadingVisible && !noDataVisible) {
            console.log('\n   📦 Gefundene Lagerartikel:');
            for (let i = 0; i < Math.min(5, rows.length); i++) {
                const cells = await rows[i].locator('td').all();
                if (cells.length >= 3) {
                    const name = await cells[0].textContent();
                    const category = await cells[1].textContent();
                    const stock = await cells[2].textContent();
                    console.log(`      ${i + 1}. ${name} | ${category} | ${stock}`);
                }
            }
            if (rows.length > 5) {
                console.log(`      ... und ${rows.length - 5} weitere Artikel`);
            }
        }
        
        // Check console for errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        // Final verdict
        console.log('\n' + '='.repeat(60));
        if (rows.length > 0 && !loadingVisible && !noDataVisible) {
            console.log('✅ ERFOLG: Lagerverwaltung zeigt ' + rows.length + ' Artikel an!');
        } else {
            console.log('❌ FEHLER: Keine Lagerdaten werden angezeigt!');
            if (loadingVisible) console.log('   - Lade-Nachricht ist sichtbar');
            if (noDataVisible) console.log('   - "Keine Produkte" Nachricht ist sichtbar');
            if (rows.length === 0) console.log('   - Tabelle hat keine Zeilen');
        }
        
        if (consoleErrors.length > 0) {
            console.log('\n⚠️  Browser Console Errors:');
            consoleErrors.forEach(err => console.log('   - ' + err));
        }
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('\n❌ Test-Fehler:', error.message);
        if (browser && browser.isConnected()) {
            const page = await browser.newPage();
            await page.screenshot({ path: 'test-error.png' });
            console.log('📸 Error Screenshot: test-error.png');
        }
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();