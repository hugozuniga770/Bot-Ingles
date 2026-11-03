// =====================================================================
//  EXPLORE — pasos "Explore"/"Prepare" que solo hay que ver/escuchar (video, tarjetas de vocabulario, lectura)
// ---------------------------------------------------------------------
//  NUEVO v21.11, REHECHO v21.12 con los dumps de Hugo (02/11) y las corridas de Jose, Roy y Mateo:
//   • VIDEO (U5 L1 "In the Restaurant", U7 L1, U8 L1): .learning__RAMediaResourceW--html5Video con botón grande
//     .learning__RAMRButton--play y controles #video-controls (.layout__mediaPlayPause). Hugo: "es solo esperar a
//     que cargue el video y darle play". El bot lo tomaba como mcq_default porque el reproductor aún no cargaba.
//   • TARJETAS DE VOCABULARIO (U8 L6 "Work"): .learning__vocabularyCards_card (10). Hugo: "darle clic a un
//     elemento y salir con la x".
//   • SEGMENTOS / PARLANTES (.segment / .speaker): lectura con audio por frase.
//  Todo con esperas LARGAS para que cargue (Hugo: "dales más tiempo para que carguen") y verificando tras cada
//  intento si ED marcó la tarea (regla 3). Si nada la marca, el engine guarda el reporte con dump completo.
//  DEPENDE DE: utils/dom.js, utils/press.js, core/navigation.js
//  EXPONE:     ExploreSolver (se une a PracticeSolver)
// =====================================================================

class ExploreSolver {
  static esPasoExplore() { return /explore|prepare|explora|prepara/i.test(NavigationManager.stepLabel()); }
  static hayVideo() { return !!q('.learning__RAMediaResourceW--html5Video, .learning__RAMediaResourceW video, .learning__RAMRButton--play'); }
  static hayTarjetas() { return qav('.learning__vocabularyCards_card').length > 0; }
  // Solo en pasos Explore/Prepare (o con tarjetas de vocabulario): en una práctica con video a la izquierda manda la práctica
  static isExplore() {
    if (this.hayTarjetas() && !q('.dnditem, .dndZone .draggable, .prMCQ__qaInnerSet, .DDLOptions__selected')) return true;
    if (!this.esPasoExplore()) return false;
    return this.hayVideo() || this.hayAudio() || qav('.speaker').length > 0 || qav('.segment').length >= 2;   // AJUSTADA v21.16: + audio
  }
  // NUEVO v21.16 — reproductor de AUDIO de los Explore de gramática (dump de Hugo "Lesson 4: Past Form of Modals:
  // Should/Could Have · Step 1: Explore": .learning__RAMediaResourceW--html5Audio con #CTrackerPlayBtn y "00:00/00:09")
  static hayAudio() { return !!q('.learning__RAMediaResourceW--html5Audio, .learning__resourcesArea .layout__audioControlsW'); }

  static async solveExplore() {
    const tn = NavigationManager.curTask()?.n;
    const hecho = () => !!(tn && NavigationManager.taskDone(tn));
    const intentos = [];
    const fin = (marcado, extra) => Object.assign({ did: 'explore', intentos, marcado, waitDone: 3000 }, extra || {});
    if (hecho()) return fin(true);
    if (this.hayTarjetas()) { if (await this.tarjetas(tn, hecho, intentos)) return fin(true); }
    if (this.hayVideo()) { if (await this.video(hecho, intentos)) return fin(true); }
    if (this.hayAudio() && !this.hayVideo()) { if (await this.audio(hecho, intentos, !tn)) return fin(true); if (!tn && intentos.includes('sin_tarea')) return fin(false); }   // NUEVO v21.16
    if (await this.parlantes(hecho, intentos, !tn)) return fin(true);
    return fin(hecho());
  }

  // ---- AUDIO (NUEVO v21.16) ----
  // 13 Explore de gramática sin marcar solo en Nore (y 2–4 en cada cuenta: U14 L1–L5): el bot tocaba las 2 frases
  // (segmentos:4✗) y ED no marcaba. Hugo: "solo era esperar a que cargue y tocar play ... dale tiempito y play 3
  // segundos ... casi todos tardan en cargar". → esperar a que cargue (hasta 40 s), play VERIFICADO (clic, mouse real
  // en la nube, o el <audio> directo) y dejarlo sonar hasta que ED marque la tarea o termine el audio.
  static async audio(hecho, intentos, sinTarea) {
    log('🎧 [Explore] Audio: espero a que cargue y le doy play...');
    const zona = () => q('.learning__RAMediaResourceW--html5Audio') || q('.learning__resourcesArea') || document;
    const t = id => txt(q('#' + id, zona()) || q('#' + id));
    const seg = s => { const m = String(s || '').match(/(\d+):(\d+)/); return m ? +m[1] * 60 + +m[2] : 0; };
    const total = () => seg(t('total-time'));
    // el <audio> del recurso: el que dura como dice el reproductor (hay otro corto de efectos)
    const aud = () => { const as = qa('audio'); const tt = total(); return (tt && as.find(a => Math.abs((a.duration || 0) - tt) <= 2)) || as.filter(a => a.duration > 0).sort((a, b) => b.duration - a.duration)[0] || as[0] || null; };
    const botones = () => [qv('#CTrackerPlayBtn', zona()), qv('.layout__mediaPlayPause--play', zona()), qv('.learning__RAMRButton', zona()), qv('.layout__mediaPlayPause', zona())].filter((b, i, a) => b && a.indexOf(b) === i);
    // cargado = el botón de play SE VE y ya se sabe cuánto dura (o el <audio> tiene datos, o el cargador dice 100 %)
    const cargado = () => botones().length > 0 && (total() > 0 || qa('audio').some(a => a.readyState >= 2 && a.duration > 0) || /100\s*%/.test(t('mediaLoadProgressPercent')) || !qv('#mediaLoadPanel'));
    const ok = await waitFor(cargado, 40000, 500);
    intentos.push(ok ? 'audio_cargado' : 'audio_sin_cargar');
    const reloj0 = t('playing-time');
    const sonando = () => { const a = aud(); if (a && !a.paused && !a.ended && a.currentTime > 0) return true;
      const b = q('#CTrackerPlayBtn', zona()) || q('.layout__mediaPlayPause', zona()); if (b && /--pause\b|\bpause\b/i.test(b.className) && !/--play\b/.test(b.className)) return true;
      return !!(reloj0 != null && t('playing-time') && t('playing-time') !== reloj0); };
    let empezo = false;
    for (const b of botones()) {
      if (await press(b, () => sonando() || hecho(), 4000)) { empezo = true; intentos.push('play:' + ((typeof b.className === 'string' && b.className.split(' ')[0]) || b.id || 'boton')); break; }
    }
    if (!empezo && Manos.hay() && botones()[0]) {
      await Manos.clic(botones()[0]);
      empezo = !!(await waitFor(() => sonando() || hecho(), 4000, 300)); intentos.push('play:mouse_real' + (empezo ? '' : '✗'));
    }
    if (!empezo && aud()) {   // último recurso: el <audio> directo
      try { const pr = aud().play(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) {}
      empezo = !!(await waitFor(() => sonando() || hecho(), 4000, 300)); intentos.push('audio.play' + (empezo ? '' : '✗'));
    }
    // sin barra de tareas no hay nada que verificar: con que suene unos segundos basta (Hugo: "play 3 segundos")
    if (sinTarea) { await sleep(5000); intentos.push('sin_tarea'); return false; }
    // dejarlo sonar: hasta que ED marque o termine (tope: lo que dura + 15 s, entre 20 s y 4 min); NO se pausa
    const tope = Math.min(240000, Math.max(20000, (total() + 15) * 1000));
    await waitFor(() => hecho() || (aud() && aud().ended) || (total() > 0 && seg(t('playing-time')) >= total()), tope, 500);
    if (!hecho()) await waitFor(hecho, 3000, 300);
    if (!hecho()) intentos.push('audio_sin_marcar');
    return hecho();
  }

  // ---- VIDEO: esperar a que cargue (hasta 30 s), darle play y esperar a que ED marque (hasta 100 s) ----
  static async video(hecho, intentos) {
    log('🎬 [Explore] Video: espero a que cargue y le doy play...');
    const botones = () => [qv('.learning__RAMRButton--play'), qv('.layout__mediaPlayPause--play'), qv('.layout__mediaPlayPause')].filter(Boolean);
    const vid = () => q('.learning__RAMediaResourceW video, .learning__resourcesArea video') || q('video');
    await waitFor(() => botones().length || (vid() && vid().readyState >= 2), 30000, 400);
    const sonando = () => { const v = vid(); return !!(v && !v.paused && !v.ended); };
    let empezo = false;
    for (const b of botones()) {
      if (await press(b, () => sonando() || hecho(), 5000)) { empezo = true; intentos.push('play:' + (typeof b.className === 'string' ? b.className.split(' ')[0] : 'boton')); break; }
    }
    if (!empezo && vid()) {   // último recurso: reproducir el <video> directo (sin sonido)
      try { const v = vid(); v.muted = true; const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) {}
      empezo = !!(await waitFor(() => sonando() || hecho(), 5000, 300));
      intentos.push('video.play' + (empezo ? '' : '✗'));
    }
    // dejarlo correr hasta que ED marque la tarea o termine el video (tope 100 s); NO se pausa
    if (await waitFor(() => hecho() || (vid() && vid().ended), 100000, 500) && hecho()) return true;
    if (!hecho()) intentos.push('video_sin_marcar');
    return hecho();
  }

  // ---- TARJETAS DE VOCABULARIO: abrir una, cerrarla con la X y verificar; si ED no marca, la siguiente ----
  // Dumps de Hugo (U8 L6 "Work"): con la tarjeta ABIERTA ("2/10") aparecen elementos .cursor-pointer, .d-flex y
  // .learning__vocabularyCards_textSeparator que con las tarjetas cerradas NO existen → así se sabe si está abierta.
  // La X no trae nombre conocido: se prueban los botones nuevos (primero los que parecen X, luego los de arriba a la
  // derecha) y se verifica que la tarjeta se cerró. Si nada la cierra, el reporte guarda la tarjeta abierta.
  static marcasAbierta() { return qav('.learning__vocabularyCards_textSeparator, .cursor-pointer, .d-flex, .justify-between').filter(e => !e.closest('#ed-autopilot-hud')).length; }
  static async tarjetas(tn, hecho, intentos) {
    log('🗂️ [Explore] Tarjetas de vocabulario: abro una y la cierro con la X...');
    await waitFor(() => qav('.learning__vocabularyCards_card').length > 0, 20000, 400);
    const firma = () => qa('.learning__vocabularyCards *').map(e => (typeof e.className === 'string' ? e.className : '')).join('|').length + ':' + qav('.learning__vocabularyCards_card').length + ':' + txt(q('.learning__vocabularyCards')).length;
    const tarjetas = qav('.learning__vocabularyCards_card').slice(0, 10);
    for (let k = 0; k < tarjetas.length; k++) {
      const c = tarjetas[k]; if (!c.isConnected) continue;
      const antes = firma(), base = this.marcasAbierta();
      try { c.scrollIntoView({ block: 'center' }); } catch (e) {}
      const abrio = await press(q('.learning__vocabularyCards_cardImageWrapper', c) || c, () => this.marcasAbierta() > base || firma() !== antes || hecho(), 4000);
      intentos.push('tarjeta' + (k + 1) + (abrio ? '' : '✗'));
      if (abrio) {
        await sleep(1500);
        if (!hecho()) Reporter.marcarAntes();   // el "antes" del reporte = la tarjeta ABIERTA (por si la X falla)
        await this.cerrarTarjeta(base, intentos);
      }
      if (await waitFor(hecho, 3000, 300)) return true;
      if (!abrio && k >= 1) break;   // dos tarjetas que ni se abren: no insistir
    }
    return hecho();
  }
  static async cerrarTarjeta(base, intentos) {
    // OJO: nada de buscar "full"/"open" en las clases: el <body> real trae learning__body--vocabularyCards Y
    // learning__body--resourcesAreaFull con la tarjeta abierta o cerrada (dumps de Hugo)
    const abierta = () => this.marcasAbierta() > base;
    if (!abierta()) return true;
    const fuera = e => !!e.closest('#ed-autopilot-hud, .learning__lessonsStepsNav, .learning__header, header, .sitemenu, .settingsMenu__main');
    const esX = e => { const c = (typeof e.className === 'string' ? e.className : '') + ' ' + (e.getAttribute('aria-label') || '') + ' ' + (e.id || ''); return /close|cerrar|exit|cross|times|x-?btn|btnx|icon-?x/i.test(c) || /^\s*[×✕✖xX]\s*$/.test(txt(e)); };
    const r = e => e.getBoundingClientRect();
    const xs = qa('*').filter(e => vis(e) && !fuera(e) && esX(e));
    // botones nuevos (.cursor-pointer): primero el último de una fila .justify-between (la fila "2/10 … X"), después
    // los sin texto (íconos), y entre ellos los más arriba a la derecha
    const prio = e => (e.parentElement && /justify-between/.test(e.parentElement.className) && !e.nextElementSibling ? 0 : 1) * 2 + (txt(e).trim().length > 2 ? 1 : 0);
    const iconos = qav('.cursor-pointer').filter(e => !fuera(e) && !xs.includes(e) && !/^\s*\d+\s*\/\s*\d+\s*$/.test(txt(e)))
      .sort((a, b) => (prio(a) - prio(b)) || ((r(b).right - r(b).top * 2) - (r(a).right - r(a).top * 2)));
    for (const x of [...xs, ...iconos].slice(0, 8)) {
      if (!abierta()) break;
      if (await press(x, () => !abierta(), 2500)) { intentos.push('cerrar:' + ((typeof x.className === 'string' && x.className.split(' ')[0]) || x.tagName.toLowerCase())); return true; }
    }
    if (!abierta()) return true;
    try { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true })); } catch (e) {}
    if (await waitFor(() => !abierta(), 1500, 200)) { intentos.push('cerrar:Escape'); return true; }
    intentos.push('cerrar✗');
    return false;
  }

  // ---- SEGMENTOS / PARLANTES (lectura con audio): uno por uno, verificando ----
  // AJUSTADA v21.12: SIN barra de tareas (lecturas "Read the e-mail"/"Read the story" de Mateo) no hay nada que
  // verificar: basta con que suene UN audio y como mucho 20 s (antes hasta 75 s por página, regla 4: no perder tiempo).
  // En Roy, las lecturas Explore no quedaron pendientes en My Progress: con visitarlas alcanza.
  static async parlantes(hecho, intentos, sinTarea) {
    const fuera = e => !!e.closest('.learning__lessonsStepsNav, .edLADropDownList, #ed-autopilot-hud, .learning__header, .learning__headerW, header');
    const sonando = () => qa('audio, video').some(m => !m.paused && !m.ended);
    const t0 = Date.now(), TOPE = sinTarea ? 20000 : 75000;
    let basta = false;
    const probar = async (nombre, els, espera) => {
      let n = 0;
      for (const el of els) {
        if (Date.now() - t0 > TOPE) break;
        try { el.scrollIntoView({ block: 'center' }); } catch (e) {}
        click(el); n++;
        const sono = await waitFor(sonando, 1500, 150);
        if (sono) await waitFor(() => !sonando(), espera, 300); else await sleep(400);
        if (hecho()) { intentos.push(nombre + ':' + n); return true; }
        if (sinTarea && sono) { intentos.push(nombre + ':' + n + ' (sin tarea: con un audio basta)'); basta = true; return false; }
      }
      if (n) intentos.push(nombre + ':' + n + '✗');
      return false;
    };
    if (qav('.speaker, .segment').length) log('🎧 [Explore] Parlantes / segmentos...');
    if (await probar('parlantes', qav('.speaker').filter(e => !fuera(e) && !e.closest('#video-controls')), 8000)) return true;
    if (basta) return hecho();
    if (await probar('segmentos', qav('.segment').filter(e => !fuera(e)).slice(0, 30), 6000)) return true;
    return hecho();
  }
}
