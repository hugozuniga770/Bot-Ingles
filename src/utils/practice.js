// =====================================================================
//  PRÁCTICAS — "con UNA acción basta"
// ---------------------------------------------------------------------
//  NUEVO v20.7. En las prácticas ED marca la tarea como hecha apenas haces UNA acción
//  (una ficha, un desplegable, una casilla...). practiceEnough(tn) se llama después de la
//  1.ª acción: si ED ya marcó la tarea (máx. 1,5 s) → el solver se detiene ahí.
//  Si NO la marcó → devuelve false y el solver sigue como antes (completa todo). Blindado.
//  Nunca se activa en tests (ahí cada respuesta cuenta).
//  Apagar: __ed.cfg({ practiceOneAction: false })
//  DEPENDE DE: core/config.js, core/navigation.js, tests/test-manager.js (en tiempo de ejecución)
//  EXPONE:     practiceEnough
// =====================================================================

async function practiceEnough(tn) {
  if (!CFG.practiceOneAction || !tn) return false;
  try { if (TestManager.inTest()) return false; } catch (e) { return false; }
  return !!(await waitFor(() => NavigationManager.taskDone(tn), 1500, 200));
}
