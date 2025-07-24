// Test products directly from database
const db = require('./database/db-memory');

async function testProductsDirect() {
    console.log('🔍 Testing products directly from database...\n');
    
    // Initialize database
    await db.initialize();
    
    console.log(`Total products: ${db.data.products.length}`);
    console.log('\nFirst 10 products:');
    
    db.data.products.slice(0, 10).forEach((product, index) => {
        console.log(`${index + 1}. [ID: ${product.id}] ${product.name} - ${product.category} - ${product.unit}`);
    });
    
    // Check if names are supplier names
    console.log('\nChecking for supplier name contamination...');
    const suppliers = db.data.suppliers.map(s => s.name);
    console.log('Suppliers:', suppliers);
    
    const productsWithSupplierNames = db.data.products.filter(p => suppliers.includes(p.name));
    console.log(`\nProducts with supplier names: ${productsWithSupplierNames.length}`);
    
    if (productsWithSupplierNames.length > 0) {
        console.log('Sample contaminated products:');
        productsWithSupplierNames.slice(0, 5).forEach(p => {
            console.log(`- ${p.name} (ID: ${p.id})`);
        });
    }
}

testProductsDirect();