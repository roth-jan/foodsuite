const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth-middleware');
const { v4: uuidv4 } = require('uuid');

// Apply authentication to all customer routes
router.use(authenticate);

// Get all customers
router.get('/', async (req, res) => {
    try {
        const db = req.app.get('db');
        const customers = await db.getCustomers(req.tenantId);
        res.json(customers);
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

// Create new customer
router.post('/', async (req, res) => {
    try {
        const db = req.app.get('db');
        const { name, contactPerson, email, phone, address, taxId, paymentTerms } = req.body;
        
        // Validate required fields
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }
        
        // Generate customer number
        const customers = await db.getCustomers(req.tenantId);
        const year = new Date().getFullYear();
        const customerCount = customers.length + 1;
        const customerNumber = `K-${year}-${String(customerCount).padStart(3, '0')}`;
        
        const customer = {
            tenantId: req.tenantId,
            name,
            contactPerson,
            email,
            phone,
            address,
            taxId,
            customerNumber,
            paymentTerms: paymentTerms || 30,
            createdBy: req.user.id
        };
        
        const savedCustomer = await db.createCustomer(customer);
        res.status(201).json(savedCustomer);
    } catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).json({ error: 'Failed to create customer' });
    }
});

module.exports = router;