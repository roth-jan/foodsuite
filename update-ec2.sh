#!/bin/bash
# Update existing EC2 instance with FoodSuite

# Install AWS CLI if not present
if ! command -v aws &> /dev/null; then
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    sudo ./aws/install
fi

# Download and run deployment script
cd /home/ec2-user
aws s3 cp s3://foodsuite-deployment-1755600259/deploy-ec2.sh . --region eu-central-1
chmod +x deploy-ec2.sh
./deploy-ec2.sh