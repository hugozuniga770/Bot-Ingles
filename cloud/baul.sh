#!/usr/bin/env bash
# =====================================================================
#  cloud/baul.sh — abre / guarda el BAÚL (rama "datos" del repo, cifrado) — NUEVO v21.19 (ver cloud/baul.js)
#    bash cloud/baul.sh abrir     → (job correr) trae el baúl y lo mezcla en banco/ (por si la caché ya no está)
#    bash cloud/baul.sh guardar   → (job juntar) mezcla banco/ con el baúl actual y lo sube (un solo commit, cifrado)
#  Si dos corridas guardan a la vez, la que llega segunda vuelve a leer, mezcla y reintenta (hasta 5 veces).
# =====================================================================
set -u
cmd="${1:-}"
traer() {   # deja el baúl actual en baul-previo.bin y su commit en BASE ("" si la rama todavía no existe)
  rm -f baul-previo.bin; BASE=""
  if git fetch -q --depth=1 origin datos 2>/dev/null; then
    BASE="$(git rev-parse FETCH_HEAD)"
    git show FETCH_HEAD:baul.bin > baul-previo.bin 2>/dev/null || rm -f baul-previo.bin
  fi
}
if [ -z "${ED_BAUL_LLAVE:-}" ]; then node cloud/baul.js abrir /no-existe banco; exit 0; fi
case "$cmd" in
  abrir)
    traer
    if [ -f baul-previo.bin ]; then node cloud/baul.js abrir baul-previo.bin banco; else echo "🧳 Baúl: todavía vacío (se llena al final de esta corrida)."; fi
    ;;
  guardar)
    export GIT_AUTHOR_NAME="github-actions[bot]" GIT_AUTHOR_EMAIL="41898282+github-actions[bot]@users.noreply.github.com"
    export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME" GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
    for i in 1 2 3 4 5; do
      traer
      [ -f baul-previo.bin ] && node cloud/baul.js abrir baul-previo.bin banco
      rm -f baul.bin; node cloud/baul.js cerrar banco baul.bin
      [ -f baul.bin ] || exit 0
      B1="$(git hash-object -w baul.bin)"
      B2="$(printf '%s\n' '# Baúl del bot (NO TOCAR)' '' 'baul.bin = lo que el bot aprendió por curso (respuestas de tests, catálogo de ejercicios, lo que aprendió el Explorador),' 'CIFRADO con el secret ED_BAUL_LLAVE. Nada de cada persona. Lo escribe solo la nube (job juntar); esta rama tiene siempre un único commit.' | git hash-object -w --stdin)"
      TREE="$(printf '100644 blob %s\tbaul.bin\n100644 blob %s\tLEEME.md\n' "$B1" "$B2" | git mktree)"
      C="$(git commit-tree "$TREE" -m "baúl $(date -u +%Y-%m-%dT%H:%MZ)")"
      if git push -q --force-with-lease="refs/heads/datos:${BASE}" origin "$C:refs/heads/datos"; then echo "🧳 Baúl guardado en la rama datos (vuelta $i)."; exit 0; fi
      echo "🧳 Otra corrida guardó el baúl justo ahora → vuelvo a leer y mezclo (vuelta $i)"; sleep $((i * 7))
    done
    echo "::warning::No pude guardar el baúl tras 5 intentos (queda en la caché; la próxima corrida lo intenta de nuevo)."
    ;;
  *) echo "uso: bash cloud/baul.sh abrir|guardar"; exit 1 ;;
esac
