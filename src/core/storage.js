// =====================================================================
//  STORAGE — respuestas cosechadas, puntajes y estado del test en curso
// ---------------------------------------------------------------------
//  Todo vive en localStorage (sobrevive a recargar la página).
//  DEPENDE DE: core/config.js
//  EXPONE:     StorageManager
// =====================================================================

class StorageManager {
  static getAns() { try { return JSON.parse(localStorage.getItem(K_ANS) || '{}'); } catch (e) { return {}; } }
  static getAns2() { try { return JSON.parse(localStorage.getItem(K_ANS2) || '{}'); } catch (e) { return {}; } }
  static getKnown() { try { return JSON.parse(localStorage.getItem(K_KNOWN) || '[]'); } catch (e) { return []; } }
  static getScores() { try { return JSON.parse(localStorage.getItem(K_SCORES) || '{}'); } catch (e) { return {}; } }
  static getRun() { try { return JSON.parse(localStorage.getItem(K_RUN) || 'null'); } catch (e) { return null; } }
  static setRun(v) { if (v) localStorage.setItem(K_RUN, JSON.stringify(v)); else localStorage.removeItem(K_RUN); }
  static addKnown(k) { const s = new Set(this.getKnown()); s.add(k); localStorage.setItem(K_KNOWN, JSON.stringify([...s])); }
  static saveScore(k, p) { let o = {}; try { o = JSON.parse(localStorage.getItem(K_SCORES) || '{}'); } catch (e) {} o[k] = p; localStorage.setItem(K_SCORES, JSON.stringify(o)); }
}
