// Revisión de pantallas: recorre todas las rutas por perfil (datos de demostración) y anchos de
// celular, tableta y computadora, y lista desbordes, textos fuera de su caja, elementos sobrepuestos
// y objetivos táctiles pequeños. Uso: con el servidor corriendo y la base sembrada,
//   BASE_URL=http://localhost:3000 npm run revisar-pantallas   (WIDTHS=320,375 para acotar)
const { chromium } = require('playwright');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const B = process.env.BASE_URL || 'http://localhost:3000';
const OUT = process.env.OUT || require('os').tmpdir();
const WIDTHS = (process.env.WIDTHS || '320,375,414,768,1024,1440').split(',').map(Number);
const SHOTS = process.env.SHOTS === '1';

async function routes() {
  const mateo = await db.student.findFirst({ where: { firstName: 'Mateo' } });
  const valeria = await db.student.findFirst({ where: { firstName: 'Valeria' } });
  const ann = await db.announcement.findFirst({ where: { permissionQuestion: { not: null } } });
  const album = await db.album.findFirst({ where: { section: { students: { some: { id: mateo.id } } } } });
  const conv = await db.conversation.findFirst({ where: { studentId: mateo.id, channel: 'TEACHER' } });
  const app = await db.applicant.findFirst();
  const term = await db.term.findFirst({ where: { order: 2 } });
  const pay = await db.payment.findFirst({ where: { studentId: mateo.id } });
  const santiago = await db.student.findFirst({ where: { firstName: 'Santiago' } });
  const prepA = await db.section.findFirst({ where: { teacher: { email: 'schaves@demo.scs.cr' } } });
  return {
    'familia@demo.scs.cr': ['/familia', '/familia/avisos', `/familia/avisos/${ann.id}`, '/familia/mensajes', `/familia/mensajes/${mateo.id}/docente`, '/familia/calendario', '/familia/cuenta', '/familia/cuenta/reportar', '/familia/cuenta/imprimir', '/familia/escuela', `/familia/hijos/${mateo.id}`, `/familia/hijos/${valeria.id}`, `/familia/hijos/${mateo.id}/ausencia`, '/familia/perfil', '/familia/fotos', `/familia/fotos/${album.id}`, '/familia/tareas', `/boletas/${valeria.id}/${term.id}`, `/recibos/${pay.id}`],
    'schaves@demo.scs.cr': ['/escuela', '/escuela/asistencia', '/escuela/diario', '/escuela/fotos', '/escuela/fotos/nuevo', `/escuela/fotos/${album.id}`, '/escuela/academico', `/escuela/academico/informe/${mateo.id}`, '/escuela/tareas', '/escuela/mensajes', `/escuela/mensajes/${conv.id}`, '/escuela/avisos', '/escuela/avisos/nuevo', `/escuela/avisos/${ann.id}`, '/escuela/alumnos', `/escuela/alumnos/${santiago.id}`, '/escuela/calendario', '/escuela/reportes', `/boletas/seccion/${prepA.id}/${term.id}`],
    'daraya@demo.scs.cr': ['/escuela', '/escuela/academico', '/escuela/academico?materia=obs', '/escuela/tareas'],
    'directora@demo.scs.cr': ['/escuela', '/escuela/cobros', '/escuela/matricula', `/escuela/matricula/${app.id}`, '/escuela/configuracion', '/escuela/configuracion?tab=personal', '/escuela/configuracion?tab=pagos', '/escuela/configuracion?tab=curso', '/escuela/configuracion?tab=academico', '/escuela/alumnos', '/escuela/alumnos/nuevo', `/escuela/alumnos/${santiago.id}/editar`, '/escuela/alumnos/importar', '/escuela/reportes', '/escuela/avisos'],
    'secretaria@demo.scs.cr': ['/escuela', '/escuela/cobros', '/escuela/mensajes'],
    '': ['/login', '/olvide', '/matricula', '/privacidad'],
  };
}

// Se ejecuta dentro de la página: devuelve los problemas encontrados
function inspect() {
  const vw = document.documentElement.clientWidth;
  const issues = [];
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const closedDetails = el.closest('details:not([open])');
    if (closedDetails && !(el.tagName === 'SUMMARY' && el.parentElement === closedDetails)) return false;
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('.sr-only,[aria-hidden="true"]');
  };
  const desc = (el) => {
    const t = (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 50);
    return `${el.tagName.toLowerCase()}${t ? ` «${t}»` : ''}`;
  };
  if (document.documentElement.scrollWidth > vw + 1) issues.push({ type: 'page-overflow', what: `scrollWidth ${document.documentElement.scrollWidth} > ${vw}` });

  // Textos que se salen de su caja (sin truncado intencional)
  for (const el of document.querySelectorAll('button, a, span, p, h1, h2, h3, label, td, th, dd, dt, li, summary, input, select')) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    if (el.closest('.truncate, [class*="line-clamp"], [class*="overflow-x-auto"], .overflow-hidden')) continue;
    if (cs.textOverflow === 'ellipsis') continue;
    if (el.querySelector('.sr-only') || el.classList.contains('tap')) continue;
    if ((el.tagName === 'INPUT' || el.tagName === 'SELECT')) continue;
    if (el.scrollWidth > el.clientWidth + 2 && cs.display !== 'inline' && el.clientWidth > 0 && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll') {
      issues.push({ type: 'text-overflow', what: desc(el), detail: `${el.scrollWidth}>${el.clientWidth}` });
    }
  }
  // Elementos fuera de la ventana o de su contenedor
  for (const el of document.querySelectorAll('main *, header *, nav *')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (el.closest('[class*="overflow-x-auto"], [class*="overflow-auto"], [class*="snap-x"], .full-bleed')) continue;
    if (r.right > vw + 1 || r.left < -1) issues.push({ type: 'off-screen', what: desc(el), detail: `left ${Math.round(r.left)} right ${Math.round(r.right)} vw ${vw}` });
  }
  // Controles sobrepuestos
  const ctrls = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary')].filter((e) => visible(e) && !e.classList.contains('sr-only') && getComputedStyle(e).opacity !== '0');
  const boxes = ctrls.map((e) => [e, e.getBoundingClientRect()]);
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const [a, ra] = boxes[i], [b, rb] = boxes[j];
      if (a.contains(b) || b.contains(a)) continue;
      if (a.closest('label') && a.closest('label') === b.closest('label')) continue;
      const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (w > 2 && h > 2) {
        // ignorar elementos fijos (barra inferior) sobre contenido desplazable
        const fixed = (e) => { for (let n = e; n; n = n.parentElement) { const p = getComputedStyle(n).position; if (p === 'fixed' || p === 'sticky') return true; } return false; };
        if (fixed(a) !== fixed(b)) continue;
        // botones superpuestos a propósito (p. ej. descargar sobre una foto)
        const abs = (e) => { for (let n = e; n && n !== document.body; n = n.parentElement) { if (getComputedStyle(n).position === 'absolute') return true; } return false; };
        if (abs(a) !== abs(b)) continue;
        issues.push({ type: 'overlap', what: `${desc(a)} ⟷ ${desc(b)}`, detail: `${Math.round(w)}×${Math.round(h)}` });
      }
    }
  }
  // Objetivos táctiles pequeños (WCAG 2.5.8: 24px)
  for (const [e, r] of boxes) {
    if (e.tagName === 'A' && getComputedStyle(e).display === 'inline') continue;
    if (e.classList.contains('tap') || e.closest('label')) continue;
    if (r.width < 24 || r.height < 24) issues.push({ type: 'small-target', what: desc(e), detail: `${Math.round(r.width)}×${Math.round(r.height)}` });
  }
  return issues;
}

(async () => {
  const all = await routes();
  const b = await chromium.launch();
  const report = [];
  for (const [email, paths] of Object.entries(all)) {
    for (const w of WIDTHS) {
      const ctx = await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1, ...(w < 768 ? { isMobile: true, hasTouch: true } : {}) });
      const p = await ctx.newPage();
      if (email) {
        await p.goto(B + '/login'); await p.fill('input[name=email]', email); await p.fill('input[name=password]', 'demo1234');
        await Promise.all([p.waitForURL(/familia|escuela|bienvenida/), p.click('button[type=submit]')]);
      }
      for (const path of paths) {
        await p.goto(B + path, { waitUntil: 'networkidle' }).catch(() => {});
        await p.waitForTimeout(150);
        const issues = await p.evaluate(inspect);
        for (const i of issues) report.push({ role: email.split('@')[0] || 'público', w, path: path.replace(/[a-z0-9]{25}/g, ':id'), ...i });
        if (SHOTS && (w === 375 || w === 1440)) await p.screenshot({ path: `${OUT}/shots/${(email.split('@')[0] || 'pub')}-${w}-${path.replace(/[^a-z]+/gi, '_')}.png`, fullPage: true });
      }
      await ctx.close();
    }
  }
  await b.close(); await db.$disconnect();
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
  // Resumen: agrupar por tipo + elemento + ruta
  const key = (r) => `${r.type} | ${r.path} | ${r.what}`;
  const groups = new Map();
  for (const r of report) { const k = key(r); const g = groups.get(k) ?? { ...r, widths: new Set(), roles: new Set() }; g.widths.add(r.w); g.roles.add(r.role); groups.set(k, g); }
  const byType = {};
  for (const g of groups.values()) (byType[g.type] ??= []).push(g);
  for (const [t, list] of Object.entries(byType)) {
    console.log(`\n=== ${t} (${list.length})`);
    for (const g of list.slice(0, 80)) console.log(`${g.path} [${[...g.widths].join(',')}] ${[...g.roles].join(',')}: ${g.what} ${g.detail ?? ''}`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
