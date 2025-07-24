const { chromium } = require('@playwright/test');

async function testWarehouseTab() {
    console.log('🚀 Testing FoodSuite Warehouse/Inventory Tab\n');
    
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 1000
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('❌ Console Error:', msg.text());
        }
    });
    
    try {
        // 1. Navigate and login
        console.log('1️⃣ Navigating to FoodSuite...');
        await page.goto('http://localhost:3003');
        await page.waitForTimeout(2000);
        
        console.log('2️⃣ Logging in as admin...');
        await page.fill('#username', 'admin');
        await page.fill('#password', 'Demo123!');
        await page.click('button[type="submit"]:has-text("Anmelden")');
        await page.waitForTimeout(3000);
        
        // 2. Take screenshot of main page
        await page.screenshot({ 
            path: 'main-page.png',
            fullPage: true 
        });
        console.log('   📸 Main page screenshot saved');
        
        // 3. Find all navigation tabs
        console.log('\n3️⃣ Finding navigation tabs...');
        const navTabs = await page.locator('.nav-link, button[data-bs-toggle="tab"]').all();
        console.log(`   Found ${navTabs.length} navigation elements`);
        
        // Print all tab texts
        for (const tab of navTabs) {
            const text = await tab.textContent();
            console.log(`   - ${text.trim()}`);
        }
        
        // 4. Look specifically for warehouse/inventory
        console.log('\n4️⃣ Looking for Lagerverwaltung...');
        
        // Try multiple possible selectors
        const warehouseSelectors = [
            '[data-bs-target="#warehouseContent"]',
            'button:has-text("Lagerverwaltung")',
            'a:has-text("Lagerverwaltung")',
            '.nav-link:has-text("Lagerverwaltung")',
            '[onclick*="warehouse"]',
            '[onclick*="inventory"]'
        ];
        
        let found = false;
        for (const selector of warehouseSelectors) {
            const element = page.locator(selector).first();
            if (await element.count() > 0) {
                console.log(`   ✅ Found with selector: ${selector}`);
                await element.click();
                found = true;
                break;
            }
        }
        
        if (!found) {
            console.log('   ⚠️ Could not find Lagerverwaltung tab directly');
            
            // Look in all tabs for warehouse content
            const allTabs = await page.locator('[data-bs-toggle="tab"]').all();
            console.log(`\n   Checking ${allTabs.length} tabs...`);
            
            for (let i = 0; i < allTabs.length; i++) {
                const tab = allTabs[i];
                const tabText = await tab.textContent();
                console.log(`   Tab ${i+1}: ${tabText.trim()}`);
                
                if (tabText.includes('Lager') || tabText.includes('Warehouse') || tabText.includes('Bestand')) {
                    console.log('   📦 This might be the warehouse tab!');
                    await tab.click();
                    found = true;
                    break;
                }
            }
        }
        
        await page.waitForTimeout(3000);
        
        // 5. Check page content
        console.log('\n5️⃣ Checking page content...');
        
        // Look for any warehouse-related content
        const warehouseKeywords = [
            'Wareneingänge',
            'Erwartete Lieferungen',
            'Lagerbestand',
            'Inventory',
            'Stock',
            'goodsReceiptsTableBody',
            'pendingDeliveriesTableBody'
        ];
        
        for (const keyword of warehouseKeywords) {
            const hasKeyword = await page.locator(`text=${keyword}`).count() > 0 ||
                              await page.locator(`#${keyword}`).count() > 0;
            if (hasKeyword) {
                console.log(`   ✅ Found: ${keyword}`);
            }
        }
        
        // Check for tables
        const tables = await page.locator('table').all();
        console.log(`\n   Found ${tables.length} tables on page`);
        
        // Check table content
        const tableRows = await page.locator('tbody tr').all();
        console.log(`   Found ${tableRows.length} table rows total`);
        
        // 6. Final screenshot
        await page.screenshot({ 
            path: 'warehouse-tab.png',
            fullPage: true 
        });
        console.log('\n📸 Final screenshot saved as warehouse-tab.png');
        
        // 7. Try to trigger inventory loading manually
        console.log('\n6️⃣ Trying to trigger inventory loading...');
        await page.evaluate(() => {
            if (typeof loadGoodsReceipts === 'function') {
                console.log('Calling loadGoodsReceipts()...');
                loadGoodsReceipts();
            }
            if (typeof loadPendingDeliveries === 'function') {
                console.log('Calling loadPendingDeliveries()...');
                loadPendingDeliveries();
            }
        });
        
        await page.waitForTimeout(3000);
        
        // Final check
        const finalRows = await page.locator('tbody tr').all();
        console.log(`\n✅ Final table rows: ${finalRows.length}`);
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        await page.screenshot({ path: 'error.png' });
    } finally {
        console.log('\n🔄 Test complete. Browser will close in 5 seconds...');
        await page.waitForTimeout(5000);
        await browser.close();
    }
}

testWarehouseTab();