# V-PRO Design System

> Direccion visual obligatoria para el frontend de V-PRO.

## Nombre
**Civic Utility / Operativa Ciudadana**

V-PRO no debe parecer una landing de SaaS ni una demo generica de IA. Debe parecer una herramienta publica, local y operativa: clara al abrirla, densa cuando hace falta y cercana sin infantilizar.

## Referencia de criterio
Se toma `open-design` como referencia de proceso, no como plantilla visual. La idea util es fijar una direccion antes de disenar: paleta, tipografia, postura, anti-patrones y checklist. Para V-PRO, la base mas compatible es `Tech Utility` por densidad y estados, suavizada con tono ciudadano/cercano.

No se copian sistemas de marca como Apple, Linear, Vercel, Stripe o Notion.

## Principios
- **Informacion antes que decoracion.** El primer vistazo debe responder: que pasa, donde, cuanto afecta y que accion tomar.
- **Identidad civica.** Usar lenguaje de servicio publico: datos, actualizacion, severidad, distancia, accesibilidad, fuente.
- **Densidad controlada.** La interfaz debe ser escaneable; evitar espacios heroicos o marketing.
- **Divulgacion progresiva.** La entrada debe mostrar lo accionable primero; detalle, leyenda, ayuda larga y filtros secundarios se abren bajo demanda.
- **Accion visible.** La ruta y el feedback deben estar claros, pero no competir con el dato clave.
- **Mapa como contexto operativo.** El mapa es la superficie principal para comprender donde ocurre algo; la lista y el panel de detalle convierten ese contexto en accion.

## Paleta
Usar una paleta de neutros frios y acentos funcionales:

| Token | Uso | Valor base |
|---|---|---|
| `--bg` | Fondo app | `#f4f6f8` |
| `--surface` | Superficie principal | `#ffffff` |
| `--paper` | Fondo de panel | `#fbfcfd` |
| `--ink` | Texto principal | `#0b2038` |
| `--muted` | Texto secundario | `#546579` |
| `--line` | Bordes | `#d8e0e7` |
| `--blue` | Accion principal / institucion | `#0d3b66` |
| `--green` | Estado disponible / activo bajo | `#0b7a58` |
| `--red` | Severidad alta | `#c73a3a` |
| `--orange` | Severidad media / zona | `#b76512` |

Evitar paletas dominadas por morado, azul oscuro, crema/beige, naranja o gradientes.

## Tipografia
- Sistema nativo: `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `sans-serif`.
- No cargar fuentes externas en el MVP.
- Usar numeros tabulares para distancias, plazas, severidad y contadores.
- No usar tipografia heroica salvo en el titulo contextual.
- La UI debe usar tokens tipograficos explicitos para evitar saltos de escala entre tarjetas, detalle y controles.
- Reservar pesos 800-900 para marcas, iconos o controles muy cortos; en texto operativo usar pesos intermedios para no deformar letras.
- Las direcciones largas se parten por palabras (`break-word`/`word-break: normal`), nunca letra a letra salvo identificadores tecnicos sin espacios.

## Layout
- Mobile-first.
- En desktop, el mapa es la superficie principal y ocupa el fondo operativo. Perfil/filtros, lista y detalle flotan encima con separacion visible para evitar lectura de informe cuadriculado.
- En la entrada desktop, el detalle inferior, la leyenda y el selector de alternativas deben empezar plegados para no tapar el mapa ni competir con la lista de eventos.
- En mobile, el mapa aparece primero tras la cabecera y el detalle queda como hoja inferior dentro del flujo.
- El selector de idioma siempre queda separado de perfiles y alineado a la derecha.
- Los componentes en flujo conservan radio contenido. En desktop se permite `--float-radius` para paneles flotantes sobre mapa siempre que haya contraste AA, borde fino y sin glow decorativo.
- Modo claro y oscuro comparten estructura; el modo oscuro es de operativa/presentacion, no una paleta neon.

## Componentes
### Event Card
- No usar sombra decorativa fuerte.
- No depender de una barra lateral gruesa como unica identidad visual.
- Mostrar severidad como badge compacto y color funcional.
- Mantener distancia con numeros tabulares.
- El dato clave debe parecer informacion operativa, no una tarjeta dentro de otra tarjeta.

### Profile Selector
- Horizontal y desplazable en mobile.
- Estado activo claro por contraste, no por sombra.
- La descripcion de cada perfil debe aparecer como ayuda en hover/focus, no como caja fija adicional que duplique el estado activo.
- Todos los controles interactivos visibles deben mantener al menos 44 px de alto. En móvil, el foco debe desplazarse al elemento activo para no quedar fuera del viewport ni bajo la cabecera fija.

### Language Selector
- Desplegable compacto con bandera/idioma activo; evitar siglas internas como CAS/VAL.
- Alineado a la derecha.
- Nunca debe mostrar claves internas de i18n; si falla una traduccion, usar fallback legible (`Castellano` / `Valencia`).

### Theme Toggle
- Usar iconos compactos de sol/luna con `aria-label`, no siglas opacas como `DIA`/`NOC`.
- En modo oscuro, toda bandeja flotante sobre mapa expandido debe usar fondo oscuro propio y texto claro; no mezclar fondo blanco semitransparente con `--ink` oscuro/claro.

### Map
- Compacto por defecto.
- Sin marco decorativo pesado.
- Las capas y colores deben explicar estado, no decorar.
- Las zonas de impacto son contexto estimado, no una afirmacion de calle cortada. Deben limitarse a eventos visibles y dibujarse con relleno suave y trazo discontinuo.
- El trafico normal no se pinta como red de fondo. La capa de trafico solo debe aparecer cuando exista incidencia relevante; si no, compite con eventos y alternativas.
- Las alternativas cercanas deben ser distinguibles de los eventos mediante color, leyenda y popup explicito asociado al perfil activo.
- En mapa operativo, los marcadores V-PRO tienen prioridad sobre iconos del mapa base. Usar pins propios y ocultar POI/transporte base cuando resten legibilidad.
- En vista expandida, conservar una bandeja compacta de eventos visibles para que el mapa no quede desconectado de la lista.
- Los controles flotantes del mapa deben reservar espacio frente al panel derecho de eventos. En vista expandida pueden recuperar inset completo, pero el boton principal no debe quedar debajo de otra superficie.
- La leyenda del mapa debe poder ocultarse/mostrarse, especialmente en vista expandida.
- Las tarjetas de fuentes deben distinguir fuente, dataset y artefacto derivado. Si una fuente publica varios ficheros derivados, el contador debe reflejar los artefactos visibles, no un dataset generico.
- Las pestanas informativas son superficies de evidencia para AD.TR.15: deben mostrar de un vistazo datos abiertos, reutilizacion, impacto local y verificacion. La referencia `open-design` se aplica como disciplina de sistema (tokens, jerarquia, anti-patrones), no como copia visual.
- En `Fuentes`, cada bloque debe empezar por la fuente, explicar su uso y colocar el CTA `Abrir fuente` junto al titulo. Evitar CTAs flotando en columnas vacias; los datasets y artefactos deben leerse en columnas cuando haya ancho suficiente.
- La pestana `Info` no debe abreviarse en navegacion publica: usar `Informacion` en castellano e `Informacio` en valenciano.
- Los paneles informativos (`Fuentes`, `Metodología`, `Información`) son pestañas centrales a página completa dentro del área principal. No usan drawer lateral, backdrop ni botón de cierre; al abrirse ocultan mapa, carril izquierdo y panel derecho para evitar solapes.
- Las listas operativas no deben depender de scrollbars internas poco evidentes. Si una bandeja puede crecer, ofrecer control explicito de contraer/expandir.
- La pestaña Eventos no debe mostrar controles redundantes si el perfil ya decide la misma logica. ZBE/distintivo ambiental solo debe aparecer cuando haya un flujo accionable y verificable.
- Los popups de mapa deben ser singleton: un click sustituye el popup anterior y deben mantener contraste AA en modo noche.
- Los enlaces de tramite o referencia solo deben renderizarse si la accion trae una URL municipal verificable y coherente con el perfil activo.
- La accion de copiar ficha/snapshot no debe competir con la recomendacion ciudadana principal; si se recupera, debe ir en un flujo secundario para reutilizadores o medios.

## Anti-patrones
Prohibido en el frontend de V-PRO salvo decision documentada:
- Gradientes decorativos de fondo.
- Glassmorphism, glow, bokeh, orbes o blur ornamental.
- Hero marketing o claim gigante.
- Layout tipo SaaS landing.
- Copiar una marca comercial como Apple, Linear, Vercel, Stripe, Notion o similares.
- Tarjetas anidadas.
- Sombras grandes para dar "premium".
- Iconos enormes o emojis como elemento principal.
- Cambiar colores por gustos sin revisar contraste y semantica.

### Excepcion documentada 2026-05-10
Se permite translucidez funcional (`backdrop-filter`) solo en header, leyenda y paneles flotantes del layout map-first. Motivo: mantener el mapa como contexto urbano continuo y reducir la sensacion de cuadricula. No se permite usarlo como decoracion aislada, ni con brillos, orbes o fondos generativos.

## Checklist antes de cerrar UI
- No hay overflow horizontal en mobile.
- El desplegable de idioma queda a la derecha.
- El primer evento se entiende sin abrir el mapa.
- Severidad, distancia y accion son visibles en menos de 3 segundos.
- Las capturas `docs/reports/frontend-mobile.png` y `docs/reports/frontend-desktop.png` no parecen una landing ni una demo generica de IA.
- Playwright smoke verde en mobile y desktop.
