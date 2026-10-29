// =====================================================================
//  DESPLEGABLES — ir a una lección / step / tarea, y "ir a lo que falta"
// ---------------------------------------------------------------------
//  RECUPERADO de v17 (v20.1). Usa los dos menús de arriba:
//  "Lesson 4: …" (lecciones) y "Step 3: Prueba" (steps).
//  Lo usan: TestManager.reopenTest() (volver al test tras el review) y
//  los comandos de consola __ed.sweep() / gotoLesson() / gotoStep() / gotoTask().
//  OJO: el bucle auto() TODAVÍA no salta solo a lo pendiente (eso es el grupo 2).
//  DEPENDE DE: utils/dom.js, core/config.js, core/storage.js, core/navigation.js
//  EXPONE:     DropdownNav, lessonNum, stepNum
// =====================================================================

const lessonNum = l => (String(l).match(/(?:Lesson|Lecci[oó]n)\s*(\d+)/i) || [])[1] || null;
const stepNum = s => (String(s).match(/(?:Step|Paso)\s*(\d+)/i) || [])[1] || null;

class DropdownNav {
  // Las dos listas están siempre en el DOM → se filtra por contenedor
  static items(which) {
    const sel = which === 'lessons'
      ? '.learning__dropDownListW--lessons .learning__dropDownList_item'
      : '.learning__dropDownListW--steps .learning__dropDownList_item';
    return qa(sel).map(e => ({ el: e, t: txt(e), cur: /--current/.test(e.className) }));
  }

  static async open(which) {
    const d = q(which === 'lessons' ? '.learning__dropDownListTitleW--lessons' : '.learning__dropDownListTitleW--steps');
    if (!d) return null;
    click(d); await sleep(800);
    return d;
  }

  static async close(d) { if (d && d.closest('[class*="--open"], [class*="--active"]')) { click(d); await sleep(300); } }

  // PARA QUÉ: abre el desplegable de lecciones y entra a la lección número n.
  static async gotoLesson(n) {
    const d = await this.open('lessons'); if (!d) return false;
    const it = this.items('lessons').find(x => new RegExp('^' + n + '\\s*\\.').test(x.t));
    if (!it) { await this.close(d); return false; }
    click(it.el); await sleep(4500); await NavigationManager.handleModals();
    return true;
  }

  // PARA QUÉ: entra a un step por número (3), por regex o por etiqueta ("Step 3: Prueba").
  static async gotoStep(match) {
    const d = await this.open('steps'); if (!d) return false;
    const items = this.items('steps').filter(x => /^\d+\s*\./.test(x.t));
    let it = null;
    if (typeof match === 'number') it = items.find(x => new RegExp('^' + match + '\\s*\\.').test(x.t));
    else if (match instanceof RegExp) it = items.find(x => match.test(x.t));
    else { const n = stepNum(match); it = n ? items.find(x => new RegExp('^' + n + '\\s*\\.').test(x.t)) : null; }
    if (!it) { await this.close(d); return false; }
    click(it.el); await sleep(4000); await NavigationManager.handleModals();
    return true;
  }

  // PARA QUÉ: salta a la tarea n del navegador de tareas (los numeritos 1 2 3…).
  static async gotoTask(n) {
    const t = NavigationManager.tasks().find(x => x.n === n);
    if (!t) return false;
    click(q('a', t.el) || t.el);
    return !!(await waitFor(() => NavigationManager.curTask()?.n === n, 6000, 300));
  }

  static firstPendingTask() { return NavigationManager.tasks().find(t => !t.done) || null; }

  static stepItemName(t) {
    return t.replace(/^\d+\s*\.(\s*)/, '').replace(/\s*(Not Started|In Progress|Completed|No ha empezado|No iniciad[oa]|En progreso|En curso|Completad[oa]|Terminad[oa]|\d{1,3}\s*%)\s*$/i, '').trim();
  }

  // ¿Este step del desplegable está pendiente? (los tests con puntaje < 100 cuentan como pendientes)
  static stepPending(lessonLbl, itemText) {
    const n = (itemText.match(/^(\d+)/) || [])[1];
    const key = lessonLbl + '||Step ' + n + ': ' + this.stepItemName(itemText);
    if (RE_TEST_ITEM.test(itemText)) {
      const sc = StorageManager.getScores()[key];
      if (sc === 100) return false;
      if (sc != null && sc < 100) return true;
    }
    return !RE_ST_DONE.test(itemText);
  }

  // PARA QUÉ: va a lo primero pendiente: 1) otro step de esta lección, 2) otra lección de la unidad.
  // Devuelve 'task' | 'step' | 'lesson' | null (null = no queda nada).
  static async gotoNextIncomplete() {
    let d = await this.open('steps');
    if (d) {
      const items = this.items('steps').filter(x => /^\d+\s*\./.test(x.t));
      const it = items.find(x => this.stepPending(NavigationManager.lessonLabel(), x.t));
      if (it) {
        if (it.cur && NavigationManager.curTask()) {
          await this.close(d);
          const t = this.firstPendingTask();
          if (t) { await this.gotoTask(t.n); return 'task'; }
        } else { click(it.el); await sleep(4000); await NavigationManager.handleModals(); return 'step'; }
      } else await this.close(d);
    }
    d = await this.open('lessons');
    if (!d) return null;
    const ls = this.items('lessons').filter(x => /^\d+\s*\./.test(x.t));
    const target = ls.find(x => !x.cur && !RE_ST_DONE.test(x.t)) ||
      ls.find(x => !x.cur && Object.entries(StorageManager.getScores()).some(([k, v]) => v < 100 && lessonNum(k) === (x.t.match(/^(\d+)/) || [])[1]));
    if (!target) { await this.close(d); return null; }
    click(target.el); await sleep(4500); await NavigationManager.handleModals();
    d = await this.open('steps');
    if (d) {
      const it = this.items('steps').filter(x => /^\d+\s*\./.test(x.t)).find(x => this.stepPending(NavigationManager.lessonLabel(), x.t));
      if (it && !it.cur) { click(it.el); await sleep(4000); await NavigationManager.handleModals(); } else await this.close(d);
    }
    return 'lesson';
  }

  // DIAGNÓSTICO: qué texto tiene cada ítem de los desplegables (para confirmar cómo marca ED lo terminado)
  static dump() {
    const out = { lecciones: this.items('lessons').map(x => (x.cur ? '* ' : '  ') + x.t), steps: this.items('steps').map(x => (x.cur ? '* ' : '  ') + x.t) };
    console.log('%c[ED desplegables]', 'color:#3498db;font-weight:bold', out);
    return out;
  }
}
