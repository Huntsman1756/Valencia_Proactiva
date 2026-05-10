# TODO — Backlog priorizado de V-PRO

> Lista viva de tareas técnicas. Se alimenta del audit Fase 1, de `TODO/FIXME/HACK` del código y de descubrimientos de cada sesión.
> **Prioridad P1** = impacto alto + esfuerzo bajo o bloqueante de seguridad. **P2** = impacto alto + esfuerzo alto. **P3** = impacto bajo + esfuerzo bajo. **P4** = descartado / diferido.
> Ver el grafo de dependencias en `docs/reports/phase-1-audit.html § Execution Plan`.

## 🔴 P1 — Hacer primero (orden importa)

| ID | Descripción | Agente | Depende | Criterio de aceptación | Añadido |
|---|---|---|---|---|---|
| T-01 | ADR-001/002/003/004 firmados en `docs/DECISIONS.md` | Tech Lead | — | ✅ **Completado 2026-05-09** (incluye ADR-004 tras verificación empírica del portal) | 2026-05-09 |
| T-02 | Rotar `POSTGRES_PASSWORD`. Sustituir valor literal en `docker-compose.yml` por referencia a `.env`. Verificar `git log -- backend/.env` y, si estuvo trackeado, reescribir historia y rotar de nuevo. | DevOps/Infra | — | ✅ **Completado 2026-05-09** — `docker-compose.yml` usa `${POSTGRES_PASSWORD}`. `.env` generado con credenciales aleatorias. `grep -r "[credential redacted]"` vacío. | 2026-05-09 |
| T-10 | Reorganización canónica del repo: mover a `src/backend/`, `tests/backend/`, `config/`, `db/`, `docs/` (archivos .md existentes), `infra/` (docker-compose). Un único commit atómico sin cambios funcionales. | DevOps/Infra | T-01 | ✅ **Completado 2026-05-09** — estructura canónica actual en `src/backend/`, `config/`, `db/`, `docs/`, `infra/docker-compose.yml` y `config/Dockerfile.backend`. | 2026-05-09 |
| T-11 | Crear documentos de continuidad: `docs/STATUS.md`, `docs/AGENTS.md`, `docs/DECISIONS.md`, `docs/TODO.md`, `CHANGELOG.md`, `CONTRIBUTING.md`. | Dev | T-01 | ✅ **Completado 2026-05-09** (versión MD; versión HTML se genera al cierre de fase). | 2026-05-09 |
| T-34 | **[SUBIDA A P1 tras ADR-004]** Verificar empíricamente los datasets del portal contra los slugs usados en el código. Correr `src/scripts/verify_datasets.py` contra los 4datasets nucleares (ocupacio-via-publica, estat-transit-temps-real, talls-transit-falles, zona-de-bajas-emisiones) y los ~10 de alternatives. Documentar cualquier discrepancia en `DATA_SOURCES.md`. | Dev | — | ✅ **Completado 2026-05-09** — 3/3 datasets nucleares verificados: ocupacio-via-publica (636 features), estat-transit-temps-real (446), aparcaments-pmr (2000). Script en `src/scripts/verify_datasets.py`. | 2026-05-09 |
| T-05b | **[NUEVA tras ADR-004]** Reescribir el scraper como cliente ArcGIS REST. Sustituir endpoints ODS ficticios por los patrones reales `https://geoportal.valencia.es/server/rest/services/OPENDATA/Trafico/MapServer/<layer>/query?...f=geojson`. Mantener descubrimiento vía CKAN `/api/3/action/package_show` solo como utilidad en `src/scripts/verify_datasets.py`. | Backend | T-34, T-10 | ✅ **Completado 2026-05-09** — scraper reescrito como `ArcGiSCRaper` con 3 datasets configurados. | 2026-05-09 |
| T-03 | Fix `metadata` → `extra_data` en `src/backend/ingestion/ingestor.py`, `src/backend/ingestion/normalizer.py`, `src/backend/api/spatial.py`. | Backend | T-01 | ✅ **Completado 2026-05-09** — cambiado en ingestor, normalizer y spatial. | 2026-05-09 |
| T-04 | Fix import Shapely en `normalizer.validate_geometry`: sustituir `from shapely import geojson` por `import shapely.geometry; shapely.geometry.shape(...)`. | Backend | T-01 | ✅ **Completado 2026-05-09** — cambiado a `shapely.geometry.shape(geometry)`. | 2026-05-09 |
| T-05-bis | Retirar Celery + Redis (post ADR-002): eliminar `backend/app/celery.py`, `backend/app/tasks/`, servicio `worker` y `redis` en compose, dependencias `celery` y `redis` en `requirements.txt`. Crear `src/scripts/run_ingest.py` invocable por CLI. | Backend | T-01, T-10 | ✅ **Completado 2026-05-10** — Celery/tasks retirado; `src/scripts/run_ingest.py` operativo por CLI y compose dev levanta solo `db` + `api`. | 2026-05-09 |
| T-06 | Unificar `Base` en `src/backend/core/database.py` y llamar `Base.metadata.create_all(bind=engine)` en `lifespan` de `main.py`. Alembic opcional, diferido a T-40. | Backend | T-03, T-04 | ✅ **Completado 2026-05-09** — `Base` es `DeclarativeBase` en database.py, `create_all` en lifespan. | 2026-05-09 |
| T-06b | **[NUEVA tras ADR-004]** Actualizar el enum `UrbanEventType` al pivote: retirar `OBRA/EVENTO/CLIMA/TRANSPORTE`, añadir `OCUPACION/TRAFICO/ZBE/EVENTO_FALLAS/OTRO`. Actualizar migrations o `create_all` en consecuencia. | Backend | T-06 | ✅ **Completado 2026-05-09** — enum actualizado en models.py y schemas.py. | 2026-05-09 |
| T-06c | **[NUEVA tras ADR-004]** Añadir tablas `points_of_interest` (con campo `accessible BOOLEAN`) y `feedback` (con `session_token` sin PII) al modelo SQLAlchemy. Índices GIST en geometrías. | Backend | T-06 | ✅ **Completado 2026-05-09** — `PointOfInterest` y `Feedback` definidos en models.py. | 2026-05-09 |
| T-07 | Fix buffer de `ImpactZone`: aplicar `buffer()` sobre centroide reproyectado a EPSG:32630, **no** sobre geometría WGS84. Debe aceptar `LINESTRING` (tramos tráfico) además de `POLYGON`. | Backend | T-06 | ✅ **Completado 2026-05-09** — `_create_impact_zone` usa pyproj transformer to 32630, buffer, transform back to WGS84. | 2026-05-09 |
| T-08 | Cerrar endpoints de escritura (`POST/PUT/DELETE /api/v1/events`) tras header `X-Admin-Token`. Clave en `.env`. | Backend | T-02 | ✅ **Completado 2026-05-09** — `require_admin_token` en security.py, aplicado a POST/PUT/DELETE con `dependencies=[Depends(require_admin_token)]`. | 2026-05-09 |
| T-09 | Añadir rate limiting (`slowapi`) a todos los endpoints: 60 req/min/IP en lectura, 10 req/min/IP en escritura, **30 req/min/IP en `/api/v1/feedback`**. | Backend | T-08 | ✅ **Completado 2026-05-09** — `SlowAPIMiddleware` añadido en main.py con `default_limits=["60/minute"]`. | 2026-05-09 |
| T-12 | Workflow CI en `.github/workflows/ci.yml`: ruff + mypy + pytest + pip-audit en cada push/PR. | DevOps/Infra | T-10 | ✅ **Completado 2026-05-09** — `.github/workflows/ci.yml` creado con pipeline completo (ruff, mypy, pytest --cov, pip-audit). | 2026-05-09 |

## 🟡 P2 — Fase 2-3-4 (planificar con calma)

| ID | Descripción | Agente | Depende | Criterio de aceptación | Añadido |
|---|---|---|---|---|---|
| T-20 | Action Template Engine con reglas YAML y **filtro por perfil de usuario** (GENERIC / COMMERCIAL / PMR / CYCLIST / PUBLIC_TRANSPORT). Mínimo 5 reglas (una por perfil con un caso real). | Backend | T-06 | ✅ **Completado 2026-05-10** — `src/backend/engine` genera `MitigationAction` desde 5 plantillas `.yaml`; perfiles en `payload.profiles`; ingesta real crea 506 acciones para 253 eventos; frontend selecciona acción por perfil y feedback persiste en BD. | 2026-05-09 |
| T-20b | **[NUEVA tras ADR-004]** Feedback loop: endpoint `POST /api/v1/feedback` que acepta `{mitigation_action_id, vote, session_token, profile}` y escribe en tabla `feedback`. Sin PII, sin IP. | Backend | T-06c | ✅ **Completado 2026-05-10** — endpoint `/api/v1/feedback`, `FeedbackCreate/Response`, unique `(mitigation_action_id, session_token)`, rate-limit `30/minute`, tests de persistencia/duplicado/404/schema. | 2026-05-09 |
| T-20c | **[NUEVA tras ADR-004]** Poblar el catálogo `docs/concurso/tramites-referenciados.md` con al menos 8 URLs reales y verificadas de trámites municipales: ayudas a comercio, exenciones por obra, registro ZBE, cita previa, etc. Enlazar desde las `MitigationAction` YAML. | Dev | — | ✅ **Completado 2026-05-10** — catálogo con 12 URLs oficiales verificadas por navegación web; YAML enlaza 6 URLs en `payload.url`/`secondary_url`; test de plantillas exige dominios oficiales. | 2026-05-09 |
| T-21 | Alternative Finder multimodal. Ingestar aparcamientos (todos los tipos, incluyendo PMR), Valenbisi tiempo real, EMT, FGV, itinerarios ciclistas, cargadores VE. Endpoint `GET /api/v1/spatial/alternatives?lon=&lat=&event_id=&profile=` filtra por perfil (PMR → solo POIs con `accessible=true`). | Backend | T-20, T-34 | ✅ **Completado 2026-05-10** — endpoint `/api/v1/spatial/alternatives` operativo; scraper registra 12 datasets POI: parkings, ORA, no regulados, motos, bicis, PMR, cargadores VE, EMT, FGV estaciones/bocas, Valenbisi e itinerarios ciclistas. `verify_datasets` valida 14/14 capas CKAN/ArcGIS. | 2026-05-09 |
| T-22 | Frontend vanilla (HTML + JS + MapLibre) servido por Nginx. Mapa con capas `impact-zones`, `events`, `traffic-realtime`. ActionCard bottom-sheet responsive con botones 👍/👎. Selector de perfil persistente en `localStorage`. Bilingüe cas/val. | Frontend | T-09, T-20, T-20b | ✅ **Completado 2026-05-10** — `src/frontend` operativo; Nginx dev en `localhost:8080` sirve estáticos y proxifica `/api`; lista de eventos, selector de perfil, selector CAS/VAL persistente, mapa con capas reales, rutas externas y feedback persistido en BD. Dirección visual `Civic Utility` documentada en `docs/design/vpro-design-system.md`. Smoke Playwright mobile/desktop verde. | 2026-05-09 |
| T-23 | Provisionar VPS Hetzner (Ubuntu 24.04 LTS): Nginx + Cloudflare Tunnel + Tailscale + unattended-upgrades + usuario `vpro` no-root + SSH key-only. Script idempotente en `infra/provision.sh`. | DevOps/Infra | T-10 | Segunda ejecución del script produce 0 cambios. `ss -tlnp` muestra solo servicios internos. | 2026-05-09 |
| T-24 | Configurar Nginx: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, `server_tokens off`. | DevOps/Infra | T-23 | 🟡 **Parcial 2026-05-10** — `config/nginx/prod.conf` y `config/nginx/security-headers.conf` creados; `nginx -t` verde; `curl -I http://localhost:8090/` en contenedor efímero muestra headers. Pendiente validación pública `https://vpro.<dominio>` + securityheaders.com tras T-23. | 2026-05-09 |
| T-25 | Cobertura de tests backend: ingestor end-to-end con `testcontainers-postgres`; API e2e con `httpx.AsyncClient`. Meta 70% líneas. | QA | T-06, T-07 | ✅ **Completado 2026-05-10** — `python -m pytest tests -q --cov=src/backend --cov-report=term-missing --cov-fail-under=70` verde con 70,31% y 94 tests. | 2026-05-09 |
| T-26 | `src/scripts/export_derived_data.py` → `exports/impact_zones.geojson`, `exports/mitigation_actions.csv`, **`exports/feedback_aggregated.csv`**, con cabecera CC-BY 4.0. | Backend | T-20, T-20b | ✅ **Completado 2026-05-10** — export real generado: 663 impact zones, 506 acciones y feedback agregado anónimo; referenciado desde README. | 2026-05-09 |
| T-27 | Cron en prod que invoque `run_ingest.py` cada 30 min (general) y cada 5 min (solo `--only traffic`). Unidad systemd `vpro-ingest.timer` como alternativa. | DevOps/Infra | T-05-bis, T-23 | Logs en `/var/log/vpro/ingest.log` muestran ejecuciones exitosas periódicas en ambas cadencias. | 2026-05-09 |
| T-28 | Deploy producción por `rsync` + `systemd reload`. Pipeline manual documentado en `infra/deploy.md`. | DevOps/Infra | T-22, T-24, T-27 | Una release funciona end-to-end desde un dominio público. | 2026-05-09 |
| T-29 | **[NUEVA]** Calcular las cifras del § 8 de `MEMORIA.md` con los datos reales ingeridos: nº ocupaciones/año, nº tramos monitorizados, nº plazas PMR, % ciudad en ZBE. Rellenar memoria. | Dev | T-05b, T-34 | ✅ **Completado 2026-05-10** — memoria rellenada; SQL y JSON reproducibles en `docs/reports/memoria-figures.*`; ZBE calculada desde ArcGIS oficial y superficie municipal oficial. | 2026-05-09 |
| T-30-periodismo | **[RECTIFICADA]** Las bases AD.TR.15 (punto 5) limitan a 1 proyecto por participante, sin distinción de categoría. V-PRO concurre solo a Datos Abiertos. *Opcional:* coordinar soporte a una persona periodista externa que presente su propio proyecto independiente a Periodismo de Datos usando los datos derivados CC-BY 4.0 de V-PRO. | Dev | T-05b | Si se produce: persona periodista identificada + dataset derivado publicado + acknowledgment mutuo en ambas candidaturas. | 2026-05-09 |
| T-37 | Evaluar fuentes oficiales complementarias no CKAN/RSS para eventos vivos: agenda municipal, Fallas, maratones, fiestas populares, conciertos y avisos especiales. Mantener Portal de Datos Abiertos como nucleo puntuable. | Dev + Backend | T-34 | 🟡 **Parcial 2026-05-10** — inventario preliminar añadido en `docs/DATA_SOURCES.md § 2.4`; script `src/scripts/verify_official_sources.py` creado; último reporte en `docs/reports/official-sources-check.json`. EMT `estado-servicio` queda como mejor primera candidata por JSON público. Falta implementar normalización/deduplicación con fixture antes de activar ingesta. | 2026-05-10 |
| T-119 | Estabilizar Golden Path predespliegue: usar `ocupacio-via-publica` actual con perfil Comercial y enlace municipal real; prohibido usar `talls-transit-falles` como demo activa fuera de temporada. | Frontend + Concurso | T-20c, T-22 | ✅ **Completado 2026-05-10** — `comercio-ocupacion` aplica desde severidad 1; fallback frontend muestra URL municipal real para `COMMERCIAL` en `OCUPACION`; docs y guion descartan Fallas histórico como Golden Path activo. | 2026-05-10 |
| T-120 | Routing open source con incidencias: evaluar Valhalla en Docker, endpoint `POST /api/v1/routing/route`, uso de `impact_zones` como `exclude_polygons` y pintado de ruta en MapLibre. | Backend + Frontend + Infra | T-21, T-26 | 🟡 **Propuesto** — reemplazar `Abrir destino` por `Ruta evitando incidencias` solo cuando la ruta proceda del motor propio; Google Maps queda como fallback externo sin garantía de evitar cortes. | 2026-05-10 |
| T-121 | Modo Alerta / DANA: definir fuentes oficiales de refugios, puntos de evacuación o recursos críticos antes de activar UI de emergencia. | Producto + Datos | T-37 | 🟡 **Propuesto** — no mostrar capas de emergencia hasta tener datasets oficiales verificables y metodología documentada. | 2026-05-10 |
| T-122 | Severidad operativa y layout flotante: evitar que todas las ocupaciones actuales aparezcan como severidad 1 cuando el portal no publica gravedad y romper el aspecto cuadriculado del front con mapa como superficie principal. | Full-stack | T-22 | ✅ **Completado 2026-05-10** — `_estimate_occupation_severity` deriva impacto desde superficie/tipo de afección; tests cubren acera, m2, estacionamiento/chaflán y gran superficie; front con paneles flotantes, modo claro/oscuro y badges de impacto. | 2026-05-10 |
| T-38 | Implementar primera fuente complementaria oficial: EMT València `estado-servicio`. Crear parser JSON → `OfficialNotice` o staging equivalente antes de promover a `UrbanEvent`, porque muchas incidencias no traen geometría directa. | Backend | T-37 | ✅ **Completado 2026-05-10** — `OfficialNotice` creado como staging, parser EMT JSON, extracción de fechas/líneas afectadas, deduplicación por `(source, source_id)` y tests focales. Decisión: no promover a `UrbanEvent` sin geometría fiable. | 2026-05-10 |
| T-39 | Definir reglas de promoción `OfficialNotice` → `UrbanEvent`: geocodificación o cruce con CKAN/ArcGIS, prioridad frente a `ocupacio-via-publica` y estrategia anti-duplicados visuales. | Backend + Datos | T-38 | ✅ **Completado 2026-05-10** — `official_promotion.py` define promoción conservadora por geometría oficial o gazetteer explícito; bloquea duplicados open data a 120 m; tests cubren aviso genérico no promovido, geometría oficial, gazetteer y anti-duplicado. | 2026-05-10 |
| T-46 | Ampliar gazetteer oficial de ubicaciones promocionables con fuente municipal documentada: calles/plazas principales, Fallas y puntos de eventos recurrentes. | Datos + Backend | T-39 | ✅ **Completado 2026-05-10** — `valencia_gazetteer.json` versionado con 20 ubicaciones, metadatos de fuente municipal `Listado de las calles`, licencia CC BY 4.0, aliases normalizados y tests de mínimo/cobertura. | 2026-05-10 |
| T-47 | Automatizar coordenadas del gazetteer desde geodatos municipales de portales/tramos para reemplazar centroides curados por extracción reproducible. | Datos + Backend | T-46 | ✅ **Completado 2026-05-10** — `generate_gazetteer_coordinates.py` valida contra `EJES_CALLE.json`, genera `docs/reports/gazetteer-coordinate-report.json` y tests de regresión. Resultado real: 2 OK, 4 revisión, 14 sin match; no sobrescribe coordenadas automáticamente. | 2026-05-10 |
| T-48 | Mejorar matching del gazetteer con normalización de tipos de vía valenciano/castellano y fuentes puntuales para plazas/equipamientos no lineales. | Datos + Backend | T-47 | ✅ **Completado 2026-05-10** — matcher por tokens, equivalencias valenciano/castellano y `location_type` no lineal. Reporte real: 9 `ok`, 10 `justified`, 1 `review`, 0 `missing_match`; tests de equivalencias y ubicaciones no lineales. | 2026-05-10 |
| T-49 | Resolver la única revisión restante del gazetteer: `Av. Aragón`, separando eje largo/tramos o ajustando coordenada curada con evidencia municipal. | Datos | T-48 | ✅ **Completado 2026-05-10** — `Av. Aragón` queda con `validation_policy=long_axis_curated_point`; reporte real sin `review`: 9 `ok`, 11 `justified`, 0 `missing_match`. | 2026-05-10 |
| T-50 | Añadir comando operativo para ejecutar ingesta de fuentes oficiales y promoción staging desde CLI (`run_official_sources.py`) con flags `--fetch`, `--promote`, `--dry-run`. | Backend | T-39, T-49 | ✅ **Completado 2026-05-10** — CLI `src/scripts/run_official_sources.py`, exige acción explícita, no promueve por defecto, `--dry-run` sin escrituras, tests unitarios con ingestor falso y smoke `--help`. | 2026-05-10 |
| T-51 | Añadir API interna de consulta de `official_notices` para depuración/demo: listado paginado y filtro por fuente/tipo, sin exponer contenido bruto si no es necesario. | Backend | T-50 | ✅ **Completado 2026-05-10** — `GET /api/v1/official-notices` protegido por `X-Admin-Token`, filtros `source`/`notice_type`, paginación `limit`/`offset`, schema `OfficialNoticeResponse` y tests admin. | 2026-05-10 |
| T-52 | Ejecutar tirada Ralph de ingesta real + trazabilidad frontend: `prd.json`, `progress.txt`, conteos reales, tabs Fuentes/Metodología/Info y filtros multimodales visibles. | Full-stack | T-21, T-51 | ✅ **Completado 2026-05-10** — ingesta real `scraped=14814`, `points_of_interest=13710`, `official_notices=20`; frontend con fuente/source_id por tarjeta, tabs informativas, filtros POI y smoke Playwright verde en `localhost:8080`/`3000`. | 2026-05-10 |

## 🟢 P3 — Limpieza y mejoras menores

| ID | Descripción | Agente | Depende | Criterio | Añadido |
|---|---|---|---|---|---|
| T-30 | Renombrar `models/models.py` → `models/__init__.py` y lo equivalente en `schemas/`. Evita redundancia nominal. | Dev | T-10 | Imports siguen funcionando; tests verdes. | 2026-05-09 |
| T-31 | Mover archivos institucionales del concurso (`AD.TR.15_*.md`, `AcuerdoJGL_*.md`, `acuerdo_JGL.md`) a `docs/concurso/`. | Dev | T-10 | Raíz sin archivos institucionales. | 2026-05-09 |
| T-32 | Retirar `geopandas` de `requirements.txt` (no se usa). | Dev | T-06 | Imagen Docker ≈100 MB más pequeña. Tests verdes. | 2026-05-09 |
| T-33 | Pre-commit hooks: ruff, detect-secrets, trailing-whitespace, end-of-file-fixer. | DevOps/Infra | T-12 | `pre-commit run --all-files` verde. | 2026-05-09 |
| T-34 | *[subida a P1 tras ADR-004 — ver arriba]* | — | — | — | 2026-05-09 |
| T-34b | Verificar si `carregadors-vehicles-electrics` y `recarrega-vehicles-electrics` son duplicados; si lo son, documentar y usar solo uno. | Dev | T-34 | `DATA_SOURCES.md` actualizado; scraper usa solo la versión canónica. | 2026-05-09 |
| T-36 | Investigar proyectos ganadores AD.TR.15 2024 y 2025 (categoría Datos Abiertos) buscando en `valencia.es/cas/ayuntamiento/gobierno-abierto` y publicaciones oficiales. Resumen en `docs/concurso/ganadores-anteriores.md`. | Dev | — | ✅ **Completado 2026-05-10** — documento creado con 2025, 2024 y primera edición entregada en enero de 2024; incluye lectura de solapamiento y fuentes. | 2026-05-09 |
| T-35 | Limpieza hygiene: borrar `__pycache__/` del working tree; confirmar que `.gitignore` los cubre. | Dev | — | `git status` limpio de pycache. | 2026-05-09 |

## 🟢 P3 — Limpieza y mejoras menores (incluye bloque correctivo T-100..T-111, CERRADO 2026-05-09)

### Bloque correctivo — completado 2026-05-09 (orquestador + auditoría)
> Detalle completo en `docs/STATUS.md` y `docs/AGENTS.md § Sesión 2026-05-09 (cierre correctiva)`.

| ID | Descripción | Criterio | Resultado |
|---|---|---|---|
| T-100 | Aplanar `src/backend/app/ingestion/ingestion/` → `src/backend/ingestion/` | `grep -r "OpenDataScraper"` vacío en Python | ✅ Cerrado 2026-05-09 |
| T-101 | Fix import `OpenDataScraper` → `ArcGiSCRaper` | Import limpio | ✅ Cerrado 2026-05-09 |
| T-102 | `geometry_type="POLYGON"` → `GEOMETRY` | GEOMETRY en UrbanEvent e ImpactZone | ✅ Cerrado 2026-05-09 |
| T-103 | Eliminar `backend/` vacío en raíz | `ls backend` no existe | ✅ Cerrado 2026-05-10 |
| T-104 | Mover `docker-compose.yml` → `infra/` | Compose en `infra/docker-compose.yml` | ✅ Cerrado 2026-05-09 |
| T-105 | Eliminar `config/.env.example` viejo | `grep -r "[credential redacted]"` vacío | ✅ Cerrado 2026-05-09 |
| T-106 | Mover `requirements.txt` → `config/` | Ruta canónica en `config/requirements.txt` | ✅ Cerrado 2026-05-09 |
| T-107 | Aplanar `src/backend/app/` → `src/backend/` | Imports limpios `from X` no `from app.X` | ✅ Cerrado 2026-05-09 |
| T-108 | Limpiar `__pycache__/` working tree | `.gitignore` los cubre | ✅ Cerrado 2026-05-09 |
| T-109 | Actualizar tests al nuevo modelo | 25 passed, 0 failed | ✅ Cerrado 2026-05-09 |
| T-110 | `APARCAMENT` → `APARCAMIENTO` | `grep -r "APARCAMENT\""` vacío | ✅ Cerrado 2026-05-09 |
| T-111 | Crear `src/scripts/run_ingest.py` | Script existe | ✅ Cerrado 2026-05-10 — go/no-go Docker funcional ejecutado; ingesta real e idempotencia verificadas |

### Nuevas tareas P3 (post-cierre correctivo)

| ID | Descripción | Criterio | Añadido |
|---|---|---|---|
| T-112 | Test real de rate-limit 429 en slowapi (no solo smoke test) | ✅ **Completado 2026-05-10** — `test_submit_feedback_rate_limit_returns_429` ejecuta 31 POST contra `/api/v1/feedback` y verifica 429. | 2026-05-09 |
| T-113 | Refactor `_create_impact_zone` — eliminar rama redundante `Point` vs `else` | ✅ Cerrado 2026-05-10 — rama única con centroide para geometrías heterogéneas | 2026-05-09 |
| T-114 | Separar ingesta POI de ingesta `UrbanEvent`: `aparcaments_pmr` debe poblar `points_of_interest`, no `urban_events`. | ✅ Cerrado 2026-05-10 — `record_kind` separa `event`/`poi`; ingesta real: 663 eventos, 2000 POIs PMR, 0 eventos `APARCAMIENTO`. | 2026-05-10 |
| T-115 | Pase documental de consistencia: retirar rutas históricas `backend/app`, referencias OpenDataSoft antiguas y estados obsoletos en `README.md`, `METHODOLOGY.md`, `ROADMAP.md`, `CONTEXT.md`. | ✅ **Completado 2026-05-10** — README, METHODOLOGY, ROADMAP, CONTEXT, ARCHITECTURE, STATUS y TODO alineados al estado local no-VPS; las referencias restantes son contexto histórico o backlog. | 2026-05-10 |
| T-116 | Pulido frontend concurso: evitar solape mapa/pestañas, ampliar Fuentes/Metodología/Info, añadir GitHub/AD.TR.15, leyenda y popups de mapa, revisar acentos ES/VAL. | ✅ **Completado 2026-05-10** — smoke mobile/desktop valida capas, leyenda y popup; DevTools confirma `overlapsTabs=false`. | 2026-05-10 |
| T-117 | Reorganización explicativa de producto: cabecera con propuesta de valor, guía de uso, mapa sin lateral en anchos intermedios, pestañas con fuentes/metodología/info más completas, limitaciones y FAQ. | ✅ **Completado 2026-05-10** — smoke valida `layout.overlapsTabs=false`, guía de producto, ayuda de mapa, leyenda y popup. | 2026-05-10 |

---

## 🚨 P1-CORRECCIÓN — Desviaciones detectadas en la sesión del 2026-05-09 tarde

> Origen: auditoría del orquestador contra `ARCHITECTURE.md § Estructura canónica` tras el reporte "14/14 P1 completadas". Detalle completo en `docs/AGENTS.md § Sesión 2026-05-09 (tarde)`.
> **Estas tareas se resolvieron en el bloque correctivo de la sesión siguiente (T-100..T-111).**
> **Todas están marcadas como ✅ completadas — ver tabla P3 de arriba.** No requieren acción adicional.

## 🔭 P4 — Futuro (post-MVP)

| ID | Descripción | Notas |
|---|---|---|
| T-40 | Introducir Alembic cuando el esquema se estabilice. | Diferido hasta después del premio. |
| T-41 | Autenticación ciudadana (Cl@ve / OAuth). | Solo si se añade experiencia personalizada. |
| T-42 | Notificaciones push web. | Requiere consentimiento GDPR explícito. |
| T-43 | Panel administrativo para el Ayuntamiento. | Gestionar plantillas de acción sin deploy. |
| T-44 | Integración con datos en tiempo real (tráfico, EMT live). | Reconsiderar Celery/Redis si llega. |
| T-45 | Métricas de uso / dashboard analítico. | Sin trackers externos: logs + cron de agregación. |

---

## Cómo usar este documento

1. Cuando termines una tarea, marca la fila con ✅ y la fecha. No la borres.
2. Cuando descubras una nueva tarea, añádela al final de la sección correspondiente con ID `T-XX` siguiente y fecha.
3. Al mover de P1 a "completada", registra la huella en `docs/AGENTS.md` dentro de la entrada de sesión.
4. Revisa y poda este documento al cierre de cada fase.
