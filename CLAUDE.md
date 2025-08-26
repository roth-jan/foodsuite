# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# FoodSuite - Professional Kitchen Management System

## Project Overview
FoodSuite is a multi-tenant SaaS for professional kitchen management. Single-page HTML frontend + Node.js/Express backend on port 3005.

## Essential Commands

```bash
# Development
node server.js                    # Memory DB (default)
DB_TYPE=postgres node server.js   # PostgreSQL
npm run dev                       # Auto-reload with nodemon

# Windows helpers
powershell -ExecutionPolicy Bypass -File restart-server.ps1
restart-with-memory-db.bat
kill-node-server.bat

# Database
npm run init-db                   # PostgreSQL schema only
npm run seed-db                   # Initial data
node scripts/update-realistic-inventory.js  # Realistic inventory data

# Testing
npm test                          # Jest tests (if any)
npx playwright test              # E2E tests
node test-*.js                   # Direct test execution
```

## Critical Architecture

### Article Hierarchy System (NEW)
Recipes MUST use concrete supplier articles with nutrition data, NEVER free text:
```
Supplier Articles (Priority 1) → Neutral Articles (Priority 2) → Recipe Ingredients
```
- `database/article-system.js` - Core business logic
- `database/supplier-articles-data.js` - 30+ real supplier articles
- `database/migrate-recipes.js` - Migration system for legacy recipes

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

Core endpoints with Joi validation:
- `/api/products` - Legacy product management
- `/api/recipes` - Recipe CRUD with article references  
- `/api/recipes/:id/ingredients` - Update ingredients with articles
- `/api/ai/suggest-meals` - POST with mode, returns 21 meals
- `/api/inventory` - Stock tracking with status calculations
- `/api/inventory/alerts` - Inventory warnings (critical/low/reorder)
- `/api/inventory/low-stock` - Products below minimum stock
- `/api/goods-receipts` - Warehouse receiving (GET/POST/GET :id/items)
- `/api/automation-settings` - GET/PUT automation configuration + business recommendations
- `/api/suppliers` - Supplier management
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

## Recent Critical Changes (August 2025)

1. **Article System Implementation** 
   - Recipes must reference supplier/neutral articles
   - Migration system converts old recipes
   - Frontend shows real nutrition/allergen data

2. **JavaScript Scope Fixes**
   - All interactive functions moved to `window.*`
   - Event handlers use `data-action` + `data-param`
   - Fixed button functionality issues

3. **Production UX Improvements**
   - Fixed undefined product names in inventory warnings
   - Implemented comprehensive goods receipt details modals
   - Added manual goods receipt functionality with validation
   - Fixed layout issues in Faktura modules
   - Added automation-settings API to prevent 404 errors

4. **Generic Button Handler**
   - Central click handler with smart fallbacks
   - Skip-list for standard UI buttons to prevent misleading messages
   - Proper Phase 2 feature marking

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

### Article Resolution Logic (`database/article-system.js`)
Critical business logic for recipe cost calculation:
1. Try to find specific `supplier_article_id` (exact price, nutrition)
2. Fallback to `neutral_article_id` (estimated price)
3. Error if neither found
- Migration system converts legacy string ingredients to article references
- Cost calculations depend on this hierarchy working correctly

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