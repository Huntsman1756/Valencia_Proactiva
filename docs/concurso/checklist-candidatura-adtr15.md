# Checklist candidatura AD.TR.15

Fecha de revisión: 2026-05-24.

Este documento resume el ajuste de VLC PROACTIVA a las bases AD.TR.15 y separa lo que queda dentro del repositorio de lo que debe presentarse por la Sede Electrónica.

## Estado ejecutivo

- **Categoría:** Datos Abiertos.
- **Proyecto único:** VLC PROACTIVA concurre solo a Datos Abiertos; no se presenta una segunda candidatura propia a Periodismo de Datos.
- **Implantación:** demo pública operativa en `https://vlcproactiva.es`.
- **Repositorio público:** `https://github.com/Huntsman1756/Valencia_Proactiva` existe y es público. La rama por defecto `main` sigue por detrás del estado local de producción; existe una rama pública `ralph/ingesta-fuentes-info` más avanzada, pero la candidatura necesita una rama por defecto o release final sincronizada.
- **Privacidad:** el proyecto no necesita registro, no publica datos personales y los exports derivados no incluyen `session_token`.
- **Datos abiertos:** el núcleo reutiliza datasets del Portal de Datos Abiertos y Geoportal del Ayuntamiento de València; los datos derivados se publican bajo CC-BY 4.0.

## Requisitos formales

| Requisito | Estado | Evidencia en el proyecto |
|---|---|---|
| Convocatoria AD.TR.15 | Cumple en documentación | `README.md`, `docs/MEMORIA.md` y docs de concurso identifican la convocatoria. |
| Categoría Datos Abiertos | Cumple | La memoria declara candidatura única a Datos Abiertos. |
| Proyecto actual e implantado en València | Cumple como demo pública | `https://vlcproactiva.es`, `/health`, `/exports/data_health.json` y `/exports/latest_events.json` responden en producción. |
| Uso de datos abiertos municipales | Cumple | `docs/DATA_SOURCES.md`, `docs/METHODOLOGY.md`, exports derivados y pipeline de ingesta. |
| Lenguaje castellano/valenciano e inclusivo | Parcialmente cerrado | UI bilingüe CAS/VAL y memoria en castellano; queda revisión final del Anexo II oficial antes de firmar. |
| Transparencia y apertura | Cumple con pendiente operativo | Código MIT y datos derivados CC-BY 4.0; falta sincronizar el repositorio público con la release local final. |
| No publicar datos personales | Cumple en árbol local auditado | No se han encontrado claves, IP del VPS ni datos personales reales en los ficheros publicables revisados. |
| Solicitud normalizada y anexos administrativos | Fuera del repo | Deben tramitarse en Sede Electrónica; no deben subirse al repositorio. |

## Criterios de valoración

| Criterio | Encaje de VLC PROACTIVA |
|---|---|
| Originalidad e innovación | Cierra el bucle `evento -> impacto -> acción -> feedback`, no se limita a visualizar datasets. |
| Impacto público, social y urbano | Prioriza perfiles reales: comercio, PMR, bici, transporte público y uso general. |
| Viabilidad, sostenibilidad y calidad | Stack abierto, bajo coste, ingesta recurrente, PostGIS, trazabilidad de fuentes y exports públicos. |
| Colaboración, transparencia y apertura | Repo público, metodología abierta, datos derivados reutilizables y snapshot para medios. |

## Evidencia de producción

- Frontend: `https://vlcproactiva.es`.
- Salud API: `https://vlcproactiva.es/health`.
- Salud de datos: `https://vlcproactiva.es/exports/data_health.json`.
- Feed reutilizable: `https://vlcproactiva.es/exports/latest_events.json`.
- Repositorio público: `https://github.com/Huntsman1756/Valencia_Proactiva`.

Última validación operativa documentada: ingesta con `scraped=14240`, `normalized=14240`, `stored_events=669`, `stored_pois=13159`, `errors=0`; export con `impact_zones=672`, `mitigation_actions=950`, `latest_events=100`, `event_pages=100` y `data_health=6`.

## Pendiente antes de presentar

- Sincronizar GitHub público con la release local auditada, preferiblemente dejando `main` o una release/tag final como enlace de candidatura, sin incluir IP, ID de proveedor, claves, `.env`, datos administrativos ni histórico privado innecesario.
- Revisar el Anexo II oficial en el formulario exacto de la Sede Electrónica.
- Preparar vídeo demo de 90 segundos enlazando demo, repo público y datos derivados.
- Ejecutar revisión final de lenguaje inclusivo y no sexista sobre el PDF/Anexo II definitivo.
- Validar cabeceras en securityheaders.com y documentar el resultado si se usa como evidencia.
