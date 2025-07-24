# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# FoodSuite - Professional Kitchen Management System

## Project Overview
FoodSuite is a multi-tenant SaaS for professional kitchen management. Single-page HTML frontend + Node.js/Express backend on port 3003.

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
- `/api/goods-receipts` - Warehouse receiving
- `/api/suppliers` - Supplier management
- `/api/users` + `/api/auth` - JWT authentication

## Deployment

### Render.com
- Uses `render.yaml` configuration
- Health check: `/health`
- Auto-deploys from GitHub main branch
- Environment: `DB_TYPE=memory` (default)

### Local Testing Flow
1. `node server.js`
2. Open http://localhost:3003
3. Login: admin/Demo123!
4. Test KI: Click "KI-Plan erstellen" in Speiseplanung

## Recent Critical Changes (July 2025)

1. **Article System Implementation**
   - Recipes must reference supplier/neutral articles
   - Migration system converts old recipes
   - Frontend shows real nutrition/allergen data

2. **JavaScript Scope Fixes**
   - All interactive functions moved to `window.*`
   - Event handlers use `data-action` + `data-param`
   - Fixed button functionality issues

3. **AI Integration**
   - Frontend mode mapping corrected
   - Better error logging
   - API returns full week plan (21 meals)

## Testing Approach

No formal test framework - use direct execution:
```bash
node test-inventory-direct.js      # API tests
node test-ai-api-debug.js         # Debug specific features
npx playwright test               # Browser automation
```

Windows users: Use provided `.bat` scripts for common operations.