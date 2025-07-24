const { chromium } = require('playwright');

async function findDeadButtons() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log('🔍 Searching for dead/placeholder buttons in FoodSuite...\n');
    
    await page.goto('http://localhost:3003');
    await page.waitForLoadState('networkidle');
    
    const deadButtons = [];
    const placeholderButtons = [];
    
    // Find all buttons and links with onclick handlers
    const elementsWithOnclick = await page.evaluate(() => {
        const elements = [...document.querySelectorAll('[onclick]')];
        return elements.map(el => ({
            tag: el.tagName,
            text: el.textContent.trim(),
            onclick: el.getAttribute('onclick'),
            class: el.className
        }));
    });
    
    // Check for placeholder patterns
    elementsWithOnclick.forEach(el => {
        if (el.onclick.includes('showToast') && 
            (el.onclick.includes('Coming Soon') || 
             el.onclick.includes('in Entwicklung') ||
             el.onclick.includes('🚧'))) {
            placeholderButtons.push(el);
        }
    });
    
    // Find all elements with data-action
    const elementsWithDataAction = await page.evaluate(() => {
        const elements = [...document.querySelectorAll('[data-action]')];
        const results = [];
        
        elements.forEach(el => {
            const action = el.getAttribute('data-action');
            const param = el.getAttribute('data-param') || el.getAttribute('data-modal');
            
            // Check if there's a corresponding event handler
            let hasHandler = false;
            
            // Common patterns for event delegation
            const commonHandlers = [
                'addEventListener',
                'handleAction',
                'delegateEvent',
                action, // direct function name
                'on' + action.charAt(0).toUpperCase() + action.slice(1) // onClick pattern
            ];
            
            // Check in global scope and common objects
            commonHandlers.forEach(handler => {
                if (window[handler] || 
                    (window.app && window.app[handler]) ||
                    (window.foodsuite && window.foodsuite[handler])) {
                    hasHandler = true;
                }
            });
            
            results.push({
                tag: el.tagName,
                text: el.textContent.trim(),
                action: action,
                param: param,
                hasHandler: hasHandler,
                visible: el.offsetParent !== null
            });
        });
        
        return results;
    });
    
    // Find potential dead buttons
    elementsWithDataAction.forEach(el => {
        if (!el.hasHandler && el.visible) {
            deadButtons.push(el);
        }
    });
    
    // Test some specific buttons by clicking
    const testButtons = [
        { selector: '[data-action="generateAIWeekMenu"]', name: 'AI Week Menu' },
        { selector: '[data-action="optimizeCurrentPlan"]', name: 'Optimize Plan' },
        { selector: '[data-action="runPriceComparison"]', name: 'Price Comparison' },
        { selector: '[data-action="exportAnalytics"]', name: 'Export Analytics' }
    ];
    
    console.log('🧪 Testing specific button functionality...\n');
    
    for (const btn of testButtons) {
        try {
            const exists = await page.locator(btn.selector).count() > 0;
            if (exists) {
                // Set up listeners
                let actionTriggered = false;
                
                page.on('console', () => actionTriggered = true);
                page.on('request', () => actionTriggered = true);
                page.on('dialog', () => actionTriggered = true);
                
                const originalUrl = page.url();
                
                await page.click(btn.selector);
                await page.waitForTimeout(1000);
                
                const newUrl = page.url();
                const hasModal = await page.locator('.modal.show').count() > 0;
                const hasToast = await page.locator('.toast.show').count() > 0;
                
                if (!actionTriggered && originalUrl === newUrl && !hasModal && !hasToast) {
                    console.log(`❌ ${btn.name}: No action triggered`);
                } else {
                    console.log(`✅ ${btn.name}: Working`);
                }
                
                page.removeAllListeners();
                
                // Close any modals
                if (hasModal) {
                    await page.keyboard.press('Escape');
                    await page.waitForTimeout(300);
                }
            }
        } catch (error) {
            console.log(`⚠️  ${btn.name}: ${error.message}`);
        }
    }
    
    // Generate report
    console.log('\n' + '='.repeat(60));
    console.log('📊 DEAD BUTTON ANALYSIS REPORT');
    console.log('='.repeat(60));
    
    if (placeholderButtons.length > 0) {
        console.log(`\n🚧 Placeholder/Coming Soon Buttons (${placeholderButtons.length}):`);
        placeholderButtons.forEach(btn => {
            console.log(`   - "${btn.text}" → ${btn.onclick}`);
        });
    }
    
    if (deadButtons.length > 0) {
        console.log(`\n⚠️  Potentially Dead Buttons (${deadButtons.length}):`);
        deadButtons.forEach(btn => {
            console.log(`   - "${btn.text}" [${btn.action}] ${btn.param ? `(${btn.param})` : ''}`);
        });
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`   Total elements with onclick: ${elementsWithOnclick.length}`);
    console.log(`   Total elements with data-action: ${elementsWithDataAction.length}`);
    console.log(`   Placeholder buttons: ${placeholderButtons.length}`);
    console.log(`   Potentially dead buttons: ${deadButtons.length}`);
    
    await browser.close();
}

findDeadButtons().catch(console.error);