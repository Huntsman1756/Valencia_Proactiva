# ROADMAP — Valencia Proactiva (V-PRO)

> **Leyenda:** ✅ Hecho · 🟡 En progreso · 🔴 Pendiente · ⚠️ Hecho con bugs
> **Arquitectura fija:** Python + FastAPI + PostGIS + Cron + Frontend vanilla. Ver [`docs/DECISIONS.md`](./docs/DECISIONS.md).
> **Plan operativo detallado:** [`NEXT_STEPS.md`](./NEXT_STEPS.md).
> **Estado global en vivo:** [`docs/STATUS.md`](./docs/STATUS.md).
> **Última actualización:** 2026-05-09.

---

## Mapeo fase a fase

| Fase plan | Objetivo producto | Entregable | Estado |
|---|---|---|---|
| **A** Estabilización | Repo canónico, seguridad baseline, CI | Repo organizado + CI verde + endpoints protegidos | 🔴 Pendiente |
| **B** Fase 1 completa | Ingesta end-to-end funcional + tests ≥70% | Cargar datos reales del portal y verlos en la API | 🔴 Pendiente |
| **C** Fase 2 Proactive Engine | Action Template Engine + Alternative Finder + Export CC-BY | API proactiva documentada | 🔴 Pendiente |
| **D** Fase 3 Interfaz | Frontend vanilla + MapLibre bilingüe | Golden Path reproducible en browser | 🔴 Pendiente |
| **E** Fase 4 Despliegue | VPS Hetzner + Nginx + Cloudflare Tunnel + Tailscale + cron | `https://vpro.<dominio>` público con cron activo | 🔴 Pendiente |
| **F** Concurso AD.TR.15 | Memoria oficial + vídeo + solicitud en sede | Solicitud presentada dentro del plazo | 🟡 En progreso (docs y licencia ✅) |

---

## FASE 0 — Entregables del concurso (AD.TR.15) — 🟡 En progreso
**Focus:** lo que el jurado y la Sede Electrónica exigen, y dejar el repo presentable.

- [x] **Task 0.1:** Documentación base del repo (`README.md` raíz, `CONTEXT.md`, `ARCHITECTURE.md`, `ROADMAP.md`). ✅
- [x] **Task 0.2:** Licencia del código (`LICENSE` — MIT) y política de datos derivados (CC-BY 4.0). ✅
- [x] **Task 0.3:** Trazabilidad de fuentes (`DATA_SOURCES.md`) con datasets reales verificados. ✅
- [x] **Task 0.4:** Metodología documentada (`METHODOLOGY.md`). ✅
- [x] **Task 0.5:** Borrador de Memoria Resumen Anexo II (`MEMORIA.md`) con pivote de movilidad+accesibilidad. ✅
- [x] **Task 0.6:** ADRs fundacionales (`docs/DECISIONS.md` — ADR-001, 002, 003, 004). ✅
- [x] **Task 0.7:** Documentos de continuidad (`docs/STATUS.md`, `docs/AGENTS.md`, `docs/TODO.md`, `CHANGELOG.md`, `CONTRIBUTING.md`). ✅
- [ ] **Task 0.8:** Verificar modelo oficial Anexo II en `www.valencia.es` cuando publique el extracto en el BOP y adaptar `MEMORIA.md` al formato exigido. 🔴
- [ ] **Task 0.9:** Preparar documentación administrativa (Anexo I, Anexo III si agrupación, Modelo 036/037, etc.). 🔴
- [ ] **Task 0.10:** Revisión de lenguaje inclusivo y no sexista en todos los materiales públicos. 🔴
- [ ] **Task 0.11:** Exportaciones de datos derivados (`src/scripts/export_derived_data.py` → GeoJSON/CSV CC-BY 4.0, incluyendo `feedback_aggregated.csv`). 🔴 (requiere Fase C)
- [ ] **Task 0.12:** Demo desplegada públicamente + vídeo de 1-2 min. 🔴 (requiere Fase E)
- [ ] **Task 0.13:** UI bilingüe castellano/valenciano + selector de perfil de usuario (genérico / comercial / PMR / ciclista / transporte público). 🔴 (requiere Fase D)
- [ ] **Task 0.14:** Catálogo de trámites municipales reales para enlazar desde `MitigationAction` (`docs/concurso/tramites-referenciados.md`). 🟡 Plantilla creada, por rellenar con enlaces verificados.
- [ ] **Task 0.15:** Cifras cuantitativas del § 8 de `MEMORIA.md` calculadas con los datos reales del portal. 🔴
- [ ] **Task 0.16:** Investigar proyectos ganadores de ediciones anteriores AD.TR.15 (2024, 2025) para evitar solapamiento en la narrativa de innovación. 🔴
- [ ] **Task 0.17:** *(Rectificada — las bases limitan a 1 proyecto por participante.)* V-PRO concurre solo a Datos Abiertos. Opcional: coordinar con una persona periodista externa que presente una candidatura propia e independiente a Periodismo de Datos reutilizando los datos derivados CC-BY 4.0 de V-PRO. 🟡
- [ ] **Task 0.18:** Presentar solicitud en Sede Electrónica dentro del plazo (1 mes desde publicación en BOP). 🔴

---

## FASE 1 — Data Intelligence Foundation (semana 1) — 🟡 En progreso

**Focus:** construir *el oído* y *el cerebro* contra los datasets reales. Detalle operativo en [`NEXT_STEPS.md § Fase A/B`](./NEXT_STEPS.md).

- [x] **Task 1.1:** Setup Development Environment (Docker, PostgreSQL/PostGIS, Python/FastAPI). ✅
- [x] **Task 1.2:** Scraper inicial del portal. ⚠️ **Reescribir** (tarea `T-05b` en TODO) como cliente ArcGIS REST contra `geoportal.valencia.es` según ADR-004. El MVP ingesta:
  - `ocupacio-via-publica` (layer 209) → `UrbanEventType.OCUPACION`
  - `estat-transit-temps-real` (layer 192) → `UrbanEventType.TRAFICO`
  - `talls-transit-falles` (fallback histórico) → `UrbanEventType.EVENTO_FALLAS`
  - `zona-de-bajas-emisiones` → `UrbanEventType.ZBE`
- [x] **Task 1.3:** Pipeline de normalización. ⚠️ Ajustar al esquema real de features ArcGIS (props varían por dataset). Bugs pendientes en tareas `T-03`, `T-04`.
- [x] **Task 1.4:** Inteligencia espacial (buffers automatizados). ⚠️ Ajustar para aceptar `LINESTRING` además de `POLYGON` (tramos de tráfico). Bug `T-07`.
- [ ] **Task 1.5:** Verificación end-to-end con datos reales. 🔴 Bloqueado por `T-03..T-07` y `T-06`. Golden Path: ingestar una ocupación real y golpear `/api/v1/spatial/suggestions` sobre su ubicación.
- [ ] **Task 1.6:** Tabla `points_of_interest` con campo `accessible` para ángulo PMR. 🔴 Nueva tras ADR-004.
- [ ] **Task 1.7:** Tabla `feedback` con `session_token` (sin PII). 🔴 Nueva tras ADR-004.

---

## FASE 2 — Proactive Engine (semana 2) — 🔴 Pendiente
**Focus:** "qué hacer" a partir de "qué pasó", con perfiles de usuario. Detalle en [`NEXT_STEPS.md § Fase C`](./NEXT_STEPS.md).

- [x] **Task 2.1:** Action Template Engine con reglas YAML y **filtro por perfil de usuario** (`GENERIC`, `COMMERCIAL`, `PMR`, `CYCLIST`, `PUBLIC_TRANSPORT`). Tarea `T-20`. ✅
- [ ] **Task 2.2:** API proactiva. `POST /api/v1/spatial/suggestions?profile=PMR` filtra las `MitigationAction` por perfil. Añadir `GET` variante para frontend. 🟡
- [ ] **Task 2.3:** Alternative Finder multimodal (aparcamientos incluyendo PMR, Valenbisi tiempo real, EMT, FGV, itinerarios ciclistas, cargadores VE) → tabla `points_of_interest`. Endpoint `GET /api/v1/spatial/alternatives`. Tarea `T-21`. 🔴
- [x] **Task 2.4:** **Feedback loop ciudadano:** endpoint `POST /api/v1/feedback` + rate-limit por `session_token`. Export agregado anónimo como dataset derivado CC-BY 4.0. Tarea `T-20b`. ✅ Endpoint y persistencia cerrados; export agregado sigue en T-26.
- [ ] **Task 2.5:** API Documentation enriquecida (OpenAPI con ejemplos de cada perfil, tags con descripciones). 🟡
- [ ] **Task 2.6:** Export de datos derivados bajo CC-BY 4.0 (`src/scripts/export_derived_data.py`, incluyendo `feedback_aggregated.csv`). Tarea `T-26`. 🔴
- [ ] **Task 2.7:** Enlazado de `MitigationAction` con URLs reales de trámites en `valencia.es` / `sede.valencia.es`. Catálogo en `docs/concurso/tramites-referenciados.md`. Tarea `T-20c`. 🔴

---

## FASE 3 — High-Fidelity Interface (semana 3) — 🔴 Pendiente
**Focus:** *la voz* (UX/UI). Frontend **vanilla** HTML + CSS + JS + MapLibre. Detalle en [`NEXT_STEPS.md § Fase D`](./NEXT_STEPS.md).

- [x] **Task 3.1:** Scaffolding `src/frontend/index.html` + `assets/app.js` + `assets/app.css` + `i18n/{es,val}.json`. Tarea `T-22`. ✅ Frontend local operativo con Nginx, capas reales, CAS/VAL runtime y feedback BD.
- [ ] **Task 3.2:** Smart Map (MapLibre con capas `impact-zones-fill`, `urban-events`, y layer específica para tráfico en tiempo real con codificación de color por estado). 🔴
- [ ] **Task 3.3:** Action Card (bottom-sheet mobile / panel desktop) con botones 👍/👎 y CTA al trámite. 🔴
- [ ] **Task 3.4:** **Selector de perfil de usuario** (Genérico / Comercial / PMR / Ciclista / Transporte público) con persistencia en `localStorage`. 🔴
- [ ] **Task 3.5:** Mobile-first, accesible (WCAG AA), bilingüe castellano/valenciano con `<html lang>` dinámico. 🔴
- [ ] **Task 3.6:** Lighthouse mobile ≥90 Performance y Accessibility. 🔴

---

## FASE 4 — Integración, Rendimiento y Despliegue (semana 4) — 🔴 Pendiente
**Focus:** producto en producción y narrativa del premio. Detalle en [`NEXT_STEPS.md § Fase E/F`](./NEXT_STEPS.md).

- [ ] **Task 4.1:** Provisionar VPS Hetzner CX22 con `infra/provision.sh` (Ubuntu 24.04 + Nginx + Cloudflare Tunnel + Tailscale + unattended-upgrades). Tarea `T-23`. 🔴
- [ ] **Task 4.2:** Nginx con security headers, `server_tokens off`, reverse-proxy `/api/` + estático para frontend. Tarea `T-24`. 🟡 Config local creada y verificada; falta validación pública tras VPS.
- [ ] **Task 4.3:** systemd (`vpro-api.service`) + cron (`/etc/cron.d/vpro-ingest`) para ingesta periódica. Tarea `T-27`. 🔴
- [ ] **Task 4.4:** Deploy manual vía `rsync` + `systemctl reload`, documentado en `infra/deploy.md`. Tarea `T-28`. 🔴
- [ ] **Task 4.5:** Golden Path seed (`src/scripts/seed_demo.py`) + vídeo demo + adjunto a MEMORIA.md. 🔴

---

## 🚦 Definition of Done (DoD) global
- [ ] Código pasa `ruff` + `mypy` + `pytest` (cobertura ≥70%) en CI.
- [ ] Todas las queries espaciales verificadas con PostGIS real.
- [ ] El "Action Loop" demostrable en UI pública: **Event → Impact → Action**.
- [ ] UI cumple "Calm & Minimalist" y es bilingüe castellano/valenciano.
- [ ] Desplegado en `https://vpro.<dominio>` con cron activo.
- [ ] `securityheaders.com` ≥ A.
- [ ] Solicitud AD.TR.15 presentada en la Sede Electrónica.
- [ ] Datos derivados publicados como GeoJSON/CSV bajo CC-BY 4.0 en una release de GitHub.

---

## 📍 Punto de continuación

**Siguiente sesión empieza por [`NEXT_STEPS.md § Fase A`](./NEXT_STEPS.md).**

Orden estricto: A.1 (seguridad) → A.2 (reorganización canónica) → A.3 (unificar `Base`) → A.4 (retirar Celery) → A.5 (fixes ingesta) → A.6 (admin token + rate limiting) → A.7 (CI). No saltar ni reordenar.

Al cerrar Fase A, continuar con Fase B. Fase F (concurso) se ejecuta en paralelo a partir de Fase C.
