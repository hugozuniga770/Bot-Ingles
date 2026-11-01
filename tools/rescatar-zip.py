#!/usr/bin/env python3
"""rescatar-zip.py — saca los archivos de un zip CORTADO (subida incompleta: "End-of-central-directory not found").
Uso:  python3 tools/rescatar-zip.py cuenta-2.zip carpeta_destino
Lee cada cabecera local (PK\\x03\\x04) y descomprime lo que haya, aunque falte el final del zip.
Así se recuperó el zip de la corrida de Nelson (01/11): 6 de 6 archivos completos."""
import struct, zlib, sys, os
src, dst = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else 'rescatado')
os.makedirs(dst, exist_ok=True)
d = open(src, 'rb').read(); pos = 0
while True:
    i = d.find(b'PK\x03\x04', pos)
    if i < 0: break
    (_, _, flag, meth, _, _, _, csz, usz, fnl, exl) = struct.unpack('<IHHHHHIIIHH', d[i:i+30])
    name = d[i+30:i+30+fnl].decode('utf8', 'replace'); start = i + 30 + fnl + exl
    try:
        data = zlib.decompressobj(-15).decompress(d[start:start+csz] if csz else d[start:]) if meth == 8 else d[start:start+(csz or usz)]
        open(os.path.join(dst, name.replace('/', '_')), 'wb').write(data)
        print(f'{name:30} {len(data):>9} bytes')
    except Exception as e:
        print(name, 'ERROR', e)
    pos = start + max(csz, 1)
