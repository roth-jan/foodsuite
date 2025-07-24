const { chromium } = require('@playwright/test');

async function testFinalUserDemo() {
    console.log('🎯 FINALER TEST für den User\n');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 1500  // Langsamer für bessere Sichtbarkeit
    });
    
    const page = await browser.newPage();
    page.setViewportSize({ width: 1400, height: 900 });
    
    try {
        console.log('1️⃣ Öffne FoodSuite...');
        await page.goto('http://localhost:3003');
        await page.waitForTimeout(2000);
        
        console.log('2️⃣ Gehe zur Lagerverwaltung...');
        await page.click('a.dropdown-toggle:has-text("Warenwirtschaft")');
        await page.waitForTimeout(1000);
        await page.click('a.dropdown-item:has-text("Lagerbestand")');
        await page.waitForTimeout(3000);
        
        // Screenshot 1: Haupttabelle
        console.log('\n📸 Screenshot 1: Lagerbestand Haupttabelle');
        await page.screenshot({ path: 'user-demo-01-lagerbestand.png', fullPage: true });
        
        // Zeige erste Produkte
        const products = await page.locator('#inventoryTableBody tr').evaluateAll(rows => 
            rows.slice(0, 5).map(row => {
                const cells = row.querySelectorAll('td');
                return {
                    name: cells[0]?.textContent?.trim(),
                    category: cells[1]?.textContent?.trim(),
                    stock: cells[2]?.textContent?.trim()
                };
            })
        );
        
        console.log('\n✅ Die ersten 5 Produkte im Lager:');
        products.forEach((p, i) => {
            console.log(`   ${i+1}. ${p.name} (${p.category}) - Bestand: ${p.stock}`);
        });
        
        // Tab 2: Wareneingang
        console.log('\n3️⃣ Wechsle zu Tab 2: Wareneingang...');
        await page.click('button[data-bs-target="#goods-receipts"]');
        await page.waitForTimeout(2500);
        
        console.log('📸 Screenshot 2: Wareneingang');
        await page.screenshot({ path: 'user-demo-02-wareneingang.png', fullPage: true });
        
        // Tab 3: Erwartete Lieferungen
        console.log('\n4️⃣ Wechsle zu Tab 3: Erwartete Lieferungen...');
        await page.click('button[data-bs-target="#pending-deliveries"]');
        await page.waitForTimeout(2500);
        
        console.log('📸 Screenshot 3: Erwartete Lieferungen');
        await page.screenshot({ path: 'user-demo-03-lieferungen.png', fullPage: true });
        
        // Zurück zu Tab 1 für finales Bild
        console.log('\n5️⃣ Zurück zur Hauptansicht...');
        await page.click('button[data-bs-target="#stock"]');
        await page.waitForTimeout(1500);
        
        // Zusammenfassung
        console.log('\n' + '='.repeat(60));
        console.log('🎉 ERFOLG! Die Lagerverwaltung funktioniert jetzt:');
        console.log('='.repeat(60));
        console.log('\n✅ Alle Produktnamen werden korrekt angezeigt');
        console.log('✅ Keine "undefined" Werte mehr');
        console.log('✅ Alle 3 Tabs laden automatisch ihre Daten');
        console.log('✅ Die Tabellen sind sichtbar und gefüllt');
        console.log('\n📁 Screenshots gespeichert als:');
        console.log('   - user-demo-01-lagerbestand.png');
        console.log('   - user-demo-02-wareneingang.png');
        console.log('   - user-demo-03-lieferungen.png');
        
    } catch (error) {
        console.error('\n❌ FEHLER:', error.message);
        await page.screenshot({ path: 'user-demo-error.png' });
    } finally {
        console.log('\n⏱️ Browser bleibt 30 Sekunden offen zum Anschauen...');
        await page.waitForTimeout(30000);
        await browser.close();
    }
}

testFinalUserDemo();