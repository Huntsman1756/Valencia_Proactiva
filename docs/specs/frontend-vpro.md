# Spec frontend V-PRO

## Decisiones firmadas
| Dimension | Decision |
|---|---|
| Interaccion | Push proactivo: al abrir la app ya se muestran eventos cercanos. |
| Estilo visual | Ciudadano/cercano: inclusivo, calido, accesible y sobrio. |
| Layout principal | Operativa map-first: carril izquierdo de perfil/filtros, lista compacta de eventos a la derecha y ficha del evento seleccionado abajo sobre el mapa. En movil, mapa primero y detalle dentro del flujo. |
| Tarjeta de accion | Equilibrada: titulo, distancia, un dato clave y accion principal. |

La direccion visual formal queda definida en `docs/design/vpro-design-system.md` como **Civic Utility / Operativa Ciudadana**. Es obligatoria para futuras iteraciones de UI.

## Objetivo
Construir una interfaz usable de V-PRO para mobile-first con apariencia de herramienta civica operativa. La app debe permitir que una persona abra la pagina y entienda rapidamente que incidencias hay cerca, donde caen, como le afectan segun su perfil, que alternativa inmediata puede tomar y de que fuente procede cada dato.

## Flujo principal
1. La app carga el perfil guardado en `localStorage`; si no existe, usa `PMR` para la demo.
2. Obtiene eventos activos desde `GET /api/v1/events`.
3. Para cada evento visible, consulta alternativas con `GET /api/v1/spatial/alternatives?lon=&lat=&event_id=&profile=`.
4. Renderiza una lista de tarjetas ordenadas por severidad y cercania.
5. La accion principal se mantiene dentro de VLC PROACTIVA: seleccionar evento, revisar alternativa, exportar snapshot o enviar feedback. No se muestra ruta externa hasta disponer de routing propio con incidencias.
6. Los botones de feedback llaman a `POST /api/v1/feedback` cuando el evento trae `mitigation_actions`; si no hay accion asociada, dejan feedback local no persistido como fallback.
7. El mapa central muestra eventos, POIs, trafico y zonas de impacto; al tocar `Expandir` pasa a vista completa.
8. Las tabs `Fuentes`, `Metodologia` e `Info` son paginas internas de ancho completo; no se abren como drawer ni modal para evitar solapes con alertas o detalle.
9. `Vehiculo y ZBE` orienta por distintivo ambiental y enlaza a la fuente municipal, sin sustituir ordenanza ni señalizacion.
10. `Exportar snapshot` copia un payload trazable para medios locales, memoria o auditoria.
11. `Info` muestra un pulso urbano agregado y `Fuentes` expone un semaforo de calidad de datos para convertir la app en herramienta de lectura institucional, no solo consulta puntual.
12. La accion administrativa explica el modelo once-only/deep-link como evolucion municipal: la incidencia debe viajar con la accion para no pedir al ciudadano datos ya conocidos.

## Pantalla inicial
### Cabecera civica
- Marca `V-PRO / Valencia Proactiva`.
- Subtitulo de servicio publico basado en datos abiertos.
- Navegacion compacta integrada: Eventos, Fuentes, Metodologia e Info sin cajas duplicadas.
- Estado de datos dinamico y selector CAS/VAL alineado a la derecha.

### Carril izquierdo
- Selector de perfil: `Generico`, `Comercial`, `PMR`, `Bici`, `Transporte`.
- El perfil activo se guarda en `localStorage`.
- Filtros rapidos y filtros de alternativa multimodal.
- Nota de fuente con enlace al repositorio GitHub.

### Mapa central
- MapLibre como foco visual principal en escritorio y primera superficie tras la cabecera en movil.
- Capas iniciales: eventos, alternativas, trafico y zonas de impacto.
- Leyenda visible, controles sobrios y popups clicables por capa.

### Panel derecho / hoja movil
- Estado del evento seleccionado.
- Ubicacion y zona afectada estimada.
- Alternativa recomendada.
- Accion administrativa o referencia municipal si aplica.
- Ruta y feedback.

### Lista de eventos
Cada tarjeta incluye:
- Tipo y severidad.
- Titulo y descripcion breve.
- Fuente, `source_id` y ultima actualizacion.
- Distancia aproximada al punto de referencia.
- Dato clave de alternativa: tipo, distancia y plazas si existen.
- Boton principal `Ruta`.
- Feedback `util` / `no util`.

Las tarjetas deben priorizar lectura operativa: badge de severidad compacto, distancia con numeros tabulares, sombra minima o nula, sin apariencia de card SaaS generica.

### Vistas informativas
- `Fuentes`: lista las fuentes principales y distingue datos abiertos, fuentes oficiales complementarias y dato derivado.
- `Metodologia`: resume separacion evento/POI, zona de impacto, filtros por perfil y staging de avisos sin geometria.
- `Info`: muestra finalidad del proyecto, concurso AD.TR.15, estado operativo, limitaciones, FAQ, GitHub y bases.

### Filtros de alternativa
- El modo `Todas` mantiene la logica de perfil: `PMR` exige `accessible=true`.
- Los filtros concretos usan texto explicito: `Valenbisi`, `Paradas EMT`, `Metro / FGV`, `Aparcamientos bici`, `Carriles bici`, `Recarga vehiculo electrico`, etc. Se evitan siglas sin contexto como `VE` aislado.

## Contratos de API
### Eventos
`GET /api/v1/events?limit=8`

Campos usados:
- `id`
- `type`
- `title`
- `description`
- `severity`
- `center`
- `geometry`
- `source`
- `source_id`
- `updated_at`

### Alternativas
`GET /api/v1/spatial/alternatives?lon={eventLon}&lat={eventLat}&radius_meters=5000&profile={profile}&event_id={eventId}`

Campos usados:
- `name`
- `poi_type`
- `accessible`
- `extra_data.numplazas`
- `geometry.coordinates`
- `distance_meters`
- `source`
- `source_id`

### Feedback
`POST /api/v1/feedback`

Se envia cuando la tarjeta tiene una `mitigation_action` aplicable al perfil activo. Si no hay accion, el frontend mantiene estado local como degradacion controlada.

## Accesibilidad
- Contraste minimo AA en texto y botones.
- Botones con `aria-label`.
- Mapa no es el unico medio para acceder a las acciones.
- `prefers-reduced-motion` desactiva transiciones no esenciales.
- Estados de carga y error visibles.

## Definition of Done
- `src/frontend/index.html` abre sin build step.
- `src/frontend` se sirve por Nginx dev en `http://localhost:8080`.
- Con API levantada, muestra eventos reales y alternativas PMR reales.
- Sin API, muestra un estado de error controlado.
- Perfil persiste en `localStorage`.
- Idioma CAS/VAL persiste en `localStorage`.
- Mapa compacto expande y contrae.
- `Ruta` abre URL externa de navegacion.
- Verificado en navegador local desktop y mobile.
