import { endpoint, methodAllowed, checkOrigin, parseBody, uuidPattern, anonymousHash, networkKey, browserFamily, HttpError } from '../server/security.js';
import { rpc, rateLimit } from '../server/db.js';

export default endpoint(async (req, res) => {
  methodAllowed(req, res, ['POST']); checkOrigin(req);
  if (req.headers.dnt === '1') return res.status(202).json({ recorded: false });
  const body = parseBody(req);
  if (!uuidPattern.test(body.visitorId) || !uuidPattern.test(body.eventId) || body.path !== '/') throw new HttpError(400, 'Visita inválida.');
  const browser = browserFamily(req.headers['user-agent']);
  if (!browser) return res.status(202).json({ recorded: false });
  const visitor = anonymousHash(`visitor:${body.visitorId.toLowerCase()}`);
  await rateLimit(`visit:network:${networkKey(req)}`, 180, 60);
  await rateLimit(`visit:visitor:${visitor}`, 120, 60);
  const rawCountry = process.env.VERCEL === '1' ? String(req.headers['x-vercel-ip-country'] || '').toUpperCase() : '';
  const country = /^[A-Z]{2}$/.test(rawCountry) && !['XX', 'ZZ'].includes(rawCountry) ? rawCountry : null;
  const recorded = await rpc('epm_record_visit', { p_event_id: body.eventId, p_visitor_hash: visitor, p_path: body.path, p_browser: browser, p_country: country });
  return res.status(202).json({ recorded });
});
