import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

let db;
before(async () => {
  db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  const schema = await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
  await db.exec(schema); await db.exec(schema); // Migración idempotente.
});
after(async () => { await db?.close(); });
beforeEach(async () => { await db.exec('reset role; truncate public.epm_visits, public.epm_rate_limits;'); });
const scalar = async (sql, values = []) => (await db.query(sql, values)).rows[0].value;
const stats = async range => scalar('select public.epm_stats($1) as value', [range]);

test('esquema RLS y grants bloquean todas las operaciones públicas', async () => {
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    await assert.rejects(db.query('select * from public.epm_visits'), /permission denied/);
    await assert.rejects(db.query("select public.epm_stats('all')"), /permission denied/);
    await assert.rejects(db.query("select public.epm_rate_limit('x', 1, 1)"), /permission denied/);
    await assert.rejects(db.query('select public.epm_record_visit($1,$2,$3,$4,$5)', [randomUUID(), 'a'.repeat(64), '/', 'Chrome', 'AR']), /permission denied/);
    await db.exec('reset role');
  }
  await db.query('select public.epm_record_visit($1,$2,$3,$4,$5)', [randomUUID(), 'a'.repeat(64), '/', 'Chrome', 'AR']);
  await db.exec('grant select on public.epm_visits to anon; set role anon;');
  assert.equal((await db.query('select * from public.epm_visits')).rows.length, 0);
  await db.exec('reset role; revoke select on public.epm_visits from anon;');
});
test('service_role registra y consulta; mismo evento no duplica', async () => {
  await db.exec('set role service_role');
  const args = [randomUUID(), 'a'.repeat(64), '/', 'Chrome', 'AR'];
  const call = 'select public.epm_record_visit($1,$2,$3,$4,$5) as value';
  assert.equal(await scalar(call, args), true); assert.equal(await scalar(call, args), false);
  assert.equal((await stats('today')).summary.totalViews, 1);
});
test('conteos históricos, períodos, visitantes únicos y días sin visitas', async () => {
  for (const [i, days] of [0, 0, 6, 7, 29, 30].entries()) {
    await db.query("insert into public.epm_visits values ($1, now() - make_interval(days => $2), $3, '/', $4, $5)", [randomUUID(), days, (i < 2 ? 'a' : 'abcdef'[i]).repeat(64), i % 2 ? 'Safari' : 'Chrome', i % 2 ? null : 'AR']);
  }
  const week = await stats('7d');
  assert.deepEqual(week.summary, { totalViews: 6, uniqueVisitors: 5, today: 2, last7Days: 3, last30Days: 5 });
  assert.equal(week.filtered.views, 3); assert.equal(week.filtered.visitors, 2); assert.equal(week.daily.length, 7); assert.equal(week.daily.filter(d => d.views === 0).length, 5);
  assert.equal((await stats('today')).filtered.views, 2);
  assert.equal((await stats('30d')).filtered.views, 5);
  const all = await stats('all'); assert.equal(all.filtered.views, 6); assert.equal(all.daily.length, 31);
  assert.ok(all.countries.find(c => c.name === 'unknown')); assert.equal(all.browsers.length, 2);
});
test('límites de día usan Mendoza, sin confundir la fecha UTC', async () => {
  await db.query("insert into public.epm_visits values ($1, ((now() at time zone 'America/Argentina/Mendoza')::date::timestamp at time zone 'America/Argentina/Mendoza') - interval '1 minute', $2, '/', 'Chrome', null)", [randomUUID(), 'a'.repeat(64)]);
  assert.equal((await stats('today')).filtered.views, 0); assert.equal((await stats('7d')).filtered.views, 1);
});
test('agregados no se truncan al superar 1000 filas de Supabase', async () => {
  await db.exec("insert into public.epm_visits select gen_random_uuid(), now(), repeat('a',64), '/', 'Chrome', null from generate_series(1,1100)");
  const data = await stats('all'); assert.equal(data.summary.totalViews, 1100); assert.equal(data.summary.uniqueVisitors, 1);
});
test('sin datos devuelve ceros y serie temporal completa', async () => {
  const result = await stats('30d'); assert.equal(result.summary.totalViews, 0); assert.equal(result.daily.length, 30); assert.deepEqual(result.browsers, []); assert.deepEqual(result.countries, []);
});
test('rate limit persistente limita y permite luego de vencer', async () => {
  const call = "select public.epm_rate_limit('test',2,60) as value";
  assert.equal(await scalar(call), true); assert.equal(await scalar(call), true); assert.equal(await scalar(call), false);
  await db.exec("update public.epm_rate_limits set expires_at = now() - interval '1 second'");
  assert.equal(await scalar(call), true);
});
test('restricciones impiden datos fuera del contrato', async () => {
  await assert.rejects(db.query('select public.epm_record_visit($1,$2,$3,$4,$5)', [randomUUID(), 'invalid', '/', 'Chrome', 'AR']), /check constraint/);
  await assert.rejects(stats('unexpected'), /invalid range/);
});
