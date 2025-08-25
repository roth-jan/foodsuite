#!/bin/bash
# Direct update script for EC2

# This script should be run on the EC2 instance to get the full app
cd /home/ec2-user/foodsuite

# Download complete HTML from S3
curl -o foodsuite-complete-app.html https://foodsuite-deployment-1755600259.s3.eu-central-1.amazonaws.com/final.html

# Download all routes
mkdir -p routes
cd routes
for file in auth.js auth-temp.js users.js roles.js products.js suppliers.js orders.js recipes.js inventory.js mealplans.js analytics.js tenants.js invoices.js customers.js ai.js goods-receipts.js price-monitoring.js; do
  curl -O https://foodsuite-deployment-1755600259.s3.eu-central-1.amazonaws.com/routes/$file 2>/dev/null
done

# Download database files
cd ..
mkdir -p database
cd database
for file in db-memory.js canteen-test-data.js article-system.js supplier-articles-data.js migrate-recipes.js auth-schema.js user-management.js postgres-adapter.js db.js db-simple.js postgres-client.js seed-postgres.js schema.sql add-more-data.js; do
  curl -O https://foodsuite-deployment-1755600259.s3.eu-central-1.amazonaws.com/database/$file 2>/dev/null
done

# Download utils
cd ..
mkdir -p utils
curl -o utils/pdf-generator.js https://foodsuite-deployment-1755600259.s3.eu-central-1.amazonaws.com/utils/pdf-generator.js 2>/dev/null

# Download templates
mkdir -p templates
curl -o templates/invoice-template.html https://foodsuite-deployment-1755600259.s3.eu-central-1.amazonaws.com/templates/invoice-template.html 2>/dev/null

# Restart services
sudo systemctl restart foodsuite
sudo systemctl restart nginx

echo "Update complete!"