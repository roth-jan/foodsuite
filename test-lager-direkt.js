const { chromium } = require('@playwright/test');

async function testLagerDirekt() {
    console.log('🚀 Direkter Test der Lagerverwaltung\n');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 800
    });
    
    const page = await browser.newPage();
    
    try {
        // Direkt zur Datei navigieren
        console.log('1️⃣ Öffne FoodSuite direkt...');
        await page.goto('file:///C:/Users/JanHendrikRoth/Desktop/Claude%20Ergebnisse/Claude%20Ergebnisse/Foodsuite/foodsuite-complete-app.html');
        await page.waitForTimeout(3000);
        
        // Prüfe ob wir schon eingeloggt sind
        console.log('\n2️⃣ Prüfe Login-Status...');
        
        // Suche nach Dashboard oder Login-Form
        const dashboardExists = await page.locator('.dashboard-container').count() > 0;
        const loginFormExists = await page.locator('#loginForm').isVisible().catch(() => false);
        
        console.log(`   Dashboard sichtbar: ${dashboardExists}`);
        console.log(`   Login-Form sichtbar: ${loginFormExists}`);
        
        if (loginFormExists) {
            console.log('\n   🔐 Führe Login durch...');
            await page.fill('#username', 'admin');
            await page.fill('#password', 'Demo123!');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(3000);
        } else if (!dashboardExists) {
            console.log('   ⚠️ Weder Dashboard noch Login gefunden');
        }
        
        // Screenshot nach Login/Start
        await page.screenshot({ path: 'lager-01-start.png', fullPage: true });
        
        // 3. Navigation zur Lagerverwaltung
        console.log('\n3️⃣ Navigiere zur Lagerverwaltung...');
        
        // Option 1: Über Dropdown
        const mehrDropdown = await page.locator('a:has-text("Mehr")').first();
        if (await mehrDropdown.count() > 0) {
            console.log('   Klicke auf "Mehr" Dropdown...');
            await mehrDropdown.click();
            await page.waitForTimeout(1000);
            
            const lagerLink = await page.locator('a:has-text("Lagerbestand")').first();
            if (await lagerLink.count() > 0) {
                console.log('   Klicke auf "Lagerbestand"...');
                await lagerLink.click();
                await page.waitForTimeout(3000);
            }
        }
        
        // Option 2: Direkte Navigation
        if (await page.locator('h1:has-text("Lagerverwaltung")').count() === 0) {
            console.log('   Versuche direkte Navigation...');
            await page.evaluate(() => {
                if (typeof showTab === 'function') {
                    showTab('inventory');
                }
            });
            await page.waitForTimeout(3000);
        }
        
        // 4. Prüfe Lagerverwaltung
        console.log('\n4️⃣ Prüfe Lagerverwaltung Inhalte...');
        
        const hasLagerverwaltung = await page.locator('h1:has-text("Lagerverwaltung")').count() > 0;
        console.log(`   ✅ Lagerverwaltung Titel: ${hasLagerverwaltung}`);
        
        await page.screenshot({ path: 'lager-02-lagerverwaltung.png', fullPage: true });
        
        // 5. Teste alle Tabs
        console.log('\n5️⃣ Teste alle Tabs...\n');
        
        // Tab 1: Lagerbestand
        console.log('   📦 TAB 1: LAGERBESTAND');
        const tab1 = await page.locator('button[data-bs-target="#stock"]').first();
        if (await tab1.count() > 0) {
            const isActive = await tab1.evaluate(el => el.classList.contains('active'));
            console.log(`      Status: ${isActive ? 'AKTIV' : 'Nicht aktiv'}`);
            
            const table1 = await page.locator('#inventoryTableBody tr').count();
            console.log(`      Zeilen in Tabelle: ${table1}`);
            
            if (table1 > 0) {
                const firstProduct = await page.locator('#inventoryTableBody tr:first-child td:first-child').textContent();
                console.log(`      Erstes Produkt: ${firstProduct.trim()}`);
            }
        }
        
        await page.waitForTimeout(2000);
        
        // Tab 2: Wareneingang
        console.log('\n   🚚 TAB 2: WARENEINGANG');
        const tab2 = await page.locator('button[data-bs-target="#goods-receipts"]').first();
        if (await tab2.count() > 0) {
            console.log('      Klicke auf Tab...');
            await tab2.click();
            await page.waitForTimeout(3000);
            
            const table2 = await page.locator('#goodsReceiptsTableBody tr').count();
            console.log(`      Zeilen in Tabelle: ${table2}`);
            
            const content = await page.locator('#goodsReceiptsTableBody').textContent();
            if (content.includes('Äpfel') || content.includes('Kartoffeln')) {
                console.log('      ✅ DATEN VORHANDEN! Produkte werden angezeigt!');
            } else if (content.includes('Keine')) {
                console.log('      ❌ KEINE DATEN - Tabelle ist leer');
            }
            
            await page.screenshot({ path: 'lager-03-wareneingang.png', fullPage: true });
        }
        
        await page.waitForTimeout(2000);
        
        // Tab 3: Erwartete Lieferungen
        console.log('\n   🕐 TAB 3: ERWARTETE LIEFERUNGEN');
        const tab3 = await page.locator('button[data-bs-target="#pending-deliveries"]').first();
        if (await tab3.count() > 0) {
            console.log('      Klicke auf Tab...');
            await tab3.click();
            await page.waitForTimeout(3000);
            
            const table3 = await page.locator('#pendingDeliveriesTableBody tr').count();
            console.log(`      Zeilen in Tabelle: ${table3}`);
            
            const content = await page.locator('#pendingDeliveriesTableBody').textContent();
            if (content.includes('METRO') || content.includes('Order')) {
                console.log('      ✅ DATEN VORHANDEN! Bestellungen werden angezeigt!');
            } else if (content.includes('Keine')) {
                console.log('      ❌ KEINE DATEN - Tabelle ist leer');
            }
            
            await page.screenshot({ path: 'lager-04-lieferungen.png', fullPage: true });
        }
        
        // 6. Manuelle Funktionsaufrufe
        console.log('\n6️⃣ Teste manuelle Funktionsaufrufe...');
        
        const result = await page.evaluate(() => {
            const results = {
                functionsExist: {
                    loadInventory: typeof loadInventory === 'function',
                    loadGoodsReceipts: typeof loadGoodsReceipts === 'function',
                    loadPendingDeliveries: typeof loadPendingDeliveries === 'function'
                },
                apiExists: typeof api !== 'undefined',
                apiMethods: {}
            };
            
            if (typeof api !== 'undefined') {
                results.apiMethods = {
                    get: typeof api.get === 'function',
                    post: typeof api.post === 'function',
                    put: typeof api.put === 'function',
                    delete: typeof api.delete === 'function'
                };
            }
            
            // Rufe Funktionen auf
            if (results.functionsExist.loadGoodsReceipts) {
                loadGoodsReceipts();
            }
            if (results.functionsExist.loadPendingDeliveries) {
                loadPendingDeliveries();
            }
            
            return results;
        });
        
        console.log('\n   Funktions-Check:');
        console.log(`      loadInventory: ${result.functionsExist.loadInventory ? '✅' : '❌'}`);
        console.log(`      loadGoodsReceipts: ${result.functionsExist.loadGoodsReceipts ? '✅' : '❌'}`);
        console.log(`      loadPendingDeliveries: ${result.functionsExist.loadPendingDeliveries ? '✅' : '❌'}`);
        console.log(`\n   API-Check:`);
        console.log(`      API existiert: ${result.apiExists ? '✅' : '❌'}`);
        console.log(`      api.get: ${result.apiMethods.get ? '✅' : '❌'}`);
        console.log(`      api.post: ${result.apiMethods.post ? '✅' : '❌'}`);
        
        await page.waitForTimeout(3000);
        
        // Finale Screenshots
        await page.screenshot({ path: 'lager-05-final.png', fullPage: true });
        
        console.log('\n✅ TEST ABGESCHLOSSEN!');
        console.log('   Screenshots gespeichert:');
        console.log('   - lager-01-start.png');
        console.log('   - lager-02-lagerverwaltung.png');
        console.log('   - lager-03-wareneingang.png');
        console.log('   - lager-04-lieferungen.png');
        console.log('   - lager-05-final.png');
        
    } catch (error) {
        console.error('\n❌ FEHLER:', error.message);
        await page.screenshot({ path: 'lager-fehler.png', fullPage: true });
    } finally {
        console.log('\n🔄 Browser schließt in 10 Sekunden...');
        await page.waitForTimeout(10000);
        await browser.close();
    }
}

testLagerDirekt();