#!/usr/bin/env bash
set -euo pipefail

# V-PRO production bootstrap for Hetzner CX23 / Ubuntu LTS.
# Run as root on a fresh server. Secrets are read from /etc/vpro/env after
# creation; this script never writes real secret values.

VPRO_USER="${VPRO_USER:-vpro}"
APP_DIR="${APP_DIR:-/opt/vpro}"
WEB_DIR="${WEB_DIR:-/var/www/vpro}"
ENV_FILE="${ENV_FILE:-/etc/vpro/env}"
SERVER_LABEL="${SERVER_LABEL:-cx23}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y \
  ca-certificates \
  curl \
  git \
  nginx \
  postgresql \
  postgresql-contrib \
  postgresql-postgis \
  postgresql-postgis-scripts \
  python3 \
  python3-venv \
  python3-pip \
  rsync \
  ufw \
  unattended-upgrades

systemctl enable --now postgresql
systemctl enable --now nginx
systemctl enable --now unattended-upgrades

if ! id "${VPRO_USER}" >/dev/null 2>&1; then
  adduser --system --group --home "${APP_DIR}" "${VPRO_USER}"
fi

install -d -o "${VPRO_USER}" -g "${VPRO_USER}" "${APP_DIR}"
install -d -o "${VPRO_USER}" -g "${VPRO_USER}" "${WEB_DIR}"
install -d -o "${VPRO_USER}" -g "${VPRO_USER}" "${WEB_DIR}/exports"
install -d -o "${VPRO_USER}" -g "${VPRO_USER}" /var/log/vpro
install -d -m 0750 /etc/vpro

if [ ! -f "${ENV_FILE}" ]; then
  install -m 0600 /dev/null "${ENV_FILE}"
  cat >"${ENV_FILE}" <<'EOF'
# Fill before starting vpro-api.service.
POSTGRES_PASSWORD=
DATABASE_URL=postgresql://vpro:CHANGE_ME@127.0.0.1:5432/vpro
ADMIN_TOKEN=
CORS_ORIGINS=https://example.com
VPRO_PUBLIC_BASE_URL=https://example.com
EOF
fi
chmod 0600 "${ENV_FILE}"

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname = 'vpro'" | grep -q 1 \
  || sudo -u postgres createuser vpro
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'vpro'" | grep -q 1 \
  || sudo -u postgres createdb -O vpro vpro
sudo -u postgres psql -d vpro -c "CREATE EXTENSION IF NOT EXISTS postgis;"

ufw allow OpenSSH
ufw allow http
ufw --force enable

if grep -q "^#\?PasswordAuthentication" /etc/ssh/sshd_config; then
  sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
else
  echo "PasswordAuthentication no" >> /etc/ssh/sshd_config
fi
if grep -q "^#\?PermitRootLogin" /etc/ssh/sshd_config; then
  sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
else
  echo "PermitRootLogin prohibit-password" >> /etc/ssh/sshd_config
fi
systemctl reload ssh || systemctl reload sshd

echo "Provisioned ${SERVER_LABEL}. Fill ${ENV_FILE}, deploy code, then enable vpro services."
