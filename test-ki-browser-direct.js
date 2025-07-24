const { chromium } = require('playwright');

(async () => {
    console.log('🚀 Testing KI buttons directly in browser...');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--disable-blink-features=AutomationControlled']
    });
    
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Log all console messages
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('❌ Browser error:', msg.text());
        }
    });
    
    // Log all failed requests
    page.on('requestfailed', request => {
        console.log('❌ Request failed:', request.url());
    });
    
    try {
        // Navigate directly to the app
        console.log('📱 Opening FoodSuite...');
        await page.goto('http://localhost:3003');
        await page.waitForLoadState('networkidle');
        
        // Check if we need to login
        const loginForm = await page.$('#loginForm');
        if (loginForm) {
            console.log('🔐 Login form found, attempting login...');
            
            // Try to find username field with different selectors
            const usernameSelectors = [
                'input[name="username"]',
                'input[type="text"]',
                'input[placeholder*="Benutzer"]',
                '#username'
            ];
            
            let usernameField = null;
            for (const selector of usernameSelectors) {
                usernameField = await page.$(selector);
                if (usernameField) {
                    console.log(`✅ Found username field with selector: ${selector}`);
                    break;
                }
            }
            
            if (usernameField) {
                await usernameField.fill('admin');
                
                // Find password field
                const passwordField = await page.$('input[type="password"]');
                if (passwordField) {
                    await passwordField.fill('Demo123!');
                    
                    // Find and click login button
                    const loginButton = await page.$('button[type="submit"]');
                    if (loginButton) {
                        await loginButton.click();
                        console.log('✅ Login submitted');
                        await page.waitForTimeout(2000);
                    }
                }
            }
        }
        
        // Check if we're logged in by looking for the navbar
        const navbar = await page.$('.navbar');
        if (!navbar) {
            console.log('⚠️ Not logged in, continuing anyway...');
        } else {
            console.log('✅ Logged in successfully');
        }
        
        // Navigate to meal planning
        console.log('📅 Navigating to meal planning...');
        
        // Try different ways to navigate
        const mealPlanningLink = await page.$('a[href="#mealplanning"]');
        if (mealPlanningLink) {
            await mealPlanningLink.click();
        } else {
            // Try direct navigation
            await page.evaluate(() => {
                window.location.hash = '#mealplanning';
            });
        }
        
        await page.waitForTimeout(1000);
        
        // Check if meal planning section is visible
        const mealPlanningSection = await page.$('#mealplanning');
        if (mealPlanningSection) {
            const isVisible = await mealPlanningSection.isVisible();
            console.log(`📅 Meal planning section visible: ${isVisible}`);
        }
        
        // Look for KI controls
        console.log('\n🔍 Checking for KI controls...');
        
        // Check for AI mode selector
        const aiModeSelect = await page.$('#aiModeSelect');
        if (aiModeSelect) {
            console.log('✅ AI mode selector found');
            const selectedValue = await aiModeSelect.evaluate(el => el.value);
            console.log(`   Current mode: ${selectedValue}`);
        } else {
            console.log('❌ AI mode selector NOT found');
        }
        
        // Check for KI buttons
        const buttons = [
            { selector: 'button[data-action="generateAIWeekMenu"]', name: 'KI-Plan erstellen' },
            { selector: 'button[data-action="optimizeCurrentPlan"]', name: 'Plan optimieren' },
            { selector: 'button[onclick*="generateIntelligentShoppingList"]', name: 'Einkaufsliste' },
            { selector: '.ai-designer-btn', name: 'AI Designer' }
        ];
        
        for (const btn of buttons) {
            const button = await page.$(btn.selector);
            if (button) {
                const isVisible = await button.isVisible();
                const isEnabled = await button.isEnabled();
                console.log(`✅ ${btn.name}: Found (Visible: ${isVisible}, Enabled: ${isEnabled})`);
                
                // Get button text
                const text = await button.textContent();
                console.log(`   Text: "${text.trim()}"`);
            } else {
                console.log(`❌ ${btn.name}: NOT found`);
            }
        }
        
        // Check for AI controls container
        const aiControls = await page.$('.ai-controls');
        if (aiControls) {
            console.log('\n✅ AI controls container found');
            
            // Get all buttons inside
            const allButtons = await aiControls.$$('button');
            console.log(`   Total buttons in AI controls: ${allButtons.length}`);
            
            for (let i = 0; i < allButtons.length; i++) {
                const text = await allButtons[i].textContent();
                const dataAction = await allButtons[i].getAttribute('data-action');
                console.log(`   Button ${i + 1}: "${text.trim()}" (action: ${dataAction || 'none'})`);
            }
        } else {
            console.log('❌ AI controls container NOT found');
        }
        
        // Try clicking KI-Plan erstellen if it exists
        console.log('\n🖱️ Attempting to click KI-Plan erstellen...');
        const generateButton = await page.$('button[data-action="generateAIWeekMenu"]');
        if (generateButton && await generateButton.isVisible()) {
            // Monitor network request
            const responsePromise = page.waitForResponse(response => 
                response.url().includes('/api/ai/suggest-meals'),
                { timeout: 10000 }
            ).catch(() => null);
            
            await generateButton.click();
            console.log('✅ Clicked KI-Plan erstellen');
            
            const response = await responsePromise;
            if (response) {
                console.log(`📡 AI API Response: ${response.status()}`);
                if (response.status() === 200) {
                    console.log('✅ AI meal plan generated successfully!');
                } else {
                    const error = await response.text();
                    console.log(`❌ AI API Error: ${error}`);
                }
            } else {
                console.log('⚠️ No API response received (timeout or no request made)');
            }
        }
        
        // Take screenshot
        await page.screenshot({ 
            path: 'ki-buttons-test.png',
            fullPage: true 
        });
        console.log('\n📸 Screenshot saved: ki-buttons-test.png');
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
        await page.screenshot({ path: 'ki-error.png' });
    }
    
    console.log('\n⏸️ Browser remains open for manual testing.');
    console.log('You can now test the buttons manually.');
    console.log('Press Ctrl+C to close.');
    
    await new Promise(() => {});
})();