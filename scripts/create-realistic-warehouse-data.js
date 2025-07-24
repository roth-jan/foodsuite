// Script zum Erstellen realistischer Lagerdaten
const db = require('../database/db-memory');

console.log('📦 Erstelle realistische Lagerdaten...\n');

// Funktion zum Generieren realistischer Bestandsdaten
function updateInventoryWithRealisticData() {
    console.log('1️⃣ Aktualisiere Lagerbestände mit realistischen Werten...');
    
    const products = db.getProducts({ limit: 100 });
    let updated = 0;
    
    products.items.forEach(product => {
        // Realistische Bestandswerte basierend auf Produkttyp
        let stock, minStock, maxStock;
        
        // Kategoriebasierte Bestandslogik
        switch(product.category) {
            case 'Obst':
            case 'Gemüse':
                stock = Math.floor(Math.random() * 100) + 20; // 20-120
                minStock = 15;
                maxStock = 150;
                break;
            case 'Fleisch':
            case 'Fisch':
                stock = Math.floor(Math.random() * 50) + 10; // 10-60
                minStock = 10;
                maxStock = 80;
                break;
            case 'Milchprodukte':
                stock = Math.floor(Math.random() * 80) + 20; // 20-100
                minStock = 20;
                maxStock = 120;
                break;
            case 'Gewürze':
            case 'Backzutaten':
                stock = Math.floor(Math.random() * 30) + 5; // 5-35
                minStock = 5;
                maxStock = 50;
                break;
            case 'Getränke':
                stock = Math.floor(Math.random() * 200) + 50; // 50-250
                minStock = 30;
                maxStock = 300;
                break;
            default:
                stock = Math.floor(Math.random() * 60) + 15; // 15-75
                minStock = 10;
                maxStock = 100;
        }
        
        // Update Produkt
        db.updateProduct(product.id, {
            ...product,
            stock: stock,
            min_stock: minStock,
            max_stock: maxStock,
            storage_location: product.storage_location || `Lager ${Math.floor(Math.random() * 5) + 1}`,
            last_inventory_update: new Date().toISOString()
        });
        
        updated++;
    });
    
    console.log(`✅ ${updated} Produkte mit realistischen Beständen aktualisiert\n`);
}

// Funktion zum Erstellen von Wareneingangs-Daten
function createGoodsReceiptData() {
    console.log('2️⃣ Erstelle Wareneingangs-Historie...');
    
    const products = db.getProducts({ limit: 100 }).items;
    const suppliers = db.getSuppliers({ limit: 20 }).items;
    const receipts = [];
    
    // Erstelle 30 Wareneingänge der letzten 30 Tage
    for (let i = 0; i < 30; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        
        // Wähle zufällige Produkte (3-8 pro Wareneingang)
        const productCount = Math.floor(Math.random() * 6) + 3;
        const selectedProducts = [];
        
        for (let j = 0; j < productCount; j++) {
            const product = products[Math.floor(Math.random() * products.length)];
            const supplier = suppliers.find(s => 
                s.productCategories && s.productCategories.includes(product.category)
            ) || suppliers[0];
            
            selectedProducts.push({
                product_id: product.id,
                product_name: product.name,
                quantity: Math.floor(Math.random() * 50) + 10,
                unit: product.unit,
                supplier_id: supplier.id,
                supplier_name: supplier.name,
                unit_price: product.purchasePrice || product.sellingPrice * 0.6,
                total_price: 0 // wird berechnet
            });
        }
        
        // Berechne Gesamtpreise
        selectedProducts.forEach(item => {
            item.total_price = item.quantity * item.unit_price;
        });
        
        const receipt = {
            id: `gr_${Date.now()}_${i}`,
            receipt_number: `WE-2024-${String(1000 + i).padStart(4, '0')}`,
            date: date.toISOString(),
            items: selectedProducts,
            total_amount: selectedProducts.reduce((sum, item) => sum + item.total_price, 0),
            status: 'completed',
            notes: `Wareneingang vom ${date.toLocaleDateString('de-DE')}`,
            created_by: 'admin',
            tenant_id: 'demo'
        };
        
        receipts.push(receipt);
    }
    
    // Speichere Wareneingänge
    if (!db.data.goodsReceipts) {
        db.data.goodsReceipts = [];
    }
    db.data.goodsReceipts = receipts;
    
    console.log(`✅ ${receipts.length} Wareneingänge erstellt\n`);
    return receipts;
}

// Funktion zum Erstellen von erwarteten Lieferungen
function createPendingDeliveries() {
    console.log('3️⃣ Erstelle erwartete Lieferungen (offene Bestellungen)...');
    
    const orders = db.getOrders({ status: 'ordered' }).items || [];
    
    // Falls keine offenen Bestellungen existieren, erstelle welche
    if (orders.length < 10) {
        const products = db.getProducts({ limit: 100 }).items;
        const suppliers = db.getSuppliers({ limit: 20 }).items;
        
        for (let i = orders.length; i < 10; i++) {
            const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
            const deliveryDate = new Date();
            deliveryDate.setDate(deliveryDate.getDate() + Math.floor(Math.random() * 7) + 1);
            
            // Wähle Produkte für diese Bestellung
            const orderItems = [];
            const itemCount = Math.floor(Math.random() * 5) + 2;
            
            for (let j = 0; j < itemCount; j++) {
                const product = products[Math.floor(Math.random() * products.length)];
                
                // Prüfe ob Produkt nachbestellt werden sollte
                const needsReorder = product.stock < product.min_stock * 1.5;
                const orderQuantity = needsReorder ? 
                    (product.max_stock - product.stock) : 
                    Math.floor(Math.random() * 30) + 10;
                
                orderItems.push({
                    product_id: product.id,
                    product_name: product.name,
                    quantity: orderQuantity,
                    unit: product.unit,
                    unit_price: product.purchasePrice || product.sellingPrice * 0.6,
                    total_price: orderQuantity * (product.purchasePrice || product.sellingPrice * 0.6)
                });
            }
            
            const order = {
                id: `order_${Date.now()}_${i}`,
                orderNumber: `BST-2024-${String(2000 + i).padStart(4, '0')}`,
                supplier_id: supplier.id,
                supplier_name: supplier.name,
                items: orderItems,
                total_amount: orderItems.reduce((sum, item) => sum + item.total_price, 0),
                status: 'ordered',
                orderDate: new Date().toISOString(),
                expectedDelivery: deliveryDate.toISOString(),
                notes: `Lieferung erwartet am ${deliveryDate.toLocaleDateString('de-DE')}`,
                tenant_id: 'demo'
            };
            
            db.createOrder(order);
        }
    }
    
    const updatedOrders = db.getOrders({ status: 'ordered' }).items || [];
    console.log(`✅ ${updatedOrders.length} erwartete Lieferungen vorhanden\n`);
    return updatedOrders;
}

// Hauptfunktion
function createRealisticWarehouseData() {
    console.log('🚀 Starte Erstellung realistischer Lagerdaten...\n');
    
    try {
        // 1. Update Lagerbestände
        updateInventoryWithRealisticData();
        
        // 2. Erstelle Wareneingangs-Historie
        const receipts = createGoodsReceiptData();
        
        // 3. Erstelle erwartete Lieferungen
        const deliveries = createPendingDeliveries();
        
        // Zusammenfassung
        console.log('=' * 60);
        console.log('📊 ZUSAMMENFASSUNG:');
        console.log('=' * 60);
        console.log(`\n✅ Lagerbestände aktualisiert`);
        console.log(`✅ ${receipts.length} Wareneingänge erstellt`);
        console.log(`✅ ${deliveries.length} erwartete Lieferungen erstellt`);
        console.log('\n🎉 Alle Lagerdaten erfolgreich erstellt!');
        
        // Beispieldaten anzeigen
        console.log('\n📋 Beispiel-Lagerbestände:');
        const sampleProducts = db.getProducts({ limit: 5 }).items;
        sampleProducts.forEach(p => {
            console.log(`   - ${p.name}: ${p.stock} ${p.unit} (Min: ${p.min_stock}, Max: ${p.max_stock})`);
        });
        
        console.log('\n📦 Letzte Wareneingänge:');
        receipts.slice(0, 3).forEach(r => {
            console.log(`   - ${r.receipt_number}: ${r.items.length} Artikel, €${r.total_amount.toFixed(2)}`);
        });
        
        console.log('\n🚚 Nächste erwartete Lieferungen:');
        deliveries.slice(0, 3).forEach(d => {
            const deliveryDate = new Date(d.expectedDelivery);
            console.log(`   - ${d.orderNumber}: ${d.supplier_name}, erwartet am ${deliveryDate.toLocaleDateString('de-DE')}`);
        });
        
    } catch (error) {
        console.error('❌ Fehler beim Erstellen der Lagerdaten:', error);
    }
}

// Script ausführen
createRealisticWarehouseData();