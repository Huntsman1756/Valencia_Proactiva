"""ArcGIS REST client for Valencia Geoportal.

Replaces the old OpenDataScraper that pointed to fake ODS endpoints.
This module queries ArcGIS REST MapServer services directly.
"""

import httpx
import logging
import re
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

BASE_GEOPORTAL = "https://geoportal.valencia.es/server/rest/services"

DATASETS: Dict[str, Dict[str, Any]] = {
    "occupacio_via_publica": {
        "service": "OPENDATA/Trafico",
        "layer": 209,
        "record_kind": "event",
        "event_type": "OCUPACION",
        "event_type_detail": "OBRA",
    },
    "trafico_tiempo_real": {
        "service": "OPENDATA/Trafico",
        "layer": 192,
        "record_kind": "event",
        "event_type": "TRAFICO",
        "event_type_detail": "TRAFICO",
    },
    "aparcaments_pmr": {
        "service": "OPENDATA/Trafico",
        "layer": 207,
        "record_kind": "poi",
        "event_type": "APARCAMIENTO",
        "event_type_detail": "PMR",
        "poi_type": "APARCAMIENTO_PMR",
        "accessible": True,
        "default_title": "Aparcamiento PMR",
    },
    "parkings": {
        "service": "OPENDATA/Trafico",
        "layer": 194,
        "record_kind": "poi",
        "event_type": "APARCAMIENTO",
        "event_type_detail": "PARKING",
        "poi_type": "PARKING",
        "default_title": "Parking",
        "title_fields": ["nombre", "direccion"],
    },
    "aparcaments_ora": {
        "service": "OPENDATA/Trafico",
        "layer": 205,
        "record_kind": "poi",
        "event_type": "APARCAMIENTO",
        "event_type_detail": "ORA",
        "poi_type": "APARCAMIENTO_ORA",
        "default_title": "Aparcamiento ORA",
        "title_fields": ["color"],
    },
    "aparcaments_no_regulats": {
        "service": "OPENDATA/Trafico",
        "layer": 197,
        "record_kind": "poi",
        "event_type": "APARCAMIENTO",
        "event_type_detail": "NO_REGULADO",
        "poi_type": "APARCAMIENTO_NO_REGULADO",
        "default_title": "Aparcamiento no regulado",
        "title_fields": ["calle"],
    },
    "aparcaments_motos": {
        "service": "OPENDATA/Trafico",
        "layer": 195,
        "record_kind": "poi",
        "event_type": "APARCAMIENTO",
        "event_type_detail": "MOTO",
        "poi_type": "APARCAMIENTO_MOTO",
        "default_title": "Aparcamiento motos",
        "title_fields": ["calle"],
    },
    "aparcaments_bicicletes": {
        "service": "OPENDATA/Trafico",
        "layer": 206,
        "record_kind": "poi",
        "event_type": "OTRO",
        "event_type_detail": "BICI",
        "poi_type": "APARCAMIENTO_BICI",
        "default_title": "Aparcamiento bicicletas",
        "title_fields": ["tipo"],
    },
    "recarrega_vehicles_electrics": {
        "service": "OPENDATA/Trafico",
        "layer": 183,
        "record_kind": "poi",
        "event_type": "OTRO",
        "event_type_detail": "EV_CHARGER",
        "poi_type": "CARGADOR_VE",
        "default_title": "Cargador vehiculo electrico",
        "title_fields": ["localización", "localizacion", "proyecto"],
    },
    "emt_paradas": {
        "service": "OPENDATA/Trafico",
        "layer": 226,
        "record_kind": "poi",
        "event_type": "OTRO",
        "event_type_detail": "EMT",
        "poi_type": "PARADA_EMT",
        "default_title": "Parada EMT",
        "title_fields": ["denominacion", "id_parada"],
    },
    "fgv_estaciones": {
        "service": "OPENDATA/Trafico",
        "layer": 221,
        "record_kind": "poi",
        "event_type": "OTRO",
        "event_type_detail": "FGV",
        "poi_type": "ESTACION_FGV",
        "default_title": "Estacion FGV",
        "title_fields": ["nombre", "codigo"],
    },
    "fgv_bocas": {
        "service": "OPENDATA/Trafico",
        "layer": 220,
        "record_kind": "poi",
        "event_type": "OTRO",
        "event_type_detail": "FGV_BOCA",
        "poi_type": "BOCA_FGV",
        "default_title": "Boca FGV",
        "title_fields": ["denominacion", "idboca"],
    },
    "valenbisi_disponibilidad": {
        "service": "OPENDATA/Trafico",
        "layer": 228,
        "record_kind": "poi",
        "event_type": "OTRO",
        "event_type_detail": "VALENBISI",
        "poi_type": "VALENBISI",
        "default_title": "Valenbisi",
        "title_fields": ["name", "address", "number"],
    },
    "itinerarios_ciclistas": {
        "service": "OPENDATA/Trafico",
        "layer": 189,
        "record_kind": "poi",
        "event_type": "OTRO",
        "event_type_detail": "CARRIL_BICI",
        "poi_type": "ITINERARIO_CICLISTA",
        "default_title": "Itinerario ciclista",
        "title_fields": ["estado"],
    },
}

TRAFFIC_STATE_TO_SEVERITY = {
    0: 1,
    1: 2,
    2: 3,
    3: 5,
    5: 1,
    6: 2,
    7: 3,
    8: 5,
}


class ArcGiSCRaper:
    """Client for Valencia Geoportal ArcGIS REST services."""

    def __init__(self, timeout: float = 30.0):
        self.timeout = timeout

    async def fetch_dataset(self, dataset_key: str) -> List[Dict[str, Any]]:
        """Fetch features from an ArcGIS MapServer layer as GeoJSON."""
        config = DATASETS.get(dataset_key)
        if not config:
            raise ValueError(f"Unknown dataset: {dataset_key}")

        url = (
            f"{BASE_GEOPORTAL}/{config['service']}"
            f"/MapServer/{config['layer']}/query"
        )
        params = {
            "where": "1=1",
            "outFields": "*",
            "f": "geojson",
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()

                features = data.get("features", [])
                logger.info(
                    f"Fetched {len(features)} features from {dataset_key}"
                )

                return self._normalize_raw_data(
                    features,
                    {**config, "dataset_key": dataset_key},
                )

        except httpx.HTTPError as e:
            logger.error(f"Error fetching {dataset_key}: {e}")
            return []

    def _normalize_raw_data(
        self,
        features: List,
        config: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """Normalize raw GeoJSON features to internal format."""
        normalized = []

        for feature in features:
            try:
                props = feature.get("properties", {})
                geometry = feature.get("geometry")

                if not geometry:
                    logger.warning(
                        f"Skipping feature without geometry: {props.get('id', 'unknown')}"
                    )
                    continue

                item = self._build_item(props, geometry, config)
                if item:
                    normalized.append(item)

            except Exception as e:
                logger.error(f"Error normalizing feature: {e}")
                continue

        return normalized

    def _build_item(
        self,
        props: Dict,
        geometry: Dict,
        config: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """Build a normalized item dict from properties and geometry."""
        if "data_hora" in props:
            start_time = self._parse_date(props["data_hora"])
        elif "data_inici" in props:
            start_time = self._parse_date(props["data_inici"])
        elif "fecha_hora" in props:
            start_time = self._parse_date(props["fecha_hora"])
        else:
            start_time = datetime.now()

        if "data_fi" in props or "fecha_fin" in props:
            end_time = self._parse_date(
                props.get("data_fi") or props.get("fecha_fin")
            )
        else:
            end_time = None

        state = props.get("embotellament", props.get("estat"))
        severity = self._estimate_severity(props, state, config)

        return {
            "type": config["event_type"],
            "record_kind": config.get("record_kind", "event"),
            "title": self._extract_title(props, config),
            "description": self._extract_description(props),
            "geometry": geometry,
            "start_time": start_time or datetime.now(),
            "end_time": end_time,
            "severity": severity,
            "source": "geoportal_valencia",
            "source_id": self._extract_source_id(props, config),
            "extra_data": {
                **self._extra_data_from_props(props),
                **self._location_extra_data(props),
                "poi_type": config.get("poi_type"),
                "accessible": config.get("accessible", False),
                "dataset_key": config.get("dataset_key"),
                "event_type_detail": config.get("event_type_detail"),
            },
        }

    def _extract_title(self, props: Dict, config: Dict[str, Any]) -> str:
        for key in config.get("title_fields", []):
            value = props.get(key)
            if value not in (None, ""):
                return str(value)

        for key in (
            "titol",
            "titulo",
            "nom",
            "nombre",
            "name",
            "denominacion",
            "calle",
            "desc_calle",
            "direccion",
            "address",
        ):
            value = props.get(key)
            if value not in (None, ""):
                return str(value)

        return config.get("default_title", "Sin titulo")

    def _location_extra_data(self, props: Dict) -> Dict[str, str]:
        for key in (
            "location_label",
            "direccion",
            "address",
            "calle",
            "desc_calle",
            "localizacion",
            "localización",
        ):
            value = props.get(key)
            if value not in (None, ""):
                label = str(value).strip()
                number = props.get("numero_policia_origen")
                if key == "desc_calle" and number not in (None, ""):
                    label = f"{label} {str(number).strip()}"
                return {"location_label": label}
        return {}

    def _extract_description(self, props: Dict) -> str:
        for key in (
            "descripcion",
            "descripcio",
            "direccion",
            "address",
            "lineas",
            "estado",
        ):
            value = props.get(key)
            if value not in (None, ""):
                return str(value)
        return ""

    def _extra_data_from_props(self, props: Dict) -> Dict[str, Any]:
        ignored_keys = [
            "id",
            "titol",
            "titulo",
            "nom",
            "nombre",
            "name",
            "denominacion",
            "calle",
            "direccion",
            "address",
            "localización",
            "localizacion",
            "descripcion",
            "descripcio",
            "data_hora",
            "fecha_hora",
            "data_inici",
            "data_fi",
            "fecha_fin",
            "embotellament",
            "estat",
        ]
        return {k: v for k, v in props.items() if k not in ignored_keys}

    def _extract_source_id(self, props: Dict, config: Dict[str, Any]) -> str:
        """Return a stable source id using common ArcGIS identifier fields."""
        for key in (
            "id",
            "id_incidencia",
            "idtramo",
            "id_aparcamiento",
            "id_parada",
            "codigo",
            "idparada",
            "idboca",
            "number",
            "fiwareid",
            "objectid",
            "gid",
        ):
            value = props.get(key)
            if value not in (None, ""):
                return f"{config.get('dataset_key', config['event_type'])}:{value}"
        return ""

    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse date string to datetime."""
        if not date_str:
            return None

        try:
            timestamp = float(date_str)
            if timestamp > 10_000_000_000:
                timestamp = timestamp / 1000
            return datetime.fromtimestamp(timestamp, tz=timezone.utc).replace(tzinfo=None)
        except (ValueError, TypeError):
            pass

        formats = [
            "%Y-%m-%d",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%S.%f",
            "%d/%m/%Y",
            "%d/%m/%Y %H:%M:%S",
            "%d/%m/%Y %H:%M",
            "%Y-%m-%dT%H:%M",
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except (ValueError, TypeError):
                continue

        logger.warning(f"Could not parse date: {date_str}")
        return None

    def _estimate_severity(
        self,
        props: Dict,
        state: Any,
        config: Dict[str, Any],
    ) -> int:
        """Estimate severity based on dataset-specific rules."""
        severity = 1

        if config["event_type"] == "TRAFICO":
            state_int = self._safe_int(state, -1)
            if state_int in TRAFFIC_STATE_TO_SEVERITY:
                severity = TRAFFIC_STATE_TO_SEVERITY[state_int]
            else:
                severity = 1
        elif config["event_type"] == "OCUPACION":
            severity = self._estimate_occupation_severity(props)
        elif "gravedad" in props or "severity" in props:
            try:
                severity = int(
                    props.get("gravedad", props.get("severity", 1))
                )
            except (ValueError, TypeError):
                severity = 1
        else:
            desc = (
                props.get("descripcion", "")
                + " "
                + props.get("descripcio", "")
            ).lower()
            impact_keywords = {
                "alta": 4,
                "importante": 4,
                "media": 3,
                "moderada": 3,
                "baixa": 2,
                "baja": 2,
            }
            for keyword, sev in impact_keywords.items():
                if keyword in desc:
                    severity = max(severity, sev)
                    break

        return max(1, min(5, severity))

    def _estimate_occupation_severity(self, props: Dict) -> int:
        """Estimate operational impact for street occupations.

        The municipal layer usually lacks an explicit severity field, so this
        derives a conservative score from published operational fields such as
        affected area and street-space type.
        """
        text = " ".join(
            str(props.get(key, ""))
            for key in (
                "tipo_afectacion",
                "desc_incidencia",
                "descripcion",
                "descripcio",
            )
        ).lower()
        severity = 1

        area_match = re.search(r"(\d+(?:[,.]\d+)?)\s*m2", text)
        if area_match:
            area = float(area_match.group(1).replace(",", "."))
            if area >= 100:
                severity = max(severity, 4)
            elif area >= 40:
                severity = max(severity, 3)
            else:
                severity = max(severity, 2)

        if any(
            term in text
            for term in ("calzada", "carril", "cruce", "xamfra", "chaflan")
        ):
            severity = max(severity, 3)
        if any(
            term in text
            for term in ("zona estacionamiento", "carga", "descarga")
        ):
            severity = max(severity, 3)
        if "acera" in text:
            severity = max(severity, 2)

        return severity

    def _safe_int(self, value: Any, default: int = 0) -> int:
        """Safely convert value to int."""
        if value is None:
            return default
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return default

    async def fetch_all(self) -> List[Dict[str, Any]]:
        """Fetch all configured datasets."""
        all_data = []

        for dataset_key in DATASETS.keys():
            try:
                data = await self.fetch_dataset(dataset_key)
                all_data.extend(data)
            except Exception as e:
                logger.error(f"Failed to fetch {dataset_key}: {e}")

        logger.info(f"Total items fetched: {len(all_data)}")
        return all_data
