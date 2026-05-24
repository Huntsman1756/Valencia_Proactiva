# NEXT_STEPS — Plan operativo fase a fase

> **Documento de handoff.** El siguiente agente lee este archivo y sabe exactamente qué hacer.
> Contratos: cada fase tiene una "definición de listo" (DoD). No se avanza a la siguiente hasta que la anterior cumpla su DoD.
> Este plan implementa los ADR ya aprobados en `docs/DECISIONS.md`. No discutir el stack aquí.

---

## 0. Lectura obligatoria antes de tocar nada

En este orden:
1. [`docs/STATUS.md`](./docs/STATUS.md) — dónde está el proyecto ahora.
2. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — stack y estructura canónica.
3. [`docs/DECISIONS.md`](./docs/DECISIONS.md) — ADRs que ya no se discuten (stack, Celery, frontend).
4. [`docs/TODO.md`](./docs/TODO.md) — lista de tareas con IDs y dependencias.
5. [`docs/reports/phase-1-audit.html`](./docs/reports/phase-1-audit.html) — informe visual del estado y grafo de dependencias.
6. [`CONTRIBUTING.md`](./CONTRIBUTING.md) — reglas de trabajo y convenciones de commits.

**Confirma al abrir la sesión que:**
- `git status` está limpio o entiendes el trabajo en curso.
- `git log --oneline -10` te da el pulso de los últimos cambios.
- No hay archivos `.env` sin proteger.

---

## Fase A — Estabilización del repositorio *(dependencia de todo lo demás)*

**Objetivo:** dejar el repo con la arquitectura canónica, seguridad mínima, y CI corriendo. Sin esto, cualquier feature se construye sobre arena.

### A.1 — Seguridad inmediata · **T-02** · DevOps
1. Cambiar `POSTGRES_PASSWORD: [credential redacted]` en `docker-compose.yml` por `${POSTGRES_PASSWORD}`.
2. Generar nueva contraseña con `openssl rand -hex 24` y ponerla en un `.env` local (no trackeado).
3. Lo mismo para `ADMIN_TOKEN` (aún no usada, prepararla para T-08).
4. `git log --all --full-history -- backend/.env` — si devuelve algo, la credencial estuvo trackeada → reescribir historia con `git filter-repo --path backend/.env --invert-paths`, avisar a quien tenga clonado, rotar también cualquier credencial que pudiera haber existido.
5. Verificar: `git ls-files | grep -E '\.env$'` vacío; `grep -r "[credential redacted]" .` vacío.

**DoD:** no hay credenciales literales en código trackeado; nueva password solo en `.env` local del usuario.

### A.2 — Reorganización canónica · **T-10** · DevOps
**Un único commit atómico, sin cambios funcionales.**
```bash
# Crear estructura
mkdir -p src tests config db docs/reports docs/specs docs/concurso infra/nginx infra/cloudflare infra/systemd .github/workflows

# Mover backend
git mv backend/app src/backend
git mv backend/tests tests/backend
git mv backend/Dockerfile config/Dockerfile.backend
git mv backend/.env.example config/.env.example

# Mover DB y compose
git mv init.sql db/init.sql
git mv docker-compose.yml infra/docker-compose.yml

# Mover docs del proyecto
git mv ARCHITECTURE.md CONTEXT.md ROADMAP.md NEXT_STEPS.md MEMORIA.md DATA_SOURCES.md METHODOLOGY.md docs/

# Mover material institucional
git mv AD.TR.15_BasesConvdatosabiertosyperiodismodedatos_2026.md docs/concurso/
git mv AcuerdoJGL_convocatoriaPremios.md docs/concurso/
git mv acuerdo_JGL.md docs/concurso/

# Limpiar backend vacío
rm -rf backend

# Actualizar rutas en compose (context: ./config, dockerfile: Dockerfile.backend) y en README
```
Editar `infra/docker-compose.yml`:
- `api.build.context: ../config`
- `api.build.dockerfile: Dockerfile.backend`
- `api.volumes: ../src/backend:/app/app`
- `db.volumes: ../db/init.sql:/docker-entrypoint-initdb.d/init.sql`
- Eliminar servicios `redis` y `worker` (anticipa A.4).

Editar `config/Dockerfile.backend`:
- `COPY ../src/backend /app/app`

Actualizar referencias a rutas en README, CONTRIBUTING, ARCHITECTURE.

**DoD:** `docker compose -f infra/docker-compose.yml up -d --build` levanta `db` y `api`, `curl http://localhost:8000/health` → 200. `git diff --stat` muestra solo renames + ajustes mínimos de paths.

### A.3 — Unificación de `Base` SQLAlchemy · previo a A.4
- Mover `Base = declarative_base()` de `src/backend/models/models.py` a `src/backend/core/database.py`.
- `models/models.py` importa `from src.backend.core.database import Base`.
- Añadir en `src/backend/main.py` dentro del `lifespan`:
```python
from src.backend.core.database import engine, Base
from src.backend.models import models  # ensure all models are imported before create_all
Base.metadata.create_all(bind=engine)
```
**DoD:** tras `docker compose up -d`, `\dt` en psql lista `urban_events`, `impact_zones`, `mitigation_actions`.

### A.4 — Retirar Celery + Redis · **T-05-bis** · Backend
1. `rm src/backend/celery.py`
2. `rm -r src/backend/tasks/`
3. Editar `config/requirements.txt`: eliminar `celery==5.4.0` y `redis==5.2.0`. Añadir `slowapi==0.1.9` (para T-09).
4. Editar `infra/docker-compose.yml`: eliminar servicios `redis` y `worker`; eliminar puerto `6380`.
5. Eliminar variables `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` de `config/.env.example` y del servicio `api`.
6. Crear `src/scripts/__init__.py` (vacío) y `src/scripts/run_ingest.py`:
```python
"""Standalone ingestion runner invoked by cron."""
import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.backend.ingestion.ingestor import Ingestor

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("vpro.ingest")

def main() -> int:
    ingestor = Ingestor()
    try:
        result = asyncio.run(ingestor.run())
        logger.info("Ingestion completed: %s", result)
        return 0
    except Exception as e:
        logger.exception("Ingestion failed: %s", e)
        return 1

if __name__ == "__main__":
    sys.exit(main())
```
7. En dev, correr manualmente: `docker compose exec api python -m src.scripts.run_ingest` (tras los fixes de A.5).
8. Retirar también `geopandas` de `requirements.txt` (T-32).

**DoD:** `docker compose up` levanta solo `db` + `api`. No quedan referencias a Celery/Redis en el código ni en la infra.

### A.5 — Fixes bloqueantes de ingesta · **T-03 + T-04 + T-07** · Backend

**T-03 — metadata → extra_data:**
- `src/backend/ingestion/ingestor.py`:
  - `metadata=item.get("metadata", {})` → `extra_data=item.get("extra_data", {})`
- `src/backend/ingestion/normalizer.py`:
  - En el dict devuelto por `_normalize_item`, cambiar `"metadata": item.get("metadata", {})` → `"extra_data": item.get("extra_data", {})`
- `src/backend/api/spatial.py`:
  - En el `SELECT` dentro de `get_proactive_suggestions`, cambiar `ue.metadata` → `ue.extra_data`.

**T-04 — Shapely 2.x:**
- `src/backend/ingestion/normalizer.py`:
```python
def validate_geometry(self, geometry: dict) -> bool:
    import shapely.geometry
    try:
        geom = shapely.geometry.shape(geometry)
        return geom.is_valid and not geom.is_empty
    except Exception:
        return False
```

**T-07 — buffer en CRS proyectado:**
- `src/backend/ingestion/ingestor.py::_create_impact_zone`:
```python
from shapely.geometry import Point
from shapely.ops import transform
import pyproj
from geoalchemy2.shape import from_shape

to_utm = pyproj.Transformer.from_crs(4326, 32630, always_xy=True).transform
to_wgs = pyproj.Transformer.from_crs(32630, 4326, always_xy=True).transform

projected_centroid = Point(*to_utm(geometry.centroid.x, geometry.centroid.y))
buffer_distance = min(event.severity * 100, 500)
buffered_projected = projected_centroid.buffer(buffer_distance)
buffered_wgs84 = transform(to_wgs, buffered_projected)

impact_zone = ImpactZone(
    event_id=event.id,
    buffer_distance=buffer_distance,
    geometry=from_shape(buffered_wgs84, srid=4326),
)
session.add(impact_zone)
```

Añadir test `tests/backend/test_buffer.py` verificando diámetro aprox.

**DoD:** `pytest -q` verde; manual ingestion desde `run_ingest.py` inserta al menos 1 evento con su impact zone; query `SELECT ST_Area(geometry::geography) FROM impact_zones` da un valor coherente con el radio esperado.

### A.6 — Seguridad de endpoints · **T-08 + T-09** · Backend

**T-08 — Admin token:**
- Añadir `ADMIN_TOKEN` en `config/.env.example` como placeholder.
- Crear dependency `require_admin_token` en `src/backend/core/security.py`:
```python
from fastapi import Header, HTTPException, status
from src.backend.core.config import settings

def require_admin_token(x_admin_token: str | None = Header(default=None)):
    if not settings.ADMIN_TOKEN or x_admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token")
```
- Aplicar en `src/backend/api/events.py` a `POST`, `PUT`, `DELETE`: `dependencies=[Depends(require_admin_token)]`.

**T-09 — Rate limiting:**
- Instalar `slowapi` (ya añadido en A.4).
- En `main.py`:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
```
- En los endpoints de escritura: `@limiter.limit("10/minute")`.

**DoD:** escribir sin token devuelve 401; exceder el límite devuelve 429 con `Retry-After`.

### A.7 — CI · **T-12** · DevOps
- `.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]
jobs:
  lint-test:
    runs-on: ubuntu-latest
    services:
      db:
        image: postgis/postgis:15-master
        env:
          POSTGRES_USER: vpro
          POSTGRES_PASSWORD: ci_secret
          POSTGRES_DB: vpro_test
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U vpro" --health-interval 10s --health-timeout 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      - run: pip install -r config/requirements.txt ruff mypy pip-audit pytest pytest-cov
      - run: ruff check src tests
      - run: mypy src
      - run: pytest tests -q --cov=src/backend
      - run: pip-audit --strict
```
- `.github/workflows/security-audit.yml` (semanal, `schedule: cron: '0 3 * * 1'`) solo con `pip-audit`.

**DoD:** primer run verde en `main`.

**Cierre de Fase A:** salud pasa a 🟢, `docs/STATUS.md` actualizado, commit `chore: close phase A - repo stabilization`.

---

## Fase B — Fase 1 producto completa (Data Intelligence Foundation)

Prerrequisito: Fase A cerrada.

### B.1 — Verificar datasets reales (T-34, T-05b) · **crítico**
**El portal es CKAN + ArcGIS REST, no OpenDataSoft** — ver ADR-004.

Crear `src/scripts/verify_datasets.py`:
```python
"""Verifica los datasets reales del portal de datos abiertos de Valencia."""
import asyncio, httpx, sys

# CKAN API para descubrimiento
CKAN_BASE = "https://opendata.vlci.valencia.es/api/3/action"
# ArcGIS REST para recursos GeoJSON
ARCGIS = "https://geoportal.valencia.es/server/rest/services"

DATASETS = [
    # (ckan_id, arcgis_service, arcgis_layer, role)
    ("ocupacio-via-publica-ocupacion-via-publica", "OPENDATA/Trafico", 209, "event"),
    ("estat-transit-temps-real-estado-trafico-tiempo-real", "OPENDATA/Trafico", 192, "event"),
    ("aparcaments-persones-mobilitat-reduida-aparcamientos-personas-movilidad-reducida", "OPENDATA/Trafico", 207, "poi"),
    # TODO: completar con zona-de-bajas-emisiones, parkings, valenbisi, emt, fgv, etc.
    # Los layer_id se descubren manualmente visitando la página del dataset.
]

async def main():
    async with httpx.AsyncClient(timeout=30) as c:
        # 1) Verificar que el slug existe en CKAN
        for ckan_id, service, layer, role in DATASETS:
            r = await c.get(f"{CKAN_BASE}/package_show", params={"id": ckan_id})
            ok_ckan = r.status_code == 200 and r.json().get("success")
            # 2) Verificar que el GeoJSON de ArcGIS se descarga y parsea
            url = f"{ARCGIS}/{service}/MapServer/{layer}/query"
            r2 = await c.get(url, params={"where": "1=1", "outFields": "*", "f": "geojson"})
            ok_geo = r2.status_code == 200
            n = len(r2.json().get("features", [])) if ok_geo else 0
            flag = "✓" if (ok_ckan and ok_geo and n > 0) else "✗"
            print(f"{flag} {ckan_id}  ckan={ok_ckan} geo={ok_geo} features={n}")
    return 0

sys.exit(asyncio.run(main()))
```

Si algún dataset devuelve 0 features o el slug no existe, documentar en `DATA_SOURCES.md § Limitaciones` y ajustar o retirar del scraper.

**Reescribir el scraper (T-05b):**
`src/backend/ingestion/scraper_opendata.py` pasa a ser un cliente ArcGIS REST puro:

```python
BASE_GEOPORTAL = "https://geoportal.valencia.es/server/rest/services"

DATASETS = {
    "ocupacion_via_publica": {
        "service": "OPENDATA/Trafico",
        "layer": 209,
        "event_type": "OCUPACION",
    },
    "trafico_tiempo_real": {
        "service": "OPENDATA/Trafico",
        "layer": 192,
        "event_type": "TRAFICO",
    },
    "zbe": {
        "service": "OPENDATA/...",    # verificar layer_id
        "layer": ...,
        "event_type": "ZBE",
    },
    "fallas_cortes": {
        "service": "OPENDATA/...",
        "layer": ...,
        "event_type": "EVENTO_FALLAS",
    },
}

async def fetch_dataset(key: str) -> list[dict]:
    conf = DATASETS[key]
    url = f"{BASE_GEOPORTAL}/{conf['service']}/MapServer/{conf['layer']}/query"
    params = {"where": "1=1", "outFields": "*", "f": "geojson"}
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.get(url, params=params)
        r.raise_for_status()
        return r.json().get("features", [])
```

El normalizer debe mapear el estado del tráfico (0..9) a severity:
```python
TRAFFIC_STATE_TO_SEVERITY = {0: 1, 1: 2, 2: 3, 3: 5, 5: 1, 6: 2, 7: 3, 8: 5}
# 4 (sin datos) y 9 (sin datos paso inferior) → omitir feature
```

### B.2 — Feedback loop (T-20b, T-06c) — nuevo tras ADR-004
Tabla `feedback`:
```python
class Feedback(Base):
    __tablename__ = "feedback"
    id = Column(Integer, primary_key=True)
    mitigation_action_id = Column(Integer, ForeignKey("mitigation_actions.id"), nullable=False)
    vote = Column(Integer, nullable=False)  # -1 o +1
    session_token = Column(String(64), nullable=False, index=True)
    profile = Column(String(32), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```
Endpoint en `src/backend/api/feedback.py`:
```python
@router.post("/feedback")
async def submit_feedback(payload: FeedbackCreate, db: Session = Depends(get_db)):
    # Limitar 1 voto por (session_token, mitigation_action_id)
    existing = db.query(Feedback).filter_by(
        session_token=payload.session_token,
        mitigation_action_id=payload.mitigation_action_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Already voted")
    fb = Feedback(**payload.model_dump())
    db.add(fb)
    db.commit()
    return {"ok": True}
```
Rate limit específico en `main.py`: `@limiter.limit("30/minute")`.

**Script de agregación** (`src/scripts/export_feedback.py`) corre en cron diario:
```sql
SELECT
  ma.action_type,
  ma.title,
  f.profile,
  COUNT(*) FILTER (WHERE f.vote = 1) AS up,
  COUNT(*) FILTER (WHERE f.vote = -1) AS down
FROM feedback f JOIN mitigation_actions ma ON f.mitigation_action_id = ma.id
GROUP BY 1, 2, 3
ORDER BY up DESC;
```
Escribe `exports/feedback_aggregated.csv` con cabecera CC-BY 4.0.

### B.3 — Cobertura de tests (T-25) — QA
- `testcontainers-postgres` en `tests/conftest.py` con PostGIS.
- Test e2e: mockear `httpx` con un GeoJSON fijo de `ocupacio-via-publica`, ingestar, verificar filas.
- Test de `feedback` con rate-limit.
- Test de Alternative Finder con perfil PMR.
- Meta `--cov-fail-under=70`.

**DoD Fase B:** ingesta real funciona contra los 4 datasets nucleares; cobertura ≥70%; tests verdes; tabla `feedback` operativa; `points_of_interest` poblada.

---

## Fase C — Motor proactivo (Fase 2 producto)

### C.1 — Action Template Engine · **T-20** · Backend
- Crear `src/backend/engine/__init__.py`, `src/backend/engine/action_templates.py`.
- Cargar reglas YAML desde `src/backend/engine/templates/*.yaml` al arranque.
- Esquema de regla (ejemplo en `templates/ocupacion-severa.yaml`):
```yaml
id: ocupacion-severa
when:
  event_type: OCUPACION
  severity_gte: 3
actions:
  - action_type: ROUTE_CHANGE
    title: "Ruta alternativa disponible"
    priority: 3
  - action_type: PARKING_SUGGESTION
    title: "Aparcamiento cercano fuera de la zona afectada"
    priority: 2
  - action_type: ADMIN_TASK
    title: "Ayudas municipales para comercios afectados"
    payload:
      url: "https://www.valencia.es/cas/infociudad/obras-ayudas-comercio"
    priority: 1
```
- Firma pública: `generate_actions(event: UrbanEvent, db: Session) -> list[MitigationAction]`.
- Llamar desde `Ingestor._store_events` tras crear la `ImpactZone`.
- Un test por regla.

### C.2 — Alternative Finder · **T-21** · Backend
- Añadir ingesta de aparcamientos y paradas EMT (verificar slugs ODS).
- Modelo `PointOfInterest`, tabla `points_of_interest` con índice GIST.
- Endpoint `GET /api/v1/spatial/alternatives?lon=&lat=&event_id=&type=PARKING|STOP` que devuelva POI cercanos fuera de la `ImpactZone` del evento.

### C.3 — Export de datos derivados · **T-26** · Backend
- `src/scripts/export_derived_data.py` genera:
  - `exports/impact_zones.geojson`
  - `exports/mitigation_actions.csv`
  - `exports/action_templates.yaml` (consolidado)
  - `exports/feedback_aggregated.csv` (agregado anonimo)
- Cabecera: `# Fuente: Portal de Datos Abiertos del Ayuntamiento de València. Datos derivados por V-PRO bajo CC-BY 4.0.`

**DoD Fase C:** ingestando obras reales se generan acciones automáticamente; el export produce archivos válidos referenciados desde el README.

---

## Fase D — Interfaz proactiva (Fase 3 producto)

### D.1 — Scaffolding frontend vanilla · **T-22** · Frontend
Estructura:
```
src/frontend/
├── index.html
├── assets/
│   ├── app.css
│   ├── app.js
│   └── maplibre-gl.js          # pinneado, vendored local o jsDelivr SRI
└── i18n/
    ├── es.json
    └── val.json
```

`index.html` mínimo:
- `<meta charset>`, `<meta viewport>`, `<title>`, favicon.
- Contenedor `<div id="map"></div>` full-viewport.
- `<section id="action-card" class="action-card" hidden>` bottom-sheet.
- `<noscript>` con mensaje accesible.

`app.js`:
- Cargar i18n según `navigator.language` (con fallback a `es`).
- Inicializar MapLibre centrado en Valencia `[-0.3763, 39.4699]` zoom 13.
- Cargar `GET /api/v1/events/`, `GET /api/v1/spatial/impact-zones`, `GET /api/v1/spatial/events-layer` y alternativas con `GET /api/v1/spatial/alternatives?lon=...&lat=...&event_id=...&profile=...`.
- Añadir capas `impact-zones-fill` y `urban-events-point`.
- Click en feature → rellenar y mostrar `#action-card`.

`app.css`:
- Mobile-first. CTA grande en el tercio inferior.
- Colores neutros por defecto; acento solo en `severity≥4`.
- Sin tipografías custom (system fonts).

### D.2 — Servir desde Nginx
En dev local, para probar el frontend:
```bash
cd src/frontend && python -m http.server 3000
# Abrir http://localhost:8080 — Nginx sirve el frontend y proxifica /api/v1 al backend
```
`http://localhost:3000` sigue siendo válido para pruebas con servidor estático Python; `http://localhost:8080` es la ruta preferida porque prueba Nginx.

En prod, Nginx sirve `/var/www/vpro/` estático y proxifica `/api/` al backend (configurar en Fase E).

**DoD Fase D:** Golden Path reproducible a mano: abrir home, mover mapa a una calle con obra, click, ver ActionCard; Lighthouse mobile ≥90 en Perf y Accesibilidad.

---

## Fase E — Despliegue en producción (Fase 4 producto)

### E.1 — Provisionar VPS · **T-23** · DevOps
Hetzner CX23 Ubuntu LTS. `infra/provision.sh` idempotente:
1. `apt update && apt full-upgrade -y && apt install -y unattended-upgrades postgresql-postgis postgresql-postgis-scripts nginx python3 python3-venv`
2. `systemctl enable --now unattended-upgrades`
3. Crear usuario `vpro` no-root con SSH key.
4. `PermitRootLogin no`, `PasswordAuthentication no` en `sshd_config`.
5. Instalar Tailscale (`curl -fsSL https://tailscale.com/install.sh | sh`) y `tailscale up --ssh`.
6. Crear `/opt/vpro` (código), `/var/log/vpro`, `/etc/vpro/env` (0600 root).
7. Crear roles Postgres (`vpro` user + DB `vpro`) con password desde `/etc/vpro/env`.
8. Habilitar extensión PostGIS en la DB.
9. Configurar Cloudflare Tunnel (`cloudflared tunnel login`, `tunnel create vpro`, `tunnel route dns vpro vpro.<dominio>`, fichero `/etc/cloudflared/config.yml`, `systemctl enable --now cloudflared`).

### E.2 — Configurar Nginx · **T-24** · DevOps
`config/nginx/prod.conf`:
```nginx
server_tokens off;

server {
    listen 80;
    server_name _;

    root /var/www/vpro;
    index index.html;

    include /etc/nginx/snippets/security-headers.conf;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_read_timeout 30s;
        proxy_connect_timeout 5s;
    }

    location = /health {
        proxy_pass http://127.0.0.1:8000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
`config/nginx/security-headers.conf`:
```nginx
add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: blob: https://*.openfreemap.org https://*.openstreetmap.org; connect-src 'self' https://*.openfreemap.org; font-src 'self' data:; worker-src 'self' blob:; form-action 'self'; upgrade-insecure-requests" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(self), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Resource-Policy "same-origin" always;
```

Cloudflare Tunnel expone `vpro.<dominio>` → Nginx local. El puerto público definitivo se fija en `T-23` según firewall y tunnel config.

### E.3 — systemd para backend y cron para ingesta
`infra/systemd/vpro-api.service`:
```ini
[Unit]
Description=V-PRO API
After=network.target postgresql.service
Requires=postgresql.service

[Service]
User=vpro
EnvironmentFile=/etc/vpro/env
WorkingDirectory=/opt/vpro
ExecStart=/opt/vpro/.venv/bin/uvicorn src.backend.main:app --host 127.0.0.1 --port 8000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

`/etc/cron.d/vpro-ingest`:
```cron
*/30 * * * * vpro /opt/vpro/.venv/bin/python /opt/vpro/src/scripts/run_ingest.py >> /var/log/vpro/ingest.log 2>&1
```

### E.4 — Deploy manual · **T-28**
`infra/deploy.md`:
```bash
# Desde la máquina del desarrollador
rsync -az --delete --exclude '.venv' --exclude '__pycache__' --exclude 'tests' ./src vpro@<tailscale-ip>:/opt/vpro/
ssh vpro@<tailscale-ip> 'cd /opt/vpro && .venv/bin/pip install -r config/requirements.txt && sudo systemctl restart vpro-api.service'
rsync -az --delete src/frontend/ vpro@<tailscale-ip>:/var/www/vpro/
```

**DoD Fase E:** `https://vpro.<dominio>` responde; `curl -I` muestra security headers; `securityheaders.com` ≥ A; cron ejecuta ingesta cada 30 min con log visible.

---

## Fase F — Entregables del concurso AD.TR.15 (paralelo a Fase C/D)

### F.1 — Memoria oficial Anexo II
- `docs/MEMORIA.md` ya está en borrador (revisada tras ADR-004).
- Descargar el modelo oficial Anexo II desde `www.valencia.es` cuando publique el extracto en el BOP.
- Rellenar el formulario oficial respetando campos y extensión.
- Revisar con alguien externo al equipo técnico para lenguaje inclusivo y claridad.
- **Rellenar el § 8 con cifras reales** (T-29) calculadas sobre los datasets ingestados.

### F.2 — Catálogo de trámites municipales reales (T-20c)
Abrir `docs/concurso/tramites-referenciados.md` (plantilla creada) y rellenar con ≥8 URLs verificadas:
- Ayudas a comercios afectados por obras.
- Exenciones de tasas por ocupación de vía pública.
- Registro para acceso a la Zona de Bajas Emisiones.
- Cita previa para trámites municipales.
- Información oficial sobre Fallas y cortes de tráfico.
- Tarjeta de aparcamiento para personas con movilidad reducida.

Cada URL se cita en al menos una regla YAML del Action Template Engine.

### F.3 — Investigar ganadores anteriores (T-36)
Antes de cerrar la memoria final:
- Buscar en `valencia.es/cas/ayuntamiento/gobierno-abierto` los proyectos premiados en AD.TR.15 de 2024 y 2025.
- Resumir título, URL y enfoque en `docs/concurso/ganadores-anteriores.md`.
- Ajustar el pitch de V-PRO para evitar solapamiento y posicionarse en "la pieza que faltaba".

### F.4 — Grabación del vídeo demo
- Guion (60-120 s):
  1. Problema: "datos pasivos" (un click al portal ODS muestra un mapa estático de ocupaciones).
  2. Solución: "bucle de acción" (V-PRO al lado, la misma información pero con sugerencia por perfil y CTA).
  3. Demo Golden Path: perfil Comercial abre una ocupación actual de `ocupacio-via-publica` → V-PRO muestra zona de impacto, alternativa cercana y enlace municipal real; perfil PMR puede mostrar aparcamiento accesible fuera de la zona.
  4. Feedback: click en 👍, muestra el agregado público.
  5. Arquitectura en 15 s (lean + open).
  6. Llamada a la acción: "V-PRO es una candidatura abierta. El código y los datos derivados están en GitHub bajo MIT y CC-BY 4.0".
- Screen recording + voz. Subtítulos castellano/valenciano.
- Hosting estable (YouTube no listado / Vimeo). Enlazar desde `MEMORIA.md` y `README.md`.

### F.5 — Golden Path de datos demo
- `tests/backend/fixtures/golden_path.py` con escenarios curados:
  1. **Ocupación de vía pública actual** en València → perfil Comercial → enlace municipal real para comercios afectados + alternativa cercana.
  2. **Tramo cortado** en el Puente de las Flores → perfil ciclista → sugerencia Valenbisi con disponibilidad + itinerario ciclista alternativo.
  3. **Aviso ZBE** → perfil comercial → enlace a trámite de registro de vehículo profesional.
- `src/scripts/seed_demo.py` carga estos fixtures para la demo.

### F.6 — Versión valenciana de la UI (T-22 + T-0.13)
- Rellenar `src/frontend/i18n/val.json` con traducción revisada por valencianohablante.
- Selector de idioma visible en la UI (toggle CAS / VAL).
- `<html lang>` dinámico según selección.

### F.7 — Reutilización externa en Periodismo de Datos *(opcional, sin impacto en V-PRO)*

**Rectificación:** las bases AD.TR.15 (punto 5) limitan a 1 proyecto por participante sin distinción de categoría. V-PRO concurre **solo a Datos Abiertos**.

Lo que sí está permitido y es deseable para el criterio 4 (apertura):
- Publicar los datos derivados CC-BY 4.0 en el repo y enlazarlos desde README / MEMORIA.
- Ofrecer soporte técnico (sin compartir autoría) a cualquier persona periodista interesada en producir un reportaje con esos datos y presentarlo como **su propio proyecto independiente** a Periodismo de Datos.
- Mencionar el compromiso en la `MEMORIA.md § 12` como evidencia de que V-PRO habilita ecosistema.

No hay entregables de V-PRO bloqueados por esta decisión.

### F.8 — Presentar la solicitud
- Dentro del plazo de 1 mes desde publicación del extracto en el BOP.
- Documentación administrativa según tipo (persona física, jurídica, agrupación). Ver `CONTEXT.md` y `MEMORIA.md § 11`.
- Sede Electrónica: `https://sede.valencia.es/sede/` → trámite `AD.TR.15`.
- **Una única solicitud** en la categoría Datos Abiertos. Las bases no permiten concurrir a dos categorías con el mismo participante (ver rectificación en F.7).

---

## Criterios de cierre de sesión (todas las fases)

Antes de cerrar tu sesión y dejar handoff al siguiente agente:
1. ✅ Tests verdes.
2. ✅ CI verde en el último commit.
3. ✅ `docs/STATUS.md` actualizado con:
   - Nuevo estado global.
   - Blockers activos (si los hay).
   - Próximas acciones inmediatas con IDs de `docs/TODO.md`.
4. ✅ `docs/AGENTS.md` actualizado con una entrada nueva de la sesión.
5. ✅ `docs/TODO.md` con las tareas completadas marcadas ✅ y las nuevas registradas.
6. ✅ `CHANGELOG.md` actualizado bajo `[Unreleased]`.
7. ✅ Si has tomado una decisión no trivial, ADR nuevo en `docs/DECISIONS.md`.

**Regla de oro:** el repositorio es la memoria. Si algo no está escrito en el repo, no existe para la siguiente sesión.
