#!/bin/bash
# Update EC2 to use RDS PostgreSQL

# This script should be run on the EC2 instance

# Wait for RDS endpoint
echo "Waiting for RDS endpoint..."
RDS_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier foodsuite-db --region eu-central-1 --query 'DBInstances[0].Endpoint.Address' --output text)

if [ "$RDS_ENDPOINT" == "None" ] || [ -z "$RDS_ENDPOINT" ]; then
    echo "RDS not ready yet. Please run this script again in a few minutes."
    exit 1
fi

echo "RDS Endpoint: $RDS_ENDPOINT"

# Update environment variables
cd /home/ec2-user/foodsuite

# Create new .env file with RDS configuration
cat > .env << EOF
DB_TYPE=postgres
DB_HOST=$RDS_ENDPOINT
DB_PORT=5432
DB_NAME=foodsuite
DB_USER=foodsuite
DB_PASSWORD=FoodSuite2025Secure!
NODE_ENV=production
PORT=3005
DEFAULT_TENANT_ID=demo
EOF

# Install PostgreSQL client for initialization
sudo yum install -y postgresql15

# Wait for database to be ready
echo "Waiting for database connection..."
until PGPASSWORD=FoodSuite2025Secure! psql -h $RDS_ENDPOINT -U foodsuite -d postgres -c '\q' 2>/dev/null; do
    echo "Waiting for database to accept connections..."
    sleep 5
done

# Create database if not exists
PGPASSWORD=FoodSuite2025Secure! psql -h $RDS_ENDPOINT -U foodsuite -d postgres -c "CREATE DATABASE foodsuite;" 2>/dev/null || echo "Database already exists"

# Initialize schema
echo "Initializing database schema..."
PGPASSWORD=FoodSuite2025Secure! psql -h $RDS_ENDPOINT -U foodsuite -d foodsuite < database/schema.sql

# Run seed script
echo "Seeding database..."
node scripts/seed-database.js || echo "Using built-in seed data"

# Restart the application
sudo systemctl restart foodsuite

echo "Update complete! FoodSuite now uses RDS PostgreSQL."
echo "Database: $RDS_ENDPOINT"