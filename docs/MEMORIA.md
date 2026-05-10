# MEMORIA RESUMEN — Valencia Proactiva (V-PRO)

> **Borrador de la Memoria Resumen del proyecto (Anexo II)** para la convocatoria AD.TR.15 — Premios para proyectos de datos abiertos y periodismo de datos del Ayuntamiento de València 2026, categoría **Datos Abiertos**.
> Este documento es un borrador de trabajo. El formato final debe ajustarse al modelo Anexo II oficial publicado en la Sede Electrónica.
> Redactado en castellano. Uso de lenguaje inclusivo y no sexista.
> Última revisión: 2026-05-09 (pivote tras verificación del portal real).

## 1. Identificación del proyecto
- **Título:** Valencia Proactiva (V-PRO): plataforma de movilidad proactiva basada en datos abiertos municipales.
- **Categoría a la que concurre:** Datos Abiertos. *(Opcionalmente se valorará una candidatura paralela en Periodismo de Datos — ver § 12.)*
- **Ámbito territorial:** Municipio de València.
- **Tipo de entregable:** Plataforma web reutilizable (API + frontend) con código abierto (MIT) y datos derivados bajo licencia CC-BY 4.0.

## 2. Resumen ejecutivo
**Cuando el tráfico se corta, un festejo ocupa tu calle o la Zona de Bajas Emisiones restringe tu vehículo, V-PRO te muestra al instante la alternativa viable adaptada a tu perfil: peatonal, comercial, de movilidad reducida, ciclista o en transporte público.**

V-PRO transforma el Portal de Datos Abiertos del Ayuntamiento de València — hoy un archivo pasivo consultable por personas técnicas — en una plataforma proactiva que convierte cada interrupción urbana en una sugerencia accionable. El sistema ingiere en tiempo real datasets reales del portal municipal (ocupación de vía pública, estado del tráfico actualizado cada 3 minutos, ZBE), puede reforzarlos con fuentes oficiales complementarias trazables cuando el portal no publique eventos vivos con suficiente frescura, calcula zonas de impacto geoespaciales con PostGIS y las traduce en acciones concretas: aparcamientos alternativos priorizando los accesibles, rutas alternativas multimodales (bus, metro, bici), y enlaces directos a trámites municipales relevantes (ayudas a comercios afectados, exenciones). Todo el código es MIT y los datos derivados CC-BY 4.0.

## 3. Problema que aborda

El Portal de Datos Abiertos del Ayuntamiento publica actualmente **más de 250 datasets** sobre movilidad, urbanismo, servicios y transparencia municipal. Entre ellos, dos joyas clasificadas como "conjuntos de datos de Alto Valor" según el estándar europeo: `estat-transit-temps-real` (actualizado cada 3 minutos) y la familia de datasets de movilidad reducida. Sin embargo, **la carga de transformar esos datos en una decisión cotidiana recae íntegramente en la ciudadanía**.

Casos reales:
- Una **persona comerciante** no sabe hasta que lo sufre que una ocupación de vía pública durante una falla va a cortarle el acceso durante tres semanas, ni qué ayudas municipales puede solicitar.
- Una **familia con algún miembro de movilidad reducida** no descubre hasta llegar al destino que el evento de su barrio ha cerrado el único aparcamiento PMR cercano.
- Una **persona conductora con vehículo antiguo** entra en la ZBE sin saberlo y descubre la sanción días después.
- Una **ciclista habitual** pierde tiempo buscando aparcamiento para bicis sin saber que Valenbisi tiene disponibilidad a 150 metros.

El dato existe, es de alta calidad y está abierto. Lo que falla es **el último metro: convertir el dato en una acción proactiva**.

## 4. Solución propuesta: "El cierre del bucle de acción"

V-PRO introduce un flujo explícito de tres pasos:

1. **Aviso** — detección automática de una interrupción urbana a partir de los datasets oficiales.
2. **Alternativa** — sugerencia georreferenciada personalizada según perfil (genérico, comercial, PMR, ciclista), priorizando lo que está fuera de la zona de impacto.
3. **Acción** — acceso directo a trámites municipales relacionados (ayudas, exenciones, avisos) alojados en `valencia.es` y `sede.valencia.es`.

### Pipeline de datos
```
Portal CKAN (opendata.vlci.valencia.es)
           │  descubrimiento
           ▼
ArcGIS REST Services (geoportal.valencia.es)
           │  GeoJSON
           ▼
     cron (*/30 * * * *)
           │
           ▼
Scraper → Normalizer → Ingestor
           │
           ▼
  PostgreSQL + PostGIS
  (urban_events, impact_zones, mitigation_actions, feedback)
           │
           ▼
   FastAPI / suggestions
           │
           ▼
  Frontend vanilla + MapLibre GL JS
  (ActionCard + feedback 👍/👎)
```

### Perfiles de usuario soportados (MVP)
| Perfil | Prioriza | Filtra en Alternative Finder |
|---|---|---|
| **Genérico** | Rapidez, simplicidad | Parkings, bus, bici |
| **Comercial** | Información sobre ayudas y duración de la obra | Ocupaciones prolongadas, URLs a trámites de ayudas |
| **Movilidad reducida (PMR)** | Aparcamientos accesibles, rutas accesibles | Solo POIs marcados como accesibles (aparcamientos PMR, rutas Jardín del Turia) |
| **Ciclista** | Aparcamientos de bici, Valenbisi, carriles bici | Puntos Valenbisi con disponibilidad + itinerarios ciclistas |
| **Transporte público** | Paradas EMT, estaciones FGV | Nodos de transporte público cercanos |

El perfil se selecciona con un toggle en la UI; no requiere login.

## 5. Datos abiertos utilizados (verificados empíricamente 2026-05-09)

Catálogo completo y URLs exactas en `DATA_SOURCES.md`. Resumen:

**Fuentes de interrupciones** (generan `UrbanEvent`):
- `ocupacio-via-publica` — obras + festejos + incidencias (nuclear).
- `estat-transit-temps-real` — tráfico en tiempo real, HVD europeo, cada 3 min.
- `talls-transit-falles` — cortes por Fallas (Golden Path).
- `zona-de-bajas-emisiones` — restricciones de acceso por vehículo.

**Fuentes de alternativas** (generan `PointOfInterest`):
- Aparcamientos: `parkings`, `aparcaments-ora`, `aparcaments-no-regulats`, `aparcaments-persones-mobilitat-reduida` (HVD), `aparcament-per-a-motos`, `aparcaments-bicicletes`.
- Movilidad compartida: `valenbisi-disponibilitat` (tiempo real).
- Transporte público: `emt`, `fgv-estacions-estaciones`, `fgv-bocas`.
- Accesibilidad: `rutas-accesibles-jardin-turia`, `zones-mobilitat-reduida`.
- Ciclable: `itinerarios-ciclistas`.
- Carga VE: `recarrega-vehicles-electrics`.

Todos los datasets verificados tienen licencia **CC BY 4.0**.

Las fuentes complementarias oficiales (RSS, agenda municipal, avisos o paginas institucionales) solo se incorporaran como refuerzo operativo si mantienen trazabilidad, proceden de dominios oficiales y no sustituyen el nucleo de Datos Abiertos. Si su licencia no permite republicar el contenido bruto, V-PRO las usara unicamente como senal para generar eventos derivados minimos y documentados.

## 6. Alineación con los criterios de valoración del jurado (100 pts)

### 6.1. Originalidad y grado de innovación (25 pts)
- **Cambio de paradigma.** V-PRO implementa el paso "dato → acción" que hoy no existe en el portal municipal.
- **Uso de Alto Valor europeo.** Consume `estat-transit-temps-real` (HVD), categoría que la UE prioriza para reutilización.
- **Motor de plantillas de acción** en YAML versionado en git — reglas declarativas, auditables, editables sin redeploy. Vincula cada tipo de interrupción con una o varias `MitigationAction`.
- **Cálculo geoespacial dinámico** con PostGIS: reproyección a EPSG:32630 para buffers en metros; `ST_DWithin` en EPSG:3857 para emparejamiento ciudadanía ↔ interrupciones.
- **Perfiles de usuario** que adaptan las sugerencias. La lógica de accesibilidad no es un extra: es un perfil de primera clase.
- **Feedback loop ciudadano.** Cada sugerencia puede ser calificada con 👍/👎 anónimo; el agregado se publica como nuevo dataset CC-BY 4.0 — **V-PRO no solo consume datos abiertos, produce nuevos datos abiertos derivados de la experiencia ciudadana real.**

### 6.2. Valor público e impacto social y urbano (25 pts)
- **Impacto directo en colectivos vulnerables:**
  - Comercios afectados por ocupaciones prolongadas (obras, fallas) → enlace a ayudas municipales.
  - **Personas con movilidad reducida** — sugerencias filtradas a POIs accesibles. Esto **no es un checkbox de accesibilidad**, es un perfil de usuario explícito con datos dedicados.
  - Residentes de zonas con restricción de acceso (ZBE) → aviso antes de la sanción.
  - Ciclistas → aparcamientos de bici + Valenbisi con disponibilidad en tiempo real.
- **Rendición de cuentas cuantificable.** Las zonas de impacto y su historial temporal hacen visibles las decisiones municipales: cuántas ocupaciones, dónde, con qué duración, qué barrios más afectados. El feedback agregado revela qué tipo de acciones son útiles.
- **Empoderamiento ciudadano.** El dato deja de ser "solo para expertos": cualquier persona, con una interacción en móvil, entiende qué ocurre y qué puede hacer.
- **Ahorro agregado verificable.** Menos desplazamientos fallidos = menos emisiones, menos pérdida de tiempo, menos fricción comercial. El propio feedback loop permite medirlo.

### 6.3. Viabilidad, sostenibilidad y calidad del tratamiento de los datos (25 pts)
- **Trazabilidad completa** de cada dato en `DATA_SOURCES.md` con URLs exactas de ArcGIS REST, campos, licencia, frecuencia y limitaciones conocidas.
- **Metodología documentada** en `METHODOLOGY.md` (ingesta, normalización, validación geométrica, deduplicación, generación de buffers, motor de plantillas).
- **Reproducibilidad total:** un único `docker compose up` levanta todo el sistema.
- **Sostenibilidad económica:** stack íntegramente open-source (PostgreSQL+PostGIS, FastAPI, MapLibre GL JS, OpenFreeMap, Nginx, Cloudflare Tunnel, Tailscale) desplegable en Hetzner CX22 (~4 €/mes). **Sin dependencias de plataforma cerrada ni servicios de pago recurrentes.** Coste total estimado < 5 €/mes.
- **Continuidad y replicabilidad:** el modelo es trasladable a cualquier municipio con portal de datos abiertos (CKAN o ArcGIS REST); solo cambia el catálogo de datasets.
- **Calidad del dato:** validación geométrica con Shapely, deduplicación por `(source, source_id)`, tests automatizados con `pytest` (meta ≥70% cobertura), pipeline CI con `ruff` + `mypy` + `pytest` + `pip-audit`.

### 6.4. Carácter colaborativo, transparencia y apertura informativa (25 pts)
- **Código MIT** publicado desde el día uno.
- **Datos derivados CC-BY 4.0:** `exports/impact_zones.geojson`, `exports/mitigation_actions.csv`, `exports/action_templates.yaml`, **`exports/feedback_aggregated.csv`** (dataset generado por la propia comunidad usuaria).
- **API pública** documentada con OpenAPI/Swagger — cualquier entidad puede construir sobre V-PRO.
- **Metodología abierta** en `METHODOLOGY.md` con limitaciones y supuestos explícitos.
- **Decisiones arquitectónicas** registradas como Architecture Decision Records en `docs/DECISIONS.md` (4 ADRs firmados).
- **Contribuciones externas bienvenidas** mediante PR según `CONTRIBUTING.md`.
- **Compromiso de publicación** en el Portal de Datos Abiertos si resulta premiado, conforme a la cláusula 12 de las bases.

## 7. Viabilidad técnica y hoja de ruta

Arquitectura lean, enteramente open-source:
- **Backend:** Python 3.11 · FastAPI · SQLAlchemy 2 · GeoAlchemy2.
- **Datos:** PostgreSQL 15 · PostGIS (ST_DWithin, ST_Buffer, ST_Transform entre EPSG:4326/32630/3857).
- **Scheduler:** Cron del sistema invocando un script Python (sin colas de tareas externas).
- **Frontend:** HTML + CSS + JS **vanilla** + MapLibre GL JS. Sin frameworks, sin pipeline de build, tiles de OpenFreeMap.
- **Infra:** Hetzner CX22 (Ubuntu 24.04) · Nginx (con security headers A+ en securityheaders.com) · Cloudflare Tunnel · Tailscale · unattended-upgrades.

Plan de trabajo por fases (detalle en `ROADMAP.md` y `NEXT_STEPS.md`):
- **Fase A — Estabilización del repositorio.** Seguridad baseline, estructura canónica, CI.
- **Fase B — Fase 1 producto completa.** Ingesta real desde ArcGIS REST + cobertura ≥70%.
- **Fase C — Motor proactivo (Fase 2).** Action Template Engine + Alternative Finder multimodal + Feedback loop + exportaciones CC-BY 4.0.
- **Fase D — Interfaz (Fase 3).** Frontend vanilla bilingüe castellano/valenciano + selector de perfil.
- **Fase E — Despliegue (Fase 4).** Producción en Hetzner con cron activo.
- **Fase F — Entregables concurso.** Memoria oficial Anexo II + vídeo demo + presentación en sede.

Las decisiones técnicas estructurales (stack, scheduler, frontend, pivote de datasets) están documentadas en `docs/DECISIONS.md` como Architecture Decision Records firmados.

## 8. Cifras del contexto (pendientes de completar antes de presentar)

> A rellenar con datos del propio portal durante la Fase 0.
> Estos números son la vitamina del criterio 2 en la presentación oficial.

- Número de ocupaciones de vía pública activas en Valencia en un año promedio: **_a calcular con dataset `ocupacio-via-publica`_**.
- Número de tramos de tráfico monitorizados en tiempo real: **_a calcular con dataset `estat-transit-temps-real`_**.
- Número de plazas de aparcamiento PMR catalogadas: **_a calcular con dataset `aparcaments-persones-mobilitat-reduida`_**.
- Porcentaje de la ciudad cubierta por ZBE: **_a calcular con dataset `zona-de-bajas-emisiones`_**.
- Número total de datasets reutilizados: **≥ 12** (verificado).

## 9. Equipo y colaboración
Proyecto liderado por personas desarrolladoras con experiencia en plataformas geoespaciales. Abierto a la incorporación de perfiles de periodismo de datos, diseño UX, accesibilidad y entidades municipales. Se contemplará la firma del **Anexo III** si se concurre en agrupación.

## 10. Continuidad post-premio
- Mantenimiento mínimo mensual garantizado durante 12 meses tras el fallo.
- Publicación periódica de los datasets derivados (incluyendo el feedback agregado) en el Portal de Datos Abiertos.
- Talleres de divulgación abiertos para mostrar cómo reutilizar la API V-PRO.
- Incorporación progresiva de datasets adicionales del portal (contaminación, ruido, cámaras de tráfico).

## 11. Cumplimiento formal
- Redactado en castellano. UI pública prevista bilingüe castellano/valenciano desde el arranque.
- Uso de lenguaje inclusivo y no sexista en toda la documentación y la UI.
- Implantación con carácter general en el municipio de València.
- No se ha recibido subvención previa del Ayuntamiento de València por el mismo objeto.
- Cumplimiento de LOPDGDD y RGPD: **V-PRO no persiste datos personales.** La ubicación del usuario se procesa exclusivamente en el cliente para construir la consulta y se descarta tras la respuesta. El voto de feedback (👍/👎) se almacena sin identificador de usuario y sin IP (se rate-limita por token aleatorio de sesión no persistente).

## 12. Sobre la categoría de Periodismo de Datos

Las bases AD.TR.15 (punto 5) establecen que *"las personas, agrupaciones de personas y entidades participantes no podrán presentar más de un proyecto"*, sin distinción de categoría. Por tanto **V-PRO concurre exclusivamente a la categoría de Datos Abiertos**.

No obstante, los datos derivados que V-PRO publica (zonas de impacto, acciones de mitigación, feedback agregado, todos bajo CC-BY 4.0) están disponibles para que **personas periodistas independientes** puedan producir reportajes de datos usándolos, y presentar **sus propios proyectos** a la categoría de Periodismo de Datos como participantes distintos. V-PRO fomenta esa reutilización:

- Ejemplo de línea de investigación reutilizable: *"El mapa silencioso de las ocupaciones urbanas en Valencia: correlación entre barrios con más interrupciones y barrios con mayor índice de vulnerabilidad."*
- El equipo de V-PRO se compromete a ofrecer soporte técnico (sin compartir autoría) a cualquier persona periodista que quiera usar los datos derivados para una candidatura propia.

Este compromiso refuerza el **criterio 4** (colaboración y apertura) del jurado: V-PRO habilita ecosistema, no compite con él.

## 13. Anexos de apoyo (en el repositorio)
- `README.md` — presentación general.
- `CONTEXT.md` — visión y reglas del proyecto.
- `ARCHITECTURE.md` — arquitectura técnica.
- `ROADMAP.md` — plan de trabajo y estado.
- `DATA_SOURCES.md` — catálogo verificado de datasets.
- `METHODOLOGY.md` — metodología detallada.
- `docs/DECISIONS.md` — ADRs firmados (ADR-001 a ADR-004).
- `docs/concurso/tramites-referenciados.md` — catálogo de URLs municipales reales enlazadas en las `MitigationAction`.
- `LICENSE` — licencias de código y datos.

---

**Nota para el equipo:** antes de presentar la solicitud por la Sede Electrónica, verificar:
- [ ] Formato exacto del Anexo II publicado en `www.valencia.es` (rellenar campos oficiales).
- [ ] Modelo de solicitud normalizado firmado electrónicamente.
- [ ] Declaración responsable (Anexo I).
- [ ] Si concurre agrupación: Anexo III firmado por todos los miembros.
- [ ] Documentación fiscal según tipo de persona/entidad (036/037, RETA, escritura de constitución, etc.).
- [ ] Cifras concretas del § 8 rellenas con datos reales.
- [ ] Vídeo demo subido y enlazado desde el documento oficial.
- [ ] Decisión sobre colaboración con persona periodista externa para una candidatura independiente en Periodismo de Datos (§ 12).
