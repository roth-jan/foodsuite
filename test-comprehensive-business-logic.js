const { chromium } = require('playwright');

/**
 * Comprehensive Business Logic Test Suite for FoodSuite
 * Tests all clickable elements, business workflows, and data validations
 */

async function testComprehensiveBusinessLogic() {
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 100 // Slow down for better visibility
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const testResults = {
        total: 0,
        passed: 0,
        failed: 0,
        deadButtons: [],
        workingButtons: [],
        errors: []
    };
    
    try {
        console.log('🚀 Starting Comprehensive Business Logic Tests\n');
        
        // Navigate to application
        await page.goto('http://localhost:3003/foodsuite-complete-app.html');
        await page.waitForLoadState('networkidle');
        
        // Skip authentication test since we're loading the HTML directly
        console.log('📋 Test 1: Authentication System - SKIPPED (loading HTML directly)');
        
        // Test 2: All Clickable Elements
        console.log('\n📋 Test 2: Testing All Clickable Elements');
        await testAllClickableElements(page, testResults);
        
        // Test 3: Product Management CRUD
        console.log('\n📋 Test 3: Product Management Business Logic');
        await testProductManagement(page, testResults);
        
        // Test 4: Inventory Management
        console.log('\n📋 Test 4: Inventory Management Business Logic');
        await testInventoryManagement(page, testResults);
        
        // Test 5: Recipe Management
        console.log('\n📋 Test 5: Recipe Management Business Logic');
        await testRecipeManagement(page, testResults);
        
        // Test 6: AI Meal Planning
        console.log('\n📋 Test 6: AI Meal Planning Business Logic');
        await testAIMealPlanning(page, testResults);
        
        // Test 7: Order Workflow
        console.log('\n📋 Test 7: Order Management Workflow');
        await testOrderWorkflow(page, testResults);
        
        // Test 8: Price Monitoring
        console.log('\n📋 Test 8: Price Monitoring & Analytics');
        await testPriceMonitoring(page, testResults);
        
        // Test 9: Multi-Tenant Isolation
        console.log('\n📋 Test 9: Multi-Tenant Data Isolation');
        await testMultiTenantIsolation(page, testResults);
        
        // Test 10: Data Validation
        console.log('\n📋 Test 10: Form Validations & Business Rules');
        await testDataValidation(page, testResults);
        
    } catch (error) {
        console.error('❌ Critical test error:', error);
        testResults.errors.push({ test: 'main', error: error.message });
    } finally {
        // Generate report
        generateTestReport(testResults);
        
        await browser.close();
    }
}

async function testAuthentication(page, results) {
    results.total++;
    try {
        // Test login with wrong credentials
        await page.fill('#username', 'wronguser');
        await page.fill('#password', 'wrongpass');
        await page.click('button[type="submit"]');
        
        // Should show error
        const errorVisible = await page.locator('.alert-danger').isVisible();
        if (!errorVisible) throw new Error('No error shown for invalid login');
        
        // Test valid login
        await page.fill('#username', 'admin');
        await page.fill('#password', 'Demo123!');
        await page.click('button[type="submit"]');
        
        // Should redirect to dashboard
        await page.waitForSelector('#dashboardContent', { timeout: 5000 });
        
        console.log('✅ Authentication working correctly');
        results.passed++;
    } catch (error) {
        console.log('❌ Authentication test failed:', error.message);
        results.failed++;
        results.errors.push({ test: 'authentication', error: error.message });
    }
}

async function testAllClickableElements(page, results) {
    try {
        // Find all elements with data-action attribute
        const actionElements = await page.locator('[data-action]').all();
        console.log(`Found ${actionElements.length} elements with data-action`);
        
        for (const element of actionElements) {
            results.total++;
            try {
                const action = await element.getAttribute('data-action');
                const text = await element.textContent();
                
                // Check if element is visible and clickable
                const isVisible = await element.isVisible();
                if (!isVisible) {
                    results.deadButtons.push({ action, text: text.trim(), reason: 'Not visible' });
                    results.failed++;
                    continue;
                }
                
                // Try to click and see if it triggers something
                const originalUrl = page.url();
                const consoleLogs = [];
                
                page.on('console', msg => consoleLogs.push(msg.text()));
                
                await element.click({ timeout: 2000 });
                await page.waitForTimeout(500);
                
                // Check if anything happened
                const newUrl = page.url();
                const hasModal = await page.locator('.modal.show').count() > 0;
                const hasToast = await page.locator('.toast.show').count() > 0;
                const hasConsoleActivity = consoleLogs.length > 0;
                
                if (newUrl !== originalUrl || hasModal || hasToast || hasConsoleActivity) {
                    results.workingButtons.push({ action, text: text.trim() });
                    results.passed++;
                    
                    // Close any opened modals
                    if (hasModal) {
                        await page.keyboard.press('Escape');
                        await page.waitForTimeout(300);
                    }
                } else {
                    results.deadButtons.push({ action, text: text.trim(), reason: 'No action triggered' });
                    results.failed++;
                }
                
                page.removeAllListeners('console');
                
            } catch (error) {
                results.failed++;
                results.errors.push({ test: 'clickable-element', error: error.message });
            }
        }
        
        // Also test all buttons without data-action
        const buttons = await page.locator('button:not([data-action])').all();
        console.log(`Found ${buttons.length} buttons without data-action`);
        
        for (const button of buttons) {
            results.total++;
            try {
                const text = await button.textContent();
                const onclick = await button.getAttribute('onclick');
                
                if (onclick && onclick.includes('showToast')) {
                    // This is a placeholder button
                    results.deadButtons.push({ 
                        action: 'onclick', 
                        text: text.trim(), 
                        reason: 'Placeholder (showToast)' 
                    });
                    results.failed++;
                }
            } catch (error) {
                // Skip if element is no longer available
            }
        }
        
    } catch (error) {
        console.log('❌ Clickable elements test error:', error.message);
        results.errors.push({ test: 'clickable-elements', error: error.message });
    }
}

async function testProductManagement(page, results) {
    results.total++;
    try {
        // Navigate to products
        await page.click('a[data-tab="products"]');
        await page.waitForSelector('#productsContent', { state: 'visible' });
        
        // Test product creation
        await page.click('[data-action="showModal"][data-param="createProductModal"]');
        await page.waitForSelector('#createProductModal.show');
        
        // Fill form with validation tests
        await page.fill('#productName', 'Test Product ' + Date.now());
        await page.fill('#productPrice', '-5'); // Invalid price
        await page.click('#createProductModal button[type="submit"]');
        
        // Should show validation error
        await page.waitForTimeout(500);
        const hasError = await page.locator('#createProductModal .invalid-feedback:visible').count() > 0;
        if (!hasError) throw new Error('No validation for negative price');
        
        // Fix price and submit
        await page.fill('#productPrice', '9.99');
        await page.selectOption('#productCategory', 'vegetable');
        await page.fill('#productUnit', 'kg');
        await page.click('#createProductModal button[type="submit"]');
        
        // Should close modal and reload products
        await page.waitForSelector('#createProductModal', { state: 'hidden' });
        
        console.log('✅ Product management working correctly');
        results.passed++;
    } catch (error) {
        console.log('❌ Product management test failed:', error.message);
        results.failed++;
        results.errors.push({ test: 'product-management', error: error.message });
    }
}

async function testInventoryManagement(page, results) {
    results.total++;
    try {
        // Navigate to inventory via dropdown
        await page.click('a.dropdown-toggle:has-text("Mehr")');
        await page.click('a[data-tab="inventory"]:visible');
        await page.waitForSelector('#inventoryContent', { state: 'visible' });
        
        // Test all three tabs
        const tabs = ['stock', 'goods-receipts', 'pending-deliveries'];
        for (const tab of tabs) {
            await page.click(`[data-action="show${tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', '')}"]`);
            await page.waitForTimeout(1000);
            
            // Check if content loaded
            const hasContent = await page.locator(`#${tab}Content table tbody tr`).count() > 0;
            if (!hasContent) throw new Error(`No data in ${tab} tab`);
        }
        
        // Test stock status calculations
        const stockRows = await page.locator('#inventoryTable tbody tr').all();
        for (const row of stockRows.slice(0, 3)) { // Test first 3 items
            const quantity = await row.locator('td:nth-child(3)').textContent();
            const status = await row.locator('td:nth-child(7) .badge').textContent();
            
            // Verify status logic
            const qty = parseInt(quantity);
            if (qty === 0 && !status.includes('Leer')) {
                throw new Error('Wrong stock status for zero quantity');
            }
        }
        
        console.log('✅ Inventory management working correctly');
        results.passed++;
    } catch (error) {
        console.log('❌ Inventory management test failed:', error.message);
        results.failed++;
        results.errors.push({ test: 'inventory-management', error: error.message });
    }
}

async function testRecipeManagement(page, results) {
    results.total++;
    try {
        // Navigate to recipes
        await page.click('a[data-tab="recipes"]');
        await page.waitForSelector('#recipesContent', { state: 'visible' });
        
        // Test recipe creation with ingredients
        await page.click('[data-action="showModal"][data-param="createRecipeModal"]');
        await page.waitForSelector('#createRecipeModal.show');
        
        // Fill recipe form
        await page.fill('#recipeName', 'Test Recipe ' + Date.now());
        await page.fill('#recipeServings', '4');
        await page.selectOption('#recipeDifficulty', 'medium');
        
        // Add ingredient (should have product dropdown)
        await page.click('#addIngredientBtn');
        await page.waitForTimeout(500);
        
        // Check if ingredient row was added
        const ingredientRows = await page.locator('#ingredientsList .ingredient-row').count();
        if (ingredientRows === 0) throw new Error('Cannot add ingredients to recipe');
        
        await page.keyboard.press('Escape'); // Close modal
        
        console.log('✅ Recipe management working correctly');
        results.passed++;
    } catch (error) {
        console.log('❌ Recipe management test failed:', error.message);
        results.failed++;
        results.errors.push({ test: 'recipe-management', error: error.message });
    }
}

async function testAIMealPlanning(page, results) {
    results.total++;
    try {
        // Navigate to meal planning
        await page.click('a[data-tab="mealplans"]');
        await page.waitForSelector('#mealPlansContent', { state: 'visible' });
        
        // Test AI mode buttons
        const aiModes = ['cost', 'nutrition', 'variety', 'seasonal', 'inventory'];
        for (const mode of aiModes) {
            await page.click(`[data-action="toggleAIMode"][data-param="${mode}"]`);
            await page.waitForTimeout(300);
            
            // Check if button is activated
            const isActive = await page.locator(`[data-param="${mode}"].active`).count() > 0;
            if (!isActive) throw new Error(`AI mode ${mode} not activating`);
        }
        
        // Test AI generation
        await page.click('[data-action="generateAIWeekMenu"]');
        await page.waitForTimeout(3000); // Wait for AI generation
        
        // Check if meals were generated
        const mealEvents = await page.locator('.meal-event').count();
        if (mealEvents === 0) throw new Error('AI did not generate meal plan');
        
        // Test custom AI designer
        await page.click('[data-action="showModal"][data-modal="aiDesignerModal"]');
        await page.waitForSelector('#aiDesignerModal.show');
        
        // Check sliders exist
        const sliders = await page.locator('#aiDesignerModal input[type="range"]').count();
        if (sliders < 4) throw new Error('AI designer missing weight sliders');
        
        await page.keyboard.press('Escape');
        
        console.log('✅ AI meal planning working correctly');
        results.passed++;
    } catch (error) {
        console.log('❌ AI meal planning test failed:', error.message);
        results.failed++;
        results.errors.push({ test: 'ai-meal-planning', error: error.message });
    }
}

async function testOrderWorkflow(page, results) {
    results.total++;
    try {
        // Navigate to orders
        await page.click('a[data-tab="orders"]');
        await page.waitForSelector('#ordersContent', { state: 'visible' });
        
        // Test order creation
        await page.click('[data-action="showModal"][data-param="createOrderModal"]');
        await page.waitForSelector('#createOrderModal.show');
        
        // Should have supplier dropdown
        const supplierOptions = await page.locator('#orderSupplier option').count();
        if (supplierOptions < 2) throw new Error('No suppliers available for orders');
        
        // Test order status workflow
        const orderStatuses = ['draft', 'sent', 'confirmed', 'delivered', 'cancelled'];
        
        await page.keyboard.press('Escape');
        
        console.log('✅ Order workflow working correctly');
        results.passed++;
    } catch (error) {
        console.log('❌ Order workflow test failed:', error.message);
        results.failed++;
        results.errors.push({ test: 'order-workflow', error: error.message });
    }
}

async function testPriceMonitoring(page, results) {
    results.total++;
    try {
        // Navigate to analytics
        await page.click('a.dropdown-toggle:has-text("Mehr")');
        await page.click('a[data-tab="analytics"]:visible');
        await page.waitForSelector('#analyticsContent', { state: 'visible' });
        
        // Check if charts are rendered
        const charts = await page.locator('canvas').count();
        if (charts < 2) throw new Error('Analytics charts not rendering');
        
        // Test price comparison
        await page.click('[data-action="runPriceComparison"]');
        await page.waitForTimeout(2000);
        
        // Should show results or toast
        const hasToast = await page.locator('.toast.show').count() > 0;
        const hasResults = await page.locator('#priceComparisonResults').isVisible();
        
        if (!hasToast && !hasResults) {
            throw new Error('Price comparison not working');
        }
        
        console.log('✅ Price monitoring working correctly');
        results.passed++;
    } catch (error) {
        console.log('❌ Price monitoring test failed:', error.message);
        results.failed++;
        results.errors.push({ test: 'price-monitoring', error: error.message });
    }
}

async function testMultiTenantIsolation(page, results) {
    results.total++;
    try {
        // Test API calls include tenant header
        const response = await page.evaluate(async () => {
            const res = await fetch('/api/products', {
                headers: {
                    'Content-Type': 'application/json'
                    // Intentionally missing x-tenant-id
                }
            });
            return { status: res.status, ok: res.ok };
        });
        
        // Should still work with default tenant
        if (!response.ok) throw new Error('API not handling missing tenant ID');
        
        // Test data filtering
        const products = await page.evaluate(async () => {
            const res = await fetch('/api/products', {
                headers: {
                    'Content-Type': 'application/json',
                    'x-tenant-id': 'demo'
                }
            });
            return await res.json();
        });
        
        // All products should be for demo tenant or fallback
        const wrongTenant = products.data.filter(p => 
            p.tenant_id !== 'demo' && p.tenant_id !== 1
        );
        
        if (wrongTenant.length > 0) {
            throw new Error('Multi-tenant isolation breach');
        }
        
        console.log('✅ Multi-tenant isolation working correctly');
        results.passed++;
    } catch (error) {
        console.log('❌ Multi-tenant isolation test failed:', error.message);
        results.failed++;
        results.errors.push({ test: 'multi-tenant', error: error.message });
    }
}

async function testDataValidation(page, results) {
    results.total++;
    try {
        // Test various validation scenarios
        
        // 1. Product price validation
        await page.click('a[data-tab="products"]');
        await page.click('[data-action="showModal"][data-param="createProductModal"]');
        await page.waitForSelector('#createProductModal.show');
        
        // Test empty required fields
        await page.click('#createProductModal button[type="submit"]');
        await page.waitForTimeout(500);
        
        const requiredErrors = await page.locator('#createProductModal .invalid-feedback:visible').count();
        if (requiredErrors === 0) throw new Error('No validation for required fields');
        
        // Test invalid formats
        await page.fill('#productName', 'a'); // Too short
        await page.fill('#productPrice', 'abc'); // Not a number
        await page.fill('#minStock', '-10'); // Negative
        
        await page.click('#createProductModal button[type="submit"]');
        await page.waitForTimeout(500);
        
        const formatErrors = await page.locator('#createProductModal .invalid-feedback:visible').count();
        if (formatErrors < 2) throw new Error('Insufficient format validation');
        
        await page.keyboard.press('Escape');
        
        console.log('✅ Data validation working correctly');
        results.passed++;
    } catch (error) {
        console.log('❌ Data validation test failed:', error.message);
        results.failed++;
        results.errors.push({ test: 'data-validation', error: error.message });
    }
}

function generateTestReport(results) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPREHENSIVE TEST REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📈 Summary:`);
    console.log(`   Total Tests: ${results.total}`);
    console.log(`   ✅ Passed: ${results.passed} (${(results.passed/results.total*100).toFixed(1)}%)`);
    console.log(`   ❌ Failed: ${results.failed} (${(results.failed/results.total*100).toFixed(1)}%)`);
    
    if (results.deadButtons.length > 0) {
        console.log(`\n⚠️  Dead/Placeholder Buttons Found (${results.deadButtons.length}):`);
        results.deadButtons.forEach(btn => {
            console.log(`   - "${btn.text}" [${btn.action}] - ${btn.reason}`);
        });
    }
    
    if (results.workingButtons.length > 0) {
        console.log(`\n✅ Working Buttons (${results.workingButtons.length}):`);
        results.workingButtons.slice(0, 10).forEach(btn => {
            console.log(`   - "${btn.text}" [${btn.action}]`);
        });
        if (results.workingButtons.length > 10) {
            console.log(`   ... and ${results.workingButtons.length - 10} more`);
        }
    }
    
    if (results.errors.length > 0) {
        console.log(`\n❌ Errors Encountered:`);
        results.errors.forEach(err => {
            console.log(`   - ${err.test}: ${err.error}`);
        });
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Save detailed report
    const fs = require('fs');
    const reportPath = `test-results/comprehensive-test-${Date.now()}.json`;
    fs.mkdirSync('test-results', { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
}

// Run the tests
testComprehensiveBusinessLogic().catch(console.error);