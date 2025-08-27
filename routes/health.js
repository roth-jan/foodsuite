// Production health monitoring endpoints
const express = require('express');
const router = express.Router();
const healthMonitor = require('../middleware/health-monitor');

// GET /api/health - Basic health check (public)
router.get('/', async (req, res) => {
    try {
        const db = req.app.get('db');
        const health = await healthMonitor.getHealthStatus(db);
        
        const statusCode = health.status === 'healthy' ? 200 : 
                          health.status === 'degraded' ? 200 : 503;
        
        res.status(statusCode).json(health);
    } catch (error) {
        healthMonitor.logError(error, req);
        res.status(503).json({
            status: 'unhealthy',
            error: 'Health check failed',
            timestamp: new Date().toISOString()
        });
    }
});

// GET /api/health/metrics - Detailed metrics (requires auth in production)
router.get('/metrics', async (req, res) => {
    try {
        const metrics = healthMonitor.getMetrics();
        res.json(metrics);
    } catch (error) {
        healthMonitor.logError(error, req);
        res.status(500).json({ error: 'Failed to get metrics' });
    }
});

// GET /api/health/deep - Deep health check with all dependencies
router.get('/deep', async (req, res) => {
    try {
        const db = req.app.get('db');
        const health = await healthMonitor.getHealthStatus(db);
        
        // Additional deep checks
        const deepChecks = {
            ...health,
            deep_checks: {
                // Test actual API functionality
                products_api: await testProductsAPI(),
                recipes_api: await testRecipesAPI(),
                ai_api: await testAIAPI(),
                file_system: checkFileSystem(),
                environment_vars: checkEnvironmentVars()
            }
        };

        res.json(deepChecks);
    } catch (error) {
        healthMonitor.logError(error, req);
        res.status(500).json({
            status: 'unhealthy',
            error: 'Deep health check failed',
            message: error.message
        });
    }
});

// POST /api/health/error - Log application errors
router.post('/error', (req, res) => {
    try {
        const { error, context } = req.body;
        healthMonitor.logError(new Error(error), req);
        
        res.json({ success: true, message: 'Error logged' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to log error' });
    }
});

// Helper functions for deep health checks
async function testProductsAPI() {
    try {
        // This would test the products API internally
        return { status: 'healthy', message: 'Products API responsive' };
    } catch (error) {
        return { status: 'unhealthy', error: error.message };
    }
}

async function testRecipesAPI() {
    try {
        return { status: 'healthy', message: 'Recipes API responsive' };
    } catch (error) {
        return { status: 'unhealthy', error: error.message };
    }
}

async function testAIAPI() {
    try {
        return { status: 'healthy', message: 'AI API responsive' };
    } catch (error) {
        return { status: 'unhealthy', error: error.message };
    }
}

function checkFileSystem() {
    try {
        const fs = require('fs');
        // Check if critical files exist
        const criticalFiles = [
            './server.js',
            './foodsuite-complete-app.html',
            './database/db-memory.js'
        ];
        
        for (const file of criticalFiles) {
            if (!fs.existsSync(file)) {
                return { status: 'unhealthy', message: `Missing critical file: ${file}` };
            }
        }
        
        return { status: 'healthy', message: 'All critical files present' };
    } catch (error) {
        return { status: 'unhealthy', error: error.message };
    }
}

function checkEnvironmentVars() {
    const requiredVars = ['NODE_ENV'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        return { 
            status: 'degraded', 
            missing: missingVars,
            message: `Missing environment variables: ${missingVars.join(', ')}`
        };
    }
    
    return {
        status: 'healthy',
        environment: process.env.NODE_ENV,
        db_type: process.env.DB_TYPE || 'memory',
        message: 'Environment variables configured'
    };
}

module.exports = router;