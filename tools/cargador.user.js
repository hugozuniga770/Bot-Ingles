// ==UserScript==
// @name         ED-Autopilot (cargador)
// @namespace    hugozuniga770
// @version      1.0
// @description  Carga el bot de github.com/hugozuniga770/Bot-Ingles en cada página de English Discoveries.
//               Así el barrido de tests sigue solo aunque ED cambie de página (Home → unidad → lección).
// @match        https://ed.engdis.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
// El bot NO arranca solo: aparece la cajita y tú pulsas Iniciar (o Alt+E). La excepción es el
// barrido de tests: si lo activaste con __ed.barrer(), continúa solo en cada página nueva.
(function () {
  'use strict';
  const URL = 'https://raw.githubusercontent.com/hugozuniga770/Bot-Ingles/main/dist/ed-autopilot.js?t=' + Date.now();
  setTimeout(() => {
    fetch(URL)
      .then(r => { if (!r.ok) throw new Error('GitHub respondió ' + r.status + ' (¿repo privado?)'); return r.text(); })
      .then(code => { (0, eval)(code); })
      .catch(e => console.error('[ED cargador]', e.message));
  }, 1500);
})();
