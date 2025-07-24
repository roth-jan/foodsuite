const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false, slowMo: 500 });
    const page = await browser.newPage();
    
    try {
        console.log('🌐 Opening FoodSuite...');
        await page.goto('http://localhost:3003');
        
        // Wait for page to load
        await page.waitForLoadState('networkidle');
        
        console.log('🔐 Logging in...');
        // Check if we need to login first
        const loginButton = await page.locator('button:has-text("Anmelden")').isVisible();
        if (loginButton) {
            await page.fill('input[type="text"]', 'admin');
            await page.fill('input[type="password"]', 'Demo123!');
            await page.click('button:has-text("Anmelden")');
            await page.waitForTimeout(2000);
        }
        
        console.log('📦 Navigating to inventory...');
        
        // Try direct navigation first
        const inventoryTab = await page.locator('a[data-tab="inventory"]:visible').count();
        console.log(`Direct inventory tab visible: ${inventoryTab > 0}`);
        
        if (inventoryTab === 0) {
            // Look for "Mehr" dropdown
            console.log('Looking for "Mehr" dropdown...');
            const mehrDropdown = await page.locator('a.dropdown-toggle:has-text("Mehr")').isVisible();
            console.log(`"Mehr" dropdown visible: ${mehrDropdown}`);
            
            if (mehrDropdown) {
                await page.click('a.dropdown-toggle:has-text("Mehr")');
                await page.waitForTimeout(500);
                
                // Click inventory in dropdown
                await page.click('a[data-tab="inventory"]');
            }
        } else {
            await page.click('a[data-tab="inventory"]:visible');
        }
        
        await page.waitForTimeout(2000);
        
        // Check what's loaded
        console.log('\n📊 Checking inventory content...');
        
        // Check if content area is visible
        const inventoryContent = await page.locator('#inventoryContent').isVisible();
        console.log(`Inventory content area visible: ${inventoryContent}`);
        
        // Check for tabs
        const tabs = await page.locator('#inventoryContent .nav-tabs').isVisible();
        console.log(`Inventory tabs visible: ${tabs}`);
        
        if (tabs) {
            const tabNames = await page.locator('#inventoryContent .nav-tabs .nav-link').allTextContents();
            console.log(`Available tabs: ${tabNames.join(', ')}`);
        }
        
        // Check active tab content
        const activeTabContent = await page.locator('#inventoryContent .tab-pane.active').isVisible();
        console.log(`Active tab content visible: ${activeTabContent}`);
        
        // Check for table
        const table = await page.locator('#inventoryTable').isVisible();
        console.log(`Inventory table visible: ${table}`);
        
        if (table) {
            const rows = await page.locator('#inventoryTable tbody tr').count();
            console.log(`Number of table rows: ${rows}`);
            
            if (rows === 0) {
                // Check for loading message
                const loading = await page.locator('.text-center:has-text("Lade")').isVisible();
                console.log(`Loading message visible: ${loading}`);
                
                // Check for error message
                const error = await page.locator('.alert-danger').isVisible();
                console.log(`Error message visible: ${error}`);
                if (error) {
                    const errorText = await page.locator('.alert-danger').textContent();
                    console.log(`Error text: ${errorText}`);
                }
            }
        }
        
        // Check console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('Browser console error:', msg.text());
            }
        });
        
        // Take screenshot
        await page.screenshot({ path: 'inventory-debug.png', fullPage: true });
        console.log('\n📸 Screenshot saved as inventory-debug.png');
        
        // Check API directly from browser
        console.log('\n🔍 Testing API from browser...');
        const apiResult = await page.evaluate(async () => {
            try {
                const response = await fetch('/api/inventory', {
                    headers: {
                        'x-tenant-id': 'demo',
                        'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
                    }
                });
                const data = await response.json();
                return {
                    status: response.status,
                    itemCount: data.items ? data.items.length : 0,
                    error: data.error || null
                };
            } catch (error) {
                return { error: error.message };
            }
        });
        console.log('API test result:', apiResult);
        
    } catch (error) {
        console.error('❌ Error:', error);
        await page.screenshot({ path: 'inventory-error.png' });
    } finally {
        console.log('\n⌛ Keeping browser open for 10 seconds...');
        await page.waitForTimeout(10000);
        await browser.close();
    }
})();