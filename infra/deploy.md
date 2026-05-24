# Deploy manual a produccion

Servidor objetivo:

- Host SSH local: `vpro-prod`
- Recursos esperados: 2 vCPU, 4 GB RAM, 40 GB disco local

No versionar IPs, IDs de proveedor ni rangos IPv6 en este repositorio. Mantener esos datos en `~/.ssh/config`, variables locales o documentacion privada fuera de git.

## 1. Provisionado base

Ejecutar en el servidor como `root`:

```bash
curl -fsSL https://raw.githubusercontent.com/<org>/<repo>/<branch>/infra/provision.sh -o /root/provision-vpro.sh
bash /root/provision-vpro.sh
```

Si se sube el repo por `rsync` primero:

```bash
bash /opt/vpro/infra/provision.sh
```

Editar `/etc/vpro/env` antes de arrancar servicios:

```bash
POSTGRES_PASSWORD=<secreto>
DATABASE_URL=postgresql://vpro:<secreto>@127.0.0.1:5432/vpro
ADMIN_TOKEN=<secreto>
CORS_ORIGINS=https://<dominio-publico>
VPRO_PUBLIC_BASE_URL=https://<dominio-publico>/exports
```

Aplicar la password al rol de Postgres sin dejarla en el historial de shell:

```bash
read -rsp "POSTGRES_PASSWORD: " VPRO_DB_PASSWORD
echo
sudo -u postgres psql -v password="${VPRO_DB_PASSWORD}" -c "ALTER USER vpro WITH PASSWORD :'password';"
unset VPRO_DB_PASSWORD
```

Alternativa reproducible sin imprimir secretos:

```bash
bash /opt/vpro/infra/configure-env.sh
```

El script genera `POSTGRES_PASSWORD` y `ADMIN_TOKEN`, escribe `/etc/vpro/env` y aplica la password al rol `vpro` en PostgreSQL. Despues, ajustar solo los valores publicos que dependan del dominio o tunnel (`CORS_ORIGINS`, `VPRO_PUBLIC_BASE_URL`) desde el servidor.

## 2. Subida de codigo

Desde la maquina local:

```bash
rsync -az --delete \
  --exclude ".git" \
  --exclude ".venv" \
  --exclude "__pycache__" \
  --exclude ".pytest_cache" \
  --exclude ".mypy_cache" \
  ./ vpro-prod:/opt/vpro/
```

En el servidor:

```bash
cd /opt/vpro
curl -LsSf https://astral.sh/uv/install.sh | sh
UV_PYTHON_INSTALL_DIR=/opt/vpro/.python /root/.local/bin/uv python install 3.12
UV_PYTHON_INSTALL_DIR=/opt/vpro/.python /root/.local/bin/uv venv --python 3.12 .venv
UV_PYTHON_INSTALL_DIR=/opt/vpro/.python /root/.local/bin/uv pip install --python .venv/bin/python -r config/requirements.txt
sudo chown -R vpro:vpro /opt/vpro
```

Nota: en Ubuntu LTS reciente el Python del sistema puede ir por delante de las ruedas disponibles de dependencias geoespaciales. Por eso produccion fija un runtime local 3.12 bajo `/opt/vpro/.python`.

## 3. Nginx y systemd

```bash
sudo install -m 0644 config/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
sudo install -m 0644 config/nginx/prod.conf /etc/nginx/sites-available/vpro
sudo ln -sfn /etc/nginx/sites-available/vpro /etc/nginx/sites-enabled/vpro
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

sudo install -m 0644 infra/systemd/vpro-*.service /etc/systemd/system/
sudo install -m 0644 infra/systemd/vpro-*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now vpro-api.service
sudo systemctl enable --now vpro-ingest.timer
sudo systemctl enable --now vpro-export.timer
```

## 4. Frontend y exports

```bash
sudo rsync -az --delete /opt/vpro/src/frontend/ /var/www/vpro/
sudo mkdir -p /var/www/vpro/exports
cd /opt/vpro
. .venv/bin/activate
python -m src.scripts.export_derived_data
sudo rsync -az --delete /opt/vpro/exports/ /var/www/vpro/exports/
```

Los permalinks publicos quedan bajo:

- `/exports/latest_events.json`
- `/exports/data_health.json`
- `/exports/events/<event_id>.html`

## 5. Verificacion

```bash
systemctl status vpro-api.service --no-pager
systemctl list-timers "vpro-*"
curl -fsS http://127.0.0.1:8000/health
curl -fsSI http://127.0.0.1/
curl -fsS http://127.0.0.1/exports/data_health.json
tail -n 100 /var/log/vpro/ingest.log
tail -n 100 /var/log/vpro/export.log
```

Validacion publica pendiente de dominio/tunnel:

```bash
curl -fsSI https://<dominio-publico>/
curl -fsS https://<dominio-publico>/health
curl -fsS https://<dominio-publico>/exports/latest_events.json
```
