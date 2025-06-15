#!/bin/bash
# Stop on any error
set -e

yum update -y

# Install and start Docker
yum install -y docker
service docker start
chkconfig docker on

# Add ec2-user to the docker group so they can run docker commands
usermod -a -G docker ec2-user

# Install docker-compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create BOTH directories needed for n8n
mkdir -p /home/ec2-user/n8n
mkdir -p /home/ec2-user/n8n_data

# Create the docker-compose.yml file as root
cat <<EOF > /home/ec2-user/n8n/docker-compose.yml
version: "3.8"

services:
  n8n:
    image: docker.n8n.io/n8nio/n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_SECURE_COOKIE=false
      - NODE_ENV=production
      # Automatically set the webhook URL to this instance's public IP
      - WEBHOOK_URL=http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):5678/
    volumes:
      - /home/ec2-user/n8n_data:/home/node/.n8n
    # Run the container process as user 1000 (ec2-user) to ensure correct volume permissions
    user: "1000:1000"

EOF

# Set ownership for ALL n8n related files and directories to ec2-user
chown -R ec2-user:ec2-user /home/ec2-user/n8n
chown -R ec2-user:ec2-user /home/ec2-user/n8n_data

# Wait a moment for the Docker daemon to be fully ready before use
sleep 5

# Start n8n using a subshell that runs as ec2-user and has the docker group permissions
# This is the most reliable way to ensure permissions are correct.
sudo -u ec2-user sg docker -c 'cd /home/ec2-user/n8n && /usr/local/bin/docker-compose up -d'