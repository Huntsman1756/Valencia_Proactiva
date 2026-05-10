# METHODOLOGY — Metodología de ingesta, tratamiento y análisis de datos

> Documento requerido por el criterio 3 ("Viabilidad, sostenibilidad y calidad del tratamiento de los datos") de las bases del concurso AD.TR.15.
> Describe el pipeline completo de V-PRO: ingesta → normalización → análisis geoespacial → generación de acciones.

## 1. Principios metodológicos
1. **Geospatial-first:** toda la información se modela con coordenadas y áreas de influencia.
2. **Trazabilidad:** cada registro guarda su fuente y el identificador original.
3. **Reproducibilidad:** un único `docker compose up` regenera todo el sistema desde cero.
4. **Auditabilidad:** las reglas de negocio (plantillas de acción) viven en archivos YAML versionados en git.
5. **Publicación abierta:** los datos derivados se exportan como GeoJSON/CSV bajo CC-BY 4.0.

## Fuentes complementarias oficiales

El pipeline admite fuentes oficiales no CKAN (RSS, calendarios, paginas institucionales o avisos) como capa complementaria cuando el Portal de Datos Abiertos no cubra con suficiente actualidad eventos especiales como Fallas, maratones, fiestas populares, conciertos o cortes extraordinarios.

Estas fuentes deben pasar por el mismo ciclo metodologico:
- inventario en `docs/DATA_SOURCES.md`;
- clasificacion de fuente (`open_data_core`, `official_feed`, `official_public_info`);
- normalizacion a `OfficialNotice` staging cuando falte geometria directa, o a `UrbanEvent` / `PointOfInterest` solo si el destino esta justificado;
- trazabilidad en `source`, `source_id` y `extra_data`;
- deduplicacion frente a datasets del Portal de Datos Abiertos;
- test de destino y deduplicacion antes de activar la ingesta.

### Promocion de `OfficialNotice` a `UrbanEvent`

La promocion desde staging es conservadora y manual. Un aviso oficial solo puede convertirse en `UrbanEvent` si cumple una de estas condiciones:

1. La fuente aporta geometria oficial directa en `extra_data.geometry`.
2. El texto coincide con el gazetteer versionado `src/backend/ingestion/data/valencia_gazetteer.json`, pequeno, explicito y testeado.

Reglas de bloqueo:
- Avisos genericos sin calle, plaza o punto concreto permanecen en `official_notices`.
- Si ya existe un evento `open_data_core` a menos de 120 m, se bloquea la promocion para evitar duplicados visuales.
- `source_id` de eventos promovidos usa el prefijo `promoted:` y conserva `official_notice_source_id`, `official_url`, `affected_lines` y `location_confidence` en `extra_data`.
- La ingesta normal no ejecuta la promocion automaticamente; se invoca con un paso separado del ingestor.
- El gazetteer debe conservar metadatos de fuente, licencia y politica de coordenadas. La primera fuente municipal documentada es `Listado de las calles` del Portal de Datos Abiertos del Ayuntamiento.
- La validacion reproducible de coordenadas se ejecuta con `python -m src.scripts.generate_gazetteer_coordinates` y contrasta el gazetteer contra `Ejes lineales de las calles`. El reporte resultante no actualiza coordenadas automaticamente si hay dudas o falta de match.

### CLI operativo de fuentes oficiales

La ingesta de fuentes oficiales complementarias se ejecuta separada de la ingesta open data:

```bash
python -m src.scripts.run_official_sources --fetch
python -m src.scripts.run_official_sources --fetch --promote
python -m src.scripts.run_official_sources --fetch --dry-run
python -m src.scripts.run_official_sources --promote --dry-run
```

Reglas:
- El comando exige al menos `--fetch` o `--promote`.
- `--fetch` almacena avisos en `official_notices`.
- `--promote` aplica las reglas conservadoras staging -> `UrbanEvent`.
- `--dry-run` no escribe: con `--fetch` solo cuenta avisos remotos; con `--promote` usa preview de candidatos.
- La promocion nunca se ejecuta por defecto.

## API interna de avisos oficiales

`GET /api/v1/official-notices` permite auditar el staging de fuentes oficiales desde flujos admin/debug.

Parámetros:
- `source`: filtro opcional por fuente, por ejemplo `emt_valencia:estado-servicio`.
- `notice_type`: filtro opcional por tipo normalizado.
- `limit`: 1-200.
- `offset`: paginación.

Seguridad:
- Requiere `X-Admin-Token`.
- No forma parte de la interfaz ciudadana pública; sirve para verificar trazabilidad antes de promover avisos a eventos.

Si la fuente no declara licencia abierta, no se exporta contenido bruto. Solo se conserva la referencia oficial y el evento derivado minimo necesario para prestar el servicio.

## 2. Pipeline general
```
   [Portal de Datos Abiertos de València]
                   │  GeoJSON / CSV
                   ▼
       [cron */30 * * * *]  (host)
                   │  invoca
                   ▼
         src/scripts/run_ingest.py
                   │
                   ▼
           [1] Scraper (httpx)
                   │  items crudos
                   ▼
           [2] Normalizer
                   │  UrbanEvent-like dicts
                   ▼
           [3] Ingestor
                   │  SQL INSERT
                   ▼
      [PostgreSQL + PostGIS]
                   │
     ┌─────────────┴─────────────┐
     ▼                           ▼
[4] Buffer / ImpactZone   [5] Action Template Engine
     │                           │
     └─────────────┬─────────────┘
                   ▼
      [6] API de sugerencias proactivas (FastAPI)
                   │
                   ▼
     [Frontend vanilla HTML + JS + MapLibre GL JS]
```
> Nota: el pipeline **no usa Celery ni Redis**. La orquestación periódica es una línea de `cron` en el host que invoca el script Python. Justificación en `docs/DECISIONS.md#adr-002`.

## 3. Etapas

### 3.1. Ingesta (scraping del portal)
- Módulo: `backend/app/ingestion/scraper_opendata.py`.
- Tecnología: cliente HTTP asíncrono (`httpx.AsyncClient`, timeout 30 s).
- Formato preferido: GeoJSON (FeatureCollection) para mantener geometría nativa.
- Endpoint preferido: API v2.1 de OpenDataSoft — `/api/explore/v2.1/catalog/datasets/<id>/exports/geojson`.
- Errores HTTP → log estructurado, se continúa con el resto de datasets.

### 3.2. Normalización
- Módulo: `backend/app/ingestion/normalizer.py`.
- Entrada: lista de *features* GeoJSON.
- Salida: diccionarios conformes al esquema `UrbanEvent`.
- Operaciones:
  - Extracción de campos con fallbacks multilingües (`titulo` / `title` / `nom`).
  - Parseo de fechas en múltiples formatos (`%Y-%m-%d`, ISO 8601, `%d/%m/%Y`).
  - Estimación de severidad cuando no está declarada (heurística de palabras clave).
  - Validación geométrica con Shapely (`is_valid`, `not is_empty`).
- Registros sin geometría o con geometría inválida → descartados y registrados en logs.

### 3.3. Persistencia
- Módulo: `backend/app/ingestion/ingestor.py`.
- Base de datos: PostgreSQL 15 + PostGIS.
- Tablas: `urban_events`, `impact_zones`, `mitigation_actions` (ver `ARCHITECTURE.md`).
- **Deduplicación:** se consulta `SELECT source_id FROM urban_events` antes de insertar; los registros con `source_id` ya presente se omiten.
- **Transaccionalidad:** cada item se intenta dentro de su propio bloque `try/except`; los errores puntuales no abortan el lote completo.

### 3.4. Generación de zonas de impacto (buffers PostGIS)
- Lógica: `Ingestor._create_impact_zone`.
- Algoritmo:
  1. Tomar el centroide del `UrbanEvent` en WGS84 (EPSG:4326).
  2. Reproyectar a UTM 30N (EPSG:32630) para operar en metros.
  3. Aplicar `buffer(distancia_metros)` con `distancia = min(severity × 100, 500)`.
  4. Reproyectar el polígono resultante de vuelta a EPSG:4326.
  5. Insertar como `ImpactZone` vinculada al evento.
- **Motivación del CRS:** operar directamente en grados (EPSG:4326) da buffers deformados y de tamaño impredecible. UTM 30N es el huso correcto para Valencia y permite distancias reales en metros.

### 3.5. Motor de plantillas de acción *(Fase 2, pendiente de implementación)*
- Módulo previsto: `backend/app/engine/action_templates.py`.
- Reglas declarativas en YAML (`backend/app/engine/templates/*.yaml`).
- Ejemplo de regla:
  ```yaml
  - when:
      event_type: OBRA
      severity_gte: 3
    actions:
      - type: ROUTE_CHANGE
        title: "Ruta alternativa sugerida"
        priority: 3
      - type: PARKING_SUGGESTION
        title: "Aparcamiento cercano disponible"
        priority: 2
      - type: ADMIN_TASK
        title: "Ayudas municipales para comercios afectados"
        payload:
          url: "https://www.valencia.es/..."
        priority: 1
  ```
- Ventaja metodológica: las reglas son auditables, versionables y editables sin redeploy.

### 3.6. Consulta espacial para sugerencias proactivas
- Endpoint: `POST /api/v1/spatial/suggestions`.
- Algoritmo:
  1. Recibir `(lon, lat, radius_meters)` del cliente.
  2. Reproyectar el punto a EPSG:3857 (unidades en metros).
  3. `ST_DWithin` contra `urban_events.geometry` reproyectada.
  4. Para cada evento dentro del radio, adjuntar su `ImpactZone` y sus `MitigationAction` ordenadas por `priority`.
  5. Devolver la respuesta como JSON con el evento, la zona de impacto y la lista de acciones.

## 4. Calidad del dato

### 4.1. Métricas de calidad tracked
- `scraped` — número de items obtenidos del portal.
- `normalized` — número que pasan la normalización.
- `stored` — número persistidos tras deduplicación.
- `errors` — diferencia scraped − stored.
Estas métricas las imprime `src/scripts/run_ingest.py` en stdout y se capturan en `/var/log/vpro/ingest.log` vía cron.

### 4.2. Validaciones
- Geometrías: `is_valid` y `not is_empty` (Shapely).
- Coordenadas: acotadas a `[-180, 180]` × `[-90, 90]` en los schemas Pydantic.
- Severidad: acotada a `[1, 5]` en modelo y schemas.
- Fechas: múltiples formatos aceptados con fallback a `datetime.now()` si no hay dato.

### 4.3. Limitaciones conocidas
- La estimación heurística de severidad (palabras clave en la descripción) es imprecisa. Propuesta: sustituir por reglas declarativas por tipo de obra cuando se conozcan las categorías oficiales del portal.
- Los eventos puntuales (sin área) reciben un buffer por defecto que puede no reflejar el área real de afectación.
- Algunos datasets del portal pueden cambiar de slug o formato; el sistema loguea el error pero no intenta auto-recuperarse.

## 5. Reproducibilidad
```bash
git clone <repo>
cd valenciav3
cp backend/.env.example backend/.env
docker compose up -d --build
# Esperar a que la DB esté lista
docker compose exec api python -m src.scripts.run_ingest
curl "http://localhost:8000/api/v1/spatial/events/nearby?lon=-0.3763&lat=39.4699&radius_meters=1000"
```

## 6. Publicación de los datos derivados
Los datasets generados (zonas de impacto, acciones, plantillas) se publicarán como:
- `exports/impact_zones.geojson` — todas las zonas activas.
- `exports/mitigation_actions.csv` — acciones por evento con enlaces a trámites.
- `exports/action_templates.yaml` — reglas declarativas.

Comando de exportación previsto (Fase 2): `python -m app.exports.dump_all`.

## 7. Integración futura (post-MVP)
- Datos en tiempo real de tráfico y transporte.
- Datos meteorológicos de AEMET.
- Datos de calidad del aire.
- Integración con expedientes administrativos municipales vía sede electrónica.
