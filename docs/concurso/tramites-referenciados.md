# Trámites municipales referenciados por V-PRO

> Este catálogo vincula cada tipo de evento urbano detectado por V-PRO con el trámite o página oficial correspondiente en `valencia.es` y `sede.valencia.es`.
> Cada URL debe verificarse manualmente antes de incluirla. **Una URL rota en producción rompe la cadena "dato → acción".**
> Plantilla creada el 2026-05-09 para su rellenado en la tarea `T-20c`.

## Reglas de inclusión

1. La URL debe devolver HTTP 200 en una verificación manual reciente.
2. La URL debe ser estable (no incluir parámetros de sesión, filtros temporales ni campañas).
3. Preferir dominios oficiales: `valencia.es`, `sede.valencia.es`, `geoportal.valencia.es`.
4. Cada entrada referenciada por una o más reglas del Action Template Engine.
5. Revisar anualmente (el Ayuntamiento reorganiza su web con frecuencia).

## Catálogo

### Ayudas municipales a comercios afectados por obras u ocupaciones
| Campo | Valor |
|---|---|
| Perfil destino | COMMERCIAL |
| Evento disparador | `OCUPACION` de duración ≥ 15 días que intersecta con POI comercial |
| URL oficial | *pendiente de verificar* — buscar en `valencia.es/cas/comercio` → "Ayudas" |
| Última verificación | — |
| Acción V-PRO | `ADMIN_TASK` con título "Ayudas municipales para comercios afectados" |

### Exención de tasas por ocupación de vía pública
| Campo | Valor |
|---|---|
| Perfil destino | COMMERCIAL |
| Evento disparador | Cualquier `OCUPACION` |
| URL oficial | *pendiente de verificar* — tasas municipales |
| Última verificación | — |

### Zona de Bajas Emisiones — registro e información
| Campo | Valor |
|---|---|
| Perfil destino | GENERIC / COMMERCIAL |
| Evento disparador | `ZBE` (perfil con vehículo sin etiqueta ambiental compatible) |
| URL oficial | *pendiente de verificar* — `valencia.es/cas/movilidad/zbe` |
| Última verificación | — |

### Tarjeta de aparcamiento para personas con movilidad reducida
| Campo | Valor |
|---|---|
| Perfil destino | PMR |
| Evento disparador | Primer uso del perfil PMR (acción informativa) |
| URL oficial | *pendiente de verificar* — `sede.valencia.es` → Servicios Sociales → Tarjeta PMR |
| Última verificación | — |

### Información de Fallas y cortes de tráfico
| Campo | Valor |
|---|---|
| Perfil destino | GENERIC |
| Evento disparador | `EVENTO_FALLAS` activo |
| URL oficial | *pendiente de verificar* — `valenciaalminut.com` / `visitvalencia.com/fallas` |
| Última verificación | — |

### Cita previa para cualquier trámite municipal
| Campo | Valor |
|---|---|
| Perfil destino | GENERIC (enlace transversal) |
| URL oficial | https://www.valencia.es/cas/tramites/cita-previa |
| Última verificación | 2026-05-09 (extraída del footer de opendata.vlci.valencia.es) |
| Estado | ✅ verificada |

### AppValència (aplicación oficial)
| Campo | Valor |
|---|---|
| Perfil destino | Footer de la UI (enlace adicional) |
| URL oficial | https://www.valencia.es/cas/appvalencia |
| Última verificación | 2026-05-09 |
| Estado | ✅ verificada |

### Aviso legal del Portal de Datos Abiertos (atribución)
| Campo | Valor |
|---|---|
| Perfil destino | Página "Acerca de V-PRO" |
| URL oficial | https://opendata.vlci.valencia.es/ (aviso legal en el footer) |
| Última verificación | 2026-05-09 |
| Estado | ✅ verificada |

### Sede Electrónica del Ayuntamiento
| Campo | Valor |
|---|---|
| Perfil destino | Cualquier `ADMIN_TASK` genérico |
| URL oficial | https://sede.valencia.es/sede/ |
| Última verificación | 2026-05-09 |
| Estado | ✅ verificada |

---

## Próximos pasos (tarea T-20c)

1. Navegar manualmente `valencia.es/cas/comercio`, `valencia.es/cas/movilidad/zbe`, `sede.valencia.es` y completar las URLs pendientes.
2. Guardar capturas (`docs/concurso/tramites-screenshots/`) como prueba de estabilidad.
3. Actualizar las reglas YAML del Action Template Engine para que cada `ADMIN_TASK` apunte a la URL verificada.
4. Repetir la verificación 7 días antes de presentar la solicitud del concurso.

## Limitaciones conocidas
- Algunos trámites solo se listan en valenciano o requieren navegación en varios niveles. Documentar ambas versiones (castellano / valenciano) cuando existan.
- La URL de cita previa cubre "el portal"; cada trámite concreto suele tener su propia página más específica que debe preferirse cuando esté disponible.
