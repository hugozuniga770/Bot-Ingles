// =====================================================================
//  MAIN — arranque
// ---------------------------------------------------------------------
//  Crea el HUD y avisa en consola. NO arranca solo: usa __ed.auto().
//  DEPENDE DE: todo
//  EXPONE:     —
// =====================================================================

if (CFG.fakeMic) { installFakeMic(); installMicEcho(); }   // NUEVO v21.1 (+ eco v21.2): micrófono simulado si no hay uno real
hud = new HUD();

log('✅ ED-Autopilot v' + V + ' cargado con éxito. Usa __ed.auto() para arrancar · __ed.inspect() para diagnosticar.');
// NUEVO v20.8: si hay un barrido de tests activo (p. ej. tras cambiar de página con el cargador de
// Tampermonkey), el bot sigue solo en 3 s.
if (TestSweep.active() && !window.__edNoAutoResume) { log('🧭 Barrido activo → reanudo en 3 s (__ed.barrerStop() para cancelarlo)'); setTimeout(() => window.__ed.auto(), 3000); }
// NUEVO v21.1: con el cargador de Tampermonkey, si el bot estaba corriendo antes de recargar, retoma solo
else if (window.__edCargador && localStorage.getItem('ed:running:v1') && !window.__edNoAutoResume) { log('▶️ El bot estaba corriendo → retomo en 3 s'); setTimeout(() => window.__ed.auto(), 3000); }
