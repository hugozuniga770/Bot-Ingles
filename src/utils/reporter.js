// =====================================================================
//  REPORTE AUTOMÁTICO DE FALLOS — "lo que no pude hacer", listo para pegar en el chat
// ---------------------------------------------------------------------
//  NUEVO v20.8. Cuando el bot no logra algo (tarea que ED no marcó, tipo desconocido,
//  replay incompleto, cosecha vacía, error...) guarda una RADIOGRAFÍA de esa pantalla
//  (como probes/test-dump.js, pero compacta) en localStorage.
//    __ed.report()       → copia TODO el reporte al portapapeles (y lo devuelve como texto)
//    __ed.reportFile()   → lo descarga como .txt
//    __ed.reportClear()  → lo borra
//  También: botón "📋 Reporte (N)" en la cajita, y al detenerse el bot intenta copiarlo solo.
//  No guarda datos personales: solo clases, textos de la pregunta y el HTML del ejercicio.
//  DEPENDE DE: utils/dom.js, core/config.js
//  EXPONE:     Reporter
// =====================================================================

const K_REPORT = 'ed:report:v1';

class Reporter {
  static all() { try { return JSON.parse(localStorage.getItem(K_REPORT) || '[]'); } catch (e) { return []; } }
  static count() { return this.all().length; }
  static clear() { localStorage.removeItem(K_REPORT); }

  static snapshot() {
    const area = qv('.answersWrapper') || qv('.learning__angPracticeW') || qv('.pmContainer') || qv('.learning__practiceArea') || qv('.layout__mainContent') || document.body;
    const clases = {};
    qa('*', area).filter(vis).forEach(e => (typeof e.className === 'string' ? e.className : '').split(/\s+/).filter(Boolean).forEach(c => { clases[c] = (clases[c] || 0) + 1; }));
    const limpio = e => {
      if (!e) return null;
      const c = e.cloneNode(true);
      qa('script, style, svg, img, video, audio', c).forEach(x => x.remove());
      qa('*', c).forEach(x => [...x.attributes].forEach(a => { if (/^(_ng|ng-|style$|src$|href$)/.test(a.name)) x.removeAttribute(a.name); }));
      return c.outerHTML.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').slice(0, 3500);
    };
    let kind = '';
    try { kind = window.__ed.kind(); } catch (e) {}
    const t = (() => { try { return NavigationManager.curTask(); } catch (e) { return null; } })();
    return {
      url: location.href.slice(0, 90), leccion: NavigationManager.lessonLabel(), step: NavigationManager.stepLabel(),
      contador: (NavigationManager.counter() || {}).s || null, tarea: t ? t.n + (t.done ? '✓' : '·') : null, kind,
      instruccion: txt(q('.learning__headerIW')).slice(0, 160),
      clases: Object.fromEntries(Object.entries(clases).sort((a, b) => b[1] - a[1]).slice(0, 45)),
      html: limpio(area)
    };
  }

  // motivo: 'tarea_no_marcada' | 'tipo_desconocido' | 'replay_incompleto' | 'cosecha_vacia' | 'error' | ...
  static capture(motivo, extra = null) {
    try {
      const s = this.snapshot();
      const lista = this.all();
      const clave = [motivo, s.leccion, s.step, s.contador, s.tarea].join('|');
      if (lista.some(r => r.clave === clave)) return;                     // ya anotado
      lista.push(Object.assign({ clave, motivo, hora: new Date().toLocaleTimeString(), v: V, resultado: extra }, s));
      while (lista.length > 40 || JSON.stringify(lista).length > 450000) lista.shift();
      localStorage.setItem(K_REPORT, JSON.stringify(lista));
      warn('📝 Anotado para el reporte (' + motivo + '):', s.leccion, '·', s.step, '·', s.contador || '');
    } catch (e) { warn('Reporter falló:', e.message); }
  }

  static text() {
    const lista = this.all();
    if (!lista.length) return 'ED-Autopilot v' + V + ' — sin fallos anotados.';
    const resumen = lista.map((r, i) => `${i + 1}. [${r.motivo}] ${r.leccion} · ${r.step} · ${r.contador || ''} · kind=${r.kind}`).join('\n');
    return `ED-Autopilot v${V} — REPORTE DE FALLOS (${lista.length})\n${resumen}\n\n--- DETALLE (JSON) ---\n` + JSON.stringify(lista.map(r => { const c = Object.assign({}, r); delete c.clave; return c; }), null, 1);
  }

  static async copy() {
    const t = this.text();
    try { await navigator.clipboard.writeText(t); log('📋 Reporte copiado al portapapeles (' + this.count() + ' fallos). Pégalo en el chat.'); return true; }
    catch (e) { try { copy(t); log('📋 Reporte copiado.'); return true; } catch (_) {} warn('No pude copiar solo (la pestaña debe estar enfocada). Usa el botón 📋 de la cajita o __ed.reportFile().'); return false; }
  }

  static file() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([this.text()], { type: 'text/plain' }));
    a.download = 'ed-reporte-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.txt';
    document.body.appendChild(a); a.click(); a.remove();
  }
}
