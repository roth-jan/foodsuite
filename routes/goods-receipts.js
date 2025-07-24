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

// GET single goods receipt
router.get('/:id', authenticate, async (req, res) => {
    try {
        const db = req.app.get('db');
        const receipt = db.data.goods_receipts?.find(r => 
            r.id.toString() === req.params.id && 
            (r.tenant_id === req.tenantId || r.tenant_id === 'demo')
        );
        
        if (!receipt) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Wareneingang nicht gefunden' 
            });
        }
        
        res.json({
            status: 'success',
            data: receipt
        });
    } catch (error) {
        console.error('Error loading goods receipt:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Fehler beim Laden des Wareneingangs' 
        });
    }
});

// CREATE new goods receipt
router.post('/', authenticate, async (req, res) => {
    try {
        const db = req.app.get('db');
        const newReceipt = {
            id: db.nextId++,
            receipt_number: `WE-${new Date().getFullYear()}-${String(db.nextId).padStart(4, '0')}`,
            date: new Date().toISOString(),
            ...req.body,
            tenant_id: req.tenantId,
            created_at: new Date().toISOString(),
            created_by: req.user.username
        };
        
        if (!db.data.goods_receipts) {
            db.data.goods_receipts = [];
        }
        
        db.data.goods_receipts.push(newReceipt);
        
        res.status(201).json({
            status: 'success',
            data: newReceipt
        });
    } catch (error) {
        console.error('Error creating goods receipt:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Fehler beim Erstellen des Wareneingangs' 
        });
    }
});

module.exports = router;