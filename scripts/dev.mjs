// Desarrollo local: sirve Vite y ejecuta los mismos handlers que Vercel.
// En producción solo se despliegan /api/*.js; este proceso no se usa.
import { createServer as createHttpServer } from 'node:http';
import { createServer as createViteServer } from 'vite';
import auth from '../api/auth.js';
import visit from '../api/visit.js';
import stats from '../api/stats.js';
const port = Number(process.env.PORT || 5173);
process.env.APP_ORIGIN ||= `http://localhost:${port}`;
const vite = await createViteServer({ server: { middlewareMode: true, hmr: { port: port + 1 } }, appType: 'mpa' });
const handlers = { '/api/auth': auth, '/api/visit': visit, '/api/stats': stats };
const server = createHttpServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname.startsWith('/api/')) {
    res.status = code => { res.statusCode = code; return res; };
    res.json = value => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(value)); };
    const handler = handlers[pathname];
    if (!handler) return res.status(404).json({ error: 'Ruta no encontrada.' });
    const chunks = []; let length = 0;
    for await (const chunk of req) { length += chunk.length; if (length > 4096) return res.status(413).json({ error: 'Solicitud demasiado grande.' }); chunks.push(chunk); }
    req.body = Buffer.concat(chunks).toString();
    return handler(req, res);
  }
  if (pathname === '/admin' || pathname === '/admin/estadisticas') req.url = '/admin.html';
  vite.middlewares(req, res);
});
server.listen(port, '127.0.0.1', () => console.log(`EarplugsMdz: http://localhost:${port}\nAdmin: http://localhost:${port}/admin/estadisticas`));
async function close() { await vite.close(); server.close(); }
process.on('SIGTERM', close); process.on('SIGINT', close);
