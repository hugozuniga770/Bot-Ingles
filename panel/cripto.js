/* =====================================================================
   panel/cripto.js — la parte de seguridad del panel (NUEVO v21.16)
   ---------------------------------------------------------------------
   1) TU CLAVE protege el token de GitHub en el teléfono: PBKDF2-SHA256 (600 000 vueltas) → AES-GCM 256.
      En el teléfono solo queda el token CIFRADO; sin tu clave no sirve (ni para otra página de github.io).
   2) "Sealed box" de libsodium para mandarle a GitHub una cuenta nueva (usuario + contraseña) como secret:
      GitHub exige cifrarla con la llave pública del repo; nadie (ni este panel) la puede volver a leer.
      = tweetnacl (nacl.box) + BLAKE2b (aquí abajo, RFC 7693) para el nonce, igual que crypto_box_seal.
   Comprobado: lo que cifra este archivo lo abre libsodium (PyNaCl SealedBox) — tools/panel-prueba/probar.js.
   ===================================================================== */
'use strict';
(function (G) {
  const te = new TextEncoder(), td = new TextDecoder();
  const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); };
  const deB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const unir = (...xs) => { const o = new Uint8Array(xs.reduce((n, x) => n + x.length, 0)); let k = 0; for (const x of xs) { o.set(x, k); k += x.length; } return o; };

  // ---------- BLAKE2b (RFC 7693), solo lo necesario: sin llave, salida de 1 a 64 bytes ----------
  const M64 = (1n << 64n) - 1n;
  const IV = [0x6a09e667f3bcc908n, 0xbb67ae8584caa73bn, 0x3c6ef372fe94f82bn, 0xa54ff53a5f1d36f1n, 0x510e527fade682d1n, 0x9b05688c2b3e6c1fn, 0x1f83d9abfb41bd6bn, 0x5be0cd19137e2179n];
  const SIGMA = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3], [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
    [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8], [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13], [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
    [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11], [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10], [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
    [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0]];
  const rotr = (x, n) => ((x >> BigInt(n)) | (x << BigInt(64 - n))) & M64;
  function blake2b(datos, nSalida) {
    const h = IV.slice(); h[0] ^= 0x01010000n ^ BigInt(nSalida);
    const bloques = Math.max(1, Math.ceil(datos.length / 128));
    let t = 0n;
    for (let b = 0; b < bloques; b++) {
      const ult = b === bloques - 1, ini = b * 128, fin = Math.min(datos.length, ini + 128);
      const blq = new Uint8Array(128); blq.set(datos.subarray(ini, fin));
      t += BigInt(fin - ini);
      const m = []; for (let i = 0; i < 16; i++) { let w = 0n; for (let j = 7; j >= 0; j--) w = (w << 8n) | BigInt(blq[i * 8 + j]); m.push(w); }
      const v = [...h, ...IV]; v[12] ^= t & M64; v[13] ^= t >> 64n; if (ult) v[14] ^= M64;
      const Gf = (a, b2, c, d, x, y) => { v[a] = (v[a] + v[b2] + x) & M64; v[d] = rotr(v[d] ^ v[a], 32); v[c] = (v[c] + v[d]) & M64; v[b2] = rotr(v[b2] ^ v[c], 24);
        v[a] = (v[a] + v[b2] + y) & M64; v[d] = rotr(v[d] ^ v[a], 16); v[c] = (v[c] + v[d]) & M64; v[b2] = rotr(v[b2] ^ v[c], 63); };
      for (let r = 0; r < 12; r++) { const s = SIGMA[r % 10];
        Gf(0, 4, 8, 12, m[s[0]], m[s[1]]); Gf(1, 5, 9, 13, m[s[2]], m[s[3]]); Gf(2, 6, 10, 14, m[s[4]], m[s[5]]); Gf(3, 7, 11, 15, m[s[6]], m[s[7]]);
        Gf(0, 5, 10, 15, m[s[8]], m[s[9]]); Gf(1, 6, 11, 12, m[s[10]], m[s[11]]); Gf(2, 7, 8, 13, m[s[12]], m[s[13]]); Gf(3, 4, 9, 14, m[s[14]], m[s[15]]); }
      for (let i = 0; i < 8; i++) h[i] ^= v[i] ^ v[i + 8];
    }
    const out = new Uint8Array(nSalida);
    for (let i = 0; i < nSalida; i++) out[i] = Number((h[i >> 3] >> BigInt(8 * (i & 7))) & 0xffn);
    return out;
  }

  // ---------- crypto_box_seal (lo que pide GitHub para crear un secret) ----------
  function sellar(texto, llavePublicaB64) {
    const nacl = G.nacl; if (!nacl) throw new Error('falta nacl-fast.min.js');
    const pk = deB64(llavePublicaB64), eph = nacl.box.keyPair();
    const nonce = blake2b(unir(eph.publicKey, pk), 24);
    const caja = nacl.box(te.encode(texto), nonce, pk, eph.secretKey);
    return b64(unir(eph.publicKey, caja));
  }

  // ---------- tu clave → AES-GCM (el token guardado en el teléfono) ----------
  const VUELTAS = 600000;
  async function llave(clave, sal, vueltas = VUELTAS) {
    const base = await crypto.subtle.importKey('raw', te.encode(clave), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: vueltas, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function cifrar(texto, clave) {
    const sal = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await llave(clave, sal), te.encode(texto)));
    return { v: 1, vueltas: VUELTAS, sal: b64(sal), iv: b64(iv), ct: b64(ct) };
  }
  async function descifrar(caja, clave) {   // clave equivocada → error (AES-GCM no abre)
    const k = await llave(clave, deB64(caja.sal), caja.vueltas || VUELTAS);
    return td.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(caja.iv) }, k, deB64(caja.ct)));
  }

  G.Cripto = { blake2b, sellar, cifrar, descifrar, b64, deB64 };
})(typeof window !== 'undefined' ? window : globalThis);
