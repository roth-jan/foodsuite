const fetch = require('node-fetch');

async function testInventoryAPI() {
    console.log('🔍 Testing Inventory API endpoints...\n');
    
    try {
        // 1. Test inventory endpoint
        console.log('1️⃣ Testing GET /api/inventory:');
        const invResponse = await fetch('http://localhost:3003/api/inventory?limit=5', {
            headers: { 'x-tenant-id': 'demo' }
        });
        
        console.log(`   Status: ${invResponse.status} ${invResponse.statusText}`);
        
        if (invResponse.ok) {
            const data = await invResponse.json();
            console.log(`   Response has items: ${!!data.items}`);
            console.log(`   Total items: ${data.items?.length || 0}`);
            console.log(`   Pagination: Page ${data.pagination?.page} of ${data.pagination?.totalPages}`);
            
            if (data.items && data.items.length > 0) {
                console.log('\n   First 3 items:');
                data.items.slice(0, 3).forEach((item, i) => {
                    console.log(`\n   ${i+1}. ${item.name}`);
                    console.log(`      ID: ${item.id}`);
                    console.log(`      Stock: ${item.stock} ${item.unit}`);
                    console.log(`      Status: ${item.stock_status}`);
                    console.log(`      Value: €${item.value}`);
                    console.log(`      Location: ${item.storage_location}`);
                });
            }
        } else {
            const error = await invResponse.text();
            console.log(`   Error: ${error}`);
        }
        
        // 2. Test orders endpoint
        console.log('\n\n2️⃣ Testing GET /api/orders:');
        const ordResponse = await fetch('http://localhost:3003/api/orders?status=ordered&limit=5', {
            headers: { 'x-tenant-id': 'demo' }
        });
        
        console.log(`   Status: ${ordResponse.status} ${ordResponse.statusText}`);
        
        if (ordResponse.ok) {
            const ordData = await ordResponse.json();
            console.log(`   Total orders: ${ordData.items?.length || 0}`);
            
            if (ordData.items && ordData.items.length > 0) {
                console.log('\n   Orders with status "ordered":');
                ordData.items.forEach((order, i) => {
                    console.log(`   ${i+1}. Order #${order.orderNumber} - ${order.supplier?.name || 'Unknown'} - €${order.totalAmount}`);
                });
            } else {
                console.log('   No orders with status "ordered" found');
            }
        }
        
        // 3. Test if endpoints are accessible
        console.log('\n\n3️⃣ Testing endpoint accessibility:');
        const endpoints = [
            '/api/products',
            '/api/inventory', 
            '/api/orders',
            '/api/suppliers'
        ];
        
        for (const endpoint of endpoints) {
            const response = await fetch(`http://localhost:3003${endpoint}`, {
                headers: { 'x-tenant-id': 'demo' }
            });
            console.log(`   ${endpoint}: ${response.status} ${response.ok ? '✅' : '❌'}`);
        }
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

testInventoryAPI();