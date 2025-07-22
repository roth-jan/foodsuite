// Realistic inventory management system for FoodSuite
const db = require('../database/db-memory');

// Realistic inventory data based on typical canteen operations
const realisticInventoryUpdates = {
    // High-volume staples (typically stocked in large quantities)
    staples: {
        "Kartoffeln festkochend": { stock: 180, min_stock: 50, max_stock: 300, consumption_rate: 15 },
        "Kartoffeln mehlig": { stock: 120, min_stock: 40, max_stock: 200, consumption_rate: 12 },
        "Zwiebeln": { stock: 45, min_stock: 20, max_stock: 80, consumption_rate: 8 },
        "Möhren": { stock: 65, min_stock: 25, max_stock: 100, consumption_rate: 10 },
        "Reis Basmati": { stock: 25, min_stock: 10, max_stock: 50, consumption_rate: 3 },
        "Nudeln Penne": { stock: 30, min_stock: 15, max_stock: 60, consumption_rate: 5 }
    },
    
    // Proteins (medium stock levels, higher turnover)
    proteins: {
        "Rindfleisch Gulasch": { stock: 15, min_stock: 8, max_stock: 30, consumption_rate: 8, perishable: true },
        "Hähnchenbrust": { stock: 25, min_stock: 12, max_stock: 40, consumption_rate: 12, perishable: true },
        "Schweineschnitzel": { stock: 20, min_stock: 10, max_stock: 35, consumption_rate: 10, perishable: true },
        "Eier": { stock: 120, min_stock: 60, max_stock: 200, consumption_rate: 25 }
    },
    
    // Dairy products (low stock, high turnover)
    dairy: {
        "Milch 3.5%": { stock: 45, min_stock: 20, max_stock: 80, consumption_rate: 15, perishable: true },
        "Butter": { stock: 12, min_stock: 6, max_stock: 25, consumption_rate: 4, perishable: true }
    }
};

// Update inventory function
function updateRealisticInventory() {
    console.log('🏪 Aktualisiere realistischen Lagerbestand...');
    
    const products = db.data.products;
    let updated = 0;
    
    if (!products || products.length === 0) {
        console.log('⚠️  Keine Produkte in der Datenbank gefunden');
        return {
            success: false,
            products_updated: 0,
            message: 'Keine Produkte gefunden - starte Server zuerst'
        };
    }
    
    // Update each product with realistic stock levels
    products.forEach((product, index) => {
        const productName = product.name;
        
        // Find matching realistic data
        let categoryData = null;
        
        for (const [category, items] of Object.entries(realisticInventoryUpdates)) {
            if (items[productName]) {
                categoryData = items[productName];
                break;
            }
        }
        
        if (categoryData) {
            // Update with realistic values
            const variation = 0.8 + Math.random() * 0.4; // ±20% variation
            const newStock = Math.max(1, Math.round(categoryData.stock * variation));
            
            products[index] = {
                ...product,
                stock: newStock,
                min_stock: categoryData.min_stock,
                max_stock: categoryData.max_stock,
                consumption_rate_per_day: categoryData.consumption_rate,
                is_perishable: categoryData.perishable || false,
                last_updated: new Date().toISOString()
            };
            
            updated++;
            console.log(`   ✅ ${productName}: ${newStock} ${product.unit}`);
        }
    });
    
    console.log(`🎯 Lagerbestand aktualisiert: ${updated} Produkte`);
    
    return {
        success: true,
        products_updated: updated,
        message: 'Realistischer Lagerbestand wurde erfolgreich aktualisiert'
    };
}

// Generate inventory alerts
function generateInventoryAlerts(products) {
    const alerts = [];
    const criticalItems = [];
    const lowStockItems = [];
    
    products.forEach(product => {
        if (product.stock <= 0) {
            criticalItems.push({
                id: product.id,
                name: product.name,
                status: 'OUT_OF_STOCK',
                message: `${product.name} ist nicht mehr vorrätig!`,
                priority: 'critical'
            });
        } else if (product.stock <= product.min_stock) {
            criticalItems.push({
                id: product.id,
                name: product.name,
                status: 'CRITICAL_LOW',
                message: `${product.name}: Nur noch ${product.stock} ${product.unit} vorrätig`,
                priority: 'high'
            });
        } else if (product.stock <= product.min_stock * 1.5) {
            lowStockItems.push({
                id: product.id,
                name: product.name,
                status: 'LOW_STOCK',
                message: `${product.name}: Vorrat wird knapp (${product.stock}/${product.max_stock})`,
                priority: 'medium'
            });
        }
    });
    
    return {
        critical: criticalItems,
        low: lowStockItems,
        total_alerts: criticalItems.length + lowStockItems.length,
        last_updated: new Date().toISOString()
    };
}

// Export functions for use in other modules
module.exports = {
    updateRealisticInventory,
    generateInventoryAlerts,
    realisticInventoryUpdates
};

// Run update if called directly
if (require.main === module) {
    updateRealisticInventory();
}