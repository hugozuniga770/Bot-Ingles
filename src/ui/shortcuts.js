// =====================================================================
//  ATAJO DE TECLADO — Alt+E (o Ctrl+Shift+E) inicia / para el bot
// ---------------------------------------------------------------------
//  RECUPERADO de v17 (v20.1). Al reinstalar se quita el atajo viejo para no duplicarlo.
//  DEPENDE DE: window.__ed
//  EXPONE:     window.__edKeyHandler
// =====================================================================

try { if (window.__edKeyHandler) window.removeEventListener('keydown', window.__edKeyHandler); } catch (e) {}
window.__edKeyHandler = e => {
  if ((e.ctrlKey && e.shiftKey && e.code === 'KeyE') || (e.altKey && e.code === 'KeyE')) {
    e.preventDefault();
    window.__ed._running ? window.__ed.stop() : window.__ed.auto();
  }
};
window.addEventListener('keydown', window.__edKeyHandler);
