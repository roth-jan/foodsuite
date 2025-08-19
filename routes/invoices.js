const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth-middleware');
const { v4: uuidv4 } = require('uuid');
const { getPDFGenerator } = require('../utils/pdf-generator');

// Apply authentication to all invoice routes
router.use(authenticate);

// Get all invoices
router.get('/', async (req, res) => {
    try {
        const db = req.app.get('db');
        const invoices = await db.getInvoices(req.tenantId);
        res.json(invoices);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
});

// Get single invoice
router.get('/:id', async (req, res) => {
    try {
        const db = req.app.get('db');
        const invoice = await db.getInvoice(req.params.id, req.tenantId);
        
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        
        res.json(invoice);
    } catch (error) {
        console.error('Error fetching invoice:', error);
        res.status(500).json({ error: 'Failed to fetch invoice' });
    }
});

// Create invoice from meal plan
router.post('/from-mealplan', async (req, res) => {
    try {
        const db = req.app.get('db');
        const { mealPlanId, customerId, dateFrom, dateTo, items, notes } = req.body;
        
        // Validate required fields
        if (!customerId || !items || items.length === 0) {
            return res.status(400).json({ error: 'Customer ID and items are required' });
        }
        
        // Calculate totals
        let subtotal = 0;
        let taxAmount = 0;
        const taxRate = 0.19; // 19% VAT (German standard)
        
        const processedItems = items.map(item => {
            const itemTotal = item.quantity * item.unitPrice;
            const itemTax = itemTotal * taxRate;
            subtotal += itemTotal;
            taxAmount += itemTax;
            
            return {
                ...item,
                total: itemTotal,
                tax: itemTax
            };
        });
        
        const total = subtotal + taxAmount;
        
        // Generate invoice number
        const invoiceCount = await db.getInvoiceCount(req.tenantId) || 0;
        const year = new Date().getFullYear();
        const invoiceNumber = `${year}-${String(invoiceCount + 1).padStart(5, '0')}`;
        
        // Create invoice
        const invoice = {
            id: uuidv4(),
            tenantId: req.tenantId,
            invoiceNumber,
            customerId,
            mealPlanId,
            dateFrom,
            dateTo,
            issueDate: new Date().toISOString(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
            status: 'draft',
            items: processedItems,
            subtotal,
            taxRate,
            taxAmount,
            total,
            notes,
            createdBy: req.user.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        const savedInvoice = await db.createInvoice(invoice);
        res.status(201).json(savedInvoice);
    } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).json({ error: 'Failed to create invoice' });
    }
});

// Update invoice status
router.put('/:id/status', async (req, res) => {
    try {
        const db = req.app.get('db');
        const { status } = req.body;
        
        const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        const updatedInvoice = await db.updateInvoiceStatus(req.params.id, status, req.tenantId);
        
        if (!updatedInvoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        
        res.json(updatedInvoice);
    } catch (error) {
        console.error('Error updating invoice status:', error);
        res.status(500).json({ error: 'Failed to update invoice status' });
    }
});

// Record payment
router.post('/:id/payments', async (req, res) => {
    try {
        const db = req.app.get('db');
        const { amount, paymentDate, paymentMethod, reference } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid payment amount is required' });
        }
        
        const payment = {
            id: uuidv4(),
            invoiceId: req.params.id,
            amount,
            paymentDate: paymentDate || new Date().toISOString(),
            paymentMethod: paymentMethod || 'bank_transfer',
            reference,
            createdBy: req.user.id,
            createdAt: new Date().toISOString()
        };
        
        const savedPayment = await db.addInvoicePayment(req.params.id, payment, req.tenantId);
        
        if (!savedPayment) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        
        res.status(201).json(savedPayment);
    } catch (error) {
        console.error('Error recording payment:', error);
        res.status(500).json({ error: 'Failed to record payment' });
    }
});

// Get invoice statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const db = req.app.get('db');
        const stats = await db.getInvoiceStats(req.tenantId);
        res.json(stats);
    } catch (error) {
        console.error('Error fetching invoice stats:', error);
        res.status(500).json({ error: 'Failed to fetch invoice statistics' });
    }
});

// Generate PDF for invoice
router.get('/:id/pdf', async (req, res) => {
    try {
        const db = req.app.get('db');
        const invoice = await db.getInvoice(req.params.id, req.tenantId);
        
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        
        // Get customer data
        const customers = await db.getCustomers(req.tenantId);
        const customer = customers.find(c => c.id === invoice.customerId);
        
        // Add customer data to invoice
        const invoiceWithCustomer = {
            ...invoice,
            customer
        };
        
        // Generate PDF
        const pdfGenerator = getPDFGenerator();
        const pdfBuffer = await pdfGenerator.generateInvoicePDF(invoiceWithCustomer);
        
        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Rechnung-${invoice.invoiceNumber}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating invoice PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

module.exports = router;