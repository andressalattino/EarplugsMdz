import { endpoint, methodAllowed, checkOrigin, parseBody, required, secureEqual, verifyPassword, createSession, readSession, sessionCookie, networkKey, HttpError } from '../server/security.js';
import { rateLimit } from '../server/db.js';

export default endpoint(async (req, res) => {
  methodAllowed(req, res, ['GET', 'POST', 'DELETE']);
  if (req.method === 'GET') return res.status(200).json({ authenticated: Boolean(readSession(req)) });
  checkOrigin(req);
  if (req.method === 'DELETE') { res.setHeader('Set-Cookie', sessionCookie()); return res.status(200).json({ ok: true }); }
  const body = parseBody(req);
  if (typeof body.username !== 'string' || typeof body.password !== 'string' || body.username.length > 64 || body.password.length > 256) throw new HttpError(400, 'Ingresá usuario y contraseña.');
  await rateLimit(`login:${networkKey(req)}`, 10, 900);
  await rateLimit('login:global', 150, 900);
  const passwordOK = verifyPassword(body.password, required('ADMIN_PASSWORD_HASH'));
  const usernameOK = secureEqual(body.username, required('ADMIN_USERNAME'));
  if (!passwordOK || !usernameOK) throw new HttpError(401, 'Usuario o contraseña incorrectos.');
  res.setHeader('Set-Cookie', sessionCookie(createSession()));
  return res.status(200).json({ authenticated: true });
});
