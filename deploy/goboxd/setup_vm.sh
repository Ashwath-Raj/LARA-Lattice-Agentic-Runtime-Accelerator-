#!/usr/bin/env bash
# ==============================================================================
# LARA goboxd Sandbox VM Automated Provisioning & Hardening Script
# Target Host: Google Compute Engine (Ubuntu 24.04 LTS / Debian 12 with cgroup v2)
# ==============================================================================

set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

echo "==> Step 1: Updating system packages and installing prerequisites..."
apt-get update && apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    nginx \
    openssl \
    ufw

echo "==> Step 2: Installing Docker Engine..."
if ! command -v docker &> /dev/null; then
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update && apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

echo "==> Step 3: Configuring Local Directories & Permissions..."
mkdir -p /etc/ssl/certs /etc/ssl/private /opt/goboxd /tmp/goboxd-jail
chmod 700 /etc/ssl/private

echo "==> Step 4: Installing NGINX mTLS Configuration..."
cp /opt/goboxd/nginx-mtls.conf /etc/nginx/sites-available/goboxd-mtls.conf
ln -sf /etc/nginx/sites-available/goboxd-mtls.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

echo "==> Step 5: Testing NGINX configuration..."
nginx -t
systemctl restart nginx

echo "==> Step 6: Installing and starting goboxd systemd service..."
cp /opt/goboxd/goboxd.service /etc/systemd/system/goboxd.service
systemctl daemon-reload
systemctl enable goboxd.service
systemctl restart goboxd.service

echo "==> Step 7: Configuring Host Firewall (UFW)..."
ufw default deny incoming
ufw default allow outgoing
# Allow SSH via OS Login / IAP only
ufw allow 22/tcp
# Allow mTLS on port 8443 only
ufw allow 8443/tcp
# Ensure 8080 and 8081 are strictly blocked from external interfaces
ufw deny 8080/tcp
ufw deny 8081/tcp
ufw --force enable

echo "==> Sandbox VM bring-up complete. Service listening on 127.0.0.1:8081, fronted by NGINX mTLS on :8443"
