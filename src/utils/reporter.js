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
      // NUEVO v21.10 — reportes "tipo_desconocido" de los "Step 1: Explore" (corridas de Jose): sin área conocida se
      // guardaba el <body> y los 3500 caracteres eran SOLO el menú de lecciones; el ejercicio nunca llegaba. Se
      // quitan los menús y, si es el <body>, se guarda más.
      qa('.learning__lessonsStepsNav, .edLADropDownList, [class*="settingsMenu"]', c).forEach(x => x.remove());
      qa('*', c).forEach(x => [...x.attributes].forEach(a => { if (/^(_ng|ng-|style$|src$|href$)/.test(a.name)) x.removeAttribute(a.name); }));
      return c.outerHTML.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').slice(0, e === document.body ? 8000 : 3500);
    };
    let kind = '';
    try { kind = window.__ed.kind(); } catch (e) {}
    const t = (() => { try { return NavigationManager.curTask(); } catch (e) { return null; } })();
    return {
      url: location.href.slice(0, 90), leccion: NavigationManager.lessonLabel(), step: NavigationManager.stepLabel(),
      contador: (NavigationManager.counter() || {}).s || null, tarea: t ? t.n + (t.done ? '✓' : '·') : null, kind,
      instruccion: txt(q('.learning__headerIW')).slice(0, 160),
      // NUEVO v21.7: texto VISIBLE de la pantalla (sin menús) y marcos (iframes) → entender casos raros
      textoVisible: (() => { try { return ((qv('.learning__practiceArea, .learning__body, #mainContent') || document.body).innerText || '').replace(/\s+/g, ' ').trim().slice(0, 1200); } catch (e) { return ''; } })(),
      marcos: qa('iframe').map(f => (f.getAttribute('src') || f.id || '?').slice(0, 120) + (vis(f) ? ' (visible)' : '')).slice(0, 8),
      clases: Object.fromEntries(Object.entries(clases).sort((a, b) => b[1] - a[1]).slice(0, 45)),
      html: limpio(area),
      // NUEVO v21.11 (regla de Hugo: "cada reporte es un DUMP COMPLETO, sin dumps a mano")
      dump: this.dumpCompleto()
    };
  }

  // NUEVO v21.11 — lo mismo que probes/test-dump.js y más, con tope de tamaño: controles con atributos, caja de la
  // pregunta, DnD (+ eventos de jQuery), pestañas del review, barra de navegación y tareas, panel izquierdo
  // (.learning__resourcesArea: lectura, video, audio), audios/videos y el contenido de los iframes del mismo sitio.
  static dumpCompleto(ligero = false) {
    const cls = e => (e && typeof e.className === 'string' ? e.className : '').trim();
    const corta = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);
    const attrs = e => Object.fromEntries([...(e.attributes || [])].filter(a => !/^(class|style|_ng|ng-)/.test(a.name)).slice(0, 12).map(a => [a.name, corta(a.value, 60)]));
    const fuera = e => !!(e.closest && e.closest('.learning__lessonsStepsNav, .edLADropDownList, [class*="settingsMenu"], #ed-autopilot-hud, .learning__header, .learning__headerW, header'));
    const limpio = (e, n) => {
      if (!e) return null;
      const c = e.cloneNode(true);
      qa('script, style, svg, img, video, audio', c).forEach(x => x.remove());
      qa('.learning__lessonsStepsNav, .edLADropDownList, [class*="settingsMenu"], #ed-autopilot-hud', c).forEach(x => x.remove());
      qa('*', c).forEach(x => [...x.attributes].forEach(a => { if (/^(_ng|ng-|style$|src$|href$)/.test(a.name)) x.removeAttribute(a.name); }));
      return c.outerHTML.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').slice(0, n);
    };
    const eventosJQ = el => { try { const ev = window.jQuery && window.jQuery._data && window.jQuery._data(el, 'events'); return ev ? Object.keys(ev) : null; } catch (e) { return null; } };
    const ctrlSel = 'input, select, textarea, button, [contenteditable="true"], .draggable, .droptarget, .dnditem, .dndZone, label, ' +
      '[role="radio"], [role="checkbox"], [role="option"], [role="button"], .memoG__card, .segment, .speaker, .questionText, .optionsWrapper li, ' +
      '.learning__resourcesArea a, .answersWrapper a, [onclick]';
    const ctrls = qa(ctrlSel).filter(e => vis(e) && !fuera(e));
    const controles = ctrls.slice(0, ligero ? 25 : 40).map(e => {
      const o = { tag: e.tagName.toLowerCase(), clase: corta(cls(e), 80), texto: corta(e.textContent, 40) };
      if (!ligero) o.attrs = attrs(e);
      if (e.type) o.tipo = e.type;
      if ('value' in e && e.value) o.valor = corta(e.value, 30);
      if (e.checked) o.marcado = true;
      return o;
    });
    let caja = ctrls[0] || null;
    while (caja && !ctrls.every(c => caja.contains(c))) caja = caja.parentElement;
    if (!caja || caja === document.body || caja === document.documentElement) caja = qv('.answersWrapper') || qv('.learning__angPracticeW') || qv('.pmContainer') || qv('.learning__practiceArea') || caja;
    const out = { controles, nControles: ctrls.length, cajaHTML: limpio(caja, ligero ? 3000 : 5000) };
    if (ligero) return out;
    // DnD (como la sección A de test-dump.js)
    const resumir = (sel, n) => qa(sel).slice(0, n).map(e => ({ clase: corta(cls(e), 70), attrs: attrs(e), texto: corta(e.textContent, 40), visible: vis(e) }));
    const d0 = q('.draggable, .dnditem, .wordBankTile');
    if (d0 || q('.droptarget, .dndZone')) out.dnd = {
      huecos: resumir('.droptarget, .dndZone', 12), fichas: resumir('.draggable, .dnditem', 12),
      eventosFicha: d0 ? eventosJQ(d0) : null, eventosDocumento: eventosJQ(document), jqueryUI: !!(window.jQuery && window.jQuery.ui)
    };
    // Pestañas del review ("Your Answer" / "Correct Answer" y en español)
    const RE_TAB = /^\W*(correct\s*answers?|respuestas?\s*correctas?|your\s*answers?|(tus?|su|mis)\s*respuestas?)(\s*\(?\d+\)?)?\W*$/i;
    out.pestanas = qa('li, a, button, span, div').filter(e => !e.children.length && RE_TAB.test(txt(e))).slice(0, 6).map(e => ({ texto: txt(e), visible: vis(e), padre: limpio(e.parentElement, 300) }));
    // Barra de abajo y tareas
    const nx = q('a.tasksBtnext') || q('.learning__nextItemLink') || q('.learning__submitTestLink');
    out.barra = {
      siguiente: nx ? { clase: corta(cls(nx), 80), texto: corta(nx.textContent, 20), visible: vis(nx) } : null,
      atras: (e => e ? { clase: corta(cls(e), 80), visible: vis(e) } : null)(q('a.tasksBtprev, .learning__prevItemLink')),
      tareas: qa('.learning__tasksNav_task').slice(0, 20).map(e => corta(e.textContent, 4) + (/--done/.test(cls(e)) ? '✓' : '') + (/--current/.test(cls(e)) ? '*' : '')),
      contador: (NavigationManager.counter() || {}).s || null
    };
    // Panel izquierdo (lectura / video / audio)
    const izq = qv('.learning__resourcesArea') || q('.learning__resourcesArea');
    if (izq) out.panelIzq = { html: limpio(izq, 6000), texto: corta(izq.innerText || izq.textContent, 2000) };
    out.medios = qa('audio, video').slice(0, 8).map(m => ({ tag: m.tagName.toLowerCase(), src: corta((m.currentSrc || m.src || '').split('/').pop(), 80), pausado: m.paused, t: Math.round(m.currentTime || 0), dur: Math.round(m.duration || 0), visible: vis(m), clasePadre: corta(cls(m.parentElement), 60) }));
    out.iframes = qa('iframe').slice(0, 6).map(f => { const o = { id: f.id || null, src: corta(f.getAttribute('src'), 120), visible: vis(f) };
      try { const b = f.contentDocument && f.contentDocument.body; if (b) { o.texto = corta(b.innerText || b.textContent, 300); o.html = limpio(b, 1500); } } catch (e) { o.ajeno = true; } return o; });
    return out;
  }

  // NUEVO v21.11 — estado ANTES de que el bot actúe (el engine lo llama justo antes del solver). Si luego hay un
  // fallo en ese mismo lugar, el reporte trae el "antes" y el "después".
  static marcarAntes() {
    try {
      const t = NavigationManager.curTask();
      this._antes = { lugar: [NavigationManager.lessonLabel(), NavigationManager.stepLabel(), (NavigationManager.counter() || {}).s || '', t ? t.n : ''].join('|'),
        hora: Date.now(), dump: this.dumpCompleto(true) };
    } catch (e) { this._antes = null; }
  }

  // motivo: 'tarea_no_marcada' | 'tipo_desconocido' | 'replay_incompleto' | 'cosecha_vacia' | 'error' | ...
  static capture(motivo, extra = null) {
    try {
      const s = this.snapshot();
      const lista = this.all();
      const clave = [motivo, s.leccion, s.step, s.contador, s.tarea].join('|');
      // NUEVO v21.13: cada fallo lleva un número FIJO (#num; antes el número era la posición y cambiaba cuando la lista
      // pasaba de 40 y se soltaban los viejos: a Mateo se le perdieron así los primeros). El tablero marca el paso
      // con ❌, el motivo y ese número (ahí está el dump completo tomado en el momento).
      const tt = (() => { try { return NavigationManager.curTask(); } catch (_) { return null; } })();
      const i = lista.findIndex(r => r.clave === clave);
      if (i >= 0) { Tablero.anotar('falla', { tarea: tt ? tt.n : null, motivo, reporte: lista[i].num || i + 1 }); return; }   // ya anotado
      const num = (+localStorage.getItem('ed:report:num:v1') || 0) + 1;
      try { localStorage.setItem('ed:report:num:v1', String(num)); } catch (_) {}
      Tablero.anotar('falla', { tarea: tt ? tt.n : null, motivo, reporte: num });
      const e = Object.assign({ clave, num, motivo, hora: new Date().toLocaleTimeString(), v: V, resultado: extra }, s);
      // NUEVO v21.11: el "antes" de la acción del bot, si es del mismo lugar y de hace menos de 3 min
      const t = (() => { try { return NavigationManager.curTask(); } catch (_) { return null; } })();
      const lugar = [s.leccion, s.step, s.contador || '', t ? t.n : ''].join('|');
      if (this._antes && this._antes.lugar === lugar && Date.now() - this._antes.hora < 180000) e.antes = this._antes.dump;
      // Tope por entrada (~45 000 caracteres): se recortan primero los campos más grandes
      const recortar = () => { if (e.html) e.html = e.html.slice(0, 2500); if (e.dump && e.dump.panelIzq) e.dump.panelIzq.html = (e.dump.panelIzq.html || '').slice(0, 3000);
        if (e.dump) { e.dump.cajaHTML = (e.dump.cajaHTML || '').slice(0, 3000); (e.dump.iframes || []).forEach(f => { delete f.html; }); } if (e.antes) e.antes.cajaHTML = (e.antes.cajaHTML || '').slice(0, 2000); };
      if (JSON.stringify(e).length > 45000) recortar();
      lista.push(e);
      // AJUSTADA v21.11: entradas más grandes → tope total mayor; si el navegador no tiene lugar, se sueltan las viejas
      while (lista.length > 40 || JSON.stringify(lista).length > 900000) lista.shift();
      for (;;) { try { localStorage.setItem(K_REPORT, JSON.stringify(lista)); break; } catch (err) { if (lista.length <= 1) throw err; lista.shift(); } }
      warn('📝 Anotado para el reporte (' + motivo + '):', s.leccion, '·', s.step, '·', s.contador || '');
    } catch (e) { warn('Reporter falló:', e.message); }
  }

  static text() {
    const lista = this.all();
    if (!lista.length) return 'ED-Autopilot v' + V + ' — sin fallos anotados.';
    const resumen = lista.map((r, i) => `#${r.num || i + 1}. [${r.motivo}] ${r.leccion} · ${r.step} · ${r.contador || ''} · kind=${r.kind}`).join('\n');   // AJUSTADA v21.13: #num fijo
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
