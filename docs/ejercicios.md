# Tipos de ejercicio — estado y cómo probarlos

**Cómo probar un tipo:** carga el bot, ve a una pantalla de ese tipo **sin resolver** y escribe `__ed.solve()`. El bot la resuelve sin pulsar Next. Mira si quedó bien y, si falla, pásale a Claude la salida de `__ed.inspect()`.

Marca el estado aquí cada vez que lo valides (✅ funciona · ⚠️ falla · ⬜ sin probar en v20).

| Tipo (`kind`) | Archivo | Se detecta por | Función | Estado |
|---|---|---|---|---|
| `writing` | `exercises/writing.js` | `iframe[id^="mce_"]` | `solveWriting` | ✅ (congelado) |
| `select_text` | `exercises/select-text.js` | `span.st.learning__selectTxt_st` | `solveSelectText` | ⬜ |
| `sequence` | `exercises/sequence.js` | `.prSeq__container` | `solveSequence` | ⬜ (en 19.6 fallaba por el orden de detección; 19.7 lo cambió) |
| `open_speech` | `exercises/speaking.js` | `.openSpeech__AnsW` | `solveOpenSpeech` | ⬜ |
| `interactive_speaking` | `exercises/speaking.js` | `a.chooseCaracterArrow` | `solveInteractive` | ⬜ |
| `sr_choice` | `exercises/speaking.js` | `.questionInstructionsSR` + `a.button.continue` | `solveSRChoice` | ⬜ |
| `dnd` (práctica) | `exercises/dnd.js` | `.dndZone` + `.dnditem` | `solveDragAndDrop` | ⬜ |
| `fitb` | `exercises/fitb.js` | `.DDLOptions__selected` | `solveFITB` | ⬜ |
| `mcq` | `exercises/mcq.js` | `label.prMCQ__answerLabel` | `solveMCQ` | ⬜ |
| `text` | `exercises/text.js` | `input[type=text]`, `textarea` | `solveText` | ⬜ |
| `droptarget` | `exercises/droptarget.js` | `span.droptarget` + `.wordBankTile` | `solveDropTarget` | ⬜ v20.6 |
| `mcq_legacy` | `exercises/mcq-legacy.js` | `.lessonMultipleAnswer` | `solveLegacyMCQ` | ⬜ v20.7 |
| `ddl_legacy` | `exercises/ddl-legacy.js` | `.fillInBlank .questionText` | `solveLegacyDDL` | ⚠️ v20.7 estructura supuesta |
| `memory` | `exercises/memory.js` | `.memoG__card` | `solveMemoryGame` | ⚠️ v20.8 supuesto |
| `media` | `exercises/media.js` | `.layout__mediaPlayPause` | `solveMedia` | ⬜ |

## Tests

| Parte | Dónde | Estado |
|---|---|---|
| Start / Score / entrada a Review | `tests/test-manager.js`, `core/engine.js` | ✅ (congelado) |
| Pestaña "Correct Answer" + cosecha MCQ | `TestManager.ensureCorrectAnswerTab`, `harvestReview` | ✅ |
| Cosecha FITB | `TestManager.readFitb` | ⬜ |
| Cosecha DnD (`.dndZone`: TextToPic, cloze) | `TestManager.readDnd` | ⬜ v20.2 (espera pestaña activa) |
| Cosecha DnD clasificación True/False (`prCl`) | `readDnd` + `testDndModel` | ⬜ v20.3 |
| DnD viejo (`.droptarget`): cosecha `drop` + replay | `DropTargetSolver.placeDropTargets` | ⬜ v20.5 |
| Replay MCQ / FITB | `TestManager.replayQuestion` | ⬜ |
| Ordenar en tests (`prSeq`): cosecha `seq` + replay | `SequenceSolver.placeSequence` | ⬜ v20.4 |
| Replay DnD | `DnDSolver.placeDndMapping` | ⚠️ ídem (falta `exercises/dnd-test.js`) |
| Volver al test tras el review | `TestManager.reopenAfterReview` | ⬜ v20.1 (`<` supuesto → desplegables → cabecera) |
| Test exprés (1.er intento → Submit) | `TestManager.expressSubmit` | ⬜ v20.7 |
| Detenerse si no llega a 100 % | `MainEngine.step` (rama del puntaje) | ⬜ v20.1 |
