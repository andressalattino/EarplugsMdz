import { endpoint, methodAllowed, requireAdmin, checkOrigin, parseBody, HttpError } from '../server/security.js';
import { database } from '../server/db.js';
import { validateProduct, serializeProduct, catalogError } from '../server/catalog.js';

export default endpoint(async (req, res) => {
  methodAllowed(req, res, ['GET', 'PUT']);
  const admin = new URL(req.url, 'http://local').searchParams.get('admin') === '1';
  if (req.method === 'GET') {
    if (admin) requireAdmin(req);
    let query = database().from('epm_products').select('*').order('sort_order').order('id');
    if (!admin) query = query.eq('published', true);
    // Supabase pagina a 1000 por defecto. Consultamos todas las páginas explícitamente.
    const products = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await query.range(offset, offset + 499);
      if (error) catalogError(error);
      products.push(...data.map(row => serializeProduct(row, admin)));
      if (data.length < 500) break;
    }
    return res.status(200).json({ products });
  }
  requireAdmin(req); checkOrigin(req);
  const body = parseBody(req, 32768);
  const row = validateProduct(body);
  const db = database();
  const query = body.revision === 0
    ? db.from('epm_products').insert(row)
    : db.from('epm_products').update(row).eq('id', row.id).eq('revision', body.revision);
  const { data, error } = await query.select('*').maybeSingle();
  if (error?.code === '23505' || (!error && !data)) throw new HttpError(409, 'Otra sesión modificó este producto. Recargá el catálogo antes de guardar. Tus cambios siguen en el formulario.');
  if (error) catalogError(error);
  return res.status(200).json({ product: serializeProduct(data, true) });
});
