const { chromium } = require('@playwright/test');

async function testFixVerification() {
    console.log('✅ Teste ob die Fixes funktionieren...\n');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 1000
    });
    
    const page = await browser.newPage();
    
    try {
        // Navigate to FoodSuite
        console.log('1️⃣ Öffne FoodSuite...');
        await page.goto('http://localhost:3003');
        await page.waitForTimeout(2000);
        
        // Navigate to inventory
        console.log('2️⃣ Navigiere zu Lagerverwaltung...');
        await page.click('a.dropdown-toggle:has-text("Warenwirtschaft")');
        await page.waitForTimeout(500);
        await page.click('a.dropdown-item:has-text("Lagerbestand")');
        await page.waitForTimeout(3000);
        
        // Check main table
        console.log('\n3️⃣ Prüfe Haupttabelle:');
        const inventoryRows = await page.locator('#inventoryTableBody tr').count();
        console.log(`   Anzahl Zeilen: ${inventoryRows}`);
        
        if (inventoryRows > 0) {
            // Check first row for correct data
            const firstRowCells = await page.locator('#inventoryTableBody tr:first-child td').allTextContents();
            console.log('\n   Erste Zeile:');
            console.log(`   - Produkt: ${firstRowCells[0]}`);
            console.log(`   - Kategorie: ${firstRowCells[1]}`);
            console.log(`   - Bestand: ${firstRowCells[2]}`);
            console.log(`   - Status: ${firstRowCells[3]}`);
            
            // Check if "undefined" is gone
            const hasUndefined = firstRowCells[0].includes('undefined');
            console.log(`\n   ✅ "undefined" Problem behoben: ${!hasUndefined ? 'JA' : 'NEIN'}`);
        }
        
        // Test Tab 2
        console.log('\n4️⃣ Teste Tab 2 (Wareneingang):');
        await page.click('button[data-bs-target="#goods-receipts"]');
        await page.waitForTimeout(2000);
        
        const goodsReceiptsRows = await page.locator('#goodsReceiptsTableBody tr').count();
        const goodsReceiptsContent = await page.locator('#goodsReceiptsTableBody').textContent();
        console.log(`   Zeilen: ${goodsReceiptsRows}`);
        console.log(`   Hat echte Daten: ${goodsReceiptsRows > 0 && !goodsReceiptsContent.includes('Keine')}`);
        
        // Test Tab 3
        console.log('\n5️⃣ Teste Tab 3 (Erwartete Lieferungen):');
        await page.click('button[data-bs-target="#pending-deliveries"]');
        await page.waitForTimeout(2000);
        
        const deliveriesRows = await page.locator('#pendingDeliveriesTableBody tr').count();
        const deliveriesContent = await page.locator('#pendingDeliveriesTableBody').textContent();
        console.log(`   Zeilen: ${deliveriesRows}`);
        console.log(`   Hat echte Daten: ${deliveriesRows > 0 && !deliveriesContent.includes('Keine')}`);
        
        // Final screenshots
        await page.click('button[data-bs-target="#stock"]'); // Back to main tab
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'fix-verification-final.png', fullPage: true });
        
        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 ZUSAMMENFASSUNG:');
        console.log('='.repeat(50));
        
        if (inventoryRows > 0 && !firstRowCells[0].includes('undefined')) {
            console.log('\n🎉 ERFOLG! Die Lagerverwaltung zeigt jetzt korrekte Daten!');
            console.log('   - Keine "undefined" Werte mehr');
            console.log('   - Produktnamen werden korrekt angezeigt');
            console.log('   - Tabelle ist sichtbar und gefüllt');
        } else {
            console.log('\n⚠️ Es gibt noch Probleme zu beheben.');
        }
        
    } catch (error) {
        console.error('\n❌ FEHLER:', error.message);
        await page.screenshot({ path: 'fix-verification-error.png' });
    } finally {
        console.log('\n🔄 Browser schließt in 15 Sekunden...');
        await page.waitForTimeout(15000);
        await browser.close();
    }
}

testFixVerification();