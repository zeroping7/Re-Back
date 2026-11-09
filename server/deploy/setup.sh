#!/usr/bin/env bash
# Prepara el servidor Ubuntu 24.04 (Oracle Cloud, ARM) la primera vez. Idempotente.
# Uso: DOMAIN=1-2-3-4.sslip.io bash setup.sh
set -euo pipefail
: "${DOMAIN:?falta DOMAIN}"
export DEBIAN_FRONTEND=noninteractive

if ! command -v node >/dev/null || [[ "$(node -v)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
if ! command -v caddy >/dev/null; then
  sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gnupg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | sudo gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt | sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt-get update && sudo apt-get install -y caddy
fi

# Las imágenes de Oracle traen iptables cerrado: abrir 80 y 443
for p in 80 443; do
  sudo iptables -C INPUT -p tcp --dport $p -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 5 -p tcp --dport $p -j ACCEPT
done
sudo apt-get install -y iptables-persistent >/dev/null 2>&1 || true
sudo netfilter-persistent save || true

sudo sed "s/{DOMAIN}/$DOMAIN/" "$(dirname "$0")/Caddyfile" | sudo tee /etc/caddy/Caddyfile >/dev/null
sudo cp "$(dirname "$0")/re-back.service" /etc/systemd/system/re-back.service
sudo systemctl daemon-reload
sudo systemctl enable re-back caddy
sudo systemctl reload-or-restart caddy
