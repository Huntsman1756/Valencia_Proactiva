# Guion recomendado — vídeo demo 90 segundos

Objetivo: explicar el problema y cerrar el bucle de acción, no hacer un tutorial.

## Estructura

**0-15 s · Problema**
Juan tiene una furgoneta de reparto. Hoy València tiene varias ocupaciones de vía pública, tráfico denso y restricciones. Juan no tiene tiempo de revisar portales de datos, PDFs ni noticias municipales.

**15-35 s · Apertura de VLC-PROACTIVA**
Abre VLC-PROACTIVA. La app ya muestra qué ocurre cerca, la zona de impacto y el perfil activo. Cambia a `Comercial`.

**35-55 s · Acción administrativa**
Selecciona una ocupación activa de `ocupacio-via-publica`. El panel derecho muestra alternativa, distancia y un enlace municipal real para comercios afectados o trámites relacionados. El mensaje clave: el dato abierto se convierte en una acción administrativa concreta.

**55-70 s · Alternativa y mapa**
El mapa muestra el buffer de impacto y alternativas fuera de la zona afectada: parking, EMT, Valenbisi o FGV según perfil.

**70-85 s · Feedback loop**
Juan pulsa feedback positivo. La demo muestra que ese voto se guarda de forma anónima y alimenta `feedback_aggregated.csv`.

**85-90 s · Cierre**
Frase final: “V-PRO no solo consume datos abiertos: produce nuevos datos abiertos derivados de la experiencia ciudadana real.”

## Regla de demo

No usar `talls-transit-falles` como Golden Path activo fuera de temporada. Si aparece, presentarlo explícitamente como histórico/fallback. El Golden Path principal debe usar un evento actual de `ocupacio-via-publica`.
