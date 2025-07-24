// Script zum Befüllen der Lagerdaten mit realistischen Werten
const db = require('../database/db-memory');

async function fillWarehouseData() {
    console.log('📦 Fülle Lager mit realistischen Daten...\n');
    
    try {
        // Initialisiere DB falls nötig
        await db.initialize();
        
        // 1. UPDATE LAGERBESTÄNDE
        console.log('1️⃣ Aktualisiere Produktbestände...');
        
        const products = db.data.products || [];
        let updatedCount = 0;
        
        products.forEach(product => {
            // Generiere realistische Bestandswerte basierend auf Kategorie
            let stock, minStock, maxStock;
            
            switch(product.category) {
                case 'Obst':
                case 'Gemüse':
                    stock = Math.floor(Math.random() * 80) + 20; // 20-100
                    minStock = 15;
                    maxStock = 120;
                    break;
                case 'Fleisch':
                case 'Fisch':
                    stock = Math.floor(Math.random() * 40) + 10; // 10-50
                    minStock = 10;
                    maxStock = 60;
                    break;
                case 'Milchprodukte':
                    stock = Math.floor(Math.random() * 60) + 20; // 20-80
                    minStock = 15;
                    maxStock = 100;
                    break;
                case 'Gewürze':
                case 'Backzutaten':
                    stock = Math.floor(Math.random() * 25) + 5; // 5-30
                    minStock = 5;
                    maxStock = 40;
                    break;
                case 'Getränke':
                    stock = Math.floor(Math.random() * 150) + 50; // 50-200
                    minStock = 30;
                    maxStock = 250;
                    break;
                default:
                    stock = Math.floor(Math.random() * 50) + 15; // 15-65
                    minStock = 10;
                    maxStock = 80;
            }
            
            // Aktualisiere Produkt direkt
            product.stock = stock;
            product.min_stock = minStock;
            product.max_stock = maxStock;
            product.storage_location = product.storage_location || `Lager ${Math.floor(Math.random() * 5) + 1}`;
            product.last_updated = new Date().toISOString();
            
            updatedCount++;
        });
        
        console.log(`✅ ${updatedCount} Produkte mit Beständen aktualisiert\n`);
        
        // 2. ERSTELLE WARENEINGANGS-HISTORIE
        console.log('2️⃣ Erstelle Wareneingangs-Historie...');
        
        const suppliers = db.data.suppliers || [];
        const goodsReceipts = [];
        
        // Erstelle 30 Wareneingänge für die letzten 30 Tage
        for (let i = 0; i < 30; i++) {
            const daysAgo = Math.floor(Math.random() * 30);
            const receiptDate = new Date();
            receiptDate.setDate(receiptDate.getDate() - daysAgo);
            
            // Wähle 3-8 zufällige Produkte
            const productCount = Math.floor(Math.random() * 6) + 3;
            const receiptItems = [];
            const usedProducts = [];
            
            for (let j = 0; j < productCount; j++) {
                let product;
                do {
                    product = products[Math.floor(Math.random() * products.length)];
                } while (usedProducts.includes(product.id));
                
                usedProducts.push(product.id);
                
                const supplier = suppliers.find(s => 
                    s.productCategories && s.productCategories.includes(product.category)
                ) || suppliers[Math.floor(Math.random() * suppliers.length)];
                
                const quantity = Math.floor(Math.random() * 50) + 10;
                const unitPrice = product.purchasePrice || (product.sellingPrice * 0.6);
                
                receiptItems.push({
                    product_id: product.id,
                    product_name: product.name,
                    category: product.category,
                    quantity: quantity,
                    unit: product.unit,
                    unit_price: unitPrice,
                    total_price: quantity * unitPrice,
                    supplier_id: supplier.id,
                    supplier_name: supplier.name
                });
            }
            
            const receipt = {
                id: db.nextId++,
                receipt_number: `WE-2024-${String(1000 + i).padStart(4, '0')}`,
                date: receiptDate.toISOString(),
                supplier_id: receiptItems[0].supplier_id,
                supplier_name: receiptItems[0].supplier_name,
                items: receiptItems,
                item_count: receiptItems.length,
                total_amount: receiptItems.reduce((sum, item) => sum + item.total_price, 0),
                status: 'completed',
                notes: `Wareneingang vom ${receiptDate.toLocaleDateString('de-DE')}`,
                created_at: receiptDate.toISOString(),
                created_by: 'admin',
                tenant_id: 'demo'
            };
            
            goodsReceipts.push(receipt);
        }
        
        // Speichere Wareneingänge
        db.data.goods_receipts = goodsReceipts;
        console.log(`✅ ${goodsReceipts.length} Wareneingänge erstellt\n`);
        
        // 3. ERSTELLE ERWARTETE LIEFERUNGEN (OFFENE BESTELLUNGEN)
        console.log('3️⃣ Erstelle erwartete Lieferungen...');
        
        const existingOrders = db.data.orders || [];
        const openOrders = existingOrders.filter(o => o.status === 'ordered');
        
        // Erstelle zusätzliche offene Bestellungen falls nötig
        if (openOrders.length < 10) {
            const neededOrders = 10 - openOrders.length;
            
            for (let i = 0; i < neededOrders; i++) {
                const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
                const orderDate = new Date();
                const deliveryDate = new Date();
                deliveryDate.setDate(deliveryDate.getDate() + Math.floor(Math.random() * 7) + 1);
                
                // Wähle 2-6 Produkte für die Bestellung
                const itemCount = Math.floor(Math.random() * 5) + 2;
                const orderItems = [];
                const usedProducts = [];
                
                for (let j = 0; j < itemCount; j++) {
                    let product;
                    do {
                        product = products[Math.floor(Math.random() * products.length)];
                    } while (usedProducts.includes(product.id));
                    
                    usedProducts.push(product.id);
                    
                    // Berechne Bestellmenge basierend auf Bedarf
                    const needsReorder = product.stock < product.min_stock * 1.5;
                    const orderQuantity = needsReorder ? 
                        Math.ceil((product.max_stock - product.stock) * 0.8) : 
                        Math.floor(Math.random() * 30) + 10;
                    
                    const unitPrice = product.purchasePrice || (product.sellingPrice * 0.6);
                    
                    orderItems.push({
                        product_id: product.id,
                        product_name: product.name,
                        category: product.category,
                        quantity: orderQuantity,
                        unit: product.unit,
                        unit_price: unitPrice,
                        total_price: orderQuantity * unitPrice
                    });
                }
                
                const order = {
                    id: db.nextId++,
                    orderNumber: `BST-2024-${String(2000 + i).padStart(4, '0')}`,
                    supplier_id: supplier.id,
                    supplier_name: supplier.name,
                    supplier_email: supplier.email,
                    items: orderItems,
                    item_count: orderItems.length,
                    total_amount: orderItems.reduce((sum, item) => sum + item.total_price, 0),
                    status: 'ordered',
                    orderDate: orderDate.toISOString(),
                    expectedDelivery: deliveryDate.toISOString(),
                    deliveryAddress: supplier.address,
                    notes: `Lieferung erwartet am ${deliveryDate.toLocaleDateString('de-DE')}`,
                    priority: Math.random() > 0.7 ? 'high' : 'normal',
                    created_at: orderDate.toISOString(),
                    tenant_id: 'demo'
                };
                
                db.data.orders.push(order);
            }
        }
        
        const finalOpenOrders = db.data.orders.filter(o => o.status === 'ordered');
        console.log(`✅ ${finalOpenOrders.length} erwartete Lieferungen vorhanden\n`);
        
        // 4. ZUSAMMENFASSUNG
        console.log('='.repeat(60));
        console.log('📊 ZUSAMMENFASSUNG:');
        console.log('='.repeat(60));
        
        // Zeige Beispiel-Lagerbestände
        console.log('\n📦 Beispiel-Lagerbestände:');
        products.slice(0, 5).forEach(p => {
            const stockStatus = p.stock <= 0 ? '❌ Leer' : 
                             p.stock < p.min_stock ? '⚠️ Niedrig' : 
                             '✅ OK';
            console.log(`   ${p.name}: ${p.stock} ${p.unit} ${stockStatus} (Min: ${p.min_stock}, Max: ${p.max_stock})`);
        });
        
        // Zeige letzte Wareneingänge
        console.log('\n📥 Letzte 3 Wareneingänge:');
        goodsReceipts.slice(0, 3).forEach(r => {
            const date = new Date(r.date);
            console.log(`   ${r.receipt_number}: ${r.item_count} Artikel von ${r.supplier_name}, €${r.total_amount.toFixed(2)} (${date.toLocaleDateString('de-DE')})`);
        });
        
        // Zeige nächste Lieferungen
        console.log('\n🚚 Nächste 3 erwartete Lieferungen:');
        finalOpenOrders
            .sort((a, b) => new Date(a.expectedDelivery) - new Date(b.expectedDelivery))
            .slice(0, 3)
            .forEach(o => {
                const deliveryDate = new Date(o.expectedDelivery);
                const priority = o.priority === 'high' ? '🔴' : '🟢';
                console.log(`   ${o.orderNumber}: ${o.supplier_name}, ${o.item_count} Artikel, €${o.total_amount.toFixed(2)} ${priority} (${deliveryDate.toLocaleDateString('de-DE')})`);
            });
        
        console.log('\n🎉 Alle Lagerdaten erfolgreich erstellt!');
        console.log('   Starte den Server neu um die Daten zu sehen.');
        
    } catch (error) {
        console.error('❌ Fehler:', error);
    }
}

// Führe das Script aus
fillWarehouseData();