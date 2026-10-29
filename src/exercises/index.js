// =====================================================================
//  EXERCISES INDEX — junta todos los solvers en PracticeSolver
// ---------------------------------------------------------------------
//  Antes PracticeSolver era UNA clase gigante; ahora cada tipo vive en su archivo.
//  DEPENDE DE: exercises/*.js
//  EXPONE:     PracticeSolver
// =====================================================================

// Une todas las clases de ejercicios en un solo objeto PracticeSolver.
// Dentro de cada método, `this` es PracticeSolver, así que this.placeDndMapping(),
// this.textInputs(), etc. siguen funcionando igual que cuando todo era una sola clase.
// Si dos archivos definen un método con el MISMO nombre, el bot se niega a arrancar
// (así un archivo nuevo nunca pisa en silencio a otro).
function mixStatics(...classes) {
  const target = class PracticeSolver {};
  for (const C of classes) {
    for (const k of Object.getOwnPropertyNames(C)) {
      if (k === 'length' || k === 'name' || k === 'prototype') continue;
      if (Object.prototype.hasOwnProperty.call(target, k)) throw new Error('ED_DUPLICATE_SOLVER_METHOD: ' + k + ' (' + C.name + ')');
      Object.defineProperty(target, k, Object.getOwnPropertyDescriptor(C, k));
    }
  }
  return target;
}

// PARA AÑADIR UN TIPO NUEVO: crea exercises/mi-tipo.js con `class MiTipoSolver { static async solveMiTipo() {...} }`,
// agrégalo en build.js (lista ORDEN, antes de este archivo) y aquí abajo.
const PracticeSolver = mixStatics(
  WritingSolver,
  SelectTextSolver,
  SequenceSolver,
  DnDSolver,
  MCQSolver,
  FITBSolver,
  TextSolver,
  MediaSolver,
  SpeakingSolver
);
