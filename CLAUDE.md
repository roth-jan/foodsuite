# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# FoodSuite - Professional Kitchen Management System

## Project Overview
FoodSuite is a multi-tenant kitchen management system running on Node.js/Express with a single-page HTML frontend. The server runs on port 3003 by default.

## Key Files
- `foodsuite-complete-app.html` - Complete frontend application
- `server.js` - Main Express server
- `database/db-memory.js` - In-memory database with test data
- `routes/ai.js` - AI meal planning logic
- `routes/inventory.js` - Inventory management with stock calculations

## Essential Commands

### Server Operations
```bash
# Start server (defaults to memory database)
node server.js

# Start with PostgreSQL database
DB_TYPE=postgres node server.js

# Development mode with auto-reload
npm run dev

# Windows-specific restart scripts
powershell -ExecutionPolicy Bypass -File restart-server.ps1
restart-with-memory-db.bat
```

### Database Operations
```bash
# Initialize database schema (PostgreSQL only)
npm run init-db

# Seed with test data
npm run seed-db

# Update inventory with realistic values
node scripts/update-realistic-inventory.js
```

### Testing
```bash
# Run individual test files directly
node test-inventory-direct.js
node test-api-products.js
node test-products-direct.js

# Run Playwright tests (requires server running)
npx playwright test test-inventory-playwright.js

# Browser-based testing
# Open test-inventory-browser.html in browser
```

## Critical Architecture Patterns

### Database Architecture
The system supports two database types, controlled by `DB_TYPE` environment variable:
- **memory** (default): In-memory database with test data, resets on restart
- **postgres**: PostgreSQL adapter, requires external database

Database selection happens in server.js:
```javascript
const dbType = process.env.DB_TYPE || 'memory';
const db = dbType === 'postgres' ? require('./database/postgres-adapter') : require('./database/db-memory');
```

### Multi-Tenant Architecture
All API requests require tenant isolation via `x-tenant-id` header:
```javascript
// Server middleware extracts tenant ID
req.tenantId = req.headers['x-tenant-id'] || 'demo';

// Data filtering includes fallback logic
product.tenant_id === req.tenantId || product.tenant_id === 'demo' || product.tenant_id === 1
```

**Known Issue**: Mixed tenant ID types (numeric 1 vs string 'demo') require careful handling.

### API Integration Pattern
Frontend always includes tenant header:
```javascript
const response = await fetch(`${API_BASE_URL}/endpoint`, {
    headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': TENANT_ID  // Always 'demo' in current implementation
    }
});
```

### Inventory System
The inventory system tracks:
- Stock levels with min/max thresholds
- Consumption rates based on transaction history
- Stock status: out_of_stock, critical, low, normal, high
- Perishable item tracking with expiry dates

Stock status calculation in routes/inventory.js considers:
1. Current quantity vs min/max stock levels
2. Consumption rate for predictive alerts
3. Perishable status for expiry warnings

### AI Meal Planning Engine
Located in routes/ai.js, the AI system is rule-based (not ML) with:
- 5 preset modes: cost_optimized, balanced_nutrition, variety, seasonal, inventory_based
- Custom mode designer with weight sliders and exclusions
- Ingredient mappings for exclusion handling (e.g., "Schwein" → pork dishes)

**Known Issue**: Exclusions work ~80% due to incomplete INGREDIENT_MAPPINGS.

## Common Issues & Solutions

### PostgreSQL Data Corruption
**Problem**: Product names overwritten with supplier names
**Solution**: Switch to memory database:
```bash
# Update .env file
DB_TYPE=memory

# Restart server
powershell -ExecutionPolicy Bypass -File restart-server.ps1
```

### No Products/Inventory Showing
**Problem**: Tenant ID mismatch or uninitialized database
**Solution**: 
1. Ensure `x-tenant-id: demo` header in all requests
2. Restart server to reinitialize memory database
3. Run `node scripts/update-realistic-inventory.js` for realistic data

### Port Already in Use
**Problem**: Previous server instance still running on port 3003
**Solution**:
```bash
# Windows
taskkill /F /IM node.exe

# Or use provided script
kill-node-server.bat
```

### CORS Errors with Local Files
**Problem**: Opening HTML file directly causes CORS issues
**Solution**: Server configured to accept file:// and null origins, but ensure server is running

### AI Meal Planning Shows €0 Costs
**Problem**: Recipe costs show as €0/Portion in meal planning
**Solution**: The API returns cost_per_portion=0 when recipe_ingredients are empty. This is expected behavior with test data.

## Testing Strategy

### Manual Testing Flow
1. Start server: `node server.js`
2. Open http://localhost:3003 or foodsuite-complete-app.html
3. Test with default credentials: admin/Demo123!
4. For inventory testing: Run update script first
5. For AI testing: Click "KI-Plan erstellen" button

### Automated Testing
No formal test framework configured. Test files run standalone:
- API tests: Direct HTTP requests to endpoints
- Browser tests: Playwright scripts or HTML test pages
- Database tests: Direct database operations

### Useful Development Scripts
```bash
# Fill warehouse with realistic data
node scripts/create-realistic-warehouse-data.js
node scripts/fill-warehouse-data.js

# Generate analytics data
node scripts/generate-analytics-data.js
node scripts/generate-historical-data.js
```

## Deployment Notes

### Local Development
- Default port: 3003
- Memory database resets on restart
- No external dependencies for basic operation

### Docker Support
```bash
# Development with PostgreSQL
docker-compose -f docker-compose.dev.yml up -d

# Production setup
docker-compose up -d
```

### Health Checks
- `/health` - Basic health check for Docker
- `/api/health` - Detailed API status

## Key Implementation Details

### Frontend Structure
Single file `foodsuite-complete-app.html` contains:
- Complete UI with Bootstrap 5
- All JavaScript functionality inline
- Modal-based CRUD operations
- Drag-and-drop meal planning
- Real-time cost calculations
- KI button fixes applied via inline script

### Backend Routes
All routes follow RESTful patterns with Joi validation:
- `/api/products` - Product management with categories and allergens
- `/api/inventory` - Stock tracking with realistic calculations
- `/api/recipes` - Recipe management with ingredient tracking
- `/api/ai/suggest-meals` - AI meal planning engine (rule-based)
- `/api/mealplans` - Meal plan CRUD with drag-drop support
- `/api/goods-receipts` - Warehouse receiving and inventory updates
- `/api/price-monitoring` - Price tracking and trend analysis
- `/api/analytics` - Dashboard statistics and business intelligence
- `/api/orders` - Order management system
- `/api/suppliers` - Supplier management with ratings
- `/api/users` - User management
- `/api/roles` - Role-based access control
- `/api/tenants` - Multi-tenant configuration

### Database Schema
Core tables with multi-tenant support:
- All tables include `tenant_id` for isolation
- Timestamps: `created_at`, `updated_at`
- Status values: 'active', 'inactive', 'deleted'
- Products include allergens and nutritional data
- Inventory tracks expiry dates and transaction history
- Full audit trail via inventory_transactions

### Authentication & Security
- JWT-based with Bearer tokens
- Role-based permissions (admin, chef, viewer)
- Default users created on initialization
- 24-hour token expiry
- Middleware: `middleware/auth-middleware.js`
- Utils: `utils/auth.js` for token management

### Testing Infrastructure
Multiple testing approaches:
- `test-*-direct.js` - Direct API tests
- `test-*-playwright.js` - Browser automation
- `test-*-browser.html` - Standalone HTML tests
- `test-api-*.js` - API endpoint tests
- Windows batch files for test automation

### Recent Changes (July 2025)
- Added realistic inventory management with stock status calculations
- Implemented custom AI mode designer with exclusions
- Fixed CORS for file:// protocol access and localhost:3003
- Added health check endpoints for Docker deployments
- Created Windows-specific restart scripts
- Fixed meal planning CSS for better layout
- Corrected cost display calculations in meal planning