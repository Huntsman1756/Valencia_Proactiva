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
- **Accion visible.** La ruta y el feedback deben estar claros, pero no competir con el dato clave.
- **Mapa como apoyo.** La lista manda; el mapa confirma contexto y exploracion.

## Paleta
Usar una paleta de neutros verdosos y acentos funcionales:

| Token | Uso | Valor base |
|---|---|---|
| `--bg` | Fondo app | `#f4f7f5` |
| `--surface` | Superficie principal | `#fffffb` |
| `--surface-strong` | Bloque de dato clave | `#edf5f1` |
| `--ink` | Texto principal | `#16211c` |
| `--muted` | Texto secundario | `#5f6f67` |
| `--line` | Bordes | `#d7e2dc` |
| `--primary` | Accion positiva / comunidad | `#057a55` |
| `--alert` | Severidad alta | `#b8322c` |
| `--warn` | Severidad media | `#a96812` |
| `--place` | Ubicacion / POI | `#3f5f9f` |

Evitar paletas dominadas por morado, azul oscuro, crema/beige, naranja o gradientes.

## Tipografia
- Sistema nativo: `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `sans-serif`.
- No cargar fuentes externas en el MVP.
- Usar numeros tabulares para distancias, plazas, severidad y contadores.
- No usar tipografia heroica salvo en el titulo contextual.

## Layout
- Mobile-first.
- Lista de eventos como superficie principal.
- En desktop, lista y mapa en dos columnas, con cabecera a ancho completo.
- El selector de idioma siempre queda separado de perfiles y alineado a la derecha.
- Los componentes operativos tienen radio maximo `8px`; botones de herramienta y feedback pueden ser circulares si contienen simbolos.

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

### Language Selector
- Segmented control compacto.
- Alineado a la derecha.

### Map
- Compacto por defecto.
- Sin marco decorativo pesado.
- Las capas y colores deben explicar estado, no decorar.

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

## Checklist antes de cerrar UI
- No hay overflow horizontal en mobile.
- CAS/VAL queda a la derecha.
- El primer evento se entiende sin abrir el mapa.
- Severidad, distancia y accion son visibles en menos de 3 segundos.
- Las capturas `docs/reports/frontend-mobile.png` y `docs/reports/frontend-desktop.png` no parecen una landing ni una demo generica de IA.
- Playwright smoke verde en mobile y desktop.
