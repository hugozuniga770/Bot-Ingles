// ==UserScript==
// @name         ED-Autopilot (cargador)
// @namespace    hugozuniga770
// @version      1.1
// @description  Carga el bot de github.com/hugozuniga770/Bot-Ingles en cada página de English Discoveries.
//               El barrido de tests y el bot siguen solos aunque ED cambie de página o se recargue la pestaña.
// @match        https://ed.engdis.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==
// v1.1: se ejecuta ANTES que ED (document-start) para que el micrófono simulado esté listo desde el inicio,
//       y marca window.__edCargador para que el bot pueda recargar la pestaña y retomar solo.
(function () {
  'use strict';
  window.__edCargador = true;

  // --- Micrófono simulado (igual que src/utils/fake-mic.js), solo si NO hay micrófono real ---
  try {
    const md = navigator.mediaDevices;
    if (md && !md.__edFake && localStorage.getItem('ed:nofakemic') !== '1') {
      const orig = md.getUserMedia && md.getUserMedia.bind(md), origEnum = md.enumerateDevices && md.enumerateDevices.bind(md);
      const falso = () => { const C = window.AudioContext || window.webkitAudioContext, ctx = window.__edMicCtx || (window.__edMicCtx = new C()); try { ctx.resume(); } catch (e) {}
        const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.003;
        const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; const dst = ctx.createMediaStreamDestination(); s.connect(dst); s.start(); return dst.stream; };
      md.getUserMedia = async c => { if (c && c.audio && !c.video) { if (orig) { try { return await orig(c); } catch (e) {} } return falso(); } return orig ? orig(c) : Promise.reject(new Error('sin getUserMedia')); };
      md.enumerateDevices = async () => { const l = origEnum ? [...(await origEnum())] : []; if (!l.some(x => x.kind === 'audioinput')) l.push({ deviceId: 'ed-fake-mic', kind: 'audioinput', label: 'ED micrófono simulado', groupId: 'ed', toJSON() { return this; } }); return l; };
      navigator.getUserMedia = navigator.webkitGetUserMedia = (c, ok, err) => md.getUserMedia(c).then(ok, err);
      md.__edFake = true;
    }
  } catch (e) {}

  // --- Cargar el bot cuando la página esté lista ---
  const cargar = () => setTimeout(() => {
    fetch('https://raw.githubusercontent.com/hugozuniga770/Bot-Ingles/main/dist/ed-autopilot.js?t=' + Date.now())
      .then(r => { if (!r.ok) throw new Error('GitHub respondió ' + r.status + ' (¿repo privado?)'); return r.text(); })
      .then(code => { (0, eval)(code); })
      .catch(e => console.error('[ED cargador]', e.message));
  }, 1500);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cargar); else cargar();
})();
