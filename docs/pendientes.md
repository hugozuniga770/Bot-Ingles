# Pendientes

Se trabajan **de a uno**, en este orden, y cada uno se valida en ED real antes del siguiente.

## 1. DnD en tests (prioridad actual)

**Hay DOS familias de DnD en los tests:**
- ✅ `.dndZone/.dnditem/.dndBank` — TextToPic ("Match the words to the pictures") y cloze ("Choose the correct words to complete the e-mail"), confirmado en Lesson 1 · Step 5. Cosecha arreglada en v20.2 (esperar pestaña activa) y replay con scroll en cajas.
- ✅ v20.4 Ordenar (`prSeq`, `.sequenceZone`, sin banco): reordenar con `placeSequence`; vista correcta = `.seeAnswerMode`.
- ✅ v20.3 Clasificación True/False (`prCl`, columnas con `.containerHeader`, sin `.dndBank`, usa dragula) — el banco se identifica por no tener encabezado (era H2 + H3).
- ⬜ Falta confirmar que el arrastre físico funciona en la clasificación: `__ed.dragTest()` en esa pantalla.
- ✅ v20.5 `.droptarget/.draggable` (DnD viejo, no-Angular): `exercises/droptarget.js`. ⬜ Falta ver en ED real cómo se ve en "Correct Answer" (se lee ficha dentro / texto / atributo `ans`) y si el arrastre simulado entra (`__ed.dragTest()`).

**Causa encontrada (dump del 29/10/2026, Lesson 4 · Step 3: Prueba · 5/10):** en los tests el DnD **no usa** `.dndZone` / `.dnditem` (eso es de las prácticas). Usa `.droptarget` (los huecos, 2 en esa pregunta), `.draggable` (las fichas, 5) y `.draggableContainer` (5). **Ninguna versión, de v17 a v19.8, buscó esas clases**, así que el bot no lo detecta: no lo cosecha en el review ni lo coloca en el replay. La instrucción es "Drag the correct answer/s into place." (no contiene "Drag Here").

**Falta para arreglarlo:** correr `probes/test-dump.js` en (1) la pregunta DnD del test y (2) esa pregunta en el Review con "Correct Answer" activa. Con eso se escribe `exercises/dnd-test.js` (solver nuevo, sin tocar el DnD de práctica) y su lectura en el review.

**Hipótesis viejas** (siguen valiendo para el DnD de *práctica* si fallara): ver historial de este archivo.

## 1b. Pestaña "Correct Answer" y flechita "<"

- La pestaña: `probes/test-dump.js` en el review → sección `tabs` (el outerHTML real).
- ✅ Pestaña CONFIRMADA: `<li class="active"><a>Respuesta correcta</a></li>` dentro de `div.testResultBtnsW` (hay una copia oculta en `.testResultTools` offscreen; el bot ignora la oculta).
- ✅ La flechita `<` CONFIRMADA (dump 29/10): `a.tasksBtprev.learning__pnItemLink.learning__prevItemLink`, tooltip "Volver". El botón Revisión es `a.learning__pnItemLink.learning__testReviewLink`. Están en `.learning__practiceToolsOW`.
- ⬜ Falta saber adónde lleva `<` desde la pantalla del puntaje (¿Start Test?). Si es así, `retakeIfScore()` debería pulsarla cuando no hay botón Retake.
- ⬜ Sospecha: en los tests TODOS los tipos de pregunta podrían usar componentes distintos a los de práctica (en el replay, 2/10–4/10 no se rellenaron). `probes/test-dump.js` v2 lo revela (sección `pregunta`).

## 1c. Por confirmar en ED real (v20.7)
- ⬜ Desplegable viejo (`.fillInBlank .questionText`): estructura supuesta → `probes/dropdown-dump.js` en esa pregunta, y `probes/test-dump.js` en su review con "Correct Answer".
- ⬜ MCQ viejo en tests: `probes/test-dump.js` en su review con "Correct Answer".
- ⬜ Test exprés: ¿ED deja saltar con los numeritos a la última pregunta?
- ⬜ Prácticas con UNA acción: ¿ED marca la tarea como hecha tras una acción en todos los tipos?

## 2. Funciones de versiones anteriores que la v19.7 perdió

**Grupo 2 (siguiente):** verificar tarea + reintentar + saltar a pendiente, detección de atasco, fin de unidad, modos, `requiredWords`. Todos cambian el bucle `auto()`, por eso van juntos y aparte.

El código de referencia está en `legacy/`. Se porta **una por cambio**, adaptándola a la arquitectura actual. No se copia una versión vieja entera.

| Función | Para qué servía | Dónde está |
|---|---|---|
| ✅ v20.1 `gotoNextIncomplete` / `gotoLesson` / `gotoStep` / `gotoTask` | Navegar por los desplegables (hoy: consola + volver al test; el bucle auto aún no salta solo) | v17 – v17.4 |
| `firstPendingTask` | Saltar directo a la tarea sin hacer | v17 – v17.4 |
| Verificar tarea + reintentar (`attempts` / `unsolved`) | No avanzar si ED no marcó la tarea como hecha | v17 – v17.4 |
| Detección de atasco (misma pantalla ≥ 4 veces) | Evitar bucles | v17 – v17.4 |
| Fin de unidad ("No queda nada pendiente") | Detenerse al terminar | v17, v17.3, v17.4 |
| Modos auto / skip / harvest (`setMode`) | Solo cosechar, saltar tests, etc. | v17 – v17.4 |
| ✅ v20.1 `reopenTest` por desplegables | Volver al test sin la flechita atrás | v17, v17.1 |
| ✅ v20.1 Botón Retake (`RE_RETAKE`) | Reintentar el test desde la pantalla de puntaje | v17 – v17.4 |
| ✅ v20.1 Popup "Reminder" → Continue (`utils__cancelLInk`) | Cerrar ese popup con el botón correcto | v17 – v17.4 |
| ✅ v20.1 Regex del popup en español ("no ha respondido") | La v19.7 dice "no ha responder" y no coincide | v17 – v17.4 |
| ✅ v20.1 `questionOf` con `compareDocumentPosition` | Encontrar el texto de la pregunta MCQ cuando está fuera del set | v17 – v17.4 |
| `requiredWords` (mínimo de palabras en Writing) | Writing que exige N palabras (**zona congelada**: solo con permiso) | v17 – v17.4 |
| ✅ v20.1 `export` / `import` / `copyAnswers` | Respaldar las respuestas cosechadas | v17 |
| ✅ v20.1 Atajo Alt+E y `sweep()` | Arrancar/parar con teclado; barrido de la lección | v17 – v17.4 |

## 3. Detalles conocidos sin arreglar

- El primer intento de un test se envía en blanco (por diseño).
- `CFG.maxTaskAttempts` no se usa.
- `solveWriting` añade un punto de más al final (`growth..`); es inofensivo y la zona está congelada.
