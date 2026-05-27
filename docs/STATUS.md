# STATUS â€” V-PRO

> Fuente de verdad del estado del proyecto. **Se actualiza al cierre de cada sesiÃ³n/fase.**
> VersiÃ³n HTML generada al cierre de fase. Si divergen, el MD es la verdad.

## Estado global
- **Salud:** ðŸŸ¢ Stable â€” Docker validado en entorno funcional, API arranca, `/health` responde 200, `run_ingest.py` ingesta datos reales y refresca ubicaciones legibles en reingesta idempotente. Tests verdes (103/103), `ruff`, `mypy`, `pip-audit` y smoke Playwright mobile/desktop verdes.
- **Fase producto:** 3 Â· *Interfaz proactiva local* â€” ingesta end-to-end funcional contra BD real. Action Template Engine `T-20` genera acciones por perfil, feedback loop `/api/v1/feedback` persiste votos reales, Alternative Finder multimodal con 12 datasets POI, `official_notices` como capa de validaciÃ³n diferida para avisos oficiales EMT sin geometrÃ­a y promociÃ³n conservadora opcional a `UrbanEvent` mediante gazetteer versionado con validaciÃ³n geogrÃ¡fica reproducible, CLI operativo y API admin de avisos oficiales, endpoint `/api/v1/spatial/alternatives` operativo, endpoint de capas espaciales para mapa, eventos con `location_label` humano en API/UI, frontend vanilla `src/frontend` servido por Nginx en `localhost:8080`, direcciÃ³n visual `Civic Utility` documentada con reglas tipogrÃ¡ficas para calles largas, exports pÃºblicos con feed/permalinks/salud de datos, y configuraciÃ³n Nginx/systemd de producciÃ³n preparada para CX23.
- **Fase concurso AD.TR.15:** 0 Â· *Entregables* â€” 92% (docs + licencia + ADRs + MEMORIA con cifras reales + exports derivados + producciÃ³n HTTPS + checklist AD.TR.15 + fixes QA criticos desplegados âœ…; Golden Path activo cambiado a `ocupacio-via-publica`; falta Anexo II oficial, demo/video y solicitud).
- **Branch activa:** `ralph/ingesta-fuentes-info`.
- **Ãšltima release estable:** `v1.0-adtr15` publicada en GitHub el 2026-05-27.
- **Commits recientes:** *no auditados esta sesiÃ³n*. El siguiente agente empieza con `git log --oneline -20`.

## ActualizaciÃƒÂ³n 2026-05-10 Ã‚Â· Tirada Ralph
- **Branch activa de trabajo:** `ralph/ingesta-fuentes-info`.
- **Ingesta real ejecutada:** `scraped=14814`, `normalized=14814`, `stored_pois=11710`, `stored_events=0` por duplicado previo, `skipped_duplicates=3104`, `errors=0`.
- **Conteos BD post-ingesta:** `urban_events=663`, `points_of_interest=13710`, `mitigation_actions=506`, `official_notices=20`, `feedback=19+`.
- **POIs multimodales verificados:** PMR, parkings, ORA, no regulados, motos, bicis, itinerarios ciclistas, EMT, FGV estaciones/bocas, Valenbisi y cargadores VE.
- **Fuentes oficiales:** `run_official_sources --fetch --dry-run` y `--fetch` verdes; `--promote --dry-run` escanea 20 avisos y no promociona ninguno por falta de geometrÃƒÂ­a/gazetteer fiable.
- **Frontend:** tabs `Eventos/Fuentes/MetodologÃƒÂ­a/Info`, fuente y `source_id` visibles por tarjeta, filtros de alternativas por tipo POI, CAS/VAL a la derecha, smoke Playwright verde en `localhost:8080` y `localhost:3000`.
- **Frontend rediseÃƒÂ±ado:** cabecera civica, carril izquierdo de perfiles/filtros, mapa central MapLibre, panel derecho de detalle/accion y hoja movil en flujo. Se aÃƒÂ±ade perfil `Comercial` al selector runtime y se mantiene smoke verde en mobile/desktop.
- **VerificaciÃƒÂ³n:** `ruff`, `mypy`, `pytest -q` con cobertura (94 passed, 70,31%), `pip-audit`, `docker compose up -d --build`, `/health`, API admin `official_notices` y smoke frontend verdes.

## Actualizacion 2026-05-17 Â· Ubicaciones legibles
- **Cambio producto:** coordenadas visibles sustituidas por nombres de lugar en tarjetas, panel de detalle y snapshot. Ejemplos verificados en API local: `C/ BENETUSSER 14`, `C/ TORRES 2`, `C/ PABLO MELENDEZ 2`.
- **Ajuste visual:** las alertas ya no muestran dos cajas verdes; la verificacion queda como texto de confianza y el chip de impacto conserva el foco visual.
- **Ajuste visual:** la hoja inferior de detalle puede contraerse, evita el doble scroll, usa fondo flotante con blur y mejora la jerarquia de tarjeta activa y feedback movil.
- **Memoria/concurso:** `docs/MEMORIA.md` queda alineada con la narrativa de interfaz (`Fuentes`, `Info`, validacion diferida, economia circular del dato y snapshots para medios). Se aÃ±ade guia de publicacion publica segura: repo publico limpio, sin historial privado ni secretos.
- **FAQ de primera visita:** `Info` pasa de 3 preguntas conceptuales a 9 preguntas practicas sobre lectura de tarjetas, perfiles, filtros, impacto, feedback y limites oficiales.
- **Aviso local de novedades:** `Eventos cercanos` compara la ultima visita y el perfil activo en `localStorage` para mostrar incidencias nuevas sin telemetria de servidor.
- **Backend/datos:** `UrbanEventResponse.location_label` sale de `extra_data.location_label`; la ingesta conserva `desc_calle` + `numero_policia_origen` y refresca duplicados existentes aunque no cambie la severidad.
- **Ingesta real ejecutada:** `scraped=14220`, `normalized=14220`, `stored=0`, `refreshed_events=1006`, `skipped_duplicates=14220`, `errors=0` tras segunda pasada idempotente.
- **Verificacion:** `ruff`, `mypy`, `pytest -q` (103 passed), `pip-audit`, `docker compose up -d --build`, `/health`, API local y smoke Playwright mobile/desktop verdes; capturas `docs/reports/frontend-mobile.png` y `docs/reports/frontend-desktop.png` regeneradas.

## Actualizacion 2026-05-24 Â· Legibilidad tipografica
- **Cambio frontend:** tarjetas de `Eventos cercanos` y panel de detalle usan tokens tipograficos explicitos, pesos menos extremos y cortes de calles por palabras para evitar que direcciones largas se lean letra a letra.
- **Referencia externa:** `nexu-io/open-design` se usa como criterio de proceso (direccion, tokens y anti-patrones), no como sistema visual copiado.
- **Verificacion:** `node --check src/frontend/assets/app.js`, `node --check tests/frontend/smoke.mjs` y smoke Playwright mobile/desktop contra `localhost:8080` verdes; captura limpia en `docs/reports/frontend-desktop-typography-check.png`.

## Actualizacion 2026-05-24 Â· Primer despliegue VPS
- **Produccion:** servidor CX23 provisionado mediante alias SSH local `vpro-prod`, sin versionar IP, ID de proveedor ni IPv6. Nginx, PostgreSQL/PostGIS, usuario `vpro`, UFW, unattended-upgrades, API systemd, ingesta y export quedan instalados.
- **Runtime:** dependencias instaladas con `uv` y Python 3.12 local bajo `/opt/vpro/.python` para evitar incompatibilidades del Python del sistema con ruedas geoespaciales.
- **Datos reales en VPS:** ingesta produccion ejecutada con `scraped=14240`, `normalized=14240`, `stored_events=669`, `stored_pois=13159`, `refreshed_events=357`, `errors=0`; export publico generado con `impact_zones=672`, `mitigation_actions=950`, `latest_events=100`, `event_pages=100` y `data_health=6`.
- **Servicios:** `vpro-api.service` y `nginx` activos; `vpro-ingest.timer` y `vpro-export.timer` activos cada 30 minutos; `/health`, `/exports/data_health.json` y frontend responden 200 desde red publica.
- **Seguridad HTTP:** `server_tokens off` aplicado en Nginx global del VPS; cabeceras CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP y CORP verificadas con `curl -I`.

## Actualizacion 2026-05-24 Â· Candidatura y repo publico
- **Checklist AD.TR.15:** `docs/concurso/checklist-candidatura-adtr15.md` resume requisitos formales, criterios de valoraciÃ³n, evidencias de producciÃ³n y pendientes administrativos.
- **Demo/repo:** `README.md` y `docs/MEMORIA.md` enlazan `https://vlcproactiva.es`, salud API, salud de datos, feed pÃºblico y `https://github.com/Huntsman1756/Valencia_Proactiva`.
- **Auditoria repo publico:** GitHub confirma el repo como pÃºblico. La rama por defecto `main` sigue en un commit inicial; la rama pÃºblica `ralph/ingesta-fuentes-info` estÃ¡ mÃ¡s avanzada, pero la solicitud final debe enlazar una rama por defecto o release/tag sincronizada con la release local auditada.
- **Privacidad/publicacion:** documentaciÃ³n actualizada para excluir `.env`, claves, IP/ID del VPS, certificados, documentos administrativos, datos personales y artefactos internos innecesarios del repositorio pÃºblico.

## Actualizacion 2026-05-24 Â· Pasada UI informativa
- **Mapa desktop:** el control `Expandir` deja de quedar cubierto por el panel derecho de `Eventos cercanos`; la barra del mapa reserva margen frente al carril derecho y en modo expandido vuelve a usar inset completo.
- **Fuentes:** el bloque de feedback se presenta como `Datos derivados VLC PROACTIVA` y muestra `3 artefactos` reales en vez de `1 dataset`, para no confundir una fuente de datos con los ficheros derivados publicados.
- **Copy civico:** el saludo lateral cambia a `Valencia ahora` / `Valencia ara`, con tono mas operativo y menos conversacional.
- **Produccion:** frontend sincronizado en `vlcproactiva.es`; verificado con cache-buster que el boton `Expandir` queda separado del panel derecho (`gap=128`, `overlap=false`) y que el dominio sirve `z-index: 30`, `right: 520px`, `datasetCount: 3` y `derivedArtifactCount`.
- **QA produccion:** se detecta y corrige solape leve entre panel inferior y carril derecho en desktop, y se limpian sufijos de portal `0` en calles visibles como `C/ ARQUITECTE SEGURA DE LAGO`.
- **Copy produccion:** se retiran referencias visibles a `demo local` y `API local` del frontend publico; la web se presenta como servicio experimental operativo y mantiene el limite de no sustituir avisos oficiales.
- **Robustez API:** la UI ya no muestra estado global de API no disponible por fallos puntuales/rate-limit en `/spatial/alternatives`; conserva eventos y deja la alternativa como no disponible para esa tarjeta.
- **Robustez exports:** el procedimiento de despliegue excluye `/var/www/vpro/exports` al sincronizar frontend y Nginx ya no sirve `index.html` como fallback para `/exports/*`; si falta un JSON publico, el fallo es 404 y no HTML disfrazado.
- **Verificacion:** `node --check src/frontend/assets/app.js`, `node --check tests/frontend/smoke.mjs`, validacion JSON de `es.json`/`val.json`, smoke Playwright mobile/desktop contra `localhost:8080` y `https://vlcproactiva.es`, QA visual desktop/narrow/mobile con capturas `docs/reports/prod-qa-*.png` y medicion de produccion (`detailEventsOverlap=false`, `gapDetailToEvents=38`, `horizontalOverflow=0`).

## Actualizacion 2026-05-26 Â· Limpieza operativa de Eventos
- **Eventos:** se limpia la superficie principal retirando controles visibles redundantes (`Vista resumida`, `Mostrar ZBE`, distintivo ambiental) y dejando el perfil como selector principal; las alternativas quedan como override manual.
- **Idioma/navegacion:** CAS/VAL pasa a desplegable con bandera y nombre de idioma; `Fuentes`, `Metodologia` e `Info` actualizan hash de URL, y la marca vuelve a `Eventos`.
- **Mapa:** popups unificados para evitar ventanas superpuestas, contraste corregido en modo noche, leyenda plegable y carga de capas rehidratada al expandir.
- **Detalle:** `Exportar snapshot` pasa a copiar una ficha legible; feedback se presenta como voto anonimo agregado (`Me ayuda` / `No me ayuda`) y no como `+ Util`.
- **Info/Metodologia:** se retiran metricas agregadas sin contexto, referencia Estonia/X-Road y etiqueta `Digital Twin`; la informacion visible queda vinculada a la vista actual y a limites verificables.
- **Produccion:** desplegado en `https://vlcproactiva.es` sin tocar `/exports`; smoke Playwright mobile/desktop verde contra produccion y comprobacion especifica de popup en tema oscuro (`bg=rgb(23, 28, 36)`, texto claro, `popupCount=1`).

## Actualizacion 2026-05-26 Â· Segunda limpieza operativa de Eventos
- **Eventos:** Vehiculo y ZBE queda retirado del DOM visible y de la logica de frontend porque no habia flujo accionable suficiente; el perfil y el tipo de alternativa son los controles principales.
- **Cabecera:** el selector de idioma evita mostrar claves internas como clave interna de idioma; el modo claro/oscuro usa iconos sol/luna y el contador superior explica que son eventos actualizados visibles.
- **Detalle:** se retira copia de ficha del panel principal; Me ayuda / No me ayuda se mantiene como valoracion anonima agregada para auditar recomendaciones.
- **Tramites:** los enlaces de accion ciudadana solo se renderizan si la accion aporta una URL municipal reconocible y compatible con el perfil activo.
- **Correccion visual:** el menu de idioma fuerza `Castellano` / `Valencia` aunque una traduccion llegue tarde y la bandeja inferior del mapa expandido usa fondo oscuro en modo noche.
- **Copy:** `Fuentes`, `Metodologia` e `Info` reducen tono promocional y explican datos, calculo, limites y reutilizacion con frases mas directas.
- **Produccion:** desplegado en https://vlcproactiva.es; smoke Playwright mobile/desktop verde contra produccion y comprobacion especifica de idioma, iconos, ausencia de ZBE/copia, centrado de pestanas informativas y enlaces municipales.

## Actualizacion 2026-05-27 - QA critico AD.TR.15
- **Bloque QA cerrado:** touch targets, foco movil, warnings MapLibre por nulos, metricas, caso de uso y enlaces de release quedan corregidos en produccion.
- **Accesibilidad:** auditoria movil contra `https://vlcproactiva.es` devuelve `smallTargets=0` y `focusOutsideViewport=false` tras tabulacion.
- **Datos:** `data_health.json` se lee aunque `metrics` venga como objeto; la UI explica juntas las cifras `6 eventos visibles`, `100 eventos recientes` y `745 registros urbanos procesados`, y `official_notices=0` se muestra como avisos oficiales con geometria pendiente.
- **Mapa:** GeoJSON saneado antes de pintar capas MapLibre; mapa base raster OSM y CSP actualizada eliminan warnings `Expected value to be of type number, but found null instead`.
- **Verificacion:** `node --check src/frontend/assets/app.js`, validacion JSON i18n, smoke Playwright produccion verde y Nginx `nginx -t` correcto. Solo se observan warnings WebGL de Chromium headless en una corrida movil, sin errores JS/CSP ni warnings de datos.

## Actualizacion 2026-05-27 Â· Entrada progresiva de Eventos
- **Eventos:** la primera vista queda menos saturada: perfil, mapa y eventos cercanos son el foco inicial; detalle inferior, leyenda y alternativas arrancan plegados.
- **Desktop:** se ocultan el bloque de bienvenida y la nota lateral de fuentes en la entrada operativa; las fuentes completas siguen en la pestana `Fuentes`.
- **Verificacion:** `node --check`, validacion JSON, smoke Playwright mobile/desktop local y produccion, captura `docs/reports/prod-entry-density.png` y medicion de entrada (`detailCollapsed=true`, `legendCollapsed=true`, `quickFiltersOpen=false`, `horizontalOverflow=0`).

## Actualizacion 2026-05-27 Â· PestaÃ±as informativas AD.TR.15
- **Navegacion:** `Info` se renombra a `Informacion` / `Informacio` para evitar abreviatura opaca.
- **Fuentes/Metodologia/Informacion:** se aÃ±ade una banda de evidencia alineada con AD.TR.15 (`Datos abiertos`, `Reutilizacion`, `Impacto local`, `Verificacion`) y se reorganiza `Fuentes` para que los enlaces no floten en una columna vacia.
- **Referencia de diseÃ±o:** `open-design` se usa como criterio de sistema (tokens, jerarquia, componentes auditables), no como copia visual.
- **Verificacion:** smoke Playwright local y produccion verdes; captura `docs/reports/prod-sources-evidence-pass.png` y medicion (`sourceLinks=3`, `horizontalOverflow=0`, `tabInfo=Informacion`).

## Resumen ejecutivo
Proyecto V-PRO, candidato al premio AD.TR.15 categorÃ­a Datos Abiertos. **Plataforma de movilidad proactiva** con 5 perfiles de usuario (GenÃ©rico, Comercial, PMR, Ciclista, Transporte pÃºblico) y feedback loop ciudadano, basada en datasets reales del portal municipal (verificados 2026-05-09).

Arquitectura firmada en 4 ADRs:
- [ADR-001](./DECISIONS.md#adr-001) â€” Python + PostGIS como excepciÃ³n documentada al canonical stack.
- [ADR-002](./DECISIONS.md#adr-002) â€” Retirada de Celery/Redis â†’ scheduler = Cron.
- [ADR-003](./DECISIONS.md#adr-003) â€” Frontend vanilla + MapLibre (sin Next.js/Tailwind/Framer).
- [ADR-004](./DECISIONS.md#adr-004) â€” Pivote de datasets + scraper cliente ArcGIS REST.

## Estado de la sesiÃ³n del 2026-05-09 (tarde)

**ReportÃ³ 14/14 P1 completadas:** T-01, T-02, T-03, T-04, T-05b, T-05-bis, T-06, T-06b, T-06c, T-07, T-08, T-09, T-10, T-12, T-34.

**VerificaciÃ³n del orquestador:** detectÃ³ 3 bloqueantes + 8 deudas estructurales. Las tareas se marcaron sin pasar el protocolo de cierre (`docs/RULES-FOR-AGENTS.md Â§ 9`). **Bloque correctivo ejecutado y cerrado en la sesiÃ³n siguiente.**

### Bloqueantes â€” RESUELTOS en bloque correctivo T-100..T-111
| # | Problema | Tarea | Resultado |
|---|---|---|---|
| E1 | `src/backend/app/ingestion/ingestion/` anidado | T-100 | âœ… Aplanado a `src/backend/ingestion/` |
| E2 | Import `OpenDataScraper` roto | T-101 | âœ… Cambiado a `ArcGiSCRaper` |
| E3 | `geometry_type="POLYGON"` rÃ­gido | T-102 | âœ… Cambiado a `GEOMETRY` |
| E10 | Tests con enum viejo (`OBRA`, `EVENTO`) | T-109 | âœ… Actualizados 25 passed |

### Deuda estructural â€” RESUELTAS en bloque correctivo
| # | Problema | Tarea | Resultado |
|---|---|---|---|
| E4 | `backend/` en raÃ­z | T-103 | âœ… Eliminado (âš ï¸ Windows bloqueÃ³ eliminaciÃ³n al cierre â€” documentado como workaround en AGENTS.md) |
| E5 | `docker-compose.yml` en raÃ­z | T-104 | âœ… Movido a `infra/docker-compose.yml` |
| E6 | `config/.env.example` con `[credential redacted]` | T-105 | âœ… Eliminado |
| E7 | `requirements.txt` en `src/backend/` | T-106 | âœ… Movido a `config/requirements.txt` |
| E8 | `src/backend/app/` anidado | T-107 | âœ… Aplanado a `src/backend/` |
| E9 | `__pycache__/` persistentes | T-108 | âœ… Limpiados y cubiertos por `.gitignore` |
| E11 | `APARCAMENT` inconsistent | T-110 | âœ… Cambiado a `APARCAMIENTO` |

### ValidaciÃ³n end-to-end
| Item | Estado | Resultado |
|---|---|---|
| `docker compose -f infra/docker-compose.yml up -d --build` limpio | âœ… | `db` healthy + `api` started |
| `curl http://localhost:8000/health` â†’ 200 | âœ… | `{"status":"healthy","service":"vpro-api","version":"0.1.0"}` |
| `python -m scripts.run_ingest` con datos reales | âœ… | Primer run tras reset: `stored_events=663`, `stored_pois=2000`, `errors=0`; segundo run: `stored=0`, `skipped_duplicates=3049`, `errors=0` |

### Lo que funciona (verificado por auditorÃ­a)
- Estructura canÃ³nica: `src/backend/` sin app intermedio, `infra/docker-compose.yml`, `config/requirements.txt`, `config/Dockerfile.backend`.
- Imports desde `app.X` eliminados (grep limpio).
- `grep -r "OpenDataScraper"` â†’ solo docstring histÃ³rica.
- `grep -r "[credential redacted]"` â†’ vacÃ­o en cÃ³digo.
- `grep -r "APARCAMENT\""` â†’ vacÃ­o.
- `.pytest_cache/` cubierto por `.gitignore`.
- Tests: **25 passed, 0 failed**.
- `src/scripts/run_ingest.py` creado.
- Credenciales fuera de git, `.env.example` con placeholders.

## Blockers activos
No hay bloqueantes activos para la demo local. Docker, ingesta, API, frontend, smoke Playwright, `ruff`, `mypy`, `pytest`, `pip-audit`, rebuild Docker y `/health` estÃ¡n verificados el 2026-05-10.

## PrÃ³ximas acciones
1. **ProducciÃ³n/VPS:** release HTTPS en `vlcproactiva.es` ejecutada mediante alias SSH local. Queda pendiente validacion externa con securityheaders.com. La IP y datos de proveedor quedan fuera de git.
2. **Concurso:** sincronizar GitHub pÃºblico con la release local auditada, preparar Anexo II oficial, vÃ­deo demo 90 s, revisiÃ³n final de lenguaje y solicitud AD.TR.15.
3. **Producto post-MVP:** T-120 Valhalla para rutas que eviten `impact_zones`; T-121 Modo Alerta solo cuando existan fuentes oficiales verificadas.
4. **Higiene opcional:** T-33 pre-commit y T-34b deduplicaciÃ³n de cargadores VE.

Ver [`TODO.md`](./TODO.md) para la lista completa y [`NEXT_STEPS.md`](../NEXT_STEPS.md) para el plan operativo fase a fase.

## MÃ©tricas clave
| MÃ©trica | Valor |
|---|---|
| Backend LOC (aprox) | ~1.8k (post-pivote) |
| Tests | 94 passed, 0 failed |
| Cobertura | 70,31% (`python -m pytest tests -q --cov=src/backend --cov-report=term-missing --cov-fail-under=70`) |
| Vulnerabilidades | `pip-audit -r config/requirements.txt --strict` verde (0 vulnerabilidades conocidas) |
| CI | workflow `.github/workflows/ci.yml` existe; no auditado en esta sesiÃ³n tras el push remoto |
| Arranque Docker verificado | âœ… `db` + `api` levantan; `/health` 200 |
| Action Template Engine | âœ… 5 plantillas, 506 acciones generadas en ingesta real, cobertura de perfiles demo |
| Golden Path predespliegue | âœ… Demo recomendada: perfil Comercial sobre `ocupacio-via-publica` actual con enlace municipal real; `talls-transit-falles` queda como histÃ³rico/fallback documentado |
| Frontend local | âœ… `http://localhost:3000`/`8080` muestra 6 tarjetas reales, mapa con leyenda ampliada y popups clicables, CAS/VAL runtime, selector de idioma alineado a la derecha, nota AD.TR.15 + GitHub, nav incrustada `Eventos/Fuentes/MetodologÃ­a/Info`, trÃ¡fico solo con incidencia relevante y feedback persistido; capturas en `docs/reports/frontend-mobile.png`, `docs/reports/frontend-desktop.png` y `docs/reports/frontend-polish-current.png` |
| Frontend civic utility | âœ… RediseÃ±o map-first con cabecera institucional, perfiles/filtros en carril izquierdo, MapLibre central, detalle seleccionado a la derecha, hoja mÃ³vil en flujo y perfil Comercial; smoke Playwright mobile/desktop verde |
| Lighthouse mobile | âœ… Performance 93, Accessibility 100, Best Practices 100 (`docs/reports/lighthouse-mobile.json`) |
| Nginx producciÃ³n | ðŸŸ¢ `https://vlcproactiva.es` validado con Let's Encrypt, redireccion HTTPâ†’HTTPS, `server_tokens off`, frontend 200 y cabeceras de seguridad por `curl -I`; falta securityheaders.com |
| Exports pÃºblicos | ðŸŸ¢ `export_derived_data.py` genera `impact_zones.geojson`, `mitigation_actions.csv`, `feedback_aggregated.csv`, `latest_events.json`, `data_health.json` y `events/<id>.html` |
| Deploy | ðŸŸ¢ release VPS HTTPS ejecutada por alias SSH local; API, frontend, ingesta, export y timers activos |

## Ãšltima actualizaciÃ³n
- **Fecha:** 2026-05-24 (checklist candidatura AD.TR.15 y auditoria de repo publico)
- **Autor:** Codex
- **Entorno de la sesiÃ³n ejecutora:** Opencode CLI + Qwen 3.6 sobre Windows â€” ver `docs/RULES-FOR-AGENTS.md Â§ 10`.
- **Siguiente revisiÃ³n prevista:** validar securityheaders.com sobre `https://vlcproactiva.es` y cerrar ajuste final de cabeceras si aparece alguna recomendacion.
- **Nota de fuentes:** las bases permiten mantener el nucleo en el Portal de Datos Abiertos y usar fuentes oficiales complementarias trazables para eventos vivos si se documentan como `official_feed`/`official_public_info` y no sustituyen los datasets abiertos municipales.
- **T-21:** Alternative Finder multimodal cerrado: parkings, ORA, no regulados, motos, bicis, PMR, cargadores VE, EMT, FGV estaciones/bocas, Valenbisi e itinerarios ciclistas como `PointOfInterest`. `verify_datasets` confirma 14/14 capas CKAN/ArcGIS.
- **T-37/T-38/T-39/T-46/T-47/T-48/T-49/T-50/T-51:** inventario preliminar de fuentes oficiales complementarias aÃ±adido en `docs/DATA_SOURCES.md Â§ 2.4`; `src/scripts/verify_official_sources.py` verifica endpoints y deja reporte en `docs/reports/official-sources-check.json`. EMT `estado-servicio` ya tiene parser, `OfficialNotice` como avisos en proceso de geolocalizaciÃ³n, promociÃ³n conservadora opcional a `UrbanEvent`, tests anti-duplicado, gazetteer versionado, reporte reproducible contra `EJES_CALLE.json`, CLI operativo y API admin `GET /api/v1/official-notices`.

- **T-26:** export derivados ampliado con src/scripts/export_derived_data.py: `impact_zones.geojson`, `mitigation_actions.csv`, `feedback_aggregated.csv`, `latest_events.json`, `data_health.json` y permalinks `events/<event_id>.html`.
- **T-29:** cifras reproducibles de memoria cerradas: 253 ocupaciones, 410 tramos de trafico, 2.161 plazas/registros PMR, ZBE 27,44 km2 y 20,38% del termino municipal. Query y resultado en docs/reports/memoria-figures.*.
- **T-20c:** catalogo de 12 URLs oficiales municipales cerrado en docs/concurso/tramites-referenciados.md; 6 URLs enlazadas desde plantillas YAML.
- **T-25/T-112:** QA formal cerrado con cobertura 70,31%, 94 tests y rate-limit 429 real.
- **Frontend demo:** smoke mobile/desktop verde y Lighthouse mobile 93/100/100 en medicion previa; tras R-13 MapLibre se carga con idle/timeout corto para servir el layout map-first.
- **T-36:** ganadores anteriores documentados en `docs/concurso/ganadores-anteriores.md`; V-PRO se diferencia como bucle operativo de accion, no como visor o prediccion monofuncional.
- **T-116:** pulido frontend de concurso cerrado: mapa sin solape de pestaÃ±as (`overlapsTabs=false`), leyenda y popups de capas, enlace GitHub/AD.TR.15 y revisiÃ³n ES/VAL de acentos principales.
- **R-12:** reorganizaciÃ³n explicativa cerrada: el mapa pasa a lateral solo desde 1100px; cabecera, Eventos, Fuentes, MetodologÃ­a e Info explican producto, uso, fuentes, mapa, limitaciones y FAQ.
- **R-13:** rediseÃ±o Civic Utility map-first cerrado: nueva cabecera cÃ­vica, carril izquierdo, mapa central, panel derecho de acciÃ³n, perfil Comercial, hoja mÃ³vil en flujo y smoke Playwright mobile/desktop verde.
- **R-14:** predespliegue concurso: `talls-transit-falles` deja de ser Golden Path activo; `comercio-ocupacion` aplica a ocupaciones actuales desde severidad 1 y muestra trÃ¡mite municipal real en perfil Comercio; memoria reforzada con marca `VLC PROACTIVA (ValÃ¨ncia Proactiva)` y frase de datos derivados.
- **R-15:** pulido institucional: Fuentes, MetodologÃ­a e Info explican trazabilidad, Open Data 2.0, Digital Twin simplificado, simbologÃ­a del mapa y FAQ estratÃ©gica; la UI aÃ±ade atribuciÃ³n CC BY 4.0 y CTA administrativo moderado.
- **R-16:** claridad de producto: eliminada nav superior duplicada, marca visible `VLC PROACTIVA`, perfiles con alternativa prioritaria distinta, aviso explÃ­cito de que Maps no evita incidencias, listado concreto de datasets en Fuentes, `comercio-ocupacion` cambia de ayudas genÃ©ricas `AE.CM.35` a carga/descarga `TR.AR.45`, y carga frontend con debounce anti-429.
- **R-17:** navegaciÃ³n integrada en header: `Fuentes`, `MetodologÃ­a` e `Info` se muestran como pestaÃ±as centrales a pÃ¡gina completa del Ã¡rea principal, sin mapa ni panel derecho superpuestos. AÃ±adidas tareas T-120 (Valhalla + `exclude_polygons`) y T-121 (Modo Alerta solo con fuentes oficiales verificadas).
- **R-18:** severidad y diseÃ±o operativo: las ocupaciones sin gravedad oficial ya no caen todas a `1`; V-PRO deriva impacto conservador desde superficie y tipo de afecciÃ³n. Reingesta dev tras el cambio: `OCUPACION` queda `1=39`, `2=42`, `3=172`; `TRAFICO` queda `1=410` por estado oficial actual. El frontend pasa a layout flotante sobre mapa, con badges `Impacto`, modo claro/oscuro y paneles menos cuadriculados.
- **R-19:** claridad de mapa y contenidos: nav de secciones incrustada sin cajas, zonas de impacto limitadas a eventos visibles, trÃ¡fico normal no se pinta, leyenda mÃ¡s legible y Fuentes/MetodologÃ­a/Info pasan a bloques escaneables con separadores/acordeones. Ajuste posterior: pins propios `E`/`A`, filtros de alternativas sin siglas opacas, `Fuentes` sin contador en nav, `Vista resumida` recarga datos, mapa expandido con bandeja compacta de eventos y pestaÃ±as informativas centrales.
- **R-20:** pulso urbano y auditoria civica: `Info` muestra salud operativa agregada, `Fuentes` incorpora semaforo de calidad del portal, accion administrativa explica deep-link once-only futuro y el mapa desktop pasa a tratamiento full-bleed con offset de seleccion para no ocultar el pin bajo la ficha inferior.


