# RULES FOR AGENTS — Reglas de trabajo obligatorias

> **Leer antes de tocar NADA en este repositorio.**
> Estas reglas están derivadas de errores reales detectados en sesiones anteriores. Cada una existe porque alguien la rompió y costó tiempo arreglarlo.
> Si una regla aquí entra en conflicto con una instrucción del usuario, **detente y pregunta**.
> Última actualización: 2026-05-10.

---

## 0. Orden de lectura obligatorio al empezar cualquier sesión
1. Este archivo (`docs/RULES-FOR-AGENTS.md`).
2. `docs/STATUS.md` — estado real del proyecto.
3. `docs/DECISIONS.md` — ADRs firmados (no se reabren sin ADR nuevo).
4. `docs/AGENTS.md` — qué pasó en las últimas sesiones.
5. `docs/TODO.md` — tareas priorizadas con dependencias.
6. `NEXT_STEPS.md` — plan operativo fase a fase con código pegable.
7. `ARCHITECTURE.md` — verdad sobre el layout y el stack.

---

## 1. Reglas de ejecución de tareas

### 1.1 No marcar una tarea como completada sin verificación ejecutable
- "Hecho" = **tests verdes** + **arranca sin errores** + **estructura coincide con `ARCHITECTURE.md § Estructura canónica`**.
- Si la tarea es de reorganización, verificar con `docker compose up -d --build` que el backend arranca. No basta con `git mv`.
- Si la tarea toca modelos o schemas, verificar con `pytest -q` que los tests (actualizados) pasan.
- Si la tarea toca ingesta, verificar con `python -m src.scripts.run_ingest` (cuando exista) que se inserta al menos una fila.

### 1.2 Toda tarea cierra con los 4 docs actualizados
En el mismo commit:
- `docs/STATUS.md` — salud global + próximas acciones.
- `docs/AGENTS.md` — nueva entrada de sesión con lo hecho, supuestos, preguntas abiertas.
- `docs/TODO.md` — tarea marcada ✅ con fecha; tareas nuevas registradas.
- `CHANGELOG.md` — entrada bajo `[Unreleased]`.

Si tomas una decisión no trivial: añadir ADR nuevo en `docs/DECISIONS.md`.

### 1.3 No inventar mejoras fuera del alcance de la tarea
Si al ejecutar una tarea descubres un problema adyacente:
- **Documéntalo en `docs/TODO.md`** como tarea nueva (P1/P2/P3 según corresponda).
- **No lo arregles en el mismo commit** salvo que sea un blocker del criterio de aceptación de tu tarea.
- El orden importa: lo que arreglas fuera de alcance te hará fallar la revisión.

---

## 2. Reglas de reorganización de archivos

### 2.1 Después de cualquier `git mv` de directorios, verifica la estructura final
- Comparar el árbol resultante con `ARCHITECTURE.md § Estructura canónica del repositorio` línea por línea.
- Si descubres una divergencia: no ignorarla, corregirla antes de cerrar la tarea.

### 2.2 Nunca crear un subdirectorio con el mismo nombre que el padre
**Error real detectado el 2026-05-09:**
```
src/backend/app/ingestion/ingestion/   ← esto NO debe existir
```
Si al mover archivos acabas con `foo/foo/`, has ejecutado mal el comando. Aplanar antes de continuar.

### 2.3 Después de mover, borra el origen
- `git mv` sobre un directorio puede dejar el original como "vacío pero presente" según cómo se invoque. Tras mover, verifica que el directorio origen **no existe** con `ls`.
- **Error real detectado:** `backend/` sigue existiendo en raíz tras haber movido su contenido a `src/backend/`. Hay que borrarlo.

### 2.4 Limpia artefactos de build antes de commitear
- `__pycache__/`, `.pytest_cache/`, `.mypy_cache/`, `node_modules/` nunca deben aparecer en un diff de reorganización.
- Estrategia: `git clean -fdxn` (dry-run) → revisar → `git clean -fdx` (aplicar) solo después de confirmar que no borras trabajo no commiteado.

### 2.5 Cuando duplicas un archivo de configuración, **borra el original**
**Error real detectado:** tras mover `.env.example` a raíz, el archivo antiguo `config/.env.example` se quedó allí con credenciales obsoletas (`[credential redacted]`, `REDIS_URL`) — contradice `T-02` y `T-05-bis` que se declararon cerradas.
Regla: un único archivo por rol. Si sobran copias, borrarlas en la misma tarea.

---

## 3. Reglas de estructura canónica

### 3.1 `src/backend/` no lleva `app/` intermedio
Según `ARCHITECTURE.md`:
```
src/backend/
├── api/
├── core/
├── engine/
├── ingestion/
├── models/
├── schemas/
└── main.py
```
**No:**
```
src/backend/
└── app/
    ├── api/
    ├── core/
    ...
```
Si ves `src/backend/app/` en el repo, es un error a aplanar.

### 3.2 `docker-compose.yml` vive en `infra/`, no en raíz
Según `ARCHITECTURE.md § Estructura canónica`. Misma regla para `provision.sh`, `deploy.md`, `nginx/`, `cloudflare/`, `systemd/`.

### 3.3 `requirements.txt` y `Dockerfile.backend` viven en `config/`
Y el Dockerfile debe copiar desde rutas consistentes con el layout canónico.

---

## 4. Reglas de modelos y datos

### 4.1 Las columnas `geometry` no deben fijar un subtipo rígido si la fuente es heterogénea
**Error real detectado:** `UrbanEvent.geometry` declarado como `Geometry(geometry_type="POLYGON")`, pero los datasets reales traen LINESTRING (tramos de tráfico) y MULTIPOLYGON (ocupaciones grandes). Todo INSERT de geometría distinta de Polygon rompe.
Regla: usar `Geometry(geometry_type="GEOMETRY", srid=4326)` en la columna o separar por tabla. Si dudas, `"GEOMETRY"`.

### 4.2 Naming consistente
Los enums y tipos deben ir en un único idioma (el del código: inglés o castellano). **Error real detectado:** `UrbanEventType.APARCAMENT` (valenciano truncado) conviviendo con `OCUPACION`, `TRAFICO` (castellano). Normalizar.

### 4.3 Buffer geoespacial siempre en CRS proyectado
Nunca `buffer(distance_en_metros)` sobre una geometría WGS84 (EPSG:4326). Reproyectar siempre a EPSG:32630 (UTM 30N para Valencia), hacer buffer, reproyectar de vuelta. Ya cubierto en T-07.

### 4.4 `extra_data` (no `metadata`) para el JSON libre
Por conflicto con `DeclarativeBase.metadata`. Ya no repetir el error de sesiones previas.

### 4.5 Cada dataset declara su destino antes de entrar al pipeline
Error real detectado el 2026-05-10: `aparcaments_pmr` se ingirió como `UrbanEventType.APARCAMIENTO`, lo que contaminó `urban_events` con 2000 plazas PMR. Eso contradice `ARCHITECTURE.md`: aparcamientos, estaciones, paradas y cualquier alternativa deben vivir en `points_of_interest`.

Regla:
- Todo dataset en `scraper_opendata.py` debe declarar `record_kind`.
- `record_kind="event"` → `urban_events` + `impact_zones`.
- `record_kind="poi"` → `points_of_interest`, sin `impact_zones`.
- Antes de cerrar una tarea de ingesta, ejecutar una query de conteo por tabla y tipo. Ejemplo: `urban_events` no debe contener `APARCAMIENTO` si ese dato procede de aparcamientos PMR.
- Cualquier dataset nuevo requiere test que pruebe su destino (`event` o `poi`) antes de escribir lógica de almacenamiento.

---

## 5. Reglas de seguridad

### 5.1 Nunca literales de credenciales en ningún archivo trackeado
Incluye `docker-compose.yml`, `Dockerfile`, scripts, docs. Siempre `${VARIABLE}` con valor en `.env` no trackeado.

### 5.2 `.env` nunca se commitea. `.env.example` siempre sí, con placeholders sin valor real
Verificar con `git ls-files | grep -E '\.env$'` — debe devolver vacío.

### 5.3 Rate limiting obligatorio en todos los endpoints públicos
Default recomendado: 60 req/min/IP en lectura, 10 req/min/IP en escritura, 30 req/min/IP en feedback.

### 5.4 Endpoints de escritura protegidos con `require_admin_token`
Sin excepciones para "endpoints internos" ni "de prueba".

---

## 6. Reglas de tests y CI

### 6.1 Si tocas el modelo de datos, los tests existentes **deben** actualizarse en el mismo commit
**Error real detectado:** el enum `UrbanEventType` pasó de `OBRA/EVENTO/CLIMA/TRAFICO/TRANSPORTE` a `OCUPACION/TRAFICO/ZBE/EVENTO_FALLAS/APARCAMENT/OTRO`, pero `tests/backend/test_ingestion.py` sigue usando `"type": "OBRA"` y `"type": "EVENTO"`. CI va a fallar.

### 6.2 Si tocas imports / nombres de clase, hacer grep global antes de cerrar la tarea
**Error real detectado:** se renombró `OpenDataScraper` a `ArcGiSCRaper`, pero `ingestor.py` sigue importando `OpenDataScraper`. Regla: `grep -r "OpenDataScraper" .` antes de cerrar la tarea.

### 6.3 CI no es opcional
Si `ruff check`, `mypy`, `pytest`, `pip-audit` fallan en el último commit, la sesión no está cerrada. Tu trabajo incluye dejar CI en verde.

---

## 7. Reglas de ADR y decisiones

### 7.1 No revertir ADRs firmados sin ADR nuevo
Si crees que ADR-001/002/003/004 son equivocados, proponlo como ADR-N+1 con `supersedes: ADR-X`. **No cambies código asumiendo la decisión sin pasarlo por ese proceso.**

### 7.2 Cada ADR incluye: Context / Options / Decision / Consequences / Revisit
No cumplir esta estructura es motivo de rechazo del ADR.

---

## 8. Qué hacer cuando cometas un error

1. **No lo ocultes.** Regístralo en `docs/AGENTS.md` en la sesión actual bajo "Desviaciones detectadas".
2. **Ábre una tarea correctiva** en `docs/TODO.md` con un ID nuevo (p.ej. T-100, T-101...).
3. **Si rompe algo en producción o bloquea otra tarea**, marca la tarea correctiva como P1.
4. **Explica en `CHANGELOG.md`** bajo `Fixed`.
5. **Actualiza este archivo** si el error viene de una regla que faltaba documentar.

---

## 9. Protocolo de cierre de sesión (checklist)

Antes de decir "tarea completada":
- [ ] Tests verdes localmente (`pytest -q`).
- [ ] Backend arranca sin errores (`docker compose -f infra/docker-compose.yml up -d --build` → logs limpios de `api`). **Si no se puede verificar por entorno, ver § 11.**
- [ ] Estructura del repo coincide con `ARCHITECTURE.md § Estructura canónica` (o hay una tarea correctiva abierta).
- [ ] Sin archivos duplicados de configuración (`.env.example`, `requirements.txt`, etc.).
- [ ] Sin `__pycache__`, `.pytest_cache` en el diff.
- [ ] `git ls-files | grep -E '\.env$'` vacío.
- [ ] `grep -r "[credential redacted]"` vacío (y cualquier otra credencial antigua).
- [ ] `grep -r "OpenDataScraper"` vacío si se renombró a `ArcGiSCRaper` (excepto docstrings históricas).
- [ ] CI verde. **Si no se puede verificar por entorno, ver § 11.**
- [ ] `docs/STATUS.md`, `docs/AGENTS.md`, `docs/TODO.md`, `CHANGELOG.md` actualizados en el mismo commit que el código.

Si cualquier punto del checklist falla por razones técnicas (no por desalineación con el plan), **documentar explícitamente como ⚠️ "pendiente de verificación en entorno funcional"**, abrir tarea correctiva P1 y continuar. Nunca silenciar.

---

## 10. Entorno de trabajo (asumido por defecto)

Estos son los valores por defecto del equipo. Cualquier desviación se documenta al inicio de la sesión en `docs/AGENTS.md`.

| Elemento | Valor por defecto |
|---|---|
| CLI del agente ejecutor | Opencode CLI |
| Modelo del agente ejecutor | Qwen 3.6 (u otro especificado) |
| CLI del orquestador / auditoría | Variable (puede ser distinto por sesión) |
| Sistema operativo local | Windows 10/11 |
| Shell disponible | PowerShell (por defecto) y/o cmd.exe |
| Python local | ≥ 3.11 |
| Docker | Docker Desktop en Windows (puede estar en modo WSL2) |
| Editor | libre — el repo no fija nada |

**Implicaciones prácticas:**
- **File locks de Windows** son comunes. Directorios con procesos abiertos (IDE indexando, `docker` corriendo, `pytest` en background) pueden bloquear `rm -rf`. Workaround documentado en § 11.
- **Comandos shell** en los snippets de los MD son genéricos (`ls`, `rm -rf`) pero deben ejecutarse con el equivalente PowerShell cuando aplique (`Remove-Item -Recurse -Force`).
- **Docker en Windows** puede requerir WSL2 backend; algunos fallos de red efímeros son del entorno, no del código.
- **Final-of-line (LF vs CRLF)** debe gestionarse con `.gitattributes`; hoy el repo no tiene `.gitattributes` — si aparecen diffs ruidosos, añadir uno con `* text=auto eol=lf`.
- **Rutas largas de Windows** (`\\?\` prefix) son normales en este entorno. No son errores.

---

## 11. Reglas para verificaciones bloqueadas por entorno

Situación real: a veces el agente no puede ejecutar un paso del go/no-go (Docker no disponible, red bloqueada, BD no levantada, CI no accesible). **No ignorar nunca.** Protocolo:

### 11.1 Clasificar la verificación
- **Estructural** (estática): `grep`, `ls`, `find`, inspección de archivos, lint. Casi siempre ejecutable.
- **Funcional** (dinámica): `docker compose up`, `pytest`, `curl`, CI remoto. Puede estar bloqueada.

**Regla:** la sesión puede declarar ✅ la parte estructural y marcar la parte funcional como `⚠️ pendiente validación en entorno funcional` con su criterio textual. **Nunca declarar ✅ de algo no ejecutado.**

### 11.2 Documentación obligatoria
En `docs/STATUS.md` debe existir una tabla **"Pendiente de validación end-to-end"** con las columnas: *Item · Estado · Motivo · Cómo ejecutarlo en entorno funcional*.

Ejemplo mínimo:
```markdown
| Item | Estado | Motivo |
|---|---|---|
| `docker compose up -d --build` limpio | ⚠️ | Red Docker bloqueada en entorno de auditoría |
| `curl http://localhost:8000/health` → 200 | ⚠️ | Depende de Docker |
| `python -m scripts.run_ingest` con stored > 0 | ⚠️ | Depende de Docker + BD |
```

### 11.3 Windows file locks
Cuando un `rm -rf <dir>` falla por file lock:
1. **No declarar eliminado el directorio** si realmente sigue existiendo.
2. Documentar el lock en `docs/AGENTS.md` de la sesión con la causa probable (IDE indexando, `docker` corriendo, `pytest` en background).
3. Registrar el comando de workaround que debe ejecutarse en shell limpio: `Remove-Item -Recurse -Force <dir>` (PowerShell) o `rmdir /s /q <dir>` (cmd.exe) tras cerrar todos los procesos.
4. Si el directorio está vacío y solo falta eliminarlo, marcar la tarea como `⚠️ residual — no bloqueante` y abrir tarea menor separada (P3) para su limpieza.
5. **No bloquear el avance de la sesión por un directorio vacío.** Pero sí registrarlo.

### 11.4 Transferencia de la responsabilidad
Cuando una verificación queda `⚠️ pendiente`, la siguiente sesión es responsable de ejecutarla como **primer paso** antes de cualquier otra tarea. Si no lo hace, el orquestador/auditoría escalará al usuario.

### 11.5 Nunca repetir el patrón de la sesión 3
El error canónico: declarar 14/14 completadas sin haber corrido el go/no-go de cada una. Si **algún** go/no-go no se pudo ejecutar, la tarea es ⚠️ no ✅.
