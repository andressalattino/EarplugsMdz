import { HttpError, required } from './security.js';

export const bucketName = 'epm-product-images';
export const productIdPattern = /^[a-z0-9][a-z0-9-]{0,79}$/;
const originalPhotos = new Set(['cella-serie-1-colores.png', 'cella-serie-6-colores.png', 'cella-serie-6-purple.png', 'cella-serie-6-detalle.png', 'cella-serie-6-estuches.png']);
function text(value, name, max, optional = false) {
  if (typeof value !== 'string' || value.trim().length > max || (!optional && !value.trim())) throw new HttpError(400, `Revisá ${name}.`);
  return value.trim();
}
export function validImageSource(src) {
  if (typeof src !== 'string') return false;
  if (src.startsWith('/images/') && originalPhotos.has(src.slice(8))) return true;
  const prefix = `${required('SUPABASE_URL').replace(/\/$/, '')}/storage/v1/object/public/${bucketName}/`;
  return src.startsWith(prefix) && /^[a-f0-9-]{36}\.(webp|png|jpg)$/.test(src.slice(prefix.length));
}
export function validateProduct(body) {
  if (!productIdPattern.test(body.id) || typeof body.id !== 'string') throw new HttpError(400, 'Identificador inválido.');
  if (!Number.isSafeInteger(body.revision) || body.revision < 0) throw new HttpError(400, 'Versión inválida.');
  if (typeof body.published !== 'boolean') throw new HttpError(400, 'Estado inválido.');
  if (!Number.isSafeInteger(body.sortOrder) || body.sortOrder < 0 || body.sortOrder > 9999) throw new HttpError(400, 'Orden inválido.');
  const p = body.product;
  if (!p || typeof p !== 'object') throw new HttpError(400, 'Producto inválido.');
  const result = { name: text(p.name, 'el nombre', 100), series: text(p.series, 'la serie', 60), description: text(p.description, 'la descripción', 1500), galleryNote: text(p.galleryNote ?? '', 'la nota de fotos', 300, true) };
  if (!Number.isSafeInteger(p.price) || p.price < 1 || p.price > 100000000) throw new HttpError(400, 'Ingresá un precio válido en pesos, sin centavos.');
  result.price = p.price;
  if (!Array.isArray(p.variants) || p.variants.length < 1 || p.variants.length > 16) throw new HttpError(400, 'Agregá entre 1 y 16 colores.');
  result.variants = p.variants.map((v, i) => {
    if (!v || !/^#[a-f0-9]{6}$/i.test(v.swatch)) throw new HttpError(400, 'Revisá las muestras de color.');
    return { id: `color-${i + 1}`, name: text(v.name, 'el nombre del color', 40), swatch: v.swatch.toLowerCase() };
  });
  if (new Set(result.variants.map(v => v.name.toLowerCase())).size !== result.variants.length) throw new HttpError(400, 'No repitas nombres de colores.');
  if (!Array.isArray(p.images) || p.images.length > 12 || (body.published && !p.images.length)) throw new HttpError(400, 'Usá hasta 12 fotos. Para publicar, agregá al menos una.');
  result.images = p.images.map(image => {
    if (!image || !validImageSource(image.src)) throw new HttpError(400, 'Una foto no pertenece al catálogo. Volvé a cargarla.');
    return { src: image.src, alt: text(image.alt || result.name, 'la descripción de foto', 200), caption: text(image.caption || result.name, 'el título de foto', 200) };
  });
  return { id: body.id, data: result, published: body.published, sort_order: body.sortOrder, revision: body.revision + 1 };
}
export function serializeProduct(row, admin = false) {
  const product = { ...row.data, id: row.id };
  return admin ? { ...product, published: row.published, sortOrder: row.sort_order, revision: row.revision } : product;
}
export function decodePhoto(body) {
  if (typeof body.base64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.base64)) throw new HttpError(400, 'Archivo de imagen inválido.');
  const bytes = Buffer.from(body.base64, 'base64');
  if (!bytes.length || bytes.length > 2 * 1024 * 1024) throw new HttpError(413, 'La foto debe ocupar menos de 2 MB después de optimizarla.');
  let type;
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) type = { mime: 'image/png', extension: 'png' };
  else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) type = { mime: 'image/jpeg', extension: 'jpg' };
  else if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') type = { mime: 'image/webp', extension: 'webp' };
  if (!type) throw new HttpError(415, 'Solo se permiten fotos JPG, PNG o WebP.');
  return { bytes, ...type };
}
export function catalogError(error) {
  if (['42P01', 'PGRST205'].includes(error?.code)) throw new HttpError(503, 'Falta activar el catálogo en Supabase: ejecutá supabase/catalog.sql.');
  throw error;
}
