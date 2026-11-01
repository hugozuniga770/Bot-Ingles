#!/usr/bin/env python3
"""analizar-registro.py — resume salida/registro.txt de una corrida en la nube (lo que antes se hacía a mano).
Uso:  python3 tools/analizar-registro.py registro.txt [reporte.txt]
Muestra: duración, cuántas veces cargó el bot, acciones más frecuentes, eventos clave (unidades, tests, sesión,
fallos anotados), BUCLES (la misma acción muchas veces seguidas = atasco) y el final del registro."""
import re, sys, json, collections
L = open(sys.argv[1], encoding='utf8', errors='replace').read().split('\n')
horas = [l[1:9] for l in L if re.match(r'\[\d\d:\d\d:\d\d\]', l)]
print(f'== Duración: {horas[0]} → {horas[-1]} · {len(L)} líneas · el bot se cargó {sum("cargado con éxito" in l for l in L)} veces')
acc = [(l[1:9], m.group(1)) for l in L for m in [re.search(r'"did":"([^"]+)"', l)] if m]
print('\n== Acciones más frecuentes:')
for k, v in collections.Counter(a for _, a in acc).most_common(20): print(f'  {v:6}  {k}')
print('\n== Bucles (misma acción ≥ 25 veces seguidas = posible atasco):')
i = 0
while i < len(acc):
    j = i
    while j + 1 < len(acc) and acc[j + 1][1] == acc[i][1]: j += 1
    if j - i + 1 >= 25: print(f'  {acc[i][0]} → {acc[j][0]}  {j - i + 1}× {acc[i][1]}')
    i = j + 1
print('\n== Bloques de 10 min SIN AVANCE (muchas acciones, ≤ 3 tipos, sin tests/unidades nuevas) = atasco:')
avance = re.compile(r'test_passed_100|completar_abre_unidad|sweep_open_unit|_solved|media_played|task_already_done_next')
bloques = collections.OrderedDict()
for h, a in acc: bloques.setdefault(h[:4], []).append(a)   # "HH:M" = bloque de 10 minutos
for b, xs in bloques.items():
    tipos = collections.Counter(xs)
    if len(xs) >= 40 and len(tipos) <= 3 and not any(avance.search(t) for t in tipos):
        print(f'  {b}0–{b}9  {len(xs)} acciones: ' + ', '.join(f'{v}× {k}' for k, v in tipos.most_common(3)))
print('\n== Eventos clave (sin repetidos):')
clave = re.compile(r'Unidad|unidad|Course Completion|My Progress|COMPLETAR|BARRIDO|Test < 100|sin 100|sesi[oó]n|Sesi[oó]n|cerró|Anotado|Recargo|Atasco|Pasé|Login on This|No pude|Error|test_passed_100|Aviso de test|ya terminado')
vistos = set()
for l in L:
    if clave.search(l):
        k = re.sub(r'^\[\d\d:\d\d:\d\d\] |#\d+ ', '', l)[:140]
        if k not in vistos: vistos.add(k); print('  ' + l[:180])
print('\n== Últimas 15 líneas:'); [print('  ' + l[:200]) for l in L[-15:]]
if len(sys.argv) > 2:
    t = open(sys.argv[2], encoding='utf8').read(); print('\n== Reporte de fallos:\n' + t.split('--- DETALLE')[0])
