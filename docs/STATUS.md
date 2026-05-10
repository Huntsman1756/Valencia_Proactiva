# STATUS — V-PRO

> Fuente de verdad del estado del proyecto. **Se actualiza al cierre de cada sesión/fase.**
> Versión HTML generada al cierre de fase. Si divergen, el MD es la verdad.

## Estado global
- **Salud:** 🟢 Stable — Docker validado en entorno funcional, API arranca, `/health` responde 200, `run_ingest.py` ingesta datos reales y es idempotente en segundo run. Tests verdes (79/79), `ruff`, `mypy` y `pip-audit` verdes.
- **Fase producto:** 3 · *Interfaz proactiva local* — ingesta end-to-end funcional contra BD real. Action Template Engine `T-20` genera acciones por perfil, feedback loop `/api/v1/feedback` persiste votos reales, Alternative Finder multimodal con 12 datasets POI, staging `official_notices` para avisos oficiales EMT sin geometría y promoción conservadora opcional a `UrbanEvent` mediante gazetteer versionado con validación geográfica reproducible, CLI operativo y API admin de avisos oficiales, endpoint `/api/v1/spatial/alternatives` operativo, endpoint de capas espaciales para mapa, frontend vanilla `src/frontend` servido por Nginx en `localhost:8080`, dirección visual `Civic Utility` documentada, y configuración Nginx de producción preparada con security headers.
- **Fase concurso AD.TR.15:** 0 · *Entregables* — 60% (docs + licencia + ADRs + MEMORIA borrador ✅; Anexo II oficial, demo, vídeo pendientes).
- **Branch activa:** `main`.
- **Última release estable:** *ninguna*.
- **Commits recientes:** *no auditados esta sesión*. El siguiente agente empieza con `git log --oneline -20`.

## ActualizaciÃ³n 2026-05-10 Â· Tirada Ralph
- **Branch activa de trabajo:** `ralph/ingesta-fuentes-info`.
- **Ingesta real ejecutada:** `scraped=14814`, `normalized=14814`, `stored_pois=11710`, `stored_events=0` por duplicado previo, `skipped_duplicates=3104`, `errors=0`.
- **Conteos BD post-ingesta:** `urban_events=663`, `points_of_interest=13710`, `mitigation_actions=506`, `official_notices=20`, `feedback=19+`.
- **POIs multimodales verificados:** PMR, parkings, ORA, no regulados, motos, bicis, itinerarios ciclistas, EMT, FGV estaciones/bocas, Valenbisi y cargadores VE.
- **Fuentes oficiales:** `run_official_sources --fetch --dry-run` y `--fetch` verdes; `--promote --dry-run` escanea 20 avisos y no promociona ninguno por falta de geometrÃ­a/gazetteer fiable.
- **Frontend:** tabs `Eventos/Fuentes/MetodologÃ­a/Info`, fuente y `source_id` visibles por tarjeta, filtros de alternativas por tipo POI, CAS/VAL a la derecha, smoke Playwright verde en `localhost:8080` y `localhost:3000`.
- **VerificaciÃ³n:** `ruff`, `mypy`, `pytest -q` (79 passed), `pip-audit`, `docker compose up -d --build`, `/health`, API admin `official_notices` y smoke frontend verdes.

## Resumen ejecutivo
Proyecto V-PRO, candidato al premio AD.TR.15 categoría Datos Abiertos. **Plataforma de movilidad proactiva** con 5 perfiles de usuario (Genérico, Comercial, PMR, Ciclista, Transporte público) y feedback loop ciudadano, basada en datasets reales del portal municipal (verificados 2026-05-09).

Arquitectura firmada en 4 ADRs:
- [ADR-001](./DECISIONS.md#adr-001) — Python + PostGIS como excepción documentada al canonical stack.
- [ADR-002](./DECISIONS.md#adr-002) — Retirada de Celery/Redis → scheduler = Cron.
- [ADR-003](./DECISIONS.md#adr-003) — Frontend vanilla + MapLibre (sin Next.js/Tailwind/Framer).
- [ADR-004](./DECISIONS.md#adr-004) — Pivote de datasets + scraper cliente ArcGIS REST.

## Estado de la sesión del 2026-05-09 (tarde)

**Reportó 14/14 P1 completadas:** T-01, T-02, T-03, T-04, T-05b, T-05-bis, T-06, T-06b, T-06c, T-07, T-08, T-09, T-10, T-12, T-34.

**Verificación del orquestador:** detectó 3 bloqueantes + 8 deudas estructurales. Las tareas se marcaron sin pasar el protocolo de cierre (`docs/RULES-FOR-AGENTS.md § 9`). **Bloque correctivo ejecutado y cerrado en la sesión siguiente.**

### Bloqueantes — RESUELTOS en bloque correctivo T-100..T-111
| # | Problema | Tarea | Resultado |
|---|---|---|---|
| E1 | `src/backend/app/ingestion/ingestion/` anidado | T-100 | ✅ Aplanado a `src/backend/ingestion/` |
| E2 | Import `OpenDataScraper` roto | T-101 | ✅ Cambiado a `ArcGiSCRaper` |
| E3 | `geometry_type="POLYGON"` rígido | T-102 | ✅ Cambiado a `GEOMETRY` |
| E10 | Tests con enum viejo (`OBRA`, `EVENTO`) | T-109 | ✅ Actualizados 25 passed |

### Deuda estructural — RESUELTAS en bloque correctivo
| # | Problema | Tarea | Resultado |
|---|---|---|---|
| E4 | `backend/` en raíz | T-103 | ✅ Eliminado (⚠️ Windows bloqueó eliminación al cierre — documentado como workaround en AGENTS.md) |
| E5 | `docker-compose.yml` en raíz | T-104 | ✅ Movido a `infra/docker-compose.yml` |
| E6 | `config/.env.example` con `[credential redacted]` | T-105 | ✅ Eliminado |
| E7 | `requirements.txt` en `src/backend/` | T-106 | ✅ Movido a `config/requirements.txt` |
| E8 | `src/backend/app/` anidado | T-107 | ✅ Aplanado a `src/backend/` |
| E9 | `__pycache__/` persistentes | T-108 | ✅ Limpiados y cubiertos por `.gitignore` |
| E11 | `APARCAMENT` inconsistent | T-110 | ✅ Cambiado a `APARCAMIENTO` |

### Validación end-to-end
| Item | Estado | Resultado |
|---|---|---|
| `docker compose -f infra/docker-compose.yml up -d --build` limpio | ✅ | `db` healthy + `api` started |
| `curl http://localhost:8000/health` → 200 | ✅ | `{"status":"healthy","service":"vpro-api","version":"0.1.0"}` |
| `python -m scripts.run_ingest` con datos reales | ✅ | Primer run tras reset: `stored_events=663`, `stored_pois=2000`, `errors=0`; segundo run: `stored=0`, `skipped_duplicates=3049`, `errors=0` |

### Lo que funciona (verificado por auditoría)
- Estructura canónica: `src/backend/` sin app intermedio, `infra/docker-compose.yml`, `config/requirements.txt`, `config/Dockerfile.backend`.
- Imports desde `app.X` eliminados (grep limpio).
- `grep -r "OpenDataScraper"` → solo docstring histórica.
- `grep -r "[credential redacted]"` → vacío en código.
- `grep -r "APARCAMENT\""` → vacío.
- `.pytest_cache/` cubierto por `.gitignore`.
- Tests: **25 passed, 0 failed**.
- `src/scripts/run_ingest.py` creado.
- Credenciales fuera de git, `.env.example` con placeholders.

## Blockers activos
> ActualizaciÃ³n 2026-05-10: no hay bloqueantes activos en entorno local. Docker, ingesta, API y frontend fueron verificados en la tirada Ralph; las filas histÃ³ricas siguientes quedan superadas por esta verificaciÃ³n.

| Blocker | Propietario | Tarea |
|---|---|---|
| Validación end-to-end: Docker + ingesta real con stored > 0 | Backend + DevOps | T-111 go/no-go (pendiente de Docker funcional) |
| `backend/` vacío en raíz — Windows file lock impide eliminación instantánea | DevOps | T-103 (workaround: `Remove-Item -Recurse -Force backend` en shell limpio) |

## Próximas acciones (Fase B.2 — NEXT_STEPS)
1. **Ejecutar `run_ingest.py` en entorno Docker funcional** → verificar `stored > 0`. Si no, mapear discrepancias de campos ArcGIS.
2. **Feedback loop**: endpoint `/api/v1/feedback` (B.2).
3. **Cobertura de tests ≥70%** (B.3).
4. **T-21** (P2): ampliar datasets multimodales restantes (Valenbisi, EMT/FGV, bici, cargadores VE).
5. **T-24** (P2): endurecer Nginx de producción con security headers.

Ver [`TODO.md`](./TODO.md) para la lista completa y [`NEXT_STEPS.md`](../NEXT_STEPS.md) para el plan operativo fase a fase.

## Métricas clave
| Métrica | Valor |
|---|---|
| Backend LOC (aprox) | ~1.8k (post-pivote) |
| Tests | 79 passed, 0 failed |
| Cobertura | no medida formalmente — T-25 abierta (`--cov-fail-under=70` pendiente) |
| Vulnerabilidades | `pip-audit -r config/requirements.txt --strict` verde (0 vulnerabilidades conocidas) |
| CI | workflow `.github/workflows/ci.yml` existe; no corrido todavía (pendiente primer push) |
| Arranque Docker verificado | ✅ `db` + `api` levantan; `/health` 200 |
| Action Template Engine | ✅ 5 plantillas, 506 acciones generadas en ingesta real, cobertura de perfiles demo |
| Frontend local | ✅ `http://localhost:8080` vía Nginx muestra 6 tarjetas reales + mapa con capas, CAS/VAL runtime, selector de idioma alineado a la derecha, dirección visual Civic Utility y feedback persistido; capturas en `docs/reports/frontend-mobile.png` y `docs/reports/frontend-desktop.png` |
| Nginx producción | 🟡 `config/nginx/prod.conf` + `security-headers.conf` validados con `nginx -t` y `curl -I` local; falta dominio público + securityheaders.com tras T-23 |
| Deploy | no provisto |

## Última actualización
- **Fecha:** 2026-05-10 (T-21 multimodal cerrado + T-51 API admin `official_notices`)
- **Autor:** Codex
- **Entorno de la sesión ejecutora:** Opencode CLI + Qwen 3.6 sobre Windows — ver `docs/RULES-FOR-AGENTS.md § 10`.
- **Siguiente revisión prevista:** tras ampliar Alternative Finder con datasets multimodales restantes o endurecer Nginx de producción en T-24.
- **Nota de fuentes:** las bases permiten mantener el nucleo en el Portal de Datos Abiertos y usar fuentes oficiales complementarias trazables para eventos vivos si se documentan como `official_feed`/`official_public_info` y no sustituyen los datasets abiertos municipales.
- **T-21:** Alternative Finder multimodal cerrado: parkings, ORA, no regulados, motos, bicis, PMR, cargadores VE, EMT, FGV estaciones/bocas, Valenbisi e itinerarios ciclistas como `PointOfInterest`. `verify_datasets` confirma 14/14 capas CKAN/ArcGIS.
- **T-37/T-38/T-39/T-46/T-47/T-48/T-49/T-50/T-51:** inventario preliminar de fuentes oficiales complementarias añadido en `docs/DATA_SOURCES.md § 2.4`; `src/scripts/verify_official_sources.py` verifica endpoints y deja reporte en `docs/reports/official-sources-check.json`. EMT `estado-servicio` ya tiene parser, staging `OfficialNotice`, promoción conservadora opcional a `UrbanEvent`, tests anti-duplicado, gazetteer versionado, reporte reproducible contra `EJES_CALLE.json`, CLI operativo y API admin `GET /api/v1/official-notices`.
