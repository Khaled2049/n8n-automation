#!/bin/bash
# Stop on any error
set -e

export N8N_DOMAIN="n8n.novel-sync.com"

# Safety check to ensure the user has changed the domain
if [ "$N8N_DOMAIN" == "n8n.yourdomain.com" ]; then
    echo "ERROR: Please set your domain name in the N8N_DOMAIN variable." >&2
    exit 1
fi

# Log everything for debugging
exec > >(tee /var/log/user-data.log) 2>&1
echo "Starting user-data script at $(date)"

# Update packages using dnf (Amazon Linux 2023 uses dnf)
echo "Updating packages..."
dnf update -y

# --- 1. Install Required Packages ---
# Install Docker (available directly in AL2023 repos - no amazon-linux-extras needed)
echo "Installing Docker..."
dnf install -y docker

# Install Docker Compose (download directly)
echo "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Caddy (download binary directly - most reliable for AL2023)
echo "Installing Caddy..."
CADDY_VERSION=$(curl -s https://api.github.com/repos/caddyserver/caddy/releases/latest | grep -Po '"tag_name": "v\K[^"]*')
curl -L "https://github.com/caddyserver/caddy/releases/latest/download/caddy_${CADDY_VERSION}_linux_amd64.tar.gz" -o /tmp/caddy.tar.gz
tar -xzf /tmp/caddy.tar.gz -C /tmp
mv /tmp/caddy /usr/bin/caddy
chmod +x /usr/bin/caddy

# Create caddy user and group
echo "Setting up Caddy user and directories..."
groupadd --system caddy
useradd --system --gid caddy --create-home --home-dir /var/lib/caddy --shell /usr/sbin/nologin caddy

# Create necessary directories
mkdir -p /etc/caddy
mkdir -p /var/lib/caddy
chown -R caddy:caddy /var/lib/caddy

# Create systemd service file for Caddy
echo "Creating Caddy systemd service..."
cat <<EOF > /etc/systemd/system/caddy.service
[Unit]
Description=Caddy
Documentation=https://caddyserver.com/docs/
After=network.target network-online.target
Requires=network-online.target

[Service]
Type=notify
User=caddy
Group=caddy
ExecStart=/usr/bin/caddy run --environ --config /etc/caddy/Caddyfile
ExecReload=/usr/bin/caddy reload --config /etc/caddy/Caddyfile --force
TimeoutStopSec=5s
LimitNOFILE=1048576
LimitNPROC=1048576
PrivateTmp=true
ProtectSystem=full
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd to recognize the new service
systemctl daemon-reload

# --- 2. Start Services ---
echo "Starting Docker service..."
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# --- 3. Create n8n Directories ---
echo "Creating n8n directories..."
mkdir -p /home/ec2-user/n8n
mkdir -p /home/ec2-user/n8n_data

# --- 4. Configure Caddyfile ---
echo "Configuring Caddyfile..."
cat <<EOF > /etc/caddy/Caddyfile
${N8N_DOMAIN} {
    # Securely proxies traffic to the n8n instance running on port 5678
    reverse_proxy localhost:5678
}
EOF

# --- 5. Configure Docker Compose for n8n ---
echo "Creating Docker Compose configuration..."
cat <<EOF > /home/ec2-user/n8n/docker-compose.yml
version: "3.8"

services:
  n8n:
    image: docker.n8n.io/n8nio/n8n
    restart: always
    ports:
      - "5678:5678"
    environment:
      - NODE_ENV=production
      # This MUST be set to your domain with https for OAuth to work
      - WEBHOOK_URL=https://${N8N_DOMAIN}/
    volumes:
      - /home/ec2-user/n8n_data:/home/node/.n8n
    user: "1000:1000"

EOF

# --- 6. Set Permissions and Start Services ---
echo "Setting permissions..."
chown -R ec2-user:ec2-user /home/ec2-user/n8n
chown -R ec2-user:ec2-user /home/ec2-user/n8n_data

# Enable and start the Caddy service
echo "Starting Caddy service..."
systemctl enable --now caddy

# Wait until the docker socket is available to avoid a race condition
echo "Waiting for Docker daemon to be ready..."
while ! docker info > /dev/null 2>&1; do
    echo "Waiting for Docker daemon to be available..."
    sleep 1
done

# Start n8n using docker-compose
echo "Starting n8n container..."
sudo -u ec2-user sg docker -c 'cd /home/ec2-user/n8n && /usr/local/bin/docker-compose up -d'

echo "User-data script completed successfully at $(date)"
echo "You can check the logs at /var/log/user-data.log"