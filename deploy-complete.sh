#!/bin/bash
# Deploy complete FoodSuite from S3

cd /home/ec2-user/foodsuite

# Stop existing services
sudo systemctl stop foodsuite || true

# Clean directory but keep node_modules
find . -maxdepth 1 ! -name 'node_modules' ! -name '.' -exec rm -rf {} +

# Download all files from S3
aws s3 sync s3://foodsuite-deployment-1755600259/complete/ . \
  --exclude "*.png" \
  --exclude "*.jpg" \
  --exclude "test-*" \
  --exclude "*.bat" \
  --exclude "*.ps1" \
  --exclude "PredonClient/*" \
  --exclude "PredonWebService/*" \
  --region eu-central-1

# Ensure permissions
chmod -R 755 .
chown -R ec2-user:ec2-user .

# Install missing dependencies
npm install --production

# Restart service
sudo systemctl start foodsuite
sudo systemctl restart nginx

echo "Full deployment complete!"