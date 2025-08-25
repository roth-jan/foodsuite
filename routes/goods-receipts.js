const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth-middleware');

// GET all goods receipts (no auth required for demo)
router.get('/', async (req, res) => {
    try {
        const db = req.app.get('db');
        const limit = parseInt(req.query.limit) || 30;
        
        // Get tenant ID from header or use 'demo' as default
        const tenantId = req.headers['x-tenant-id'] || req.tenantId || 'demo';
        
        // Get goods receipts from memory database
        const allReceipts = db.data.goods_receipts || [];
        
        // Filter by tenant
        const receipts = allReceipts
            .filter(r => r.tenant_id === tenantId || r.tenant_id === 'demo')
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit);
        
        res.json({
            status: 'success',
            items: receipts,
            total: receipts.length
        });
    } catch (error) {
        console.error('Error loading goods receipts:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Fehler beim Laden der Wareneingänge' 
        });
    }
});

// GET single goods receipt (no auth required for demo)
router.get('/:id', async (req, res) => {
    try {
        const db = req.app.get('db');
        const tenantId = req.headers['x-tenant-id'] || req.tenantId || 'demo';
        const receipt = db.data.goods_receipts?.find(r => 
            r.id.toString() === req.params.id && 
            (r.tenant_id === tenantId || r.tenant_id === 'demo')
        );
        
        if (!receipt) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Wareneingang nicht gefunden' 
            });
        }
        
        res.json(receipt);
    } catch (error) {
        console.error('Error loading goods receipt:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Fehler beim Laden des Wareneingangs' 
        });
    }
});

// GET goods receipt items
router.get('/:id/items', async (req, res) => {
    try {
        const db = req.app.get('db');
        const tenantId = req.headers['x-tenant-id'] || req.tenantId || 'demo';
        
        // For demo purposes, return sample items
        const receipt = db.data.goods_receipts?.find(r => 
            r.id.toString() === req.params.id && 
            (r.tenant_id === tenantId || r.tenant_id === 'demo')
        );
        
        if (!receipt) {
            return res.status(404).json([]);
        }
        
        // Generate sample items based on receipt data
        const sampleItems = [
            {
                id: 1,
                product_name: "Bio-Tomaten rot, 5kg Kiste",
                article_number: "BIO-TOM-5KG",
                ordered_quantity: 10,
                delivered_quantity: 10,
                unit: "Stück",
                unit_price: 12.50
            },
            {
                id: 2,
                product_name: "Kartoffeln festkochend, 25kg Sack",
                article_number: "FEST-KART-25KG",
                ordered_quantity: 5,
                delivered_quantity: 4,
                unit: "Sack",
                unit_price: 18.90
            },
            {
                id: 3,
                product_name: "Möhren, 10kg Sack",
                article_number: "MOEH-10KG",
                ordered_quantity: 3,
                delivered_quantity: 3,
                unit: "Sack",
                unit_price: 8.50
            }
        ];
        
        res.json(sampleItems);
    } catch (error) {
        console.error('Error loading goods receipt items:', error);
        res.status(500).json([]);
    }
});

// CREATE new goods receipt (no auth required for demo)
router.post('/', async (req, res) => {
    try {
        const db = req.app.get('db');
        const tenantId = req.headers['x-tenant-id'] || req.tenantId || 'demo';
        const newReceipt = {
            id: db.nextId++,
            receipt_number: `WE-${new Date().getFullYear()}-${String(db.nextId).padStart(4, '0')}`,
            date: req.body.date || new Date().toISOString(),
            ...req.body,
            tenant_id: tenantId,
            created_at: new Date().toISOString(),
            created_by: req.body.received_by || 'admin'
        };
        
        if (!db.data.goods_receipts) {
            db.data.goods_receipts = [];
        }
        
        db.data.goods_receipts.push(newReceipt);
        
        res.status(201).json(newReceipt);
    } catch (error) {
        console.error('Error creating goods receipt:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Fehler beim Erstellen des Wareneingangs' 
        });
    }
});

module.exports = router;