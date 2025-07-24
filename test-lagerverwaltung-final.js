const { chromium } = require('@playwright/test');

async function testLagerverwaltungComplete() {
    console.log('🚀 Kompletter Test der Lagerverwaltung\n');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 500
    });
    
    const page = await browser.newPage();
    
    try {
        // 1. Navigate and login
        console.log('1️⃣ Navigiere zu FoodSuite...');
        await page.goto('http://localhost:3003');
        await page.waitForTimeout(2000);
        
        console.log('2️⃣ Anmeldung als admin...');
        await page.fill('#username', 'admin');
        await page.fill('#password', 'Demo123!');
        await page.click('button[type="submit"]:has-text("Anmelden")');
        await page.waitForTimeout(3000);
        
        // 2. Navigate to Lagerbestand
        console.log('\n3️⃣ Navigiere zu Lagerbestand...');
        
        // Click dropdown "Mehr"
        await page.click('a.dropdown-toggle:has-text("Mehr")');
        await page.waitForTimeout(500);
        
        // Click Lagerbestand
        await page.click('a.dropdown-item:has-text("Lagerbestand")');
        await page.waitForTimeout(3000);
        
        // 3. Check if we're on the inventory page
        console.log('\n4️⃣ Überprüfe Lagerverwaltung Seite...');
        const inventoryTitle = await page.locator('h1:has-text("Lagerverwaltung")').isVisible();
        console.log(`   ✅ Lagerverwaltung Titel sichtbar: ${inventoryTitle}`);
        
        // 4. Check all three tabs
        console.log('\n5️⃣ Überprüfe alle 3 Tabs:');
        
        // Tab 1: Lagerbestand (already active)
        console.log('\n   📦 Tab 1: Lagerbestand');
        const stockTable = await page.locator('#inventoryTableBody');
        await page.waitForTimeout(1000);
        const stockRows = await stockTable.locator('tr').count();
        console.log(`      Zeilen im Lagerbestand: ${stockRows}`);
        
        // Tab 2: Wareneingang
        console.log('\n   🚚 Tab 2: Wareneingang');
        await page.click('button[data-bs-target="#goods-receipts"]');
        await page.waitForTimeout(2000);
        const goodsReceiptsTable = await page.locator('#goodsReceiptsTableBody');
        const goodsReceiptsRows = await goodsReceiptsTable.locator('tr').count();
        console.log(`      Zeilen im Wareneingang: ${goodsReceiptsRows}`);
        
        // Tab 3: Erwartete Lieferungen
        console.log('\n   🕐 Tab 3: Erwartete Lieferungen');
        await page.click('button[data-bs-target="#pending-deliveries"]');
        await page.waitForTimeout(2000);
        const pendingDeliveriesTable = await page.locator('#pendingDeliveriesTableBody');
        const pendingDeliveriesRows = await pendingDeliveriesTable.locator('tr').count();
        console.log(`      Zeilen in Erwartete Lieferungen: ${pendingDeliveriesRows}`);
        
        // 5. Go back to first tab and check content
        console.log('\n6️⃣ Zurück zum ersten Tab und prüfe Inhalte...');
        await page.click('button[data-bs-target="#stock"]');
        await page.waitForTimeout(1000);
        
        // Get first 3 products
        const products = await page.locator('#inventoryTableBody tr').all();
        if (products.length > 0) {
            console.log('\n   Erste 3 Produkte:');
            for (let i = 0; i < Math.min(3, products.length); i++) {
                const name = await products[i].locator('td:first-child').textContent();
                const stock = await products[i].locator('td:nth-child(4)').textContent();
                console.log(`   ${i+1}. ${name.trim()} - Bestand: ${stock.trim()}`);
            }
        }
        
        // 6. Final screenshot
        await page.screenshot({ 
            path: 'lagerverwaltung-komplett.png',
            fullPage: true 
        });
        console.log('\n📸 Screenshot gespeichert als lagerverwaltung-komplett.png');
        
        console.log('\n✅ Test erfolgreich abgeschlossen!');
        
    } catch (error) {
        console.error('\n❌ Fehler:', error.message);
        await page.screenshot({ path: 'fehler-lagerverwaltung.png' });
    } finally {
        console.log('\n🔄 Browser schließt in 5 Sekunden...');
        await page.waitForTimeout(5000);
        await browser.close();
    }
}

testLagerverwaltungComplete();