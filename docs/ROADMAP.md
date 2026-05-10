# ROADMAP — Valencia Proactiva (V-PRO)

> Estado global en vivo: [`docs/STATUS.md`](./STATUS.md).
> Última actualización: 2026-05-10.
> Regla operativa actual: no ejecutar despliegue/VPS hasta cerrar estabilidad local, demo y entregables del concurso.

## Mapeo Fase A-F

| Fase | Objetivo producto | Estado dev | Pendiente principal |
|---|---|---|---|
| **A** Estabilización | Repo canónico, seguridad baseline, CI | ✅ Cerrada | Pre-commit local opcional (`T-33`) |
| **B** Data Intelligence Foundation | Ingesta real, PostGIS, tests ≥70% | ✅ Cerrada | Mantener fixtures/reportes al cambiar fuentes |
| **C** Proactive Engine | Action Template Engine, Alternative Finder, exports CC-BY | ✅ Cerrada | OpenAPI enriquecida (`Task 2.5`) |
| **D** Interfaz local | Frontend vanilla + MapLibre bilingüe | 🟡 Operativa local | Lighthouse, accesibilidad y Golden Path final |
| **E** Producción | VPS, tunnel, cron, dominio público | ⏸️ Diferida | Se hará cuando el proyecto esté más estable |
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
- [ ] **Task 0.16 / T-36:** Investigar ganadores anteriores.
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
- [x] `T-37..T-51`: fuentes oficiales complementarias EMT, staging `OfficialNotice`, promoción conservadora, gazetteer y API admin.
- [ ] API Documentation enriquecida con ejemplos por perfil.

## Fase 3 — Interfaz Local

- [x] Frontend vanilla en `src/frontend`.
- [x] MapLibre con eventos, impact zones y tráfico.
- [x] Action cards con CTA, feedback y datos clave.
- [x] Selector de perfil persistente.
- [x] Runtime bilingüe CAS/VAL.
- [x] Tabs `Eventos`, `Fuentes`, `Metodología`, `Info`.
- [ ] Lighthouse mobile ≥90 Performance y Accessibility.
- [ ] Pase final WCAG/teclado/contraste.
- [ ] Golden Path demo estabilizado para vídeo con `ocupacio-via-publica` actual y perfil Comercial; no usar Fallas histórico fuera de temporada.

## Fase 4 — Producción

> Diferida por decisión de producto. No avanzar en VPS hasta cerrar estabilidad local y demo.

- [ ] `T-23`: VPS Hetzner.
- [ ] `T-24`: validar Nginx/security headers en dominio público.
- [ ] `T-27`: cron/systemd en producción.
- [ ] `T-28`: deploy manual documentado.

## Definition of Done Global

- [x] Código pasa `ruff`, `mypy`, `pytest` y `pip-audit` en local.
- [x] Cobertura backend ≥70%.
- [x] Datos derivados publicados en repo como GeoJSON/CSV.
- [x] Action Loop demostrable en local: evento → zona de impacto → acción → feedback.
- [ ] Lighthouse móvil ≥90.
- [ ] Vídeo demo y memoria final lista para Sede.
- [ ] Release GitHub con exports.
- [ ] Producción pública con cron activo.
- [ ] Solicitud AD.TR.15 presentada.

## Siguiente Sesión Recomendada

Seguir el procedimiento Ralph: elegir la primera historia pendiente en `prd.json`, ejecutarla completa, verificar, actualizar `progress.txt`, actualizar AGENTS/docs si hay aprendizajes, commit y push.
