# DECISIONS — Architecture Decision Records (ADR)

> Registro inmutable de decisiones técnicas significativas.
> Formato: Context → Options → Decision → Consequences.
> Las entradas superadas se marcan `[SUPERSEDED by ADR-XXX]` pero **nunca se borran**.

---

## ADR-001 — Excepción del canonical stack: Python + PostGIS para V-PRO

- **Status:** ✅ Accepted
- **Date:** 2026-05-09
- **Deciders:** Tech Lead (sesión de auditoría) + Product Owner (usuario)
- **Supersedes:** —
- **Superseded by:** —

### Context
El canonical stack del equipo es Vanilla PHP + SQLite + Vanilla JS + Cron. El proyecto V-PRO, que responde a la convocatoria AD.TR.15 del Ayuntamiento de València (categoría Datos Abiertos), tiene un núcleo funcional geoespacial no trivial:

- Cálculo dinámico de zonas de impacto con `ST_Buffer` reproyectado entre CRS (EPSG:4326 ↔ EPSG:32630).
- Emparejamiento espacial ciudadanía ↔ eventos con `ST_DWithin` en EPSG:3857.
- Previsto crecimiento a queries con `ST_Intersects`, índices GIST y agregaciones espaciales.

El scaffolding previo del proyecto ya estaba construido sobre FastAPI + SQLAlchemy + GeoAlchemy2 + PostgreSQL/PostGIS.

### Options considered
1. **Migrar a canonical stack puro (PHP + SQLite/SpatiaLite).**
   Descartar FastAPI/GeoAlchemy2, reescribir en PHP vanilla con SpatiaLite para funciones espaciales.
2. **Excepción documentada.**
   Mantener Python + PostGIS, pero retirar todo lo accesorio al stack (Celery, Redis, Next.js, Tailwind, Framer, GeoPandas).
3. **Híbrido.**
   API HTTP en PHP contra Postgres/PostGIS; pipeline de ingesta en Python + Cron.

### Decision
**Se adopta la opción 2.** V-PRO mantiene Python 3.11 + FastAPI + SQLAlchemy 2 + GeoAlchemy2 + PostgreSQL 15 + PostGIS como núcleo.

Se simplifica agresivamente retirando Celery/Redis (ADR-002), Next.js y stack CSS ornamental (ADR-003), y GeoPandas (sin uso real en el código).

### Consequences
**Positivas:**
- El proyecto llega al plazo del concurso (1 mes desde publicación en BOP) sin reescritura completa.
- PostGIS cubre todas las operaciones espaciales del diseño sin tooling frágil.
- FastAPI + Pydantic + SQLAlchemy 2 son librerías maduras con bajo coste de mantenimiento y buena experiencia de tipado.

**Negativas / riesgos:**
- Dos runtimes potenciales si el equipo es mayoritariamente PHP (mitigado: el frontend es vanilla, accesible sin conocer Python).
- Más RAM que SQLite (mitigado: Hetzner CX22, 4 GB RAM, sigue siendo ~4 €/mes).
- Rompe la regla "SQLite es suficiente hasta demostrar lo contrario" — documentado aquí como justificación suficiente.

### Revisit
Se reevalúa al cierre de Fase 3 (entrega del frontend). Si el volumen de datos y las queries espaciales no justifican Postgres/PostGIS, se contempla migración a SpatiaLite en un ADR futuro.

---

## ADR-002 — Retirada de Celery + Redis: scheduler = Cron

- **Status:** ✅ Accepted
- **Date:** 2026-05-09
- **Deciders:** Tech Lead + Product Owner
- **Supersedes:** —
- **Superseded by:** —

### Context
El scaffolding inicial introdujo Celery + Redis para orquestar la ingesta periódica del portal ODS de Valencia. El canonical stack del equipo usa Cron para todo scheduling. El caso de uso real es:
- Una ingesta cada 30-60 minutos.
- Sin tareas concurrentes dependientes entre sí.
- Sin workloads long-running.
- Sin colas de eventos en tiempo real.

### Options considered
1. **Mantener Celery + Redis.** Requiere un contenedor adicional, broker, worker persistente y lifecycle management. Útil si se prevé workflow complejo; overkill para un batch cada 30 min.
2. **Cron + script Python.** Una línea de crontab invoca `scripts/run_ingest.py`. Cero servicios extra.
3. **APScheduler embebido en FastAPI.** Evita Cron pero acopla el scheduler al proceso web — mala separación de responsabilidades.

### Decision
**Se adopta la opción 2.** La ingesta se ejecuta con Cron del sistema desde un script Python standalone en `src/scripts/run_ingest.py`. Se eliminan del proyecto:
- `backend/app/celery.py`
- `backend/app/tasks/`
- Servicio `worker` en `docker-compose.yml`
- Servicio `redis` en `docker-compose.yml`
- Dependencia `celery==5.4.0` en `requirements.txt`
- Dependencia `redis==5.2.0` en `requirements.txt`

Nueva entrada cron en prod:
```cron
*/30 * * * * vpro /usr/bin/python3 /opt/vpro/src/scripts/run_ingest.py >> /var/log/vpro/ingest.log 2>&1
```

### Consequences
**Positivas:**
- Menos RAM (Redis desaparece).
- Menos superficie de ataque (un servicio menos, sin broker TCP abierto).
- Menos complejidad operacional (sin worker que supervisar).
- Alineación con el canonical stack en el eje "scheduling".

**Negativas / riesgos:**
- Si en futuro se requieren tareas concurrentes o retry automático con backoff, habrá que reconsiderar. **Umbral de reconsideración:** >5 tareas distintas o ingestas que no caben en un solo run.
- El monitoring del cron queda a cargo de journald + alertas por exit status.

### Revisit
Se reevalúa si llega un requisito de tiempo-real (p. ej. webhooks entrantes desde el Ayuntamiento que disparen recomputación inmediata).

---

## ADR-003 — Frontend vanilla (HTML + CSS + JS) en lugar de Next.js

- **Status:** ✅ Accepted
- **Date:** 2026-05-09
- **Deciders:** Tech Lead + Product Owner
- **Supersedes:** —
- **Superseded by:** —

### Context
El plan original contemplaba Next.js 14 + Tailwind CSS + Framer Motion para el frontend. El canonical stack del equipo es Vanilla JS + CSS + HTML. La interfaz del MVP consta de:
- Una única vista (mapa + tarjeta de acción).
- Consumo de una API REST documentada.
- Sin necesidad de SSR (SEO no es objetivo: es una app, no contenido indexable).
- Sin flujo multi-página complejo.
- Sin autenticación en el MVP.
- Requisito bilingüe (castellano / valenciano) muy ligero.

### Options considered
1. **Next.js 14 (App Router) + Tailwind + Framer.** Overhead de framework, build pipeline, Node en el servidor o servicio estático tras `next export`.
2. **Vite + framework ligero (Vue/Preact).** Punto intermedio.
3. **Vanilla HTML + JS + CSS servido estático por Nginx.** MapLibre vendored o via jsDelivr pinneado. i18n con un `fetch('/i18n/es.json')` en tiempo de render.

### Decision
**Se adopta la opción 3.** Frontend 100% estático en `src/frontend/`, servido por Nginx sin Node.js involucrado. MapLibre GL JS como única dependencia JS externa (peso razonable, open-source, compatible con OpenFreeMap tiles).

Se eliminan del proyecto:
- Next.js 14
- Tailwind CSS
- Framer Motion
- PostCSS / autoprefixer / node_modules relacionados

### Consequences
**Positivas:**
- Deploy trivial: `rsync` a `/var/www/vpro/` y Nginx sirve.
- Sin pipeline de build, sin `node_modules`, sin dependencias transitivas.
- Menor superficie de ataque.
- Lighthouse scores naturalmente altos (sin JS framework overhead).
- Alineación con el canonical stack.

**Negativas / riesgos:**
- Sin componentes reutilizables "out of the box" — se resuelve con Web Components nativos o funciones de render JS simples.
- Sin hot reload para el dev → se puede montar `python -m http.server` o `live-server` como dev tool local.
- Si el producto crece a decenas de vistas, se reconsiderará (pero eso ya será post-MVP).

### Revisit
Se reevalúa si el producto añade >5 vistas distintas o requiere autenticación con gestión de sesión compleja en el cliente.

---

## ADR-004 — Pivote de datasets + scraper como cliente ArcGIS REST

- **Status:** ✅ Accepted
- **Date:** 2026-05-09 (continuación de sesión)
- **Deciders:** Tech Lead + Product Owner
- **Supersedes:** parcialmente el plan inicial de `DATA_SOURCES.md` (que asumía datasets inexistentes).
- **Superseded by:** —

### Context
La verificación empírica del portal `opendata.vlci.valencia.es` (realizada tras un primer pase a ciegas) reveló:

1. **Los datasets asumidos no existen.** No hay `obras-en-curso` ni `calendario-de-eventos` como slugs del portal.
2. **El portal es CKAN**, no OpenDataSoft. Los endpoints `/api/explore/v2.1/...` que el código asumía son inválidos. El API real es `/api/3/action/*`.
3. **Los recursos de datos geoespaciales no los sirve CKAN** — los sirve ArcGIS REST Services del geoportal municipal (`geoportal.valencia.es/server/rest/services/OPENDATA/<grupo>/MapServer/<layer>/query`).
4. **Hay datasets mucho más valiosos** que los que habíamos planificado:
   - `ocupacio-via-publica` cubre obras + festejos + incidencias en un único dataset.
   - `estat-transit-temps-real` se actualiza cada 3 minutos, es HVD europeo, y habilita alertas en tiempo real.
   - Familia completa de datasets de movilidad y accesibilidad.

### Options considered
1. **Mantener el plan ficticio.** Descartado: el scraper no funcionaría contra la realidad.
2. **Adaptarse al portal real y pivotar la propuesta.** Integrar `ocupacio-via-publica` como fuente nuclear, `estat-transit-temps-real` como fuente dinámica, y expandir el Alternative Finder con la familia de datasets de aparcamientos (incluyendo PMR), bici, metro y bus.
3. **Cambiar de portal / ciudad.** Imposible: las bases del concurso exigen uso del portal municipal de Valencia.

### Decision
Se adopta la opción 2. El proyecto pivota:
- De "visor de obras" → a **"plataforma de movilidad proactiva"**.
- Ingesta reescrita como **cliente HTTP contra ArcGIS REST** (`/MapServer/<layer>/query?f=geojson`), no contra CKAN directamente.
- **CKAN solo se usa para descubrir** (`package_list`, `package_show`) durante el desarrollo; los datos crudos vienen del geoportal ArcGIS.
- Se añade un nuevo tipo de evento `OCUPACION` (engloba OBRA / EVENTO / INCIDENCIA) en `UrbanEventType` y se mantiene `TRAFICO` para los tramos en tiempo real.
- Se añaden como `PointOfInterest` los datasets de aparcamientos (incluyendo PMR), bici, EMT, FGV, itinerarios ciclistas, cargadores VE.
- Se incorpora el ángulo explícito de **accesibilidad** como caso de uso principal (no accesorio).
- Se añade un **feedback loop ciudadano** (👍/👎 en la ActionCard), agregado y publicado como nuevo dataset CC-BY 4.0 bajo autoría de V-PRO.
- La posibilidad de una candidatura paralela en **Periodismo de Datos** queda descartada posteriormente: las bases AD.TR.15 limitan a un proyecto por participante. V-PRO concurre a Datos Abiertos y habilita reutilización periodística por terceros mediante datasets derivados y snapshots.

### Consequences
**Positivas:**
- La propuesta es técnicamente viable desde la primera semana.
- Se usa un dataset de Alto Valor Europeo (criterio 1 — innovación).
- Ángulo de accesibilidad fuerte (criterio 2 — valor público).
- Feedback loop convierte a V-PRO en productor de datos abiertos (criterio 4 — apertura).
- Alineación con la narrativa valenciana específica (ocupaciones, tráfico, Fallas en temporada) sin depender de datos históricos para la demo activa.

**Negativas / riesgos:**
- Reescritura parcial del scraper (el modelo de datos aguanta, pero la capa de ingesta cambia).
- Hay que validar los campos de cada feature manualmente antes de mapear a `UrbanEvent` — lo cubre la tarea `T-34` subida a P1.
- `talls-transit-falles` es histórico/fallback: no debe ser Golden Path activo fuera de temporada si el portal lo marca como desactualizado.

### Revisit
Se revisita si el Ayuntamiento publica nuevas versiones en tiempo real (p.ej. `obres-en-curs-temps-real`) que permitan sustituir la heurística de `ocupacio-via-publica`.

---

## Plantilla para futuros ADR

```markdown
## ADR-XXX — <título>

- **Status:** Proposed | Accepted | Deprecated | Superseded
- **Date:** YYYY-MM-DD
- **Deciders:** <roles / personas>
- **Supersedes:** —
- **Superseded by:** —

### Context
<qué problema existe, qué fuerzas empujan a decidir>

### Options considered
1. <opción A>
2. <opción B>

### Decision
<qué se elige y por qué>

### Consequences
**Positivas:**
- …

**Negativas / riesgos:**
- …

### Revisit
<condiciones que obligarían a reabrir la decisión>
```
