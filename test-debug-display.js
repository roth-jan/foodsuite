const { chromium } = require('@playwright/test');

async function debugDisplayProblem() {
    console.log('🔍 DEBUG: Warum sieht der User nichts?\n');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 500,
        devtools: true // Öffne Developer Tools
    });
    
    const page = await browser.newPage();
    
    // Aktiviere Console Logs
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('❌ BROWSER ERROR:', msg.text());
        }
    });
    
    try {
        console.log('1️⃣ Öffne FoodSuite...');
        await page.goto('http://localhost:3003');
        await page.waitForTimeout(2000);
        
        // Direkt zur Lagerverwaltung
        console.log('2️⃣ Navigiere zur Lagerverwaltung...');
        await page.click('a.dropdown-toggle:has-text("Warenwirtschaft")');
        await page.waitForTimeout(500);
        await page.click('a.dropdown-item:has-text("Lagerbestand")');
        await page.waitForTimeout(3000);
        
        console.log('\n' + '='.repeat(60));
        console.log('🔬 DETAILLIERTE ANALYSE:');
        console.log('='.repeat(60) + '\n');
        
        // 1. Prüfe ob die Tabelle existiert
        const tableExists = await page.locator('#inventoryTableBody').count() > 0;
        console.log(`1. Tabelle existiert: ${tableExists ? '✅' : '❌'}`);
        
        // 2. Prüfe Sichtbarkeit
        if (tableExists) {
            const isVisible = await page.locator('#inventoryTableBody').isVisible();
            console.log(`2. Tabelle sichtbar: ${isVisible ? '✅' : '❌'}`);
            
            // 3. Prüfe CSS Display
            const display = await page.locator('#inventoryTableBody').evaluate(el => {
                const computed = window.getComputedStyle(el);
                return {
                    display: computed.display,
                    visibility: computed.visibility,
                    opacity: computed.opacity,
                    height: computed.height,
                    overflow: computed.overflow
                };
            });
            console.log('3. CSS Eigenschaften:', display);
            
            // 4. Prüfe Inhalt
            const innerHTML = await page.locator('#inventoryTableBody').innerHTML();
            console.log(`4. innerHTML Länge: ${innerHTML.length} Zeichen`);
            console.log(`   Erste 200 Zeichen: ${innerHTML.substring(0, 200)}...`);
            
            // 5. Zähle TR Elemente
            const trCount = await page.locator('#inventoryTableBody tr').count();
            console.log(`5. Anzahl <tr> Elemente: ${trCount}`);
            
            // 6. Prüfe ob Daten da sind aber versteckt
            const hiddenRows = await page.locator('#inventoryTableBody tr[style*="display: none"]').count();
            console.log(`6. Versteckte Zeilen: ${hiddenRows}`);
            
            // 7. Prüfe Parent-Container
            const container = await page.locator('#stock').evaluate(el => {
                const computed = window.getComputedStyle(el);
                return {
                    display: computed.display,
                    visibility: computed.visibility,
                    classList: Array.from(el.classList)
                };
            });
            console.log('7. Parent Container (#stock):', container);
        }
        
        // 8. Führe loadInventory manuell aus
        console.log('\n8. Führe loadInventory() manuell aus...');
        await page.evaluate(() => {
            if (typeof loadInventory === 'function') {
                console.log('Rufe loadInventory() auf...');
                loadInventory();
            } else {
                console.log('loadInventory Funktion nicht gefunden!');
            }
        });
        
        await page.waitForTimeout(3000);
        
        // 9. Prüfe erneut nach manuellem Laden
        const trCountAfter = await page.locator('#inventoryTableBody tr').count();
        console.log(`9. Zeilen nach manuellem loadInventory(): ${trCountAfter}`);
        
        if (trCountAfter > 0) {
            const firstRowText = await page.locator('#inventoryTableBody tr:first-child').textContent();
            console.log(`   Erste Zeile: ${firstRowText.substring(0, 100)}...`);
        }
        
        // 10. Prüfe API Response
        console.log('\n10. Teste API direkt...');
        const apiResponse = await page.evaluate(async () => {
            try {
                const response = await fetch('/api/inventory', {
                    headers: {
                        'x-tenant-id': 'demo',
                        'Authorization': localStorage.getItem('authToken') ? `Bearer ${localStorage.getItem('authToken')}` : ''
                    }
                });
                const data = await response.json();
                return {
                    status: response.status,
                    itemCount: data.items ? data.items.length : 0,
                    firstItem: data.items && data.items[0] ? data.items[0].name : 'Keine Items'
                };
            } catch (error) {
                return { error: error.message };
            }
        });
        console.log('    API Response:', apiResponse);
        
        // Screenshots mit Annotations
        await page.screenshot({ path: 'debug-01-initial.png', fullPage: true });
        
        // Highlight die Tabelle
        await page.evaluate(() => {
            const table = document.querySelector('#inventoryTableBody');
            if (table) {
                table.style.border = '3px solid red';
                table.style.backgroundColor = 'rgba(255,0,0,0.1)';
            }
        });
        
        await page.screenshot({ path: 'debug-02-highlighted.png', fullPage: true });
        
        // Zusammenfassung
        console.log('\n' + '='.repeat(60));
        console.log('🎯 DIAGNOSE:');
        console.log('='.repeat(60));
        
        if (trCountAfter > 0 && trCount === 0) {
            console.log('\n❗ PROBLEM GEFUNDEN: loadInventory() wird beim Tab-Wechsel nicht aufgerufen!');
            console.log('   Die Funktion existiert, aber wird nicht automatisch ausgeführt.');
        } else if (trCount === 0 && trCountAfter === 0) {
            console.log('\n❗ PROBLEM: Keine Daten werden geladen, auch nicht manuell.');
        } else if (hiddenRows > 0) {
            console.log('\n❗ PROBLEM: Zeilen sind da, aber mit CSS versteckt!');
        }
        
    } catch (error) {
        console.error('\n❌ FEHLER:', error.message);
        await page.screenshot({ path: 'debug-error.png' });
    } finally {
        console.log('\n⏸️ Browser bleibt 30 Sekunden offen für manuelle Inspektion...');
        await page.waitForTimeout(30000);
        await browser.close();
    }
}

debugDisplayProblem();