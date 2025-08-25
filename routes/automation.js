const express = require('express');
const router = express.Router();

// Default automation settings
const defaultSettings = {
    autoOrderThreshold: 0.2,
    autoOrderEnabled: false,
    autoReorderEnabled: true,
    inventoryAlerts: true,
    priceAlerts: true,
    supplierRotation: false,
    qualityTracking: true,
    costOptimization: true,
    deliveryScheduling: false,
    emergencyOrdering: true,
    businessType: 'restaurant',
    orderFrequency: 'weekly',
    leadTime: 2,
    safetyStock: 0.3,
    reorderPoint: 0.5,
    maxOrderQuantity: 100,
    preferredSuppliers: [],
    excludedProducts: [],
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    orderTimeWindow: { start: '09:00', end: '17:00' },
    notifications: {
        email: true,
        sms: false,
        inApp: true
    }
};

// Business type recommendations
const businessRecommendations = {
    small_kitchen: {
        autoOrderThreshold: 0.3,
        autoOrderEnabled: false,
        safetyStock: 0.4,
        reorderPoint: 0.6,
        orderFrequency: 'weekly',
        leadTime: 3
    },
    restaurant: {
        autoOrderThreshold: 0.2,
        autoOrderEnabled: true,
        safetyStock: 0.25,
        reorderPoint: 0.4,
        orderFrequency: 'bi-weekly',
        leadTime: 2
    },
    catering: {
        autoOrderThreshold: 0.15,
        autoOrderEnabled: true,
        safetyStock: 0.2,
        reorderPoint: 0.35,
        orderFrequency: 'daily',
        leadTime: 1
    },
    canteen: {
        autoOrderThreshold: 0.25,
        autoOrderEnabled: true,
        safetyStock: 0.3,
        reorderPoint: 0.5,
        orderFrequency: 'weekly',
        leadTime: 2
    }
};

// GET automation settings
router.get('/', async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'] || req.headers['X-Tenant-ID'] || 'demo';
        
        // In a real app, this would load from database
        // For demo, return default settings with some customization
        const settings = {
            ...defaultSettings,
            tenantId,
            lastUpdated: new Date().toISOString()
        };
        
        res.json(settings);
    } catch (error) {
        console.error('Error loading automation settings:', error);
        res.status(500).json({ error: 'Failed to load automation settings' });
    }
});

// PUT automation settings
router.put('/', async (req, res) => {
    try {
        const tenantId = req.headers['x-tenant-id'] || req.headers['X-Tenant-ID'] || 'demo';
        const settings = req.body;
        
        // In a real app, this would save to database
        // For demo, just validate and return the settings
        const updatedSettings = {
            ...defaultSettings,
            ...settings,
            tenantId,
            lastUpdated: new Date().toISOString()
        };
        
        console.log(`💾 Automation settings updated for tenant ${tenantId}`);
        res.json(updatedSettings);
    } catch (error) {
        console.error('Error saving automation settings:', error);
        res.status(500).json({ error: 'Failed to save automation settings' });
    }
});

// GET business type recommendations
router.get('/recommendations/:businessType', async (req, res) => {
    try {
        const { businessType } = req.params;
        const recommendations = businessRecommendations[businessType];
        
        if (!recommendations) {
            return res.status(404).json({ error: 'Business type not found' });
        }
        
        res.json({
            ...defaultSettings,
            ...recommendations,
            businessType
        });
    } catch (error) {
        console.error('Error loading business recommendations:', error);
        res.status(500).json({ error: 'Failed to load recommendations' });
    }
});

// GET available business types
router.get('/business-types', async (req, res) => {
    try {
        const businessTypes = Object.keys(businessRecommendations).map(key => ({
            id: key,
            name: key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: getBusinessTypeDescription(key)
        }));
        
        res.json(businessTypes);
    } catch (error) {
        console.error('Error loading business types:', error);
        res.status(500).json({ error: 'Failed to load business types' });
    }
});

// POST test automation (simulate automated actions)
router.post('/test', async (req, res) => {
    try {
        const { action, params } = req.body;
        
        // Simulate different automation actions
        const results = {
            auto_order: {
                message: 'Automated order simulation completed',
                orders_created: 3,
                total_value: 487.50,
                suppliers: ['METRO AG', 'BioFrisch Vertrieb']
            },
            inventory_alert: {
                message: 'Inventory alerts generated',
                alerts_sent: 5,
                critical_items: 2,
                low_stock_items: 3
            },
            price_monitoring: {
                message: 'Price monitoring check completed',
                price_changes: 8,
                savings_opportunities: 125.30,
                alerts_triggered: 2
            }
        };
        
        const result = results[action] || { message: 'Test action completed', status: 'success' };
        res.json(result);
    } catch (error) {
        console.error('Error running automation test:', error);
        res.status(500).json({ error: 'Failed to run automation test' });
    }
});

function getBusinessTypeDescription(type) {
    const descriptions = {
        small_kitchen: 'Kleinküchen mit bis zu 50 Portionen täglich',
        restaurant: 'Restaurants und Gasthäuser mit regulärem Betrieb',
        catering: 'Catering-Services mit flexiblen Mengen',
        canteen: 'Betriebskantinen und Gemeinschaftsverpflegung'
    };
    return descriptions[type] || 'Standardeinstellungen';
}

module.exports = router;