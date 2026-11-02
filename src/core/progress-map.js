// =====================================================================
//  MAPA DE PROGRESO — lee "My Progress" (sin dar ningún test)
// ---------------------------------------------------------------------
//  NUEVO v21.8 (dumps de Hugo del 01/11). Página #/MyProgress/Course/<id>/Unit/:
//    .myProgress__unitW → .myProgress__unitTitle ("Unit 1"), .myProgress__unitName, .myProgress__unitCompletionData
//      ("100%"), bloqueada si .myProgress__unitHeader--locked. Se DESPLIEGA pulsando .myProgress__unitHeader.
//    Desplegada → .myProgress__unitLesson: _number, _name, _testScore ("100%" | "No test"), _statusLabel
//      ("Terminado"), pasos .myProgress__unitLesson_step (hecho: .myProgress__unitLesson_stepProgressIW--done).
//  Guarda el mapa en ed:progress:v1. De ahí salen: unidades sin terminar, lecciones pendientes y los tests < 100
//  (los únicos que se rehacen: cada intento parece contar en el promedio de ED).
//  DEPENDE DE: utils/dom.js, utils/press.js
//  EXPONE:     ProgressMap
// =====================================================================

const K_PROGRESS = 'ed:progress:v1';

class ProgressMap {
  static get() { try { return JSON.parse(localStorage.getItem(K_PROGRESS) || 'null'); } catch (e) { return null; } }
  static set(m) { try { localStorage.setItem(K_PROGRESS, JSON.stringify(m)); } catch (e) {} }
  static isPage() { return /#\/MyProgress/i.test(location.href) || !!qv('.myProgress__main'); }

  // URL de My Progress a partir del Home (id del curso en la clase del carrusel: BSslide--523991431)
  static url() {
    const el = qa('[class*="BSslide--"]')[0];
    const id = el && (el.className.match(/BSslide--(\d+)/) || [])[1];
    return id ? location.href.split('#')[0] + '#/MyProgress/Course/' + id + '/Unit/' : null;
  }
  static async ir() {
    const b = qa('a, button, div, span').filter(e => vis(e) && /^(my progress|mi progreso)$/i.test(txt(e)) && !e.children.length)[0];
    if (b) { click(b); if (await waitFor(() => this.isPage(), 6000, 300)) return true; }
    const u = this.url(); if (u) { location.href = u; return !!(await waitFor(() => this.isPage(), 8000, 300)); }
    return false;
  }

  static async leer() {
    await waitFor(() => qa('.myProgress__unitW').length > 0, 8000, 300);
    const num = (el, d = null) => { const m = txt(el).match(/(\d{1,3})/); return m ? +m[1] : d; };
    const unidades = [];
    for (const uw of qa('.myProgress__unitW')) {
      const u = { n: num(q('.myProgress__unitTitle', uw), 0), nombre: txt(q('.myProgress__unitName', uw)),
        completion: num(q('.myProgress__unitCompletionData', uw)), locked: !!q('.myProgress__unitHeader--locked, .myProgress__unitLock--locked', uw), lecciones: [] };
      if (!u.locked) {
        if (!qa('.myProgress__unitLesson', uw).length) {
          try { uw.scrollIntoView({ block: 'center' }); } catch (e) {}
          await press(q('.myProgress__unitHeaderIW', uw) || q('.myProgress__unitHeader', uw) || uw, () => qa('.myProgress__unitLesson', uw).length > 0, 3000);
        }
        for (const L of qa('.myProgress__unitLesson', uw)) {
          // NUEVO v21.15: la fila "Unit Test" viene con ng-hide (ng-show="unit.Metadata.UnitTest" falso) → esa unidad NO
          // tiene Unit Test. Antes se leía igual y el bot gastaba ~20 min por cuenta buscando 14 tests que no existen.
          if (L.classList.contains('ng-hide')) continue;
          const ts = txt(q('.myProgress__unitLesson_testScore', L)), m = ts.match(/(\d{1,3})\s*%/);
          const pasos = qa('.myProgress__unitLesson_step', L), hechos = pasos.filter(p => q('.myProgress__unitLesson_stepProgressIW--done', p)).length;
          const estado = txt(q('.myProgress__unitLesson_statusLabel', L));
          u.lecciones.push({ n: num(q('.myProgress__unitLesson_number', L), 0), nombre: txt(q('.myProgress__unitLesson_name', L)),
            test: m ? +m[1] : (/no test|sin (test|prueba)|no hay/i.test(ts) ? 'sin' : null),
            terminado: /terminad|complet|done|finaliz/i.test(estado) || (pasos.length > 0 && hechos === pasos.length), pasos: pasos.length, hechos });
        }
      }
      unidades.push(u);
    }
    const w = { completion: num(q('.home__studentWidgetCompletion .home__studentWidgetData, #home__studentWidgetCompletionData')), avg: num(q('.home__studentWidgetTestScores .home__studentWidgetData, #home__studentWidgetTestScoresData')) };
    // NUEVO v21.15: "21 : 30 Hrs. Mins. Time on Task" y "80 % Final Test" del encabezado de My Progress (texto real del 02/11)
    { const T = (document.body && document.body.innerText) || '', mt = T.match(/(\d{1,4})\s*:\s*(\d{1,2})\s*Hrs\.?\s*Mins\.?\s*Time on Task/i), mf = T.match(/(\d{1,3})\s*%\s*Final Test/i);
      if (mt) w.tiempo = { h: +mt[1], m: +mt[2] }; if (mf) w.finalTest = +mf[1]; }
    const mapa = { fecha: new Date().toISOString(), widgets: w, unidades };
    this.set(mapa);
    const bajos = this.testsBajos(mapa), pend = this.leccionesPendientes(mapa);
    log('🗺️ My Progress leído:', unidades.length, 'unidades ·', pend.length, 'lecciones sin terminar ·', bajos.length, 'tests < 100',
      bajos.length ? '→ ' + bajos.map(b => `U${b.unidad} L${b.leccion} (${b.test} %)`).join(', ') : '');
    return mapa;
  }

  static testsBajos(m = this.get()) {
    return !m ? [] : m.unidades.flatMap(u => u.lecciones.filter(l => typeof l.test === 'number' && l.test < 100).map(l => ({ unidad: u.n, leccion: l.n, nombre: l.nombre, test: l.test })));
  }
  static leccionesPendientes(m = this.get()) {
    return !m ? [] : m.unidades.filter(u => !u.locked).flatMap(u => u.lecciones.filter(l => !l.terminado).map(l => ({ unidad: u.n, leccion: l.n, nombre: l.nombre })));
  }
  // ¿El test de esta lección quedó < 100 según My Progress? (permite rehacerlo aunque ED lo marque terminado)
  static testBajo(unidad, leccion) { return this.testsBajos().some(b => b.unidad === unidad && b.leccion === leccion); }
}
