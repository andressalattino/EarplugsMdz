import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { validateProduct, decodePhoto } from '../server/catalog.js';
import { createSession, hashPassword } from '../server/security.js';
import products from '../api/products.js';
import upload from '../api/product-upload.js';

process.env.SUPABASE_URL = 'https://catalog-test.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'test-only-key';
process.env.APP_ORIGIN = 'https://example.test';
process.env.SESSION_SECRET = 'test-session-secret-with-at-least-32-characters';
process.env.ADMIN_PASSWORD_HASH = hashPassword('test-only');
const sample = () => ({ id: 'test-product', revision: 0, published: true, sortOrder: 0, product: { name: 'Cella nueva', series: 'Serie 8', price: 21000, description: 'Descripción real.', variants: [{ name: 'Negro', swatch: '#303135' }], images: [{ src: '/images/cella-serie-6-colores.png', alt: 'Fotos', caption: 'Fotos' }] } });
function req(method, url, body, authenticated = true) { return { method, url, body, headers: { 'content-type': 'application/json', origin: process.env.APP_ORIGIN, ...(authenticated ? { cookie: `epm_admin=${createSession()}` } : {}) } }; }
async function invoke(handler, request) { const response = { headers: {}, setHeader(k,v) { this.headers[k] = v; }, status(n) { this.statusCode = n; return this; }, json(data) { this.body = data; return this; } }; await handler(request, response); return response; }

test('valida datos y limita fotos, colores, URLs y precios', () => {
  const valid = validateProduct(sample()); assert.equal(valid.data.price, 21000);
  assert.equal(valid.revision, 1); assert.equal(valid.data.variants[0].swatch, '#303135');
  for (const patch of [ { price: -1 }, { price: 3.5 }, { variants: [] }, { variants: [{ name: 'Rojo', swatch: 'url(javascript:bad)' }] }, { variants: Array(17).fill({ name: 'Negro', swatch: '#000000' }) }, { images: [{ src: 'javascript:alert(1)' }] }, { images: [{ src: 'https://other.supabase.co/storage/v1/object/public/epm-product-images/photo.png' }] }, { images: [] }, { images: Array(13).fill(sample().product.images[0]) } ]) {
    assert.throws(() => validateProduct({ ...sample(), product: { ...sample().product, ...patch } }));
  }
  assert.doesNotThrow(() => validateProduct({ ...sample(), published: false, product: { ...sample().product, images: [] } }));
});
test('todas las escrituras y la lista privada requieren sesión; CSRF antes de Supabase', async () => {
  for (const [handler, method, url] of [[products,'GET','/api/products?admin=1'], [products,'PUT','/api/products'], [upload,'POST','/api/product-upload']]) {
    assert.equal((await invoke(handler, req(method, url, sample(), false))).statusCode, 401);
  }
  const request = req('PUT','/api/products',sample()); request.headers.origin = 'https://evil.test';
  assert.equal((await invoke(products, request)).statusCode, 403);
});
test('lectura pública filtra borradores y no expone metadatos administrativos', async t => {
  const row = validateProduct(sample()); let url;
  t.mock.method(globalThis, 'fetch', async u => { url = String(u); return Response.json([row]); });
  const result = await invoke(products, req('GET','/api/products',undefined,false));
  assert.equal(result.statusCode, 200); assert.match(url, /published=eq.true/);
  assert.equal(result.body.products[0].revision, undefined); assert.equal(result.body.products[0].name, 'Cella nueva');
  const admin = await invoke(products, req('GET','/api/products?admin=1'));
  assert.ok(!url.includes('published=eq.true')); assert.equal(admin.body.products[0].revision, 1);
});
test('actualización usa versión y rechaza sobrescribir cambios concurrentes', async t => {
  let captured;
  t.mock.method(globalThis, 'fetch', async (url, options) => { captured = { url: String(url), options }; return Response.json([]); });
  const body = { ...sample(), revision: 4 };
  const result = await invoke(products, req('PUT', '/api/products', body));
  assert.equal(result.statusCode, 409); assert.match(captured.url, /revision=eq.4/);
  assert.equal(captured.options.method, 'PATCH'); assert.equal(JSON.parse(captured.options.body).revision, 5);
});
test('crea un borrador y publica una revisión con fotos, colores y precio nuevos', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const row = JSON.parse(options.body); calls.push({ method: options.method, row }); return Response.json([row]);
  });
  const body = { ...sample(), published: false };
  const draft = await invoke(products, req('PUT', '/api/products', body));
  assert.equal(draft.statusCode, 200); assert.equal(draft.body.product.published, false); assert.equal(draft.body.product.revision, 1);
  const published = await invoke(products, req('PUT', '/api/products', { ...body, published: true, revision: 1, product: { ...body.product, price: 22000, variants: [{ name: 'Azul', swatch: '#223366' }] } }));
  assert.equal(published.statusCode, 200); assert.equal(published.body.product.published, true); assert.equal(published.body.product.price, 22000); assert.equal(published.body.product.variants[0].name, 'Azul'); assert.equal(published.body.product.revision, 2);
  assert.deepEqual(calls.map(c => c.method), ['POST', 'PATCH']);
});
test('fotos rechazan SVG, texto y archivos excesivos', () => {
  assert.throws(() => decodePhoto({ base64: Buffer.from('<svg onload="alert(1)"></svg>').toString('base64') }));
  assert.throws(() => decodePhoto({ base64: Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64') }));
  const bytes = Buffer.from([137,80,78,71,13,10,26,10]); assert.equal(decodePhoto({ base64: bytes.toString('base64') }).mime, 'image/png');
});
test('carga autenticada usa bucket exclusivo y nombre aleatorio', async t => {
  let storageCall;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (String(url).includes('epm_rate_limit')) return Response.json(true);
    storageCall = { url: String(url), options }; return Response.json({ Key: 'photo' });
  });
  const base64 = Buffer.from([137,80,78,71,13,10,26,10]).toString('base64');
  const result = await invoke(upload, req('POST', '/api/product-upload', { base64 }));
  assert.equal(result.statusCode, 201); assert.match(result.body.src, /\/epm-product-images\/[a-f0-9-]{36}\.png$/);
  assert.equal(new Headers(storageCall.options.headers).get('x-upsert'), 'false');
});

let db;
before(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema storage; create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id int, bucket_id text); alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated; grant select,insert,update,delete on storage.objects to anon,authenticated;
    create policy other_project on storage.objects for all to anon,authenticated using(true) with check(true);`);
  const sql = await readFile(new URL('../supabase/catalog.sql', import.meta.url), 'utf8'); await db.exec(sql); await db.exec(sql);
});
after(async () => { await db?.close(); });
test('migración conserva productos, aplica RLS y aísla Storage de otras políticas', async () => {
  assert.equal((await db.query('select * from public.epm_products')).rows.length, 2);
  await db.exec("update public.epm_products set revision=7 where id='cella-serie-1'");
  await db.exec(await readFile(new URL('../supabase/catalog.sql', import.meta.url), 'utf8'));
  assert.equal((await db.query("select revision from public.epm_products where id='cella-serie-1'")).rows[0].revision, 7);
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    await assert.rejects(db.query('select * from public.epm_products'), /permission denied/);
    await assert.rejects(db.query("insert into storage.objects values (1,'epm-product-images')"), /row-level security/);
    await db.query("insert into storage.objects values (2,'another-project')");
    await db.exec('reset role');
  }
  await db.exec('grant select on public.epm_products to anon; set role anon');
  assert.equal((await db.query('select * from public.epm_products')).rows.length, 0);
  await db.exec('reset role; revoke select on public.epm_products from anon; set role service_role');
  assert.equal((await db.query('select * from public.epm_products')).rows.length, 2);
  await db.exec('reset role');
});
