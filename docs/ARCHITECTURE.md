# ARCHITECTURE — Valencia Proactiva (V-PRO)

> **Arquitectura definitiva (aprobada 2026-05-09).**
> Esta es la referencia canónica del proyecto. Decisiones vivas en [`docs/DECISIONS.md`](./docs/DECISIONS.md).
> Estado operativo en [`docs/STATUS.md`](./docs/STATUS.md). Plan de continuación en [`NEXT_STEPS.md`](./NEXT_STEPS.md).

## 🏗️ Visión del sistema
V-PRO es un motor reactivo orientado a eventos que transforma datos urbanos abiertos en servicios proactivos para la ciudadanía. Tres capas:

1. **Ingestión (El oído)** — cliente HTTP que lee los datasets del portal ODS de Valencia.
2. **Inteligencia (El cerebro)** — PostGIS calcula zonas de impacto; un motor de plantillas genera acciones de mitigación.
3. **Interfaz proactiva (La voz)** — mapa web minimalista que muestra evento + zona de impacto + tarjeta de acción.

## 🛠️ Stack definitivo

### Aplicación
| Capa | Herramienta | Motivo |
|---|---|---|
| Backend HTTP | Python 3.11 + FastAPI + SQLAlchemy 2 + GeoAlchemy2 | Tipado estricto, rendimiento adecuado al MVP, integración nativa con PostGIS vía GeoAlchemy2. Justificado en [ADR-001](./docs/DECISIONS.md). |
| Base de datos | PostgreSQL 15 + **PostGIS** | Núcleo funcional: `ST_DWithin`, `ST_Buffer`, `ST_Transform`. SpatiaLite no garantiza paridad operativa. Justificado en [ADR-001](./docs/DECISIONS.md). |
| Scheduler | **Cron** (host) | Una ingesta cada 30-60 min es batch, no necesita worker persistente. Retirados Celery y Redis. Justificado en [ADR-002](./docs/DECISIONS.md). |
| Procesamiento geoespacial | Shapely + pyproj | Suficiente para las operaciones del proyecto. Retirado GeoPandas (no se usa). |
| Frontend | **Vanilla HTML + CSS + JS** + MapLibre GL JS | Sin Next.js, sin Tailwind, sin Framer Motion. Servido estático por Nginx. Justificado en [ADR-003](./docs/DECISIONS.md). |
| Tiles del mapa | OpenFreeMap (estilo Liberty) | Abierto, gratuito, alineado al stack canonical. |
| Validación / schemas | Pydantic v2 | Ya en el código. |
| Tests | pytest + httpx.AsyncClient + testcontainers-postgres | Cobertura objetivo ≥70% líneas. |
| Linting / tipado | ruff + mypy | En CI. |

### Infraestructura
| Capa | Herramienta | Notas |
|---|---|---|
| VPS | Hetzner CX22 (~4 €/mes) | 2 vCPU · 4 GB RAM · 40 GB SSD — suficiente tras retirar Redis/Celery. |
| SO | Ubuntu 24.04 LTS | Con `unattended-upgrades` activo. |
| Reverse proxy | Nginx | Security headers, rate-limit de segundo nivel, servir el frontend estático. |
| Tunnel | Cloudflare Tunnel | Único ingress. No se abren puertos en el VPS. |
| DNS / SSL | Cloudflare (full strict) | Dominio registrado en Cloudflare Registrar. |
| Red interna | Tailscale | Acceso SSH y operaciones de mantenimiento. |
| Contenedores | Docker Compose (dev) · binarios nativos en prod | Prod puede correr sin Docker si se prefiere simplicidad máxima; Postgres como servicio de sistema, backend como servicio systemd. |
| Secretos | Variables de entorno en `/etc/vpro/env` (root, 0600) | Nunca en git, nunca en imagen. |
| Observabilidad | Logs estructurados (stdout) → journald → rotación estándar | Sin stack de observabilidad externa en MVP. |

### Integraciones externas
| Servicio | Uso | Coste |
|---|---|---|
| Portal Datos Abiertos Valencia (ODS) | Fuente de datasets | Libre |
| AEMET (opcional post-MVP) | Alertas climáticas | Libre con API key |
| API EMT Valencia (opcional post-MVP) | Paradas y líneas | Libre con API key |

### Fuera del stack (eliminados respecto al plan inicial)
- ❌ **Celery** — reemplazado por Cron. Ver [ADR-002](./docs/DECISIONS.md).
- ❌ **Redis** — ya no hace falta sin Celery.
- ❌ **Next.js** — reemplazado por HTML/JS vanilla. Ver [ADR-003](./docs/DECISIONS.md).
- ❌ **Tailwind CSS / Framer Motion** — CSS vanilla con diseño minimalista.
- ❌ **GeoPandas** — no se usa, retirar de `requirements.txt`.

## 📂 Estructura canónica del repositorio
```
/
├── src/
│   ├── backend/              # FastAPI app (ex backend/app)
│   │   ├── api/              # endpoints
│   │   ├── core/             # config, database, settings
│   │   ├── engine/           # Action Template Engine (Fase 2)
│   │   ├── ingestion/        # scraper, normalizer, ingestor
│   │   ├── models/           # SQLAlchemy
│   │   ├── schemas/          # Pydantic
│   │   └── main.py
│   ├── frontend/             # HTML + CSS + JS vanilla + MapLibre (Fase 3)
│   │   ├── index.html
│   │   ├── assets/
│   │   │   ├── app.css
│   │   │   ├── app.js
│   │   │   └── maplibre-gl.js   # vendored o desde jsDelivr pinneado
│   │   └── i18n/             # es.json, val.json
│   └── scripts/              # tools Python (ingesta por cron, exportación)
│       ├── run_ingest.py
│       ├── export_derived_data.py
│       └── verify_datasets.py
├── tests/
│   ├── backend/              # mirror de src/backend
│   └── frontend/             # Playwright (opcional)
├── config/
│   ├── .env.example
│   ├── Dockerfile.backend
│   └── nginx/
│       ├── dev.conf
│       ├── prod.conf
│       └── security-headers.conf
├── db/
│   ├── init.sql              # extensiones PostGIS
│   └── migrations/           # Alembic (opcional post-MVP)
├── docs/
│   ├── STATUS.md + .html
│   ├── AGENTS.md + .html
│   ├── DECISIONS.md + .html
│   ├── TODO.md + .html
│   ├── ARCHITECTURE.md       (este archivo, canonical)
│   ├── CONTEXT.md
│   ├── ROADMAP.md
│   ├── NEXT_STEPS.md
│   ├── MEMORIA.md
│   ├── DATA_SOURCES.md
│   ├── METHODOLOGY.md
│   ├── concurso/             # AD.TR.15_*, AcuerdoJGL_*
│   ├── reports/
│   │   └── phase-1-audit.html
│   └── specs/
├── infra/
│   ├── docker-compose.yml        # dev
│   ├── docker-compose.prod.yml   # prod (opcional si se usa Docker en prod)
│   ├── cloudflare/               # tunnel config
│   ├── systemd/                  # vpro-api.service, vpro-ingest.timer
│   └── provision.sh              # script idempotente de bootstrap del VPS
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── security-audit.yml
├── .gitignore
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

> **Regla.** Cualquier desviación de esta estructura debe pasar por ADR en `docs/DECISIONS.md`.

## 🗺️ Modelo de datos y lógica espacial

### Entidades núcleo
1. **`UrbanEvent`** — tabla `urban_events`.
   - Campos: `id`, `type` (enum `OCUPACION | TRAFICO | ZBE | EVENTO_FALLAS | OTRO`), `title`, `description`, `geometry` (POLYGON o LINESTRING SRID 4326), `start_time`, `end_time`, `severity 1..5`, `source` (p.ej. `opendata_valencia:ocupacio-via-publica`), `source_id`, `extra_data JSONB`, timestamps.
   - Nota: el campo JSON se llama `extra_data` porque `metadata` es palabra reservada en SQLAlchemy declarative.
   - **Tipos reales (post-ADR-004):** `OCUPACION` (festejos/incidencias/obras — dataset `ocupacio-via-publica`), `TRAFICO` (estado tramo en tiempo real, severity derivada del código 0-9), `ZBE` (zona de bajas emisiones), `EVENTO_FALLAS` (cortes de calle por Fallas). El anterior `EVENTO / OBRA / CLIMA / TRANSPORTE` queda deprecado.

2. **`ImpactZone`** — tabla `impact_zones`.
   - Buffer dinámico generado al ingestar: reproyección a EPSG:32630, `buffer(severity × 100 m)` con tope de 500 m, reproyección de vuelta a 4326.
   - Para geometrías `LINESTRING` (tramos de tráfico), se aplica buffer directo en el CRS proyectado.

3. **`MitigationAction`** — tabla `mitigation_actions`.
   - `event_id`, `impact_zone_id`, `action_type` (enum `PARKING_SUGGESTION | ACCESSIBLE_PARKING | ROUTE_CHANGE | PUBLIC_TRANSPORT | BIKE_SUGGESTION | ADMIN_TASK | ZBE_WARNING | ALERT | INFORMATION`), `title`, `description`, `payload JSONB`, `priority`, `profile_filter` (array de perfiles a los que aplica: `GENERIC`, `COMMERCIAL`, `PMR`, `CYCLIST`, `PUBLIC_TRANSPORT`).

4. **`PointOfInterest`** (Fase C) — tabla `points_of_interest`.
   - Aparcamientos (incluyendo PMR), paradas EMT, estaciones FGV, puntos Valenbisi, carriles bici, cargadores VE. `type`, `subtype`, `geometry POINT 4326`, `accessible BOOLEAN`, `realtime_status JSONB` (para Valenbisi), `extra_data JSONB`.
   - Índice GIST en `geometry`.

5. **`Feedback`** (Fase C · nuevo) — tabla `feedback`.
   - `id`, `mitigation_action_id`, `vote` (-1 o +1), `session_token` (aleatorio, rotativo, **sin PII y sin IP**), `profile` (el perfil activo en el momento del voto), `created_at`.
   - Se rate-limita por `session_token` (máx 1 voto por action_id por sesión).
   - El agregado anónimo se publica periódicamente en `exports/feedback_aggregated.csv` bajo CC-BY 4.0.

6. **`OfficialNotice`** — tabla `official_notices`.
   - Capa de validación diferida para fuentes oficiales complementarias sin geometría directa, como EMT València `estado-servicio`.
   - Campos: `source`, `source_id`, `notice_type`, `classification`, `title`, `description`, `url`, `published_at`, `source_updated_at`, `extra_data`.
   - Restricción única `(source, source_id)` para deduplicación. Solo alimenta `urban_events` mediante `promote_staged_official_notices()`, que exige geometría oficial o coincidencia del gazetteer versionado `src/backend/ingestion/data/valencia_gazetteer.json` y bloquea duplicados cercanos del núcleo open data.

### Flujo de consulta espacial
1. El frontend carga `GET /api/v1/events/`, `GET /api/v1/spatial/impact-zones` y `GET /api/v1/spatial/events-layer` para construir la vista operativa.
2. Para el evento seleccionado solicita `GET /api/v1/spatial/alternatives?lon=&lat=&event_id=&profile=&poi_type=`.
3. Backend usa PostGIS para calcular cercanía, descartar alternativas dentro de la zona de impacto cuando aplica y priorizar `accessible=true` si el perfil es PMR.
4. Las `MitigationAction` enlazan acciones administrativas reales cuando existe una URL municipal útil; si no existe, la UI muestra solo referencia informativa.
5. `POST /api/v1/feedback` persiste el voto anónimo y el export publica el agregado en `exports/feedback_aggregated.csv`.
6. `POST /api/v1/spatial/suggestions` se conserva por compatibilidad, pero la interfaz ciudadana usa los endpoints explícitos anteriores.

## 🔄 Pipeline de datos (post-ADR-002 y ADR-004: sin Celery, cliente ArcGIS REST)
```
    opendata.vlci.valencia.es (CKAN)          geoportal.valencia.es (ArcGIS REST)
            │  descubrimiento                         │  recursos GeoJSON reales
            │  (package_list / package_show)          │
            └────────────────────┬────────────────────┘
                                 ▼
                         [cron */30 * * * *]
                                 │
                                 ▼
                    src/scripts/run_ingest.py
                                 │
                                 ▼
                 Scraper (ArcGIS REST client, httpx)
                                 │
                                 ▼
                         Normalizer + Validator
                                 │
                                 ▼
                             Ingestor
                                 │
                                 ▼
                      PostgreSQL + PostGIS
                 (urban_events, impact_zones,
                 mitigation_actions,
                 points_of_interest,
                 official_notices,
                 feedback)
                                 │
                                 ▼
                  FastAPI  /api/v1/events
                          /api/v1/spatial/impact-zones
                          /api/v1/spatial/events-layer
                          /api/v1/spatial/alternatives
                          /api/v1/feedback
                                 │
                                 ▼
                  Frontend vanilla + MapLibre GL JS
                  (eventos · fuentes · metodología · ZBE · feedback)
```

Ejemplo de entrada cron:
```cron
# /etc/cron.d/vpro-ingest
*/30 * * * * vpro /usr/bin/python3 /opt/vpro/src/scripts/run_ingest.py >> /var/log/vpro/ingest.log 2>&1
# Tráfico en tiempo real: cada 5 minutos (solo dataset estat-transit-temps-real)
*/5  * * * * vpro /usr/bin/python3 /opt/vpro/src/scripts/run_ingest.py --only traffic >> /var/log/vpro/ingest.log 2>&1
```

## 🛡️ Seguridad (baseline)
- Rate limiting en todos los endpoints (`slowapi` o middleware propio).
- Endpoints de escritura (`POST/PUT/DELETE /api/v1/events`) detrás de `X-Admin-Token` (header).
- Security headers en Nginx: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- `server_tokens off`.
- SSH key-only. Password auth disabled.
- Todo el tráfico público vía Cloudflare Tunnel (sin puertos abiertos en el VPS).
- Tailscale para acceso administrativo interno.
- Secretos fuera de git: `.env` local ignorado y `config/.env.example` limitado a placeholders.
- `unattended-upgrades` activo.
- CI ejecuta `pip-audit` y `ruff` en cada PR.

## 🌐 Despliegue (prod)
Arquitectura simple, sin orquestador:
- **Nginx** (systemd) sirve `/` estático (frontend vanilla) y hace reverse-proxy de `/api/v1/*` al backend.
- **Backend** (systemd `vpro-api.service`) corre `uvicorn src.backend.main:app` como usuario no privilegiado `vpro`.
- **Postgres/PostGIS** (paquete `postgresql-15-postgis-3`) como servicio de sistema.
- **Cron** (paquete del sistema) ejecuta la ingesta periódica.
- **Cloudflare Tunnel** (`cloudflared` systemd) expone `https://vpro.<dominio>` al exterior.
- **Tailscale** para SSH interno y operaciones de mantenimiento.

Docker se mantiene en **dev** para reproducibilidad del equipo. En **prod** se evalúa correr directamente en systemd (más sencillo, menor footprint) — decisión diferida a Fase 4.

## 🔀 Decisiones vivas (enlaces)
- [ADR-001 · Excepción del canonical stack (Python + PostGIS)](./docs/DECISIONS.md#adr-001)
- [ADR-002 · Retirada de Celery y Redis (scheduler = cron)](./docs/DECISIONS.md#adr-002)
- [ADR-003 · Frontend vanilla en lugar de Next.js](./docs/DECISIONS.md#adr-003)
- [ADR-004 · Pivote de datasets + scraper cliente ArcGIS REST](./docs/DECISIONS.md#adr-004)
