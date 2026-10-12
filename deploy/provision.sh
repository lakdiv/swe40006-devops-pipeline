#!/usr/bin/env bash
# Prepares a fresh Amazon Linux 2023 instance as the FixLog Docker host.
# Run once as ec2-user:  sudo bash provision.sh
set -euo pipefail

echo "== Updating packages and installing Docker, Git, rsync and OpenSSL"
dnf update -y
dnf install -y docker git rsync openssl
systemctl enable --now docker

echo "== Installing the Docker Compose plugin (not included in the AL2023 docker package)"
mkdir -p /usr/local/lib/docker/cli-plugins
curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

echo "== Adding a 2 GiB swap file"
if [ ! -f /swapfile ]; then
  dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap defaults 0 0' >> /etc/fstab
fi

echo "== Creating the deploy user"
id deploy &>/dev/null || useradd -m -s /bin/bash deploy
usermod -aG docker deploy
usermod -aG docker ec2-user
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
# Allow the same key pair to log in as deploy. The GitHub deploy key is added in Week 10.
cp /home/ec2-user/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys

echo "== Hardening SSH: keys only, no root login"
cat > /etc/ssh/sshd_config.d/01-hardening.conf <<'EOF'
PasswordAuthentication no
PermitRootLogin no
EOF
systemctl reload sshd

echo "== Shared network for monitoring"
docker network inspect monitoring >/dev/null 2>&1 || docker network create monitoring

echo
echo "== Done. Versions:"
docker --version
docker compose version
swapon --show
