# MEMORIA RESUMEN — VLC PROACTIVA (València Proactiva / V-PRO)

> **Borrador de la Memoria Resumen del proyecto (Anexo II)** para la convocatoria AD.TR.15 — Premios para proyectos de datos abiertos y periodismo de datos del Ayuntamiento de València 2026, categoría **Datos Abiertos**.
> Este documento es un borrador de trabajo. El formato final debe ajustarse al modelo Anexo II oficial publicado en la Sede Electrónica.
> Redactado en castellano. Uso de lenguaje inclusivo y no sexista.
> Última revisión: 2026-05-24 (producción HTTPS en `https://vlcproactiva.es`, exports públicos, auditoría de repositorio público y checklist AD.TR.15).

## 1. Identificación del proyecto
- **Título:** VLC PROACTIVA (València Proactiva / V-PRO): plataforma de movilidad proactiva basada en datos abiertos municipales.
- **Categoría a la que concurre:** Datos Abiertos. La reutilización periodística se plantea como salida abierta para terceros, no como candidatura paralela del mismo equipo (ver § 12).
- **Ámbito territorial:** Municipio de València.
- **Tipo de entregable:** Plataforma web reutilizable (API + frontend) con código abierto (MIT) y datos derivados bajo licencia CC-BY 4.0.
- **Demo pública:** `https://vlcproactiva.es`.
- **Repositorio público:** `https://github.com/Huntsman1756/Valencia_Proactiva` (pendiente de sincronizar con la release local final antes de presentar).

## 2. Resumen ejecutivo
**VLC PROACTIVA no es un mapa: es una capa de decisión pública construida sobre datos abiertos municipales. Cuando el tráfico se corta, una ocupación de vía pública afecta a una calle o la Zona de Bajas Emisiones condiciona un desplazamiento, la plataforma muestra qué ocurre, dónde ocurre, qué impacto tiene y qué alternativa puede usar cada perfil: general, comercio, movilidad reducida, bicicleta o transporte público. V-PRO no solo consume datos abiertos: produce nuevos datos abiertos derivados de la experiencia ciudadana real.**

VLC PROACTIVA transforma el Portal de Datos Abiertos del Ayuntamiento de València — hoy un archivo pasivo consultable sobre todo por personas técnicas — en una plataforma proactiva que convierte cada interrupción urbana en una sugerencia accionable. El sistema ingiere datasets reales del portal municipal (ocupación de vía pública, estado del tráfico, ZBE), puede reforzarlos con fuentes oficiales complementarias trazables cuando el portal no publique eventos vivos con suficiente frescura, calcula zonas de impacto geoespaciales con PostGIS y las traduce en acciones concretas: aparcamientos alternativos priorizando los accesibles, puntos de destino multimodales (bus, metro, bici), y enlaces directos a trámites municipales relevantes.

La interfaz ya materializa esa tesis. La pantalla principal prioriza la lista de eventos y el detalle operativo: nombres de calle legibles en lugar de coordenadas, alternativa recomendada, aviso local de novedades desde la última visita y feedback ciudadano. La pestaña `Fuentes` funciona como auditoría cívica del portal: etiquetas técnicas breves (`DAT`, `TRF`, `ZBE`, `PMR`) y un semáforo de calidad distinguen fuentes operativas, fuentes sin incidencia relevante y avisos en validación diferida. La pestaña `Info` resume el pulso urbano con métricas agregadas (calles potencialmente afectadas, zonas alteradas y trazabilidad del dato) e incorpora un FAQ de primera visita para explicar cómo leer una tarjeta, elegir perfil, cambiar filtros e interpretar el impacto. Así una persona técnica, un medio local, una vecina o un jurado pueden entender el valor público en segundos.

Todo el código publicable se libera bajo MIT y los datos derivados bajo CC-BY 4.0, cerrando una economía circular del dato: la ciudad publica información, V-PRO la convierte en servicio y devuelve conocimiento procesado, auditable y reutilizable.

La hoja de ruta incorpora además una dimensión de seguridad urbana y perspectiva de género: futuras rutas iluminadas solo se activarán cuando exista una fuente oficial de alumbrado y una metodología que evite falsas garantías.

## 3. Problema que aborda

El Portal de Datos Abiertos del Ayuntamiento publica actualmente **más de 250 datasets** sobre movilidad, urbanismo, servicios y transparencia municipal. Entre ellos, dos joyas clasificadas como "conjuntos de datos de Alto Valor" según el estándar europeo: `estat-transit-temps-real` (actualizado cada 3 minutos) y la familia de datasets de movilidad reducida. Sin embargo, **la carga de transformar esos datos en una decisión cotidiana recae íntegramente en la ciudadanía**.

Casos reales:
- Una **persona comerciante** no sabe hasta que lo sufre que una ocupación de vía pública activa va a cortarle el acceso o la carga y descarga, ni qué ayudas o trámites municipales puede revisar.
- Una **familia con algún miembro de movilidad reducida** no descubre hasta llegar al destino que el evento de su barrio ha cerrado el único aparcamiento PMR cercano.
- Una **persona conductora con vehículo antiguo** entra en la ZBE sin saberlo y descubre la sanción días después.
- Una **ciclista habitual** pierde tiempo buscando aparcamiento para bicis sin saber que Valenbisi tiene disponibilidad a 150 metros.

El dato existe, es de alta calidad y está abierto. Lo que falla es **el último metro: convertir el dato en una acción proactiva**.

## 4. Solución propuesta: "El cierre del bucle de acción"

V-PRO introduce un flujo explícito de tres pasos:

1. **Aviso** — detección automática de una interrupción urbana a partir de los datasets oficiales.
2. **Alternativa** — sugerencia georreferenciada personalizada según perfil (general, comercio, PMR, bicicleta o transporte público), priorizando lo que está fuera de la zona de impacto.
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
   FastAPI / events + alternatives + layers + feedback
           │
           ▼
  Frontend vanilla + MapLibre GL JS
  (mapa + panel operativo + feedback)
```

### Diseño de producto como prueba de gobernanza
La interfaz no usa la trazabilidad como texto decorativo: la convierte en comportamiento verificable.

- **Fuentes como registro operativo.** Las etiquetas funcionales cortas (`DAT`, `TRF`, `ZBE`, `PMR`) reducen ruido visual y comunican que cada capa procede de una fuente concreta, auditable y reutilizable.
- **Semáforo de calidad.** Antes de pintar un dato en el mapa, V-PRO informa de su estado: operativo, sin incidencia relevante o en validación diferida. Esta gobernanza conservadora evita convertir un aviso incompleto en una falsa certeza.
- **Detalle accionable.** Cada evento muestra ubicación humana, área afectada, impacto temporal, alternativa y acción administrativa. La persona usuaria no recibe coordenadas ni datasets crudos; recibe una decisión posible.
- **Aviso local de novedades.** El navegador recuerda solo la fecha de última visita y el perfil activo mediante `localStorage`. Si al volver hay incidencias nuevas para ese perfil, el carril de eventos lo indica sin enviar telemetría ni ubicaciones personales a un servidor.
- **FAQ de primera visita.** La pestaña `Info` explica en lenguaje simple cómo elegir perfil, leer una alerta, cambiar alternativas y entender los límites de la herramienta frente a fuentes oficiales.
- **Snapshot para medios.** El botón de exportación genera una pieza trazable con fuente, impacto y alternativa, pensada para cabeceras locales o equipos de comunicación pública.

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
- `talls-transit-falles` — cortes por Fallas. Se conserva como referencia histórica o fallback estacional, no como Golden Path activo de la demo.
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
- **Inferencia de severidad.** Cuando el portal no publica gravedad explícita, V-PRO calcula impacto operativo a partir de superficie afectada, tipo de vía y afección declarada, evitando tratar todas las incidencias como equivalentes.
- **Perfiles de usuario** que adaptan las sugerencias. La lógica de accesibilidad no es un extra: es un perfil de primera clase.
- **Feedback loop ciudadano.** Cada sugerencia puede ser calificada con 👍/👎 anónimo; el agregado se publica como nuevo dataset CC-BY 4.0 — **V-PRO no solo consume datos abiertos, produce nuevos datos abiertos derivados de la experiencia ciudadana real.**

### 6.2. Valor público e impacto social y urbano (25 pts)
- **Impacto directo en colectivos vulnerables:**
  - Comercios afectados por ocupaciones de vía pública actuales → enlace a ayudas o trámites municipales.
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
- **Sostenibilidad económica:** stack íntegramente open-source (PostgreSQL+PostGIS, FastAPI, MapLibre GL JS, OpenFreeMap, Nginx, Let's Encrypt y systemd timers) desplegado en un VPS CX23 de bajo coste. **Sin dependencias de plataforma cerrada ni servicios de pago recurrentes para el núcleo funcional.** Coste total estimado < 5 €/mes.
- **Bajo coste operativo:** VLC PROACTIVA ha sido diseñada con una arquitectura *vanilla-first* que minimiza los costes de mantenimiento y dependencias de terceros, permitiendo su ejecución en infraestructuras municipales estándar con un consumo de recursos despreciable.
- **Privacidad por diseño:** la plataforma no requiere registro ni recoge datos personales. El feedback ciudadano es estrictamente anónimo y se procesa sin IP ni perfil identificable antes de agregarse, cumpliendo LOPDGDD/RGPD.
- **Continuidad y replicabilidad:** el modelo es trasladable a cualquier municipio con portal de datos abiertos (CKAN o ArcGIS REST); solo cambia el catálogo de datasets.
- **Calidad del dato:** validación geométrica con Shapely, deduplicación por `(source, source_id)`, tests automatizados con `pytest` (meta ≥70% cobertura), pipeline CI con `ruff` + `mypy` + `pytest` + `pip-audit`.

### 6.4. Carácter colaborativo, transparencia y apertura informativa (25 pts)
- **Código MIT** publicado desde el día uno.
- **Datos derivados CC-BY 4.0:** `exports/impact_zones.geojson`, `exports/mitigation_actions.csv`, `exports/action_templates.yaml`, **`exports/feedback_aggregated.csv`** (dataset generado por la propia comunidad usuaria).
- **API pública** documentada con OpenAPI/Swagger — cualquier entidad puede construir sobre V-PRO.
- **Metodología abierta** en `METHODOLOGY.md` con limitaciones y supuestos explícitos.
- **Centro de recursos para medios:** cada evento puede exportarse como snapshot trazable con fuente, impacto, alternativa y código embebible, facilitando que medios locales lo reutilicen en piezas de periodismo de datos sobre obras, Fallas, maratones o movilidad.
- **Pulso urbano agregado:** la demo resume calles potencialmente afectadas, zonas con movilidad alterada y porcentaje de datos trazables para ofrecer un titular operativo reutilizable por gestores publicos y medios.
- **Semaforo de calidad del portal:** la seccion `Fuentes` funciona como auditoria civica amable, diferenciando datasets operativos, fuentes sin incidencia relevante y avisos en validacion diferida antes de pintarlos en el mapa.
- **Burocracia cero:** la accion administrativa se plantea como deep-link futuro a sede electronica con la incidencia ya referenciada, aplicando el principio once-only: no pedir al ciudadano datos que la administracion ya posee.
- **Repositorio público auditado:** el repositorio de candidatura es público, pero debe sincronizarse desde una copia local auditada y sin secretos antes de usarse como enlace final. No deben publicarse `.env`, claves, IP/ID del VPS, documentos administrativos ni historial operativo privado.
- **Decisiones arquitectónicas** registradas como Architecture Decision Records en `docs/DECISIONS.md` (4 ADRs firmados).
- **Contribuciones externas bienvenidas** mediante PR según `CONTRIBUTING.md`.
- **Compromiso de publicación** en el Portal de Datos Abiertos si resulta premiado, conforme a la cláusula 12 de las bases.

## 7. Viabilidad técnica y hoja de ruta

Arquitectura lean, enteramente open-source:
- **Backend:** Python 3.11 · FastAPI · SQLAlchemy 2 · GeoAlchemy2.
- **Datos:** PostgreSQL 15 · PostGIS (ST_DWithin, ST_Buffer, ST_Transform entre EPSG:4326/32630/3857).
- **Scheduler:** Cron del sistema invocando un script Python (sin colas de tareas externas).
- **Frontend:** HTML + CSS + JS **vanilla** + MapLibre GL JS. Sin frameworks, sin pipeline de build, tiles de OpenFreeMap.
- **Infra:** Hetzner CX23 (Ubuntu LTS) · Nginx + Let's Encrypt · systemd services/timers · PostgreSQL/PostGIS · unattended-upgrades. Cabeceras verificadas por `curl`; validación externa en securityheaders.com pendiente.

Plan de trabajo por fases (detalle en `ROADMAP.md` y `NEXT_STEPS.md`):
- **Fase A — Estabilización del repositorio.** Seguridad baseline, estructura canónica, CI.
- **Fase B — Fase 1 producto completa.** Ingesta real desde ArcGIS REST + cobertura ≥70%.
- **Fase C — Motor proactivo (Fase 2).** Action Template Engine + Alternative Finder multimodal + Feedback loop + exportaciones CC-BY 4.0.
- **Fase D — Interfaz (Fase 3).** Frontend vanilla bilingüe castellano/valenciano + selector de perfil.
- **Fase E — Despliegue (Fase 4).** Producción en Hetzner con cron activo.
- **Fase F — Entregables concurso.** Memoria oficial Anexo II + vídeo demo + presentación en sede.

Las decisiones técnicas estructurales (stack, scheduler, frontend, pivote de datasets) están documentadas en `docs/DECISIONS.md` como Architecture Decision Records firmados.

## 8. Cifras del contexto (calculadas con datos reales)

> Calculo reproducible en `docs/reports/memoria-figures.sql` y resultados en `docs/reports/memoria-figures.json`.
> Fecha de calculo: 2026-05-10, tras ejecutar `python -m scripts.run_ingest` contra los 14 datasets configurados.

- Ocupaciones de via publica activas ingeridas desde `ocupacio-via-publica`: **253**.
- Tramos de trafico monitorizados en tiempo real desde `estat-transit-temps-real`: **410**.
- Plazas/registros PMR catalogados desde `aparcaments-persones-mobilitat-reduida`: **2.161**.
- Superficie de la ZBE oficial: **27,44 km2**, equivalente al **20,38%** del termino municipal de Valencia.
- Numero total de datasets reutilizados por el MVP: **14** capas municipales verificadas, con **12 tipos de POI multimodal** en el Alternative Finder.
- Producción pública verificada el 2026-05-24: **669** eventos urbanos almacenados, **13.159** puntos de interés, **672** zonas de impacto, **950** acciones de mitigación, **100** eventos en feed público y **100** fichas HTML estáticas.

## 9. Equipo y colaboración
Proyecto liderado por personas desarrolladoras con experiencia en plataformas geoespaciales. Abierto a la incorporación de perfiles de periodismo de datos, diseño UX, accesibilidad y entidades municipales. Se contemplará la firma del **Anexo III** si se concurre en agrupación.

## 10. Continuidad post-premio
- Mantenimiento mínimo mensual garantizado durante 12 meses tras el fallo.
- Publicación periódica de los datasets derivados (incluyendo el feedback agregado) en el Portal de Datos Abiertos.
- Talleres de divulgación abiertos para mostrar cómo reutilizar la API V-PRO.
- Incorporación progresiva de datasets adicionales del portal (contaminación, ruido, cámaras de tráfico).

### 10.1 Evolución y escalabilidad

VLC PROACTIVA se plantea como una capa de inteligencia urbana, no como una web aislada. El MVP ya demuestra el ciclo evento -> impacto -> acción -> feedback, y las siguientes líneas permiten escalarlo sin perder rigor ni trazabilidad:

- **Modo Alerta / resiliencia.** La interfaz queda preparada para un modo de alto contraste orientado a emergencias, pero no mostrará refugios, evacuación, imbornales ni recursos críticos hasta disponer de fuentes oficiales verificadas y metodología documentada.
- **VLC-Voice.** Evolución conversacional para consultas como "¿puedo descargar mercancía mañana en la calle Colón a las 9?", siempre consultando el motor de reglas y fuentes oficiales, no sustituyéndolas.
- **Modelado predictivo.** Uso histórico de Fallas, maratones y grandes eventos para anticipar saturación urbana y ventanas de impacto, diferenciando predicción de aviso oficial.
- **Perspectiva de género y seguridad urbana.** Futuro perfil peatonal con rutas iluminadas: solo se activará tras verificar una fuente oficial de alumbrado público y definir una metodología que no convierta una recomendación en falsa sensación de seguridad.
- **Pasaporte de resiliencia comercial.** Evolución del perfil Comercio para que un negocio afectado por una obra prolongada pueda acreditar digitalmente la afección y publicar información operativa ("seguimos abiertos", acceso recomendado, campaña local), previa validación administrativa.
- **Crowdsourcing verificado.** El feedback ciudadano actuará como sensor social de veracidad: varias señales coincidentes podrán auditar la brecha entre dato oficial y realidad vivida, generar incidencias pendientes de validación municipal y publicar métricas agregadas CC-BY 4.0.
- **Backoffice municipal.** Panel para personal técnico con índice de estrés urbano, concentración de impactos por barrio y recomendaciones sobre dónde evitar nuevas actuaciones simultáneas.
- **Notificaciones proactivas.** El MVP ya demuestra el principio con avisos de novedades en local (`localStorage`, sin servidor). La evolución será Web Push para zonas habituales de una persona o comercio, siempre con consentimiento explícito, baja sencilla y sin almacenar ubicaciones personales innecesarias.

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
- Cada evento del frontend permite exportar un **snapshot periodístico** con fuente, impacto, alternativa y HTML embebible. Es una infraestructura para periodismo de datos: un recurso listo para publicar que elimina fricción entre la noticia y la utilidad pública.
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
- `docs/concurso/anexo-ii-primer-parrafo.md` — primer párrafo recomendado para el Anexo II oficial.
- `docs/concurso/video-storytelling-90s.md` — guion de vídeo de 90 segundos orientado a problema -> acción -> feedback.
- `docs/concurso/publicacion-repositorio-publico.md` — procedimiento para crear un repositorio público limpio sin historial privado ni secretos.
- `docs/concurso/checklist-candidatura-adtr15.md` — matriz de cumplimiento AD.TR.15, evidencias de producción y pendientes antes de presentar.
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
- [ ] Repositorio público sincronizado desde una exportación limpia, sin historial privado, sin `.env`, sin credenciales, sin IP/ID del VPS y con secretos rotados si estuvieron alguna vez en GitHub.
