const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ 
        headless: false,
        devtools: true 
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Enable console logging
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', error => console.error('Page error:', error));

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

        console.log('4. Looking for Warenwirtschaft dropdown...');
        
        // Wait for navigation to be visible
        await page.waitForSelector('.navbar', { state: 'visible' });
        
        // Find the Warenwirtschaft dropdown
        const dropdownToggle = await page.locator('a.dropdown-toggle:has-text("Warenwirtschaft")');
        const dropdownExists = await dropdownToggle.count() > 0;
        console.log('   - Dropdown found:', dropdownExists);
        
        if (dropdownExists) {
            console.log('5. Clicking on Warenwirtschaft dropdown...');
            await dropdownToggle.click();
            await page.waitForTimeout(500);
            
            // Check if dropdown menu is visible
            const dropdownMenu = await page.locator('.dropdown-menu:visible');
            const menuVisible = await dropdownMenu.count() > 0;
            console.log('   - Dropdown menu visible:', menuVisible);
            
            // Find Lagerbestand link
            const lagerbestandLink = await page.locator('a.dropdown-item:has-text("Lagerbestand")');
            const linkExists = await lagerbestandLink.count() > 0;
            console.log('   - Lagerbestand link found:', linkExists);
            
            if (linkExists) {
                // Get link attributes
                const href = await lagerbestandLink.getAttribute('href');
                const dataTab = await lagerbestandLink.getAttribute('data-tab');
                console.log('   - Link href:', href);
                console.log('   - Link data-tab:', dataTab);
                
                console.log('6. Clicking on Lagerbestand...');
                await lagerbestandLink.click();
                await page.waitForTimeout(1000);
                
                // Check if inventory tab is active
                const inventoryTab = await page.locator('#inventory');
                const inventoryVisible = await inventoryTab.isVisible();
                const inventoryHasActiveClass = await inventoryTab.evaluate(el => el.classList.contains('active'));
                
                console.log('7. Checking navigation result:');
                console.log('   - Inventory tab visible:', inventoryVisible);
                console.log('   - Inventory tab has active class:', inventoryHasActiveClass);
                
                // Check current URL
                console.log('   - Current URL:', page.url());
                
                // Check if any error messages appeared
                const toastMessages = await page.locator('.toast-body').allTextContents();
                if (toastMessages.length > 0) {
                    console.log('   - Toast messages:', toastMessages);
                }
                
                // Try alternative navigation method
                if (!inventoryVisible || !inventoryHasActiveClass) {
                    console.log('8. Trying direct showTab call...');
                    await page.evaluate(() => {
                        if (typeof showTab === 'function') {
                            showTab('inventory');
                        } else {
                            console.error('showTab function not found!');
                        }
                    });
                    await page.waitForTimeout(1000);
                    
                    const inventoryVisibleAfter = await inventoryTab.isVisible();
                    console.log('   - Inventory visible after direct call:', inventoryVisibleAfter);
                }
                
                // Check for any JavaScript errors
                const errors = await page.evaluate(() => {
                    return window.jsErrors || [];
                });
                if (errors.length > 0) {
                    console.log('9. JavaScript errors found:', errors);
                }
                
            } else {
                console.log('ERROR: Lagerbestand link not found in dropdown!');
            }
        } else {
            console.log('ERROR: Warenwirtschaft dropdown not found!');
        }
        
        // Take screenshot for debugging
        await page.screenshot({ path: 'dropdown-navigation-test.png', fullPage: true });
        console.log('Screenshot saved as dropdown-navigation-test.png');
        
    } catch (error) {
        console.error('Test error:', error);
        await page.screenshot({ path: 'dropdown-navigation-error.png', fullPage: true });
    }

    // Keep browser open for inspection
    console.log('\nTest complete. Browser will stay open for 30 seconds...');
    await page.waitForTimeout(30000);
    
    await browser.close();
})();