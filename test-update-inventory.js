// Test script to update realistic inventory
const { updateRealisticInventory } = require('./scripts/update-realistic-inventory');

async function testUpdateInventory() {
    console.log('📦 Testing realistic inventory update...\n');
    
    try {
        // Make HTTP request to update inventory
        const response = await fetch('http://localhost:3003/api/inventory/update-realistic', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': 'demo'
            }
        });
        
        const result = await response.json();
        console.log('Update result:', result);
        
        // Now fetch inventory summary
        const summaryResponse = await fetch('http://localhost:3003/api/inventory/summary', {
            headers: {
                'x-tenant-id': 'demo'
            }
        });
        
        const summary = await summaryResponse.json();
        console.log('\n📊 Inventory Summary:');
        console.log(`- Total Products: ${summary.summary.total_products}`);
        console.log(`- Low Stock: ${summary.summary.low_stock_count}`);
        console.log(`- Out of Stock: ${summary.summary.out_of_stock_count}`);
        console.log(`- Total Value: €${summary.summary.total_value}`);
        
        // Test regular inventory endpoint
        const inventoryResponse = await fetch('http://localhost:3003/api/inventory?limit=10', {
            headers: {
                'x-tenant-id': 'demo'
            }
        });
        
        const inventory = await inventoryResponse.json();
        console.log(`\n📦 Sample Inventory Items (${inventory.items.length} of ${inventory.pagination.totalItems}):`);
        inventory.items.forEach(item => {
            console.log(`- ${item.name}: ${item.stock} ${item.unit} (${item.stock_status})`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testUpdateInventory();