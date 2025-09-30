require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Import routes
const authRoutes = require('./routes/auth-temp'); // Temporary fix for Render
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const productRoutes = require('./routes/products');
const supplierRoutes = require('./routes/suppliers');
const orderRoutes = require('./routes/orders');
const recipeRoutes = require('./routes/recipes');
const inventoryRoutes = require('./routes/inventory');
const mealPlanRoutes = require('./routes/mealplans');
const analyticsRoutes = require('./routes/analytics');
const tenantRoutes = require('./routes/tenants');
const invoiceRoutes = require('./routes/invoices');
const customerRoutes = require('./routes/customers');

// Import database
const dbType = process.env.DB_TYPE || 'memory';
const db = dbType === 'postgres' ? require('./database/postgres-adapter') : require('./database/db-memory');

// Import production systems
const healthMonitor = require('./middleware/health-monitor');
const FeatureFlags = require('./middleware/feature-flags');
const BackupSystem = require('./scripts/backup-system');

// Initialize production systems
const featureFlags = new FeatureFlags(db);
const backupSystem = new BackupSystem(db);

const app = express();
const PORT = process.env.PORT || 3005;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs (increased for testing)
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// app.use(limiter); // Temporarily disabled for testing

// CORS configuration
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or file:// or Postman)
        if (!origin) return callback(null, true);
        
        // For development: Allow all localhost origins
        if (process.env.NODE_ENV !== 'production') {
            if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin.startsWith('file://')) {
                return callback(null, true);
            }
        }
        
        const allowedOrigins = process.env.NODE_ENV === 'production' ?
            ['https://foodsuite.onrender.com', 'https://foodsuite-3.onrender.com', 'https://*.onrender.com'] :
            ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3003', 'http://127.0.0.1:3003', 'http://localhost:3005', 'http://127.0.0.1:3005', 'http://localhost:8080', 'null'];
            
        if (allowedOrigins.indexOf(origin) !== -1 || 
            origin.startsWith('file://') || 
            origin.includes('.onrender.com')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'x-tenant-id']
}));

// Health check endpoints (before authentication)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'foodsuite-api',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// General middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve the HTML file with no-cache headers
app.get('/', (req, res) => {
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    res.sendFile(path.join(__dirname, 'foodsuite-complete-app.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Tenant middleware - extract tenant from header or default to 'demo'
app.use('/api', (req, res, next) => {
    req.tenantId = req.headers['x-tenant-id'] || 'demo';
    next();
});

// API Routes
// Auth routes (no authentication required for login)
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/mealplans', mealPlanRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/ai', require('./routes/ai'));
app.use('/api/price-monitoring', require('./routes/price-monitoring'));
app.use('/api/goods-receipts', require('./routes/goods-receipts'));
app.use('/api/automation-settings', require('./routes/automation'));
app.use('/api/health', require('./routes/health'));
app.use('/api/invoices', invoiceRoutes);
app.use('/api/customers', customerRoutes);

// Business Logic Integration
const businessLogicRoutes = require('./routes/business-logic');
app.use(businessLogicRoutes);

// Enhanced error handling middleware with health monitoring
app.use((err, req, res, next) => {
    // Log error to health monitor
    healthMonitor.logError(err, req);
    
    console.error('Application Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        url: req.originalUrl,
        method: req.method,
        tenant: req.tenantId,
        timestamp: new Date().toISOString()
    });
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            message: err.message,
            details: err.details,
            timestamp: new Date().toISOString()
        });
    }
    
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Access token is missing or invalid',
            timestamp: new Date().toISOString()
        });
    }
    
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production' ? 
            'Something went wrong!' : 
            err.message,
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found'
    });
});

// Initialize database and start server
async function startServer() {
    try {
        // Initialize database
        await db.initialize();
        console.log('✅ Database initialized successfully');
        
        // Make database available to routes
        app.set('db', db);
        
        // Initialize production systems
        if (process.env.NODE_ENV === 'production') {
            console.log('🏭 Initializing production systems...');
            
            // Initialize backup system
            await backupSystem.initialize();
            
            // Start automatic backups (every 6 hours)
            backupSystem.startAutomaticBackups();
            
            // Initialize feature flags
            await featureFlags.initializeDefaultFlags('demo');
            
            console.log('✅ Production systems initialized');
        }
        
        // Apply complete product-to-article mappings for business logic consistency
        const { applyProductArticleMappings } = require('./scripts/map-products-to-articles');
        const mappingResult = applyProductArticleMappings(db);
        
        if (mappingResult.success) {
            console.log(`🔗 Product-Article mapping completed: ${mappingResult.totalMapped}/${mappingResult.totalProducts} products mapped`);
        } else {
            console.log('⚠️ Product-Article mapping failed:', mappingResult.error);
        }
        
        // Start server
        app.listen(PORT, () => {
            console.log(`🚀 FoodSuite Backend Server running on port ${PORT}`);
            console.log(`📱 Frontend: http://localhost:${PORT}`);
            console.log(`🔧 API Base: http://localhost:${PORT}/api`);
            console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
            console.log(`🏢 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔄 SIGTERM received, shutting down gracefully');
    db.close();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🔄 SIGINT received, shutting down gracefully');
    db.close();
    process.exit(0);
});

startServer();

module.exports = app;