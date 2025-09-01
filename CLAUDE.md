# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# FoodSuite - Professional Kitchen Management System

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
node test-direct-api.js           # Complete business logic validation
node scripts/map-products-to-articles.js  # Product-article mapping verification
npx playwright test test-business-simple.spec.js  # UI business logic tests

# Production Operations
npm run deploy:staging           # Deploy to staging environment
npm run deploy:production        # Safe production deployment with checks
npm run rollback:production      # Emergency rollback
npm run backup                   # Create system backup
npm run monitor                  # Live production monitoring
npm run health                   # System health check

# Testing
npm test                          # Jest tests
npx playwright test              # E2E tests
npm run test:production          # Production health validation

# Windows helpers
powershell -ExecutionPolicy Bypass -File restart-server.ps1
restart-with-memory-db.bat
kill-node-server.bat
```

## Critical Architecture

### Complete Business Logic Integration (ENTERPRISE)
Full product-to-article mapping ensuring 100% inventory-recipe synchronization:
```
150 Legacy Products → Article Mapping → 162 Available Products
    ↓                      ↓                    ↓
Supplier Articles → Neutral Articles → Recipe Ingredients → Cost Calculation
```
- **Complete Coverage**: All 150+ canteen products mapped to article system
- **Intelligent Mapping**: Auto-mapping with fuzzy matching for product names  
- **Business Continuity**: Order → Receipt → Recipe → Cost → Invoice workflow
- **Enterprise Quality**: 6/6 business logic tests passing (100% score)

### Database Architecture
```javascript
// server.js determines database type
const dbType = process.env.DB_TYPE || 'memory';
const db = dbType === 'postgres' ? require('./database/postgres-adapter') : require('./database/db-memory');
```
- **memory**: Resets on restart, includes test data
- **postgres**: Persistent, requires external DB

### Multi-Tenant Pattern
All requests require `x-tenant-id` header:
```javascript
// Frontend
headers: { 'x-tenant-id': 'demo' }

// Backend fallback logic
item.tenant_id === req.tenantId || item.tenant_id === 'demo' || item.tenant_id === 1
```
⚠️ Mixed types: numeric `1` vs string `'demo'` require careful handling

### Frontend Architecture
Single file `foodsuite-complete-app.html`:
- All functions in global `window` scope (e.g., `window.generateAIWeekMenu`)
- Bootstrap 5 UI with modals
- Drag-drop meal planning with cost tracking
- Real-time inventory status indicators

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
**Fix**: Run migration: recipes now use `supplier_article_id` + `neutral_article_id`

### Port 3003 Already in Use
```bash
taskkill /F /IM node.exe  # Windows
kill-node-server.bat      # Helper script
```

### CORS with file://
Server accepts `null` and `file://` origins - ensure server is running

## API Endpoints

Enterprise endpoints with complete business logic integration:
- `/api/products` - **Enhanced**: Returns 162 products (supplier articles + mapped legacy)
- `/api/recipes` - Recipe CRUD with complete article references
- `/api/recipes/:id/ingredients` - Update ingredients with full product availability
- `/api/ai/suggest-meals` - POST with mode, returns 21 meals with real cost data
- `/api/inventory` - Stock tracking with enhanced status calculations
- `/api/inventory/alerts` - Inventory warnings (critical/low/reorder)
- `/api/inventory/low-stock` - Products below minimum stock
- `/api/goods-receipts` - Warehouse receiving (GET/POST/GET :id/items)
- `/api/automation-settings` - GET/PUT automation configuration + business recommendations
- `/api/health` - **NEW**: System health monitoring with metrics
- `/api/health/deep` - **NEW**: Comprehensive dependency health checks
- `/api/health/metrics` - **NEW**: Performance and error tracking
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

### Local Testing Flow
1. `node server.js`
2. Open http://localhost:3005  
3. Login: admin/Demo123!
4. Test KI: Click "KI-Plan erstellen" in Speiseplanung

## Enterprise-Grade Business Logic Implementation (August 2025)

### 1. Complete Product-Article Integration
- **Problem Solved**: Missing inventory items in recipe dropdowns (Blumenkohl, Apfelsaft)
- **Solution**: 100% product-to-article mapping with intelligent auto-assignment
- **Result**: 162 products available (12 supplier + 150 mapped legacy)
- **Quality Score**: 6/6 business logic tests passing (100%)

### 2. Production-Grade Architecture
- **Multi-environment pipeline**: Development → Staging → Production
- **Health monitoring**: `/api/health`, `/api/health/deep`, `/api/health/metrics`
- **Automatic backups**: 6-hour intervals with 7-day retention
- **Feature flags**: Gradual rollouts with tenant-specific controls
- **Zero-downtime deployments**: Auto-rollback on health check failures

### 3. Business Logic Validation Systems
- **Direct API testing**: `node test-direct-api.js` validates all integrations
- **Product availability**: All 150+ products searchable and selectable
- **Recipe integration**: Complete inventory → recipe → cost calculation pipeline
- **Supplier relationships**: Full price comparison and monitoring capabilities

## Testing Approach

No formal test framework - use direct execution:
```bash
node test-inventory-direct.js      # API tests
node test-ai-api-debug.js         # Debug specific features
npx playwright test               # Browser automation
```

Windows users: Use provided `.bat` scripts for common operations.

## Critical Development Notes

### Frontend Event Handling
- **Global Functions**: All interactive functions must be in `window.*` scope for onclick handlers
- **Generic Button Handler**: Central click handler in `foodsuite-complete-app.html` handles fallbacks
- **Skip List**: Standard UI buttons (`['Wareneingang', 'Schließen', 'Abbrechen', 'Details', 'Bearbeiten', 'Speichern']`) bypass generic handler

### Modal System
- All modals use Bootstrap 5 with dynamic creation via `document.createElement('div')`
- Pattern: Create → Append → `new bootstrap.Modal()` → Show → Remove on hide
- Always include proper cleanup: `modal.addEventListener('hidden.bs.modal', () => document.body.removeChild(modal))`

### Data Loading Pattern
- Demo data loading functions (e.g., `loadPriceMonitoring()`, `loadAnalytics()`) use direct DOM manipulation
- No external chart libraries - simple HTML/CSS fallbacks for charts
- API calls with tenant validation: `headers: { 'x-tenant-id': TENANT_ID }`

### Phase 2 Features
Features marked with `🚧 PHASE 2:` in toast messages:
- Invoice creation and PDF generation (`/api/invoices/:id/pdf`)
- Customer creation and editing forms
- Advanced price monitoring automation
- Full goods receipt item tracking

### Authentication Notes
- Most API routes have auth disabled for demo (`// const { authenticate } = require('../middleware/auth-middleware');`)
- Routes that still require auth: goods receipt POST (legacy)
- Frontend uses session-based auth, not JWT for most operations

## Data Architecture Deep Dive

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

### Product-Article Integration System (`scripts/map-products-to-articles.js`)
Enterprise-grade mapping ensuring ALL products are available for recipes:
```javascript
// Automatic server startup process:
1. Load 150 legacy products from canteen-test-data.js
2. Apply intelligent product-to-article mappings (fuzzy + auto)
3. Enhanced getProducts() returns both supplier_articles + mapped_products = 162 total
4. Recipe dropdowns show ALL inventory items (Blumenkohl, Apfelsaft, etc.)
```
- **Direct Mapping**: Exact product name matches (13 products)
- **Fuzzy Matching**: Similar name detection with word analysis
- **Auto Mapping**: Category-based intelligent assignment (137 products)
- **API Integration**: Combined supplier articles + legacy products in single endpoint

### Frontend Architecture Patterns
Single-file application with sophisticated state management:

**Tab System:** Custom implementation bypassing Bootstrap tabs for complex workflows
```javascript
window.showTab(tabId) // Hide all, show target, trigger data loading
```

**Modal Creation Pattern:** Dynamic Bootstrap modals for all interactions
```javascript
const modal = document.createElement('div');
modal.className = 'modal fade';
modal.innerHTML = `...`;
document.body.appendChild(modal);
const bsModal = new bootstrap.Modal(modal);
bsModal.show();
modal.addEventListener('hidden.bs.modal', () => document.body.removeChild(modal));
```

**Generic Button Handler:** Central click dispatcher with intelligent fallbacks
```javascript
// Handles all buttons without specific onclick handlers
// Skip-list prevents standard UI buttons from showing "preparation" messages
```

### Deployment Considerations
- **Render Service Name**: `foodsuite-3` (configured in CORS origins)
- **Auto-deployment**: Pushes to `main` branch trigger automatic Render deployment
- **Health Check**: `/api/health` endpoint for monitoring
- **Environment**: Memory DB reset on each deployment (no persistence)

## Advanced Architecture Insights

### AI Meal Planning Engine (`routes/ai.js`)
Rule-based optimization system with multiple strategies:
```javascript
// Frontend sends mapped modes (cost → cost_optimized)
const modeMapping = { cost: 'cost_optimized', nutrition: 'balanced_nutrition' };
// Backend applies weights: cost=0.7, nutrition=0.2, variety=0.1 for cost_optimized
```
- Returns 21 meals (7 days × 3 meals) with cost calculations
- Uses real recipe cost data from article system
- Filters by dietary restrictions and inventory availability

### Cost Calculation Pipeline
Complex multi-stage cost resolution:
1. **Recipe Level**: `database/article-system.js` calculates costs per recipe
2. **API Level**: `routes/recipes.js` provides cost breakdown with confidence levels
3. **Frontend Level**: Real-time cost updates in meal planning drag-drop

### Error Handling Architecture
- **Backend**: Consistent `{ error: "message" }` format across all routes
- **Frontend**: Central `api.js` wrapper with tenant header injection
- **Fallbacks**: Demo data loading when APIs fail, preventing blank screens

### Render.com Deployment Notes
Current deployment uses service name `foodsuite-3.onrender.com`:
- CORS configured for production domain
- Automatic deployment from GitHub main branch
- Memory database resets on each deploy
- Health checks prevent deployment failures