# Spec frontend V-PRO

## Decisiones firmadas
| Dimension | Decision |
|---|---|
| Interaccion | Push proactivo: al abrir la app ya se muestran eventos cercanos. |
| Estilo visual | Ciudadano/cercano: inclusivo, calido, accesible y sobrio. |
| Layout principal | Operativa en tres zonas: carril izquierdo de perfil/filtros, mapa central y panel derecho de accion. En movil, mapa primero y detalle como hoja inferior dentro del flujo. |
| Tarjeta de accion | Equilibrada: titulo, distancia, un dato clave y accion principal. |

La direccion visual formal queda definida en `docs/design/vpro-design-system.md` como **Civic Utility / Operativa Ciudadana**. Es obligatoria para futuras iteraciones de UI.

## Objetivo
Construir una interfaz usable de V-PRO para mobile-first con apariencia de herramienta civica operativa. La app debe permitir que una persona abra la pagina y entienda rapidamente que incidencias hay cerca, donde caen, como le afectan segun su perfil, que alternativa inmediata puede tomar y de que fuente procede cada dato.

## Flujo principal
1. La app carga el perfil guardado en `localStorage`; si no existe, usa `PMR` para la demo.
2. Obtiene eventos activos desde `GET /api/v1/events`.
3. Para cada evento visible, consulta alternativas con `GET /api/v1/spatial/alternatives?lon=&lat=&event_id=&profile=`.
4. Renderiza una lista de tarjetas ordenadas por severidad y cercania.
5. La accion principal abre navegacion externa con el destino recomendado.
6. Los botones de feedback llaman a `POST /api/v1/feedback` cuando el evento trae `mitigation_actions`; si no hay accion asociada, dejan feedback local no persistido como fallback.
7. El mapa central muestra eventos, POIs, trafico y zonas de impacto; al tocar `Expandir` pasa a vista completa.
8. Las tabs `Fuentes`, `Metodologia` e `Info` explican trazabilidad, reglas de decision y estado operativo sin salir de la app.

## Pantalla inicial
### Cabecera civica
- Marca `V-PRO / Valencia Proactiva`.
- Subtitulo de servicio publico basado en datos abiertos.
- Navegacion compacta a secciones operativas.
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
- `Info`: muestra el estado operativo de la demo local.

### Filtros de alternativa
- El modo `Todas` mantiene la logica de perfil: `PMR` exige `accessible=true`.
- Los filtros concretos (`Valenbisi`, `EMT`, `FGV`, `Bici`, `VE`, etc.) exploran esa capa multimodal aunque el perfil activo sea PMR.

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
