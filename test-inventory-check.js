const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        console.log('🌐 Navigating to FoodSuite...');
        await page.goto('http://localhost:3003');
        await page.waitForLoadState('networkidle');
        
        // First update realistic inventory via API
        console.log('📦 Updating realistic inventory...');
        const updateResult = await page.evaluate(async () => {
            const response = await fetch('/api/inventory/update-realistic', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-tenant-id': 'demo'
                }
            });
            return await response.json();
        });
        console.log('Update result:', updateResult);
        
        // Now navigate to inventory tab
        console.log('🔍 Switching to inventory tab...');
        await page.evaluate(() => {
            showTab('inventory');
        });
        
        await page.waitForTimeout(3000);
        
        // Check inventory table
        const inventoryRows = await page.locator('#inventoryTableBody tr').count();
        console.log(`📊 Inventory rows found: ${inventoryRows}`);
        
        if (inventoryRows > 0) {
            // Get first few rows content
            const firstRows = await page.evaluate(() => {
                const rows = document.querySelectorAll('#inventoryTableBody tr');
                return Array.from(rows).slice(0, 5).map(row => {
                    const cells = row.querySelectorAll('td');
                    return Array.from(cells).map(cell => cell.textContent.trim());
                });
            });
            
            console.log('\n📋 First 5 inventory items:');
            firstRows.forEach((row, i) => {
                console.log(`${i + 1}. ${row.join(' | ')}`);
            });
        }
        
        // Take screenshot
        await page.screenshot({ path: 'test-screenshots/inventory-working.png', fullPage: true });
        console.log('\n📸 Screenshot saved to test-screenshots/inventory-working.png');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        console.log('\n✅ Test completed - browser will close in 5 seconds');
        await page.waitForTimeout(5000);
        await browser.close();
    }
})();