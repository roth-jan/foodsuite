# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
FoodSuite is a multi-tenant SaaS for professional kitchen management. Single-page HTML frontend + Node.js/Express backend on port 3005.

## Essential Commands

```bash
# Development
node server.js                    # Memory DB (default)
npm run dev                       # Auto-reload with nodemon
npm run staging                   # Staging environment (PostgreSQL)
npm run prod                      # Production environment (PostgreSQL)

# Database
npm run init-db                   # PostgreSQL schema only
npm run seed-db                   # Initial data
node scripts/update-realistic-inventory.js  # Realistic inventory data

# Business Logic Testing
node scripts/map-products-to-articles.js  # Product-article mapping verification
npx playwright test tests/api/business-logic.spec.js  # API business logic tests
npx playwright test tests/e2e/*.spec.js  # UI E2E tests

# Production Operations
npm run deploy:staging           # Deploy to staging environment
npm run deploy:production        # Safe production deployment with checks
npm run rollback:production      # Emergency rollback
npm run backup                   # Create system backup
npm run monitor                  # Live production monitoring
npm run health                   # System health check

# Testing
npm test                          # Jest tests
npx playwright test              # All E2E tests
npm run test:production          # Production health validation

# Windows helpers
powershell -ExecutionPolicy Bypass -File restart-server.ps1
restart-with-memory-db.bat
kill-node-server.bat
```

## Critical Architecture

### Complete Business Logic Integration
Full product-to-article mapping ensuring 100% inventory-recipe synchronization:
```
150 Legacy Products → Article Mapping → 162 Available Products
    ↓                      ↓                    ↓
Supplier Articles → Neutral Articles → Recipe Ingredients → Cost Calculation
```
- **Complete Coverage**: All 150+ canteen products mapped to article system via `scripts/map-products-to-articles.js`
- **Intelligent Mapping**: Auto-mapping with fuzzy matching for product names
- **Business Continuity**: Order → Receipt → Recipe → Cost → Invoice workflow

### Database Architecture
```javascript
// server.js determines database type
const dbType = process.env.DB_TYPE || 'memory';
const db = dbType === 'postgres' ? require('./database/postgres-adapter') : require('./database/db-memory');
```
- **memory**: Resets on restart, includes test data from `database/canteen-test-data.js`
- **postgres**: Persistent, requires external DB

### Multi-Tenant Pattern
All requests require `x-tenant-id` header:
```javascript
// Frontend
headers: { 'x-tenant-id': 'demo' }

// Backend fallback logic in routes/products.js:46
item.tenant_id === req.tenantId || item.tenant_id === 'demo' || item.tenant_id === 1
```
⚠️ Mixed types: numeric `1` vs string `'demo'` require careful handling

### Frontend Architecture
Single file `foodsuite-complete-app.html`:
- All functions in global `window` scope (e.g., `window.generateAIWeekMenu`)
- Bootstrap 5 UI with modals
- Drag-drop meal planning with cost tracking
- Real-time inventory status indicators
- Tab system using custom `window.showTab()` bypassing Bootstrap tabs

### AI Meal Planning
Rule-based system in `routes/ai.js`:
- Modes: `cost_optimized`, `balanced_nutrition`, `variety`, `seasonal`, `inventory_based`
- Custom mode with weights and exclusions
- Frontend sends mapped modes (e.g., `cost` → `cost_optimized`)

## Common Issues & Solutions

### KI Button Not Working
**Cause**: Function not in window scope or wrong mode parameter
**Fix**: Ensure `window.generateAIWeekMenu` and use `mappedMode` not `currentMode`

### No Recipes in AI/Empty Results
**Cause**: Memory DB not initialized with recipes
**Fix**: Restart server - recipes load from `canteen-test-data.js` on startup

### Undefined Article Numbers
**Cause**: Legacy product system instead of new article system
**Fix**: Run migration - recipes now use `supplier_article_id` + `neutral_article_id`

### Port 3005 Already in Use
```bash
taskkill /F /IM node.exe  # Windows
kill-node-server.bat      # Helper script
```

### CORS with file://
Server accepts `null` and `file://` origins - ensure server is running (see server.js:74-96)

## API Endpoints

Enterprise endpoints with complete business logic integration:
- `/api/products` - **Enhanced**: Returns 162 products (supplier articles + mapped legacy)
- `/api/recipes` - Recipe CRUD with complete article references
- `/api/recipes/:id/ingredients` - Update ingredients with full product availability
- `/api/ai/suggest-meals` - POST with mode, returns 21 meals with real cost data
- `/api/inventory` - Stock tracking with enhanced status calculations
- `/api/inventory/alerts` - Inventory warnings (critical/low/reorder)
- `/api/goods-receipts` - Warehouse receiving (GET/POST/GET :id/items)
- `/api/automation-settings` - GET/PUT automation configuration + business recommendations
- `/api/health` - System health monitoring with metrics
- `/api/health/deep` - Comprehensive dependency health checks
- `/api/suppliers` - Supplier management with price comparison data
- `/api/users` + `/api/auth` - JWT authentication
- `/api/price-monitoring` - Price alerts and monitoring
- `/api/invoices` + `/api/customers` - Basic CRUD (Phase 2: full implementation)

## Deployment

### Render.com
- Uses `render.yaml` configuration
- Health check: `/health`
- Auto-deploys from GitHub main branch
- Environment: `DB_TYPE=memory` (default)
- Service name: `foodsuite-3` (configured in CORS origins)

### Local Testing Flow
1. `node server.js`
2. Open http://localhost:3005
3. Login: admin/Demo123!
4. Test KI: Click "KI-Plan erstellen" in Speiseplanung

## Production-Grade Architecture

### Health Monitoring System
- **HealthMonitor middleware**: `middleware/health-monitor.js` tracks metrics
- **Endpoints**: `/api/health`, `/api/health/deep`, `/api/health/metrics`
- **Auto-rollback**: Deployment fails if health checks don't pass

### Feature Flags System
- **FeatureFlags class**: `middleware/feature-flags.js` for gradual rollouts
- **Tenant-specific features**: Enable features per tenant
- **Safe deployments**: Test features with specific tenants first

### Backup System
- **BackupSystem class**: `scripts/backup-system.js` handles automatic backups
- **6-hour intervals**: Automatic backup schedule with 7-day retention
- **CLI interface**: `node scripts/production-cli.js backup --create`

### Deployment Pipeline
- **Pipeline script**: `scripts/deployment-pipeline.js` orchestrates deployments
- **Multi-environment**: Development → Staging → Production workflow
- **Zero-downtime**: Health checks prevent breaking deployments

## Data Architecture

### In-Memory Database Structure (`database/db-memory.js`)
Complex data relationships across multiple entities:
```javascript
{
  // Legacy system (being phased out)
  products: [],                    // Old product system
  recipe_ingredients: [],          // Legacy ingredient refs

  // NEW Article System (current)
  neutral_articles: [],            // Generic articles (Zwiebeln, Gewürze)
  supplier_articles: [],           // Concrete supplier products with prices
  recipe_ingredients_new: [],      // Links recipes to articles

  // Core business entities
  recipes: [],                     // 75+ demo recipes with cost calculations
  suppliers: [],                   // 7 suppliers with rating system
  orders: [],                      // Purchase orders with multi-state workflow
  goods_receipts: [],              // Warehouse receiving with items
  inventory_transactions: [],      // Stock movements tracking

  // Multi-tenant system
  tenants: [],                     // Tenant isolation
  users: [],                       // User management with roles
  user_sessions: []                // Session-based auth
}
```

### Product-Article Mapping (`scripts/map-products-to-articles.js`)
Maps all 150 legacy products to supplier/neutral articles:
- **Direct Mapping**: Exact product name matches (e.g., "Blumenkohl" → supplier_article_id: 1020)
- **Fuzzy Matching**: Similar name detection with word analysis
- **Auto Mapping**: Category-based intelligent assignment (137 products)
- **API Integration**: `getProducts()` returns combined supplier_articles + mapped products

### Frontend Event Handling
- **Global Functions**: All onclick handlers need `window.*` scope
- **Generic Button Handler**: Central click dispatcher with skip-list for standard UI buttons
- **Modal Pattern**: Dynamic Bootstrap modal creation with cleanup on hide
- **Tab System**: Custom `showTab()` function bypasses Bootstrap for complex workflows

## Testing Approach

Direct test execution without formal framework:
```bash
node test-inventory-direct.js      # API tests
node test-ai-api-debug.js         # Debug specific features
npx playwright test               # Browser automation
```

Windows users: Use provided `.bat` scripts for common operations.

## Critical Development Notes

### Authentication Notes
- Most API routes have auth disabled for demo (`// const { authenticate } = require('../middleware/auth-middleware');`)
- Routes that still require auth: goods receipt POST (legacy)
- Frontend uses session-based auth, not JWT for most operations

### Phase 2 Features
Features marked with `🚧 PHASE 2:` in toast messages:
- Invoice creation and PDF generation (`/api/invoices/:id/pdf`)
- Customer creation and editing forms
- Advanced price monitoring automation
- Full goods receipt item tracking

### Error Handling Architecture
- **Backend**: Consistent `{ error: "message" }` format across all routes
- **Frontend**: Toast notifications for user feedback
- **Fallbacks**: Demo data loading when APIs fail, preventing blank screens