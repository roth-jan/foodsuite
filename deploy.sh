#!/bin/bash

# FoodSuite Deployment Script for EC2

# Update system
sudo yum update -y

# Install Docker if not already installed
if ! command -v docker &> /dev/null; then
    sudo yum install -y docker
    sudo service docker start
    sudo usermod -a -G docker ec2-user
    sudo systemctl enable docker
fi

# Install Node.js if not already installed
if ! command -v node &> /dev/null; then
    curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
    sudo yum install -y nodejs
fi

# Create application directory
mkdir -p ~/foodsuite
cd ~/foodsuite

# Create necessary files
cat > package.json << 'EOF'
{
  "name": "foodsuite-backend",
  "version": "1.0.0",
  "description": "FoodSuite Backend Server",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "init-db": "node scripts/init-database.js",
    "seed-db": "node scripts/seed-database.js"
  },
  "dependencies": {
    "express": "^4.21.2",
    "cors": "^2.8.5",
    "dotenv": "^17.2.0",
    "joi": "^17.13.3",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "pg": "^8.13.1",
    "uuid": "^10.0.0",
    "pdfkit": "^0.16.2",
    "express-rate-limit": "^7.5.0",
    "helmet": "^8.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.8",
    "jest": "^29.7.0"
  }
}
EOF

# Create .env file
cat > .env << 'EOF'
# Database configuration
DB_TYPE=memory
NODE_ENV=production
PORT=3005
DEFAULT_TENANT_ID=demo
EOF

# Install dependencies
npm install

# Create systemd service for automatic startup
sudo tee /etc/systemd/system/foodsuite.service > /dev/null << EOF
[Unit]
Description=FoodSuite Backend Service
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/foodsuite
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=foodsuite
Environment="NODE_ENV=production"
Environment="PORT=3005"

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable foodsuite
sudo systemctl start foodsuite

# Setup nginx as reverse proxy (optional, for port 80)
sudo amazon-linux-extras install -y nginx1
sudo tee /etc/nginx/conf.d/foodsuite.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Start nginx
sudo systemctl enable nginx
sudo systemctl start nginx

echo "Deployment complete! FoodSuite should be accessible on:"
echo "- Port 3005: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3005"
echo "- Port 80: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"