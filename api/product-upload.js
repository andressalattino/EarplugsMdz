import { randomUUID } from 'node:crypto';
import { endpoint, methodAllowed, requireAdmin, checkOrigin, parseBody } from '../server/security.js';
import { database, rateLimit } from '../server/db.js';
import { bucketName, decodePhoto } from '../server/catalog.js';

export default endpoint(async (req, res) => {
  methodAllowed(req, res, ['POST']); requireAdmin(req); checkOrigin(req);
  const photo = decodePhoto(parseBody(req, 3 * 1024 * 1024));
  await rateLimit('catalog:uploads', 60, 3600);
  const storage = database().storage.from(bucketName);
  const path = `${randomUUID()}.${photo.extension}`;
  const { error } = await storage.upload(path, photo.bytes, { contentType: photo.mime, cacheControl: '31536000', upsert: false });
  if (error) throw error;
  return res.status(201).json({ src: storage.getPublicUrl(path).data.publicUrl });
});
