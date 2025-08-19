// Simple test script to verify inventory alerts functionality
const fetch = require('node-fetch');

async function testInventoryAlerts() {
    console.log('>ê Testing Advanced Inventory Management...');
    
    const API_BASE = 'http://localhost:3003/api';
    const TENANT_ID = 'demo';
    
    try {
        // 1. Login
        console.log('1ã Login...');
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': TENANT_ID
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'Demo123!'
            })
        });
        
        const loginData = await loginResponse.json();
        const token = loginData.access_token || loginData.token;
        console.log(' Login successful');
        
        // 2. Get inventory alerts
        console.log('\n2ã Fetching inventory alerts...');
        const alertsResponse = await fetch(`${API_BASE}/inventory/alerts`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-tenant-id': TENANT_ID
            }
        });
        
        if (!alertsResponse.ok) {
            const error = await alertsResponse.text();
            throw new Error(`Failed to get alerts: ${error}`);
        }
        
        const alerts = await alertsResponse.json();
        console.log(' Alerts received:');
        console.log('   Critical alerts:', alerts.critical ? alerts.critical.length : 0);
        console.log('   Low stock alerts:', alerts.low ? alerts.low.length : 0);
        console.log('   Reorder alerts:', alerts.reorder ? alerts.reorder.length : 0);
        
        // 3. Get inventory summary
        console.log('\n3ã Fetching inventory summary...');
        const summaryResponse = await fetch(`${API_BASE}/inventory/summary`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-tenant-id': TENANT_ID
            }
        });
        
        if (!summaryResponse.ok) {
            throw new Error('Failed to get summary');
        }
        
        const summary = await summaryResponse.json();
        console.log(' Summary received:');
        console.log('   Out of stock:', summary.summary.out_of_stock_count);
        console.log('   Low stock:', summary.summary.low_stock_count);
        console.log('   Total value:', `¬${summary.summary.total_value}`);
        
        // 4. Get low stock products
        console.log('\n4ã Fetching low stock products...');
        const lowStockResponse = await fetch(`${API_BASE}/inventory/low-stock`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-tenant-id': TENANT_ID
            }
        });
        
        if (!lowStockResponse.ok) {
            throw new Error('Failed to get low stock products');
        }
        
        const lowStockProducts = await lowStockResponse.json();
        console.log(' Low stock products:', lowStockProducts.length);
        if (lowStockProducts.length > 0) {
            console.log('   First product:', lowStockProducts[0].name, 
                `(${lowStockProducts[0].stock}/${lowStockProducts[0].min_stock} ${lowStockProducts[0].unit})`);
        }
        
        // 5. Get reorder suggestions
        console.log('\n5ã Fetching reorder suggestions...');
        const reorderResponse = await fetch(`${API_BASE}/inventory/reorder-suggestions`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-tenant-id': TENANT_ID
            }
        });
        
        if (!reorderResponse.ok) {
            throw new Error('Failed to get reorder suggestions');
        }
        
        const reorderSuggestions = await reorderResponse.json();
        console.log(' Reorder suggestions:', reorderSuggestions.length);
        if (reorderSuggestions.length > 0) {
            console.log('   First suggestion:', reorderSuggestions[0].product_name, 
                `- Order ${reorderSuggestions[0].suggested_quantity} ${reorderSuggestions[0].unit}`);
        }
        
        console.log('\n<‰ All inventory alert features working correctly!');
        console.log('   Open http://localhost:3003 and go to Lagerbestand to see the UI');
        
    } catch (error) {
        console.error('L Error:', error);
    }
}

testInventoryAlerts();