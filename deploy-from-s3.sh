#!/bin/bash
# Quick deployment from S3

# Download frontend
cd /home/ec2-user/foodsuite
curl -o foodsuite-complete-app.html https://foodsuite-deployment-1755600259.s3.eu-central-1.amazonaws.com/index.html

# Fix nginx config
sudo tee /etc/nginx/conf.d/foodsuite.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;
    
    location = / {
        root /home/ec2-user/foodsuite;
        try_files /foodsuite-complete-app.html =404;
    }
    
    location /api {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo systemctl restart nginx
echo "Deployment complete!"