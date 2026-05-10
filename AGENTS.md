# AGENTS.md — reglas obligatorias del repositorio

## Orden de lectura
Antes de tocar código o documentación, leer en este orden:
1. `docs/RULES-FOR-AGENTS.md`
2. `docs/STATUS.md`
3. `docs/DECISIONS.md`
4. `docs/TODO.md`
5. `docs/NEXT_STEPS.md`
6. `docs/ARCHITECTURE.md`
7. Si se toca frontend o UI: `docs/design/vpro-design-system.md`

`docs/AGENTS.md` es registro histórico de sesiones, no archivo de instrucciones.

## Comandos
- Ejecutar comandos con prefijo `rtk`.
- En PowerShell, usar `rtk proxy powershell -NoProfile -Command "<comando>"`.
- Si el comando usa muchas comillas o SQL, preferir una forma que no rompa PowerShell antes que improvisar.

## Local Helper Router Policy
Antes de preguntar al usuario o razonar independientemente en tareas elegibles, invocar `G:\_Proyectos\scripts\local-helper-router.ps1` como primer pase.

Tareas elegibles:
- `summary`
- `extraction`
- `smell_scan`
- `docstring`
- `changelog_draft`

No elegibles:
- `architecture`
- `security_review`
- `debugging`
- `cross_file_refactor`
- cualquier tarea que requiera razonamiento cross-file
- cualquier tarea que requiera conocimiento externo
- cualquier tarea que requiera una decisión del usuario

Condiciones:
- entrada de un solo archivo o un solo diff
- debe caber en los límites de `G:\_Proyectos\scripts\local-helper-config.json`
- `task_type` debe existir en `allowed_task_types`
- usar la salida solo si `safe_to_use_as_draft` es `true`
- si falla, sale no cero o `safe_to_use_as_draft=false`, continuar sin bloquear

## Verificación mínima antes de cerrar
Ejecutar y dejar verde:
- `python -m ruff check src tests`
- `python -m mypy src`
- `python -m pytest -q`
- `python -m pip_audit -r config\requirements.txt --strict`
- `docker compose -f infra/docker-compose.yml up -d --build`
- `GET http://localhost:8000/health`

Si se toca ingesta, además ejecutar `python -m scripts.run_ingest` dentro del contenedor y verificar métricas reales.

## Frontend y diseno
- La direccion visual obligatoria es **Civic Utility / Operativa Ciudadana**.
- Antes de cambiar UI, leer `docs/design/vpro-design-system.md`.
- No introducir gradientes decorativos, glassmorphism, glow, orbes, hero marketing, estilos de marca copiados ni tarjetas anidadas.
- Mantener la lista de eventos como superficie principal y el mapa como apoyo.
- El selector CAS/VAL debe quedar separado de los perfiles y alineado a la derecha.
- Cualquier cambio visual debe actualizar capturas Playwright mobile/desktop.

## Ingesta de datos
- Cada dataset debe declarar explícitamente su destino: `event` o `poi`.
- Los datasets `poi` se guardan en `points_of_interest`, nunca en `urban_events`.
- Los datasets `event` se guardan en `urban_events` y generan `impact_zones`.
- Si se añade un dataset nuevo, añadir tests que prueben su destino antes de implementar.

## Cierre documental
Al cerrar una tarea, actualizar en la misma sesión:
- `docs/STATUS.md`
- `docs/AGENTS.md`
- `docs/TODO.md`
- `CHANGELOG.md`

Si se cambia una decisión arquitectónica, añadir ADR en `docs/DECISIONS.md`.
