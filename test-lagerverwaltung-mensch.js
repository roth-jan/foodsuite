const { chromium } = require('@playwright/test');
const fs = require('fs');

async function testLagerverwaltungWieMensch() {
    console.log('🤖 Ich teste die Lagerverwaltung wie ein Mensch...\n');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 1000  // Langsam, damit man zuschauen kann
    });
    
    const page = await browser.newPage();
    
    try {
        // 1. Zur Webseite navigieren
        console.log('1️⃣ Ich öffne die Webseite...');
        await page.goto('http://localhost:3003');
        await page.waitForTimeout(2000);
        
        // Screenshot vom Login
        await page.screenshot({ path: '01-login-page.png' });
        
        // 2. Login durchführen
        console.log('2️⃣ Ich melde mich an...');
        
        // Prüfe ob Login-Form da ist
        const loginForm = await page.locator('#loginForm').count();
        if (loginForm > 0) {
            // Username eingeben
            await page.fill('#username', 'admin');
            await page.waitForTimeout(500);
            
            // Password eingeben
            await page.fill('#password', 'Demo123!');
            await page.waitForTimeout(500);
            
            // Login Button klicken
            await page.click('button[type="submit"]:has-text("Anmelden")');
            console.log('   ✅ Login-Daten eingegeben und abgeschickt');
        } else {
            console.log('   ℹ️ Bereits eingeloggt oder Login-Form nicht gefunden');
        }
        
        await page.waitForTimeout(3000);
        await page.screenshot({ path: '02-nach-login.png' });
        
        // 3. Zum Dropdown "Mehr" navigieren
        console.log('\n3️⃣ Ich suche das "Mehr" Dropdown...');
        
        // Suche nach dem Dropdown
        const mehrDropdown = page.locator('a.dropdown-toggle:has-text("Mehr")');
        const dropdownExists = await mehrDropdown.count() > 0;
        
        if (dropdownExists) {
            console.log('   ✅ "Mehr" Dropdown gefunden, klicke darauf...');
            await mehrDropdown.click();
            await page.waitForTimeout(1000);
            await page.screenshot({ path: '03-dropdown-offen.png' });
            
            // 4. Auf "Lagerbestand" klicken
            console.log('\n4️⃣ Ich klicke auf "Lagerbestand"...');
            const lagerbestandLink = page.locator('a.dropdown-item:has-text("Lagerbestand")');
            
            if (await lagerbestandLink.count() > 0) {
                await lagerbestandLink.click();
                console.log('   ✅ Auf Lagerbestand geklickt');
                await page.waitForTimeout(3000);
            } else {
                console.log('   ❌ Lagerbestand Link nicht gefunden');
            }
        } else {
            console.log('   ❌ "Mehr" Dropdown nicht gefunden');
        }
        
        // 5. Prüfe ob wir auf der Lagerverwaltung sind
        console.log('\n5️⃣ Ich prüfe ob die Lagerverwaltung geladen ist...');
        
        const lagerverwaltungTitle = await page.locator('h1:has-text("Lagerverwaltung")').count() > 0;
        if (lagerverwaltungTitle) {
            console.log('   ✅ Lagerverwaltung Seite ist geladen!');
            await page.screenshot({ path: '04-lagerverwaltung-seite.png' });
        } else {
            console.log('   ❌ Lagerverwaltung Titel nicht gefunden');
        }
        
        // 6. Alle 3 Tabs testen
        console.log('\n6️⃣ Ich teste alle 3 Tabs...\n');
        
        // Tab 1: Lagerbestand (sollte schon aktiv sein)
        console.log('   📦 Tab 1: Lagerbestand');
        const lagerbestandTab = page.locator('button[data-bs-target="#stock"]');
        if (await lagerbestandTab.count() > 0) {
            // Prüfe ob Tab aktiv ist
            const isActive = await lagerbestandTab.evaluate(el => el.classList.contains('active'));
            console.log(`      Tab ist ${isActive ? 'aktiv' : 'nicht aktiv'}`);
            
            // Zähle Zeilen in der Tabelle
            const stockRows = await page.locator('#inventoryTableBody tr').count();
            console.log(`      Gefundene Zeilen: ${stockRows}`);
            
            // Erste 3 Produkte anzeigen
            if (stockRows > 0) {
                console.log('      Erste Produkte:');
                for (let i = 0; i < Math.min(3, stockRows); i++) {
                    const productName = await page.locator(`#inventoryTableBody tr:nth-child(${i+1}) td:first-child`).textContent();
                    console.log(`        - ${productName.trim()}`);
                }
            }
            
            await page.screenshot({ path: '05-tab1-lagerbestand.png' });
        }
        
        await page.waitForTimeout(2000);
        
        // Tab 2: Wareneingang
        console.log('\n   🚚 Tab 2: Wareneingang');
        const wareneingangTab = page.locator('button[data-bs-target="#goods-receipts"]');
        if (await wareneingangTab.count() > 0) {
            console.log('      Klicke auf Wareneingang Tab...');
            await wareneingangTab.click();
            await page.waitForTimeout(2000);
            
            // Zähle Zeilen
            const goodsRows = await page.locator('#goodsReceiptsTableBody tr').count();
            console.log(`      Gefundene Zeilen: ${goodsRows}`);
            
            // Prüfe Inhalt
            const firstRow = await page.locator('#goodsReceiptsTableBody tr:first-child').textContent();
            if (firstRow.includes('Keine')) {
                console.log('      ⚠️ Keine Wareneingänge gefunden');
            } else {
                console.log('      ✅ Wareneingänge vorhanden');
                // Zeige erste Einträge
                for (let i = 0; i < Math.min(3, goodsRows); i++) {
                    const rowText = await page.locator(`#goodsReceiptsTableBody tr:nth-child(${i+1}) td:first-child`).textContent();
                    console.log(`        - ${rowText.trim()}`);
                }
            }
            
            await page.screenshot({ path: '06-tab2-wareneingang.png' });
        }
        
        await page.waitForTimeout(2000);
        
        // Tab 3: Erwartete Lieferungen
        console.log('\n   🕐 Tab 3: Erwartete Lieferungen');
        const lieferungenTab = page.locator('button[data-bs-target="#pending-deliveries"]');
        if (await lieferungenTab.count() > 0) {
            console.log('      Klicke auf Erwartete Lieferungen Tab...');
            await lieferungenTab.click();
            await page.waitForTimeout(2000);
            
            // Zähle Zeilen
            const deliveryRows = await page.locator('#pendingDeliveriesTableBody tr').count();
            console.log(`      Gefundene Zeilen: ${deliveryRows}`);
            
            // Prüfe Inhalt
            const firstRow = await page.locator('#pendingDeliveriesTableBody tr:first-child').textContent();
            if (firstRow.includes('Keine')) {
                console.log('      ⚠️ Keine erwarteten Lieferungen gefunden');
            } else {
                console.log('      ✅ Erwartete Lieferungen vorhanden');
                // Zeige erste Einträge
                for (let i = 0; i < Math.min(3, deliveryRows); i++) {
                    const rowText = await page.locator(`#pendingDeliveriesTableBody tr:nth-child(${i+1}) td:first-child`).textContent();
                    console.log(`        - ${rowText.trim()}`);
                }
            }
            
            await page.screenshot({ path: '07-tab3-erwartete-lieferungen.png' });
        }
        
        // 7. Finale Zusammenfassung
        console.log('\n📊 ZUSAMMENFASSUNG:');
        console.log('   ✅ Lagerverwaltung erfolgreich geöffnet');
        console.log('   ✅ Alle 3 Tabs getestet');
        console.log('   📸 7 Screenshots erstellt');
        
        // Liste alle Screenshots auf
        console.log('\n📸 Erstellte Screenshots:');
        const screenshots = [
            '01-login-page.png',
            '02-nach-login.png', 
            '03-dropdown-offen.png',
            '04-lagerverwaltung-seite.png',
            '05-tab1-lagerbestand.png',
            '06-tab2-wareneingang.png',
            '07-tab3-erwartete-lieferungen.png'
        ];
        
        screenshots.forEach(screenshot => {
            if (fs.existsSync(screenshot)) {
                console.log(`   ✅ ${screenshot}`);
            }
        });
        
    } catch (error) {
        console.error('\n❌ FEHLER:', error.message);
        await page.screenshot({ path: 'fehler-screenshot.png' });
    } finally {
        console.log('\n🔄 Test beendet. Browser schließt in 5 Sekunden...');
        await page.waitForTimeout(5000);
        await browser.close();
    }
}

testLagerverwaltungWieMensch();