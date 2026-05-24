#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-/etc/vpro/env}"
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-http://127.0.0.1/exports}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root" >&2
  exit 1
fi

db_pass="$(openssl rand -base64 36 | tr -d '\n')"
admin_token="$(openssl rand -hex 32)"

install -d -m 0750 "$(dirname "${ENV_FILE}")"
cat >"${ENV_FILE}" <<EOF
POSTGRES_PASSWORD=${db_pass}
DATABASE_URL=postgresql://vpro:${db_pass}@127.0.0.1:5432/vpro
ADMIN_TOKEN=${admin_token}
CORS_ORIGINS=*
VPRO_PUBLIC_BASE_URL=${PUBLIC_BASE_URL}
EOF
chmod 0600 "${ENV_FILE}"

sudo -u postgres psql -v password="${db_pass}" >/dev/null <<'SQL'
ALTER USER vpro WITH PASSWORD :'password';
SQL

echo "Configured ${ENV_FILE}"
