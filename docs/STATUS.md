# STATUS — V-PRO

> Fuente de verdad del estado del proyecto. **Se actualiza al cierre de cada sesión/fase.**
> Versión HTML generada al cierre de fase. Si divergen, el MD es la verdad.

## Estado global
- **Salud:** 🟢 Stable — Docker validado en entorno funcional, API arranca, `/health` responde 200, `run_ingest.py` ingesta datos reales y es idempotente en segundo run. Tests verdes (94/94), cobertura backend 70,31%, `ruff`, `mypy` y `pip-audit` verdes.
- **Fase producto:** 3 · *Interfaz proactiva local* — ingesta end-to-end funcional contra BD real. Action Template Engine `T-20` genera acciones por perfil, feedback loop `/api/v1/feedback` persiste votos reales, Alternative Finder multimodal con 12 datasets POI, staging `official_notices` para avisos oficiales EMT sin geometría y promoción conservadora opcional a `UrbanEvent` mediante gazetteer versionado con validación geográfica reproducible, CLI operativo y API admin de avisos oficiales, endpoint `/api/v1/spatial/alternatives` operativo, endpoint de capas espaciales para mapa, frontend vanilla `src/frontend` servido por Nginx en `localhost:8080`, dirección visual `Civic Utility` documentada, y configuración Nginx de producción preparada con security headers.
- **Fase concurso AD.TR.15:** 0 · *Entregables* — 75% (docs + licencia + ADRs + MEMORIA con cifras reales + exports derivados ✅; Golden Path activo cambiado a `ocupacio-via-publica`; Anexo II oficial, demo/vídeo y solicitud pendientes).
- **Branch activa:** `ralph/ingesta-fuentes-info`.
- **Última release estable:** *ninguna*.
- **Commits recientes:** *no auditados esta sesión*. El siguiente agente empieza con `git log --oneline -20`.

## ActualizaciÃ³n 2026-05-10 Â· Tirada Ralph
- **Branch activa de trabajo:** `ralph/ingesta-fuentes-info`.
- **Ingesta real ejecutada:** `scraped=14814`, `normalized=14814`, `stored_pois=11710`, `stored_events=0` por duplicado previo, `skipped_duplicates=3104`, `errors=0`.
- **Conteos BD post-ingesta:** `urban_events=663`, `points_of_interest=13710`, `mitigation_actions=506`, `official_notices=20`, `feedback=19+`.
- **POIs multimodales verificados:** PMR, parkings, ORA, no regulados, motos, bicis, itinerarios ciclistas, EMT, FGV estaciones/bocas, Valenbisi y cargadores VE.
- **Fuentes oficiales:** `run_official_sources --fetch --dry-run` y `--fetch` verdes; `--promote --dry-run` escanea 20 avisos y no promociona ninguno por falta de geometrÃ­a/gazetteer fiable.
- **Frontend:** tabs `Eventos/Fuentes/MetodologÃ­a/Info`, fuente y `source_id` visibles por tarjeta, filtros de alternativas por tipo POI, CAS/VAL a la derecha, smoke Playwright verde en `localhost:8080` y `localhost:3000`.
- **Frontend rediseÃ±ado:** cabecera civica, carril izquierdo de perfiles/filtros, mapa central MapLibre, panel derecho de detalle/accion y hoja movil en flujo. Se aÃ±ade perfil `Comercial` al selector runtime y se mantiene smoke verde en mobile/desktop.
- **VerificaciÃ³n:** `ruff`, `mypy`, `pytest -q` con cobertura (94 passed, 70,31%), `pip-audit`, `docker compose up -d --build`, `/health`, API admin `official_notices` y smoke frontend verdes.

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
No hay bloqueantes activos para la demo local. Docker, ingesta, API, frontend, smoke Playwright, `ruff`, `mypy`, `pytest`, `pip-audit`, rebuild Docker y `/health` están verificados el 2026-05-10.

## Próximas acciones
1. **Producción/VPS:** cerrar T-23, T-27 y T-28 si el VPS ya está disponible. T-24 está preparado y solo falta validación pública con dominio.
2. **Concurso:** preparar Anexo II oficial, vídeo demo 90 s, revisión final de lenguaje y solicitud AD.TR.15.
3. **Producto post-MVP:** T-120 Valhalla para rutas que eviten `impact_zones`; T-121 Modo Alerta solo cuando existan fuentes oficiales verificadas.
4. **Higiene opcional:** T-33 pre-commit y T-34b deduplicación de cargadores VE.

Ver [`TODO.md`](./TODO.md) para la lista completa y [`NEXT_STEPS.md`](../NEXT_STEPS.md) para el plan operativo fase a fase.

## Métricas clave
| Métrica | Valor |
|---|---|
| Backend LOC (aprox) | ~1.8k (post-pivote) |
| Tests | 94 passed, 0 failed |
| Cobertura | 70,31% (`python -m pytest tests -q --cov=src/backend --cov-report=term-missing --cov-fail-under=70`) |
| Vulnerabilidades | `pip-audit -r config/requirements.txt --strict` verde (0 vulnerabilidades conocidas) |
| CI | workflow `.github/workflows/ci.yml` existe; no auditado en esta sesión tras el push remoto |
| Arranque Docker verificado | ✅ `db` + `api` levantan; `/health` 200 |
| Action Template Engine | ✅ 5 plantillas, 506 acciones generadas en ingesta real, cobertura de perfiles demo |
| Golden Path predespliegue | ✅ Demo recomendada: perfil Comercial sobre `ocupacio-via-publica` actual con enlace municipal real; `talls-transit-falles` queda como histórico/fallback documentado |
| Frontend local | ✅ `http://localhost:3000`/`8080` muestra 6 tarjetas reales, mapa con leyenda ampliada y popups clicables, CAS/VAL runtime, selector de idioma alineado a la derecha, nota AD.TR.15 + GitHub, nav incrustada `Eventos/Fuentes/Metodología/Info`, tráfico solo con incidencia relevante y feedback persistido; capturas en `docs/reports/frontend-mobile.png`, `docs/reports/frontend-desktop.png` y `docs/reports/frontend-polish-current.png` |
| Frontend civic utility | ✅ Rediseño map-first con cabecera institucional, perfiles/filtros en carril izquierdo, MapLibre central, detalle seleccionado a la derecha, hoja móvil en flujo y perfil Comercial; smoke Playwright mobile/desktop verde |
| Lighthouse mobile | ✅ Performance 93, Accessibility 100, Best Practices 100 (`docs/reports/lighthouse-mobile.json`) |
| Nginx producción | 🟡 `config/nginx/prod.conf` + `security-headers.conf` validados con `nginx -t` y `curl -I` local; falta dominio público + securityheaders.com tras T-23 |
| Deploy | pendiente de T-23/T-27/T-28 sobre VPS disponible |

## Última actualización
- **Fecha:** 2026-05-10 (R-19 claridad de mapa y contenidos)
- **Autor:** Codex
- **Entorno de la sesión ejecutora:** Opencode CLI + Qwen 3.6 sobre Windows — ver `docs/RULES-FOR-AGENTS.md § 10`.
- **Siguiente revisión prevista:** preparación de VPS/producción si se confirma dominio, SSH y sistema operativo del servidor.
- **Nota de fuentes:** las bases permiten mantener el nucleo en el Portal de Datos Abiertos y usar fuentes oficiales complementarias trazables para eventos vivos si se documentan como `official_feed`/`official_public_info` y no sustituyen los datasets abiertos municipales.
- **T-21:** Alternative Finder multimodal cerrado: parkings, ORA, no regulados, motos, bicis, PMR, cargadores VE, EMT, FGV estaciones/bocas, Valenbisi e itinerarios ciclistas como `PointOfInterest`. `verify_datasets` confirma 14/14 capas CKAN/ArcGIS.
- **T-37/T-38/T-39/T-46/T-47/T-48/T-49/T-50/T-51:** inventario preliminar de fuentes oficiales complementarias añadido en `docs/DATA_SOURCES.md § 2.4`; `src/scripts/verify_official_sources.py` verifica endpoints y deja reporte en `docs/reports/official-sources-check.json`. EMT `estado-servicio` ya tiene parser, staging `OfficialNotice`, promoción conservadora opcional a `UrbanEvent`, tests anti-duplicado, gazetteer versionado, reporte reproducible contra `EJES_CALLE.json`, CLI operativo y API admin `GET /api/v1/official-notices`.

- **T-26:** export derivados cerrado con src/scripts/export_derived_data.py y archivos versionados exports/impact_zones.geojson (663 zonas), exports/mitigation_actions.csv (506 acciones) y exports/feedback_aggregated.csv (agregado anonimo).
- **T-29:** cifras reproducibles de memoria cerradas: 253 ocupaciones, 410 tramos de trafico, 2.161 plazas/registros PMR, ZBE 27,44 km2 y 20,38% del termino municipal. Query y resultado en docs/reports/memoria-figures.*.
- **T-20c:** catalogo de 12 URLs oficiales municipales cerrado en docs/concurso/tramites-referenciados.md; 6 URLs enlazadas desde plantillas YAML.
- **T-25/T-112:** QA formal cerrado con cobertura 70,31%, 94 tests y rate-limit 429 real.
- **Frontend demo:** smoke mobile/desktop verde y Lighthouse mobile 93/100/100 en medicion previa; tras R-13 MapLibre se carga con idle/timeout corto para servir el layout map-first.
- **T-36:** ganadores anteriores documentados en `docs/concurso/ganadores-anteriores.md`; V-PRO se diferencia como bucle operativo de accion, no como visor o prediccion monofuncional.
- **T-116:** pulido frontend de concurso cerrado: mapa sin solape de pestañas (`overlapsTabs=false`), leyenda y popups de capas, enlace GitHub/AD.TR.15 y revisión ES/VAL de acentos principales.
- **R-12:** reorganización explicativa cerrada: el mapa pasa a lateral solo desde 1100px; cabecera, Eventos, Fuentes, Metodología e Info explican producto, uso, fuentes, mapa, limitaciones y FAQ.
- **R-13:** rediseño Civic Utility map-first cerrado: nueva cabecera cívica, carril izquierdo, mapa central, panel derecho de acción, perfil Comercial, hoja móvil en flujo y smoke Playwright mobile/desktop verde.
- **R-14:** predespliegue concurso: `talls-transit-falles` deja de ser Golden Path activo; `comercio-ocupacion` aplica a ocupaciones actuales desde severidad 1 y muestra trámite municipal real en perfil Comercio; memoria reforzada con marca `VLC PROACTIVA (València Proactiva)` y frase de datos derivados.
- **R-15:** pulido institucional: Fuentes, Metodología e Info explican trazabilidad, Open Data 2.0, Digital Twin simplificado, simbología del mapa y FAQ estratégica; la UI añade atribución CC BY 4.0 y CTA administrativo moderado.
- **R-16:** claridad de producto: eliminada nav superior duplicada, marca visible `VLC PROACTIVA`, perfiles con alternativa prioritaria distinta, aviso explícito de que Maps no evita incidencias, listado concreto de datasets en Fuentes, `comercio-ocupacion` cambia de ayudas genéricas `AE.CM.35` a carga/descarga `TR.AR.45`, y carga frontend con debounce anti-429.
- **R-17:** navegación integrada en header: `Fuentes`, `Metodología` e `Info` se abren como drawer superpuesto y el mapa queda siempre como superficie principal. Añadidas tareas T-120 (Valhalla + `exclude_polygons`) y T-121 (Modo Alerta solo con fuentes oficiales verificadas).
- **R-18:** severidad y diseño operativo: las ocupaciones sin gravedad oficial ya no caen todas a `1`; V-PRO deriva impacto conservador desde superficie y tipo de afección. Reingesta dev tras el cambio: `OCUPACION` queda `1=39`, `2=42`, `3=172`; `TRAFICO` queda `1=410` por estado oficial actual. El frontend pasa a layout flotante sobre mapa, con badges `Impacto`, modo claro/oscuro y paneles menos cuadriculados.
- **R-19:** claridad de mapa y contenidos: nav de secciones incrustada sin cajas, zonas de impacto limitadas a eventos visibles, tráfico normal no se pinta, leyenda más legible y Fuentes/Metodología/Info pasan a bloques escaneables con separadores/acordeones.
