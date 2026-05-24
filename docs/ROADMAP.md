# ROADMAP — Valencia Proactiva (V-PRO)

> Estado global en vivo: [`docs/STATUS.md`](./STATUS.md).
> Última actualización: 2026-05-10.
> Regla operativa actual: la demo local ya está estable. Si el VPS está disponible, se puede abrir una fase de staging/producción sin bloquear los entregables del concurso.

## Mapeo Fase A-F

| Fase | Objetivo producto | Estado dev | Pendiente principal |
|---|---|---|---|
| **A** Estabilización | Repo canónico, seguridad baseline, CI | ✅ Cerrada | Pre-commit local opcional (`T-33`) |
| **B** Data Intelligence Foundation | Ingesta real, PostGIS, tests ≥70% | ✅ Cerrada | Mantener fixtures/reportes al cambiar fuentes |
| **C** Proactive Engine | Action Template Engine, Alternative Finder, exports CC-BY | ✅ Cerrada | OpenAPI enriquecida (`Task 2.5`) |
| **D** Interfaz local | Frontend vanilla + MapLibre bilingüe | ✅ Operativa local | Pase final WCAG manual |
| **E** Producción | VPS, tunnel, cron, dominio público | 🟡 Preparada para CX23 | T-23, T-27, T-28 sobre alias SSH local |
| **F** Concurso AD.TR.15 | Memoria, vídeo, anexos, solicitud | 🟡 En progreso | Anexo oficial, vídeo, revisión final y presentación |

## Fase 0 — Concurso AD.TR.15

- [x] **Task 0.1:** Documentación base del repo.
- [x] **Task 0.2:** Licencia MIT + política CC-BY 4.0 para datos derivados.
- [x] **Task 0.3:** Trazabilidad de fuentes con datasets reales.
- [x] **Task 0.4:** Metodología documentada.
- [x] **Task 0.5:** Borrador de memoria.
- [x] **Task 0.6:** ADRs fundacionales.
- [x] **Task 0.7:** Documentos de continuidad.
- [x] **Task 0.11 / T-26:** Exportaciones derivadas CC-BY 4.0.
- [x] **Task 0.13 / T-22:** UI bilingüe y perfiles en frontend local.
- [x] **Task 0.14 / T-20c:** Catálogo de trámites municipales reales.
- [x] **Task 0.15 / T-29:** Cifras reales reproducibles para memoria.
- [ ] **Task 0.8:** Verificar modelo oficial Anexo II cuando esté publicado y adaptar `MEMORIA.md`.
- [ ] **Task 0.9:** Preparar documentación administrativa.
- [ ] **Task 0.10:** Revisión de lenguaje inclusivo/no sexista.
- [ ] **Task 0.12:** Vídeo demo 1-2 min.
- [x] **Task 0.16 / T-36:** Investigar ganadores anteriores.
- [ ] **Task 0.18:** Presentar solicitud en Sede Electrónica dentro de plazo.

## Fase 1 — Data Intelligence Foundation

- [x] Setup Docker + PostgreSQL/PostGIS + FastAPI.
- [x] Scraper ArcGIS REST real contra `geoportal.valencia.es`.
- [x] Normalización de eventos y POIs.
- [x] Buffers PostGIS con CRS proyectado.
- [x] Ingesta real end-to-end e idempotente.
- [x] `points_of_interest` multimodal.
- [x] `feedback` sin PII.
- [x] Cobertura formal: `pytest --cov=src/backend --cov-fail-under=70` verde.

## Fase 2 — Proactive Engine

- [x] `T-20`: Action Template Engine por perfil.
- [x] `T-20b`: Feedback loop ciudadano.
- [x] `T-20c`: URLs oficiales de trámites en plantillas.
- [x] `T-21`: Alternative Finder multimodal.
- [x] `T-26`: Exports derivados.
- [x] `T-37..T-51`: fuentes oficiales complementarias EMT, `OfficialNotice` como capa de validación diferida, promoción conservadora, gazetteer y API admin.
- [ ] API Documentation enriquecida con ejemplos por perfil.

## Fase 3 — Interfaz Local

- [x] Frontend vanilla en `src/frontend`.
- [x] MapLibre con eventos, impact zones y tráfico.
- [x] Action cards con CTA, feedback y datos clave.
- [x] Selector de perfil persistente.
- [x] Runtime bilingüe CAS/VAL.
- [x] Tabs `Eventos`, `Fuentes`, `Metodología`, `Info`.
- [x] Lighthouse mobile ≥90 Performance y Accessibility.
- [x] Señales de veracidad del dato, skeleton de carga, microfeedback móvil y modo alerta preparado sin datos ficticios de emergencia.
- [x] Exportación de snapshot periodístico por evento, con fuente, impacto, alternativa y HTML embebible.
- [x] Comprobador conservador de ZBE por distintivo ambiental y explicación de alternativas por medio de transporte/perfil.
- [x] `Fuentes`, `Metodología` e `Info` como pestañas centrales en lugar de drawer lateral.
- [ ] Pase final WCAG/teclado/contraste.
- [x] Golden Path demo estabilizado para vídeo con `ocupacio-via-publica` actual y perfil Comercial; no usar Fallas histórico fuera de temporada.

## Fase 4 — Producción

> Lista para ejecutar sobre el VPS confirmado mediante alias SSH local (`vpro-prod`). La IP, IDs de proveedor y rangos de red no se versionan. Ya existen artefactos de provisionado/deploy; falta ejecutarlos en servidor real y cerrar dominio/tunnel.

- [ ] `T-23`: VPS Hetzner CX23 provisionado con `infra/provision.sh`.
- [ ] `T-24`: validar Nginx/security headers en dominio público.
- [ ] `T-27`: timers systemd `vpro-ingest` y `vpro-export` activos.
- [ ] `T-28`: deploy manual `infra/deploy.md` ejecutado.

## Evolución y escalabilidad post-MVP

- [ ] `T-124`: VLC-Voice, consulta conversacional sobre movilidad y trámites, siempre apoyada en motor de reglas y fuentes trazables.
- [ ] `T-125`: modelo predictivo de saturación urbana para Fallas, maratones y grandes eventos, separando predicción estadística de aviso oficial.
- [ ] `T-126`: crowdsourcing verificado de incidencias, con umbral, moderación y validación municipal antes de promover a evento.
- [ ] `T-127`: backoffice municipal con índice de estrés urbano y concentración de impactos por barrio.
- [ ] `T-128`: Web Push por zona habitual, con consentimiento explícito y minimización de datos. El MVP previo ya incorpora aviso local de novedades por perfil usando `localStorage`, sin telemetría de servidor.
- [ ] `T-130`: perfil peatonal con rutas iluminadas, condicionado a fuente oficial de alumbrado público y metodología de seguridad urbana.
- [ ] `T-131`: pasaporte de resiliencia comercial para comercios afectados por obras prolongadas, condicionado a validación administrativa.

## Definition of Done Global

- [x] Código pasa `ruff`, `mypy`, `pytest` y `pip-audit` en local.
- [x] Cobertura backend ≥70%.
- [x] Datos derivados publicados como GeoJSON/CSV/JSON y permalinks HTML estáticos.
- [x] Action Loop demostrable en local: evento → zona de impacto → acción → feedback.
- [x] Lighthouse móvil ≥90.
- [ ] Vídeo demo y memoria final lista para Sede.
- [ ] Release GitHub con exports.
- [ ] Producción pública con cron activo.
- [ ] Solicitud AD.TR.15 presentada.

## Siguiente Sesión Recomendada

Seguir el procedimiento Ralph: elegir la primera historia pendiente en `prd.json`, ejecutarla completa, verificar, actualizar `progress.txt`, actualizar AGENTS/docs si hay aprendizajes, commit y push.
