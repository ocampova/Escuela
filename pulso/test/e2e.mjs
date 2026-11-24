// Prueba de extremo a extremo en un teléfono emulado (390×844).
// Uso: node test/e2e.mjs  (levanta su propio servidor con una base temporal)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';

const SHOTS = process.env.SHOTS || path.join(os.tmpdir(), 'pulso-shots');
fs.mkdirSync(SHOTS, { recursive: true });
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulso-e2e-'));
const { server } = createApp({ dbPath: path.join(dir, 'e2e.db') });
await new Promise((r) => server.listen(0, r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const shot = (name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
const step = (s) => console.log('·', s);

try {
  step('crear cuenta');
  await page.goto(BASE);
  await page.waitForSelector('#auth-form');
  await shot('01-entrar');
  await page.click('text=Creá una cuenta');
  await page.waitForSelector('h1:has-text("Creá tu cuenta")');
  await page.fill('input[name=email]', 'allan@example.com');
  await page.fill('input[name=password]', 'clave-de-prueba-1');
  await page.click('button[type=submit]');

  step('bienvenida: datos faltantes');
  await page.waitForSelector('#ob-form');
  await page.fill('input[name=name]', 'Allan');
  await page.fill('input[name=age]', '41');
  await page.click('button[type=submit]');
  await page.waitForSelector('[aria-invalid=true]');
  assert.match(await page.textContent('#ob-form'), /Ingresá tu peso actual/);
  await page.fill('input[name=initialWeight]', '109');
  assert.equal(await page.getAttribute('input[name=initialWeight]', 'inputmode'), 'decimal');
  await shot('02-bienvenida-1');
  await page.click('button[type=submit]');
  step('alergias y preferencias');
  await page.waitForSelector('text=¿Tenés alguna alergia');
  await page.click('label.chip:has-text("Pescado")');
  for (const p of ['Evitar lácteos', 'Evitar gluten', 'Evitar embutidos', 'Evitar frituras', 'Evitar bebidas azucaradas', 'Evitar ultraprocesados', 'Evitar salsas preparadas']) await page.click(`label.check:has-text("${p}")`);
  await shot('03-bienvenida-2');
  await page.click('button[type=submit]');
  await page.waitForSelector('text=¿Para cuántos adultos');
  await page.click('[data-step="1"]');
  await page.click('button[type=submit]');
  await page.waitForSelector('#milestone-preview');
  assert.match(await page.textContent('#milestone-preview'), /103,6 kg/);
  await shot('04-bienvenida-hito');
  await page.click('button[type=submit]');

  step('hoy');
  await page.waitForSelector('#h-today');
  await page.waitForSelector('.metrics');
  await shot('05-hoy');
  const todayText = await page.textContent('main');
  assert.match(todayText, /Buen(os|as) .*Allan/);
  assert.doesNotMatch(todayText, /Pescado al ajillo|papillote|atún/i, 'respeta alergia a pescado');

  step('marcar comida realizada');
  await page.click('.meal >> nth=0 >> [data-act=done]');
  await page.waitForSelector('.meal.is-done');
  await page.waitForSelector('.toast');

  step('menú semanal y receta');
  await page.click('nav >> text=Alimentación');
  await page.waitForSelector('.days');
  await page.click('.day-chip >> nth=3');
  await shot('06-menu');
  await page.click('[data-tab=recetas]');
  await page.waitForSelector('.list-item >> nth=10');
  const n = await page.locator('main .list > li').count();
  assert.ok(n >= 12, `recetas: ${n}`);
  assert.equal(await page.locator('text=Contiene alérgenos de tu perfil').count(), 3, 'tres recetas con pescado marcadas');
  await page.click('text=Gallo pinto con huevo y aguacate');
  await page.waitForSelector('.ingredients');
  const rtext = await page.textContent('main');
  assert.match(rtext, /cocido/); assert.match(rtext, /½ taza/); assert.match(rtext, /Cocinar por tandas/); assert.match(rtext, /Conservar/);
  await shot('07-receta');

  step('cambiar comida y ver compras actualizarse');
  await page.click('nav >> text=Compras');
  await page.waitForSelector('.shop-item');
  const before = await page.textContent('main');
  await shot('08-compras');
  assert.match(before, /Huevos/);
  assert.doesNotMatch(before, /Filete de pescado/);
  await page.click('nav >> text=Alimentación');
  await page.click('[data-tab=semana]');
  await page.click('.day-chip >> nth=0');
  await page.click('.meal >> nth=1 >> [data-act=swap]');
  await page.waitForSelector('dialog.sheet[open]');
  await shot('09-cambiar');
  assert.equal(await page.locator('dialog [data-pick="pescado-ajillo"]').count(), 0, 'no ofrece pescado');
  await page.click('dialog [data-pick="olla-carne"]');
  await page.waitForSelector('.toast:has-text("Lista de compras actualizada")');
  await page.click('nav >> text=Compras');
  await page.waitForSelector('.shop-item');
  const adultsOut = await page.textContent('main .stepper output');
  assert.equal(adultsOut.trim(), '2');
  const eggs2 = await page.textContent('.shop-item:has-text("Huevos") .qty');
  await page.click('[data-adults="1"]');
  await page.waitForFunction(() => document.querySelector('main .stepper output')?.textContent.trim() === '3');
  const eggs3 = await page.textContent('.shop-item:has-text("Huevos") .qty');
  assert.equal(parseInt(eggs3) * 2, parseInt(eggs2) * 3, `huevos ${eggs2} → ${eggs3}`);
  await page.click('.shop-item:has-text("Arroz") label');
  await page.waitForTimeout(400);
  assert.ok(await page.isChecked('[data-buy=arroz]'));
  await page.click('.shop-item:has-text("Arroz") summary');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=download-list]')]);
  const listTxt = fs.readFileSync(await dl.path(), 'utf8');
  assert.match(listTxt, /\[x\] Arroz/); assert.match(listTxt, /3 adultos/); assert.match(listTxt, /No incluye precios/);

  step('registrar peso con error de validación y luego correcto');
  await page.goto(BASE + '/#/registrar/weight');
  await page.waitForSelector('#m-form');
  await page.fill('input[name=kg]', '1090');
  await page.click('button[type=submit]');
  await page.waitForSelector('.error-msg');
  assert.match(await page.textContent('#m-form'), /entre 30 y 350 kg/);
  await page.fill('input[name=kg]', '108,7');
  await page.fill('input[name=date]', '2026-11-20');
  await page.click('button[type=submit]');
  await page.waitForSelector('text=Primer hito');
  await page.goto(BASE + '/#/registrar/weight');
  await page.fill('input[name=kg]', '108,1');
  await page.click('button[type=submit]');
  await page.waitForSelector('.chart svg');
  await shot('10-progreso');

  step('presión normal, luego ≥180 y luego síntomas actuales');
  await page.goto(BASE + '/#/registrar/bp');
  await page.waitForSelector('input[name=sys]');
  assert.equal(await page.getAttribute('input[name=sys]', 'inputmode'), 'numeric');
  await page.fill('input[name=sys]', '128'); await page.fill('input[name=dia]', '84'); await page.fill('input[name=pulse]', '72');
  await page.click('button[type=submit]');
  await page.waitForSelector('text=Promedio 7 días');
  await page.goto(BASE + '/#/registrar/bp');
  await page.fill('input[name=sys]', '184'); await page.fill('input[name=dia]', '112');
  await page.locator('input[name=dia]').dispatchEvent('change');
  await page.waitForSelector('#bp-live .banner');
  await shot('11-presion-alta-form');
  await page.click('button[type=submit]');
  await page.waitForSelector('text=Lectura muy alta');
  const crisis = await page.textContent('main');
  assert.match(crisis, /5 minutos y volvé a medir/); assert.match(crisis, /911/);
  await shot('12-salud-crisis');

  await page.goto(BASE + '/#/registrar/bp');
  await page.fill('input[name=sys]', '122'); await page.fill('input[name=dia]', '78');
  await page.click('label.check:has-text("Dolor o presión en el pecho")');
  await page.click('button[type=submit]');
  await page.waitForSelector('text=Indicá si tenés los síntomas');
  await page.click('label.chip:has-text("Sí, ahora")');
  await page.waitForSelector('#bp-live .banner.emergency');
  await page.click('button[type=submit]');
  await page.waitForSelector('.banner.emergency');
  assert.match(await page.textContent('.banner.emergency'), /Llamar al 911/);
  assert.equal(await page.getAttribute('.banner.emergency a.call-btn', 'href'), 'tel:911');
  await shot('13-emergencia');

  step('editar una medición histórica: síntomas ya pasaron');
  await page.click('main .list a.list-item >> nth=0');
  await page.waitForSelector('#m-form');
  await page.click('label.chip:has-text("No, ya pasaron")');
  await page.click('button[type=submit]');
  await page.waitForSelector('text=Promedio 7 días');
  assert.equal(await page.locator('.banner.emergency').count(), 0, 'síntoma histórico no dispara emergencia');

  step('laboratorio con unidad y contexto');
  await page.goto(BASE + '/#/registrar/lab');
  await page.waitForSelector('select[name=test]');
  await page.fill('input[name=value]', '5,9');
  await page.selectOption('select[name=unit]', 'mmol/L');
  await page.click('button[type=submit]');
  await page.click('[data-htab=labs]');
  await page.waitForSelector('text=5,9 mmol/L');
  await shot('14-labs');

  step('perfil: conflicto entre ventanas');
  const page2 = await ctx.newPage();
  await page2.goto(BASE + '/#/perfil');
  await page.goto(BASE + '/#/perfil');
  await page.waitForSelector('#p-form'); await page2.waitForSelector('#p-form');
  await page.fill('input[name=height]', '178');
  await page.click('#p-form button[type=submit]');
  await page.waitForSelector('#p-state.saved');
  // page2 aún tiene la versión anterior si no se refrescó; forzamos edición rápida
  await page2.evaluate(() => { document.activeElement?.blur(); });
  await page2.fill('input[name=name]', 'Allan Dos');
  await page2.click('#p-form button[type=submit]');
  await page2.waitForTimeout(600);
  const p2text = await page2.textContent('main');
  // Puede pasar que BroadcastChannel ya haya actualizado page2 (entonces guarda sin conflicto) o que el servidor responda 409.
  assert.ok(/cambió en otra ventana/.test(p2text) || /Guardado/.test(p2text), 'informa conflicto o guarda sobre la versión actual');
  await page2.close();
  await shot('15-perfil');

  step('exportar CSV y respaldo; restaurar archivo inválido');
  const [csvDl] = await Promise.all([page.waitForEvent('download'), page.click('text=Exportar mediciones (CSV)')]);
  const csv = fs.readFileSync(await csvDl.path(), 'utf8');
  assert.match(csv, /presion,.*184,112/); assert.match(csv, /peso,2026-11-20/);
  const [bkDl] = await Promise.all([page.waitForEvent('download'), page.click('text=Descargar respaldo completo')]);
  const bk = JSON.parse(fs.readFileSync(await bkDl.path(), 'utf8'));
  assert.equal(bk.format, 'pulso-respaldo');
  const badFile = path.join(dir, 'malo.json');
  fs.writeFileSync(badFile, '{"format":"otro"}');
  await page.setInputFiles('#restore-file', badFile);
  await page.waitForSelector('#restore-box .banner.alert');
  const goodFile = path.join(dir, 'bueno.json');
  fs.writeFileSync(goodFile, JSON.stringify(bk));
  await page.setInputFiles('#restore-file', goodFile);
  await page.waitForSelector('[data-act=do-restore]');
  await shot('16-restaurar');
  await page.click('[data-act=do-restore]');
  await page.waitForSelector('.toast:has-text("Respaldo restaurado")');

  step('resumen imprimible');
  await page.goto(BASE + '/#/resumen');
  await page.waitForSelector('table.data');
  const sum = await page.textContent('main');
  assert.match(sum, /Promedios/); assert.match(sum, /184\/112/); assert.match(sum, /HbA1c|Glucosa/);
  await shot('17-resumen');
  await page.emulateMedia({ media: 'print' });
  await page.pdf?.({ path: path.join(SHOTS, 'resumen.pdf') }).catch(() => {});
  await page.emulateMedia({ media: 'screen' });

  step('privacidad: otra cuenta no ve datos');
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const other = await ctx2.newPage();
  await other.goto(BASE + '/#/crear-cuenta');
  await other.fill('input[name=email]', 'otra@example.com');
  await other.fill('input[name=password]', 'otra-clave-123');
  await other.click('button[type=submit]');
  await other.waitForSelector('#ob-form');
  const r = await other.evaluate(() => fetch('/api/measurements').then((x) => x.json()));
  assert.equal(r.measurements.length, 0);
  await ctx2.close();

  step('persistencia: recargar mantiene datos');
  await page.goto(BASE + '/#/salud');
  await page.reload();
  await page.waitForSelector('text=Promedio 7 días');

  step('sin conexión: informa que no se guardó');
  await ctx.setOffline(true);
  await page.goto(BASE + '/#/registrar/weight').catch(() => {});
  await page.evaluate(() => { location.hash = '#/registrar/weight'; });
  await page.waitForSelector('input[name=kg]');
  await page.fill('input[name=kg]', '107,9');
  await page.click('button[type=submit]');
  await page.waitForSelector('#form-error .banner.alert');
  assert.match(await page.textContent('#form-error'), /No se guardó/);
  assert.equal(await page.inputValue('input[name=kg]'), '107,9');
  await shot('18-sin-conexion');
  await ctx.setOffline(false);

  step('tablet y escritorio');
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto(BASE + '/#/hoy'); await page.waitForSelector('#h-today');
  await page.screenshot({ path: path.join(SHOTS, '19-tablet.png') });
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(BASE + '/#/alimentacion'); await page.waitForSelector('.days');
  await page.screenshot({ path: path.join(SHOTS, '20-escritorio.png') });
  await page.setViewportSize({ width: 360, height: 740 });
  for (const route of ['hoy', 'alimentacion', 'compras', 'progreso', 'salud', 'perfil']) {
    await page.goto(BASE + '/#/' + route); await page.waitForTimeout(250);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 0, `${route} desborda ${overflow}px a 360px`);
    const small = await page.evaluate(() => [...document.querySelectorAll('main p, main li, main label, main .input')].filter((e) => e.offsetParent && parseFloat(getComputedStyle(e).fontSize) < 13).length);
    assert.equal(small, 0, `${route}: texto menor a 13px`);
  }
  await page.goto(BASE + '/#/hoy'); await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(SHOTS, '21-hoy-360.png') });

  assert.deepEqual(errors.filter((e) => !/net::ERR_INTERNET_DISCONNECTED|Failed to fetch|Failed to load resource/.test(e)), [], 'errores de consola');
  console.log('\nE2E OK. Capturas en', SHOTS);
} catch (e) {
  await shot('zz-fallo').catch(() => {});
  console.error('\nE2E FALLÓ:', e.message, '\nErrores de consola:', errors);
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
  fs.rmSync(dir, { recursive: true, force: true });
}
