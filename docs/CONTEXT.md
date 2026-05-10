# CONTEXT: Valencia Proactiva (Project "V-PRO")

## 🎯 Visión del Proyecto
Transformar el modelo de interacción ciudadano-gobierno en Valencia, pasando de un modelo de **"Consulta de Datos Pasiva"** (Portal de Datos Abiertos tradicional) a un modelo de **"Movilidad Proactiva basada en Datos Abiertos"**: la ciudad avisa a la ciudadanía antes de que sufra una interrupción (obra, festejo, corte de tráfico, restricción de ZBE) y le ofrece una alternativa adaptada a su perfil.

El objetivo es cerrar el "último metro" entre el dato público y la decisión cotidiana.

## 💡 Concepto Central: "El Cierre del Bucle de Acción"
Un dato sin acción es solo ruido. **V-PRO** no solo informa sobre una interrupción (ej. una ocupación de vía pública en la calle X), sino que dispara un flujo de mitigación:
1. **Aviso:** notificación de la interrupción.
2. **Alternativa:** sugerencia geolocalizada adaptada al perfil de la persona usuaria.
3. **Acción:** acceso directo a trámites administrativos relacionados (ej. ayudas a comercios afectados, exenciones).

## 👥 Perfiles de persona usuaria soportados (MVP)
| Perfil | Prioriza | Data sets implicados |
|---|---|---|
| **Genérico** | Rapidez y simplicidad | Parkings, bus, Valenbisi |
| **Comercial** | Ayudas municipales y duración de la obra | Trámites en `sede.valencia.es` |
| **Movilidad reducida (PMR)** | Aparcamientos y rutas accesibles | Dataset `aparcaments-persones-mobilitat-reduida` (HVD europeo) + `rutas-accesibles-jardin-turia` |
| **Ciclista** | Bici pública y carriles | `valenbisi-disponibilitat` + `itinerarios-ciclistas` |
| **Transporte público** | Paradas y estaciones cercanas | `emt` + `fgv-estacions-estaciones` |

## 🏛️ Stakeholders
- **Ciudadanía** (incluyendo personas con movilidad reducida como colectivo de primera clase, no accesorio).
- **Comercios** que necesitan mitigar el impacto de obras y festejos en su logística y acceso de clientela.
- **Instituciones** (Ayuntamiento de València): proveedor de los datos abiertos y ejecutor de las soluciones administrativas que V-PRO enlaza.
- **Periodistas, investigadores y personas desarrolladoras** que reutilizan los datos derivados bajo CC-BY 4.0.

## 🛠️ Fuentes de Datos (verificadas empíricamente 2026-05-09)
El motor se alimenta de:
- **Portal de Datos Abiertos de València** (`opendata.vlci.valencia.es`), plataforma CKAN, ~250 datasets disponibles.
- **Geoportal municipal** (`geoportal.valencia.es/server/rest/services/OPENDATA/...`), ArcGIS REST Services donde se sirven los recursos GeoJSON de los datasets geoespaciales.

Datasets nucleares (catálogo completo en `DATA_SOURCES.md`):
- `ocupacio-via-publica` — obras, festejos e incidencias en un único dataset.
- `estat-transit-temps-real` — tráfico cada 3 minutos, clasificado Alto Valor europeo.
- `zona-de-bajas-emisiones` — restricciones de acceso.
- Familia de datasets de aparcamientos, Valenbisi, EMT, FGV, rutas accesibles.

## 🚫 Reglas de Oro para el Desarrollo
1. **Action-Oriented:** Cada dato mostrado debe venir acompañado de una acción o alternativa sugerida.
2. **Minimalismo UX:** No saturar con mapas complejos. Priorizar tarjetas de acción claras ("¿Qué debo hacer ahora?").
3. **Geospatial-First:** Todo el sistema debe estar basado en coordenadas y áreas de influencia (buffers).
4. **Zero-Fluff:** La información debe ser concisa y útil para la toma de decisiones inmediata.
5. **Escalabilidad de Datos:** El sistema debe ser capaz de añadir nuevos tipos de "eventos" (ej. inundaciones, festivos) sin cambiar la arquitectura core.
6. **Lenguaje inclusivo y no sexista** en toda la documentación pública, UI y memoria del proyecto (requisito de las bases AD.TR.15).
7. **Idioma de los materiales públicos:** castellano o valenciano. El código puede estar en inglés.
8. **Apertura por defecto:** todo código bajo licencia MIT; todos los datos derivados bajo CC-BY 4.0 con atribución al Ayuntamiento de València.

## 🏆 Alineación con los criterios de valoración del jurado (AD.TR.15)
Cada decisión de producto y técnica debe poder justificarse contra alguno de estos cuatro criterios. Ver detalle en `MEMORIA.md §6`.

| Criterio (25 pts c/u) | Cómo lo cubre V-PRO |
|---|---|
| **1. Originalidad e innovación** | Paso de "consulta pasiva" a "acción proactiva"; motor de plantillas en YAML; cálculo geoespacial dinámico con PostGIS. |
| **2. Valor público e impacto** | Beneficio directo a comercios, personas con movilidad reducida y residencia; transparencia de decisiones municipales. |
| **3. Viabilidad y calidad del dato** | Trazabilidad en `DATA_SOURCES.md`, metodología en `METHODOLOGY.md`, reproducibilidad con Docker, stack open-source sostenible. |
| **4. Colaboración y apertura** | Código MIT, datos derivados CC-BY 4.0, API pública documentada, reglas de negocio auditables. |

---

## 🧭 Estado actual del proyecto (snapshot — 2026-05-10)

- **Arquitectura definitiva:** Python 3.11 + FastAPI + SQLAlchemy 2 + PostgreSQL/PostGIS + Cron + Frontend vanilla + MapLibre GL JS. La infraestructura de producción queda diferida hasta estabilizar demo, memoria y release local.
- **Fase A (Estabilización de repo):** ✅ cerrada. Layout canónico en `src/`, `config/`, `infra/`, `docs/` y `tests/`.
- **Fase B (Fase 1 producto completa):** ✅ cerrada. API, modelo PostGIS, ingesta real y exports derivados operativos.
- **Fase C (Proactive Engine):** ✅ cerrada en MVP. Plantillas YAML, alternativas multimodales, feedback y capa de validación diferida de avisos oficiales funcionan en local.
- **Fase D (Frontend vanilla):** 🟡 operativa local. Interfaz Civic Utility con mapa MapLibre central, perfiles, idiomas, panel de detalle, feedback y pestañas de fuentes/metodología/info verificadas con Playwright.
- **Fase E (Despliegue producción):** ⏸️ diferida. No tocar VPS hasta que el proyecto esté más estable.
- **Fase F (Entregables concurso):** 🟡 en progreso. Docs, licencia, memoria con cifras reales y exports derivados están avanzados; faltan Anexo II oficial, vídeo/demo final y solicitud.

**Para continuar el trabajo (orden estricto):**
1. `docs/STATUS.md` — salud actual.
2. `ARCHITECTURE.md` — decisiones arquitectónicas vigentes.
3. `docs/DECISIONS.md` — ADRs firmados (stack, Celery, frontend) que ya no se discuten.
4. `docs/TODO.md` — backlog con IDs y dependencias.
5. `NEXT_STEPS.md` — plan operativo fase a fase con código pegable y DoD.

**Decisiones fijas que NO se reabren sin ADR nuevo:**
- Se usa Python + PostGIS (excepción documentada al canonical stack) — [ADR-001](./docs/DECISIONS.md#adr-001).
- Sin Celery ni Redis. Scheduler = Cron del sistema — [ADR-002](./docs/DECISIONS.md#adr-002).
- Frontend vanilla HTML + CSS + JS + MapLibre GL JS. Sin Next.js, Tailwind ni Framer Motion — [ADR-003](./docs/DECISIONS.md#adr-003).

## 📂 Archivos de referencia del dominio (no ejecutables, solo contexto)
- `docs/concurso/AD.TR.15_BasesConvdatosabiertosyperiodismodedatos_2026.md`
- `docs/concurso/AcuerdoJGL_convocatoriaPremios.md`
- `docs/concurso/acuerdo_JGL.md`

Estos documentos contienen las bases del premio / convocatoria de datos abiertos y sirven como contexto institucional para justificar casos de uso y alcance del MVP.
