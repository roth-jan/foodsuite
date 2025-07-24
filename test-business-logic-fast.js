const { chromium } = require('playwright');
const fs = require('fs');

async function runBusinessLogicTests() {
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();
    
    const testResults = {
        timestamp: new Date().toISOString(),
        total: 0,
        passed: 0,
        failed: 0,
        errors: [],
        businessLogicIssues: [],
        validationIssues: [],
        apiIssues: []
    };
    
    console.log('🚀 Starting Fast Business Logic Tests\n');
    
    try {
        await page.goto('http://localhost:3003');
        await page.waitForLoadState('domcontentloaded');
        
        // Test 1: Product Management CRUD
        console.log('📋 Test 1: Product Management');
        await testProductCRUD(page, testResults);
        
        // Test 2: Inventory Stock Calculations
        console.log('📋 Test 2: Inventory Stock Logic');
        await testInventoryLogic(page, testResults);
        
        // Test 3: Recipe Cost Calculations
        console.log('📋 Test 3: Recipe Cost Calculations');
        await testRecipeCosts(page, testResults);
        
        // Test 4: AI Meal Planning Rules
        console.log('📋 Test 4: AI Meal Planning');
        await testAIPlanning(page, testResults);
        
        // Test 5: Multi-Tenant Data Isolation
        console.log('📋 Test 5: Multi-Tenant Isolation');
        await testTenantIsolation(page, testResults);
        
        // Test 6: Form Validations
        console.log('📋 Test 6: Form Validations');
        await testFormValidations(page, testResults);
        
        // Test 7: API Endpoints
        console.log('📋 Test 7: API Endpoints');
        await testAPIEndpoints(page, testResults);
        
    } catch (error) {
        console.error('❌ Critical error:', error);
        testResults.errors.push({ test: 'main', error: error.message });
    } finally {
        await browser.close();
        generateReport(testResults);
    }
}

async function testProductCRUD(page, results) {
    results.total++;
    try {
        // Navigate to products
        await page.click('a[data-tab="products"]');
        await page.waitForSelector('#productsTable', { timeout: 5000 });
        
        // Test: Check if products load
        const productCount = await page.locator('#productsTable tbody tr').count();
        if (productCount === 0) {
            throw new Error('No products loaded');
        }
        
        // Test: Product filtering
        await page.fill('#productSearch', 'Tomate');
        await page.waitForTimeout(500);
        const filteredCount = await page.locator('#productsTable tbody tr:visible').count();
        if (filteredCount === productCount) {
            results.businessLogicIssues.push('Product search filter not working');
        }
        
        console.log(`  ✅ Products loaded: ${productCount} items`);
        results.passed++;
    } catch (error) {
        console.log(`  ❌ Product test failed: ${error.message}`);
        results.failed++;
        results.errors.push({ test: 'products', error: error.message });
    }
}

async function testInventoryLogic(page, results) {
    results.total++;
    try {
        // Test via API for faster results
        const inventoryData = await page.evaluate(async () => {
            const response = await fetch('/api/inventory', {
                headers: { 'x-tenant-id': 'demo' }
            });
            return await response.json();
        });
        
        if (!inventoryData.success) {
            throw new Error('Inventory API failed');
        }
        
        // Check stock status logic
        let statusErrors = 0;
        inventoryData.data.forEach(item => {
            // Verify stock status calculation
            if (item.quantity === 0 && item.stock_status !== 'out_of_stock') {
                statusErrors++;
                results.businessLogicIssues.push(`Wrong status for ${item.product_name}: qty=0 but status=${item.stock_status}`);
            }
            if (item.quantity > 0 && item.quantity < item.min_stock && item.stock_status !== 'critical') {
                statusErrors++;
                results.businessLogicIssues.push(`Wrong status for ${item.product_name}: qty<min but status=${item.stock_status}`);
            }
        });
        
        if (statusErrors === 0) {
            console.log(`  ✅ Stock status calculations correct`);
            results.passed++;
        } else {
            console.log(`  ❌ Found ${statusErrors} stock status errors`);
            results.failed++;
        }
    } catch (error) {
        console.log(`  ❌ Inventory test failed: ${error.message}`);
        results.failed++;
        results.errors.push({ test: 'inventory', error: error.message });
    }
}

async function testRecipeCosts(page, results) {
    results.total++;
    try {
        const recipeData = await page.evaluate(async () => {
            const response = await fetch('/api/recipes', {
                headers: { 'x-tenant-id': 'demo' }
            });
            return await response.json();
        });
        
        // Check cost calculations
        let costIssues = 0;
        recipeData.data.forEach(recipe => {
            if (recipe.cost_per_portion === 0 && recipe.servings > 0) {
                costIssues++;
                results.businessLogicIssues.push(`Recipe "${recipe.name}" has 0 cost but ${recipe.servings} servings`);
            }
            if (recipe.cost_per_portion < 0) {
                costIssues++;
                results.validationIssues.push(`Recipe "${recipe.name}" has negative cost: ${recipe.cost_per_portion}`);
            }
        });
        
        if (costIssues === 0) {
            console.log(`  ✅ Recipe cost calculations valid`);
            results.passed++;
        } else {
            console.log(`  ⚠️  Found ${costIssues} recipe cost issues`);
            results.failed++;
        }
    } catch (error) {
        console.log(`  ❌ Recipe test failed: ${error.message}`);
        results.failed++;
        results.errors.push({ test: 'recipes', error: error.message });
    }
}

async function testAIPlanning(page, results) {
    results.total++;
    try {
        // Test AI meal suggestion API
        const aiResponse = await page.evaluate(async () => {
            const response = await fetch('/api/ai/suggest-meals', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-tenant-id': 'demo' 
                },
                body: JSON.stringify({
                    mode: 'cost_optimized',
                    weekNumber: 1,
                    year: 2024,
                    preferences: {}
                })
            });
            return await response.json();
        });
        
        if (!aiResponse.success) {
            throw new Error('AI API failed');
        }
        
        // Verify AI logic
        const meals = aiResponse.data.meals;
        let aiIssues = 0;
        
        // Check if cost optimization actually returns cheaper meals
        const avgCost = meals.reduce((sum, meal) => sum + meal.cost_per_portion, 0) / meals.length;
        if (avgCost > 3.0) { // Assuming cost optimized should be under 3€
            aiIssues++;
            results.businessLogicIssues.push(`Cost optimization not working: avg cost ${avgCost.toFixed(2)}€`);
        }
        
        // Check variety
        const uniqueMeals = new Set(meals.map(m => m.name)).size;
        if (uniqueMeals < meals.length * 0.7) {
            aiIssues++;
            results.businessLogicIssues.push(`Low variety: only ${uniqueMeals} unique meals out of ${meals.length}`);
        }
        
        if (aiIssues === 0) {
            console.log(`  ✅ AI planning logic working`);
            results.passed++;
        } else {
            console.log(`  ⚠️  Found ${aiIssues} AI logic issues`);
            results.failed++;
        }
    } catch (error) {
        console.log(`  ❌ AI planning test failed: ${error.message}`);
        results.failed++;
        results.errors.push({ test: 'ai-planning', error: error.message });
    }
}

async function testTenantIsolation(page, results) {
    results.total++;
    try {
        // Test with different tenant IDs
        const tenant1Data = await page.evaluate(async () => {
            const response = await fetch('/api/products', {
                headers: { 'x-tenant-id': 'demo' }
            });
            return await response.json();
        });
        
        const tenant2Data = await page.evaluate(async () => {
            const response = await fetch('/api/products', {
                headers: { 'x-tenant-id': 'test-tenant' }
            });
            return await response.json();
        });
        
        // Should get different data or filtered data
        const tenant1Ids = tenant1Data.data.map(p => p.id);
        const tenant2Ids = tenant2Data.data.map(p => p.id);
        
        // Check for data leakage
        const commonIds = tenant1Ids.filter(id => tenant2Ids.includes(id));
        if (commonIds.length > 0 && commonIds.length === tenant1Ids.length) {
            results.businessLogicIssues.push('No tenant isolation - all data shared between tenants');
        }
        
        console.log(`  ✅ Tenant isolation checked`);
        results.passed++;
    } catch (error) {
        console.log(`  ❌ Tenant isolation test failed: ${error.message}`);
        results.failed++;
        results.errors.push({ test: 'tenant-isolation', error: error.message });
    }
}

async function testFormValidations(page, results) {
    results.total++;
    try {
        // Test product form validation via API
        const invalidProduct = await page.evaluate(async () => {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-tenant-id': 'demo'
                },
                body: JSON.stringify({
                    name: '', // Empty name
                    price: -5, // Negative price
                    unit: '',
                    category: 'invalid_category'
                })
            });
            return { 
                status: response.status, 
                data: await response.json() 
            };
        });
        
        if (invalidProduct.status === 200 || invalidProduct.status === 201) {
            results.validationIssues.push('Product creation accepts invalid data');
            results.failed++;
        } else {
            console.log(`  ✅ Form validation working`);
            results.passed++;
        }
    } catch (error) {
        console.log(`  ❌ Validation test failed: ${error.message}`);
        results.failed++;
        results.errors.push({ test: 'validation', error: error.message });
    }
}

async function testAPIEndpoints(page, results) {
    const endpoints = [
        { path: '/api/products', method: 'GET' },
        { path: '/api/inventory', method: 'GET' },
        { path: '/api/recipes', method: 'GET' },
        { path: '/api/suppliers', method: 'GET' },
        { path: '/api/orders', method: 'GET' },
        { path: '/api/analytics/dashboard', method: 'GET' },
        { path: '/api/mealplans/current', method: 'GET' }
    ];
    
    for (const endpoint of endpoints) {
        results.total++;
        try {
            const response = await page.evaluate(async (ep) => {
                const res = await fetch(ep.path, {
                    method: ep.method,
                    headers: { 'x-tenant-id': 'demo' }
                });
                return { 
                    status: res.status, 
                    ok: res.ok,
                    data: await res.json()
                };
            }, endpoint);
            
            if (response.ok && response.data) {
                console.log(`  ✅ ${endpoint.path} - OK`);
                results.passed++;
            } else {
                console.log(`  ❌ ${endpoint.path} - Failed (${response.status})`);
                results.apiIssues.push(`${endpoint.path} returned ${response.status}`);
                results.failed++;
            }
        } catch (error) {
            console.log(`  ❌ ${endpoint.path} - Error: ${error.message}`);
            results.apiIssues.push(`${endpoint.path} error: ${error.message}`);
            results.failed++;
        }
    }
}

function generateReport(results) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 BUSINESS LOGIC TEST REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📈 Summary:`);
    console.log(`   Total Tests: ${results.total}`);
    console.log(`   ✅ Passed: ${results.passed} (${(results.passed/results.total*100).toFixed(1)}%)`);
    console.log(`   ❌ Failed: ${results.failed} (${(results.failed/results.total*100).toFixed(1)}%)`);
    
    if (results.businessLogicIssues.length > 0) {
        console.log(`\n🔧 Business Logic Issues (${results.businessLogicIssues.length}):`);
        results.businessLogicIssues.forEach(issue => {
            console.log(`   - ${issue}`);
        });
    }
    
    if (results.validationIssues.length > 0) {
        console.log(`\n⚠️  Validation Issues (${results.validationIssues.length}):`);
        results.validationIssues.forEach(issue => {
            console.log(`   - ${issue}`);
        });
    }
    
    if (results.apiIssues.length > 0) {
        console.log(`\n🌐 API Issues (${results.apiIssues.length}):`);
        results.apiIssues.forEach(issue => {
            console.log(`   - ${issue}`);
        });
    }
    
    if (results.errors.length > 0) {
        console.log(`\n❌ Test Errors:`);
        results.errors.forEach(err => {
            console.log(`   - ${err.test}: ${err.error}`);
        });
    }
    
    // Save detailed report
    const reportPath = `test-results/business-logic-${Date.now()}.json`;
    fs.mkdirSync('test-results', { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
    
    // Create summary for CI/CD
    const summary = {
        passed: results.passed === results.total,
        passRate: (results.passed/results.total*100).toFixed(1),
        criticalIssues: results.businessLogicIssues.length + results.validationIssues.length,
        timestamp: results.timestamp
    };
    fs.writeFileSync('test-results/summary.json', JSON.stringify(summary, null, 2));
}

// Run tests
runBusinessLogicTests().catch(console.error);