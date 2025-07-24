const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        console.log('🌐 Navigating to FoodSuite...');
        await page.goto('http://localhost:3003');
        
        // Wait for page to load
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        
        console.log('📦 Opening inventory tab...');
        
        // Use JavaScript to switch to inventory tab directly
        await page.evaluate(() => {
            // Call the showTab function directly
            if (typeof showTab === 'function') {
                showTab('inventory');
            } else {
                // Alternative: manually trigger tab switch
                document.querySelectorAll('.tab-pane').forEach(tab => tab.classList.remove('active'));
                const inventoryTab = document.getElementById('inventory');
                if (inventoryTab) {
                    inventoryTab.classList.add('active');
                    // Also update nav
                    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
                    const inventoryLink = document.querySelector('a[data-tab="inventory"]');
                    if (inventoryLink) inventoryLink.classList.add('active');
                }
            }
        });
        
        await page.waitForTimeout(2000);
        
        // Check if inventory content is visible
        const inventoryVisible = await page.locator('#inventory').isVisible();
        console.log(`Inventory tab visible: ${inventoryVisible}`);
        
        // Check for inventory content
        const inventoryContent = await page.locator('#inventoryContent').count();
        console.log(`Inventory content exists: ${inventoryContent > 0}`);
        
        // Take a screenshot
        await page.screenshot({ path: 'test-screenshots/inventory-tab.png', fullPage: true });
        console.log('📸 Screenshot saved to test-screenshots/inventory-tab.png');
        
        // Check the current content
        const inventoryHTML = await page.locator('#inventory').innerHTML();
        if (inventoryHTML.includes('Lagerverwaltung')) {
            console.log('✅ Found Lagerverwaltung content');
        } else {
            console.log('❌ Lagerverwaltung content not found');
            console.log('Current content preview:', inventoryHTML.substring(0, 200) + '...');
        }
        
        // Try to call loadInventoryManagement if it exists
        console.log('🔄 Attempting to load inventory management...');
        await page.evaluate(() => {
            if (typeof loadInventoryManagement === 'function') {
                loadInventoryManagement();
                console.log('Called loadInventoryManagement()');
            } else if (typeof loadInventoryData === 'function') {
                loadInventoryData();
                console.log('Called loadInventoryData()');
            } else {
                console.log('No inventory loading function found');
            }
        });
        
        await page.waitForTimeout(3000);
        
        // Final screenshot
        await page.screenshot({ path: 'test-screenshots/inventory-loaded.png', fullPage: true });
        console.log('📸 Final screenshot saved');
        
        // Check for inventory table
        const inventoryTable = await page.locator('#inventoryTable').count();
        console.log(`Inventory table exists: ${inventoryTable > 0}`);
        
        if (inventoryTable > 0) {
            const rows = await page.locator('#inventoryTable tbody tr').count();
            console.log(`Number of inventory rows: ${rows}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        await page.screenshot({ path: 'test-screenshots/inventory-error.png' });
    } finally {
        await browser.close();
    }
})();