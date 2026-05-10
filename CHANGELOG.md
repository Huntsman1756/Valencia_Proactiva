# Changelog

Todas las modificaciones relevantes del proyecto V-PRO se documentan aquí.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto adopta [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Added - Exports, cifras y tramites oficiales - 2026-05-10
- Cerrado T-26 con `src/scripts/export_derived_data.py` y exports CC-BY 4.0: 663 `impact_zones`, 506 `mitigation_actions` y feedback agregado anonimo.
- Cerrado T-29 con cifras reproducibles para `docs/MEMORIA.md`: 253 ocupaciones, 410 tramos de trafico, 2.161 plazas/registros PMR y ZBE 27,44 km2 (20,38% del termino municipal).
- Cerrado T-20c con `docs/concurso/tramites-referenciados.md`: 12 URLs oficiales verificadas y plantillas YAML enlazando tramites municipales reales.
- Anadidos `docs/reports/memoria-figures.sql` y `docs/reports/memoria-figures.json`.

### Added - Tirada Ralph ingesta y trazabilidad frontend - 2026-05-10
- Anadidos `prd.json` y `progress.txt` para ejecutar la tirada con PRD y progreso estilo Ralph.
- Ejecutada ingesta real en Docker contra 14 datasets: `scraped=14814`, `normalized=14814`, `stored_pois=11710`, `skipped_duplicates=3104`, `errors=0`; BD final con `urban_events=663` y `points_of_interest=13710`.
- Ejecutada fuente oficial EMT `estado-servicio`: dry-run OK, fetch real con 20 avisos en `official_notices`, y promocion dry-run sin candidatos por falta de geometria fiable.
- Frontend: anadidas tabs `Eventos`, `Fuentes`, `Metodologia` e `Info`.
- Frontend: cada tarjeta muestra fuente, `source_id` y ultima actualizacion.
- Frontend: anadidos filtros de alternativas por tipo POI para PMR, parking, Valenbisi, EMT, FGV, metro/bocas, bici, carril bici y cargadores VE.
- Smoke Playwright ampliado para cubrir tabs informativas, fuente visible y filtro Valenbisi; capturas mobile/desktop actualizadas.

### Added — Alternative Finder multimodal y API admin avisos · 2026-05-10
- Cerrado T-21: añadidos datasets POI multimodales para parkings, ORA, no regulados, motos, bicis, PMR, cargadores VE, EMT, FGV estaciones/bocas, Valenbisi e itinerarios ciclistas.
- `verify_datasets.py` valida los 14 datasets configurados desde `DATASETS`.
- Mejorada extracción de títulos, descripciones y `source_id` para campos reales de ArcGIS.
- Cerrado T-51: añadido `GET /api/v1/official-notices`, protegido por `X-Admin-Token`, con filtros `source`/`notice_type` y paginación.
- Añadidos tests de scraper multimodal, verificador de datasets y API admin de avisos.

### Added — CLI fuentes oficiales · 2026-05-10
- Añadido `src/scripts/run_official_sources.py` con flags `--fetch`, `--promote` y `--dry-run`.
- Añadido preview de promociones staging sin escritura en `Ingestor.preview_staged_official_notice_promotions()`.
- Añadidos tests del CLI con ingestor falso, sin red ni BD real.
- Documentado el uso operativo en `docs/METHODOLOGY.md`.
- Creada T-51 para valorar una API interna/admin de consulta de `official_notices`.

### Changed — Gazetteer sin revisiones pendientes · 2026-05-10
- Añadida política `long_axis_curated_point` para justificar ejes largos cuyo centroide municipal no representa bien el punto operativo.
- `Av. Aragón` queda justificada con evidencia municipal y el reporte del gazetteer pasa a `ok=9`, `justified=11`, `review=0`, `missing_match=0`.
- Creada T-50 para añadir CLI operativo de ingesta/promoción de fuentes oficiales.

### Changed — Matching gazetteer mejorado · 2026-05-10
- Mejorado `generate_gazetteer_coordinates.py` con matching por tokens y equivalencias de tipos de vía valenciano/castellano.
- Añadido `location_type` al gazetteer para distinguir ejes lineales de barrios, equipamientos, hitos y nodos de transporte.
- Regenerado `docs/reports/gazetteer-coordinate-report.json` con resultado `ok=9`, `justified=10`, `review=1`, `missing_match=0`.
- Añadidos tests de equivalencias `plaza/plaça`, `avenida/avinguda` y ubicaciones no lineales.
- Creada T-49 para resolver `Av. Aragón`.

### Added — Coordenadas reproducibles del gazetteer · 2026-05-10
- Añadido `src/scripts/generate_gazetteer_coordinates.py` para validar el gazetteer contra `EJES_CALLE.json`.
- Generado `docs/reports/gazetteer-coordinate-report.json` con 12.982 tramos procesados y resumen `ok=2`, `review=4`, `missing_match=14`.
- Añadidos tests con fixture local para el reporte de coordenadas.
- Aligerado `ingestion/__init__.py` para evitar importar el ingestor y configuración de BD al usar utilidades de ingesta.
- Creada T-48 para mejorar matching de tipos de vía y fuentes puntuales.

### Added — Gazetteer versionado · 2026-05-10
- Añadido `src/backend/ingestion/data/valencia_gazetteer.json` con 20 ubicaciones iniciales para promoción conservadora de avisos oficiales.
- `official_promotion.py` carga aliases y coordenadas desde el gazetteer versionado en lugar de un diccionario hardcoded.
- Documentada la fuente municipal `Listado de las calles` del Portal de Datos Abiertos del Ayuntamiento, con licencia CC BY 4.0.
- Añadidos tests de tamaño mínimo, licencia, fuente CKAN, aliases normalizados y confianza mínima.
- Creada T-47 para automatizar coordenadas desde geodatos municipales.

### Added — Promoción conservadora de avisos oficiales · 2026-05-10
- Añadido `official_promotion.py` para convertir `OfficialNotice` en candidatos `UrbanEvent` sólo con geometría oficial o gazetteer explícito.
- Añadido bloqueo anti-duplicado frente a eventos open data cercanos a 120 m.
- Añadido `Ingestor.promote_staged_official_notices()` como paso controlado fuera de la ingesta normal.
- Añadidos tests para aviso genérico sin promoción, promoción por gazetteer, promoción por geometría oficial y deduplicación.
- Creada T-46 para ampliar el gazetteer con fuente municipal documentada.

### Added — EMT estado-servicio staging · 2026-05-10
- Añadido modelo `OfficialNotice` para fuentes oficiales complementarias sin geometría directa.
- Añadido parser/cliente de EMT València `estado-servicio` con extracción de fechas, líneas afectadas y clasificación conservadora.
- Añadida ingesta staging separada mediante `Ingestor.run_official_sources()` y deduplicación por `(source, source_id)`.
- Añadidos tests focales para parser EMT, HTML, líneas afectadas y deduplicación.
- Documentada la decisión: EMT no se promociona a `UrbanEvent` hasta definir reglas fiables de geometría en T-39.

### Added — Politica de fuentes oficiales complementarias · 2026-05-10
- Documentada en `docs/DATA_SOURCES.md` y `docs/METHODOLOGY.md` la posibilidad de usar RSS, calendarios o paginas oficiales como fuentes complementarias para eventos vivos, manteniendo el Portal de Datos Abiertos como nucleo del proyecto.
- Anotado en `docs/TODO.md` el nuevo `T-37` para evaluar fuentes oficiales de Fallas, maratones, fiestas populares, conciertos y avisos especiales.
- Añadido inventario preliminar `docs/DATA_SOURCES.md § 2.4` con RSS/Agenda/Actualidad Ayuntamiento, Fallas/JCF, EMT Última Hora, Cultural València y maratón/carreras, incluyendo estado de verificación y riesgo.
- Añadido `src/scripts/verify_official_sources.py` y reporte `docs/reports/official-sources-check.json` para verificar endpoints oficiales complementarios.

### Added — Direccion visual Civic Utility · 2026-05-10
- Creado `docs/design/vpro-design-system.md` como guia obligatoria para evitar estetica generica de IA en el frontend.
- Actualizados `AGENTS.md` y `docs/specs/frontend-vpro.md` para exigir la direccion **Civic Utility / Operativa Ciudadana** antes de futuras iteraciones UI.
- Aplicada primera pasada visual en `src/frontend`: fondo plano, sombras reducidas, severidad como badge operativo, tarjetas menos genericas y numericos tabulares.

### Changed — Ajuste de cabecera frontend · 2026-05-10
- Refinado el layout de la cabecera responsive: en mobile la marca y CAS/VAL quedan en la primera fila, los perfiles en la segunda; en desktop la cabecera ocupa el ancho útil completo y el selector de idioma queda alineado a la derecha.
- Separados semánticamente `topbar-main`, `profile-selector` y `language-selector` para evitar que perfiles largos como `Transporte` compriman el selector CAS/VAL.
- El smoke frontend captura las pantallas antes de disparar feedback, manteniendo la validación de persistencia pero dejando reportes visuales limpios.

### Added — Nginx producción parcial · 2026-05-10
- Añadidos `config/nginx/prod.conf` y `config/nginx/security-headers.conf` con CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy` y `server_tokens off`.
- Configuración validada con `nginx -t` en `nginx:1.27-alpine` y `curl -I` contra contenedor efímero local.

### Added — Feedback loop y validación funcional · 2026-05-10
- Implementado `POST /api/v1/feedback` con payload `{mitigation_action_id, vote, session_token, profile}`.
- Añadidos schemas `FeedbackCreate` y `FeedbackResponse`.
- Añadida restricción única `(mitigation_action_id, session_token)` para permitir un voto por acción y sesión.
- Rate-limit específico del endpoint de feedback: `30/minute`.
- Tests añadidos para schema, persistencia, duplicado `409` y acción inexistente `404`.
- Endpoint inicial `GET /api/v1/spatial/alternatives` para devolver POIs cercanos, con filtro accesible automático para perfil `PMR`.
- `GET /api/v1/spatial/alternatives` acepta `event_id` y excluye POIs dentro de la `ImpactZone` más reciente del evento.
- `AGENTS.md` raíz creado con reglas operativas obligatorias para futuras sesiones.
- Spec formal `docs/specs/frontend-vpro.md` con las decisiones UX firmadas para V-PRO.
- Primer frontend vanilla en `src/frontend`: lista de eventos, selector de perfil persistente, ActionCards equilibradas, MapLibre compacto/expandible, rutas externas y feedback persistido cuando hay acción asociada.
- Añadidos endpoints de capas espaciales `GET /api/v1/spatial/impact-zones` y `GET /api/v1/spatial/events-layer` para servir GeoJSON válido al mapa.
- El mapa del frontend pinta capas reales `impact-zones`, `traffic-realtime`, eventos y alternativas.
- Smoke test Playwright `tests/frontend/smoke.mjs` con capturas mobile/desktop en `docs/reports/`.
- Action Template Engine inicial en `src/backend/engine` con 5 plantillas `.yaml` y cobertura de perfiles `GENERIC`, `COMMERCIAL`, `PMR`, `CYCLIST`, `PUBLIC_TRANSPORT`.
- La ingesta crea `MitigationAction` asociadas a eventos e `ImpactZone`.
- `GET /api/v1/events` devuelve `mitigation_actions`; el frontend selecciona la acción aplicable al perfil activo.
- El feedback del frontend ya persiste en BD cuando existe acción asociada.
- Runtime bilingüe CAS/VAL en el frontend con selector persistente en `localStorage`.
- Nginx dev añadido a Docker Compose (`frontend` en `localhost:8080`) para servir `src/frontend` y proxificar `/api/` al backend.

### Fixed — Ingesta Docker y calidad de datos · 2026-05-10
- `config/Dockerfile.backend` e `infra/docker-compose.yml` ahora incluyen `src/scripts` dentro del contenedor, por lo que `python -m scripts.run_ingest` funciona.
- Parser de fechas ArcGIS acepta timestamps en milisegundos.
- `source_id` de ArcGIS ahora usa campos reales (`id_incidencia`, `idtramo`, `fiwareid`, `objectid`, `gid`) con prefijo de dataset.
- La ingesta separa `skipped_duplicates` de `errors` para no reportar duplicados como fallos.
- `_create_impact_zone` simplificado: una sola rama basada en centroide.
- `aparcaments_pmr` deja de poblar `urban_events`: ahora se almacena como `PointOfInterest` accesible en `points_of_interest`.
- `docs/RULES-FOR-AGENTS.md` endurecido con regla de destino de dataset (`record_kind=event|poi`) y verificación por tabla/tipo.
- Añadido `mypy.ini`; `ruff`, `mypy` y `pytest` pasan localmente.
- Actualizadas dependencias vulnerables: `fastapi==0.136.1`, `python-multipart==0.0.27`, `python-dotenv==1.2.2`; `pip-audit -r config/requirements.txt --strict` queda verde.
- CI ajustado para auditar `config/requirements.txt` explícitamente.
- Eliminado `backend/` vacío y limpiados `__pycache__/`.

### Changed — Ajuste de reglas para agentes tras cierre correctivo · 2026-05-09 (orquestador, post-cierre)
- **`docs/RULES-FOR-AGENTS.md` ampliado con dos secciones nuevas:**
  - **§ 10 Entorno de trabajo:** documenta Opencode CLI + Qwen 3.6 sobre Windows como entorno por defecto del agente ejecutor. Implica reglas específicas para PowerShell vs POSIX, file locks de Windows, rutas largas (`\\?\`), CRLF vs LF.
  - **§ 11 Verificaciones bloqueadas por entorno:** protocolo explícito para cuando el agente no puede ejecutar Docker, CI o BD real. Obliga a distinguir verificación *estructural* (siempre ejecutable) de *funcional* (puede estar bloqueada) y prohíbe declarar ✅ sin ejecutar. Incluye subregla para file locks de Windows: directorio vacío residual es `⚠️ residual` no `🔴 bloqueante`.
- **§ 9 checklist** refinado: los items de "backend arranca sin errores" y "CI verde" ahora remiten a § 11 cuando la verificación funcional no se puede ejecutar.
- `docs/STATUS.md § Métricas clave` corregido: tests `25 passed, 0 failed` (antes decía "2 archivos desactualizados"); CI correctamente descrito como "workflow existe, primer run pendiente".
- `docs/STATUS.md § Última actualización` apunta a la sesión de cierre actual.
- `docs/AGENTS.md` → post-script documentando los ajustes en la sesión de cierre.

### Fixed — Cierre del bloque correctivo T-100..T-111 · 2026-05-09 (auditoría)
- **Bloque correctivo completado.** Todas las tareas T-100..T-111 cerradas.
- **Salud del proyecto corregida de 🔴 Critical → 🟢 Stable.** Fase A (Estabilización del repositorio) clausurada.
- **Cambios estructurales principales:**
  - `src/backend/app/ingestion/ingestion/` → `src/backend/ingestion/` (T-100).
  - `OpenDataScraper` → `ArcGiSCRaper` en todos los imports (T-101).
  - `geometry_type="POLYGON"` → `GEOMETRY` en UrbanEvent e ImpactZone (T-102).
  - `src/backend/app/` → `src/backend/` aplanado, todos los imports `from app.X` → `from X` (T-107).
  - `docker-compose.yml` movido a `infra/` con paths relativos actualizados (T-104).
  - `requirements.txt` movido a `config/`, Dockerfile y CI actualizados (T-106).
  - `config/.env.example` eliminado (T-105).
  - `__pycache__/` limpiados, cubiertos por `.gitignore` (T-108).
  - `UrbanEventType.APARCAMENT` → `APARCAMIENTO` (T-110).
  - `src/scripts/run_ingest.py` creado con `asyncio.run(Ingestor().run())` (T-111).
  - Tests actualizados: **25 passed, 0 failed** (T-109).
- **Pendiente de validación end-to-end:** `run_ingest.py` no se pudo ejecutar contra BD real (Docker sin conectividad en entorno de auditoría). Procedimiento documentado para ejecutar en entorno funcional.
- **Tareas creadas:** T-112 (P3 — slowapi rate limit test real), T-113 (P3 — refactor `_create_impact_zone`).

### Added — Reglas para agentes · 2026-05-09 (orquestador)
- `docs/RULES-FOR-AGENTS.md` creado. Contiene el protocolo de cierre de sesión, reglas de reorganización de archivos, reglas de modelos de datos, seguridad, tests/CI, y ADRs. Lectura obligatoria al iniciar cualquier sesión nueva.
- Actualización de `docs/AGENTS.md`, `docs/TODO.md`, `docs/STATUS.md` con la auditoría y las tareas correctivas.

### Executed (reportado, con desviaciones) — 2026-05-09 (tarde)
- **T-34** ✅ verificación empírica de datasets (636/446/2000 features para ocupación / tráfico / aparcamientos PMR).
- **T-02** credenciales rotadas y en `.env` no trackeado.
- **T-10** reorganización parcial (movimiento de backend/app → src/backend/app, MDs → docs/, material institucional → docs/concurso/). **Falta aplanamiento de `app/` y mover compose a `infra/`.**
- **T-05b** scraper reescrito como `ArcGiSCRaper` cliente ArcGIS REST. Verificado contra geoportal real.
- **T-06b** enum `UrbanEventType` → {OCUPACION, TRAFICO, ZBE, EVENTO_FALLAS, APARCAMENT, OTRO}. **Inconsistencia de idioma — T-110.**
- **T-06c** modelos `PointOfInterest` (con `accessible`) y `Feedback` (con `session_token`) creados.
- **T-03** rename `metadata → extra_data` aplicado.
- **T-04** import Shapely corregido (`shapely.geometry.shape`).
- **T-06** `Base` en `core/database.py`, `create_all` en lifespan de `main.py`.
- **T-07** buffer reproyectado EPSG:32630 → buffer → vuelta a WGS84.
- **T-05-bis** `celery.py`, `tasks/`, servicios `redis`/`worker` eliminados. `celery`/`redis` retirados de `requirements.txt`. **Pendiente creación de `run_ingest.py` (T-111).**
- **T-08** `security.py` con `require_admin_token`; POST/PUT/DELETE de eventos protegidos.
- **T-09** `slowapi` con `default_limits=["60/minute"]` y handler 429.
- **T-12** `.github/workflows/ci.yml` creado.

### Fixed — Rectificación sobre candidatura paralela · 2026-05-09
- **Las bases AD.TR.15 (punto 5) limitan a 1 proyecto por participante**, sin distinción de categoría. La propuesta anterior de candidatura paralela a Periodismo de Datos era incompatible con las bases y queda retirada.
- V-PRO concurre **exclusivamente a la categoría Datos Abiertos**.
- Reformulación en `MEMORIA.md § 12`: V-PRO publica datos derivados CC-BY 4.0 e invita a periodistas externos a producir sus propios reportajes independientes (ellos como participantes distintos).
- Rectificaciones coherentes en `ROADMAP.md § Task 0.17`, `docs/TODO.md § T-30-periodismo`, `NEXT_STEPS.md § F.7/F.8`.

### Added — Pivote de datasets y ampliación del alcance · 2026-05-09 (continuación)
- **ADR-004** firmado en `docs/DECISIONS.md`: pivote de datasets tras verificación empírica del portal. El portal es CKAN + ArcGIS REST (no OpenDataSoft como se asumió inicialmente).
- `DATA_SOURCES.md` reescrito con datasets reales verificados: `ocupacio-via-publica` (layer 209), `estat-transit-temps-real` (layer 192, HVD europeo cada 3 min), `talls-transit-falles`, `zona-de-bajas-emisiones`, familia de aparcamientos (incluyendo PMR), Valenbisi tiempo real, EMT, FGV, rutas accesibles, itinerarios ciclistas, cargadores VE.
- `MEMORIA.md` reescrita con pivote a **plataforma de movilidad proactiva** y ángulo explícito de accesibilidad como caso de uso primario (no accesorio). Añadida § 12 con opción de candidatura paralela a Periodismo de Datos.
- `ARCHITECTURE.md` actualizado: nuevos tipos de evento (`OCUPACION`, `TRAFICO`, `ZBE`, `EVENTO_FALLAS`), nueva tabla `points_of_interest` con campo `accessible`, nueva tabla `feedback` con `session_token` sin PII, pipeline reescrito como cliente ArcGIS REST.
- `CONTEXT.md` sin la palabra "predictivo" (no se ajustaba a la realidad del sistema). Añadidos 5 perfiles de usuario (Genérico, Comercial, PMR, Ciclista, Transporte público).
- `ROADMAP.md` con Fase 0 ampliada (T-0.14 trámites, T-0.15 cifras, T-0.16 ganadores anteriores, T-0.17 candidatura Periodismo), Fase 1 pivotada a datasets reales + nuevas tablas, Fase 2 con feedback loop y perfiles, Fase 3 con selector de perfil.
- `docs/TODO.md` con tareas nuevas: T-34 subida a P1 (verificación empírica), T-05b (reescribir scraper como cliente ArcGIS REST), T-06b/T-06c (nuevo enum + tablas), T-20b (feedback loop), T-20c (catálogo de trámites reales), T-29 (cifras memoria), T-30-periodismo (opcional), T-34b (duplicado de cargadores VE), T-36 (investigar ganadores anteriores).
- `docs/concurso/tramites-referenciados.md` creado como plantilla para rellenar en T-20c.
- `NEXT_STEPS.md § Fase B/F` reescritas: código pegable del nuevo scraper ArcGIS REST, de la tabla `feedback`, del endpoint `/api/v1/feedback`, y del script de agregación para `feedback_aggregated.csv`.

### Changed — Arquitectura definitiva fijada · 2026-05-09
- **BREAKING (planificado).** Retirada de Celery + Redis del stack: la ingesta pasará a ejecutarse vía Cron + script Python standalone. Ver `docs/DECISIONS.md#adr-002`.
- **BREAKING (planificado).** Retirada de Next.js + Tailwind + Framer del plan de frontend: el frontend será HTML + CSS + JS vanilla + MapLibre GL JS. Ver `docs/DECISIONS.md#adr-003`.
- **BREAKING (planificado).** Reorganización del repositorio a estructura canónica: `src/`, `tests/`, `docs/`, `infra/`, `config/`, `db/`, `.github/`. Migración en tarea `T-10`.
- Python + PostGIS + FastAPI se mantienen como excepción justificada al canonical stack. Ver `docs/DECISIONS.md#adr-001`.
- `ARCHITECTURE.md` reescrito con la arquitectura definitiva.
- `ROADMAP.md` actualizado: estado por tarea, Fase 0 (entregables concurso) añadida, Fase 2/3/4 realineadas.
- `CONTEXT.md` actualizado con reglas de lenguaje inclusivo y mapeo a criterios del jurado AD.TR.15.
- `NEXT_STEPS.md` reescrito como plan operativo fase a fase.

### Added — Documentación y gobernanza · 2026-05-09
- `docs/DECISIONS.md` con ADR-001, ADR-002, ADR-003.
- `docs/STATUS.md` con snapshot de salud del proyecto.
- `docs/AGENTS.md` con registro de trabajo por agente y sesión.
- `docs/TODO.md` con backlog P1/P2/P3/P4.
- `docs/reports/phase-1-audit.html` — informe de auditoría autocontenido con SVG del grafo de dependencias.
- `CHANGELOG.md`, `CONTRIBUTING.md` en raíz.
- `README.md` en raíz (antes solo existía `backend/README.md`).
- `LICENSE` (MIT + nota CC-BY 4.0 para datos derivados).
- `MEMORIA.md` — borrador de la Memoria Resumen Anexo II para el concurso AD.TR.15.
- `DATA_SOURCES.md` — catálogo de datasets con trazabilidad.
- `METHODOLOGY.md` — metodología de ingesta, normalización y análisis.

### Known issues (pendientes de fix en próxima sesión)
- `backend/app/ingestion/ingestor.py` y `backend/app/api/spatial.py` usan `metadata` donde el modelo declara `extra_data`. Ingesta bloqueada. Tarea `T-03`.
- `backend/app/ingestion/normalizer.py` hace `from shapely import geojson`, incompatible con Shapely 2.x. Tarea `T-04`.
- `backend/app/tasks/__init__.py` declara `async def ingest(self)`, incompatible con Celery 5; se elimina con la retirada de Celery. Tarea `T-05-bis`.
- Sin creación automática de tablas. Tarea `T-06`.
- Buffer de `ImpactZone` aplicado sobre geometría WGS84 sin reproyectar. Tarea `T-07`.
- `POSTGRES_PASSWORD` literal en `docker-compose.yml`. Tarea `T-02`.

## [0.0.1] - 2026-05-09 (pre-release interna)
- Scaffolding inicial de FastAPI + SQLAlchemy + PostGIS + Celery + Redis (posteriormente simplificado).
- Primera pasada de documentación (CONTEXT, ARCHITECTURE, ROADMAP).
- Modelos `UrbanEvent`, `ImpactZone`, `MitigationAction`.
- Endpoints CRUD de eventos y queries espaciales básicas.
- Scraper del portal de datos abiertos de Valencia.
- Tests parciales de schemas y normalizer.
