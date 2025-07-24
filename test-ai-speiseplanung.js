const { chromium } = require('playwright');

(async () => {
    console.log('🚀 Starting AI meal planning test...');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--disable-blink-features=AutomationControlled']
    });
    
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    try {
        // Navigate to the app
        console.log('📱 Opening FoodSuite...');
        await page.goto('http://localhost:3003');
        await page.waitForLoadState('networkidle');
        
        // Login
        console.log('🔐 Logging in...');
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'Demo123!');
        await page.click('button[type="submit"]');
        
        // Wait for dashboard
        await page.waitForSelector('.navbar', { timeout: 10000 });
        console.log('✅ Logged in successfully');
        
        // Navigate to meal planning
        console.log('📅 Navigating to meal planning...');
        await page.click('a[href="#mealplanning"]');
        await page.waitForSelector('#mealplanning', { visible: true });
        
        // Wait for the AI controls to be visible
        await page.waitForSelector('.ai-controls', { visible: true, timeout: 5000 });
        console.log('✅ Meal planning page loaded');
        
        // Select cost optimized mode
        console.log('🎯 Selecting cost optimized mode...');
        const modeSelector = await page.$('#aiModeSelect');
        if (modeSelector) {
            await modeSelector.selectOption('cost_optimized');
            console.log('✅ Selected cost_optimized mode');
        } else {
            console.log('⚠️ Mode selector not found');
        }
        
        // Clear console to see fresh errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('❌ Console error:', msg.text());
            }
        });
        
        // Monitor network for AI request
        page.on('response', response => {
            if (response.url().includes('/api/ai/suggest-meals')) {
                console.log(`📡 AI API Response: ${response.status()} ${response.statusText()}`);
                response.json().then(data => {
                    if (data.mealPlan) {
                        console.log('📊 Meal plan received with', Object.keys(data.mealPlan).length, 'meals');
                        console.log('💰 Average cost per meal:', data.averageCostPerMeal || 'N/A');
                        console.log('💰 Total cost:', data.totalCost || 'N/A');
                        
                        // Check first meal for cost details
                        const firstMealKey = Object.keys(data.mealPlan)[0];
                        if (firstMealKey && data.mealPlan[firstMealKey]) {
                            const firstMeal = data.mealPlan[firstMealKey];
                            console.log('🍽️ First meal:', firstMeal.name, '- Cost:', firstMeal.cost_per_portion);
                        }
                    }
                }).catch(err => console.error('Failed to parse response:', err));
            }
        });
        
        // Click AI generation button
        console.log('🤖 Clicking AI meal plan generation...');
        const aiButton = await page.$('button[data-action="generateAIWeekMenu"]');
        if (aiButton) {
            await aiButton.click();
            console.log('✅ Clicked AI generation button');
            
            // Wait for plan to be generated
            await page.waitForTimeout(3000);
            
            // Check if meals are displayed
            const mealEvents = await page.$$('.meal-event');
            console.log(`📋 Found ${mealEvents.length} meal events in calendar`);
            
            // Check cost summary
            const costSummary = await page.$('#costSummary');
            if (costSummary) {
                const costText = await costSummary.textContent();
                console.log('💰 Cost summary:', costText);
            }
            
            // Take screenshot
            await page.screenshot({ 
                path: 'ai-meal-plan-result.png',
                fullPage: true 
            });
            console.log('📸 Screenshot saved: ai-meal-plan-result.png');
            
        } else {
            console.log('❌ AI generation button not found');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        await page.screenshot({ path: 'ai-test-error.png' });
    }
    
    // Keep browser open for inspection
    console.log('⏸️ Test complete. Browser will remain open for inspection.');
    console.log('Press Ctrl+C to close.');
    
    // Keep the process running
    await new Promise(() => {});
})();