"""Verify configured Valencia open-data datasets.

Run:
    python -m src.scripts.verify_datasets

The script checks that each dataset configured in the ArcGIS scraper has a
matching CKAN package and a GeoJSON layer with at least one feature.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from ingestion.scraper_opendata import DATASETS  # noqa: E402


CKAN_BASE = "https://opendata.vlci.valencia.es/api/3/action"
ARCGIS = "https://geoportal.valencia.es/server/rest/services"

CKAN_IDS = {
    "occupacio_via_publica": "ocupacio-via-publica-ocupacion-via-publica",
    "trafico_tiempo_real": "estat-transit-temps-real-estado-trafico-tiempo-real",
    "aparcaments_pmr": "aparcaments-persones-mobilitat-reduida-aparcamientos-personas-movilidad-reducida",
    "parkings": "parkings",
    "aparcaments_ora": "aparcaments-ora-aparcamientos-ora",
    "aparcaments_no_regulats": "aparcaments-no-regulats-aparcamientos-no-regulados",
    "aparcaments_motos": "aparcament-per-a-motos-aparcamiento-para-motos",
    "aparcaments_bicicletes": "aparcaments-bicicletes-aparcamientos-bicicletas",
    "recarrega_vehicles_electrics": "recarrega-vehicles-electrics-recarga-vehiculos-electricos",
    "emt_paradas": "emt",
    "fgv_estaciones": "fgv-estacions-estaciones",
    "fgv_bocas": "fgv-bocas",
    "valenbisi_disponibilidad": "valenbisi-disponibilitat-valenbisi-dsiponibilidad",
    "itinerarios_ciclistas": "itinerarios-ciclistas-itineraris-ciclistes",
}


async def verify_ckan_slug(client: httpx.AsyncClient, ckan_id: str) -> bool:
    try:
        response = await client.get(f"{CKAN_BASE}/package_show", params={"id": ckan_id})
        return response.status_code == 200 and response.json().get("success") is True
    except Exception:
        return False


async def verify_arcgis_layer(
    client: httpx.AsyncClient,
    service: str,
    layer: int,
) -> tuple[bool, int]:
    try:
        url = f"{ARCGIS}/{service}/MapServer/{layer}/query"
        response = await client.get(
            url,
            params={"where": "1=1", "outFields": "*", "f": "geojson", "resultRecordCount": 1},
        )
        if response.status_code != 200:
            return False, 0
        features = response.json().get("features", [])
        return True, len(features)
    except Exception:
        return False, 0


async def main() -> int:
    all_ok = True
    results = []

    async with httpx.AsyncClient(timeout=30) as client:
        for dataset_key, config in DATASETS.items():
            ckan_id = CKAN_IDS[dataset_key]
            ok_ckan = await verify_ckan_slug(client, ckan_id)
            ok_geo, n_features = await verify_arcgis_layer(
                client,
                config["service"],
                config["layer"],
            )

            flag = "[OK]" if ok_ckan and ok_geo and n_features > 0 else "[FAIL]"
            if flag == "[FAIL]":
                all_ok = False

            result = {
                "flag": flag,
                "dataset_key": dataset_key,
                "ckan_id": ckan_id,
                "role": config["record_kind"],
                "service": config["service"],
                "layer": config["layer"],
                "ckan_ok": ok_ckan,
                "geo_ok": ok_geo,
                "features": n_features,
            }
            results.append(result)
            print(
                f"{flag} {dataset_key} role={config['record_kind']} "
                f"ckan={ok_ckan} geo={ok_geo} features={n_features}"
            )

    print()
    ok_count = sum(1 for result in results if result["flag"] == "[OK]")
    print(f"Resumen: {ok_count}/{len(results)} datasets verificados correctamente")

    if not all_ok:
        print("FALLO: Algunos datasets no verifican. Revisar DATA_SOURCES.md.")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
