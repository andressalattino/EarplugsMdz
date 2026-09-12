import { endpoint, methodAllowed, requireAdmin, HttpError } from '../server/security.js';
import { rpc } from '../server/db.js';

export default endpoint(async (req, res) => {
  methodAllowed(req, res, ['GET']); requireAdmin(req);
  const range = new URL(req.url, 'http://local').searchParams.get('range') || '7d';
  if (!['today', '7d', '30d', 'all'].includes(range)) throw new HttpError(400, 'Período inválido.');
  return res.status(200).json(await rpc('epm_stats', { p_range: range }));
});
