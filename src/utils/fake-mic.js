// =====================================================================
//  MICRÓFONO SIMULADO — para PCs sin micrófono ("Your microphone is not available ... Error 505")
// ---------------------------------------------------------------------
//  NUEVO v21.1. ED pide el micrófono con getUserMedia. Si no hay ninguno, falla y el botón de grabar
//  no se activa. installFakeMic() hace que, cuando NO haya micrófono real, el navegador entregue un
//  audio casi silencioso (ruido muy bajo). Así ED puede grabar y enviar en los speaking al profesor.
//  ⚠ En "elegir la respuesta hablando" ED escucha silencio: no lo dará por correcto (solo ya no se traba).
//  Si hay micrófono real, se usa el real. Apagar: __ed.cfg({ fakeMic: false }) y recargar.
//  Para que funcione desde que carga la página, conviene el cargador de Tampermonkey (lo instala antes).
//  DEPENDE DE: nada
//  EXPONE:     installFakeMic, primeFakeMic
// =====================================================================

function installFakeMic() {
  try {
    const md = navigator.mediaDevices;
    if (!md || md.__edFake) return false;
    const orig = md.getUserMedia ? md.getUserMedia.bind(md) : null;
    const origEnum = md.enumerateDevices ? md.enumerateDevices.bind(md) : null;
    const falso = () => {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = window.__edMicCtx || (window.__edMicCtx = new Ctx());
      try { ctx.resume(); } catch (e) {}
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.003;   // ruido casi inaudible
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const dst = ctx.createMediaStreamDestination(); src.connect(dst); src.start();
      window.__edMicDst = dst; window.__edFakeActive = true;   // NUEVO v21.2: para el "eco" (ver micEcho)
      return dst.stream;
    };
    md.getUserMedia = async c => {
      if (c && c.audio && !c.video) {
        if (orig) { try { return await orig(c); } catch (e) { /* sin micrófono real → simulado */ } }
        console.log('%c[ED]', 'color:#27ae61', '🎤 sin micrófono real → uso el simulado');
        return falso();
      }
      return orig ? orig(c) : Promise.reject(new Error('getUserMedia no disponible'));
    };
    md.enumerateDevices = async () => {
      const l = origEnum ? [...(await origEnum())] : [];
      if (!l.some(x => x.kind === 'audioinput')) l.push({ deviceId: 'ed-fake-mic', kind: 'audioinput', label: 'ED micrófono simulado', groupId: 'ed', toJSON() { return this; } });
      return l;
    };
    const viejo = (c, ok, err) => md.getUserMedia(c).then(ok, err);   // APIs viejas que usa el código antiguo de ED
    navigator.getUserMedia = navigator.webkitGetUserMedia = navigator.mozGetUserMedia = viejo;
    md.__edFake = true;
    return true;
  } catch (e) { return false; }
}

// NUEVO v21.2 — ECO (experimento): mientras window.__edMicEcho esté activo, todo audio que reproduzca la
// página (p. ej. el botón de audífonos de la opción correcta, dicha por un nativo) también entra al
// micrófono simulado. Así ED podría "oír" la respuesta correcta. Si el navegador no deja capturar ese
// audio (restricción de origen), simplemente entra silencio: no rompe nada.
function installMicEcho() {
  try {
    const P = HTMLMediaElement.prototype;
    if (P.__edEcho) return;
    const play = P.play;
    P.play = function () {
      try {
        if (window.__edMicEcho && window.__edMicCtx && window.__edMicDst) {
          const ctx = window.__edMicCtx;
          if (!this.__edSrc) { this.__edSrc = ctx.createMediaElementSource(this); this.__edSrc.connect(ctx.destination); }
          this.__edSrc.connect(window.__edMicDst);
        }
      } catch (e) {}
      return play.apply(this, arguments);
    };
    P.__edEcho = true;
  } catch (e) {}
}

// Chrome deja "activar" el audio solo tras un clic REAL: se llama al pulsar Iniciar en la cajita.
function primeFakeMic() {
  try { const Ctx = window.AudioContext || window.webkitAudioContext; const ctx = window.__edMicCtx || (window.__edMicCtx = new Ctx()); ctx.resume(); } catch (e) {}
}
