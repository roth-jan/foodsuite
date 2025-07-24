const puppeteer = require('puppeteer');

(async () => {
    console.log('🚀 Starte Puppeteer Browser-Test für Lagerverwaltung...\n');
    
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Set viewport
        await page.setViewport({ width: 1280, height: 800 });
        
        // Navigate to application
        console.log('1️⃣ Navigiere zu FoodSuite...');
        await page.goto('http://localhost:3003', { waitUntil: 'networkidle2' });
        await page.screenshot({ path: 'puppeteer-1-login.png' });
        console.log('   📸 Screenshot: puppeteer-1-login.png');
        
        // Login
        console.log('\n2️⃣ Melde mich an...');
        await page.type('input[type="text"]', 'admin');
        await page.type('input[type="password"]', 'Demo123!');
        await page.click('button:contains("Anmelden")');
        await page.waitForTimeout(3000);
        
        await page.screenshot({ path: 'puppeteer-2-logged-in.png' });
        console.log('   📸 Screenshot: puppeteer-2-logged-in.png');
        
        // Navigate to inventory
        console.log('\n3️⃣ Navigiere zur Lagerverwaltung...');
        
        // Click on "Mehr" dropdown using XPath
        await page.evaluate(() => {
            const mehrLink = Array.from(document.querySelectorAll('a.dropdown-toggle')).find(el => el.textContent.includes('Mehr'));
            if (mehrLink) mehrLink.click();
        });
        await page.waitForTimeout(1000);
        
        // Click on Lagerverwaltung
        await page.evaluate(() => {
            const inventoryLink = document.querySelector('a[data-tab="inventory"]');
            if (inventoryLink) inventoryLink.click();
        });
        await page.waitForTimeout(3000);
        
        await page.screenshot({ path: 'puppeteer-3-inventory.png', fullPage: true });
        console.log('   📸 Screenshot: puppeteer-3-inventory.png');
        
        // Check if inventory content is loaded
        console.log('\n4️⃣ Prüfe Lagerbestand-Anzeige...');
        
        // Check if table exists and count rows
        const tableData = await page.evaluate(() => {
            const table = document.querySelector('#inventoryTable');
            if (!table) return { tableExists: false };
            
            const rows = table.querySelectorAll('tbody tr');
            const data = {
                tableExists: true,
                rowCount: rows.length,
                rows: []
            };
            
            // Check for loading or no data messages
            const firstCell = rows[0]?.querySelector('td');
            if (firstCell) {
                const text = firstCell.textContent;
                data.hasLoadingMessage = text.includes('Lade Inventar');
                data.hasNoDataMessage = text.includes('Keine Produkte');
            }
            
            // Get first 5 rows of data
            for (let i = 0; i < Math.min(5, rows.length); i++) {
                const cells = rows[i].querySelectorAll('td');
                if (cells.length >= 3 && !data.hasLoadingMessage && !data.hasNoDataMessage) {
                    data.rows.push({
                        name: cells[0].textContent.trim(),
                        category: cells[1].textContent.trim(),
                        stock: cells[2].textContent.trim()
                    });
                }
            }
            
            return data;
        });
        
        console.log(`   ✓ Tabelle existiert: ${tableData.tableExists}`);
        console.log(`   ✓ Anzahl Zeilen: ${tableData.rowCount}`);
        
        if (tableData.hasLoadingMessage) {
            console.log('   ⚠️  Lade-Nachricht wird angezeigt');
        }
        if (tableData.hasNoDataMessage) {
            console.log('   ⚠️  "Keine Produkte" Nachricht wird angezeigt');
        }
        
        if (tableData.rows.length > 0) {
            console.log('\n   📦 Gefundene Lagerartikel:');
            tableData.rows.forEach((row, i) => {
                console.log(`      ${i + 1}. ${row.name} | ${row.category} | ${row.stock}`);
            });
            if (tableData.rowCount > 5) {
                console.log(`      ... und ${tableData.rowCount - 5} weitere Artikel`);
            }
        }
        
        // Check console errors
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        // Get network errors
        const failedRequests = [];
        page.on('requestfailed', request => {
            failedRequests.push({
                url: request.url(),
                error: request.failure().errorText
            });
        });
        
        // Wait a bit to collect any errors
        await page.waitForTimeout(1000);
        
        // Final verdict
        console.log('\n' + '='.repeat(60));
        if (tableData.rowCount > 0 && !tableData.hasLoadingMessage && !tableData.hasNoDataMessage) {
            console.log(`✅ ERFOLG: Lagerverwaltung zeigt ${tableData.rowCount} Artikel an!`);
        } else {
            console.log('❌ FEHLER: Keine Lagerdaten werden angezeigt!');
            if (!tableData.tableExists) console.log('   - Tabelle existiert nicht');
            if (tableData.hasLoadingMessage) console.log('   - Lade-Nachricht wird angezeigt');
            if (tableData.hasNoDataMessage) console.log('   - "Keine Produkte" Nachricht wird angezeigt');
            if (tableData.rowCount === 0) console.log('   - Tabelle ist leer');
        }
        
        if (consoleErrors.length > 0) {
            console.log('\n⚠️  Browser Console Errors:');
            consoleErrors.forEach(err => console.log('   - ' + err));
        }
        
        if (failedRequests.length > 0) {
            console.log('\n⚠️  Failed Network Requests:');
            failedRequests.forEach(req => console.log(`   - ${req.url}: ${req.error}`));
        }
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('\n❌ Test-Fehler:', error.message);
        console.error(error.stack);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();