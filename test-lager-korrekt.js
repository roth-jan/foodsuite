const { chromium } = require('@playwright/test');

async function testLagerKorrekt() {
    console.log('🎯 KORREKTER Test der Lagerverwaltung\n');
    console.log('Ich suche jetzt nach "Warenwirtschaft" statt "Mehr"!\n');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 1000
    });
    
    const page = await browser.newPage();
    
    try {
        // 1. Navigate to FoodSuite
        console.log('1️⃣ Öffne FoodSuite...');
        await page.goto('http://localhost:3003');
        await page.waitForTimeout(2000);
        
        // 2. Login if needed
        console.log('2️⃣ Prüfe Login-Status...');
        const loginVisible = await page.locator('#loginForm').isVisible().catch(() => false);
        
        if (loginVisible) {
            console.log('   🔐 Führe Login durch...');
            await page.fill('#username', 'admin');
            await page.fill('#password', 'Demo123!');
            await page.click('button[type="submit"]:has-text("Anmelden")');
            await page.waitForTimeout(3000);
        } else {
            console.log('   ✅ Bereits eingeloggt');
        }
        
        await page.screenshot({ path: 'korrekt-01-nach-login.png' });
        
        // 3. Navigate using CORRECT dropdown
        console.log('\n3️⃣ Navigiere über "Warenwirtschaft" Dropdown...');
        
        // Click on Warenwirtschaft dropdown
        const warenwirtschaftDropdown = page.locator('a.dropdown-toggle:has-text("Warenwirtschaft")');
        const dropdownExists = await warenwirtschaftDropdown.count() > 0;
        
        if (dropdownExists) {
            console.log('   ✅ "Warenwirtschaft" Dropdown gefunden!');
            await warenwirtschaftDropdown.click();
            await page.waitForTimeout(1000);
            
            await page.screenshot({ path: 'korrekt-02-dropdown-offen.png' });
            
            // Click on Lagerbestand
            const lagerbestandLink = page.locator('a.dropdown-item:has-text("Lagerbestand")');
            if (await lagerbestandLink.count() > 0) {
                console.log('   ✅ "Lagerbestand" Link gefunden, klicke darauf...');
                await lagerbestandLink.click();
                await page.waitForTimeout(3000);
            }
        } else {
            console.log('   ❌ "Warenwirtschaft" Dropdown nicht gefunden');
            // List all dropdowns found
            const allDropdowns = await page.locator('a.dropdown-toggle').allTextContents();
            console.log('   Gefundene Dropdowns:', allDropdowns);
        }
        
        // 4. Check if we're on inventory page
        console.log('\n4️⃣ Prüfe ob Lagerverwaltung geladen ist...');
        
        const hasInventoryTitle = await page.locator('h1:has-text("Lagerverwaltung")').count() > 0;
        const hasInventoryTable = await page.locator('#inventoryTableBody').count() > 0;
        
        console.log(`   Lagerverwaltung Titel: ${hasInventoryTitle ? '✅' : '❌'}`);
        console.log(`   Inventory Tabelle: ${hasInventoryTable ? '✅' : '❌'}`);
        
        await page.screenshot({ path: 'korrekt-03-lagerverwaltung.png' });
        
        // 5. Check main inventory table
        console.log('\n5️⃣ Prüfe Haupttabelle (Lagerbestand)...');
        
        if (hasInventoryTable) {
            const inventoryRows = await page.locator('#inventoryTableBody tr').count();
            console.log(`   📦 Zeilen in Haupttabelle: ${inventoryRows}`);
            
            if (inventoryRows > 0) {
                // Get first 3 products
                for (let i = 0; i < Math.min(3, inventoryRows); i++) {
                    const productName = await page.locator(`#inventoryTableBody tr:nth-child(${i+1}) td:first-child`).textContent();
                    const stock = await page.locator(`#inventoryTableBody tr:nth-child(${i+1}) td:nth-child(4)`).textContent();
                    console.log(`      ${i+1}. ${productName.trim()} - ${stock.trim()}`);
                }
            }
        }
        
        // 6. Test the three sub-tabs
        console.log('\n6️⃣ Teste die 3 Unter-Tabs...\n');
        
        // Find all inventory tabs
        const inventoryTabs = await page.locator('#inventoryTabs button[data-bs-toggle="tab"]').all();
        console.log(`   Gefundene Tabs: ${inventoryTabs.length}`);
        
        // Tab 1: Stock (should be active)
        const stockTab = page.locator('button[data-bs-target="#stock"]');
        if (await stockTab.count() > 0) {
            console.log('   📦 TAB 1: Lagerbestand');
            const isActive = await stockTab.evaluate(el => el.classList.contains('active'));
            console.log(`      Status: ${isActive ? 'AKTIV ✅' : 'Nicht aktiv'}`);
        }
        
        // Tab 2: Goods Receipts
        const goodsReceiptsTab = page.locator('button[data-bs-target="#goods-receipts"]');
        if (await goodsReceiptsTab.count() > 0) {
            console.log('\n   🚚 TAB 2: Wareneingang');
            console.log('      Klicke auf Tab...');
            await goodsReceiptsTab.click();
            await page.waitForTimeout(3000);
            
            const goodsReceiptsRows = await page.locator('#goodsReceiptsTableBody tr').count();
            console.log(`      Zeilen in Tabelle: ${goodsReceiptsRows}`);
            
            const content = await page.locator('#goodsReceiptsTableBody').textContent();
            if (goodsReceiptsRows > 1 || (goodsReceiptsRows === 1 && !content.includes('Keine'))) {
                console.log('      ✅ DATEN VORHANDEN!');
                // Show first entry
                const firstRow = await page.locator('#goodsReceiptsTableBody tr:first-child').textContent();
                console.log(`      Erste Zeile: ${firstRow.substring(0, 100)}...`);
            } else {
                console.log('      ❌ Keine Daten gefunden');
            }
            
            await page.screenshot({ path: 'korrekt-04-wareneingang.png' });
        }
        
        // Tab 3: Pending Deliveries
        const pendingDeliveriesTab = page.locator('button[data-bs-target="#pending-deliveries"]');
        if (await pendingDeliveriesTab.count() > 0) {
            console.log('\n   🕐 TAB 3: Erwartete Lieferungen');
            console.log('      Klicke auf Tab...');
            await pendingDeliveriesTab.click();
            await page.waitForTimeout(3000);
            
            const deliveriesRows = await page.locator('#pendingDeliveriesTableBody tr').count();
            console.log(`      Zeilen in Tabelle: ${deliveriesRows}`);
            
            const content = await page.locator('#pendingDeliveriesTableBody').textContent();
            if (deliveriesRows > 1 || (deliveriesRows === 1 && !content.includes('Keine'))) {
                console.log('      ✅ DATEN VORHANDEN!');
                // Show first entry
                const firstRow = await page.locator('#pendingDeliveriesTableBody tr:first-child').textContent();
                console.log(`      Erste Zeile: ${firstRow.substring(0, 100)}...`);
            } else {
                console.log('      ❌ Keine Daten gefunden');
            }
            
            await page.screenshot({ path: 'korrekt-05-lieferungen.png' });
        }
        
        // 7. Final summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 ZUSAMMENFASSUNG:');
        console.log('='.repeat(60));
        
        // Check what worked
        const summary = {
            navigation: hasInventoryTitle,
            mainTable: await page.locator('#inventoryTableBody tr').count() > 0,
            tab2HasData: await page.locator('#goodsReceiptsTableBody tr').count() > 1,
            tab3HasData: await page.locator('#pendingDeliveriesTableBody tr').count() > 1
        };
        
        console.log(`\n✅ Navigation zur Lagerverwaltung: ${summary.navigation ? 'ERFOLGREICH' : 'FEHLGESCHLAGEN'}`);
        console.log(`✅ Haupttabelle hat Daten: ${summary.mainTable ? 'JA' : 'NEIN'}`);
        console.log(`✅ Tab 2 (Wareneingang) hat Daten: ${summary.tab2HasData ? 'JA' : 'NEIN'}`);
        console.log(`✅ Tab 3 (Lieferungen) hat Daten: ${summary.tab3HasData ? 'JA' : 'NEIN'}`);
        
        if (summary.tab2HasData && summary.tab3HasData) {
            console.log('\n🎉 ERFOLG! Alle Tabs laden automatisch ihre Daten!');
        } else {
            console.log('\n⚠️ PROBLEM: Nicht alle Tabs haben Daten geladen.');
        }
        
    } catch (error) {
        console.error('\n❌ FEHLER:', error.message);
        await page.screenshot({ path: 'korrekt-fehler.png' });
    } finally {
        console.log('\n🔄 Test beendet. Browser schließt in 10 Sekunden...');
        await page.waitForTimeout(10000);
        await browser.close();
    }
}

testLagerKorrekt();