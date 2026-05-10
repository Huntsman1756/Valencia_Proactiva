# Spec frontend V-PRO

## Decisiones firmadas
| Dimension | Decision |
|---|---|
| Interaccion | Push proactivo: al abrir la app ya se muestran eventos cercanos. |
| Estilo visual | Ciudadano/cercano: inclusivo, calido, accesible y sobrio. |
| Layout principal | Lista de eventos primero; mapa como exploracion compacta y expandible. |
| Tarjeta de accion | Equilibrada: titulo, distancia, un dato clave y accion principal. |

La direccion visual formal queda definida en `docs/design/vpro-design-system.md` como **Civic Utility / Operativa Ciudadana**. Es obligatoria para futuras iteraciones de UI.

## Objetivo
Construir la primera interfaz usable de V-PRO para mobile-first. La app debe permitir que una persona abra la pagina y entienda rapidamente que incidencias hay cerca, como le afectan segun su perfil y que alternativa inmediata puede tomar.

## Flujo principal
1. La app carga el perfil guardado en `localStorage`; si no existe, usa `PMR` para la demo.
2. Obtiene eventos activos desde `GET /api/v1/events`.
3. Para cada evento visible, consulta alternativas con `GET /api/v1/spatial/alternatives?lon=&lat=&event_id=&profile=`.
4. Renderiza una lista de tarjetas ordenadas por severidad y cercania.
5. La accion principal abre navegacion externa con el destino recomendado.
6. Los botones de feedback llaman a `POST /api/v1/feedback` cuando el evento trae `mitigation_actions`; si no hay accion asociada, dejan feedback local no persistido como fallback.
7. El mapa compacto muestra eventos y POIs; al tocarlo se expande a vista completa.

## Pantalla inicial
### Barra superior
- Selector horizontal de perfil: `Generico`, `PMR`, `Bici`, `Transporte`.
- El perfil activo se guarda en `localStorage`.

### Encabezado contextual
- Titulo: `Lo que esta pasando cerca`
- Subtitulo dinamico: numero de eventos activos y hora relativa de actualizacion.

### Lista de eventos
Cada tarjeta incluye:
- Tipo y severidad.
- Titulo y descripcion breve.
- Distancia aproximada al punto de referencia.
- Dato clave de alternativa: tipo, distancia y plazas si existen.
- Boton principal `Ruta`.
- Feedback `util` / `no util`.

Las tarjetas deben priorizar lectura operativa: badge de severidad compacto, distancia con numeros tabulares, sombra minima o nula, sin apariencia de card SaaS generica.

### Mapa compacto
- Altura compacta en mobile.
- Expande a pantalla completa.
- Capas iniciales: eventos y alternativas.

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

### Alternativas
`GET /api/v1/spatial/alternatives?lon={eventLon}&lat={eventLat}&radius_meters=5000&profile={profile}&event_id={eventId}`

Campos usados:
- `name`
- `poi_type`
- `accessible`
- `extra_data.numplazas`
- `geometry.coordinates`
- `distance_meters`

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
