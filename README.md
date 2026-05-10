# VLC PROACTIVA (València Proactiva)

> Motor de inteligencia urbana proactiva basado en datos abiertos del Ayuntamiento de València.
> Proyecto candidato a la **categoría de Datos Abiertos** de los *Premios para proyectos de datos abiertos y periodismo de datos del Ayuntamiento de València 2026* (convocatoria **AD.TR.15**).

## 🎯 Idea
Transformar el Portal de Datos Abiertos de Valencia de una herramienta **pasiva** (consultar datos) a una plataforma **proactiva** (la ciudad avisa y sugiere qué hacer). Cada interrupción urbana (obra, evento, corte de tráfico) desencadena un bucle:

**Evento → Zona de impacto → Acción sugerida**

La ciudadanía y los comercios reciben alternativas (rutas, aparcamientos, trámites) antes de experimentar el problema.

## Datos derivados reales

VLC PROACTIVA no solo consume datos abiertos: publica outputs derivados que el jurado puede inspeccionar directamente.

- [`exports/impact_zones.geojson`](./exports/impact_zones.geojson) — zonas de impacto calculadas con PostGIS.
- [`exports/mitigation_actions.csv`](./exports/mitigation_actions.csv) — acciones recomendadas por evento y perfil.
- [`exports/feedback_aggregated.csv`](./exports/feedback_aggregated.csv) — utilidad agregada del feedback ciudadano, sin `session_token`.

## 🧱 Stack (definitivo — 2026-05-09)
| Capa | Herramienta | Notas |
|---|---|---|
| Backend HTTP | Python 3.11 + FastAPI + SQLAlchemy 2 + GeoAlchemy2 | Ver [`docs/DECISIONS.md#adr-001`](./docs/DECISIONS.md) |
| Base de datos | PostgreSQL 15 + PostGIS | Imprescindible para las operaciones geoespaciales |
| Scheduler | Cron (host) | Sin Celery ni Redis. Ver [`docs/DECISIONS.md#adr-002`](./docs/DECISIONS.md) |
| Frontend | HTML + CSS + JS **vanilla** + MapLibre GL JS | Sin Next.js/Tailwind/Framer. Ver [`docs/DECISIONS.md#adr-003`](./docs/DECISIONS.md) |
| Tiles | OpenFreeMap | Abierto y gratuito |
| Reverse proxy | Nginx | Security headers + estático + proxy `/api` |
| Tunnel | Cloudflare Tunnel | Único ingress, sin puertos abiertos en el VPS |
| Red interna | Tailscale | Acceso administrativo |
| VPS | Hetzner CX22 | Ubuntu 24.04 · ~4 €/mes |

## Kit de replicabilidad

VLC PROACTIVA nace en València, pero el motor no está acoplado a una ciudad concreta. Otra administración puede reutilizarlo cambiando tres piezas:

1. **Catálogo de fuentes:** adaptar `docs/DATA_SOURCES.md` y los scrapers a su portal CKAN o ArcGIS REST.
2. **Reglas de acción:** modificar las plantillas YAML de `src/backend/engine/templates/` para sus trámites, perfiles y prioridades locales.
3. **Marca y despliegue:** mantener el frontend vanilla/MapLibre, cambiar textos, logos y dominio, y desplegar con Docker + Nginx + cron.

La arquitectura evita dependencias cerradas y costes recurrentes altos: HTML/CSS/JS vanilla, FastAPI, PostgreSQL/PostGIS, MapLibre, OpenFreeMap y cron. El objetivo es **gobernanza de código abierto**: una inversión pública reutilizable por Alicante, Castellón, municipios de l'Horta o cualquier ciudad con datos abiertos trazables.

## 🗂️ Documentación del repositorio
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — stack, estructura canónica y modelo de datos.
- [`docs/CONTEXT.md`](./docs/CONTEXT.md) — visión, stakeholders y reglas del proyecto.
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — plan por fases con estado actual.
- [`docs/NEXT_STEPS.md`](./docs/NEXT_STEPS.md) — plan operativo fase a fase para el siguiente agente.
- [`docs/MEMORIA.md`](./docs/MEMORIA.md) — borrador de la Memoria Resumen (Anexo II) del concurso.
- [`docs/DATA_SOURCES.md`](./docs/DATA_SOURCES.md) — catálogo y trazabilidad de los datasets utilizados.
- [`docs/METHODOLOGY.md`](./docs/METHODOLOGY.md) — metodología de ingesta, normalización y análisis.
- [`docs/STATUS.md`](./docs/STATUS.md) — salud actual del proyecto.
- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — Architecture Decision Records.
- [`docs/AGENTS.md`](./docs/AGENTS.md) — registro de trabajo por sesión.
- [`docs/TODO.md`](./docs/TODO.md) — backlog priorizado.
- [`docs/reports/phase-1-audit.html`](./docs/reports/phase-1-audit.html) — auditoría técnica con grafo de dependencias.
- [`CHANGELOG.md`](./CHANGELOG.md), [`CONTRIBUTING.md`](./CONTRIBUTING.md), [`LICENSE`](./LICENSE).

## 🚀 Arranque rápido (desarrollo)

```bash
cp config/.env.example .env
docker compose -f infra/docker-compose.yml up -d --build
curl http://localhost:8000/health
# Swagger: http://localhost:8000/docs
```
Puertos host: Postgres/PostGIS `5434`, API `8000`.

Ingesta manual:
```bash
docker compose -f infra/docker-compose.yml exec api python -m scripts.run_ingest
```

## 🔓 Compromiso con los datos abiertos
1. Código publicado con licencia MIT.
2. Datos **derivados** (zonas de impacto, acciones de mitigación) publicados en GeoJSON/CSV bajo **CC-BY 4.0**, con atribución al Portal de Datos Abiertos de València.
3. Metodología documentada en [`docs/METHODOLOGY.md`](./docs/METHODOLOGY.md).
4. Trazabilidad completa en [`docs/DATA_SOURCES.md`](./docs/DATA_SOURCES.md).
5. Reproducible con un único `docker compose up`.

### Exports derivados reproducibles
Tras ejecutar la ingesta, los datasets derivados se generan con:

```bash
docker compose -f infra/docker-compose.yml exec api sh -lc 'VPRO_EXPORT_DIR=/exports python -m scripts.export_derived_data'
```

Archivos publicados:
- [`exports/impact_zones.geojson`](./exports/impact_zones.geojson) - zonas de impacto PostGIS.
- [`exports/mitigation_actions.csv`](./exports/mitigation_actions.csv) - acciones sugeridas y enlaces oficiales.
- [`exports/feedback_aggregated.csv`](./exports/feedback_aggregated.csv) - votos agregados sin `session_token`.

Las cifras usadas en la memoria estan documentadas en [`docs/reports/memoria-figures.sql`](./docs/reports/memoria-figures.sql) y [`docs/reports/memoria-figures.json`](./docs/reports/memoria-figures.json).

## 👥 Participación
Proyecto abierto a colaboración entre desarrolladores, periodistas y entidades del municipio. Las contribuciones se aceptan mediante *pull request* siguiendo [`CONTRIBUTING.md`](./CONTRIBUTING.md) y respetando los principios de transparencia, lenguaje inclusivo y no sexista, y redacción en castellano o valenciano de los materiales públicos.

## 📜 Marco del concurso
- Convocatoria: **AD.TR.15** Premios para proyectos de datos abiertos y periodismo de datos 2026.
- Categoría: **Datos Abiertos**.
- Dotación: 5.000 € (1er premio), 3.000 € (2º), 2.000 € (3º).
- Servicio gestor: Sociedad de la Información, Transparencia y Simplificación de Procedimientos (Ayuntamiento de València).
- Ámbito: municipio de València.

## 🛠️ ¿Primera vez en este repo?
Lee en este orden:
1. [`docs/RULES-FOR-AGENTS.md`](./docs/RULES-FOR-AGENTS.md) — **lectura obligatoria antes de tocar nada**. Reglas derivadas de errores reales.
2. [`docs/STATUS.md`](./docs/STATUS.md) — dónde está el proyecto hoy.
3. [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — qué hemos decidido y por qué.
4. [`docs/DECISIONS.md`](./docs/DECISIONS.md) — ADRs firmados (no se reabren sin ADR nuevo).
5. [`docs/NEXT_STEPS.md`](./docs/NEXT_STEPS.md) — qué hacer a continuación, fase a fase.
