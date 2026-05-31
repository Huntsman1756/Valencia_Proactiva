# VLC Proactiva - esquema minimo de datos reutilizables

Actualizado: 2026-05-28.

Este documento describe los artefactos publicos que VLC Proactiva entrega para auditoria y reutilizacion. No sustituye la documentacion oficial del Ayuntamiento de Valencia ni la informacion publicada por sus organismos competentes.

## Origen, licencia y alcance

- Fuente original: Portal de Datos Abiertos del Ayuntamiento de Valencia, Geoportal municipal y fuentes oficiales complementarias declaradas en la memoria del proyecto.
- Licencia de los derivados: CC BY 4.0, manteniendo atribucion a las fuentes municipales y a VLC Proactiva como transformacion derivada.
- Generacion: `src/scripts/export_derived_data.py`, ejecutado por el proceso de exportacion de produccion.
- Frecuencia operativa: los timers de produccion refrescan ingesta y exports periodicamente; comprobar `generated_at` y `data_health.json` antes de reutilizar.

## Artefactos publicados

- `https://vlcproactiva.es/exports/latest_events.json`: feed publico de eventos interpretables recientes.
- `https://vlcproactiva.es/exports/impact_zones.geojson`: zonas orientativas de impacto.
- `https://vlcproactiva.es/exports/mitigation_actions.csv`: acciones o alternativas recomendadas por evento y perfil.
- `https://vlcproactiva.es/exports/feedback_aggregated.csv`: utilidad agregada de feedback ciudadano sin `session_token`.
- `https://vlcproactiva.es/exports/data_health.json`: conteos y frescura de tablas operativas.
- `https://vlcproactiva.es/exports/events/<event_id>.html`: ficha estatica de un evento concreto.

## Entidad `events`

Fuente publica principal: `latest_events.json`.

Campos principales:

- `id`: identificador interno del evento interpretable.
- `type`: categoria normalizada del evento urbano.
- `title`: titulo legible del evento.
- `description`: descripcion publicada o normalizada.
- `location_label`: direccion o etiqueta urbana cuando la fuente la permite.
- `severity`: severidad operativa usada para priorizar visualmente.
- `source`: dataset o fuente de origen.
- `source_id`: referencia del registro original cuando existe.
- `start_time`, `end_time`: ventana temporal si la fuente la proporciona.
- `created_at`, `updated_at`: fechas operativas del registro en VLC Proactiva.
- `center`: coordenadas `[lon, lat]` calculadas desde la geometria.
- `geometry`: geometria GeoJSON original o normalizada.
- `mitigation_action_count`: numero de acciones derivadas asociadas.
- `permalink`: ficha HTML reutilizable del evento.

Uso previsto: inspeccionar que ocurre, donde ocurre, de que fuente sale y que evidencia reutilizable existe para enlazar un caso concreto.

## Entidad `impact_zones`

Fuente publica principal: `impact_zones.geojson`.

Campos principales:

- `id`: identificador de la zona derivada.
- `event_id`: evento asociado.
- `event_type`: categoria del evento original.
- `event_title`: titulo del evento original.
- `severity`: severidad heredada del evento.
- `buffer_distance_meters`: distancia usada para calcular la zona orientativa.
- `source`: fuente original del evento.
- `source_id`: referencia original cuando existe.
- `created_at`: fecha de generacion o persistencia de la zona.
- `geometry`: poligono GeoJSON derivado.

Uso previsto: visualizar o analizar el area aproximada que puede verse afectada. Es una estimacion espacial derivada y no equivale a un corte oficial.

## Entidad `mitigation_actions`

Fuente publica principal: `mitigation_actions.csv`.

Campos principales:

- `action_id`: identificador de la accion derivada.
- `event_id`: evento asociado.
- `event_type`: categoria del evento original.
- `event_title`: titulo del evento original.
- `event_source`: fuente original del evento.
- `event_source_id`: referencia original cuando existe.
- `action_type`: tipo de recomendacion.
- `title`: titulo de la accion.
- `description`: explicacion de la accion.
- `priority`: prioridad operativa.
- `profiles`: perfiles a los que aplica, separados por `|`.
- `template_id`: plantilla de regla que genero la accion cuando aplica.
- `url`: referencia municipal o recurso asociado cuando existe.
- `poi_type`: tipo de punto de apoyo recomendado.
- `created_at`: fecha de creacion de la accion.

Uso previsto: auditar que alternativa propone el sistema para cada perfil y reutilizar la logica en otras visualizaciones o analisis.

## Reutilizacion recomendada

1. Consultar primero `data_health.json` y el campo `generated_at` del artefacto usado.
2. Mantener la atribucion a las fuentes oficiales municipales y a VLC Proactiva como transformacion derivada.
3. Enlazar `source` y `source_id` cuando se cite un evento concreto.
4. Separar siempre dato oficial, calculo derivado y decision del reutilizador.
5. No usar las zonas de impacto como sustituto de senalizacion oficial, emergencias, cortes oficiales ni instrucciones directas del Ayuntamiento u organismos competentes.

## Limites

- La calidad depende de la frescura, geometria y completitud de los datasets municipales.
- Las zonas de impacto son orientativas y pueden no coincidir con la afeccion real en calle.
- Las alternativas cercanas dependen de los puntos de interes disponibles y de su actualizacion.
- Los avisos sin geometria fiable se conservan fuera del mapa hasta poder ubicarse con seguridad.
