// =====================================================================
//  MODELO DnD PARA TESTS — quién es el "banco" y quiénes los huecos
// ---------------------------------------------------------------------
//  NUEVO v20.3. dndModel() (utils/drag.js, de v17) adivina el banco como "la zona con MÁS fichas".
//  En el Review con "Respuesta correcta" eso FALLA en la clasificación (True / False):
//  las fichas están repartidas en las columnas y el banco quedó vacío → el bot tomaba la
//  columna "True" como banco y no cosechaba nada (confirmado con dump, Lesson 2 · Step 5 · 5/6).
//  Regla nueva (sin .dndBank): las columnas de respuesta tienen encabezado (.containerHeader)
//  y el banco NO → si exactamente una zona no tiene encabezado, esa es el banco.
//  Si la regla no aplica, devuelve EXACTAMENTE lo mismo que dndModel().
//  Lo usan: TestManager.readDnd / answersShown, DnDSolver.placeDndMapping, __ed.dragTest().
//  NO lo usa el DnD de práctica (solveDragAndDrop sigue con dndModel).
//  DEPENDE DE: utils/dom.js, utils/drag.js
//  EXPONE:     testDndModel
// =====================================================================

function testDndModel() {
  const zones = qav('.dndZone');
  if (!zones.length) return null;
  if (qav('.dndBank').length) return dndModel();
  const header = z => { const c = z.closest('[class*="__container"]'); return !!(c && q('.containerHeader', c)); };
  const conTitulo = zones.filter(header);
  const sinTitulo = zones.filter(z => !header(z));
  if (conTitulo.length && sinTitulo.length === 1) {
    const bank = sinTitulo[0];
    return { bank, dests: zones.filter(z => z !== bank && !bank.contains(z) && !z.contains(bank)), byHeader: true };
  }
  return dndModel();
}
