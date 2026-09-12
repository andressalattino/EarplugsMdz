import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const origin = (process.argv[2] || process.env.APP_ORIGIN || '').replace(/\/$/, '');
if (!/^https?:\/\//.test(origin)) throw new Error('Uso: npm run check:deployment -- https://tu-dominio.com');
const stats = await fetch(`${origin}/api/stats?range=all`);
assert.equal(stats.status, 401, 'Las estadísticas deben rechazar solicitudes sin sesión.');
const payload = { visitorId: randomUUID(), eventId: randomUUID(), path: '/' };
const options = { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 Chrome/128.0 Safari/537.36' }, body: JSON.stringify(payload) };
const first = await fetch(`${origin}/api/visit`, options); assert.equal(first.status, 202, await first.clone().text()); assert.equal((await first.json()).recorded, true);
const retry = await fetch(`${origin}/api/visit`, options); assert.equal(retry.status, 202); assert.equal((await retry.json()).recorded, false, 'Un reintento del mismo evento no debe duplicarse.');
const foreign = await fetch(`${origin}/api/visit`, { ...options, headers: { ...options.headers, Origin: 'https://no-permitido.example' } }); assert.equal(foreign.status, 403);
console.log('OK: panel protegido, visita registrada, reintento sin duplicado y origen externo rechazado.');
console.log(`Se agregó UNA visita de prueba real. event_id: ${payload.eventId}`);
