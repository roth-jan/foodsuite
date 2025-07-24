const fetch = require('node-fetch');

async function testAIDebug() {
    console.log('🔍 Testing AI API with debug info...');
    
    try {
        const response = await fetch('https://foodsuite-1.onrender.com/api/ai/suggest-meals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': 'demo'
            },
            body: JSON.stringify({
                mode: 'balanced_nutrition',
                weekNumber: 1,
                servings: 4,
                days: 7
            })
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers.raw());
        
        const text = await response.text();
        console.log('Response body:', text);
        
        if (response.ok) {
            const data = JSON.parse(text);
            console.log('✅ Success! Generated meals:', Object.keys(data.mealPlan || {}).length);
        } else {
            console.log('❌ Error response');
        }
        
    } catch (error) {
        console.error('Request failed:', error);
    }
}

testAIDebug();