-- V-PRO memoria figures, calculated on 2026-05-10 against local PostGIS.
-- Database after `python -m scripts.run_ingest` with 14 configured datasets.

-- 1. Active public-space occupation records.
SELECT COUNT(*) AS ocupaciones_activas
FROM urban_events
WHERE type = 'OCUPACION';

-- 2. Real-time traffic segments stored as urban events.
SELECT COUNT(*) AS tramos_trafico_monitorizados
FROM urban_events
WHERE type = 'TRAFICO';

-- 3. PMR parking places.
-- Most PMR rows represent individual places; if `numplazas` is present, use it.
SELECT COALESCE(SUM((extra_data->>'numplazas')::integer), COUNT(*)) AS plazas_pmr_catalogadas
FROM points_of_interest
WHERE poi_type = 'APARCAMIENTO_PMR';

-- 4. Multimodal POI families reused by the Alternative Finder.
SELECT COUNT(*) AS tipos_poi_multimodales
FROM (
  SELECT DISTINCT poi_type
  FROM points_of_interest
) s;

-- 5. ZBE coverage.
-- The ZBE layer is not ingested in the MVP database. It was calculated from:
-- https://geoportal.valencia.es/server/rest/services/OPENDATA/Trafico/MapServer/240/query?where=1%3D1&outFields=%2A&f=geojson
-- Formula:
--   area_zbe_m2 = area of the GeoJSON polygon transformed EPSG:4326 -> EPSG:32630
--   city_area_m2 = 13,465 hectares from Ayuntamiento de Valencia, "Situacion geografica"
--   coverage_pct = area_zbe_m2 / city_area_m2 * 100
