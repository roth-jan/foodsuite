const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        console.log('🌐 Navigating to FoodSuite...');
        await page.goto('http://localhost:3003');
        
        // Wait for page to load
        await page.waitForLoadState('networkidle');
        
        console.log('📦 Looking for inventory management...');
        
        // First click on "Mehr" dropdown
        console.log('Clicking on "Mehr" dropdown...');
        await page.click('a.dropdown-toggle:has-text("Mehr")');
        await page.waitForTimeout(1000);
        
        // Now click on inventory tab in dropdown
        console.log('Clicking on inventory in dropdown...');
        await page.click('a[data-tab="inventory"]:visible');
        
        // Wait a bit for content to load
        await page.waitForTimeout(2000);
        
        // Check if inventory content is visible
        const inventoryContent = await page.locator('#inventoryContent').isVisible();
        console.log(`Inventory content visible: ${inventoryContent}`);
        
        // Check for inventory items
        const inventoryItems = await page.locator('#inventoryTable tbody tr').count();
        console.log(`Number of inventory items: ${inventoryItems}`);
        
        // Take a screenshot
        await page.screenshot({ path: 'test-screenshots/inventory-page.png' });
        console.log('📸 Screenshot saved to test-screenshots/inventory-page.png');
        
        // Try to update realistic inventory
        console.log('🔄 Attempting to update realistic inventory...');
        await page.evaluate(async () => {
            const response = await fetch('/api/inventory/update-realistic', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-tenant-id': 'demo'
                }
            });
            const result = await response.json();
            console.log('Update result:', result);
            return result;
        });
        
        // Reload inventory
        await page.click('a[onclick*="loadInventoryManagement"]');
        await page.waitForTimeout(2000);
        
        // Check inventory items again
        const updatedItems = await page.locator('#inventoryTable tbody tr').count();
        console.log(`Number of inventory items after update: ${updatedItems}`);
        
        // Take final screenshot
        await page.screenshot({ path: 'test-screenshots/inventory-updated.png' });
        console.log('📸 Updated screenshot saved');
        
    } catch (error) {
        console.error('❌ Error:', error);
        await page.screenshot({ path: 'test-screenshots/inventory-error.png' });
    } finally {
        await browser.close();
    }
})();