import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const root = new URL('..', import.meta.url).pathname;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };
const port = Number(process.env.PORT || 8765);
http.createServer(async (req, res) => {
  const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const f = join(root, p.endsWith('/') ? p + 'index.html' : p);
  if (!f.startsWith(root)) { res.writeHead(403).end(); return; }
  try { const b = await readFile(f); res.writeHead(200, { 'content-type': types[extname(f)] ?? 'application/octet-stream' }).end(b); } catch { res.writeHead(404).end('not found'); }
}).listen(port, '127.0.0.1', () => console.log('http://127.0.0.1:' + port));
