const { webkit } = require('playwright');

(async () => {
    console.log('🚀 Teste mit Webkit Browser...\n');
    
    let browser;
    try {
        browser = await webkit.launch({ 
            headless: true
        });
        
        const page = await browser.newPage();
        
        console.log('1️⃣ Öffne FoodSuite...');
        await page.goto('http://localhost:3003', { waitUntil: 'networkidle' });
        await page.screenshot({ path: 'webkit-1-login.png' });
        
        console.log('2️⃣ Login...');
        await page.fill('input[type="text"]', 'admin');
        await page.fill('input[type="password"]', 'Demo123!');
        await page.click('button:has-text("Anmelden")');
        await page.waitForTimeout(2000);
        
        console.log('3️⃣ Navigiere zu Lagerverwaltung...');
        await page.click('a.dropdown-toggle:has-text("Mehr")');
        await page.waitForTimeout(500);
        await page.click('a[data-tab="inventory"]');
        await page.waitForTimeout(2000);
        
        await page.screenshot({ path: 'webkit-2-inventory.png', fullPage: true });
        
        console.log('4️⃣ Prüfe Tabelle...');
        const rows = await page.locator('#inventoryTable tbody tr').count();
        console.log(`   Gefundene Zeilen: ${rows}`);
        
        if (rows > 0) {
            const firstRow = await page.locator('#inventoryTable tbody tr').first();
            const text = await firstRow.textContent();
            console.log(`   Erste Zeile: ${text.substring(0, 100)}...`);
        }
        
        console.log('\n✅ Test abgeschlossen!');
        
    } catch (error) {
        console.error('❌ Fehler:', error.message);
    } finally {
        if (browser) await browser.close();
    }
})();