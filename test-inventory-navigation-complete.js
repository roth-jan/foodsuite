const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ 
        headless: false,
        devtools: true 
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Enable console logging and network monitoring
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', error => console.error('Page error:', error));
    
    // Monitor API calls
    const apiCalls = [];
    page.on('request', request => {
        if (request.url().includes('/api/')) {
            console.log('API Request:', request.method(), request.url());
            apiCalls.push({
                method: request.method(),
                url: request.url(),
                headers: request.headers()
            });
        }
    });
    
    page.on('response', response => {
        if (response.url().includes('/api/')) {
            console.log('API Response:', response.status(), response.url());
        }
    });

    try {
        console.log('1. Opening FoodSuite app...');
        await page.goto('http://localhost:3003');
        
        // Wait for page to load
        await page.waitForLoadState('networkidle');
        
        console.log('2. Checking if login is required...');
        const loginModalVisible = await page.isVisible('#loginModal');
        if (loginModalVisible) {
            console.log('3. Logging in...');
            await page.fill('#loginUsername', 'admin');
            await page.fill('#loginPassword', 'Demo123!');
            await page.click('button:has-text("Anmelden")');
            await page.waitForTimeout(2000);
        }

        console.log('4. Navigating to Inventory via dropdown...');
        
        // Clear previous API calls
        apiCalls.length = 0;
        
        // Click on Warenwirtschaft dropdown
        await page.click('a.dropdown-toggle:has-text("Warenwirtschaft")');
        await page.waitForTimeout(500);
        
        // Click on Lagerbestand
        await page.click('a.dropdown-item:has-text("Lagerbestand")');
        await page.waitForTimeout(2000);
        
        console.log('5. Checking if inventory is loaded...');
        
        // Check if inventory tab is active
        const inventoryActive = await page.evaluate(() => {
            const inventoryTab = document.getElementById('inventory');
            return inventoryTab && inventoryTab.classList.contains('active');
        });
        console.log('   - Inventory tab active:', inventoryActive);
        
        // Check API calls made
        console.log('6. API calls made:', apiCalls.length);
        apiCalls.forEach(call => {
            console.log(`   - ${call.method} ${call.url}`);
            if (call.headers['x-tenant-id']) {
                console.log(`     Tenant ID: ${call.headers['x-tenant-id']}`);
            }
        });
        
        // Check inventory table content
        const inventoryRows = await page.locator('#inventoryTableBody tr').count();
        console.log('7. Inventory table rows found:', inventoryRows);
        
        // Get first few rows content
        if (inventoryRows > 0) {
            const firstRowText = await page.locator('#inventoryTableBody tr').first().textContent();
            console.log('   - First row:', firstRowText.trim());
        }
        
        // Check if there's an error message
        const errorMessage = await page.locator('#inventoryTableBody td:has-text("Keine Produkte")').count();
        if (errorMessage > 0) {
            console.log('   - No products message found!');
        }
        
        // Try direct API call from browser console
        console.log('8. Testing direct API call from browser...');
        const apiResult = await page.evaluate(async () => {
            try {
                const response = await fetch('http://localhost:3003/api/products', {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-tenant-id': 'demo',
                        'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
                    }
                });
                const data = await response.json();
                return {
                    status: response.status,
                    ok: response.ok,
                    dataLength: data.items ? data.items.length : 0,
                    error: data.error || null
                };
            } catch (error) {
                return { error: error.message };
            }
        });
        console.log('   - Direct API result:', apiResult);
        
        // Check loadInventory function
        console.log('9. Testing loadInventory function...');
        await page.evaluate(async () => {
            if (typeof loadInventory === 'function') {
                console.log('Calling loadInventory()...');
                await loadInventory();
            } else {
                console.error('loadInventory function not found!');
            }
        });
        await page.waitForTimeout(2000);
        
        // Recheck inventory rows
        const inventoryRowsAfter = await page.locator('#inventoryTableBody tr').count();
        console.log('10. Inventory rows after loadInventory:', inventoryRowsAfter);
        
        // Take screenshot
        await page.screenshot({ path: 'inventory-navigation-complete.png', fullPage: true });
        console.log('Screenshot saved as inventory-navigation-complete.png');
        
    } catch (error) {
        console.error('Test error:', error);
        await page.screenshot({ path: 'inventory-navigation-error.png', fullPage: true });
    }

    // Keep browser open for inspection
    console.log('\nTest complete. Browser will stay open for 30 seconds...');
    await page.waitForTimeout(30000);
    
    await browser.close();
})();