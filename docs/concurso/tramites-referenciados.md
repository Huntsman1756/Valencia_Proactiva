# Tramites municipales referenciados por V-PRO

> Catalogo verificado el 2026-05-10. Cada URL apunta a dominios oficiales del Ayuntamiento de Valencia o su Sede Electronica y devuelve HTTP 200 en `docs/reports/tramites-url-check.json`.

## Criterios de inclusion

1. URL estable, sin parametros de sesion.
2. Dominio oficial: `valencia.es`, `sede.valencia.es`, `geoportal.valencia.es` u organismo municipal enlazado desde el portal.
3. Relacion directa con una accion proactiva de V-PRO.
4. Referencia enlazable desde `payload.url` en las reglas del Action Template Engine.

## Catalogo verificado

| ID | Uso V-PRO | Perfil | URL oficial | Ultima verificacion | Regla YAML |
|---|---|---|---|---|---|
| `COMERCIO_INVERSIONES` | Ayudas municipales a inversiones en comercio local. | COMMERCIAL | https://sede.valencia.es/sede/registro/procedimiento/AE.CM.35?lang=1 | 2026-05-10 | `comercio-ocupacion` |
| `COMERCIO_PROMOCION` | Ayudas a asociaciones de comercio para promocion y dinamizacion local. | COMMERCIAL | https://sede.valencia.es/sede/registro/procedimiento/AE.CM.70?lang=1 | 2026-05-10 | Referencia documental |
| `OCUPACION_CONTENEDOR` | Comunicacion de ocupacion de via publica con contenedor de escombros. | GENERIC / COMMERCIAL | https://sede.valencia.es/sede/registro/procedimiento/WEB_ASSET_CRG_0105?lang=1 | 2026-05-10 | Referencia documental |
| `OCUPACION_TERRAZA` | Autorizacion para ocupacion del dominio publico municipal mediante terraza. | COMMERCIAL | https://sede.valencia.es/sede/registro/procedimiento/VP.OC.15?lang=1 | 2026-05-10 | Referencia documental |
| `OCUPACION_VIA_COMERCIO` | Ocupacion del dominio publico por locales comerciales y establecimientos publicos. | COMMERCIAL | https://sede.valencia.es/sede/registro/procedimiento/VP.VE.50?lang=1 | 2026-05-10 | Referencia documental |
| `CARGA_DESCARGA_COMERCIAL` | Solicitud de zonas de reserva para carga y descarga de vehiculos comerciales. | COMMERCIAL | https://sede.valencia.es/sede/registro/procedimiento/TR.AR.45?lang=1 | 2026-05-10 | `comercio-ocupacion` |
| `PMR_TARJETA` | Solicitud de tarjeta de estacionamiento para personas con movilidad reducida. | PMR | https://sede.valencia.es/sede/registro/procedimiento/BS.DI.25?lang=1 | 2026-05-10 | `ocupacion-severa` |
| `ZBE_ORDENANZA` | Ordenanza y proyecto de Zona de Bajas Emisiones. | GENERIC / COMMERCIAL | https://sede.valencia.es/sede/ordenanzas/detalle/MzM2MDE.AvPAlt3D.AvOvTok%25C2%25A0 | 2026-05-10 | `trafico-retencion` |
| `FALLAS_TRAFICO` | Informacion oficial de cortes de trafico durante Fallas. | GENERIC / PUBLIC_TRANSPORT | https://www.valencia.es/cas/actualidad/-/content/tr%C3%A0fico-fallas-val%C3%A8ncia | 2026-05-10 | `trafico-retencion` |
| `BICI_ITINERARIOS` | Red de itinerarios ciclistas de la Agencia Municipal de la Bicicleta. | CYCLIST | https://www.valencia.es/agenciabici/es/red-de-itinerarios-ciclistas | 2026-05-10 | `bici-ocupacion` |
| `CITA_PREVIA` | Cita previa para atencion municipal presencial. | GENERIC | https://www.valencia.es/cas/tramites/cita-previa | 2026-05-10 | `ocupacion-generica` |
| `SEDE_ELECTRONICA` | Punto de entrada general para tramites municipales. | GENERIC | https://sede.valencia.es/sede/ | 2026-05-10 | Referencia documental |

## Evidencia funcional

- `COMERCIO_INVERSIONES`: la Sede indica ayudas para modernizar, digitalizar y mejorar el comercio local.
- `CARGA_DESCARGA_COMERCIAL`: la Sede permite solicitar reservas de carga y descarga para vehiculos comerciales.
- `PMR_TARJETA`: la Sede permite solicitar tarjeta de estacionamiento PMR durante todo el ano.
- `ZBE_ORDENANZA`: la Sede publica el expediente normativo de la Zona de Bajas Emisiones.

## Mantenimiento

- Revisar HTTP 200 y destino final 7 dias antes de presentar la solicitud.
- Si una URL cambia, actualizar este catalogo, los YAML afectados y regenerar `exports/mitigation_actions.csv`.
