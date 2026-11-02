// =====================================================================
//  CORRIDA — memoria de "lo que ya falló en ESTA corrida" (regla 4 de Hugo, v21.11)
// ---------------------------------------------------------------------
//  "Si algo falla 2 veces en una corrida, el bot lo anota y no lo vuelve a intentar en esa corrida."
//  Una corrida = un arranque de completar/barrido (su `inicio`); sin barrido activo, 'manual'.
//  Al empezar una corrida nueva se borran los fallos anotados y el contador de reintentos de tests
//  (ed:scoreVisits:v1): antes pasaba de una corrida a otra y un test rendido tenía 1 solo intento.
//  Lugar = lección | paso | contador | tarea.  Tope: 2 fallos; 1 si el tipo es caro (speaking, memoria, Explore...).
//  DEPENDE DE: core/navigation.js (en tiempo de ejecución)
//  EXPONE:     Corrida
// =====================================================================

const K_CORRIDA = 'ed:corrida:v1';

class Corrida {
  static idActual() {
    try { const s = JSON.parse(localStorage.getItem('ed:sweep:v1') || 'null'); return (s && (s.inicio || s.corrida)) || 'manual'; } catch (e) { return 'manual'; }
  }
  static get() {
    let c = null; try { c = JSON.parse(localStorage.getItem(K_CORRIDA) || 'null'); } catch (e) {}
    const id = this.idActual();
    if (!c || c.id !== id) {
      c = { id, fallos: {} };
      try { localStorage.removeItem('ed:scoreVisits:v1'); localStorage.setItem(K_CORRIDA, JSON.stringify(c)); } catch (e) {}
    }
    return c;
  }
  static lugar(t) {
    try { return [NavigationManager.lessonLabel(), NavigationManager.stepLabel(), (NavigationManager.counter() || {}).s || '', t ? t.n : ''].join('|'); } catch (e) { return '?'; }
  }
  static fallos(l) { return this.get().fallos[l] || 0; }
  static fallo(l) {
    const c = this.get(); c.fallos[l] = (c.fallos[l] || 0) + 1;
    try { localStorage.setItem(K_CORRIDA, JSON.stringify(c)); } catch (e) {}
    return c.fallos[l];
  }
}
