// =====================================================================
//  MEDIA — audio/video "solo escuchar"
// ---------------------------------------------------------------------
//  Tipo(s) en detectKind(): media
//  Se detecta por: .layout__mediaPlayPause
//  DEPENDE DE: utils/dom.js, utils/drag.js, core/*
//  EXPONE:     MediaSolver (se une a PracticeSolver en exercises/index.js)
// =====================================================================

class MediaSolver {
  // ---------------------------------------------------------------
  // AUDIO / VIDEO SOLO                                       [NUEVA — de v17]
  // PARA QUÉ: pulsa play unos segundos y luego pausa (algunas pantallas lo exigen).
  // ---------------------------------------------------------------
  static async solveMedia() {
    const b = qv('.layout__mediaPlayPause');
    if (!b) return { did: 'media_none' };
    log('▶️ [Media] Reproduciendo audio/video...');
    click(b); await sleep(3000);
    const b2 = qv('.layout__mediaPlayPause'); if (b2 && /--pause|pause/i.test(b2.className)) click(b2);
    await sleep(300);
    return { did: 'media_played', waitDone: 4000 };
  }
}
