// =====================================================================
//  TABLERO — qué hizo el bot en ESTA corrida: unidad por unidad, paso por paso, test por test (v21.13)
// ---------------------------------------------------------------------
//  Pedido de Hugo (02/11): "que se vaya viendo todo bonito, unidad por unidad, step por step y test por test, qué
//  funcionó y qué falló". Cada paso queda anotado: ok · falla (motivo + n.º de reporte, donde está el dump completo
//  tomado EN ESE MOMENTO) · saltado (ya falló en esta corrida, regla 4) · visto (sin tarea que verificar); los
//  tests con su puntaje. La nube (cloud/tablero.js) lo dibuja como tabla con checks en GitHub.
//  Se reinicia con cada corrida (Corrida.idActual()). Nunca rompe nada: todo va dentro de try.
//  DEPENDE DE: core/navigation.js, core/sweep.js, utils/corrida.js (en tiempo de ejecución)
//  EXPONE:     Tablero
// =====================================================================

const K_TABLERO = 'ed:tablero:v1';

class Tablero {
  static get() {
    let t = null; try { t = JSON.parse(localStorage.getItem(K_TABLERO) || 'null'); } catch (e) {}
    const id = Corrida.idActual();
    if (!t || t.corrida !== id) t = { corrida: id, pasos: {} };
    return t;
  }
  static lugar() {
    try {
      const leccion = NavigationManager.lessonLabel(), paso = NavigationManager.stepLabel();
      if (!leccion || !paso) return null;
      return { u: TestSweep.unitNum(), l: +lessonNum(leccion) || 0, p: +stepNum(paso) || 0, leccion, paso };
    } catch (e) { return null; }
  }
  // estado: 'ok' | 'falla' | 'saltado' | 'visto'.  extra: { tarea, kind, motivo, reporte }
  static anotar(estado, extra) {
    try {
      const L = this.lugar(); if (!L) return;
      const t = this.get(), k = L.u + '|' + L.l + '|' + L.p;
      const e = Object.assign(t.pasos[k] || { tareas: {} }, L);
      const tn = extra && extra.tarea != null && extra.tarea !== '' ? String(extra.tarea) : '-';
      const prev = e.tareas[tn];
      // "visto" no pisa nada; "saltado" no pisa una falla; un "ok" posterior sí pisa una falla (se resolvió)
      if (!(prev && (estado === 'visto' || (estado === 'saltado' && prev === 'falla')))) e.tareas[tn] = estado;
      if (estado === 'falla' && extra && extra.motivo) { e.motivo = extra.motivo; if (extra.reporte) e.reporte = extra.reporte; }
      if (extra && extra.kind) e.kind = extra.kind;
      e.hora = new Date().toISOString(); if (!e.desde) e.desde = e.hora;   // AJUSTADA v21.16: + desde (minutos por unidad)
      t.pasos[k] = e; t.ultimo = k;
      localStorage.setItem(K_TABLERO, JSON.stringify(t));
    } catch (e) {}
  }
  // dónde está el bot AHORA (cada paso del engine; en un test con el contador "5/10"). No cambia ningún estado.
  static aqui() {
    try {
      const L = this.lugar(); if (!L) return;
      const t = this.get(), c = (() => { try { return NavigationManager.counter(); } catch (e) { return null; } })();
      const a = Object.assign({}, L, { contador: (c && c.s) || '' });
      if (t.ahora && t.ahora.u === a.u && t.ahora.l === a.l && t.ahora.p === a.p && t.ahora.contador === a.contador) return;
      t.ahora = a; localStorage.setItem(K_TABLERO, JSON.stringify(t));
    } catch (e) {}
  }
  static test(pct) {
    try {
      const L = this.lugar(); if (!L) return;
      const t = this.get(), k = L.u + '|' + L.l + '|' + L.p;
      const e = Object.assign(t.pasos[k] || { tareas: {} }, L);
      e.test = pct; e.esTest = true; e.hora = new Date().toISOString();
      t.pasos[k] = e; t.ultimo = k;
      localStorage.setItem(K_TABLERO, JSON.stringify(t));
    } catch (e) {}
  }
}
