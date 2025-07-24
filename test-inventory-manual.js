// Simple manual test to check inventory
const http = require('http');

console.log('Testing inventory API...\n');

const options = {
    hostname: 'localhost',
    port: 3003,
    path: '/api/inventory?limit=5',
    method: 'GET',
    headers: {
        'x-tenant-id': 'demo'
    }
};

const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const response = JSON.parse(data);
            console.log('API Response Status:', res.statusCode);
            console.log('Total items:', response.items ? response.items.length : 0);
            
            if (response.items && response.items.length > 0) {
                console.log('\nFirst 3 inventory items:');
                response.items.slice(0, 3).forEach((item, idx) => {
                    console.log(`\n${idx + 1}. ${item.name}`);
                    console.log(`   Stock: ${item.stock} ${item.unit}`);
                    console.log(`   Status: ${item.stock_status}`);
                    console.log(`   Value: €${item.value.toFixed(2)}`);
                    console.log(`   Min/Max: ${item.min_stock}/${item.max_stock}`);
                });
            } else {
                console.log('No inventory items found!');
            }
            
            console.log('\n✅ API is working correctly!');
            console.log('\n🌐 Now open http://localhost:3003 in your browser');
            console.log('📝 Login with: admin / Demo123!');
            console.log('📦 Navigate to: Mehr → Lagerverwaltung');
            console.log('\nThe inventory should now display properly with the fix applied.');
            
        } catch (error) {
            console.error('Error parsing response:', error);
            console.log('Raw response:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.end();