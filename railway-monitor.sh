#!/bin/bash

# Railway Deployment Monitor
RAILWAY_URL="$1"

if [ -z "$RAILWAY_URL" ]; then
    echo "Usage: ./railway-monitor.sh <railway-app-url>"
    echo "Example: ./railway-monitor.sh https://foodsuite-production.up.railway.app"
    exit 1
fi

echo "🔍 Monitoring Railway deployment: $RAILWAY_URL"

# Wait for deployment
echo "⏳ Waiting for app to become available..."
for i in {1..30}; do
    if curl -sf "$RAILWAY_URL/api/health" > /dev/null; then
        echo "✅ App is online!"
        break
    fi
    echo "Attempt $i/30 - App not ready yet..."
    sleep 10
done

# Test all endpoints
echo "🧪 Testing API endpoints..."

# Health check
echo "Testing /api/health..."
curl -s "$RAILWAY_URL/api/health" | jq .

# Products count
echo "Testing /api/products..."
PRODUCT_COUNT=$(curl -s -H "x-tenant-id: demo" "$RAILWAY_URL/api/products" | jq '. | length')
echo "Products loaded: $PRODUCT_COUNT"

# Recipes count  
echo "Testing /api/recipes..."
RECIPE_COUNT=$(curl -s -H "x-tenant-id: demo" "$RAILWAY_URL/api/recipes" | jq '. | length')
echo "Recipes loaded: $RECIPE_COUNT"

# AI endpoint
echo "Testing /api/ai/suggest-meals..."
AI_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -H "x-tenant-id: demo" \
    -d '{"mode":"cost_optimized","days":7}' "$RAILWAY_URL/api/ai/suggest-meals")
echo "AI meals suggested: $(echo $AI_RESPONSE | jq '.meals | length')"

echo "🎉 All tests completed!"
echo "🌐 Your FoodSuite is live at: $RAILWAY_URL"