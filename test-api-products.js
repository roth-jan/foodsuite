// Test products API
async function testProductsAPI() {
    try {
        console.log('📦 Testing products API...\n');
        
        const response = await fetch('http://localhost:3003/api/products?limit=5', {
            headers: {
                'x-tenant-id': 'demo'
            }
        });
        
        const data = await response.json();
        console.log('API Response:', JSON.stringify(data, null, 2));
        
        if (data.items && data.items.length > 0) {
            console.log('\nFirst product structure:');
            console.log(JSON.stringify(data.items[0], null, 2));
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

testProductsAPI();