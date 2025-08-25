#!/bin/bash

# FoodSuite Railway Auto-Deploy Script
set -e

echo "🚀 Starting FoodSuite Railway Deployment..."

# 1. Test local Docker build first
echo "📦 Testing Docker build locally..."
docker build -f Railway.Dockerfile -t foodsuite-test .

# 2. Test container startup
echo "🧪 Testing container startup..."
docker run -d --name foodsuite-test -p 3001:3000 -e NODE_ENV=test -e DB_TYPE=memory foodsuite-test
sleep 5

# 3. Health check
echo "❤️ Running health check..."
if curl -f http://localhost:3001/api/health; then
    echo "✅ Health check passed!"
else
    echo "❌ Health check failed!"
    docker logs foodsuite-test
    docker rm -f foodsuite-test
    exit 1
fi

# 4. Cleanup test
docker rm -f foodsuite-test
docker rmi foodsuite-test

# 5. Push to GitHub (if authenticated)
echo "📤 Pushing to GitHub..."
if git push origin main; then
    echo "✅ Git push successful!"
else
    echo "⚠️ Git push failed - use GitHub Desktop"
fi

echo "🎉 Ready for Railway deployment!"
echo "👉 Next: Go to railway.app and deploy from GitHub repo"