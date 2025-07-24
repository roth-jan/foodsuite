const { chromium } = require('@playwright/test');

async function testLagerDatenDetail() {
    console.log('🔍 DETAILLIERTER Test der Lagerdaten\n');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 1500
    });
    
    const page = await browser.newPage();
    
    try {
        // Navigate and login
        console.log('1️⃣ Navigation zu FoodSuite...');
        await page.goto('http://localhost:3003');
        await page.waitForTimeout(2000);
        
        // Navigate to inventory
        console.log('2️⃣ Navigiere zu Lagerverwaltung...');
        await page.click('a.dropdown-toggle:has-text("Warenwirtschaft")');
        await page.waitForTimeout(1000);
        await page.click('a.dropdown-item:has-text("Lagerbestand")');
        await page.waitForTimeout(4000); // Extra Zeit zum Laden
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 DATEN IN DEN TABELLEN:');
        console.log('='.repeat(60) + '\n');
        
        // TAB 1: Lagerbestand
        console.log('📦 TAB 1: LAGERBESTAND (Haupttabelle)\n');
        
        const inventoryRows = await page.locator('#inventoryTableBody tr').all();
        console.log(`Anzahl Zeilen: ${inventoryRows.length}\n`);
        
        if (inventoryRows.length > 0) {
            // Zeige die ersten 5 Produkte
            console.log('Erste 5 Produkte im Lager:');
            console.log('-'.repeat(80));
            
            for (let i = 0; i < Math.min(5, inventoryRows.length); i++) {
                const cells = await inventoryRows[i].locator('td').all();
                if (cells.length >= 5) {
                    const name = await cells[0].textContent();
                    const category = await cells[1].textContent();
                    const unit = await cells[2].textContent();
                    const stock = await cells[3].textContent();
                    const status = await cells[4].textContent();
                    
                    console.log(`${i+1}. Produkt: ${name.trim()}`);
                    console.log(`   Kategorie: ${category.trim()}`);
                    console.log(`   Einheit: ${unit.trim()}`);
                    console.log(`   Bestand: ${stock.trim()}`);
                    console.log(`   Status: ${status.trim()}`);
                    console.log('-'.repeat(80));
                }
            }
        } else {
            console.log('❌ KEINE DATEN in der Haupttabelle!');
        }
        
        // Screenshot von Tab 1
        await page.screenshot({ path: 'detail-01-lagerbestand.png', fullPage: true });
        
        // TAB 2: Wareneingang
        console.log('\n\n🚚 TAB 2: WARENEINGANG\n');
        
        await page.click('button[data-bs-target="#goods-receipts"]');
        await page.waitForTimeout(3000);
        
        const goodsReceiptsContent = await page.locator('#goodsReceiptsTableBody').textContent();
        const goodsReceiptsRows = await page.locator('#goodsReceiptsTableBody tr').all();
        
        console.log(`Anzahl Zeilen: ${goodsReceiptsRows.length}\n`);
        
        if (goodsReceiptsRows.length > 0 && !goodsReceiptsContent.includes('Keine')) {
            console.log('Erste 5 Einträge:');
            console.log('-'.repeat(80));
            
            for (let i = 0; i < Math.min(5, goodsReceiptsRows.length); i++) {
                const cells = await goodsReceiptsRows[i].locator('td').all();
                if (cells.length >= 3) {
                    const product = await cells[0].textContent();
                    const details = await cells[1].textContent();
                    const supplier = await cells[2].textContent();
                    
                    console.log(`${i+1}. ${product.trim()}`);
                    console.log(`   Details: ${details.trim().substring(0, 50)}...`);
                    console.log(`   Lieferant: ${supplier.trim()}`);
                    console.log('-'.repeat(80));
                }
            }
        } else {
            console.log('❌ KEINE DATEN im Wareneingang!');
            console.log(`Tabelleninhalt: "${goodsReceiptsContent.trim()}"`);
        }
        
        // Screenshot von Tab 2
        await page.screenshot({ path: 'detail-02-wareneingang.png', fullPage: true });
        
        // TAB 3: Erwartete Lieferungen
        console.log('\n\n🕐 TAB 3: ERWARTETE LIEFERUNGEN\n');
        
        await page.click('button[data-bs-target="#pending-deliveries"]');
        await page.waitForTimeout(3000);
        
        const deliveriesContent = await page.locator('#pendingDeliveriesTableBody').textContent();
        const deliveriesRows = await page.locator('#pendingDeliveriesTableBody tr').all();
        
        console.log(`Anzahl Zeilen: ${deliveriesRows.length}\n`);
        
        if (deliveriesRows.length > 0 && !deliveriesContent.includes('Keine')) {
            console.log('Erste 5 Lieferungen:');
            console.log('-'.repeat(80));
            
            for (let i = 0; i < Math.min(5, deliveriesRows.length); i++) {
                const cells = await deliveriesRows[i].locator('td').all();
                if (cells.length >= 3) {
                    const orderInfo = await cells[0].textContent();
                    const supplier = await cells[1].textContent();
                    const date = await cells[2].textContent();
                    
                    console.log(`${i+1}. Bestellung: ${orderInfo.trim().substring(0, 50)}...`);
                    console.log(`   Lieferant: ${supplier.trim()}`);
                    console.log(`   Datum: ${date.trim()}`);
                    console.log('-'.repeat(80));
                }
            }
        } else {
            console.log('❌ KEINE DATEN bei erwarteten Lieferungen!');
            console.log(`Tabelleninhalt: "${deliveriesContent.trim()}"`);
        }
        
        // Screenshot von Tab 3
        await page.screenshot({ path: 'detail-03-lieferungen.png', fullPage: true });
        
        // Zusammenfassung
        console.log('\n\n' + '='.repeat(60));
        console.log('📊 ZUSAMMENFASSUNG DER DATEN:');
        console.log('='.repeat(60));
        
        const summary = {
            tab1: inventoryRows.length,
            tab2: goodsReceiptsRows.length,
            tab3: deliveriesRows.length,
            tab2HasRealData: goodsReceiptsRows.length > 0 && !goodsReceiptsContent.includes('Keine'),
            tab3HasRealData: deliveriesRows.length > 0 && !deliveriesContent.includes('Keine')
        };
        
        console.log(`\n📦 Lagerbestand: ${summary.tab1} Produkte`);
        console.log(`🚚 Wareneingang: ${summary.tab2} Einträge (${summary.tab2HasRealData ? 'mit echten Daten' : 'LEER'})`);
        console.log(`🕐 Erwartete Lieferungen: ${summary.tab3} Einträge (${summary.tab3HasRealData ? 'mit echten Daten' : 'LEER'})`);
        
        // Prüfe ob die Seite wirklich Daten zeigt
        const visibleProductName = await page.locator('td:has-text("Äpfel")').count();
        const visibleKartoffeln = await page.locator('td:has-text("Kartoffeln")').count();
        
        console.log(`\n🔍 Sichtbarkeitstest:`);
        console.log(`   "Äpfel" sichtbar: ${visibleProductName > 0 ? 'JA' : 'NEIN'}`);
        console.log(`   "Kartoffeln" sichtbar: ${visibleKartoffeln > 0 ? 'JA' : 'NEIN'}`);
        
    } catch (error) {
        console.error('\n❌ FEHLER:', error.message);
        await page.screenshot({ path: 'detail-fehler.png' });
    } finally {
        console.log('\n🔄 Browser schließt in 15 Sekunden...');
        await page.waitForTimeout(15000);
        await browser.close();
    }
}

testLagerDatenDetail();