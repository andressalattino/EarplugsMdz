import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
export function required(name, min = 1) {
  const value = process.env[name];
  if (!value || !value.trim()) throw new HttpError(503, `Configuración incompleta: falta ${name} en el servidor.`);
  if (value.trim().length < min) throw new HttpError(503, `Configuración incompleta: ${name} debe tener al menos ${min} caracteres.`);
  return value;
}
export function secureEqual(a, b) {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password, stored) {
  if (!/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(stored)) throw new HttpError(503, 'Configuración incompleta: ADMIN_PASSWORD_HASH debe contener el hash scrypt completo, no la contraseña.');
  return secureEqual(hashPassword(password, stored.split(':')[1]), stored);
}
function sign(value) { return createHmac('sha256', required('SESSION_SECRET', 32)).update(value).digest('base64url'); }
export function createSession(now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp: Math.floor(now / 1000) + 8 * 3600, version: sign(required('ADMIN_PASSWORD_HASH')), nonce: randomBytes(16).toString('hex') })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}
export function readSession(req, now = Date.now()) {
  const cookie = String(req.headers.cookie || '').split(';').map(c => c.trim()).find(c => c.startsWith('epm_admin='));
  if (!cookie || cookie.length > 2048) return null;
  const token = cookie.slice('epm_admin='.length);
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra || !secureEqual(sign(payload), signature)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (claims.role !== 'admin' || !Number.isFinite(claims.exp) || claims.exp <= now / 1000 || !secureEqual(claims.version || '', sign(required('ADMIN_PASSWORD_HASH')))) return null;
    return claims;
  } catch { return null; }
}
export function sessionCookie(token = '') {
  const secure = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  return `epm_admin=${token}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${token ? 8 * 3600 : 0}${secure ? '; Secure' : ''}`;
}
export function requireAdmin(req) { if (!readSession(req)) throw new HttpError(401, 'Iniciá sesión para ver las estadísticas.'); }
export function checkOrigin(req) {
  // El dominio lo proporciona Vercel; nunca se acepta un Host enviado por el cliente.
  const productionDomain = process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'production' ? process.env.VERCEL_PROJECT_PRODUCTION_URL : null;
  const origins = [process.env.APP_ORIGIN, process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`, process.env.VERCEL_BRANCH_URL && `https://${process.env.VERCEL_BRANCH_URL}`, productionDomain && `https://${productionDomain}`].filter(Boolean).map(v => v.trim().replace(/\/$/, ''));
  if (!origins.length) throw new HttpError(503, 'Falta configurar el origen de la aplicación.');
  if (!origins.includes(req.headers.origin)) throw new HttpError(403, 'Origen no permitido. Revisá APP_ORIGIN en el despliegue activo.');
  if (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site'])) throw new HttpError(403, 'Origen no permitido.');
}
export function parseBody(req) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new HttpError(415, 'Se requiere JSON.');
  if (Number(req.headers['content-length'] || 0) > 4096) throw new HttpError(413, 'Solicitud demasiado grande.');
  let value = req.body;
  if (typeof value === 'string' || Buffer.isBuffer(value)) {
    if (Buffer.byteLength(value) > 4096) throw new HttpError(413, 'Solicitud demasiado grande.');
    try { value = JSON.parse(value.toString()); } catch { throw new HttpError(400, 'JSON inválido.'); }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value) || Buffer.byteLength(JSON.stringify(value)) > 4096) throw new HttpError(400, 'Solicitud inválida.');
  return value;
}
export function anonymousHash(value) { return createHmac('sha256', required('ANALYTICS_SECRET', 32)).update(value).digest('hex'); }
export function networkKey(req) {
  // Vercel provee este encabezado. La IP solo se usa en memoria y nunca se persiste.
  const address = process.env.VERCEL === '1' ? String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim() : (req.socket?.remoteAddress || 'local');
  return anonymousHash(`rate:${new Date().toISOString().slice(0, 10)}:${address}`);
}
export function browserFamily(userAgent = '') {
  const ua = String(userAgent).slice(0, 512);
  if (/bot|spider|crawler|headless|lighthouse|preview|facebookexternalhit|curl|wget/i.test(ua)) return null;
  if (/Edg\/|EdgA\/|EdgiOS\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet';
  if (/Firefox\/|FxiOS\//.test(ua)) return 'Firefox';
  if (/Chrome\/|CriOS\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Otro';
}
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function endpoint(handler) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try { await handler(req, res); }
    catch (error) {
      if (!(error instanceof HttpError)) console.error('Fallo del servicio EarplugsMdz', { code: error?.code || 'INTERNAL' });
      res.status(error.status || 503).json({ error: error instanceof HttpError ? error.message : 'No pudimos completar la solicitud. Intentá nuevamente.' });
    }
  };
}
export function methodAllowed(req, res, allowed) {
  if (!allowed.includes(req.method)) { res.setHeader('Allow', allowed.join(', ')); throw new HttpError(405, 'Método no permitido.'); }
}
