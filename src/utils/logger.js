// =====================================================================
//  LOGGER — mensajes en consola
// ---------------------------------------------------------------------
//  log (verde), warn (naranja), errLog (rojo).
//  DEPENDE DE: V
//  EXPONE:     log, warn, errLog
// =====================================================================

const log = (...a) => console.log('%c[ED v' + V + ']', 'color:#27ae61;font-weight:bold', ...a);
const warn = (...a) => console.warn('%c[ED v' + V + ']', 'color:#e67e22;font-weight:bold', ...a);
const errLog = (...a) => { console.error('%c[ED ERROR]', 'color:#c0392b;font-weight:bold', ...a); };
