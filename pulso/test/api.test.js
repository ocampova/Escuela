import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server.js';

let base, server, dir;
before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulso-test-'));
  ({ server } = createApp({ dbPath: path.join(dir, 'test.db') }));
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); fs.rmSync(dir, { recursive: true, force: true }); });

function client() {
  let cookie = '';
  return async (method, url, body, headers = {}) => {
    const res = await fetch(base + url, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Pulso': '1', ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const sc = res.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data, headers: res.headers };
  };
}
const profile = (name, extra = {}) => ({ name, age: 41, initialWeight: 109, allergies: [], preferences: ['sin_lacteos', 'sin_gluten'], mealTimes: { desayuno: '07:00', almuerzo: '12:30', cena: '18:30' }, onboarded: true, ...extra });

test('registro, sesión y cierre', async () => {
  const a = client();
  assert.equal((await a('GET', '/api/me')).status, 401);
  assert.equal((await a('POST', '/api/auth/register', { email: 'malo', password: '12345678' })).status, 400);
  assert.equal((await a('POST', '/api/auth/register', { email: 'a@x.com', password: 'corta' })).status, 400);
  const r = await a('POST', '/api/auth/register', { email: 'a@x.com', password: 'contraseña-segura' });
  assert.equal(r.status, 201);
  assert.match(r.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/);
  assert.equal((await a('POST', '/api/auth/register', { email: 'A@x.com', password: 'contraseña-segura' })).status, 409);
  const me = await a('GET', '/api/me');
  assert.equal(me.status, 200); assert.equal(me.data.user.email, 'a@x.com'); assert.equal(me.data.profile, null);
  await a('POST', '/api/auth/logout', {});
  assert.equal((await a('GET', '/api/me')).status, 401);
  assert.equal((await a('POST', '/api/auth/login', { email: 'a@x.com', password: 'mala-clave' })).status, 401);
  assert.equal((await a('POST', '/api/auth/login', { email: 'a@x.com', password: 'contraseña-segura' })).status, 200);
});

test('CSRF: escrituras sin encabezado o con otro origen se rechazan', async () => {
  const a = client();
  await a('POST', '/api/auth/register', { email: 'csrf@x.com', password: 'contraseña-segura' });
  assert.equal((await a('PUT', '/api/profile', { data: profile('X') }, { 'X-Pulso': '' })).status, 403);
  assert.equal((await a('PUT', '/api/profile', { data: profile('X') }, { Origin: 'https://malicioso.example' })).status, 403);
});

test('perfil crea plan con alergias; versiones evitan sobrescrituras', async () => {
  const a = client();
  await a('POST', '/api/auth/register', { email: 'v@x.com', password: 'contraseña-segura' });
  const p1 = await a('PUT', '/api/profile', { data: profile('Allan', { allergies: ['pescado'] }) });
  assert.equal(p1.status, 200);
  assert.equal(p1.data.profile.version, 1);
  const menu = p1.data.plan.data.menu;
  assert.ok(!JSON.stringify(menu).includes('pescado-'), 'sin recetas de pescado');
  assert.ok(!JSON.stringify(menu).includes('ensalada-atun'));
  // Ventana A guarda con versión 1 → ok (v2). Ventana B también tenía la v1 → conflicto.
  assert.equal((await a('PUT', '/api/profile', { data: profile('Allan A'), version: 1 })).status, 200);
  const conflict = await a('PUT', '/api/profile', { data: profile('Allan B'), version: 1 });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.data.current.data.name, 'Allan A');
  // Validación del servidor
  const bad = await a('PUT', '/api/profile', { data: profile('Allan', { age: 3 }), version: 2 });
  assert.equal(bad.status, 400); assert.ok(bad.data.errors.age);
});

test('plan: operaciones concurrentes no se pisan', async () => {
  const a = client();
  await a('POST', '/api/auth/register', { email: 'p@x.com', password: 'contraseña-segura' });
  await a('PUT', '/api/profile', { data: profile('P') });
  const [r1, r2] = await Promise.all([
    a('PATCH', '/api/plan', { ops: [{ type: 'setBought', id: 'arroz', value: true }] }),
    a('PATCH', '/api/plan', { ops: [{ type: 'setDone', date: '2026-11-23', meal: 'cena', value: true }] }),
  ]);
  assert.equal(r1.status, 200); assert.equal(r2.status, 200);
  const me = await a('GET', '/api/me');
  assert.equal(me.data.plan.data.bought.arroz, true);
  assert.equal(me.data.plan.data.done['2026-11-23:cena'], true);
  const bad = await a('PATCH', '/api/plan', { ops: [{ type: 'setMeal', day: 0, meal: 'desayuno', recipeId: 'no-existe' }] });
  assert.equal(bad.status, 400);
  const adults = await a('PATCH', '/api/plan', { ops: [{ type: 'setAdults', value: 3 }] });
  assert.equal(adults.data.plan.data.adults, 3);
});

test('mediciones: crear, editar con versión, eliminar, y separación entre usuarios', async () => {
  const a = client(), b = client();
  await a('POST', '/api/auth/register', { email: 'm1@x.com', password: 'contraseña-segura' });
  await b('POST', '/api/auth/register', { email: 'm2@x.com', password: 'contraseña-segura' });
  const bad = await a('POST', '/api/measurements', { type: 'bp', measured_at: '2026-11-20T07:00', data: { sys: 120, dia: 130 } });
  assert.equal(bad.status, 400); assert.ok(bad.data.errors.dia);
  const c = await a('POST', '/api/measurements', { type: 'bp', measured_at: '2026-11-20T07:00', data: { sys: 128, dia: 82, pulse: 70, symptoms: [] } });
  assert.equal(c.status, 201);
  const id = c.data.measurement.id;
  // B no ve ni puede tocar los datos de A
  assert.equal((await b('GET', '/api/measurements')).data.measurements.length, 0);
  assert.equal((await b('PUT', `/api/measurements/${id}`, { measured_at: '2026-11-20T07:00', data: { sys: 1, dia: 1 }, version: 1 })).status, 404);
  assert.equal((await b('DELETE', `/api/measurements/${id}?version=1`)).status, 404);
  // Edición con versión
  const e1 = await a('PUT', `/api/measurements/${id}`, { measured_at: '2026-11-20T07:05', data: { sys: 130, dia: 84 }, version: 1 });
  assert.equal(e1.status, 200); assert.equal(e1.data.measurement.version, 2);
  const e2 = await a('PUT', `/api/measurements/${id}`, { measured_at: '2026-11-20T07:05', data: { sys: 999, dia: 84 }, version: 1 });
  assert.ok([400, 409].includes(e2.status));
  const e3 = await a('PUT', `/api/measurements/${id}`, { measured_at: '2026-11-20T07:05', data: { sys: 131, dia: 84 }, version: 1 });
  assert.equal(e3.status, 409);
  assert.equal((await a('DELETE', `/api/measurements/${id}?version=1`)).status, 409);
  assert.equal((await a('DELETE', `/api/measurements/${id}?version=2`)).status, 200);
  // Hábitos: un registro por día
  assert.equal((await a('POST', '/api/measurements', { type: 'habit', measured_at: '2026-11-20T21:00', data: { items: { agua: true } } })).status, 201);
  assert.equal((await a('POST', '/api/measurements', { type: 'habit', measured_at: '2026-11-20T22:00', data: { items: {} } })).status, 409);
});

test('exportación CSV y respaldo / restauración con validación', async () => {
  const a = client();
  await a('POST', '/api/auth/register', { email: 'e@x.com', password: 'contraseña-segura' });
  await a('PUT', '/api/profile', { data: profile('E') });
  await a('POST', '/api/measurements', { type: 'weight', measured_at: '2026-11-20T07:00', data: { kg: 108.6 } });
  await a('POST', '/api/measurements', { type: 'lab', measured_at: '2026-11-10T07:00', data: { test: 'hba1c', value: 5.8, unit: '%' } });
  const csv = await a('GET', '/api/export/csv');
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get('content-type'), /text\/csv/);
  assert.match(csv.data, /peso,2026-11-20,07:00,108.6/);
  assert.match(csv.data, /laboratorio,2026-11-10,07:00,5.8,,,%,HbA1c/);
  const backup = (await a('GET', '/api/export/backup')).data;
  assert.equal(backup.format, 'pulso-respaldo');
  assert.equal(backup.measurements.length, 2);
  // Archivo dañado: no se modifica nada
  const broken = structuredClone(backup); broken.measurements[0].data.kg = 'mucho';
  const r1 = await a('POST', '/api/import', { backup: broken });
  assert.equal(r1.status, 400);
  assert.equal((await a('GET', '/api/measurements')).data.measurements.length, 2);
  // Vista previa sin cambios y luego restauración
  const pre = await a('POST', '/api/import', { backup, dryRun: true });
  assert.deepEqual(pre.data.preview, { profile: true, plan: true, measurements: 2 });
  await a('POST', '/api/measurements', { type: 'weight', measured_at: '2026-11-21T07:00', data: { kg: 108.2 } });
  const r2 = await a('POST', '/api/import', { backup });
  assert.equal(r2.status, 200);
  assert.equal((await a('GET', '/api/measurements')).data.measurements.length, 2);
  // Otro usuario no puede descargar el respaldo de este
  const b = client();
  assert.equal((await b('GET', '/api/export/backup')).status, 401);
});

test('cuerpo demasiado grande y JSON inválido', async () => {
  const a = client();
  await a('POST', '/api/auth/register', { email: 'big@x.com', password: 'contraseña-segura' });
  const big = await fetch(base + '/api/import', { method: 'POST', headers: { 'X-Pulso': '1', 'Content-Type': 'application/json' }, body: 'x'.repeat(3 * 1024 * 1024) }).catch(() => ({ status: 413 }));
  assert.ok([413, 401].includes(big.status));
  const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'X-Pulso': '1' }, body: '{no json' });
  assert.equal(r.status, 400);
});

test('límite de intentos de inicio de sesión', async () => {
  const a = client();
  await a('POST', '/api/auth/register', { email: 'rl@x.com', password: 'contraseña-segura' });
  for (let i = 0; i < 8; i++) await a('POST', '/api/auth/login', { email: 'rl@x.com', password: 'mal' });
  assert.equal((await a('POST', '/api/auth/login', { email: 'rl@x.com', password: 'contraseña-segura' })).status, 429);
});

test('eliminar cuenta borra sus datos', async () => {
  const a = client();
  await a('POST', '/api/auth/register', { email: 'del@x.com', password: 'contraseña-segura' });
  await a('POST', '/api/measurements', { type: 'weight', measured_at: '2026-11-20T07:00', data: { kg: 100 } });
  assert.equal((await a('DELETE', '/api/account', { password: 'otra' })).status, 401);
  assert.equal((await a('DELETE', '/api/account', { password: 'contraseña-segura' })).status, 200);
  assert.equal((await a('GET', '/api/me')).status, 401);
  assert.equal((await a('POST', '/api/auth/login', { email: 'del@x.com', password: 'contraseña-segura' })).status, 401);
});

test('archivos estáticos y cabeceras de seguridad', async () => {
  const r = await fetch(base + '/');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
  assert.ok([403, 404].includes((await fetch(base + '/..%2f..%2fserver.js')).status));
  assert.equal((await fetch(base + '/js/data.js')).status, 200);
});

test('endpoint de salud para el hosting', async () => {
  const r = await fetch(base + '/api/health');
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
});
