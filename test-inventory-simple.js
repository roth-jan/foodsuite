const { chromium } = require('playwright');

(async () => {
    console.log('🔍 Starte einfachen Inventory-Test mit Playwright...\n');
    
    try {
        // Try to use existing browser installation
        const browser = await chromium.launch({ 
            headless: false,
            channel: 'chrome', // Use system Chrome if available
            args: ['--no-sandbox', '--disable-dev-shm-usage']
        });
        
        const page = await browser.newPage();
        
        console.log('1. Öffne FoodSuite...');
        await page.goto('http://localhost:3003');
        
        console.log('2. Login...');
        await page.fill('input[type="text"]', 'admin');
        await page.fill('input[type="password"]', 'Demo123!');
        await page.click('button:has-text("Anmelden")');
        await page.waitForTimeout(2000);
        
        console.log('3. Öffne Lagerverwaltung...');
        await page.click('a:has-text("Mehr")');
        await page.waitForTimeout(500);
        await page.click('a[data-tab="inventory"]');
        await page.waitForTimeout(3000);
        
        console.log('4. Zähle Inventory-Einträge...');
        const rows = await page.locator('#inventoryTable tbody tr').count();
        
        console.log('\n' + '='.repeat(50));
        console.log(`ERGEBNIS: ${rows} Zeilen in der Inventory-Tabelle`);
        
        if (rows > 0) {
            const firstRow = await page.locator('#inventoryTable tbody tr').first().textContent();
            console.log(`Erste Zeile: ${firstRow.substring(0, 100)}...`);
            console.log('\n✅ ERFOLG: Inventory zeigt Daten an!');
        } else {
            console.log('\n❌ FEHLER: Keine Daten in der Inventory-Tabelle!');
        }
        console.log('='.repeat(50));
        
        console.log('\nBrowser bleibt 10 Sekunden offen...');
        await page.waitForTimeout(10000);
        
        await browser.close();
        
    } catch (error) {
        console.error('Fehler:', error.message);
        
        // Try alternative approach
        console.log('\nVersuche Alternative: Überprüfe HTML-Datei direkt...');
        const fs = require('fs');
        const content = fs.readFileSync('foodsuite-complete-app.html', 'utf8');
        const hasCorrectCode = content.includes("await api.get('/inventory?limit=100')");
        console.log(`HTML hat korrekten Code: ${hasCorrectCode ? '✅ JA' : '❌ NEIN'}`);
    }
})();