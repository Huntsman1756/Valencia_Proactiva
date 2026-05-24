# Guía de contribución — V-PRO

> **Antes de abrir cualquier tarea, leer [`docs/RULES-FOR-AGENTS.md`](./docs/RULES-FOR-AGENTS.md)**. Son las reglas obligatorias de trabajo, derivadas de errores reales detectados en sesiones anteriores. Ignorarlas tiene consecuencias (tareas mal cerradas, ingesta rota, CI roja).

Gracias por tu interés en **Valencia Proactiva (V-PRO)**. El proyecto es abierto (código MIT, datos derivados CC-BY 4.0) y parte de la convocatoria AD.TR.15 del Ayuntamiento de València. Esta guía resume cómo colaborar.

## Principios de diseño
- **Action-Oriented.** Cada pieza de información debe empujar una acción concreta.
- **Geospatial-First.** Toda la lógica se modela con coordenadas y áreas de influencia.
- **Calm & Minimalist.** UX sin ruido, sin saturación visual, sin alertas innecesarias.
- **Zero-Fluff.** La información es concisa y útil.
- **Open by Default.** Código, metodología y datos derivados son públicos.
- **Lean Stack.** Ver `ARCHITECTURE.md`. No añadir dependencias sin justificación.

## Reglas no negociables
1. **Lenguaje inclusivo y no sexista** en toda documentación pública, UI y comunicación.
2. **Idioma de los materiales públicos:** castellano o valenciano (código en inglés).
3. **Nunca commitear secretos.** `.env` jamás trackeado. Rotar al instante si se detecta.
4. **No lógica de negocio en el frontend.** El cliente es hostil por defecto.
5. **Security fixes antes que features.** Toda 🔴 de seguridad es P1.
6. **Documentación en el mismo commit que el código.** Follow-up no ocurre.
7. **Commits Conventional Commits.** Ver § más abajo.
8. **Canonical stack fijado.** Cualquier desviación requiere ADR en `docs/DECISIONS.md`.

## Cómo levantar el entorno de desarrollo
```bash
git clone <repo>
cd valenciav3
cp backend/.env.example backend/.env   # (post-T-10: cp config/.env.example .env)
docker compose up -d --build
curl http://localhost:8000/health
# Swagger: http://localhost:8000/docs
```
Puertos host: Postgres/PostGIS `5434`, API `8000`.
(Nota: tras la ejecución de T-05-bis, el servicio `redis` y `worker` desaparecen.)

Correr los tests:
```bash
docker compose exec api pytest -q
```

## Flujo de trabajo

### 1. Empieza por el backlog
1. Abre `docs/TODO.md`. Elige una tarea P1 sin dependencias pendientes.
2. Si tiene dependencias, confirma en `docs/STATUS.md` que están cerradas.
3. Registra en `docs/AGENTS.md` que estás empezando (opcional para tareas cortas).

### 2. Trabaja en rama
```bash
git checkout -b feat/T-XX-descripcion-corta
```
Usa el ID de la tarea en el nombre de la rama.

### 3. Conventional Commits
```
feat(scope): <descripción> (T-XX)
fix(scope): <descripción> (T-XX)
docs(scope): <descripción>
refactor(scope): <descripción>
test(scope): <descripción>
chore(scope): <descripción>
security(scope): <descripción> (T-XX)
```
Ejemplos reales:
```
fix(ingestion): renombrar metadata a extra_data en ingestor y spatial api (T-03)
feat(engine): action template engine con reglas YAML (T-20)
security(infra): rotar POSTGRES_PASSWORD y mover a .env (T-02)
```

### 4. Cuando termines
- Verifica que los tests pasen: `pytest -q` y `ruff check`.
- Actualiza `docs/TODO.md` marcando la tarea ✅ con la fecha.
- Actualiza `docs/STATUS.md` si cambia el estado global.
- Actualiza `docs/AGENTS.md` con lo que hiciste, supuestos y preguntas abiertas.
- Si la tarea introduce una decisión no trivial, añade ADR a `docs/DECISIONS.md`.
- Actualiza `CHANGELOG.md` bajo `[Unreleased]`.
- Abre PR con referencia a la tarea y al ADR si aplica.

## Estructura del repositorio
Ver `ARCHITECTURE.md § Estructura canónica del repositorio`. **No** muevas archivos fuera de esa estructura sin discusión previa.

## Añadir un nuevo dataset
1. Verificar el slug real en el Portal de Datos Abiertos de Valencia (`https://opendata.vlci.valencia.es/`).
2. Añadir entrada en `src/backend/ingestion/scraper_opendata.py → DATASETS`.
3. Documentar la fuente en `docs/DATA_SOURCES.md` con URL, campos, frecuencia y limitaciones.
4. Escribir test en `tests/backend/test_ingestion.py` con fixture de ejemplo.

## Añadir una plantilla de acción (post-T-20)
1. Crear YAML en `src/backend/engine/templates/<nombre>.yaml` siguiendo el esquema.
2. Añadir test en `tests/backend/test_action_templates.py` por regla.
3. Documentar en `docs/METHODOLOGY.md § Motor de plantillas`.

## Seguridad
- Nunca abras issues públicos sobre vulnerabilidades. Contacta primero por email a la persona responsable.
- Si encuentras un secret leaked en git, avisa antes de hacer nada; hay que rotar y reescribir historia en coordinación.
- Para publicación pública, no reutilizar un repositorio privado con historial sensible. Crear un repositorio nuevo desde una copia auditada y seguir [`docs/concurso/publicacion-repositorio-publico.md`](./docs/concurso/publicacion-repositorio-publico.md).
- Corre `pip-audit` localmente antes de actualizar dependencias.

## Código de conducta
- Respeto mutuo y comunicación constructiva.
- Idioma preferente de las revisiones: español. Inglés en comentarios de código.
- Las contribuciones se evalúan por impacto real en el ciudadano, no por sofisticación técnica.

## Preguntas
Si algo no queda claro, abre una *issue* con etiqueta `question` antes de invertir tiempo. Una pregunta precisa ahorra dos días de implementación en la dirección equivocada.
