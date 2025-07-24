const { chromium } = require('playwright');

(async () => {
    console.log('🚀 Starte Browser-Test für Lagerverwaltung...\n');
    
    // Launch browser with proper executable path
    const browser = await chromium.launch({ 
        headless: true,
        executablePath: '/home/janendrikoth/.cache/ms-playwright/chromium-1181/chrome-linux/chrome'
    });
    
    const page = await browser.newPage();
    
    try {
        // Navigate to application
        console.log('1️⃣ Navigiere zu FoodSuite...');
        await page.goto('http://localhost:3003');
        await page.waitForLoadState('networkidle');
        
        // Login
        console.log('2️⃣ Melde mich an...');
        const loginVisible = await page.locator('input[type="text"]').isVisible();
        if (loginVisible) {
            await page.fill('input[type="text"]', 'admin');
            await page.fill('input[type="password"]', 'Demo123!');
            await page.click('button:has-text("Anmelden")');
            await page.waitForTimeout(2000);
        }
        
        // Navigate to inventory
        console.log('3️⃣ Navigiere zur Lagerverwaltung...');
        
        // Click on "Mehr" dropdown
        await page.click('a.dropdown-toggle:has-text("Mehr")');
        await page.waitForTimeout(500);
        
        // Click on Lagerverwaltung
        await page.click('a[data-tab="inventory"]');
        await page.waitForTimeout(2000);
        
        // Check if inventory content is loaded
        console.log('4️⃣ Prüfe Lagerbestand-Anzeige...\n');
        
        // Check if inventory table is visible
        const tableVisible = await page.locator('#inventoryTable').isVisible();
        console.log(`   ✓ Tabelle sichtbar: ${tableVisible}`);
        
        // Count rows in inventory table
        const rowCount = await page.locator('#inventoryTable tbody tr').count();
        console.log(`   ✓ Anzahl Artikel im Lager: ${rowCount}`);
        
        // Check if data is actually displayed (not just loading message)
        const loadingMessage = await page.locator('td:has-text("Lade Inventar")').isVisible();
        const noDataMessage = await page.locator('td:has-text("Keine Produkte")').isVisible();
        
        console.log(`   ✓ Lade-Nachricht sichtbar: ${loadingMessage}`);
        console.log(`   ✓ Keine-Daten-Nachricht sichtbar: ${noDataMessage}`);
        
        // Get first few items if available
        if (rowCount > 0 && !loadingMessage && !noDataMessage) {
            console.log('\n   📦 Erste 3 Lagerartikel:');
            for (let i = 0; i < Math.min(3, rowCount); i++) {
                const name = await page.locator(`#inventoryTable tbody tr:nth-child(${i + 1}) td:first-child`).textContent();
                const stock = await page.locator(`#inventoryTable tbody tr:nth-child(${i + 1}) td:nth-child(3)`).textContent();
                console.log(`      ${i + 1}. ${name.trim()} - ${stock.trim()}`);
            }
        }
        
        // Check other tabs
        console.log('\n5️⃣ Prüfe andere Tabs...');
        
        // Check Wareneingang tab
        await page.click('a[href="#goods-receipts"]');
        await page.waitForTimeout(1000);
        const goodsReceiptsVisible = await page.locator('#goodsReceiptsTable').isVisible();
        const goodsReceiptsRows = await page.locator('#goodsReceiptsTable tbody tr').count();
        console.log(`   ✓ Wareneingang Tab - Tabelle sichtbar: ${goodsReceiptsVisible}, Einträge: ${goodsReceiptsRows}`);
        
        // Check Ausstehende Lieferungen tab
        await page.click('a[href="#pending-deliveries"]');
        await page.waitForTimeout(1000);
        const pendingDeliveriesVisible = await page.locator('#pendingDeliveriesTable').isVisible();
        const pendingDeliveriesRows = await page.locator('#pendingDeliveriesTable tbody tr').count();
        console.log(`   ✓ Ausstehende Lieferungen Tab - Tabelle sichtbar: ${pendingDeliveriesVisible}, Einträge: ${pendingDeliveriesRows}`);
        
        // Take screenshot
        await page.screenshot({ path: 'inventory-test-result.png', fullPage: true });
        console.log('\n📸 Screenshot gespeichert als: inventory-test-result.png');
        
        // Final verdict
        console.log('\n' + '='.repeat(50));
        if (rowCount > 0 && !loadingMessage && !noDataMessage) {
            console.log('✅ ERFOLG: Lagerverwaltung zeigt Daten korrekt an!');
            console.log(`✅ ${rowCount} Artikel werden im Lager angezeigt`);
        } else {
            console.log('❌ FEHLER: Keine Lagerdaten werden angezeigt!');
            console.log('   Mögliche Probleme:');
            if (loadingMessage) console.log('   - Daten werden noch geladen');
            if (noDataMessage) console.log('   - Keine Produkte gefunden');
            if (rowCount === 0) console.log('   - Tabelle ist leer');
        }
        console.log('='.repeat(50));
        
    } catch (error) {
        console.error('❌ Fehler beim Test:', error.message);
        await page.screenshot({ path: 'inventory-test-error.png' });
        console.log('Screenshot des Fehlers gespeichert als: inventory-test-error.png');
    } finally {
        await browser.close();
    }
})();