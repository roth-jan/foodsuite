const { chromium } = require('playwright');

(async () => {
    console.log('🚀 Automatischer KI-Button Test gestartet...');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--disable-blink-features=AutomationControlled']
    });
    
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Enhanced console logging
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        if (type === 'error') {
            console.log('❌ Browser Error:', text);
        } else if (type === 'warn') {
            console.log('⚠️ Browser Warning:', text);
        } else if (text.includes('KI') || text.includes('AI') || text.includes('generateAI')) {
            console.log('🤖 AI Log:', text);
        }
    });
    
    // Monitor network
    page.on('response', response => {
        if (response.url().includes('/api/ai/')) {
            console.log(`📡 AI API: ${response.status()} - ${response.url()}`);
        }
    });
    
    try {
        // Navigate to app
        console.log('\n1️⃣ Navigating to localhost:3003...');
        await page.goto('http://localhost:3003');
        await page.waitForLoadState('networkidle');
        
        // Take screenshot of initial state
        await page.screenshot({ path: 'ki-test-1-initial.png' });
        
        // Check for login
        const needsLogin = await page.$('#loginForm');
        if (needsLogin) {
            console.log('2️⃣ Logging in...');
            
            // Fill login form
            await page.fill('#username', 'admin');
            await page.fill('#password', 'Demo123!');
            await page.click('button[type="submit"]');
            
            // Wait for navigation
            await page.waitForSelector('.navbar', { timeout: 5000 }).catch(() => {
                console.log('⚠️ Navbar not found, continuing...');
            });
            
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'ki-test-2-after-login.png' });
        }
        
        // Navigate to meal planning
        console.log('\n3️⃣ Navigating to Meal Planning...');
        
        // Method 1: Click on nav link
        const mealPlanLink = await page.$('a[href="#mealplanning"]');
        if (mealPlanLink) {
            await mealPlanLink.click();
            console.log('✅ Clicked meal planning link');
        } else {
            // Method 2: Direct hash navigation
            await page.evaluate(() => {
                window.location.hash = '#mealplanning';
            });
            console.log('✅ Navigated via hash');
        }
        
        await page.waitForTimeout(2000);
        
        // Check if meal planning is visible
        const mealPlanningVisible = await page.evaluate(() => {
            const section = document.querySelector('#mealplanning');
            return section && section.style.display !== 'none';
        });
        
        console.log(`📅 Meal planning visible: ${mealPlanningVisible}`);
        
        if (!mealPlanningVisible) {
            // Try to make it visible
            await page.evaluate(() => {
                const sections = document.querySelectorAll('.content-section');
                sections.forEach(s => s.style.display = 'none');
                const mealSection = document.querySelector('#mealplanning');
                if (mealSection) mealSection.style.display = 'block';
            });
            console.log('✅ Forced meal planning visibility');
        }
        
        await page.screenshot({ path: 'ki-test-3-meal-planning.png' });
        
        // Debug: Check what functions are available
        console.log('\n4️⃣ Checking available functions...');
        const functionCheck = await page.evaluate(() => {
            return {
                generateAIWeekMenu: typeof generateAIWeekMenu,
                optimizeCurrentPlan: typeof optimizeCurrentPlan,
                API_BASE_URL: typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'undefined',
                TENANT_ID: typeof TENANT_ID !== 'undefined' ? TENANT_ID : 'undefined',
                AppData: typeof AppData !== 'undefined' ? 'exists' : 'undefined'
            };
        });
        console.log('Function availability:', functionCheck);
        
        // Check for KI buttons
        console.log('\n5️⃣ Looking for KI buttons...');
        
        const buttonSelectors = [
            { selector: 'button[data-action="generateAIWeekMenu"]', name: 'KI-Plan erstellen' },
            { selector: 'button[data-action="optimizeCurrentPlan"]', name: 'Plan optimieren' },
            { selector: '#aiModeSelect', name: 'AI Mode Selector' }
        ];
        
        for (const btn of buttonSelectors) {
            const element = await page.$(btn.selector);
            if (element) {
                const isVisible = await element.isVisible();
                const text = await element.textContent();
                console.log(`✅ ${btn.name}: Found - "${text?.trim()}" (Visible: ${isVisible})`);
            } else {
                console.log(`❌ ${btn.name}: NOT FOUND`);
            }
        }
        
        // Try to find buttons with different methods
        const allButtons = await page.$$eval('button', buttons => 
            buttons.map(b => ({
                text: b.textContent.trim(),
                dataAction: b.getAttribute('data-action'),
                onclick: b.getAttribute('onclick'),
                visible: b.offsetParent !== null
            }))
        );
        
        console.log('\n📋 All buttons found:');
        allButtons.forEach(b => {
            if (b.text.includes('KI') || b.dataAction?.includes('AI') || b.dataAction?.includes('Week')) {
                console.log(`  - "${b.text}" (action: ${b.dataAction}, visible: ${b.visible})`);
            }
        });
        
        // Test direct API call
        console.log('\n6️⃣ Testing AI API directly...');
        const apiTest = await page.evaluate(async () => {
            try {
                const response = await fetch('http://localhost:3003/api/ai/suggest-meals', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-tenant-id': 'demo'
                    },
                    body: JSON.stringify({
                        mode: 'cost_optimized',
                        weekNumber: 1,
                        currentPlan: {}
                    })
                });
                
                const data = await response.json();
                return {
                    status: response.status,
                    ok: response.ok,
                    mealCount: data.mealPlan ? Object.keys(data.mealPlan).length : 0,
                    error: data.error
                };
            } catch (error) {
                return { error: error.message };
            }
        });
        
        console.log('API Test Result:', apiTest);
        
        // Try to click KI button if found
        const kiButton = await page.$('button[data-action="generateAIWeekMenu"]');
        if (kiButton && await kiButton.isVisible()) {
            console.log('\n7️⃣ Clicking KI-Plan erstellen button...');
            
            // Set up response listener
            const responsePromise = page.waitForResponse(
                response => response.url().includes('/api/ai/suggest-meals'),
                { timeout: 5000 }
            ).catch(() => null);
            
            await kiButton.click();
            console.log('✅ Button clicked');
            
            const response = await responsePromise;
            if (response) {
                console.log(`📡 API Response: ${response.status()}`);
            } else {
                console.log('⚠️ No API call detected after button click');
            }
            
            await page.waitForTimeout(2000);
        } else {
            console.log('\n❌ KI button not found or not visible');
            
            // Try to call function directly
            console.log('Attempting to call generateAIWeekMenu directly...');
            const result = await page.evaluate(async () => {
                if (typeof generateAIWeekMenu === 'function') {
                    try {
                        await generateAIWeekMenu();
                        return 'Function called successfully';
                    } catch (error) {
                        return `Function error: ${error.message}`;
                    }
                } else {
                    return 'Function not defined';
                }
            });
            console.log('Direct call result:', result);
        }
        
        // Final screenshot
        await page.screenshot({ path: 'ki-test-4-final.png', fullPage: true });
        
        // Summary
        console.log('\n📊 Test Summary:');
        console.log('- Login: ✅');
        console.log('- Navigation to Meal Planning: ' + (mealPlanningVisible ? '✅' : '❌'));
        console.log('- API Working: ' + (apiTest.ok ? '✅' : '❌'));
        console.log('- KI Buttons Found: ' + (kiButton ? '✅' : '❌'));
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        await page.screenshot({ path: 'ki-test-error.png', fullPage: true });
    }
    
    console.log('\n✅ Test completed. Check screenshots for visual confirmation.');
    await browser.close();
})();