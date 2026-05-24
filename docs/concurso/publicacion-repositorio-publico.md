# Publicación segura del repositorio público

## Auditoría 2026-05-24

Repositorio revisado: `https://github.com/Huntsman1756/Valencia_Proactiva`.

- GitHub muestra el repositorio como **público**.
- La rama por defecto `main` está desactualizada frente al árbol local de producción: GitHub muestra 1 commit en la vista principal y todavía documenta una infraestructura anterior.
- Existe una rama pública `ralph/ingesta-fuentes-info` más avanzada, pero tampoco incluye los cambios locales no commiteados de la release final. Para la candidatura debe quedar una rama por defecto clara y actualizada.
- La revisión local y la revisión de la copia pública no han encontrado claves privadas, tokens reales, IP del VPS ni datos personales reales en los ficheros publicables inspeccionados.
- Los hallazgos de `password`, `token` o similares corresponden a placeholders de `.env.example`, tokens de test, variables de configuración o referencias históricas redactadas.
- El repositorio público no debe usarse como enlace final de candidatura hasta sincronizar una release local auditada y dejarla visible en la rama por defecto o en una release/tag enlazada explícitamente.

Estado recomendado: **publicable tras sincronización**, con exclusión explícita de datos personales, documentos administrativos, `.env`, claves, IP/ID del VPS, historiales privados y artefactos internos innecesarios.

## Decisión recomendada

No hacer público el repositorio privado de trabajo si en cualquier momento ha contenido secretos, credenciales, tokens, dumps, `.env` reales o configuraciones privadas en su historial. Aunque el archivo se borre en el último commit, Git conserva el contenido en commits anteriores y puede quedar accesible al publicar el repositorio.

La opción segura para la candidatura AD.TR.15 es crear un repositorio público nuevo, con historial limpio, a partir de una exportación auditada del estado publicable del proyecto.

## Procedimiento

1. Rotar cualquier secreto que haya estado en GitHub, aunque el repositorio sea privado: `ADMIN_TOKEN`, contraseñas de Postgres, tokens de Cloudflare, claves de API, credenciales SSH, claves de despliegue y cualquier variable real de `.env`.
2. Preparar una copia limpia del proyecto sin `.env`, dumps locales, carpetas de agentes, caches, claves, logs ni configuraciones privadas.
3. Mantener únicamente archivos publicables: código fuente, documentación, tests, `exports/` derivados sin datos personales, `.env.example` con placeholders, licencia y guía de contribución.
4. Crear un repositorio público nuevo con un primer commit limpio.
5. Mantener el repositorio privado actual como histórico interno, no como origen público.
6. Antes de publicar, ejecutar una revisión de secretos sobre el árbol final y revisar manualmente `README.md`, `docs/`, `config/`, `infra/` y cualquier archivo de despliegue.

## Archivos que no deben publicarse

- `.env`, `.env.*` salvo `.env.example`.
- Tokens de Cloudflare, GitHub, VPS, Tailscale o servicios externos.
- Claves SSH o certificados.
- Dumps de base de datos.
- Backups locales.
- Logs con cabeceras HTTP, IPs o tokens.
- Carpetas locales de agentes o herramientas (`.agents/`, `.claude/`, `.cline/`, `.kiro/`, `.superpowers/`).
- Configuraciones de despliegue con dominios internos, IPs privadas o rutas administrativas no documentadas para publicación.
- Solicitudes, declaraciones responsables, certificados fiscales, justificantes de identidad o cualquier documento administrativo con datos personales.
- Registros internos de agentes, historiales de sesión o informes antiguos que no aporten evidencia al jurado y puedan generar ruido sobre secretos ya redactados.

## Checklist final antes de enlazar en la solicitud

- [ ] `README.md` muestra demo, repo público, licencia, datos derivados y convocatoria AD.TR.15.
- [ ] `docs/MEMORIA.md` y `docs/concurso/checklist-candidatura-adtr15.md` están actualizados con la producción real.
- [ ] `rg` no encuentra IP del VPS, ID de proveedor, claves SSH, tokens reales ni `.env` reales.
- [ ] Los exports publicados no contienen `session_token`, IPs ni identificadores personales.
- [ ] El repo público contiene solo código, tests, documentación, configuración reproducible, `.env.example` con placeholders y exports derivados publicables.
- [ ] El enlace de GitHub usado en la Sede Electrónica apunta a la release final sincronizada.

## Nota para la memoria

La transparencia del proyecto se mantiene publicando código, metodología y datos derivados reproducibles. La seguridad se mantiene separando el repositorio interno de trabajo del repositorio público de candidatura. Esta separación no reduce la apertura: evita publicar accidentalmente credenciales o historial operativo que no forma parte del valor público del proyecto.
