// NUEVO v21.13 — GitHub API FALSA para tools/probar-nube.sh: recibe lo que el tablero publicaría en el issue
// (GET/POST/PATCH de comentarios) y lo anota en salida/api-falsa.log. No sale a internet.
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const LOG = path.join(__dirname, '..', '..', 'salida', 'api-falsa.log');
http.createServer((req, res) => {
  let body = ''; req.on('data', d => { body += d; });
  req.on('end', () => {
    try { fs.mkdirSync(path.dirname(LOG), { recursive: true }); fs.appendFileSync(LOG, `${req.method} ${req.url} ${req.headers.authorization ? 'con-token' : 'SIN-TOKEN'}\n${body ? JSON.parse(body).body.split('\n').slice(0, 14).join('\n') + '\n' : ''}----\n`); } catch (e) {}
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'GET') return res.end('[]');
    if (req.method === 'POST') return res.end('{"id":99}');
    res.end('{}');
  });
}).listen(8766);
