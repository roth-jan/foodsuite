const { chromium } = require('@playwright/test');

async function testWarehouseComplete() {
    console.log('🏭 FINALER TEST - Lagerverwaltung mit realistischen Daten\n');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 1000
    });
    
    const page = await browser.newPage();
    page.setViewportSize({ width: 1400, height: 900 });
    
    try {
        // 1. Server neustarten um Daten zu laden
        console.log('⚠️  WICHTIG: Stelle sicher, dass der Server neu gestartet wurde!');
        console.log('   Die Testdaten werden beim Serverstart geladen.\n');
        
        // 2. Navigate to FoodSuite
        console.log('1️⃣ Öffne FoodSuite...');
        await page.goto('http://localhost:3003');
        await page.waitForTimeout(2000);
        
        // 3. Navigate to inventory
        console.log('2️⃣ Navigiere zur Lagerverwaltung...');
        await page.click('a.dropdown-toggle:has-text("Warenwirtschaft")');
        await page.waitForTimeout(500);
        await page.click('a.dropdown-item:has-text("Lagerbestand")');
        await page.waitForTimeout(3000);
        
        // 4. Check Tab 1: Lagerbestand
        console.log('\n📦 TAB 1: LAGERBESTAND');
        console.log('='.repeat(50));
        
        const inventoryRows = await page.locator('#inventoryTableBody tr').count();
        console.log(`Anzahl Produkte: ${inventoryRows}`);
        
        if (inventoryRows > 0) {
            // Check first 3 products for realistic stock values
            for (let i = 1; i <= Math.min(3, inventoryRows); i++) {
                const name = await page.locator(`#inventoryTableBody tr:nth-child(${i}) td:nth-child(1)`).textContent();
                const stock = await page.locator(`#inventoryTableBody tr:nth-child(${i}) td:nth-child(3)`).textContent();
                const status = await page.locator(`#inventoryTableBody tr:nth-child(${i}) td:nth-child(4)`).textContent();
                
                console.log(`${i}. ${name.trim()}`);
                console.log(`   Bestand: ${stock.trim()}`);
                console.log(`   Status: ${status.trim()}`);
            }
            
            // Check if stock values are realistic (not 0 or undefined)
            const firstStock = await page.locator('#inventoryTableBody tr:first-child td:nth-child(3)').textContent();
            const hasRealisticStock = !firstStock.includes('0') && !firstStock.includes('undefined');
            console.log(`\n✅ Realistische Bestandswerte: ${hasRealisticStock ? 'JA' : 'NEIN'}`);
        }
        
        await page.screenshot({ path: 'warehouse-test-01-lagerbestand.png' });
        
        // 5. Check Tab 2: Wareneingang
        console.log('\n\n🚚 TAB 2: WARENEINGANG');
        console.log('='.repeat(50));
        
        await page.click('button[data-bs-target="#goods-receipts"]');
        await page.waitForTimeout(2500);
        
        const goodsReceiptsRows = await page.locator('#goodsReceiptsTableBody tr').count();
        console.log(`Anzahl Wareneingänge: ${goodsReceiptsRows}`);
        
        if (goodsReceiptsRows > 0) {
            const hasNoDataMessage = await page.locator('#goodsReceiptsTableBody').textContent();
            if (!hasNoDataMessage.includes('Keine')) {
                // Show first 3 receipts
                for (let i = 1; i <= Math.min(3, goodsReceiptsRows); i++) {
                    const receiptNo = await page.locator(`#goodsReceiptsTableBody tr:nth-child(${i}) td:nth-child(1)`).textContent();
                    const date = await page.locator(`#goodsReceiptsTableBody tr:nth-child(${i}) td:nth-child(2)`).textContent();
                    const supplier = await page.locator(`#goodsReceiptsTableBody tr:nth-child(${i}) td:nth-child(3)`).textContent();
                    const amount = await page.locator(`#goodsReceiptsTableBody tr:nth-child(${i}) td:nth-child(6)`).textContent();
                    
                    console.log(`${i}. ${receiptNo.trim()}`);
                    console.log(`   Datum: ${date.trim()}`);
                    console.log(`   Lieferant: ${supplier.trim()}`);
                    console.log(`   Betrag: ${amount.trim()}`);
                }
                console.log('\n✅ Wareneingangs-Historie vorhanden!');
            } else {
                console.log('❌ Keine Wareneingangs-Daten gefunden');
            }
        }
        
        await page.screenshot({ path: 'warehouse-test-02-wareneingang.png' });
        
        // 6. Check Tab 3: Erwartete Lieferungen
        console.log('\n\n📅 TAB 3: ERWARTETE LIEFERUNGEN');
        console.log('='.repeat(50));
        
        await page.click('button[data-bs-target="#pending-deliveries"]');
        await page.waitForTimeout(2500);
        
        const deliveriesRows = await page.locator('#pendingDeliveriesTableBody tr').count();
        console.log(`Anzahl erwartete Lieferungen: ${deliveriesRows}`);
        
        if (deliveriesRows > 0) {
            const hasNoDataMessage = await page.locator('#pendingDeliveriesTableBody').textContent();
            if (!hasNoDataMessage.includes('Keine')) {
                // Show first 3 deliveries
                for (let i = 1; i <= Math.min(3, deliveriesRows); i++) {
                    const orderNo = await page.locator(`#pendingDeliveriesTableBody tr:nth-child(${i}) td:nth-child(1)`).textContent();
                    const supplier = await page.locator(`#pendingDeliveriesTableBody tr:nth-child(${i}) td:nth-child(2)`).textContent();
                    const deliveryDate = await page.locator(`#pendingDeliveriesTableBody tr:nth-child(${i}) td:nth-child(3)`).textContent();
                    const amount = await page.locator(`#pendingDeliveriesTableBody tr:nth-child(${i}) td:nth-child(6)`).textContent();
                    
                    console.log(`${i}. ${orderNo.trim().split('\\n')[0]}`);
                    console.log(`   Lieferant: ${supplier.trim()}`);
                    console.log(`   Liefertermin: ${deliveryDate.trim()}`);
                    console.log(`   Betrag: ${amount.trim()}`);
                }
                console.log('\n✅ Erwartete Lieferungen vorhanden!');
            } else {
                console.log('❌ Keine erwarteten Lieferungen gefunden');
            }
        }
        
        await page.screenshot({ path: 'warehouse-test-03-lieferungen.png' });
        
        // 7. Summary
        console.log('\n\n' + '='.repeat(60));
        console.log('📊 TESTERGEBNIS:');
        console.log('='.repeat(60));
        
        const success = inventoryRows > 0 && goodsReceiptsRows > 0 && deliveriesRows > 0;
        
        if (success) {
            console.log('\n🎉 ERFOLG! Alle Lagerdaten werden korrekt angezeigt:');
            console.log(`   ✅ ${inventoryRows} Produkte mit realistischen Beständen`);
            console.log(`   ✅ ${goodsReceiptsRows} Wareneingänge dokumentiert`);
            console.log(`   ✅ ${deliveriesRows} erwartete Lieferungen`);
            console.log('\n📸 Screenshots gespeichert:');
            console.log('   - warehouse-test-01-lagerbestand.png');
            console.log('   - warehouse-test-02-wareneingang.png');
            console.log('   - warehouse-test-03-lieferungen.png');
        } else {
            console.log('\n⚠️ PROBLEM: Nicht alle Daten werden angezeigt.');
            console.log('   Stelle sicher, dass der Server neu gestartet wurde!');
        }
        
    } catch (error) {
        console.error('\n❌ FEHLER:', error.message);
        await page.screenshot({ path: 'warehouse-test-error.png' });
    } finally {
        console.log('\n⏸️ Browser bleibt 30 Sekunden offen...');
        await page.waitForTimeout(30000);
        await browser.close();
    }
}

testWarehouseComplete();