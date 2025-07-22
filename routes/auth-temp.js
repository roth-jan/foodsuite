// Temporary auth routes to prevent 404 errors
const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
    res.json({ 
        token: 'demo-token',
        user: { id: 1, username: 'demo', role: 'admin' }
    });
});

router.get('/current-user', (req, res) => {
    res.json({ 
        user: { id: 1, username: 'demo', role: 'admin' }
    });
});

router.get('/roles', (req, res) => {
    res.json([
        { id: 1, name: 'admin', permissions: ['all'] },
        { id: 2, name: 'user', permissions: ['read'] }
    ]);
});

module.exports = router;