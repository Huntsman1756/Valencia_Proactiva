from ingestion.official_sources import (
    EMT_ESTADO_SERVICIO_SOURCE,
    deduplicate_official_notices,
    extract_emt_lines,
    parse_emt_estado_servicio_item,
    strip_html,
)


EMT_SAMPLE = {
    "id": 75477,
    "date": "2026-05-08T13:07:45",
    "modified": "2026-05-09T10:56:03",
    "slug": "recorridos-alternativos-por-actos-en-barrios-de-valencia",
    "status": "publish",
    "type": "estado-servicio",
    "link": "https://www.emtvalencia.es/wp/ultima-hora/recorridos-alternativos-por-actos-en-barrios-de-valencia/",
    "title": {"rendered": "Recorridos alternativos por actos en barrios de Valencia."},
    "content": {
        "rendered": "<p>El sabado 09 y el domingo 10. Consulta aqui toda la informacion.</p>\n"
    },
    "class_list": [
        "estado-servicio",
        "linea-servicio-14-estacio-del-nord-castellar",
        "linea-servicio-19-marina-real-estacio-del-nord",
        "linea-servicio-23-marina-real-forn-dalcedo",
        "linea-servicio-31-poeta-querol-la-patzen",
        "linea-servicio-32-passeig-maritm-marques-de-sotelo",
        "linea-servicio-72-pl-castella-sant-isidre",
        "linea-servicio-73-av-del-cid-tres-creus",
        "linea-servicio-92-av-de-franca-campanar",
        "linea-servicio-99-palau-de-congressos-estacio-cabanyal",
        "linea-servicio-c3-cementeri-general",
    ],
}


def test_strip_html_returns_plain_text():
    assert strip_html("<p>Uno <strong>dos</strong></p>") == "Uno dos"


def test_extract_emt_lines_from_wordpress_classes():
    assert extract_emt_lines(EMT_SAMPLE["class_list"]) == [
        "14",
        "19",
        "23",
        "31",
        "32",
        "72",
        "73",
        "92",
        "99",
        "C3",
    ]


def test_parse_emt_estado_servicio_item_to_official_notice():
    notice = parse_emt_estado_servicio_item(EMT_SAMPLE)

    assert notice["record_kind"] == "official_notice"
    assert notice["source"] == EMT_ESTADO_SERVICIO_SOURCE
    assert notice["source_id"] == "emt_estado_servicio:75477"
    assert notice["notice_type"] == "PUBLIC_ACT"
    assert notice["classification"] == "official_public_info"
    assert notice["title"] == "Recorridos alternativos por actos en barrios de Valencia."
    assert notice["published_at"].year == 2026
    assert notice["source_updated_at"].day == 9
    assert notice["url"].startswith("https://www.emtvalencia.es/wp/ultima-hora/")
    assert notice["extra_data"]["affected_lines"] == [
        "14",
        "19",
        "23",
        "31",
        "32",
        "72",
        "73",
        "92",
        "99",
        "C3",
    ]
    assert "geometry" not in notice


def test_deduplicate_official_notices_by_source_and_source_id():
    first = parse_emt_estado_servicio_item(EMT_SAMPLE)
    second = {**first, "source_id": "emt_estado_servicio:75478"}

    deduped, skipped = deduplicate_official_notices(
        [first, first, second],
        existing_keys={(EMT_ESTADO_SERVICIO_SOURCE, "emt_estado_servicio:75477")},
    )

    assert deduped == [second]
    assert skipped == 2
