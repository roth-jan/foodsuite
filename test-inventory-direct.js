// Direct test of inventory functionality
const { getDatabase } = require('./database/db-memory');
const { updateRealisticInventory } = require('./scripts/update-realistic-inventory');

async function testInventoryDirect() {
    console.log('📦 Direct inventory test...\n');
    
    // First ensure demo tenant exists
    const db = getDatabase();
    if (!db.tenants || db.tenants.length === 0) {
        db.tenants = [{
            id: 1,
            tenant_key: 'demo',
            name: 'Demo Tenant',
            created_at: new Date().toISOString()
        }];
        console.log('✅ Created demo tenant');
    }
    
    // Check current products
    console.log(`Current products in database: ${db.products.length}`);
    
    // Update inventory with realistic values
    const result = updateRealisticInventory();
    console.log('\nUpdate result:', result);
    
    // Show some sample products
    console.log('\n📊 Sample inventory items:');
    db.products.slice(0, 10).forEach(product => {
        console.log(`- ${product.name}: ${product.stock} ${product.unit} (min: ${product.min_stock}, max: ${product.max_stock})`);
    });
}

testInventoryDirect();