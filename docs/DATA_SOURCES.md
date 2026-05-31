# DATA_SOURCES — Catálogo y trazabilidad de datos

> Documento de transparencia requerido por los criterios 3 y 4 de las bases AD.TR.15.
> **Última verificación empírica contra el portal:** 2026-05-09.
> Todos los datasets listados han sido confirmados mediante `GET /api/3/action/package_list` y `package_show`.

## 1. Fuente principal

- **Portal de Datos Abiertos del Ayuntamiento de València**
- URL: <https://opendata.vlci.valencia.es/>
- **Plataforma:** CKAN (no OpenDataSoft como se asumió inicialmente — ver [ADR-004](./docs/DECISIONS.md#adr-004)).
- **API CKAN:** `https://opendata.vlci.valencia.es/api/3/action/*` — se usa para descubrir y listar datasets.
- **Recursos de datos geoespaciales servidos por:** ArcGIS REST Services del Geoportal Municipal en `https://geoportal.valencia.es/server/rest/services/OPENDATA/<grupo>/MapServer/<layer_id>/query`.
- **Licencia general:** Atribución 4.0 Internacional (**CC BY 4.0**) para prácticamente todos los datasets verificados.
- **Atribución obligatoria:** *"Fuente: Portal de Datos Abiertos del Ayuntamiento de València — opendata.vlci.valencia.es"*.

### 1.1 Politica de fuentes complementarias oficiales

Las bases AD.TR.15 exigen que el proyecto use conjuntos de datos del Portal de Datos Abiertos del Ayuntamiento de Valencia. Por tanto, el **nucleo puntuable** de V-PRO debe seguir siendo el Portal de Datos Abiertos y sus recursos CKAN/ArcGIS.

Se permiten **fuentes complementarias oficiales** cuando reduzcan fragilidad operativa o cubran eventos vivos que el portal no publique con suficiente frescura: RSS, calendarios, paginas oficiales, avisos municipales, agenda cultural, informacion oficial de Fallas, maratones, fiestas populares, conciertos o incidencias especiales.

Reglas obligatorias para incluirlas:
- Deben proceder de dominios oficiales o institucionales: `valencia.es`, `sede.valencia.es`, `geoportal.valencia.es`, `opendata.vlci.valencia.es` o entidades publicas/organizadoras oficiales verificables.
- No sustituyen al Portal de Datos Abiertos: se etiquetan como `official_public_info` o `official_feed`, no como `open_data_core`.
- Deben documentar URL, licencia/terminos de uso si existen, frecuencia de actualizacion, campos extraidos y limitaciones.
- Deben conservar trazabilidad en `source`, `source_id` y `extra_data`.
- Si no tienen licencia abierta clara, solo se usan como senal operativa y no se republica el contenido bruto; V-PRO puede publicar el dato derivado minimo si es legalmente reutilizable y esta documentado.
- Si una fuente complementaria genera eventos, debe incluir test de deduplicacion y prioridad frente a datasets CKAN para evitar duplicados.

Esta politica mantiene la candidatura alineada con Datos Abiertos: el proyecto sigue basandose en datasets abiertos municipales, pero puede reforzar actualidad y cobertura con informacion publica oficial trazable.

### Patrón de URL de los recursos GeoJSON
```
https://geoportal.valencia.es/server/rest/services/OPENDATA/<servicio>/MapServer/<layer>/query?where=1=1&outFields=*&f=geojson
```
Reemplazando `f=geojson` por `json`, `kmz`, `html` o `pbf` se obtienen otros formatos.

---

## 2. Datasets clasificados por rol en V-PRO

### 2.1 · Fuentes de interrupciones (tipo `UrbanEvent`)

Estos datasets alimentan directamente la tabla `urban_events`. Cada uno mapea a un `type` diferente.

#### A. Ocupación de vía pública — **dataset nuclear**
| Campo | Valor |
|---|---|
| CKAN ID | `ocupacio-via-publica-ocupacion-via-publica` |
| Layer ArcGIS | 209 |
| Endpoint GeoJSON | `https://geoportal.valencia.es/server/rest/services/OPENDATA/Trafico/MapServer/209/query?where=1=1&outFields=*&f=geojson` |
| Descripción | *"Información geográfica referente a la ocupación de la vía pública por **festejos, incidencias u obras**"*. |
| Cobertura temporal | desde 2024-07-02 |
| Última actualización | 2026-02-23 |
| Licencia | CC BY 4.0 |
| Tipo V-PRO | `OCUPACION` (nuevo · engloba OBRA / EVENTO / INCIDENCIA) |
| Uso | **Sustituye a los datasets ficticios `obras-en-curso` y `calendario-de-eventos`** que asumimos inicialmente. Cubre el 80% del caso de uso del MVP. |

#### B. Estado del tráfico en tiempo real — **upgrade estratégico**
| Campo | Valor |
|---|---|
| CKAN ID | `estat-transit-temps-real-estado-trafico-tiempo-real` |
| Layer ArcGIS | 192 |
| Endpoint GeoJSON | `https://geoportal.valencia.es/server/rest/services/OPENDATA/Trafico/MapServer/192/query?where=1=1&outFields=*&f=geojson` |
| Frecuencia | **cada 3 minutos** (P0Y0M0DT0H3M0S) |
| Clasificación | **High Value Dataset (HVD) europeo — "Datos de Movilidad"** |
| Campos | `Idtramo` (id único), `Denominacion`, `Estado` (0=Fluido, 1=Denso, 2=Congestionado, 3=Cortado, 4=Sin datos, 5-9 idem paso inferior) |
| Licencia | CC BY 4.0 |
| Tipo V-PRO | `TRAFICO` · severity derivada del `Estado` (0→1, 1→2, 2→3, 3→5) |
| Uso | Generar eventos dinámicos cuando un tramo pasa a `Estado=3` (Cortado) o `Estado=2` (Congestionado). Permite alertas reales, no solo planificadas. |

#### C. Cortes de tráfico por Fallas
| Campo | Valor |
|---|---|
| CKAN ID | `talls-transit-falles` |
| Endpoint GeoJSON | ver página del dataset (recurso GeoJSON disponible) |
| Estado | **Información no actualizada** (según el propio portal). Histórico de ediciones pasadas. |
| Licencia | CC BY 4.0 |
| Tipo V-PRO | `EVENTO_FALLAS` — carga estacional durante marzo, útil para validar eventos masivos en contexto de Fallas. |
| Uso | **Referencia histórica / fallback estacional.** No se usa como Golden Path activo fuera de temporada porque el propio portal puede indicar datos desactualizados. La demo pública usa `ocupacio-via-publica` con eventos actuales. |

#### D. Zona de Bajas Emisiones (ZBE)
| Campo | Valor |
|---|---|
| CKAN ID | `zona-de-bajas-emisiones` |
| Licencia | CC BY 4.0 |
| Tipo V-PRO | `ZBE` — restricción de acceso por tipo de vehículo. |
| Uso | Advertir al usuario si su vehículo no puede entrar en la zona según matrícula/etiqueta ambiental. |

---

### 2.2 · Alternativas (tipo `PointOfInterest`)

Estos datasets alimentan el **Alternative Finder**: qué sugerir cuando un evento impacta la ubicación del usuario.

| Propósito | CKAN ID | Notas |
|---|---|---|
| Aparcamientos públicos | `parkings` | Parkings de gestión pública/privada. Candidato principal para sugerencias de parking. |
| Aparcamientos ORA | `aparcaments-ora-aparcamientos-ora` | Zonas azules/verdes de rotación. |
| Aparcamientos libres (no regulados) | `aparcaments-no-regulats-aparcamientos-no-regulados` | Bolsas de aparcamiento libres. |
| **Aparcamientos PMR (movilidad reducida)** | `aparcaments-persones-mobilitat-reduida-aparcamientos-personas-movilidad-reducida` | **HVD europeo.** Ángulo accesibilidad explícito. Layer 207. |
| Aparcamientos motos | `aparcament-per-a-motos-aparcamiento-para-motos` | |
| Aparcamientos bicis | `aparcaments-bicicletes-aparcamientos-bicicletas` | |
| Cargadores vehículos eléctricos | `recarrega-vehicles-electrics-recarga-vehiculos-electricos` | Layer 183, `poi_type=CARGADOR_VE`. |
| Paradas EMT (autobús) | `emt` | Layer 226, `poi_type=PARADA_EMT`, conserva líneas y próximas llegadas en `extra_data`. |
| Estaciones FGV (metro) | `fgv-estacions-estaciones` + `fgv-bocas` | Layers 221/220, `poi_type=ESTACION_FGV` y `BOCA_FGV`. |
| Valenbisi — disponibilidad | `valenbisi-disponibilitat-valenbisi-dsiponibilidad` | Layer 228, `poi_type=VALENBISI`, conserva `available/free/total` en `extra_data`. |
| Itinerarios ciclistas | `itinerarios-ciclistas-itineraris-ciclistes` | Layer 189, `poi_type=ITINERARIO_CICLISTA`; se almacena como POI centroidal para Alternative Finder. |
| Rutas accesibles Jardín del Turia | `rutas-accesibles-jardin-turia` | Específico pero de fuerte carga social. |
| Zonas movilidad reducida | `zones-mobilitat-reduida-zonas-mobilidad-reducida` | Para filtrar sugerencias accesibles. |

---

### 2.3 · Datasets de contexto (post-MVP)

No se ingestan en el MVP pero son candidatos para ampliaciones:

- **Contaminación atmosférica** (6 estaciones + red): `dades-de-l-estacio-de-contaminacio-atmosferica-*`, `xarxa-de-vigilancia-de-la-contaminacio-atmosferica`.
- **Ruido:** `mapa-soroll-24h-mapa-ruido-24h`, `estacions-de-soroll-estaciones-de-ruido`.
- **Cámaras de tráfico:** `cameres-trafic-camaras-trafico`.
- **Carriles por sentido y velocidad máxima:** `sentits-circulacio-sentidos-circulacion`, `velocitat-carrers-velocidad-calles`.
- **Demografía y vulnerabilidad por barrio:** `vulnerabilidad-por-barrios`, `barris-barrios`. Útiles para ponderar el impacto de cada evento en criterios de equidad.

---

### 2.4 · Fuentes oficiales complementarias candidatas (T-37)

Estas fuentes no sustituyen a `open_data_core`. Sirven para reducir fragilidad y cubrir eventos vivos que el portal puede publicar tarde, de forma incompleta o como páginas/RSS.

| Prioridad | Fuente | URL / patrón | Clasificación | Uso V-PRO | Estado verificación 2026-05-10 | Riesgo |
|---|---|---|---|---|---|---|
| Alta | Servicios RSS del Ayuntamiento | `https://www.valencia.es/cas/atencion-ciudadana/servicios-rss` | `official_feed_catalog` | Catálogo oficial de feeds: noticias, agenda ciudad, tablón. | Página oficial verificada; lista RSS de Noticias y Agenda de la Ciudad. Las URLs antiguas redirigen a HTML actual, por lo que la ingesta debe aceptar fallback HTML. | Medio |
| Alta | Agenda de la Ciudad | `https://www.valencia.es/cas/agenda-de-la-ciudad` / `https://www.valencia.es/val/agenda-de-la-ciutat` | `official_public_info` | Eventos culturales, fiestas, talleres, campañas y actividades municipales. | Accesible como HTML tras redirección desde RSS histórico. Candidato a parser HTML si no hay XML estable. | Medio |
| Alta | Noticias / Actualidad Ayuntamiento | `https://www.valencia.es/cas/actualidad` y RSS histórico `http://www.valencia.es/valencia/noticias/rss/index.htm?lang=1` | `official_public_info` | Avisos puntuales de movilidad, Fallas, maratón, dispositivos especiales. | RSS histórico redirige a HTML de actualidad; útil como fuente de detección por palabras clave y enlaces oficiales. | Medio |
| Alta | Fallas 2026 Ayuntamiento | Página de agenda municipal `programa-pirotecnico-de-las-fallas-de-valencia-2026`; noticias de tráfico Fallas en `valencia.es/cas/actualidad` | `official_public_info` | Mascletaes, castillos, cortes de tráfico, PMR, eventos pirotécnicos. | Localizada página oficial con programa pirotécnico y noticia de tráfico Fallas 2026. Parser debe extraer fechas y enlaces PDF. | Medio |
| Alta | Junta Central Fallera | `https://www.fallas.com/` y PDFs oficiales de programa | `official_public_info` | Programa oficial de festejos, actos falleros, accesibilidad. | Dominio institucional de JCF; útil como fuente complementaria de calendario. No asumir licencia abierta para republicar contenido bruto. | Medio |
| Alta | EMT València Última Hora | `https://www.emtvalencia.es/wp/wp-json/wp/v2/estado-servicio` | `official_public_info` | Desvíos, líneas alteradas por Fallas, maratones, manifestaciones, obras. | **T-38 implementado como capa de validación diferida**: parser JSON a `OfficialNotice`, extracción de fechas y líneas afectadas, deduplicación por `(source, source_id)`. No promociona a `UrbanEvent` sin geometría. | Medio |
| Media | Cultural València agenda | `https://cultural.valencia.es/agenda/`, `https://cultural.valencia.es/activitats/` | `official_public_info` | Conciertos, exposiciones, talleres y actividades culturales con potencial impacto de movilidad. | HTML accesible; REST API WordPress restringida 401 para tipos. Parser HTML o feed alternativo pendiente. | Medio |
| Media | Maratón / carreras populares | `valencia.es` actualidad + organizadores oficiales + EMT Última Hora | `official_public_info` | Cortes, recorridos, alteraciones EMT por maratón, medio maratón, 10K. | Existen noticias históricas municipales y avisos EMT con alteraciones; para cada edición se debe verificar URL vigente. | Medio |

Verificación automatizada: `python -m scripts.verify_official_sources` desde `src/` genera el estado actual de las fuentes. Último reporte guardado en `docs/reports/official-sources-check.json`.

Resultado de la última verificación:
- `emt_estado_servicio` y `emt_posts`: JSON público, `200 OK`, 5 registros de muestra.
- `valencia_agenda_city` y `valencia_news`: accesibles pero redirigen a HTML, no XML/RSS consumible directamente.
- `cultural_valencia_agenda`: HTML accesible.
- `cultural_valencia_rest_types`: REST presente pero restringido (`401`), no usable como API abierta sin otra vía.

Regla de activación: antes de implementar cualquier fuente de esta tabla, crear fixture de ejemplo, test de normalización y test de deduplicación. Si la fuente no aporta geometría directa, el destino inicial debe ser `OfficialNotice`; la promoción a `UrbanEvent` requiere reglas explícitas de geocodificación o cruce con datasets CKAN/ArcGIS.

Regla T-39 aplicada: EMT `estado-servicio` solo promociona a `UrbanEvent` cuando hay `extra_data.geometry` oficial o coincidencia con un gazetteer interno testeado. Cualquier aviso genérico queda en proceso de geolocalización, y un evento open data existente a menos de 120 m bloquea la promoción.

### 2.5 · Gazetteer de promoción conservadora (T-46)

V-PRO mantiene un gazetteer pequeño y versionado en `src/backend/ingestion/data/valencia_gazetteer.json` para promocionar avisos oficiales a eventos solo cuando el texto menciona una ubicación concreta.

Fuente municipal de nombres:
- Dataset: `Listado de las calles`.
- Página: `https://opendata.vlci.valencia.es/dataset/61776145-c8fb-4613-9798-63ce5a30d116`.
- API CKAN: `https://opendata.vlci.valencia.es/api/3/action/package_show?id=61776145-c8fb-4613-9798-63ce5a30d116`.
- Licencia: CC BY 4.0.

Política de coordenadas:
- La versión inicial contiene 20 ubicaciones de alta señal urbana con coordenadas centroidales curadas y `confidence >= 0.85`.
- Cada entrada incluye `id`, `label`, `aliases`, `geometry` y `confidence`.
- No se deben añadir ubicaciones sin fuente municipal/open geodata documentada y test.
- `src/scripts/generate_gazetteer_coordinates.py` valida el gazetteer contra `Ejes lineales de las calles` (`https://geoportal.valencia.es/apps/OpenData/UrbanismoEInfraestructuras/EJES_CALLE.json`) y genera `docs/reports/gazetteer-coordinate-report.json`.
- Resultado T-49: 12.982 tramos municipales procesados; 9 ubicaciones dentro de 250 m, 11 justificadas y 0 en revisión. `Av. Aragón` queda documentada como `long_axis_curated_point`: el eje municipal completo coincide, pero se conserva el punto operativo curado porque el centroide del eje largo no representa bien el área de aviso.

---

## 3. Datos derivados por V-PRO (publicación abierta)

Estos datos los genera V-PRO a partir de los anteriores y se publicarán bajo **CC-BY 4.0** en una release pública:

1. **`exports/impact_zones.geojson`** — polígonos de zona de impacto calculados por buffer PostGIS.
2. **`exports/mitigation_actions.csv`** — acciones generadas por el motor de plantillas con enlaces a trámites reales municipales (ver `docs/concurso/tramites-referenciados.md`).
3. **`src/backend/engine/templates/*.yaml`** — catálogo de reglas declarativas versionado en git; las acciones exportadas incorporan `payload.url` cuando existe trámite oficial aplicable.
4. **`exports/feedback_aggregated.csv`** — agregación anónima (sin PII) de los votos 👍/👎 sobre la utilidad de las sugerencias. *Meta-nivel: V-PRO no solo consume datos abiertos — produce nuevos datos abiertos.*
5. **`exports/latest_events.json`** — feed plano de últimos eventos visibles, con centroide, geometría, fuente, acción disponible y permalink.
6. **`exports/events/<event_id>.html`** — ficha estática por evento, inspirada en el patrón de publicación de Avisos Madrid, para prensa, jurado y reutilizadores.
7. **`exports/data_health.json`** — conteos y frescura por tabla (`urban_events`, `points_of_interest`, `impact_zones`, `mitigation_actions`, `official_notices`, `feedback`).

---

## 4. Trazabilidad técnica

- Cada `UrbanEvent` almacena `source` (p. ej. `opendata_valencia:ocupacio-via-publica`) y `source_id` (ID original del feature).
- Cada `PointOfInterest` multimodal almacena `poi_type`, `dataset_key`, `source_id` estable y propiedades originales relevantes en `extra_data`.
- Deduplicación por `(source, source_id)` al ingestar.
- Timestamps `created_at` y `updated_at` en todos los registros.
- Las peticiones ArcGIS REST se hacen con `resultRecordCount` paginado y `returnExceededLimitFeatures=true` para evitar cortes silenciosos.
- Verificación T-21: `python -m src.scripts.verify_datasets` devuelve 14/14 capas CKAN/ArcGIS correctas.

## 5. Limitaciones y supuestos conocidos

| Limitación | Mitigación |
|---|---|
| Algunos datasets dicen "información no actualizada" (`talls-transit-falles`) | No usar como Golden Path activo fuera de temporada; mantener solo como histórico/fallback documentado. |
| Frecuencia de actualización no siempre documentada | Scheduler V-PRO mantiene política conservadora de 30 min; sobrepasar solo si el dataset lo declara. |
| `Estado` del tráfico en tiempo real puede llegar "4 Sin datos" en tramos puntuales | Omitir o marcar visualmente con color neutro; nunca inferir. |
| Duplicidad sospechosa entre `carregadors-vehicles-electrics` y `recarrega-vehicles-electrics` | Verificar campos y mergear si aplica (tarea `T-34b`). |
| Los campos de cada feature no están documentados uniformemente | El scraper preserva todas las propiedades originales en `extra_data` JSONB para que una futura iteración pueda consultarlas sin re-ingestar. |
| Portal publica también vía WFS/WMS/SHP/KML | No se usan en el MVP; se priorizan GeoJSON (para la ingesta) y JSON (para inspección manual). |

## 6. Cómo verificar las fuentes manualmente

```bash
# Listar los ~250 datasets disponibles
curl "https://opendata.vlci.valencia.es/api/3/action/package_list"

# Ver metadatos de un dataset concreto
curl "https://opendata.vlci.valencia.es/api/3/action/package_show?id=ocupacio-via-publica-ocupacion-via-publica"

# Descargar el GeoJSON crudo
curl "https://geoportal.valencia.es/server/rest/services/OPENDATA/Trafico/MapServer/209/query?where=1=1&outFields=*&f=geojson" -o ocupacion.geojson

# Contar features ingeribles
python -c "import json; d=json.load(open('ocupacion.geojson')); print(len(d['features']))"
```

El script `src/scripts/verify_datasets.py` automatiza este proceso contra todos los datasets registrados en `DATASETS` del scraper (tarea `T-34`).
