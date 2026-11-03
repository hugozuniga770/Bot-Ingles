// =====================================================================
//  CATÁLOGO POR NIVEL — lo que el bot sabe de CADA curso (High Intermediate 1/2, Intermediate 1/2, Advanced...)
// ---------------------------------------------------------------------
//  NUEVO v21.16. Hugo (03/11): "que el explorador explore todas las unidades de golpe y esa información se guarde
//  por nivel ... para que siempre se pueda acceder a eso, no importa si es en una o en la corrida siguiente; si es
//  nuevo el nivel, el explorador hace lo suyo".
//  Qué guarda (localStorage ed:catalogo:v1 = { "<curso>": { lugares, firmas } }):
//   • lugares: cada lección · paso · tarea del curso → tipo de ejercicio, firma de la pantalla, cómo se marcó
//     (el solver normal, o la acción del Explorador) o por qué falló (motivo + n.º de reporte).
//   • firmas: cada TIPO de pantalla distinta que apareció en el curso → tipo, cuántas veces, si se marcó, y UN
//     dump liviano de ejemplo (la primera vez que aparece) → así se conoce un nivel nuevo entero en una corrida.
//  En la nube viaja en el BANCO de ese curso (cloud/banco.js): todas las cuentas del mismo nivel lo comparten y
//  la corrida siguiente ya lo tiene. Y se usa: si en ESTE lugar lo que marcó la tarea fue una acción del Explorador,
//  la próxima vez se hace primero esa acción (sin perder tiempo con el solver que falló).
//  Modo "explorar" (nube: modo explorar · consola: __ed.explorarCurso()): recorre TODAS las unidades (también las
//  terminadas), cataloga cada pantalla y resuelve lo pendiente de práctica; NO empieza tests.
//  DEPENDE DE: core/navigation.js, core/sweep.js, core/explorador.js, utils/reporter.js (en tiempo de ejecución)
//  EXPONE:     Catalogo
// =====================================================================

const K_CATALOGO = 'ed:catalogo:v1';

class Catalogo {
  static todo() { try { return JSON.parse(localStorage.getItem(K_CATALOGO) || '{}') || {}; } catch (e) { return {}; } }
  static curso() { try { return TestSweep.curso() || ((TestSweep.get() || {}).widgets || {}).curso || 'curso ?'; } catch (e) { return 'curso ?'; } }
  static guardar(t) {
    for (let k = 0; k < 3; k++) {
      try { localStorage.setItem(K_CATALOGO, JSON.stringify(t)); return; } catch (e) {
        // sin lugar: se sueltan los dumps de ejemplo más viejos (lo demás es chico)
        const fs = Object.values(t).flatMap(c => Object.values(c.firmas || {})).filter(f => f.ejemplo).sort((a, b) => String(a.primera).localeCompare(String(b.primera)));
        fs.slice(0, Math.max(1, Math.ceil(fs.length / 3))).forEach(f => { delete f.ejemplo; });
      }
    }
  }
  static lugar(tn) {
    try { return ['U' + TestSweep.unitNum(), NavigationManager.lessonLabel(), NavigationManager.stepLabel(), tn != null ? 'T' + tn : '-'].join('|'); } catch (e) { return null; }
  }
  static del(curso) { const t = this.todo(); const c = t[curso] = t[curso] || { lugares: {}, firmas: {} }; c.lugares = c.lugares || {}; c.firmas = c.firmas || {}; return { t, c }; }

  // cada paso del engine: qué tipo de pantalla es (y su dump la primera vez que aparece en este curso)
  static ver(kind, tn) {
    try {
      if (!kind || kind === 'not_in_lesson') return;
      const curso = this.curso(), L = this.lugar(tn); if (!L) return;
      const firma = Explorador.firma(kind);
      const { t, c } = this.del(curso);
      const f = c.firmas[firma] = c.firmas[firma] || { kind, veces: 0, ok: 0, falla: 0, primera: new Date().toISOString(), donde: L };
      const lu = c.lugares[L] = c.lugares[L] || {};
      // idea 3 de Hugo — ¿ED CAMBIÓ esta pantalla? (en una corrida anterior aquí había OTRO tipo de pantalla) → aviso con dump
      const corr = Corrida.idActual();
      if (lu.firma && lu.firma !== firma && lu.corrida && lu.corrida !== corr && lu.kind !== 'mcq_default' && kind !== 'mcq_default' && lu.kind !== 'test_start' && kind !== 'test_start')
        Reporter.capture('ed_cambio_la_pantalla', { antes: lu.firma, ahora: firma });
      if (lu.firma !== firma) { f.veces++; lu.firma = firma; lu.kind = kind; }
      lu.corrida = corr;
      if (!f.ejemplo && CFG.catalogarDumps !== false) { try { f.ejemplo = Reporter.dumpCompleto(true); } catch (e) {} }
      this.guardar(t);
    } catch (e) {}
  }
  // al terminar una tarea: cómo se marcó (o por qué no)
  static resultado(tn, kind, res, marcada, ms) {
    try {
      const curso = this.curso(), L = this.lugar(tn); if (!L) return;
      const { t, c } = this.del(curso);
      const lu = c.lugares[L] = c.lugares[L] || {};
      const firma = lu.firma || Explorador.firma(kind);
      const f = c.firmas[firma] = c.firmas[firma] || { kind, veces: 1, ok: 0, falla: 0, primera: new Date().toISOString(), donde: L };
      lu.kind = kind; lu.estado = marcada ? 'ok' : 'falla'; lu.hora = new Date().toISOString(); lu.v = V;
      if (ms > 0) { f.ms = (f.ms || 0) + ms; f.nMs = (f.nMs || 0) + 1; }   // idea 25: tiempo por tipo de ejercicio
      const ex = res && res.explorador;
      if (marcada) {
        f.ok++;
        lu.como = ex && ex.marcado && ex.accion ? { tipo: 'explorador', accion: ex.accion, aprendido: (Explorador.aprendido()[ex.firma] || null) } : { tipo: 'solver', did: res && res.did, metodos: res && res.metodos, como: res && res.como };
        delete lu.motivo;
      } else { f.falla++; lu.motivo = (res && res.did) || 'sin marcar'; lu.fallas = [...new Set([...(lu.fallas || []), Corrida.idActual()])].slice(-5); }   // idea 19: ¿nuevo o ya conocido?
      this.guardar(t);
    } catch (e) {}
  }
  // ¿en este lugar lo que marcó la tarea fue una acción del Explorador? → se prueba primero
  static atajo(tn) {
    try { const lu = (this.todo()[this.curso()] || { lugares: {} }).lugares[this.lugar(tn)]; return lu && lu.estado === 'ok' && lu.como && lu.como.tipo === 'explorador' && lu.como.aprendido ? lu.como.aprendido : null; } catch (e) { return null; }
  }
  static async usarAtajo(tn, kind) {
    const a = this.atajo(tn); if (!a) return null;
    const c = Explorador.reencontrar(a); if (!c) return null;
    log('📚 [Catálogo] En este lugar lo que marcó la tarea fue:', a.desc, '→ lo hago primero');
    try { await Explorador.hacer(c); } catch (e) { return null; }
    const ok = !!(await waitFor(() => NavigationManager.taskDone(tn), 2500, 250));
    return { did: 'catalogo_atajo', accion: a.desc, marcado: ok };
  }
  // resumen corto (consola / registro)
  static resumen(curso = this.curso()) {
    const c = this.todo()[curso]; if (!c) return { curso, lugares: 0, firmas: 0 };
    const ls = Object.values(c.lugares || {});
    return { curso, lugares: ls.length, ok: ls.filter(l => l.estado === 'ok').length, fallan: ls.filter(l => l.estado === 'falla').length, tipos: Object.keys(c.firmas || {}).length,
      tiposQueFallan: Object.entries(c.firmas || {}).filter(([, f]) => f.falla && !f.ok).map(([k]) => k).slice(0, 15) };
  }
}
