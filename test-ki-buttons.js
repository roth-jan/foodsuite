const http = require('http');

console.log('🧪 Testing all AI functions in FoodSuite...\n');

// Test 1: Generate AI meal plan
async function testGenerateAIMealPlan() {
    console.log('1️⃣ Testing KI-Plan erstellen (generateAIWeekMenu)...');
    
    const data = JSON.stringify({
        mode: 'cost_optimized',
        weekNumber: 1,
        currentPlan: {}
    });
    
    return new Promise((resolve) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3003,
            path: '/api/ai/suggest-meals',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': 'demo',
                'Content-Length': data.length
            }
        }, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    if (res.statusCode === 200 && result.mealPlan) {
                        console.log(`✅ KI-Plan erstellen works! Generated ${Object.keys(result.mealPlan).length} meals`);
                        console.log(`   Mode: ${result.mode}`);
                        console.log(`   Average cost: €${result.averageCostPerMeal || 'N/A'}`);
                    } else {
                        console.log(`❌ KI-Plan erstellen failed: ${res.statusCode}`);
                    }
                } catch (e) {
                    console.log(`❌ KI-Plan erstellen error: ${e.message}`);
                }
                resolve();
            });
        });
        
        req.on('error', (e) => {
            console.log(`❌ KI-Plan erstellen connection error: ${e.message}`);
            resolve();
        });
        
        req.write(data);
        req.end();
    });
}

// Test 2: Optimize current plan
async function testOptimizePlan() {
    console.log('\n2️⃣ Testing Plan optimieren (optimizeCurrentPlan)...');
    
    // First create a simple plan
    const currentPlan = {
        'monday-breakfast': { id: 1, name: 'Test Recipe 1' },
        'monday-lunch': { id: 2, name: 'Test Recipe 2' },
        'monday-dinner': { id: 3, name: 'Test Recipe 3' }
    };
    
    const data = JSON.stringify({
        mode: 'cost_optimized',
        currentPlan: currentPlan,
        weekNumber: 1
    });
    
    return new Promise((resolve) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3003,
            path: '/api/ai/optimize-plan',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': 'demo',
                'Content-Length': data.length
            }
        }, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    if (res.statusCode === 200 && result.mealPlan) {
                        console.log(`✅ Plan optimieren works!`);
                        console.log(`   Suggestions: ${result.suggestions ? result.suggestions.length : 0}`);
                        if (result.improvements) {
                            console.log(`   Cost reduction: ${result.improvements.costReduction}%`);
                        }
                    } else {
                        console.log(`❌ Plan optimieren failed: ${res.statusCode}`);
                    }
                } catch (e) {
                    console.log(`❌ Plan optimieren error: ${e.message}`);
                }
                resolve();
            });
        });
        
        req.on('error', (e) => {
            console.log(`❌ Plan optimieren connection error: ${e.message}`);
            resolve();
        });
        
        req.write(data);
        req.end();
    });
}

// Test 3: Custom AI mode
async function testCustomAIMode() {
    console.log('\n3️⃣ Testing Custom AI Mode (AI Designer)...');
    
    const customConfig = {
        name: 'Test Custom Mode',
        weights: {
            cost: 80,
            nutrition: 20,
            variety: 50,
            seasonal: 30,
            inventory: 40
        },
        exclusions: {
            ingredients: ['Schwein'],
            categories: [],
            allergens: []
        }
    };
    
    const data = JSON.stringify({
        mode: 'custom',
        weekNumber: 1,
        currentPlan: {},
        customConfig: customConfig
    });
    
    return new Promise((resolve) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3003,
            path: '/api/ai/suggest-meals',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': 'demo',
                'Content-Length': data.length
            }
        }, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    if (res.statusCode === 200 && result.mealPlan) {
                        console.log(`✅ Custom AI Mode works!`);
                        console.log(`   Generated ${Object.keys(result.mealPlan).length} meals`);
                        // Check if pork was excluded
                        let porkFound = false;
                        Object.values(result.mealPlan).forEach(meal => {
                            if (meal.name && meal.name.toLowerCase().includes('schwein')) {
                                porkFound = true;
                            }
                        });
                        console.log(`   Pork exclusion: ${porkFound ? '❌ Failed' : '✅ Success'}`);
                    } else {
                        console.log(`❌ Custom AI Mode failed: ${res.statusCode}`);
                    }
                } catch (e) {
                    console.log(`❌ Custom AI Mode error: ${e.message}`);
                }
                resolve();
            });
        });
        
        req.on('error', (e) => {
            console.log(`❌ Custom AI Mode connection error: ${e.message}`);
            resolve();
        });
        
        req.write(data);
        req.end();
    });
}

// Test 4: Different AI modes
async function testAllAIModes() {
    console.log('\n4️⃣ Testing all AI modes...');
    
    const modes = [
        'cost_optimized',
        'balanced_nutrition',
        'variety',
        'seasonal',
        'inventory_based'
    ];
    
    for (const mode of modes) {
        await new Promise((resolve) => {
            const data = JSON.stringify({
                mode: mode,
                weekNumber: 1,
                currentPlan: {}
            });
            
            const req = http.request({
                hostname: 'localhost',
                port: 3003,
                path: '/api/ai/suggest-meals',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-tenant-id': 'demo',
                    'Content-Length': data.length
                }
            }, (res) => {
                let responseData = '';
                res.on('data', chunk => responseData += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        console.log(`   ✅ ${mode} mode works`);
                    } else {
                        console.log(`   ❌ ${mode} mode failed`);
                    }
                    resolve();
                });
            });
            
            req.on('error', () => {
                console.log(`   ❌ ${mode} mode error`);
                resolve();
            });
            
            req.write(data);
            req.end();
        });
    }
}

// Run all tests
async function runAllTests() {
    await testGenerateAIMealPlan();
    await testOptimizePlan();
    await testCustomAIMode();
    await testAllAIModes();
    
    console.log('\n✨ AI function tests complete!');
    
    console.log('\n📋 Summary of AI features:');
    console.log('- KI-Plan erstellen: Generates complete weekly meal plans');
    console.log('- Plan optimieren: Optimizes existing plans based on selected mode');
    console.log('- AI Designer: Creates custom AI modes with specific preferences');
    console.log('- Mode selection: 5 predefined modes (cost, nutrition, variety, seasonal, inventory)');
    console.log('- Einkaufsliste: Generates shopping lists from meal plans (frontend function)');
}

runAllTests();