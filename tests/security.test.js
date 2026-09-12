import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { hashPassword, verifyPassword, createSession, readSession, sessionCookie, checkOrigin, browserFamily, parseBody, anonymousHash } from '../server/security.js';
import auth from '../api/auth.js';
import stats from '../api/stats.js';
import visit from '../api/visit.js';

process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD_HASH = hashPassword('test-only-password');
process.env.SESSION_SECRET = 'test-session-secret-with-at-least-32-characters';
process.env.ANALYTICS_SECRET = 'test-analytics-secret-with-at-least-32-characters';
process.env.APP_ORIGIN = 'https://example.test';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'sb_secret_TEST_ONLY';
delete process.env.VERCEL;

function request(method, url, body) { return { method, url, body, headers: { origin: process.env.APP_ORIGIN, 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0 Chrome/128.0 Safari/537.36' }, socket: { remoteAddress: '127.0.0.1' } }; }
async function invoke(handler, req) {
  const response = { statusCode: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  await handler(req, response); return response;
}
test('contraseña hasheada: válida, inválida y hash malformado', () => {
  assert.equal(verifyPassword('test-only-password', process.env.ADMIN_PASSWORD_HASH), true);
  assert.equal(verifyPassword('incorrecta', process.env.ADMIN_PASSWORD_HASH), false);
  assert.throws(() => verifyPassword('x', 'malformed'));
});
test('sesión firmada: expiración, manipulación y rotación de credenciales', () => {
  const now = Date.now(); const token = createSession(now); const req = { headers: { cookie: `epm_admin=${token}` } };
  assert.equal(readSession(req, now).role, 'admin');
  assert.equal(readSession(req, now + 8 * 3600000), null);
  assert.equal(readSession({ headers: { cookie: `epm_admin=x${token}` } }), null);
  const original = process.env.ADMIN_PASSWORD_HASH; process.env.ADMIN_PASSWORD_HASH = hashPassword('changed-password');
  assert.equal(readSession(req), null); process.env.ADMIN_PASSWORD_HASH = original;
});
test('cookie HttpOnly, SameSite y Secure en Vercel', () => {
  process.env.VERCEL = '1'; assert.match(sessionCookie('token'), /HttpOnly; SameSite=Strict/); assert.match(sessionCookie('token'), /; Secure$/); assert.match(sessionCookie(), /Max-Age=0/); delete process.env.VERCEL;
});
test('origen obligatorio y protección CSRF', () => {
  assert.doesNotThrow(() => checkOrigin(request('POST', '/api/visit', {})));
  assert.throws(() => checkOrigin({ headers: { origin: 'https://attacker.test' } }));
  assert.throws(() => checkOrigin({ headers: {} }));
  assert.throws(() => checkOrigin({ headers: { origin: process.env.APP_ORIGIN, 'sec-fetch-site': 'cross-site' } }));
});
test('rechaza contenido inválido y payloads excesivos', () => {
  assert.throws(() => parseBody(request('POST', '/', '{broken')));
  assert.throws(() => parseBody(request('POST', '/', { text: 'a'.repeat(5000) })));
  assert.throws(() => parseBody({ headers: { 'content-type': 'text/plain' }, body: '{}' }));
});
test('navegadores comunes, iOS y robots', () => {
  assert.equal(browserFamily('Mozilla Edg/123 Chrome/123 Safari/123'), 'Edge');
  assert.equal(browserFamily('Mozilla CriOS/123 Safari/123'), 'Chrome');
  assert.equal(browserFamily('Mozilla FxiOS/123 Safari/123'), 'Firefox');
  assert.equal(browserFamily('Mozilla Safari/123'), 'Safari');
  assert.equal(browserFamily('Googlebot/2.1'), null);
});
test('identificador persistido es un HMAC estable, no el UUID original', () => {
  const id = randomUUID(); assert.equal(anonymousHash(id), anonymousHash(id)); assert.equal(anonymousHash(id).length, 64); assert.ok(!anonymousHash(id).includes(id));
});
test('estadísticas requieren una sesión válida antes de tocar Supabase', async () => {
  const result = await invoke(stats, request('GET', '/api/stats'));
  assert.equal(result.statusCode, 401); assert.match(result.headers['Cache-Control'], /no-store/);
});
test('login, credenciales incorrectas, logout y consulta autenticada', async t => {
  t.mock.method(globalThis, 'fetch', async (url) => new Response(JSON.stringify(String(url).includes('epm_stats') ? { summary: { totalViews: 7 } } : true), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  assert.equal((await invoke(auth, request('POST', '/api/auth', { username: 'admin', password: 'incorrecta' }))).statusCode, 401);
  const login = await invoke(auth, request('POST', '/api/auth', { username: 'admin', password: 'test-only-password' }));
  assert.equal(login.statusCode, 200); assert.ok(login.headers['Set-Cookie']); assert.equal(JSON.stringify(login.body).includes('secret'), false);
  const req = request('GET', '/api/stats?range=7d'); req.headers.cookie = login.headers['Set-Cookie'].split(';')[0];
  const result = await invoke(stats, req); assert.equal(result.statusCode, 200); assert.equal(result.body.summary.totalViews, 7);
  req.url = '/api/stats?range=invalid'; assert.equal((await invoke(stats, req)).statusCode, 400);
  const logout = await invoke(auth, request('DELETE', '/api/auth')); assert.match(logout.headers['Set-Cookie'], /Max-Age=0/);
});
test('visitas: valida, anonimiza, descarta país suministrado por el cliente', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => { calls.push({ url: String(url), body: JSON.parse(options.body) }); return new Response('true', { status: 200, headers: { 'Content-Type': 'application/json' } }); });
  const visitorId = randomUUID(); const req = request('POST', '/api/visit', { visitorId, eventId: randomUUID(), path: '/', country: 'US' });
  req.headers['x-vercel-ip-country'] = 'US';
  const response = await invoke(visit, req); assert.equal(response.statusCode, 202);
  const recorded = calls.find(c => c.url.includes('epm_record_visit')).body;
  assert.equal(recorded.p_country, null); assert.equal(recorded.p_browser, 'Chrome'); assert.match(recorded.p_visitor_hash, /^[a-f0-9]{64}$/); assert.ok(!JSON.stringify(calls).includes(visitorId)); assert.ok(!JSON.stringify(calls).includes('127.0.0.1'));
  req.body.path = '/admin/estadisticas'; assert.equal((await invoke(visit, req)).statusCode, 400);
});
test('país de Vercel, Do Not Track, bots y rate limit', async t => {
  let parameters; let blocked = false;
  t.mock.method(globalThis, 'fetch', async (url, options) => { if (String(url).includes('epm_record_visit')) parameters = JSON.parse(options.body); return new Response(JSON.stringify(!blocked), { status: 200, headers: { 'Content-Type': 'application/json' } }); });
  const req = request('POST', '/api/visit', { visitorId: randomUUID(), eventId: randomUUID(), path: '/' });
  process.env.VERCEL = '1'; req.headers['x-vercel-ip-country'] = 'AR';
  assert.equal((await invoke(visit, req)).statusCode, 202); assert.equal(parameters.p_country, 'AR'); delete process.env.VERCEL;
  req.headers.dnt = '1'; assert.equal((await invoke(visit, req)).body.recorded, false); delete req.headers.dnt;
  req.headers['user-agent'] = 'Googlebot'; assert.equal((await invoke(visit, req)).body.recorded, false);
  req.headers['user-agent'] = 'Safari/123'; blocked = true; assert.equal((await invoke(visit, req)).statusCode, 429);
});
