// =====================================================================
//  DESPLEGABLES VIEJOS — "Select the correct answer from the drop-down list." (no-Angular)
// ---------------------------------------------------------------------
//  NUEVO v20.7. Visto en dump (Lesson 3: Present Simple: Review · Step 3: Test · 12/15):
//    .answersWrapper.fillInBlank.fitb con 4 huecos (.questionText, .arrowWrapper, .answered)
//    y NINGÚN .DDLOptions__selected → el solver de desplegables de siempre no lo veía.
//  ⚠ SIN CONFIRMAR: el dump no traía el HTML interno ni la lista que aparece al pulsar.
//    Por eso: se abre el hueco, se buscan los elementos que APARECEN (la lista) y se elige
//    por texto; tras cada elección se comprueba que el hueco quedó con ese texto.
//    Para confirmarlo: probes/dropdown-dump.js en esa pantalla.
//  DEPENDE DE: utils/dom.js, utils/practice.js
//  EXPONE:     LegacyDDLSolver (se une a PracticeSolver)
// =====================================================================

class LegacyDDLSolver {
  static isLegacyDDL() { return !qv('.DDLOptions__selected') && this.legacyBlanks().length > 0; }
  static legacyBlanks() { return qav('.fillInBlank .questionText, .answersWrapper.fitb .questionText'); }

  // Texto elegido en un hueco (sin la flechita ni los íconos ✓/✗)
  static legacyBlankValue(b) {
    const c = b.cloneNode(true);
    qa('.arrowWrapper, .vCheck, .xCheck, [class*="Check"], [class*="icon" i]', c).forEach(e => e.remove());
    return txt(c);
  }

  static optionCandidates() { return qa('li, [class*="option" i], [class*="Option"], [role="option"]').filter(vis); }

  // Abre el hueco y devuelve las opciones que aparecieron
  static async openLegacy(b) {
    const antes = new Set(this.optionCandidates());
    for (const el of [q('.arrowWrapper', b), b]) {
      if (!el) continue;
      click(el); await sleep(400);
      let nuevas = this.optionCandidates().filter(e => !antes.has(e) && txt(e) && !e.contains(b) && !b.contains(e));
      nuevas = nuevas.filter(e => !nuevas.some(o => o !== e && e.contains(o)));   // solo las hojas
      if (nuevas.length) return nuevas;
    }
    return [];
  }

  static async solveLegacyDDL(values = null) {
    log('🔽 [Desplegable viejo] Eligiendo opciones...');
    const tn = NavigationManager.curTask()?.n;
    const blanks = this.legacyBlanks();
    let n = 0, ok = 0;
    for (let i = 0; i < blanks.length; i++) {
      const b = this.legacyBlanks()[i]; if (!b) break;
      const want = values ? values[i] : null;
      if (values && !want) continue;
      if (!values && this.legacyBlankValue(b)) continue;
      if (want && norm(this.legacyBlankValue(b)) === norm(want)) { ok++; continue; }
      const opts = await this.openLegacy(b);
      if (!opts.length) { warn('Desplegable viejo: no apareció la lista de opciones (hueco', i + 1, ')'); continue; }
      const o = (want && opts.find(x => norm(txt(x)) === norm(want))) || (!want ? opts[0] : null);
      if (!o) { warn('Desplegable viejo: no encuentro la opción', want, 'entre', opts.map(txt)); try { document.body.click(); } catch (e) {} continue; }
      click(o); n++; await sleep(350);
      if (!want || norm(this.legacyBlankValue(this.legacyBlanks()[i] || b)) === norm(want)) ok++;
      if (!values && n === 1 && await practiceEnough(tn)) break;
    }
    return { did: values ? 'ddl_legacy_replay' : 'ddl_legacy', n, ok, total: values ? values.filter(Boolean).length : blanks.length };
  }

  static readLegacyDDL() { return this.legacyBlanks().map(b => this.legacyBlankValue(b)); }
}
