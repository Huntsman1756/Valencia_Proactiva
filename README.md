# Valencia Proactiva

Valencia Proactiva convierte datos abiertos municipales en decisiones ciudadanas verificables:
fuente oficial, evento interpretable, impacto orientativo, alternativa cercana y evidencia reutilizable.

## Entrega publica

- Demo: https://vlcproactiva.es
- Release: https://github.com/Huntsman1756/Valencia_Proactiva/releases/tag/v1.0-adtr15
- Eventos recientes: https://vlcproactiva.es/exports/latest_events.json
- Zonas de impacto: https://vlcproactiva.es/exports/impact_zones.geojson
- Salud del dato: https://vlcproactiva.es/exports/data_health.json
- Esquema de datos: https://vlcproactiva.es/docs/data-schema.md

## Contenido de este repositorio publico

- src/: backend, frontend estatico y scripts de ingesta/export.
- 	ests/: pruebas backend y smoke frontend.
- config/: configuracion reproducible sin secretos.
- db/: inicializacion de base de datos.
- exports/: datos derivados publicos y reutilizables.
- docs/: metodologia, fuentes, memoria tecnica y esquema de datos.

## Privacidad y seguridad

Este paquete publico no incluye documentos administrativos, firmas, identificadores personales,
secretos, historiales internos ni artefactos privados de trabajo. Los datos derivados se publican
sin datos personales y separan fuente oficial de calculo derivado.

## Licencias

Codigo bajo MIT. Datos derivados bajo CC-BY 4.0, atribuyendo el Portal de Datos Abiertos y
Geoportal del Ayuntamiento de Valencia como fuente oficial y Valencia Proactiva como transformacion derivada.
