// =====================================================================
//  EXPLORADOR — cuando una tarea NO se marca, prueba de todo, saca fotos y APRENDE qué la marcó
// ---------------------------------------------------------------------
//  NUEVO v21.16. Pedido de Hugo (03/11): "un botcito que se llame explorador, que busque directo en los errores, les
//  saque captura y dump completísimo, que pruebe cosas, mueva cosas, haga lo que sea para que marquen, y cuando lo
//  marque guarde la información de qué es lo que hizo que marque: así es como vas a aprender; que averigüe todos los
//  botones y lo que hacen; que revise por qué suceden los atascos".
//  Cuándo: el solver normal y su reintento fallaron (tarea_no_marcada / tipo_desconocido). NUNCA en un test (cada
//  clic podría cambiar una respuesta) y una sola vez por lugar en cada corrida (regla 4: no perder tiempo; tope 60 s).
//  Qué prueba (de a uno, verificando si ED marcó la tarea después de cada cosa):
//    1) lo APRENDIDO antes para una pantalla igual (ed:aprendido:v1; en la nube se comparte entre cuentas por el banco)
//    2) play de audio/video · 3) escribir una letra en cada campo · 4) arrastrar cada ficha a cada hueco (mouse real
//       en la nube) · 5) tocar cada opción, imagen, botón, frase o ícono de la práctica (de a uno, sin Next/Back/
//       Submit/Home/Reset) · 6) los botones de la barra de abajo que no navegan (✓, 👁)
//  Lo que pasó queda en el reporte (resultado.explorador: cada prueba, si cambió algo en la pantalla y si marcó) y
//  fotos antes/después (en la nube: fotos/explorador-*.png). Si algo marcó → se guarda para la próxima vez.
//  También: Explorador.diagnostico() → por qué está atascado (va en cada reporte de atasco).
//  DEPENDE DE: utils/*, core/navigation.js, tests/test-manager.js (en tiempo de ejecución)
//  EXPONE:     Explorador
// =====================================================================

const K_APRENDIDO = 'ed:aprendido:v1';
// tipos donde tocar cosas al azar no sirve (necesitan voz real o ya tienen su propio intento largo)
const NO_EXPLORAR = new Set(['open_speech', 'interactive_speaking', 'sr_choice', 'writing']);

class Explorador {
  static puede(kind, tn) {
    try {
      if (CFG.explorador === false || TestManager.inTest() || NO_EXPLORAR.has(kind) || !tn) return false;
      return !Corrida.fallos('explorar|' + Corrida.lugar({ n: tn }));
    } catch (e) { return false; }
  }

  // "firma" de la pantalla: tipo + clases que identifican el ejercicio (igual en todas las cuentas y cursos)
  static firma(kind) {
    const raiz = qv('.learning__angPracticeW') || qv('.answersWrapper') || qv('.learning__practiceArea') || document.body;
    const clases = new Set();
    for (const e of [raiz, ...qa('*', raiz).slice(0, 300)]) {
      for (const c of (typeof e.className === 'string' ? e.className.split(/\s+/) : [])) if (/^(pr[A-Z]\w*__main|pr[A-Z]\w*__main--\w+|writingEdit\w*|fitb|interact\w*|memoG__\w+|dndZone|droptarget|vocabulary\w*|learning__RAMediaResourceW--\w+)$/.test(c)) clases.add(c);
    }
    const paso = (NavigationManager.stepLabel().match(/:\s*(.+)$/) || [])[1] || '';
    return [kind, paso.replace(/\d+/g, '').trim().toLowerCase(), [...clases].sort().slice(0, 8).join('.')].join('|');
  }
  static aprendido() { try { return JSON.parse(localStorage.getItem(K_APRENDIDO) || '{}') || {}; } catch (e) { return {}; } }
  static aprender(firma, c) {
    try { const a = this.aprendido(); const v = a[firma]; a[firma] = { tipo: c.tipo, sel: c.sel, idx: c.idx, desc: c.desc, veces: ((v && v.veces) || 0) + 1, ultima: new Date().toISOString(), v: V };
      localStorage.setItem(K_APRENDIDO, JSON.stringify(a)); } catch (e) {}
  }

  // ---- candidatos: todo lo que se puede tocar en la práctica y en el panel izquierdo ----
  static fuera(e) { return !!e.closest('#ed-autopilot-hud, .learning__lessonsStepsNav, .edLADropDownList, .learning__header, .learning__headerW, header, .sitemenu, [class*="settingsMenu"], .learning__tasksNav, .learning__pnNavItem, .driver-popover'); }
  static peligroso(e) {
    // un enlace de verdad (lleva a otra página) no se toca
    const h = e.tagName === 'A' ? (e.getAttribute('href') || '') : '';
    if (h && !/^(#|javascript:)/i.test(h)) return true;
    const s = ((typeof e.className === 'string' ? e.className : '') + ' ' + (e.id || '') + ' ' + txt(e).slice(0, 40) + ' ' + (e.getAttribute('title') || '') + ' ' + (e.getAttribute('aria-label') || '')).toLowerCase();
    return /submit|tasksbt|next|prev|back|siguiente|anterior|enviar|home|logout|log out|salir|exit|start ?test|btnstarttest|reset|restart|again|retry|undo|reiniciar|print|imprimir|dictionary|help|ayuda|fullscreen|full-screen|volume|speed|mediasettings/.test(s);
  }
  static selDe(e) {
    const esc = c => (window.CSS && CSS.escape ? CSS.escape(c) : String(c).replace(/([^\w-])/g, '\\$1'));
    const p = []; for (let x = e, k = 0; x && k < 3 && x !== document.body; x = x.parentElement, k++) {
      const cs = typeof x.className === 'string' ? x.className.trim().split(/\s+/).filter(c => c && !/^(ng-|mCS|_mCS|gu-|selected|active|checked|correct|incorrect|current|done)/.test(c)).slice(0, 2) : [];
      p.unshift(x.tagName.toLowerCase() + cs.map(c => '.' + esc(c)).join(''));
    }
    return p.join(' > ');
  }
  static desc(e) { return (e.tagName.toLowerCase() + '.' + (typeof e.className === 'string' ? e.className.trim().split(/\s+/)[0] || '' : '') + (txt(e) ? ' "' + txt(e).slice(0, 20) + '"' : '')).slice(0, 70); }
  static candidatos() {
    const zonas = [qv('.learning__practiceArea'), qv('.learning__resourcesArea'), qv('.answersWrapper'), qv('.learning__angPracticeW')].filter(Boolean);
    const raiz = zonas.length ? zonas : [document.body];
    const dentro = e => raiz.some(z => z.contains(e));
    const vistos = new Set(), out = [];
    const add = (tipo, e, extra) => { if (!e || vistos.has(e) || !vis(e) || this.fuera(e) || this.peligroso(e) || !dentro(e)) return; vistos.add(e);
      const sel = this.selDe(e), idx = Math.max(0, qa(sel).indexOf(e)); out.push(Object.assign({ tipo, el: e, sel, idx, desc: tipo + ': ' + this.desc(e) }, extra || {})); };
    // 2) play
    qa('#CTrackerPlayBtn, .layout__mediaPlayPause, .learning__RAMRButton, [class*="play" i]').forEach(e => add('clic', e));
    // 3) campos
    qa('input[type="text"], textarea').filter(e => !e.readOnly && !e.disabled).slice(0, 4).forEach(e => add('teclear', e));
    // 4) fichas → huecos
    const fichas = qa('.dnditem, .draggable').filter(vis).slice(0, 3), huecos = qa('.dndZone, .droptarget').filter(vis).filter(z => !fichas.some(f => z.contains(f))).slice(0, 3);
    for (const f of fichas) for (const h of huecos) { if (out.length > 40) break; const sel = this.selDe(f); out.push({ tipo: 'arrastrar', el: f, a: h, sel, idx: Math.max(0, qa(sel).indexOf(f)), selA: this.selDe(h), idxA: Math.max(0, qa(this.selDe(h)).indexOf(h)), desc: 'arrastrar: ' + this.desc(f) + ' → ' + this.desc(h) }); }
    // 5) opciones, imágenes, frases, botones y todo lo que tiene "manito" (cursor: pointer)
    const tocables = 'label, input[type="checkbox"], input[type="radio"], .prMCQ__answers, .multiRadioWrapper, img, .segment, .speaker, button, a, [role="button"], [onclick], [class*="btn" i], [class*="button" i], [class*="card" i], [class*="option" i], [class*="answer" i]';
    raiz.forEach(z => qa(tocables, z).forEach(e => add('clic', e)));
    raiz.forEach(z => qa('div, span, li, i', z).slice(0, 400).forEach(e => { try { if (getComputedStyle(e).cursor === 'pointer') add('clic', e); } catch (_) {} }));
    // 6) barra de abajo que no navega (✓ revisar, 👁 ver respuesta)
    qa('.learning__PATools a, .learning__PATools div, .learning__PATools span, .learning__PATools button').forEach(e => { if (!vistos.has(e) && vis(e) && !this.peligroso(e)) { vistos.add(e); out.push({ tipo: 'clic', el: e, sel: this.selDe(e), idx: Math.max(0, qa(this.selDe(e)).indexOf(e)), desc: 'barra: ' + this.desc(e) }); } });
    return out;
  }

  static firmaDom() {
    const r = qv('.learning__practiceArea') || qv('.answersWrapper') || document.body;
    return qa('*', r).slice(0, 600).map(e => (typeof e.className === 'string' ? e.className : '')).join('|').replace(/\b(mCS|_mCS)\w*/g, '').length + ':' + txt(r).length + ':' + qa('input', r).map(i => i.value + (i.checked ? '*' : '')).join(',');
  }

  static async hacer(c) {
    if (c.tipo === 'teclear') { const f = await Manos.teclear(c.el, 'a'); Manos.soltarFoco(c.el); return f || 'nada'; }
    if (c.tipo === 'arrastrar') { await drag(c.el, c.a); if (Manos.hay() && c.el.isConnected && !c.a.contains(c.el)) await Manos.arrastrar(c.el, c.a); return 'ok'; }
    if (Manos.hay()) { if (await Manos.clic(c.el)) return 'mouse_real'; }
    await press(c.el, null);
    return 'clic';
  }

  // desde lo aprendido: volver a encontrar el elemento por su selector
  static reencontrar(a) {
    const el = qa(a.sel)[a.idx] || qa(a.sel)[0];
    if (!el) return null;
    const c = { tipo: a.tipo, el, sel: a.sel, idx: a.idx, desc: a.desc };
    if (a.tipo === 'arrastrar') { c.a = qa(a.selA || '.dndZone')[a.idxA || 0] || qv('.dndZone, .droptarget'); if (!c.a) return null; }
    return c;
  }

  static async explorar(tn, kind) {
    const lugar = Corrida.lugar({ n: tn });
    Corrida.fallo('explorar|' + lugar);
    const hecho = () => NavigationManager.taskDone(tn);
    const mismoLugar = () => Corrida.lugar({ n: tn }) === lugar;
    const firma = this.firma(kind), t0 = Date.now(), pruebas = [];
    log('🔭 [Explorador] La tarea', tn, 'no se marca → pruebo de todo (y aprendo qué la marca)…');
    const fotoAntes = Reporter.foto('explorador-' + tn + '-antes');
    const fin = (marcado, extra) => Object.assign({ marcado, firma, pruebas, segundos: Math.round((Date.now() - t0) / 1000) }, fotoAntes ? { fotoAntes } : {}, extra || {});
    if (await Guia.cerrar()) pruebas.push({ accion: 'cerrar la guía de ED', marco: hecho() });
    if (hecho()) return fin(true, { accion: 'cerrar la guía de ED' });
    // 1) lo aprendido
    const ap = this.aprendido()[firma];
    if (ap) {
      const c = this.reencontrar(ap);
      if (c) {
        await this.hacer(c);
        const ok = !!(await waitFor(hecho, 2500, 250));
        pruebas.push({ accion: 'APRENDIDO ' + c.desc, marco: ok });
        if (ok) { this.aprender(firma, c); log('🔭 [Explorador] Lo aprendido funcionó:', c.desc); return fin(true, { accion: c.desc, deAprendido: true }); }
      }
    }
    // 2–6) todo lo demás, de a uno
    const lista = this.candidatos();
    log('🔭 [Explorador]', lista.length, 'cosas para probar');
    for (const c of lista) {
      if (Date.now() - t0 > 60000 || pruebas.length >= 30 || !mismoLugar()) break;
      if (!c.el.isConnected) continue;
      const antes = this.firmaDom();
      let como = '';
      try { como = await this.hacer(c); } catch (e) { como = 'error: ' + e.message; }
      const marco = !!(await waitFor(hecho, 1500, 250));
      const cambio = this.firmaDom() !== antes;
      pruebas.push(Object.assign({ accion: c.desc, como, cambio, marco }));
      if (marco) {
        this.aprender(firma, c);
        const fotoMarco = Reporter.foto('explorador-' + tn + '-marco');
        log('🔭 [Explorador] ¡Marcó! con', c.desc, '→ aprendido para la próxima');
        return fin(true, Object.assign({ accion: c.desc }, fotoMarco ? { fotoMarco } : {}));
      }
      if (Guia.abierta()) await Guia.cerrar();
      if (q('.modalW_confirm, .modalW_alert, #alertModal, .confirmPopup__main') || NavigationManager.modalOpen()) await NavigationManager.handleModals();
    }
    const fotoDespues = Reporter.foto('explorador-' + tn + '-despues');
    log('🔭 [Explorador] Nada la marcó (' + pruebas.length + ' pruebas): queda todo en el reporte');
    return fin(hecho(), fotoDespues ? { fotoDespues } : {});
  }

  // ---- por qué está atascado (va en cada reporte de atasco) ----
  static diagnostico() {
    try {
      const nx = NavigationManager.nextBtn(), t = NavigationManager.curTask(), tasks = NavigationManager.tasks();
      const d = { kind: MainEngine.detectKind(), tareas: tasks.length, actual: t ? t.n + (t.done ? '✓' : '') : null, pendientes: tasks.filter(x => !x.done).map(x => x.n).slice(0, 10),
        next: nx ? { clase: (typeof nx.className === 'string' ? nx.className : '').slice(0, 70), visible: vis(nx), deshabilitado: /disabled|inactive/i.test(nx.className + ' ' + ((nx.parentElement && nx.parentElement.className) || '')) } : null,
        guia: Guia.abierta(), modal: !!NavigationManager.modalOpen(), testStart: TestManager.isTestStart(), puntaje: TestManager.isScore() ? TestManager.scorePct() : null, review: TestManager.isReview(), enTest: TestManager.inTest(), contador: (NavigationManager.counter() || {}).s || null };
      d.razon = d.guia ? 'una guía de ED ("Got it!") tapa la página' :
        d.modal ? 'hay una ventana (popup) abierta' :
        d.puntaje === 100 ? 'puntaje 100 % y Next no lleva a ningún lado (¿última lección de la unidad?)' :
        d.testStart ? 'pantalla "Start Test" de un test ya hecho y no hay lección siguiente' :
        d.review ? 'en el review del test y no sale de ahí' :
        !nx ? 'no hay botón Next en la pantalla' :
        (tasks.length && !t) ? 'la página no terminó de cargar (hay tareas pero ninguna activa)' :
        d.kind === 'mcq_default' ? 'no reconozco el ejercicio de esta pantalla' :
        (t && !t.done) ? 'la tarea ' + t.n + ' no se marca y Next no deja pasar' : 'Next no cambia la pantalla';
      return d;
    } catch (e) { return { error: e.message }; }
  }
}
