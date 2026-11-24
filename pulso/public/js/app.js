// Pulso — aplicación (SPA sin dependencias).
import { MEALS, ALLERGENS, PREFERENCES, RECIPES, INGREDIENTS, recipeById, recipeAllergens } from './data.js';
import {
  DAYS, isoDate, isoLocal, mondayOf, addDays, parseIsoDate, parseLocal, isTime,
  isCompatible, compatibleRecipes, shoppingList, shoppingText, formatNumber, formatDateShort, formatDateLong, formatDateTime,
  bpCategory, bpAlert, ALARM_SYMPTOMS, OTHER_SYMPTOMS, symptomLabel, isRecent,
  validateMeasurement, validateProfile, LAB_TESTS, CONTEXT_LABELS, LAB_SOURCES, HABITS,
  stats, milestone, bmi, defaultMealTimes, ACTIVITY_KINDS, INTENSITIES,
} from './logic.js';
import { GOALS, ROUTE, routeWeek, activeHabits, coachAdvice, weeklyReview, bpWeekProgress, activityWeek, habitAdherence, weightTrend, COACH_SOURCES } from './coach.js';

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name, cls = '') => `<svg class="i ${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;
const mealLabel = (id) => MEALS.find((m) => m.id === id)?.label || id;
const MEAL_ICON = { desayuno: 'sun', almuerzo: 'salad', cena: 'moon' };
const fmt = (n, d = 1) => formatNumber(Number(n), d);
const toNum = (v) => (v === null || v === undefined || v === '' ? NaN : Number(String(v).replace(',', '.')));

const SOURCES = [
  { org: 'NIDDK', title: 'Control del peso y alimentación saludable', url: 'https://www.niddk.nih.gov/health-information/weight-management' },
  { org: 'NIDDK', title: 'Resistencia a la insulina y prediabetes', url: 'https://www.niddk.nih.gov/health-information/diabetes/overview/what-is-diabetes/prediabetes-insulin-resistance' },
  { org: 'NIDDK', title: 'Glucosa baja (hipoglucemia)', url: 'https://www.niddk.nih.gov/health-information/diabetes/overview/preventing-problems/low-blood-glucose-hypoglycemia' },
  { org: 'NIDDK', title: 'La prueba de A1C', url: 'https://www.niddk.nih.gov/health-information/diagnostic-tests/a1c-test' },
  { org: 'American Heart Association', title: 'Cómo entender las lecturas de presión arterial', url: 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings' },
  { org: 'American Heart Association', title: 'Cómo medir la presión arterial en casa', url: 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/monitoring-your-blood-pressure-at-home' },
  { org: 'American Stroke Association', title: 'Señales de un derrame cerebral (F.A.S.T.)', url: 'https://www.stroke.org/en/about-stroke/stroke-symptoms' },
  { org: 'NHLBI', title: 'Plan de alimentación DASH', url: 'https://www.nhlbi.nih.gov/education/dash-eating-plan' },
  { org: 'NHLBI', title: 'Presión arterial alta', url: 'https://www.nhlbi.nih.gov/health/high-blood-pressure' },
  { org: 'NHLBI', title: 'Síntomas de un ataque al corazón', url: 'https://www.nhlbi.nih.gov/health/heart-attack/symptoms' },
  { org: 'FoodSafety.gov (USDA)', title: 'Tiempos de conservación en refrigeración', url: 'https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts' },
];
const extLink = (s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ${icon('external-link', 'sm')}<span class="sr-only"> (abre en otra pestaña)</span></a>`;

// ---------------------------------------------------------------------------
// Estado y API
// ---------------------------------------------------------------------------
const S = {
  booted: false,
  me: null,           // { email }
  profile: null,      // { data, version }
  plan: null,         // { data, version }
  measurements: null, // [] cuando se cargan
  mLoading: false,
  mError: null,
  ui: { foodDay: null, foodTab: 'semana', recipeFilter: 'todas', onboarding: null, healthTab: 'presion', progressTab: 'general' },
};

const channel = 'BroadcastChannel' in window ? new BroadcastChannel('pulso') : null;
const notifyOthers = (what) => channel?.postMessage({ what, at: Date.now() });
channel && (channel.onmessage = async (e) => {
  if (e.data?.what === 'logout') { S.me = null; go('#/entrar'); return; }
  await refreshAll({ silent: true });
});

async function api(method, url, body) {
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Pulso': '1' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    });
    let data = null;
    try { data = await res.json(); } catch { data = null; }
    if (res.status === 401 && S.me && !url.startsWith('/api/auth/') && !url.startsWith('/api/account')) {
      S.me = null;
      toast('Tu sesión terminó. Iniciá sesión de nuevo.', 'warn');
      go('#/entrar');
    }
    return { ok: res.ok, status: res.status, data: data || {} };
  } catch {
    return { ok: false, status: 0, data: { error: 'Sin conexión con el servidor. Revisá tu internet e intentá de nuevo.' } };
  }
}

async function loadMe() {
  const r = await api('GET', '/api/me');
  if (r.ok) { S.me = r.data.user; S.profile = r.data.profile; S.plan = r.data.plan; }
  else if (r.status === 401) { S.me = null; }
  return r;
}
async function loadMeasurements() {
  S.mLoading = true; S.mError = null;
  const r = await api('GET', '/api/measurements');
  S.mLoading = false;
  if (r.ok) S.measurements = r.data.measurements;
  else if (r.status !== 401) S.mError = r.data.error || 'No se pudieron cargar tus registros.';
  return r;
}
async function refreshAll({ silent = false } = {}) {
  const r = await loadMe();
  if (r.ok && S.measurements) await loadMeasurements();
  if (!silent || !isEditing()) render();
}
const isEditing = () => document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);

// Al volver a la pestaña, traer cambios de otras ventanas o dispositivos.
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.me) refreshAll({ silent: true }); });

// ---------------------------------------------------------------------------
// Avisos (toast) y estado de guardado
// ---------------------------------------------------------------------------
function toast(msg, kind = 'ok', action) {
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = `toast ${kind === 'error' ? 'error' : kind === 'warn' ? 'warn' : ''}`;
  if (kind === 'error') el.setAttribute('role', 'alert');
  el.innerHTML = `${icon(kind === 'error' ? 'triangle-alert' : kind === 'warn' ? 'info' : 'circle-check')}<span class="grow">${esc(msg)}</span>`;
  if (action) {
    const b = document.createElement('button');
    b.className = 'btn sm'; b.type = 'button'; b.textContent = action.label;
    b.onclick = () => { el.remove(); action.run(); };
    el.appendChild(b);
  }
  box.appendChild(el);
  while (box.children.length > 2) box.firstElementChild.remove();
  setTimeout(() => el.remove(), action ? 9000 : kind === 'error' ? 7000 : 3200);
}

// Cambios del plan: se envían como operaciones; el servidor las aplica sobre la última versión.
let planQueue = Promise.resolve();
function planOps(ops, { okMsg, rerender = true } = {}) {
  const prev = S.plan;
  planQueue = planQueue.then(async () => {
    const r = await api('PATCH', '/api/plan', { ops });
    if (r.ok) {
      S.plan = r.data.plan;
      notifyOthers('plan');
      if (okMsg) toast(okMsg);
    } else {
      S.plan = prev;
      toast(`No se guardó el cambio. ${r.data.error || ''}`.trim(), 'error', { label: 'Reintentar', run: () => planOps(ops, { okMsg, rerender }) });
    }
    if (rerender) render();
  });
  return planQueue;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const go = (hash) => { if (location.hash !== hash) location.hash = hash; else render(); };
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, ...rest] = h.split('/');
  return { path: path || 'hoy', params: rest.map(decodeURIComponent) };
}

const NAV = [
  { path: 'hoy', label: 'Hoy', icon: 'house' },
  { path: 'ruta', label: 'Ruta', icon: 'map' },
  { path: 'alimentacion', label: 'Comer', icon: 'utensils' },
  { path: 'progreso', label: 'Progreso', icon: 'chart-line' },
  { path: 'salud', label: 'Salud', icon: 'heart-pulse' },
];
const NAV_OF = { receta: 'alimentacion', compras: 'alimentacion', registrar: null, perfil: null, resumen: null, emergencia: 'salud', revision: 'ruta' };

function shell(content, { path, title = '' } = {}) {
  const active = NAV_OF[path] !== undefined ? NAV_OF[path] : path;
  const initial = (S.profile?.data?.name || S.me?.email || '?').trim().charAt(0).toUpperCase();
  return `
  <div class="app">
    <header class="topbar">
      <a class="brand" href="#/hoy" aria-label="Pulso, ir a Hoy">${icon('activity')}<span>Pulso</span></a>
      <a class="avatar" href="#/perfil" aria-label="Perfil y datos">${esc(initial)}</a>
    </header>
    <main id="main" tabindex="-1" aria-label="${esc(title)}">${content}</main>
  </div>
  <nav class="nav" aria-label="Secciones">
    <ul>${NAV.map((n) => `<li><a href="#/${n.path}" ${active === n.path ? 'aria-current="page"' : ''}><span class="pill">${icon(n.icon)}</span>${n.label}</a></li>`).join('')}</ul>
  </nav>`;
}

async function render() {
  const root = $('#root');
  const { path, params } = route();
  if (!S.booted) return;

  if (!S.me) {
    if (!['entrar', 'crear-cuenta'].includes(path)) { location.replace('#/entrar'); return; }
    root.innerHTML = viewAuth(path === 'crear-cuenta' ? 'register' : 'login');
    bindAuth();
    return;
  }
  if (['entrar', 'crear-cuenta'].includes(path)) { location.replace('#/hoy'); return; }
  if (!S.profile?.data?.onboarded && path !== 'bienvenida') { location.replace('#/bienvenida'); return; }
  if (path === 'bienvenida' && S.profile?.data?.onboarded && !S.ui.onboarding) { location.replace('#/hoy'); return; }
  if (path === 'bienvenida') { root.innerHTML = viewOnboarding(); bindOnboarding(); return; }

  const needsM = ['hoy', 'progreso', 'salud', 'registrar', 'resumen', 'perfil', 'ruta', 'revision'].includes(path);
  if (needsM && !S.measurements && !S.mLoading && !S.mError) {
    loadMeasurements().then(render);
  }

  const views = { ruta: viewRoute, revision: viewReview, hoy: viewToday, alimentacion: viewFood, receta: viewRecipe, compras: viewShopping, progreso: viewProgress, salud: viewHealth, registrar: viewForm, perfil: viewProfile, resumen: viewSummary, emergencia: viewEmergency };
  const v = views[path];
  if (!v) { root.innerHTML = shell(`<div class="page-head"><h1>Página no encontrada</h1></div><a class="btn" href="#/hoy">Ir a Hoy</a>`, { path }); return; }
  const out = v(params);
  root.innerHTML = shell(out.html, { path, title: out.title });
  document.title = `${out.title} · Pulso`;
  out.bind?.();
  bindCharts();
}

// ---------------------------------------------------------------------------
// Fragmentos comunes
// ---------------------------------------------------------------------------
const loadingBlock = (lines = 3) => `<div aria-busy="true" aria-label="Cargando">${Array.from({ length: lines }, () => '<div class="skeleton" style="height:72px;margin-bottom:12px"></div>').join('')}</div>`;
const errorBlock = (msg) => `<div class="banner alert" role="alert">${icon('triangle-alert')}<div><p><strong>No se pudieron cargar tus registros</strong></p><p>${esc(msg)}</p><div class="actions"><button class="btn sm secondary" data-act="retry-m" type="button">Reintentar</button></div></div></div>`;
function measurementsState() {
  if (S.mError) return { block: errorBlock(S.mError) };
  if (!S.measurements) return { block: loadingBlock(2) };
  return { list: S.measurements };
}
const byType = (t) => (S.measurements || []).filter((m) => m.type === t);

function emptyState(iconName, title, text, href, cta) {
  return `<div class="empty">${icon(iconName)}<p><strong>${esc(title)}</strong></p><p class="muted small">${esc(text)}</p>${href ? `<a class="btn" href="${href}">${icon('plus')}${esc(cta)}</a>` : ''}</div>`;
}

function dayIndexToday() {
  const ws = parseIsoDate(S.plan?.data?.weekStart || '');
  if (!ws) return 0;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((t - ws) / 86400000);
}

// ---------------------------------------------------------------------------
// Autenticación
// ---------------------------------------------------------------------------
function viewAuth(mode) {
  const reg = mode === 'register';
  return `
  <main class="auth">
    <div class="brand">${icon('activity')}<span>Pulso</span></div>
    <h1>${reg ? 'Creá tu cuenta' : 'Qué comer hoy, sin complicarte'}</h1>
    <p class="muted" style="margin-top:8px">${reg ? 'Tus datos de salud quedan en tu cuenta y solo vos podés verlos.' : 'Menú semanal, recetas ticas, lista de compras y seguimiento de tu presión y tu peso.'}</p>
    <form id="auth-form" class="card" style="margin-top:22px" novalidate>
      <label class="field"><span class="label">Correo electrónico</span>
        <input class="input" type="email" name="email" autocomplete="email" inputmode="email" required>
      </label>
      <label class="field"><span class="label">Contraseña</span>
        <input class="input" type="password" name="password" autocomplete="${reg ? 'new-password' : 'current-password'}" minlength="8" required>
        ${reg ? '<span class="hint">Mínimo 8 caracteres.</span>' : ''}
      </label>
      <div id="auth-error"></div>
      <button class="btn block" style="margin-top:20px" type="submit">${reg ? 'Crear cuenta' : 'Entrar'}</button>
    </form>
    <p style="margin-top:18px;text-align:center">${reg ? '¿Ya tenés cuenta? <a href="#/entrar">Iniciá sesión</a>' : '¿Primera vez? <a href="#/crear-cuenta">Creá una cuenta</a>'}</p>
    <p class="disclaimer" style="text-align:center">Pulso es una herramienta de organización y registro. No diagnostica ni reemplaza la atención médica.</p>
  </main>`;
}
function bindAuth() {
  const f = $('#auth-form');
  const reg = route().path === 'crear-cuenta';
  f.onsubmit = async (e) => {
    e.preventDefault();
    const btn = f.querySelector('button[type=submit]');
    const email = f.email.value.trim(), password = f.password.value;
    const err = $('#auth-error');
    err.innerHTML = '';
    if (!email || !password) { err.innerHTML = `<p class="error-msg">${icon('triangle-alert', 'sm')}Completá el correo y la contraseña.</p>`; return; }
    if (reg && password.length < 8) { err.innerHTML = `<p class="error-msg">${icon('triangle-alert', 'sm')}La contraseña debe tener al menos 8 caracteres.</p>`; f.password.focus(); return; }
    btn.setAttribute('aria-busy', 'true'); btn.disabled = true;
    const r = await api('POST', reg ? '/api/auth/register' : '/api/auth/login', { email, password });
    btn.removeAttribute('aria-busy'); btn.disabled = false;
    if (!r.ok) { err.innerHTML = `<p class="error-msg" role="alert">${icon('triangle-alert', 'sm')}${esc(r.data.error || 'No se pudo continuar.')}</p>`; return; }
    S.measurements = null;
    await loadMe();
    notifyOthers('login');
    go(S.profile?.data?.onboarded ? '#/hoy' : '#/bienvenida');
  };
}

// ---------------------------------------------------------------------------
// Bienvenida / configuración de perfil
// ---------------------------------------------------------------------------
function draftProfile() {
  if (!S.ui.onboarding) {
    S.ui.onboarding = {
      step: 0,
      data: S.profile?.data ? structuredClone(S.profile.data) : {
        name: '', age: null, initialWeight: null, height: null, activity: '', conditions: '', medications: '', otherAllergies: '',
        goals: [], allergies: [], preferences: [], milestonePct: 5, mealTimes: defaultMealTimes(), country: 'Costa Rica', emergencyNumber: '911',
      },
      adults: S.plan?.data?.adults || 1,
      errors: {},
    };
  }
  return S.ui.onboarding;
}
const STEPS = ['¿Qué querés mejorar?', 'Sobre vos', 'Alergias y preferencias', 'Tu casa y horarios', 'Tu primer hito'];

function numField(name, label, value, unit, { hint = '', step = '0.1', inputmode = 'decimal', error, min, max } = {}) {
  return `<label class="field"><span class="label">${label}</span>
    <span class="input-wrap"><input class="input" name="${name}" type="text" inputmode="${inputmode}" value="${value ?? ''}" ${error ? 'aria-invalid="true"' : ''} aria-describedby="${name}-h" autocomplete="off" data-min="${min ?? ''}" data-max="${max ?? ''}"><span class="unit">${unit}</span></span>
    <span class="hint" id="${name}-h">${hint}</span>
    ${error ? `<span class="error-msg">${icon('triangle-alert', 'sm')}${esc(error)}</span>` : ''}
  </label>`;
}

function viewOnboarding() {
  const o = draftProfile();
  const d = o.data, e = o.errors;
  let body = '';
  if (o.step === 0) {
    body = `
      <p>Pulso es tu coach metabólico: una ruta de 12 semanas, un cambio a la vez, con seguimiento de tus datos reales.</p>
      <fieldset class="fieldset" style="margin-top:18px"><legend>Elegí uno o más objetivos</legend>
        <div class="checks">${GOALS.map((g) => `<label class="check"><input type="checkbox" name="goals" value="${g.id}" ${(d.goals || []).includes(g.id) ? 'checked' : ''}>${esc(g.label)}</label>`).join('')}</div>
        ${e.goals ? `<span class="error-msg">${icon('triangle-alert', 'sm')}${esc(e.goals)}</span>` : ''}
        <span class="hint" style="margin-top:10px">La resistencia a la insulina y la presión alta se diagnostican y tratan con tu médico. Pulso te acompaña con hábitos y registros; no reemplaza ese seguimiento ni cambia medicamentos.</span>
      </fieldset>`;
  } else if (o.step === 1) {
    body = `
      <label class="field"><span class="label">¿Cómo te llamás?</span><input class="input" name="name" value="${esc(d.name)}" autocomplete="given-name" ${e.name ? 'aria-invalid="true"' : ''}>${e.name ? `<span class="error-msg">${esc(e.name)}</span>` : ''}</label>
      <div class="grid-2" style="margin-top:18px">
        ${numField('age', 'Edad', d.age, 'años', { inputmode: 'numeric', error: e.age })}
        ${numField('initialWeight', 'Peso actual', d.initialWeight, 'kg', { error: e.initialWeight })}
      </div>
      ${numField('height', 'Estatura <span class="muted">(opcional)</span>', d.height, 'cm', { inputmode: 'numeric', hint: 'Sirve para calcular tu índice de masa corporal. Si no la sabés, dejala en blanco.', error: e.height })}
      <label class="field"><span class="label">Actividad física habitual <span class="muted">(opcional)</span></span>
        <select class="input" name="activity">
          ${[['', 'Prefiero no indicarlo'], ['sedentaria', 'Poca: casi todo el día sentado'], ['ligera', 'Ligera: camino un poco a diario'], ['moderada', 'Moderada: ejercicio 2–4 veces por semana'], ['alta', 'Alta: ejercicio casi todos los días']].map(([v, l]) => `<option value="${v}" ${d.activity === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select></label>
      <label class="field"><span class="label">Diagnósticos que te hayan dado <span class="muted">(opcional)</span></span>
        <textarea class="input" name="conditions" placeholder="Por ejemplo: presión alta, prediabetes">${esc(d.conditions)}</textarea>
        <span class="hint">Escribí solo lo que tu médico te haya indicado. Aparece en el resumen para tus consultas.</span></label>
      <label class="field"><span class="label">Medicamentos que tomás <span class="muted">(opcional)</span></span>
        <textarea class="input" name="medications" placeholder="Nombre, dosis y horario">${esc(d.medications)}</textarea>
        <span class="hint">Pulso no cambia ni recomienda medicamentos; esta lista es para llevarla a tus citas.</span></label>`;
  } else if (o.step === 2) {
    body = `
      <fieldset class="fieldset"><legend>¿Tenés alguna alergia o intolerancia alimentaria?</legend>
        <span class="hint" style="margin:-2px 0 10px">Las recetas que contengan estos alimentos no se incluirán en tu menú.</span>
        <div class="chips">${ALLERGENS.map((a) => `<label class="chip"><input type="checkbox" name="allergies" value="${a.id}" ${d.allergies.includes(a.id) ? 'checked' : ''}>${esc(a.label)}</label>`).join('')}</div>
      </fieldset>
      <label class="field"><span class="label">Otras alergias <span class="muted">(opcional)</span></span><input class="input" name="otherAllergies" value="${esc(d.otherAllergies)}"><span class="hint">Pulso no puede revisarlas automáticamente: revisá los ingredientes de cada receta.</span></label>
      <fieldset class="fieldset"><legend>Preferencias</legend>
        <div class="checks">${PREFERENCES.map((p) => `<label class="check"><input type="checkbox" name="preferences" value="${p.id}" ${d.preferences.includes(p.id) ? 'checked' : ''}>${esc(p.label)}</label>`).join('')}</div>
        <span class="hint" style="margin-top:10px">Todas las recetas de Pulso ya evitan lácteos, gluten, embutidos, frituras, bebidas azucaradas, ultraprocesados y salsas preparadas. Excluir gluten o lácteos es una preferencia personal: no es necesario para todo el mundo si no hay alergia, intolerancia o indicación médica.</span>
      </fieldset>`;
  } else if (o.step === 3) {
    body = `
      <fieldset class="fieldset"><legend>¿Para cuántos adultos cocinás?</legend>
        <div class="stepper"><button class="icon-btn" type="button" data-step="-1" aria-label="Menos adultos">−</button><output name="adults" aria-live="polite">${o.adults}</output><button class="icon-btn" type="button" data-step="1" aria-label="Más adultos">${icon('plus')}</button></div>
        <span class="hint">La lista de compras multiplica las cantidades por este número.</span>
      </fieldset>
      <fieldset class="fieldset"><legend>Horarios de comida</legend>
        <div class="grid-3">${MEALS.map((m) => `<label class="field"><span class="label small">${m.label}</span><input class="input" type="time" name="time_${m.id}" value="${esc(d.mealTimes[m.id])}" ${e[`time_${m.id}`] ? 'aria-invalid="true"' : ''}></label>`).join('')}</div>
        <span class="hint">Son una guía para organizar tu día. No indican ayuno ni horarios obligatorios; cambialos cuando quieras.</span>
      </fieldset>`;
  } else {
    const m = milestone(toNum(d.initialWeight), toNum(d.milestonePct));
    body = `
      <p>Un primer hito alcanzable ayuda a ver avances. Te proponemos una reducción aproximada del <strong>5%</strong> de tu peso inicial. Podés cambiarlo.</p>
      ${numField('milestonePct', 'Porcentaje del primer hito', d.milestonePct, '%', { hint: 'Entre 1% y 15%.', error: e.milestonePct })}
      <div class="card flat" style="margin-top:16px" id="milestone-preview">${m ? `<p class="muted small">Con un peso inicial de ${fmt(d.initialWeight)} kg</p><p style="font-size:1.4rem;font-weight:700;margin-top:4px">${fmt(m.target)} kg <span class="muted small" style="font-weight:400">(−${fmt(m.loss)} kg)</span></p>` : '<p class="muted">Agregá tu peso en el paso 2 para calcular el hito.</p>'}</div>
      <p class="disclaimer">Sin fecha límite ni promesas: cada cuerpo responde distinto. Si tenés condiciones de salud, conversá tu meta con tu médico o nutricionista.</p>`;
  }
  return `
  <main class="auth" style="justify-content:flex-start">
    <div class="brand">${icon('activity')}<span>Pulso</span></div>
    <p class="muted small">Paso ${o.step + 1} de ${STEPS.length}</p>
    <div class="wizard-progress" aria-hidden="true">${STEPS.map((_, i) => `<span class="${i <= o.step ? 'on' : ''}"></span>`).join('')}</div>
    <h1>${STEPS[o.step]}</h1>
    <form id="ob-form" class="stack-lg" style="margin-top:18px" novalidate>
      <div>${body}</div>
      <div id="ob-error"></div>
      <div class="actions">
        ${o.step > 0 ? '<button class="btn secondary" type="button" data-back>Atrás</button>' : ''}
        <button class="btn" type="submit">${o.step === STEPS.length - 1 ? 'Guardar y empezar' : 'Continuar'}</button>
      </div>
    </form>
  </main>`;
}

function readOnboardingForm(f, o) {
  const d = o.data;
  const v = (n) => f.elements[n]?.value;
  if (o.step === 0) {
    d.goals = $$('input[name=goals]:checked', f).map((x) => x.value);
  } else if (o.step === 1) {
    d.name = v('name') || '';
    d.age = v('age') || null; d.initialWeight = v('initialWeight') || null; d.height = v('height') || null;
    d.activity = v('activity'); d.conditions = v('conditions'); d.medications = v('medications');
  } else if (o.step === 2) {
    d.allergies = $$('input[name=allergies]:checked', f).map((x) => x.value);
    d.preferences = $$('input[name=preferences]:checked', f).map((x) => x.value);
    d.otherAllergies = v('otherAllergies');
  } else if (o.step === 3) {
    for (const m of MEALS) d.mealTimes[m.id] = v(`time_${m.id}`);
  } else {
    d.milestonePct = v('milestonePct') || 5;
  }
}

function bindOnboarding() {
  const o = draftProfile();
  const f = $('#ob-form');
  f.querySelectorAll('[data-step]').forEach((b) => b.onclick = () => {
    o.adults = Math.min(12, Math.max(1, o.adults + Number(b.dataset.step)));
    f.querySelector('output[name=adults]').textContent = o.adults;
  });
  f.querySelector('[data-back]')?.addEventListener('click', () => { readOnboardingForm(f, o); o.step--; o.errors = {}; render(); });
  if (o.step === 4) {
    f.elements.milestonePct.addEventListener('input', () => {
      const m = milestone(toNum(o.data.initialWeight), toNum(f.elements.milestonePct.value));
      if (m && m.pct >= 1 && m.pct <= 15) $('#milestone-preview').innerHTML = `<p class="muted small">Con un peso inicial de ${fmt(toNum(o.data.initialWeight))} kg</p><p style="font-size:1.4rem;font-weight:700;margin-top:4px">${fmt(m.target)} kg <span class="muted small" style="font-weight:400">(−${fmt(m.loss)} kg)</span></p>`;
    });
  }
  f.onsubmit = async (e) => {
    e.preventDefault();
    readOnboardingForm(f, o);
    const v = validateProfile(o.data);
    const stepFields = [['goals'], ['name', 'age', 'initialWeight', 'height', 'activity', 'conditions', 'medications'], ['allergies', 'preferences', 'otherAllergies'], MEALS.map((m) => `time_${m.id}`), ['milestonePct']][o.step];
    const errs = Object.fromEntries(Object.entries(v.errors).filter(([k]) => stepFields.includes(k)));
    if (o.step === 0 && !o.data.goals.length) errs.goals = 'Elegí al menos un objetivo.';
    if (o.step === 1 && !o.data.initialWeight) errs.initialWeight = 'Ingresá tu peso actual: es la base de tu primer hito.';
    o.errors = errs;
    if (Object.keys(errs).length) { render(); $('[aria-invalid=true]')?.focus(); return; }
    if (o.step < STEPS.length - 1) { o.step++; render(); window.scrollTo(0, 0); return; }
    const btn = f.querySelector('button[type=submit]'); btn.setAttribute('aria-busy', 'true'); btn.disabled = true;
    const data = { ...v.value, onboarded: true };
    const r = await api('PUT', '/api/profile', { data, version: S.profile?.version });
    if (!r.ok) {
      btn.removeAttribute('aria-busy'); btn.disabled = false;
      $('#ob-error').innerHTML = `<div class="banner alert" role="alert">${icon('triangle-alert')}<p>No se guardó tu perfil. ${esc(r.data.error || '')}</p></div>`;
      return;
    }
    S.profile = r.data.profile; S.plan = r.data.plan;
    const ops = [{ type: 'setAdults', value: o.adults }, { type: 'regenerate', allergies: data.allergies }];
    await planOps(ops, { rerender: false });
    S.ui.onboarding = null;
    notifyOthers('profile');
    toast('Listo. Empezás la semana 1 de tu ruta.');
    go('#/hoy');
  };
}

// ---------------------------------------------------------------------------
// HOY
// ---------------------------------------------------------------------------
function mealCard(dayIdx, mealId, { compact = false } = {}) {
  const plan = S.plan.data;
  const rid = plan.menu[dayIdx]?.[mealId];
  const r = rid && recipeById(rid);
  const date = addDays(plan.weekStart, dayIdx);
  const done = !!plan.done[`${date}:${mealId}`];
  const time = S.profile.data.mealTimes?.[mealId] || '';
  const conflict = r && !isCompatible(r, S.profile.data.allergies);
  return `
  <article class="meal ${done ? 'is-done' : ''}">
    <div class="swatch ${mealId}">${icon(MEAL_ICON[mealId])}</div>
    <div>
      <div class="row spread"><span class="meal-tag ${mealId}">${mealLabel(mealId)}</span><span class="muted small">${esc(time)}</span></div>
      ${r ? `<p class="meal-title"><a href="#/receta/${r.id}?d=${dayIdx}&m=${mealId}">${esc(r.name)}</a></p>
      <div class="meal-meta"><span>${icon('timer', 'sm')}${r.minutes} min</span>${done ? `<span>${icon('circle-check', 'sm')}Realizada</span>` : ''}</div>
      ${conflict ? `<p class="error-msg">${icon('triangle-alert', 'sm')}Contiene un alimento de tu lista de alergias. Cambiala.</p>` : ''}` : `<p class="meal-title muted">Sin receta asignada</p>`}
    </div>
    ${compact ? '' : `<div class="meal-actions">
      <button class="btn secondary sm check-btn" type="button" data-act="done" data-day="${dayIdx}" data-meal="${mealId}" aria-pressed="${done}">${icon('check', 'sm')}${done ? 'Hecha' : 'Marcar hecha'}</button>
      <button class="btn secondary sm" type="button" data-act="swap" data-day="${dayIdx}" data-meal="${mealId}">${icon('refresh-cw', 'sm')}Cambiar</button>
    </div>`}
  </article>`;
}

function weekBanner() {
  const idx = dayIndexToday();
  if (idx >= 0 && idx <= 6) return '';
  return `<div class="banner info" style="margin-bottom:16px">${icon('calendar')}<div><p><strong>Empezó una nueva semana</strong></p><p>Tu menú es del ${formatDateShort(S.plan.data.weekStart)}. Podés repetirlo esta semana o generar uno nuevo.</p>
    <div class="actions"><button class="btn sm" type="button" data-act="new-week" data-keep="1">Repetir menú</button><button class="btn sm secondary" type="button" data-act="new-week">Menú nuevo</button></div></div></div>`;
}

function latestAlertBanner() {
  const bps = byType('bp');
  if (!bps.length) return '';
  const last = bps[0];
  const lvl = bpAlert({ ...last.data, measured_at: last.measured_at });
  if (lvl === 'emergencia') return emergencyBanner();
  if (lvl === 'muy_alta') return crisisBanner(last);
  return '';
}

function coachState() {
  return coachAdvice({ profile: S.profile.data, plan: S.plan.data, measurements: S.measurements || [] });
}
const todayIso = () => isoDate(new Date());
const todayHabitRecord = () => (S.measurements || []).find((m) => m.type === 'habit' && m.measured_at.slice(0, 10) === todayIso()) || null;

// Guarda un hábito del día (crea o actualiza el registro de hoy). Cola para no pisar versiones.
let habitQueue = Promise.resolve();
function toggleHabit(id, value) {
  habitQueue = habitQueue.then(async () => {
    const attempt = async () => {
      const rec = todayHabitRecord();
      const items = { ...(rec?.data.items || {}), [id]: value };
      const data = { items, ...(rec?.data.notes ? { notes: rec.data.notes } : {}) };
      return rec
        ? api('PUT', `/api/measurements/${rec.id}`, { measured_at: rec.measured_at, data, version: rec.version })
        : api('POST', '/api/measurements', { type: 'habit', measured_at: `${todayIso()}T21:00`, data });
    };
    let r = await attempt();
    if (r.status === 409) { await loadMeasurements(); r = await attempt(); }
    if (r.ok) {
      const saved = r.data.measurement;
      S.measurements = [saved, ...(S.measurements || []).filter((m) => m.id !== saved.id)].sort((a, b) => b.measured_at.localeCompare(a.measured_at));
      notifyOthers('m');
    } else {
      toast(`No se guardó el hábito. ${r.data.error || ''}`.trim(), 'error', { label: 'Reintentar', run: () => toggleHabit(id, value) });
    }
    if (!isEditing()) render();
  });
}

function routeProgressBar(week) {
  return `<div class="route-bar" aria-hidden="true">${ROUTE.map((w) => `<span class="${w.n < week ? 'done' : w.n === week ? 'now' : ''}"></span>`).join('')}</div>`;
}

function baselineChecklist(c) {
  const ms = S.measurements || [];
  const has = (t) => ms.some((m) => m.type === t);
  const items = [
    { done: has('weight'), label: 'Peso de inicio', href: '#/registrar/weight' },
    { done: has('waist'), label: 'Medida de cintura', href: '#/registrar/waist' },
    { done: c.bpWeek.done, label: `Semana de presión (${c.bpWeek.completeDays}/7 días con mañana y noche)`, href: '#/registrar/bp' },
    { done: has('lab'), label: 'Exámenes que ya tengas (opcional)', href: '#/registrar/lab' },
  ];
  return `<ul class="list todo">${items.map((it) => `<li><a class="list-item" href="${it.href}"><span class="tick ${it.done ? 'on' : ''}">${it.done ? icon('check', 'sm') : ''}</span><span class="grow ${it.done ? 'muted' : ''}">${esc(it.label)}</span>${it.done ? '' : icon('chevron-right', 'chev')}</a></li>`).join('')}</ul>`;
}

function habitChecklist(week) {
  const habits = activeHabits(week);
  const rec = todayHabitRecord();
  return `<ul class="list todo">${habits.map((h) => {
    const on = !!rec?.data.items?.[h.id];
    return `<li><button class="list-item" type="button" data-habit="${h.id}" aria-pressed="${on}"><span class="tick ${on ? 'on' : ''}">${on ? icon('check', 'sm') : ''}</span><span class="grow">${esc(h.label)}</span>${h.id === routeWeek(week).habit || h.id === routeWeek(week).extraHabit ? '<span class="badge">Nuevo</span>' : ''}</button></li>`;
  }).join('')}</ul>`;
}

function viewToday() {
  const p = S.profile.data;
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const ms = measurementsState();
  const idx = Math.min(6, Math.max(0, dayIndexToday()));
  const plan = S.plan.data;
  const week = plan.coach?.week || 1;
  const rw = routeWeek(week);
  let coachBlock = ms.block || '';
  if (ms.list) {
    const c = coachState();
    const habits = activeHabits(week);
    const windowDays = Math.min(7, c.daysInWeek + 1);
    const adh = habitAdherence(S.measurements, habits, new Date(), windowDays);
    const todayDone = habits.filter((h) => todayHabitRecord()?.data.items?.[h.id]).length;
    const h = new Date().getHours();
    const showBp = c.goals.includes('presion') || week === 1 || week === 12;
    const bpSlot = h < 12 ? 'de la mañana' : h >= 17 ? 'de la noche' : '';
    const nextActions = c.actions.filter((a) => !(showBp && a.id === 'bp-week'));
    coachBlock = `
    ${latestAlertBanner()}
    <section class="focus" aria-labelledby="h-focus">
      <div class="row spread"><span class="focus-kicker">Semana ${week} de ${ROUTE.length}</span><a class="focus-link" href="#/ruta/${week}">Ver guía ${icon('chevron-right', 'sm')}</a></div>
      <h2 id="h-focus">${esc(rw.title)}</h2>
      <p>${esc(rw.why)}</p>
      ${routeProgressBar(week)}
      ${c.canAdvance ? `<div class="actions" style="margin-top:14px"><a class="btn sm light" href="#/revision">${icon('flag', 'sm')}Revisar la semana y avanzar</a></div>` : `<p class="focus-meta">Día ${windowDays} de esta etapa${habits.length && adh.daysLogged >= 3 ? `. Cumpliste tus hábitos el ${adh.total}% de estos días.` : ''}</p>`}
    </section>
    ${showBp ? `<a class="bp-cta" href="#/registrar/bp">${icon('heart-pulse')}<span class="grow"><strong>Registrar presión${bpSlot ? ` ${bpSlot}` : ''}</strong><span class="sub">${c.bpWeek.done ? 'Tu semana de medición está completa.' : `Semana de medición: ${c.bpWeek.completeDays} de 7 días con mañana y noche.`}</span></span>${icon('chevron-right', 'chev')}</a>` : ''}

    <section class="section" aria-labelledby="h-check">
      <div class="section-head"><h2 id="h-check">${week === 1 ? 'Tu punto de partida' : 'Tu checklist de hoy'}</h2>${week > 1 ? `<span class="muted small" id="today-count">${todayDone} de ${habits.length}</span>` : ''}</div>
      ${week === 1 ? baselineChecklist(c) : habitChecklist(week)}
    </section>

    ${nextActions.length ? `<section class="section" aria-labelledby="h-next"><h2 id="h-next">Tu próximo paso</h2>
      <div class="stack">${nextActions.slice(0, 1).map((a) => `<div class="card next">${icon(a.id.startsWith('bp') ? 'heart-pulse' : a.id.startsWith('weight') ? 'scale' : a.id.startsWith('labs') ? 'droplet' : a.id === 'strength' ? 'dumbbell' : 'footprints')}
        <div class="grow"><p class="title">${esc(a.title)}</p><p class="small muted">${esc(a.detail)}</p><a class="btn sm secondary" href="${a.href}" style="margin-top:10px">${esc(a.cta)}</a></div></div>`).join('')}</div></section>` : ''}

    ${c.insights.length || nextActions.length > 1 ? `<section class="section"><a class="data-link" href="#/progreso" data-ptab-link="general">${icon('chart-line')}<span class="grow"><strong>Lo que muestran tus datos</strong><br>${c.insights.length ? `${c.insights.length} ${c.insights.length === 1 ? 'observación' : 'observaciones'} del coach` : 'Ver tu progreso'}</span>${icon('chevron-right', 'chev')}</a></section>` : ''}`;
  }
  const html = `
    <div class="page-head"><h1>${hello}${p.name ? `, ${esc(p.name)}` : ''}</h1><p class="muted">${formatDateLong(todayIso())}</p></div>
    ${weekBanner()}
    ${coachBlock}
    <section class="section" aria-labelledby="h-meals">
      <div class="section-head"><h2 id="h-meals">Comidas de hoy</h2><a class="btn ghost sm" href="#/alimentacion">Menú ${icon('chevron-right', 'sm')}</a></div>
      <ul class="list">${MEALS.map((m) => {
        const r = recipeById(plan.menu[idx]?.[m.id]);
        const done = !!plan.done[`${addDays(plan.weekStart, idx)}:${m.id}`];
        return `<li class="list-item meal-row"><span class="swatch ${m.id}" style="width:40px;height:40px">${icon(MEAL_ICON[m.id], 'sm')}</span>
          <a class="grow" href="${r ? `#/receta/${r.id}?d=${idx}&m=${m.id}` : '#/alimentacion'}" style="color:inherit;text-decoration:none"><span class="sub">${mealLabel(m.id)} · ${esc(p.mealTimes?.[m.id] || '')}</span><br><span class="title">${r ? esc(r.name) : 'Sin receta'}</span></a>
          <button class="tick-btn" type="button" data-act="done" data-day="${idx}" data-meal="${m.id}" aria-pressed="${done}" aria-label="${done ? 'Hecha' : 'Marcar hecha'}: ${mealLabel(m.id)}"><span class="tick ${done ? 'on' : ''}">${done ? icon('check', 'sm') : ''}</span></button></li>`;
      }).join('')}</ul>
    </section>
    <section class="section" aria-labelledby="h-reg">
      <h2 id="h-reg">Registrar</h2>
      <div class="quick two">
        <a href="#/registrar/activity">${icon('footprints')}Actividad</a>
        <a href="#/registrar/weight">${icon('scale')}Peso</a>
      </div>
      <details class="more" style="margin-top:8px"><summary>Más registros</summary>
        <div class="quick" style="margin-top:6px">
          <a href="#/registrar/bp">${icon('heart-pulse')}Presión</a>
          <a href="#/registrar/sleep">${icon('moon')}Sueño</a>
          <a href="#/registrar/lab">${icon('droplet')}Examen</a>
          <a href="#/registrar/waist">${icon('ruler')}Cintura</a>
          <a href="#/registrar/habit">${icon('list')}Hábitos de otro día</a>
        </div>
      </details>
    </section>
    <section class="section"><a class="list-item card" href="#/emergencia" style="color:var(--alert-ink)">${icon('phone')}<span class="grow"><span class="title">Tengo síntomas ahora</span><br><span class="sub">Dolor de pecho, falta de aire, desmayo o síntomas neurológicos</span></span>${icon('chevron-right', 'chev')}</a></section>`;
  return {
    title: 'Hoy', html, bind: () => {
      bindMealActions();
      $$('[data-habit]').forEach((b) => b.onclick = () => {
        const on = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', on);
        b.querySelector('.tick').classList.toggle('on', on);
        b.querySelector('.tick').innerHTML = on ? icon('check', 'sm') : '';
        const cnt = $('#today-count'); if (cnt) cnt.textContent = `${$$('[data-habit][aria-pressed=true]').length} de ${$$('[data-habit]').length}`;
        toggleHabit(b.dataset.habit, on);
      });
    },
  };
}

// ---------------------------------------------------------------------------
// RUTA
// ---------------------------------------------------------------------------
function viewRoute([nRaw]) {
  const cur = S.plan.data.coach?.week || 1;
  if (nRaw) {
    const n = Number(nRaw);
    const w = ROUTE.find((x) => x.n === n);
    if (!w) return { title: 'Ruta', html: emptyState('map', 'Esa semana no existe', '', '#/ruta', 'Ver la ruta') };
    const habits = [w.habit, w.extraHabit].filter(Boolean).map((id) => activeHabits(12).find((h) => h.id === id));
    const html = `
      <a class="back" href="#/ruta">${icon('chevron-left')}Ruta</a>
      <div class="focus"><span class="focus-kicker">Semana ${w.n} de ${ROUTE.length}${w.n === cur ? ' · tu semana actual' : ''}</span><h1 style="color:#fff;margin-top:6px">${esc(w.title)}</h1><p>${esc(w.why)}</p></div>
      <section class="section"><h2>Cómo hacerlo</h2><div class="card"><ul class="bullets">${w.how.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></section>
      ${habits.length ? `<section class="section"><h2>Hábito que se suma a tu checklist</h2><ul class="list">${habits.map((h) => `<li class="list-item">${icon('circle-check')}<span class="grow">${esc(h.label)}</span></li>`).join('')}</ul></section>` : ''}
      <section class="section"><p class="small muted">Para: ${w.goals.map((g) => GOALS.find((x) => x.id === g).short).join(', ')}. Fuente: ${extLink(w.source)}</p></section>
      ${w.n !== cur ? `<div class="thumb-bar no-print"><button class="btn ${w.n > cur ? '' : 'secondary'}" type="button" data-go-week="${w.n}">${w.n > cur ? `Empezar la semana ${w.n}` : `Volver a la semana ${w.n}`}</button></div>` : ''}`;
    return { title: w.title, html, bind: bindRouteJump };
  }
  const html = `
    <div class="page-head"><h1>Tu ruta</h1><p class="muted">12 etapas, un cambio a la vez. Avanzás cuando te sentís listo; no hay fechas límite.</p></div>
    ${routeProgressBar(cur)}
    <ol class="route">${ROUTE.map((w) => `<li class="${w.n < cur ? 'done' : w.n === cur ? 'now' : ''}"><a href="#/ruta/${w.n}">
      <span class="route-n">${w.n < cur ? icon('check', 'sm') : w.n}</span>
      <span class="grow"><span class="title">${esc(w.title)}</span><br><span class="sub">${w.n === cur ? 'Semana actual' : w.n < cur ? 'Completada' : w.goals.map((g) => GOALS.find((x) => x.id === g).short).join(' · ')}</span></span>${icon('chevron-right', 'chev')}</a></li>`).join('')}</ol>
    <div class="actions" style="margin-top:18px"><a class="btn secondary" href="#/revision">${icon('flag')}Revisión semanal</a></div>`;
  return { title: 'Ruta', html, bind: bindRouteJump };
}
function bindRouteJump() {
  $$('[data-go-week]').forEach((b) => b.onclick = () => {
    const week = Number(b.dataset.goWeek);
    const cur = S.plan.data.coach?.week || 1;
    if (week > cur + 1 && b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = `Saltar ${week - cur} semanas: tocá de nuevo`; return; }
    S.plan.data.coach = { week, since: todayIso() };
    planOps([{ type: 'setCoachWeek', week, since: todayIso() }], { okMsg: `Empezaste la semana ${week}: ${routeWeek(week).title}.`, rerender: false }).then(() => go('#/hoy'));
  });
}

// ---------------------------------------------------------------------------
// REVISIÓN SEMANAL
// ---------------------------------------------------------------------------
function viewReview() {
  const ms = measurementsState();
  if (ms.block) return { title: 'Revisión semanal', html: ms.block, bind: bindMealActions };
  const r = weeklyReview({ profile: S.profile.data, plan: S.plan.data, measurements: S.measurements });
  const next = r.week < ROUTE.length ? routeWeek(r.week + 1) : null;
  const bar = (pct) => `<div class="progress-track" style="margin-top:6px"><div class="progress-fill" style="width:${pct}%"></div></div>`;
  const html = `
    <a class="back" href="#/ruta">${icon('chevron-left')}Ruta</a>
    <div class="page-head"><h1>Revisión semanal</h1><p class="muted">Últimos 7 días comparados con los 7 anteriores. Semana ${r.week}: ${esc(routeWeek(r.week).title)}.</p></div>
    ${r.wins.length ? `<div class="banner ok">${icon('trophy')}<div><p><strong>Lo que salió bien</strong></p><ul>${r.wins.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div></div>` : `<div class="banner info">${icon('info')}<p>Todavía no hay suficientes registros para comparar. Lo importante es seguir anotando: la próxima revisión será más útil.</p></div>`}
    ${r.habits.length ? `<section class="section"><h2>Hábitos</h2><div class="card stack">${r.habits.map((h) => `<div><div class="row spread"><span>${esc(h.label)}</span><strong>${r.cur.byHabit[h.id].done}/7</strong></div>${bar(r.cur.byHabit[h.id].pct)}</div>`).join('')}
      <p class="small muted">Días con registro de hábitos: ${r.cur.daysLogged} de 7.</p></div></section>` : ''}
    <section class="section"><h2>Números de la semana</h2><div class="metrics">
      <div class="metric"><div class="k">Presión promedio</div>${r.bpNow ? `<div class="v">${r.bpNow.sys}/${r.bpNow.dia}</div><div class="d">${r.bpNow.n} lecturas${r.bpPrev ? ` · antes ${r.bpPrev.sys}/${r.bpPrev.dia}` : ''}</div>` : '<div class="v muted">—</div><div class="d">Sin lecturas</div>'}</div>
      <div class="metric"><div class="k">Peso</div>${r.wNow ? `<div class="v">${fmt(r.wNow.data.kg)} kg</div><div class="d">${r.wPrev ? `antes ${fmt(r.wPrev.data.kg)} kg` : formatDateShort(r.wNow.measured_at)}</div>` : '<div class="v muted">—</div><div class="d">Sin registro</div>'}</div>
      <div class="metric"><div class="k">Actividad</div><div class="v">${r.act.minutes} min</div><div class="d">meta 150 · antes ${r.actPrev.minutes}</div></div>
      <div class="metric"><div class="k">Fuerza</div><div class="v">${r.act.strengthDays} días</div><div class="d">meta 2 por semana</div></div>
    </div></section>
    ${r.hardest ? `<section class="section"><div class="banner warn">${icon('target')}<div><p><strong>Lo que más costó: ${esc(r.hardest.label.toLowerCase())}</strong></p><p>Antes de sumar algo nuevo, podés quedarte otra semana en esta etapa. Elegí un momento fijo del día para este hábito.</p></div></div></section>` : ''}
    <div class="end-actions no-print">
      <a class="btn secondary" href="#/hoy">Seguir aquí</a>
      ${next ? `<button class="btn" type="button" data-go-week="${next.n}">Ir a semana ${next.n}</button>` : '<a class="btn" href="#/resumen">Resumen para tu médico</a>'}
    </div>`;
  return { title: 'Revisión semanal', html, bind: bindRouteJump };
}

function bindMealActions() {
  $$('[data-act=done]').forEach((b) => b.onclick = () => {
    const day = Number(b.dataset.day), meal = b.dataset.meal;
    const date = addDays(S.plan.data.weekStart, day);
    const value = b.getAttribute('aria-pressed') !== 'true';
    S.plan = { ...S.plan, data: { ...S.plan.data, done: { ...S.plan.data.done, [`${date}:${meal}`]: value } } };
    if (!value) delete S.plan.data.done[`${date}:${meal}`];
    render();
    planOps([{ type: 'setDone', date, meal, value }], { okMsg: value ? 'Comida marcada como realizada.' : 'Marca quitada.' });
  });
  $$('[data-act=swap]').forEach((b) => b.onclick = () => openSwap(Number(b.dataset.day), b.dataset.meal));
  $$('[data-act=new-week]').forEach((b) => b.onclick = () => {
    const ops = [{ type: 'newWeek', weekStart: mondayOf(new Date()) }];
    if (!b.dataset.keep) ops.push({ type: 'regenerate', allergies: S.profile.data.allergies, offset: Math.floor(Math.random() * 5) + 1 });
    planOps(ops, { okMsg: 'Semana actualizada. La lista de compras se recalculó.' });
  });
  $$('[data-act=retry-m]').forEach((b) => b.onclick = () => { S.mError = null; loadMeasurements().then(render); render(); });
}

// Hoja para cambiar una comida
function openSwap(day, meal) {
  const allergies = S.profile.data.allergies;
  const current = S.plan.data.menu[day][meal];
  const options = compatibleRecipes(meal, allergies);
  const incompatible = RECIPES.filter((r) => r.meals.includes(meal) && !isCompatible(r, allergies));
  const dlg = document.createElement('dialog');
  dlg.className = 'sheet';
  dlg.setAttribute('aria-labelledby', 'swap-title');
  dlg.innerHTML = `
    <div class="sheet-head"><h2 id="swap-title">Cambiar ${mealLabel(meal).toLowerCase()} del ${DAYS[day].toLowerCase()}</h2><button class="icon-btn" type="button" data-close aria-label="Cerrar">${icon('x')}</button></div>
    <div class="sheet-body">
      <ul class="list">${options.map((r) => `<li><button class="list-item" type="button" data-pick="${r.id}" ${r.id === current ? 'aria-current="true"' : ''}>
        <span class="grow"><span class="title">${esc(r.name)}</span><br><span class="sub">${r.minutes} min · ${esc(r.plate.split(' · ')[0])}</span></span>
        ${r.id === current ? `<span class="badge">Actual</span>` : icon('chevron-right', 'chev')}</button></li>`).join('')}</ul>
      ${incompatible.length ? `<p class="small muted" style="margin-top:14px">${incompatible.length} ${incompatible.length === 1 ? 'receta no se muestra porque contiene' : 'recetas no se muestran porque contienen'} alimentos de tu lista de alergias.</p>` : ''}
    </div>`;
  document.body.appendChild(dlg);
  dlg.showModal();
  const close = () => { dlg.close(); dlg.remove(); };
  dlg.querySelector('[data-close]').onclick = close;
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  dlg.querySelectorAll('[data-pick]').forEach((b) => b.onclick = () => {
    const id = b.dataset.pick;
    close();
    if (id === current) return;
    S.plan.data.menu[day][meal] = id;
    render();
    planOps([{ type: 'setMeal', day, meal, recipeId: id }], { okMsg: `Cambiado a ${recipeById(id).name}. Lista de compras actualizada.` });
  });
}

// ---------------------------------------------------------------------------
// ALIMENTACIÓN
// ---------------------------------------------------------------------------
function viewFood() {
  const tab = S.ui.foodTab;
  const plan = S.plan.data;
  const todayIdx = dayIndexToday();
  if (S.ui.foodDay == null) S.ui.foodDay = Math.min(6, Math.max(0, todayIdx));
  const d = S.ui.foodDay;
  let body;
  if (tab === 'semana') {
    body = `
      <div class="days" role="group" aria-label="Día de la semana">${DAYS.map((name, i) => {
        const date = parseIsoDate(addDays(plan.weekStart, i));
        return `<button class="day-chip ${i === todayIdx ? 'today' : ''}" type="button" data-dayidx="${i}" aria-pressed="${i === d}" aria-label="${name} ${date.getDate()}${i === todayIdx ? ', hoy' : ''}"><span>${name.slice(0, 3)}</span><b>${date.getDate()}</b></button>`;
      }).join('')}</div>
      <h2 style="margin:6px 0 12px">${DAYS[d]} ${formatDateShort(addDays(plan.weekStart, d))}</h2>
      ${MEALS.map((m) => mealCard(d, m.id)).join('')}
      <section class="section">
        <div class="card flat stack">
          <h3>Cómo armar el plato</h3>
          <p>Medio plato de verduras, un cuarto de proteína y un cuarto de almidón (arroz, tubérculos, tortilla). Las cantidades de cada receta son orientativas para una persona adulta; ajustalas según tu hambre, tu actividad y las indicaciones de tu equipo de salud.</p>
          <p class="small muted">Pulso no calcula calorías individuales: para una prescripción personalizada se necesita una valoración profesional.</p>
        </div>
      </section>
      <section class="section"><h2>Preparación del fin de semana</h2>${batchPlan()}</section>
`;
  } else {
    const f = S.ui.recipeFilter;
    const allergies = S.profile.data.allergies;
    const list = RECIPES.filter((r) => f === 'todas' || r.meals.includes(f));
    body = `
      <div class="chips" role="group" aria-label="Filtrar recetas">${[['todas', 'Todas'], ...MEALS.map((m) => [m.id, m.label])].map(([v, l]) => `<button class="chip" type="button" data-filter="${v}" aria-pressed="${f === v}">${l}</button>`).join('')}</div>
      <ul class="list" style="margin-top:16px">${list.map((r) => {
        const ok = isCompatible(r, allergies);
        return `<li><a class="list-item" href="#/receta/${r.id}"><span class="swatch ${r.meals[0]}" style="width:44px;height:44px">${icon(MEAL_ICON[r.meals[0]], 'sm')}</span>
          <span class="grow"><span class="title">${esc(r.name)}</span><br><span class="sub">${r.minutes} min · ${r.meals.map(mealLabel).join(' o ')}</span>${ok ? '' : `<br><span class="badge alert">${icon('triangle-alert', 'sm')}Contiene alérgenos de tu perfil</span>`}</span>${icon('chevron-right', 'chev')}</a></li>`;
      }).join('')}</ul>`;
  }
  const html = `
    <div class="page-head"><h1>Comer</h1><p class="muted">Semana del ${formatDateShort(plan.weekStart)} al ${formatDateShort(addDays(plan.weekStart, 6))}</p></div>
    ${weekBanner()}
    <div class="seg" role="group" aria-label="Vista"><button type="button" data-tab="semana" aria-pressed="${tab === 'semana'}">Menú</button><button type="button" data-tab="recetas" aria-pressed="${tab === 'recetas'}">Recetas</button><a href="#/compras">Compras</a></div>
    <div style="margin-top:18px">${body}</div>`;
  return {
    title: 'Comer', html, bind: () => {
      bindMealActions();
      $$('[data-tab]').forEach((b) => b.onclick = () => { S.ui.foodTab = b.dataset.tab; render(); });
      $$('[data-dayidx]').forEach((b) => b.onclick = () => { S.ui.foodDay = Number(b.dataset.dayidx); render(); });
      $$('[data-filter]').forEach((b) => b.onclick = () => { S.ui.recipeFilter = b.dataset.filter; render(); });
      const chip = $('.day-chip[aria-pressed=true]'); chip?.scrollIntoView({ block: 'nearest', inline: 'center' });
    },
  };
}

function batchPlan() {
  const used = new Set();
  S.plan.data.menu.forEach((d) => MEALS.forEach((m) => d[m.id] && used.add(d[m.id])));
  const ings = new Set();
  used.forEach((id) => recipeById(id).ingredients.forEach((i) => ings.add(i.id)));
  const tasks = [];
  if (ings.has('frijoles')) tasks.push('Remojá y cociná los frijoles de la semana; guardá porciones de 1 taza.');
  if (ings.has('arroz')) tasks.push('Cociná una olla de arroz y enfriala extendida antes de refrigerarla.');
  if (ings.has('pechuga')) tasks.push('Cociná y desmenuzá parte del pollo; marina el resto en porciones y congelalo.');
  if (ings.has('camote') || ings.has('papa') || ings.has('yuca')) tasks.push('Asá o cociná camote, papa o yuca para 2–3 días.');
  if (ings.has('huevo') && used.has('avena-banano')) tasks.push('Cociná huevos duros para los desayunos.');
  tasks.push('Lavá, secá y picá las verduras de los primeros días.');
  return `<div class="card"><ol class="bullets">${tasks.map((t) => `<li>${esc(t)}</li>`).join('')}</ol><p class="small muted" style="margin-top:10px">Generado a partir de tu menú. Los alimentos cocidos duran 3–4 días refrigerados; congelá lo que vayas a comer después.</p></div>`;
}

function viewRecipe([idRaw]) {
  const [id, qs] = (idRaw || '').split('?');
  const r = recipeById(id);
  if (!r) return { title: 'Receta', html: `<a class="back" href="#/alimentacion">${icon('chevron-left')}Alimentación</a>${emptyState('chef-hat', 'No encontramos esa receta', 'Puede que el enlace esté incompleto.', '#/alimentacion', 'Volver al menú')}` };
  const params = new URLSearchParams(qs || '');
  const day = params.has('d') ? Number(params.get('d')) : null;
  const meal = params.get('m');
  const allergies = S.profile.data.allergies;
  const contains = recipeAllergens(r);
  const conflict = contains.filter((a) => allergies.includes(a));
  const adults = S.plan.data.adults;
  const alts = r.alternatives.filter((a) => !/no lleva/.test(a.text) || allergies.includes(a.when));
  const relevantAlts = alts.filter((a) => allergies.includes(a.when) || (S.profile.data.preferences.includes('sin_gluten') && a.when === 'gluten'));
  const otherAlts = alts.filter((a) => !relevantAlts.includes(a) && !/no lleva/.test(a.text));
  const ingRow = (ing) => {
    const def = INGREDIENTS[ing.id];
    const qty = ing.qty == null ? '' : def.base === 'g' ? `${ing.qty} g` : def.base === 'ml' ? `${ing.qty} ml` : fmtUnits(ing.qty, def);
    const state = ing.state && !['unidad', 'líquido'].includes(ing.state) ? `<span class="state ${ing.state}">${ing.state === 'fresco' ? 'crudo' : ing.state}</span>` : '';
    return `<li><span>${esc(def.name.replace(/ \(.*\)$/, ''))}${state}</span><span class="amt">${esc(qty || (ing.qty == null ? 'al gusto' : ing.home))}</span>${qty && ing.home && ing.home !== 'al gusto' ? `<span class="home">${esc(ing.home)}</span>` : ''}</li>`;
  };
  const html = `
    <a class="back no-print" href="#/alimentacion">${icon('chevron-left')}Comer</a>
    <div class="recipe-hero ${r.meals[0]}">
      <div class="row wrap">${r.meals.map((m) => `<span class="meal-tag ${m}">${mealLabel(m)}</span>`).join('')}<span class="muted small row" style="gap:4px">${icon('timer', 'sm')}${r.minutes} min</span></div>
      <h1>${esc(r.name)}</h1>
      <p>${esc(r.summary)}</p>
      <p class="small muted">${esc(r.plate)}</p>
    </div>
    ${conflict.length ? `<div class="banner alert" style="margin-top:16px" role="alert">${icon('triangle-alert')}<div><p><strong>Contiene ${conflict.map((a) => ALLERGENS.find((x) => x.id === a).label.toLowerCase()).join(' y ')}</strong></p><p>Está en tu lista de alergias. Usá la alternativa indicada abajo o elegí otra receta.</p></div></div>` : ''}
    <div class="two-col stack-lg" style="margin-top:20px">
      <section class="card">
        <div class="section-head" style="margin-bottom:4px"><h2>Ingredientes</h2><span class="muted small">por persona</span></div>
        <p class="small muted">Los pesos indican si son en crudo, en seco o ya cocidos.${adults > 1 ? ` Para tu casa (${adults} adultos), multiplicá por ${adults}.` : ''}</p>
        <ul class="ingredients" style="margin-top:6px">${r.ingredients.map(ingRow).join('')}</ul>
      </section>
      <section class="card">
        <h2>Preparación</h2>
        <ol class="steps" style="margin-top:8px">${r.steps.map((s) => `<li><span>${esc(s)}</span></li>`).join('')}</ol>
      </section>
    </div>
    ${relevantAlts.length || otherAlts.length ? `<section class="section"><h2>Alternativas</h2><div class="card stack">
      ${relevantAlts.map((a) => `<div class="banner warn">${icon('shield-check')}<p><strong>Por tu perfil (${esc(ALLERGENS.find((x) => x.id === a.when)?.label || a.when)})</strong>${esc(a.text)}</p></div>`).join('')}
      ${otherAlts.length ? `<ul class="bullets">${otherAlts.map((a) => `<li><strong>Sin ${esc((ALLERGENS.find((x) => x.id === a.when)?.label || a.when).toLowerCase())}:</strong> ${esc(a.text)}</li>`).join('')}</ul>` : ''}
    </div></section>` : ''}
    <section class="section two-col stack-lg">
      <div class="card"><h2 class="row" style="gap:8px">${icon('chef-hat')}Cocinar por tandas</h2><ul class="bullets" style="margin-top:10px">${r.batch.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></div>
      <div class="card"><h2 class="row" style="gap:8px">${icon('snowflake')}Conservar</h2><ul class="bullets" style="margin-top:10px">${r.storage.map((b) => `<li>${esc(b)}</li>`).join('')}</ul><p class="tiny muted" style="margin-top:10px">Referencia: ${extLink(SOURCES.at(-1))}</p></div>
    </section>
    ${day != null && meal ? `<div class="thumb-bar no-print">
      <button class="btn secondary" type="button" data-act="swap" data-day="${day}" data-meal="${meal}">${icon('refresh-cw')}Cambiar</button>
      <button class="btn check-btn" type="button" data-act="done" data-day="${day}" data-meal="${meal}" aria-pressed="${!!S.plan.data.done[`${addDays(S.plan.data.weekStart, day)}:${meal}`]}">${icon('check')}${S.plan.data.done[`${addDays(S.plan.data.weekStart, day)}:${meal}`] ? 'Realizada' : 'Marcar realizada'}</button>
    </div>` : ''}`;
  return { title: r.name, html, bind: bindMealActions };
}
function fmtUnits(q, def) {
  const frac = { 0.1: '', 0.15: '', 0.25: '¼', 0.33: '⅓', 0.5: '½', 0.75: '¾' };
  const unit = def.unit || 'unidad';
  if (q < 1 && frac[q]) return `${frac[q]} ${unit}`;
  if (q < 1) return null;
  return `${fmt(q)} ${q === 1 ? unit : unit.endsWith('n') ? unit.replace(/ón$/, 'ones') : unit + 's'}`;
}

// ---------------------------------------------------------------------------
// COMPRAS
// ---------------------------------------------------------------------------
function viewShopping() {
  const plan = S.plan.data;
  const groups = shoppingList(plan);
  const total = groups.reduce((a, g) => a + g.items.length, 0);
  const bought = groups.reduce((a, g) => a + g.items.filter((i) => i.bought).length, 0);
  const html = `
    <div class="page-head"><h1>Comer</h1></div>
    <div class="seg" role="group" aria-label="Vista" style="margin-bottom:16px"><a href="#/alimentacion" data-food-tab="semana">Menú</a><a href="#/alimentacion" data-food-tab="recetas">Recetas</a><button type="button" aria-pressed="true">Compras</button></div>
    <p class="muted" style="margin-bottom:16px">Calculada a partir del menú del ${formatDateShort(plan.weekStart)} al ${formatDateShort(addDays(plan.weekStart, 6))}. Se actualiza sola cuando cambiás una receta.</p>
    <div class="card row spread wrap">
      <div><p class="title" style="font-weight:700">Adultos en casa</p><p class="small muted">Multiplica todas las cantidades</p></div>
      <div class="stepper"><button class="icon-btn" type="button" data-adults="-1" aria-label="Menos adultos" ${plan.adults <= 1 ? 'disabled' : ''}>−</button><output aria-live="polite">${plan.adults}</output><button class="icon-btn" type="button" data-adults="1" aria-label="Más adultos" ${plan.adults >= 12 ? 'disabled' : ''}>${icon('plus')}</button></div>
    </div>
    <div class="row spread" style="margin:18px 0 6px"><p class="muted small">${bought} de ${total} productos comprados</p><span class="row" style="gap:4px">${bought ? '<button class="btn ghost sm" type="button" data-act="clear-bought">Desmarcar</button>' : ''}<button class="btn ghost sm no-print" type="button" data-act="print" aria-label="Imprimir lista">${icon('printer', 'sm')}</button></span></div>
    ${groups.map((g) => `
      <section class="section" style="margin-top:14px" aria-labelledby="cat-${g.cat}">
        <h2 id="cat-${g.cat}" style="font-size:1.1rem;margin-bottom:8px">${esc(g.label)}</h2>
        <ul class="list">${g.items.map((it) => `<li class="shop-item ${it.bought ? 'bought' : ''}">
          <input type="checkbox" id="b-${it.id}" data-buy="${it.id}" ${it.bought ? 'checked' : ''}>
          <div><label for="b-${it.id}"><span class="name">${esc(it.name)}</span><br><span class="qty">${esc(it.label)}</span>${it.fromCooked.length ? ` <span class="badge warn">convertido desde ${esc(it.fromCooked.join(' y '))}</span>` : ''}</label>
          ${it.conv ? `<details><summary>¿Cómo se calculó?</summary><p class="small muted">${esc(it.conv)} Aparece en ${it.uses} ${it.uses === 1 ? 'preparación' : 'preparaciones'} del menú.</p></details>` : ''}</div>
        </li>`).join('')}</ul>
      </section>`).join('')}
    <p class="disclaimer">Cantidades aproximadas y redondeadas hacia arriba. Revisá tu despensa antes de salir. Pulso no muestra precios porque varían según el lugar y la fecha.</p>
    <div class="thumb-bar no-print">
      <button class="btn secondary" type="button" data-act="share-list">${icon('share-2')}Compartir</button>
      <button class="btn secondary" type="button" data-act="download-list">${icon('download')}Descargar</button>
    </div>`;
  return {
    title: 'Compras', html, bind: () => {
      $$('[data-food-tab]').forEach((a) => a.onclick = () => { S.ui.foodTab = a.dataset.foodTab; });
      $$('[data-buy]').forEach((c) => c.onchange = () => {
        const id = c.dataset.buy, value = c.checked;
        c.closest('.shop-item').classList.toggle('bought', value);
        if (value) S.plan.data.bought[id] = true; else delete S.plan.data.bought[id];
        planOps([{ type: 'setBought', id, value }], { rerender: false }).then(() => { if (!isEditing()) render(); });
      });
      $$('[data-adults]').forEach((b) => b.onclick = () => {
        const v = Math.min(12, Math.max(1, plan.adults + Number(b.dataset.adults)));
        S.plan.data.adults = v; render();
        planOps([{ type: 'setAdults', value: v }], { okMsg: `Cantidades para ${v} ${v === 1 ? 'adulto' : 'adultos'}.` });
      });
      $('[data-act=clear-bought]')?.addEventListener('click', () => {
        const prev = { ...S.plan.data.bought };
        S.plan.data.bought = {}; render();
        planOps([{ type: 'clearBought' }], { rerender: false }).then(() => toast('Lista desmarcada.', 'ok', { label: 'Deshacer', run: () => { S.plan.data.bought = prev; render(); planOps(Object.keys(prev).map((id) => ({ type: 'setBought', id, value: true }))); } }));
      });
      const text = () => shoppingText(shoppingList(S.plan.data), S.plan.data.adults, S.plan.data.weekStart);
      $('[data-act=share-list]').onclick = async () => {
        if (navigator.share) { try { await navigator.share({ title: 'Lista de compras', text: text() }); return; } catch (e) { if (e.name === 'AbortError') return; } }
        try { await navigator.clipboard.writeText(text()); toast('Lista copiada. Pegala en WhatsApp o en tus notas.'); }
        catch { toast('No se pudo copiar. Usá "Descargar".', 'error'); }
      };
      $('[data-act=download-list]').onclick = () => downloadBlob(text(), `pulso-compras-${S.plan.data.weekStart}.txt`, 'text/plain');
      $('[data-act=print]').onclick = () => window.print();
    },
  };
}

function downloadBlob(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast(`Descargado: ${filename}`);
}

// ---------------------------------------------------------------------------
// GRÁFICOS (SVG propio, con tooltip táctil)
// ---------------------------------------------------------------------------
const CHART = { w: 340, h: 180, l: 40, r: 12, t: 14, b: 26 };
function lineChart({ id, series, unit, target, label, refLines }) {
  const pts = series.flatMap((s) => s.points);
  if (!pts.length) return '';
  const xs = pts.map((p) => p.t);
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (x1 === x0) { x0 -= 86400000; x1 += 86400000; }
  const ys = pts.map((p) => p.y).concat(target != null ? [target] : []);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = Math.max((y1 - y0) * 0.15, unit === 'mmHg' ? 5 : 0.5);
  y0 -= pad; y1 += pad;
  const { w, h, l, r, t, b } = CHART;
  const X = (v) => l + ((v - x0) / (x1 - x0)) * (w - l - r);
  const Y = (v) => t + (1 - (v - y0) / (y1 - y0)) * (h - t - b);
  // Marcas del eje en valores redondos (múltiplos de 1, 2, 5, 10, 20…).
  const raw = (y1 - y0) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const stepY = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((v) => v >= raw) || 10 * mag;
  y0 = Math.floor(y0 / stepY) * stepY; y1 = Math.ceil(y1 / stepY) * stepY;
  const grid = []; for (let v = y0; v <= y1 + 1e-9; v += stepY) grid.push(Math.round(v * 100) / 100);
  const fmtY = (v) => fmt(v, stepY < 1 ? 1 : 0);
  const refs = (refLines || []).filter((r) => r.v > y0 && r.v < y1);
  const dateTicks = [x0, (x0 + x1) / 2, x1].map((v) => ({ v, s: formatDateShort(isoDate(new Date(v))) }));
  const data = series.map((s) => ({ label: s.label, color: s.color, points: s.points.map((p) => ({ x: X(p.t), y: Y(p.y), v: p.y, d: p.d })) }));
  return `
  <div class="chart" data-chart='${esc(JSON.stringify(data))}' data-unit="${esc(unit)}">
    <svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">
      <g class="grid">${grid.map((v) => `<line x1="${l}" x2="${w - r}" y1="${Y(v)}" y2="${Y(v)}"/>`).join('')}</g>
      <g class="axis">${grid.map((v) => `<text x="${l - 6}" y="${Y(v) + 4}" text-anchor="end">${fmtY(v)}</text>`).join('')}
        ${dateTicks.map((d, i) => `<text x="${X(d.v)}" y="${h - 6}" text-anchor="${i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}">${d.s}</text>`).join('')}</g>
      ${refs.map((rl) => `<line x1="${l}" x2="${w - r}" y1="${Y(rl.v)}" y2="${Y(rl.v)}" stroke="#9AA59E" stroke-width="1" stroke-dasharray="2 3"/><text class="ref" x="${l + 4}" y="${Y(rl.v) - 4}" text-anchor="start">${esc(rl.label)}</text>`).join('')}
      ${target != null ? `<line x1="${l}" x2="${w - r}" y1="${Y(target)}" y2="${Y(target)}" stroke="#5F6A64" stroke-width="1.5" stroke-dasharray="4 3"/>` : ''}
      ${data.map((s, si) => `<polyline fill="none" stroke="${s.color}" stroke-width="2" ${series[si].dashed ? 'stroke-dasharray="5 3"' : ''} stroke-linejoin="round" stroke-linecap="round" points="${s.points.map((p) => `${p.x},${p.y}`).join(' ')}"/>
        ${s.points.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${s.color}" stroke="#fff" stroke-width="2"/>`).join('')}`).join('')}
      <line class="cross" x1="0" x2="0" y1="${t}" y2="${h - b}" stroke="#48534D" stroke-width="1" opacity="0"/>
    </svg>
    <div class="tip" aria-hidden="true"></div>
  </div>`;
}
function bindCharts() {
  $$('.chart[data-chart]').forEach((el) => {
    const data = JSON.parse(el.dataset.chart);
    const svg = el.querySelector('svg'), tip = el.querySelector('.tip'), cross = el.querySelector('.cross');
    const unit = el.dataset.unit;
    const show = (clientX) => {
      const box = svg.getBoundingClientRect();
      const x = ((clientX - box.left) / box.width) * CHART.w;
      let best = null;
      data[0].points.forEach((p, i) => { if (!best || Math.abs(p.x - x) < Math.abs(best.p.x - x)) best = { p, i }; });
      if (!best) return;
      cross.setAttribute('x1', best.p.x); cross.setAttribute('x2', best.p.x); cross.setAttribute('opacity', '1');
      const lines = data.map((s) => s.points[best.i] ? `${esc(s.label)}: <b>${fmt(s.points[best.i].v)}</b> ${esc(unit)}` : '').filter(Boolean);
      tip.innerHTML = `${esc(formatDateTime(best.p.d))}<br>${lines.join('<br>')}`;
      const minY = Math.min(...data.map((s) => s.points[best.i]?.y ?? 999));
      tip.style.left = `${Math.min(Math.max((best.p.x / CHART.w) * box.width, 70), box.width - 70)}px`;
      tip.style.top = `${(minY / CHART.h) * box.height}px`;
      tip.classList.add('on');
    };
    svg.addEventListener('pointermove', (e) => show(e.clientX));
    svg.addEventListener('pointerdown', (e) => show(e.clientX));
    svg.addEventListener('pointerleave', () => { tip.classList.remove('on'); cross.setAttribute('opacity', '0'); });
  });
}
const toPoints = (list, f) => [...list].sort((a, b) => a.measured_at.localeCompare(b.measured_at)).map((m) => ({ t: parseLocal(m.measured_at).getTime(), y: f(m), d: m.measured_at }));

function statsLine(s, unit, decimals = 1) {
  if (!s.count) return '<p class="muted small">Sin mediciones en este período.</p>';
  return `<p class="small">Promedio <strong>${fmt(s.avg, decimals)} ${unit}</strong> · ${s.count} ${s.count === 1 ? 'medición' : 'mediciones'} · del ${formatDateShort(s.from)} al ${formatDateShort(s.to)}</p>`;
}

// ---------------------------------------------------------------------------
// PROGRESO
// ---------------------------------------------------------------------------
function viewProgress() {
  const ms = measurementsState();
  const tab = S.ui.progressTab;
  const tabs = [['general', 'General'], ['peso', 'Peso'], ['actividad', 'Actividad'], ['cintura', 'Cintura'], ['sueno', 'Sueño'], ['habitos', 'Hábitos']];
  let body = ms.block || '';
  if (ms.list) {
    const p = S.profile.data;
    if (tab === 'general') {
      body = progressOverview();
    } else if (tab === 'actividad') {
      const a = byType('activity');
      const wk = activityWeek(S.measurements, new Date());
      body = `<div class="section-head"><h2>Actividad</h2><a class="btn sm" href="#/registrar/activity">${icon('plus', 'sm')}Registrar</a></div>
        <div class="metrics">
          <div class="metric"><div class="k">Últimos 7 días</div><div class="v">${wk.minutes} min</div><div class="d">meta: 150 min moderados</div><div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, wk.minutes / 1.5)}%"></div></div></div>
          <div class="metric"><div class="k">Fuerza</div><div class="v">${wk.strengthDays} de 2</div><div class="d">días esta semana</div><div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, wk.strengthDays * 50)}%"></div></div></div>
        </div>
        <p class="small muted" style="margin-top:10px">${wk.postMeal} ${wk.postMeal === 1 ? 'caminata' : 'caminatas'} después de comer en 7 días. Fuente: ${extLink(COACH_SOURCES.ahaActivity)}</p>
        ${a.length ? historyList(a, (x) => `${x.data.minutes} min · ${ACTIVITY_KINDS[x.data.kind]}${x.data.afterMeal ? ' · después de comer' : ''}`) : `<div style="margin-top:16px">${emptyState('footprints', 'Sin actividad registrada', 'Caminar cuenta. Empezá con 10 minutos después del almuerzo.', '#/registrar/activity', 'Registrar actividad')}</div>`}`;
    } else if (tab === 'peso') {
      const w = byType('weight');
      const m = milestone(p.initialWeight, p.milestonePct);
      const last = w[0]?.data.kg;
      const lost = last != null && p.initialWeight ? p.initialWeight - last : null;
      const prog = m && lost != null ? Math.max(0, Math.min(1, lost / m.loss)) : 0;
      const items = w.map((x) => ({ measured_at: x.measured_at, value: x.data.kg }));
      const s30 = stats(items, 30), sAll = stats(items);
      body = `
        ${m ? `<div class="card">
          <div class="row spread"><h2>Primer hito</h2><a class="btn ghost sm" href="#/perfil">${icon('pencil', 'sm')}Editar</a></div>
          <p style="margin-top:6px">${fmt(m.target)} kg · −${fmt(m.pct)}% desde ${fmt(p.initialWeight)} kg (peso inicial declarado)</p>
          ${last != null ? `<div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(prog * 100)}" aria-label="Avance hacia el hito"><div class="progress-fill" style="width:${prog * 100}%"></div></div>
          <p class="small muted" style="margin-top:8px">${lost > 0 ? `Llevás −${fmt(lost)} kg de ${fmt(m.loss)} kg.` : 'Tu último registro aún no muestra cambio respecto al peso inicial. Los cambios llegan con el tiempo.'}</p>` : '<p class="small muted" style="margin-top:8px">Registrá tu peso para ver el avance.</p>'}
        </div>` : ''}
        <section class="section">
          <div class="section-head"><h2>Peso</h2><a class="btn sm" href="#/registrar/weight">${icon('plus', 'sm')}Registrar</a></div>
          ${w.length ? `<div class="card">${lineChart({ id: 'w', series: [{ label: 'Peso', color: '#1F7A55', points: toPoints(w, (x) => x.data.kg) }], unit: 'kg', target: m?.target, label: `Gráfico de peso con ${w.length} mediciones` })}
            <div class="legend"><span><i style="background:#1F7A55"></i>Peso</span>${m ? '<span><i class="dash"></i>Primer hito</span>' : ''}</div>
            <hr class="divider">${statsLine(s30, 'kg')}<p class="tiny muted">Últimos 30 días. Desde el inicio: ${sAll.count} mediciones.</p>
            ${p.height && last ? `<p class="tiny muted" style="margin-top:4px">IMC con tu último peso: ${fmt(bmi(last, p.height))} kg/m². Es una referencia general; no mide la composición corporal.</p>` : ''}</div>
            ${historyList(w, (x) => `${fmt(x.data.kg)} kg`)}`
            : emptyState('scale', 'Todavía no hay registros de peso', 'Pesate preferiblemente a la misma hora, por ejemplo al levantarte. Con 2 registros verás la tendencia.', '#/registrar/weight', 'Registrar peso')}
        </section>`;
    } else if (tab === 'cintura') {
      const c = byType('waist');
      const items = c.map((x) => ({ measured_at: x.measured_at, value: x.data.cm }));
      body = `<div class="section-head"><h2>Cintura</h2><a class="btn sm" href="#/registrar/waist">${icon('plus', 'sm')}Registrar</a></div>
        ${c.length ? `<div class="card">${lineChart({ series: [{ label: 'Cintura', color: '#1F7A55', points: toPoints(c, (x) => x.data.cm) }], unit: 'cm', label: `Gráfico de cintura con ${c.length} mediciones` })}<hr class="divider">${statsLine(stats(items), 'cm')}</div>${historyList(c, (x) => `${fmt(x.data.cm)} cm`)}`
        : emptyState('ruler', 'Sin medidas de cintura', 'Medí a la altura del ombligo, de pie, al final de una exhalación normal, sin apretar la cinta.', '#/registrar/waist', 'Registrar cintura')}`;
    } else if (tab === 'sueno') {
      const sl = byType('sleep');
      const items = sl.map((x) => ({ measured_at: x.measured_at, value: x.data.hours }));
      body = `<div class="section-head"><h2>Sueño</h2><a class="btn sm" href="#/registrar/sleep">${icon('plus', 'sm')}Registrar</a></div>
        ${sl.length ? `<div class="card">${lineChart({ series: [{ label: 'Horas', color: '#8A63C8', points: toPoints(sl, (x) => x.data.hours) }], unit: 'h', label: `Gráfico de horas de sueño con ${sl.length} registros` })}<hr class="divider">${statsLine(stats(items, 7), 'horas')}<p class="tiny muted">Últimos 7 días.</p></div>${historyList(sl, (x) => `${fmt(x.data.hours)} h${x.data.quality ? ` · calidad ${x.data.quality}/5` : ''}`)}`
        : emptyState('moon', 'Sin registros de sueño', 'Anotá cuántas horas dormiste anoche. Dormir bien también influye en el apetito y la presión.', '#/registrar/sleep', 'Registrar sueño')}`;
    } else {
      const hb = byType('habit');
      const HAB = activeHabits(S.plan.data.coach?.week || 1).length ? activeHabits(S.plan.data.coach?.week || 1) : HABITS.filter((h) => !h.legacy);
      body = `<div class="section-head"><h2>Hábitos</h2><a class="btn sm" href="#/registrar/habit">${icon('plus', 'sm')}Registrar hoy</a></div>
        ${hb.length ? `<div class="card"><p>${HAB.map((h) => { const n = habitAdherence(S.measurements, [h], new Date(), 7).byHabit[h.id].done; return `<span class="row spread" style="padding:8px 0;border-bottom:1px solid var(--line)"><span>${esc(h.label)}</span><strong>${n}/7</strong></span>`; }).join('')}</p><p class="tiny muted" style="margin-top:8px">Últimos 7 días (hoy incluido).</p></div>${historyList(hb, (x) => `${HAB.filter((h) => x.data.items[h.id]).length} de ${HAB.length} hábitos`)}`
        : emptyState('list', 'Sin hábitos registrados', 'Unas pocas preguntas al final del día. No se trata de ser perfecto: sirve para ver qué te ayuda.', '#/registrar/habit', 'Registrar hábitos')}`;
    }
  }
  const html = `
    <div class="page-head"><h1>Progreso</h1><p class="muted">Solo con tus registros reales.</p></div>
    <div class="seg grid3" role="group" aria-label="Indicador">${tabs.map(([k, l]) => `<button type="button" data-ptab="${k}" aria-pressed="${tab === k}">${l}</button>`).join('')}</div>
    <div style="margin-top:18px">${body}</div>`;
  return { title: 'Progreso', html, bind: () => { bindMealActions(); $$('[data-ptab]').forEach((b) => b.onclick = () => { S.ui.progressTab = b.dataset.ptab; render(); }); } };
}

// Vista general de progreso por objetivo, solo con datos reales.
function progressOverview() {
  const p = S.profile.data;
  const goals = p.goals?.length ? p.goals : GOALS.map((g) => g.id);
  const now = new Date();
  const c = coachState();
  const cards = [];
  if (goals.includes('peso')) {
    const w = byType('weight');
    const m = milestone(p.initialWeight, p.milestonePct);
    const t = weightTrend(S.measurements, now);
    const last = w[0]?.data.kg;
    const lost = last != null && p.initialWeight ? Math.round((p.initialWeight - last) * 10) / 10 : null;
    cards.push(`<div class="card goal"><div class="row spread"><h2 class="h3">${icon('scale', 'sm')} Peso</h2><a class="btn ghost sm" href="#/registrar/weight">${icon('plus', 'sm')}Registrar</a></div>
      ${last != null ? `<p class="big">${fmt(last)} kg</p><p class="small muted">Inicio declarado ${fmt(p.initialWeight)} kg${lost != null ? ` · ${lost > 0 ? '−' : '+'}${fmt(Math.abs(lost))} kg` : ''}${t ? ` · tendencia ${t.perWeek > 0 ? '+' : ''}${fmt(t.perWeek, 2)} kg/semana` : ''}</p>
      ${m ? `<div class="progress-track" role="progressbar" aria-label="Avance hacia el primer hito" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(Math.max(0, Math.min(1, (lost || 0) / m.loss)) * 100)}"><div class="progress-fill" style="width:${Math.max(0, Math.min(1, (lost || 0) / m.loss)) * 100}%"></div></div><p class="tiny muted" style="margin-top:6px">Primer hito: ${fmt(m.target)} kg (−${fmt(m.pct)}%)</p>` : ''}`
        : '<p class="muted small">Sin registros de peso todavía.</p>'}</div>`);
  }
  if (goals.includes('presion')) {
    const bp = [...byType('bp')].reverse();
    const first = bp.slice(0, 14);
    const s7 = stats(byType('bp').map((m) => ({ measured_at: m.measured_at, value: m.data.sys })), 7, now);
    const recent = s7.count ? byType('bp').filter((m) => m.measured_at >= s7.from && m.measured_at <= s7.to) : [];
    const avg = (l, k) => Math.round(l.reduce((s, m) => s + m.data[k], 0) / l.length);
    cards.push(`<div class="card goal"><div class="row spread"><h2 class="h3">${icon('heart-pulse', 'sm')} Presión</h2><a class="btn ghost sm" href="#/salud">Ver ${icon('chevron-right', 'sm')}</a></div>
      ${recent.length ? `<p class="big">${avg(recent, 'sys')}/${avg(recent, 'dia')} <span class="small muted">mmHg</span></p><p class="small muted">Promedio de ${recent.length} ${recent.length === 1 ? 'lectura' : 'lecturas'} en 7 días${bp.length >= 20 ? ` · al inicio ${avg(first, 'sys')}/${avg(first, 'dia')} (primeras ${first.length})` : ''}</p>`
        : `<p class="muted small">${bp.length ? 'Sin lecturas en los últimos 7 días.' : 'Sin lecturas todavía.'}</p>`}
      <p class="tiny muted" style="margin-top:6px">Semana de presión: ${c.bpWeek.completeDays}/7 días con mañana y noche.</p></div>`);
  }
  if (goals.includes('insulina')) {
    const labs = byType('lab');
    const a1c = labs.filter((m) => m.data.test === 'hba1c');
    const glu = labs.filter((m) => m.data.test === 'glucosa' && m.data.context === 'ayunas');
    const line = (list, name) => list.length ? `<p><strong>${name}:</strong> ${fmt(list[0].data.value, 2)} ${esc(list[0].data.unit)} <span class="muted small">(${formatDateShort(list[0].measured_at)} ${list[0].measured_at.slice(0, 4)})</span>${list.length > 1 ? `<br><span class="small muted">Primer registro: ${fmt(list.at(-1).data.value, 2)} ${esc(list.at(-1).data.unit)} (${formatDateShort(list.at(-1).measured_at)} ${list.at(-1).measured_at.slice(0, 4)})</span>` : ''}</p>` : '';
    cards.push(`<div class="card goal"><div class="row spread"><h2 class="h3">${icon('droplet', 'sm')} Resistencia a la insulina</h2><a class="btn ghost sm" href="#/registrar/lab">${icon('plus', 'sm')}Examen</a></div>
      ${a1c.length || glu.length ? `<div class="stack small">${line(a1c, 'HbA1c')}${line(glu, 'Glucosa en ayunas')}</div>` : '<p class="muted small">Sin HbA1c ni glucosa en ayunas registradas. Son los indicadores para ver tu avance; consultá a tu médico si corresponde medirlos.</p>'}
      <p class="tiny muted" style="margin-top:8px">Esta semana: ${c.activity.postMeal} caminatas después de comer · ${c.activity.strengthDays} de 2 días de fuerza · ${c.activity.minutes} de 150 min.</p></div>`);
  }
  return `
    <div class="stack">${cards.join('')}</div>
    ${c.insights.length ? `<section class="section"><h2>Lectura del coach</h2><div class="stack">${c.insights.map((i) => `<div class="banner ${i.tone === 'warn' ? 'warn' : i.tone === 'ok' ? 'ok' : 'info'}">${icon(i.tone === 'ok' ? 'trophy' : 'info')}<div><p><strong>${esc(i.title)}</strong></p><p>${esc(i.detail)}</p></div></div>`).join('')}</div></section>` : `<section class="section"><div class="empty">${icon('chart-line')}<p><strong>Las observaciones aparecen con tus registros</strong></p><p class="muted small">Con 2 semanas de peso o 6 lecturas de presión, el coach empieza a mostrar tendencias.</p></div></section>`}
    <p class="disclaimer">Pulso describe tus datos; no diagnostica. Llevá el resumen a tu médico para interpretar resultados.</p>`;
}

function historyList(list, label, limit = 10) {
  return `<h3 style="margin:20px 0 8px">Historial</h3><ul class="list">${list.slice(0, limit).map((m) => `<li><a class="list-item" href="#/registrar/${m.type}/${m.id}"><span class="grow"><span class="title">${esc(label(m))}</span><br><span class="sub">${formatDateTime(m.measured_at)}${m.data.notes ? ` · ${esc(m.data.notes.slice(0, 40))}` : ''}</span></span>${icon('pencil', 'sm chev')}<span class="sr-only">Editar</span></a></li>`).join('')}</ul>
    ${list.length > limit ? `<p class="small muted" style="margin-top:8px">Mostrando ${limit} de ${list.length}. El historial completo está en la exportación CSV.</p>` : ''}`;
}

// ---------------------------------------------------------------------------
// SALUD
// ---------------------------------------------------------------------------
function emergencyBanner() {
  const num = esc(S.profile?.data?.emergencyNumber || '911');
  return `<div class="banner emergency" role="alert">${icon('phone')}<div><p><strong>Buscá atención urgente ahora</strong></p>
    <p>Indicaste síntomas de alarma. No esperes a que la presión baje ni a volver a medir.</p>
    <div class="actions"><a class="btn call-btn" href="tel:${num}">${icon('phone')}Llamar al ${num}</a></div>
    <p class="small">Si estás solo, abrí la puerta y avisá a alguien cercano. No manejes.</p></div></div>`;
}
function crisisBanner(m) {
  return `<div class="banner alert" role="alert">${icon('triangle-alert')}<div><p><strong>Lectura muy alta: ${m.data.sys}/${m.data.dia} mmHg</strong></p>
    <ol><li>Quedate sentado y tranquilo unos 5 minutos y volvé a medir.</li>
    <li>Si sigue en 180/120 o más y no tenés síntomas, comunicate hoy mismo con tu médico o centro de salud.</li>
    <li>Si aparece dolor de pecho, falta de aire, dolor de espalda, adormecimiento o debilidad, cambios en la visión o dificultad para hablar: <strong>llamá al ${esc(S.profile?.data?.emergencyNumber || '911')}</strong>.</li></ol>
    <div class="actions"><a class="btn sm" href="#/registrar/bp">Registrar nueva medición</a><a class="btn sm secondary" href="#/emergencia">Tengo síntomas</a></div></div></div>`;
}

function viewHealth() {
  const ms = measurementsState();
  const tab = S.ui.healthTab;
  let body = ms.block || '';
  if (ms.list) {
    if (tab === 'presion') {
      const bp = byType('bp');
      const items = (f) => bp.map((x) => ({ measured_at: x.measured_at, value: f(x) }));
      const s7s = stats(items((x) => x.data.sys), 7), s7d = stats(items((x) => x.data.dia), 7);
      const s30s = stats(items((x) => x.data.sys), 30), s30d = stats(items((x) => x.data.dia), 30);
      const recent = bp.slice(0, 30);
      body = `
        ${latestAlertBanner()}
        <div class="section-head" style="margin-top:16px"><h2>Presión arterial</h2></div>
        ${bp.length ? `<div class="card">
          <div class="metrics">
            <div class="metric"><div class="k">Promedio 7 días</div>${s7s.count ? `<div class="v">${Math.round(s7s.avg)}/${Math.round(s7d.avg)}</div><div class="d">${s7s.count} ${s7s.count === 1 ? 'medición' : 'mediciones'} · ${formatDateShort(s7s.from)}–${formatDateShort(s7s.to)}</div>` : '<div class="v muted">—</div><div class="d">Sin mediciones</div>'}</div>
            <div class="metric"><div class="k">Promedio 30 días</div>${s30s.count ? `<div class="v">${Math.round(s30s.avg)}/${Math.round(s30d.avg)}</div><div class="d">${s30s.count} ${s30s.count === 1 ? 'medición' : 'mediciones'} · ${formatDateShort(s30s.from)}–${formatDateShort(s30s.to)}</div>` : '<div class="v muted">—</div><div class="d">Sin mediciones</div>'}</div>
          </div>
          ${lineChart({ series: [{ label: 'Sistólica', color: '#1F7A55', points: toPoints(recent, (x) => x.data.sys) }, { label: 'Diastólica', color: '#8A63C8', dashed: true, points: toPoints(recent, (x) => x.data.dia) }], refLines: [{ v: 130, label: '130' }, { v: 80, label: '80' }], unit: 'mmHg', label: `Gráfico de presión arterial con ${recent.length} mediciones` })}
          <div class="legend"><span><i style="background:#1F7A55"></i>Sistólica (número de arriba)</span><span><i class="dia"></i>Diastólica (número de abajo)</span><span><i class="dash"></i>Referencia 130/80</span></div>
          <p class="tiny muted" style="margin-top:8px">Un promedio de varios días dice más que una lectura aislada. Llevá estos datos a tu consulta.</p>
        </div>
        <h3 style="margin:20px 0 8px">Mediciones</h3>
        <ul class="list">${bp.slice(0, 15).map((m) => {
          const c = bpCategory(m.data.sys, m.data.dia);
          const al = bpAlert({ ...m.data, measured_at: m.measured_at });
          return `<li><a class="list-item" href="#/registrar/bp/${m.id}"><div class="grow"><div class="reading"><span class="val">${m.data.sys}/${m.data.dia}</span>${m.data.pulse ? `<span class="muted small">${m.data.pulse} lpm</span>` : ''}</div>
            <span class="sub">${formatDateTime(m.measured_at)}</span><br><span class="badge ${c.key === 'severa' ? 'alert' : ['etapa1', 'etapa2'].includes(c.key) ? 'warn' : ''}">${esc(c.label)}</span>
            ${m.data.symptoms?.length ? `<br><span class="small ${al === 'emergencia' ? '' : 'muted'}">Síntomas ${m.data.symptomsNow ? 'presentes al medir' : 'registrados'}: ${esc(m.data.symptoms.map(symptomLabel).join(', '))}</span>` : ''}</div>${icon('pencil', 'sm chev')}</a></li>`;
        }).join('')}</ul>
        ${bp.length > 15 ? `<p class="small muted" style="margin-top:8px">Mostrando 15 de ${bp.length}. Exportá el CSV para ver todo.</p>` : ''}`
        : emptyState('heart-pulse', 'Aún no registraste tu presión', 'Medí sentado, después de 5 minutos de reposo. Tomá 2 lecturas con 1 minuto de diferencia y registralas.', '#/registrar/bp', 'Registrar presión')}
        <section class="section"><details class="card"><summary style="font-weight:700;cursor:pointer;min-height:32px">Cómo medir bien la presión en casa</summary>
          <ul class="bullets" style="margin-top:10px">
            <li>Evitá café, cigarro y ejercicio 30 minutos antes. Vaciá la vejiga.</li>
            <li>Sentate con la espalda apoyada y los pies en el piso, sin cruzar las piernas.</li>
            <li>Apoyá el brazo en una mesa, con el brazalete a la altura del corazón y sobre la piel.</li>
            <li>Descansá 5 minutos en silencio. No hablés mientras mide.</li>
            <li>Tomá 2 o 3 lecturas con 1 minuto de diferencia, a la misma hora cada día.</li>
          </ul><p class="tiny muted" style="margin-top:8px">Fuente: ${extLink(SOURCES[5])}</p></details></section>
        <p class="tiny muted" style="margin-top:12px">Las categorías siguen la clasificación de la American Heart Association para adultos y se muestran como referencia: no son un diagnóstico. El diagnóstico de presión alta lo hace un profesional con varias mediciones.</p>
        <div class="thumb-bar no-print"><a class="btn" href="#/registrar/bp">${icon('plus')}Registrar presión</a></div>`;
    } else {
      const labs = byType('lab');
      body = `
        <div class="section-head"><h2>Resultados de laboratorio</h2></div>
        ${labs.length ? `<ul class="list">${labs.map((m) => {
          const d = m.data;
          const name = d.test === 'otro' ? d.name : LAB_TESTS[d.test].label;
          const low = d.test === 'glucosa' && ((d.unit === 'mg/dL' && d.value < 70) || (d.unit === 'mmol/L' && d.value < 3.9));
          return `<li><a class="list-item" href="#/registrar/lab/${m.id}"><div class="grow"><span class="title">${esc(name)}</span><br>
            <span class="val" style="font-weight:700;font-size:1.1rem">${fmt(d.value, 2)} ${esc(d.unit)}</span>
            <br><span class="sub">${formatDateTime(m.measured_at)}${d.context ? ` · ${esc(CONTEXT_LABELS[d.context])}` : ''}${d.source ? ` · ${esc(LAB_SOURCES[d.source])}` : ''}</span>
            ${low ? `<br><span class="badge warn">Glucosa por debajo de 70 mg/dL</span>` : ''}</div>${icon('pencil', 'sm chev')}</a></li>`;
        }).join('')}</ul>
        ${labs.some((m) => m.data.test === 'glucosa' && ((m.data.unit === 'mg/dL' && m.data.value < 70) || (m.data.unit === 'mmol/L' && m.data.value < 3.9))) ? `<div class="banner warn" style="margin-top:14px">${icon('info')}<p>Una glucosa menor de 70 mg/dL (3,9 mmol/L) se considera baja. Si tenés temblor, sudor, confusión o mareo, seguí el plan que te dio tu equipo de salud y buscá ayuda si no mejora. Más información: ${extLink(SOURCES[2])}</p></div>` : ''}`
        : emptyState('droplet', 'Sin resultados registrados', 'Copiá los resultados tal como aparecen en el informe, con su unidad. Pulso los guarda para tus consultas; no los interpreta.', '#/registrar/lab', 'Agregar resultado')}
        <p class="tiny muted" style="margin-top:12px">Cada laboratorio puede usar rangos de referencia distintos. Pedile a tu médico que te explique tus resultados.</p>
        <div class="thumb-bar no-print"><a class="btn" href="#/registrar/lab">${icon('plus')}Agregar resultado</a></div>`;
    }
  }
  const html = `
    <div class="page-head"><h1>Salud</h1><p class="muted">Registro para tus consultas. Pulso no diagnostica ni cambia medicamentos.</p></div>
    <a class="list-item card" href="#/emergencia" style="color:var(--alert-ink);margin-bottom:16px">${icon('phone')}<span class="grow"><span class="title">Tengo síntomas ahora</span><br><span class="sub">Qué hacer y a quién llamar</span></span>${icon('chevron-right', 'chev')}</a>
    <div class="seg" role="group" aria-label="Tipo de registro"><button type="button" data-htab="presion" aria-pressed="${tab === 'presion'}">Presión</button><button type="button" data-htab="labs" aria-pressed="${tab === 'labs'}">Laboratorios</button></div>
    <div style="margin-top:18px">${body}</div>
    <section class="section"><details class="more"><summary>Fuentes oficiales (${SOURCES.length - 1})</summary><ul class="list sources" style="margin-top:8px">${SOURCES.slice(0, 10).map((s) => `<li class="list-item"><span class="grow"><span class="sub">${esc(s.org)}</span><br>${extLink(s)}</span></li>`).join('')}</ul></details></section>`;
  return { title: 'Salud', html, bind: () => { bindMealActions(); $$('[data-htab]').forEach((b) => b.onclick = () => { S.ui.healthTab = b.dataset.htab; render(); }); } };
}

function viewEmergency() {
  const num = esc(S.profile?.data?.emergencyNumber || '911');
  const html = `
    <a class="back" href="#/salud">${icon('chevron-left')}Salud</a>
    <div class="page-head"><h1>Si tenés síntomas ahora</h1></div>
    <div class="banner emergency">${icon('phone')}<div><p><strong>Llamá al ${num} si tenés alguno de estos síntomas, sin importar la cifra de presión:</strong></p>
      <ul style="margin-top:8px">${ALARM_SYMPTOMS.map((s) => `<li>${esc(s.label)}</li>`).join('')}</ul>
      <div class="actions" style="margin-top:14px"><a class="btn call-btn block" href="tel:${num}">${icon('phone')}Llamar al ${num}</a></div></div></div>
    <div class="card stack" style="margin-top:16px">
      <h2>Mientras llega la ayuda</h2>
      <ul class="bullets"><li>No manejes. Pedile a alguien que se quede con vos.</li><li>Anotá la hora en que empezaron los síntomas: es información importante para el personal de salud.</li><li>No tomes medicamentos nuevos por tu cuenta, salvo que el personal del ${num} o tu médico te lo indiquen.</li></ul>
      <h3>Señales de derrame cerebral (F.A.S.T.)</h3>
      <p>Cara caída de un lado, brazo débil, habla extraña: es hora de llamar.</p>
      <p class="small">${extLink(SOURCES[6])}<br>${extLink(SOURCES[9])}</p>
    </div>
    <p class="disclaimer">Esta pantalla muestra orientación general y no reemplaza la valoración del personal de emergencias.</p>`;
  return { title: 'Síntomas ahora', html };
}

// ---------------------------------------------------------------------------
// FORMULARIOS DE REGISTRO
// ---------------------------------------------------------------------------
const FORM_META = {
  weight: { title: 'Peso', back: '#/progreso', icon: 'scale' },
  waist: { title: 'Cintura', back: '#/progreso', icon: 'ruler' },
  bp: { title: 'Presión arterial', back: '#/salud', icon: 'heart-pulse' },
  lab: { title: 'Resultado de laboratorio', back: '#/salud', icon: 'droplet' },
  sleep: { title: 'Sueño', back: '#/progreso', icon: 'moon' },
  habit: { title: 'Hábitos del día', back: '#/progreso', icon: 'list' },
  activity: { title: 'Actividad física', back: '#/progreso', icon: 'footprints' },
};
const formDrafts = {};
let draftReading = 0; // 1 o 2 durante una toma doble de presión

function viewForm([type, id]) {
  const meta = FORM_META[type];
  if (!meta) return { title: 'Registrar', html: emptyState('info', 'Tipo de registro desconocido', '', '#/hoy', 'Ir a Hoy') };
  const ms = measurementsState();
  if (id && ms.block) return { title: meta.title, html: `<a class="back" href="${meta.back}">${icon('chevron-left')}Volver</a>${ms.block}`, bind: bindMealActions };
  const existing = id ? S.measurements.find((m) => m.id === id) : null;
  if (id && !existing) return { title: meta.title, html: `<a class="back" href="${meta.back}">${icon('chevron-left')}Volver</a>${emptyState('info', 'Ese registro ya no existe', 'Puede que lo hayas eliminado en otra ventana.', meta.back, 'Volver')}` };
  const key = `${type}:${id || 'new'}`;
  const now = new Date();
  if (type !== 'bp' || id) draftReading = 0;
  const draft = formDrafts[key] || {
    measured_at: existing?.measured_at || isoLocal(now),
    data: existing ? structuredClone(existing.data) : defaultsFor(type),
    errors: {},
  };
  formDrafts[key] = draft;
  const d = draft.data, e = draft.errors;
  const [date, time] = draft.measured_at.split('T');
  let fields = '';
  if (type === 'weight') fields = numField('kg', 'Peso', d.kg, 'kg', { error: e.kg, hint: 'Usá la misma balanza y, si podés, la misma hora del día.' });
  if (type === 'waist') fields = numField('cm', 'Cintura', d.cm, 'cm', { error: e.cm, hint: 'A la altura del ombligo, de pie, al final de una exhalación normal.' });
  if (type === 'sleep') fields = `${numField('hours', 'Horas dormidas', d.hours, 'h', { error: e.hours, hint: 'Por ejemplo 6,5 para seis horas y media.' })}
    <fieldset class="fieldset"><legend>¿Cómo dormiste? <span class="muted">(opcional)</span></legend><div class="chips">${[1, 2, 3, 4, 5].map((q) => `<label class="chip"><input type="radio" name="quality" value="${q}" ${Number(d.quality) === q ? 'checked' : ''}>${['Muy mal', 'Mal', 'Regular', 'Bien', 'Muy bien'][q - 1]}</label>`).join('')}</div></fieldset>`;
  if (type === 'activity') fields = `
    ${numField('minutes', 'Minutos', d.minutes, 'min', { inputmode: 'numeric', error: e.minutes })}
    <fieldset class="fieldset"><legend>Tipo</legend><div class="chips">${Object.entries(ACTIVITY_KINDS).map(([k, l]) => `<label class="chip"><input type="radio" name="kind" value="${k}" ${d.kind === k ? 'checked' : ''}>${esc(l.split(',')[0])}</label>`).join('')}</div></fieldset>
    <fieldset class="fieldset"><legend>Intensidad</legend><div class="checks">${Object.entries(INTENSITIES).map(([k, l]) => `<label class="check"><input type="radio" name="intensity" value="${k}" ${d.intensity === k ? 'checked' : ''}>${esc(l)}</label>`).join('')}</div></fieldset>
    <label class="check" style="margin-top:18px"><input type="checkbox" name="afterMeal" ${d.afterMeal ? 'checked' : ''}>Fue después de una comida</label>`;
  if (type === 'habit') fields = `<fieldset class="fieldset"><legend>Marcá lo que lograste ese día</legend><div class="checks">${HABITS.filter((h) => !h.legacy || d.items?.[h.id]).map((h) => `<label class="check"><input type="checkbox" name="h_${h.id}" ${d.items?.[h.id] ? 'checked' : ''}>${esc(h.label)}</label>`).join('')}</div><span class="hint">Lo que no marques no es una falla: es información para ajustar.</span></fieldset>`;
  if (type === 'bp') {
    const hasSym = d.hasSymptoms ?? (d.symptoms?.length ? true : null);
    fields = `
    ${!existing ? `<details class="more" style="margin:-6px 0 10px"><summary>Cómo medir bien</summary><ul class="bullets small" style="margin:4px 0 8px">
      <li>Sentado, espalda apoyada, pies en el piso y brazo a la altura del corazón.</li><li>5 minutos de reposo, sin hablar. Sin café ni cigarro 30 minutos antes.</li><li>Tomá 2 lecturas con 1 minuto de diferencia.</li></ul></details>` : ''}
    ${draftReading ? `<p class="reading-step" style="margin-bottom:10px">${icon('circle-check', 'sm')}Lectura ${draftReading} · ${draftReading === 2 ? 'esperá 1 minuto desde la anterior' : 'primera del momento'}</p>` : ''}
    <div class="grid-2">${numField('sys', 'Sistólica', d.sys, 'mmHg', { inputmode: 'numeric', error: e.sys, hint: 'Número de arriba' })}${numField('dia', 'Diastólica', d.dia, 'mmHg', { inputmode: 'numeric', error: e.dia, hint: 'Número de abajo' })}</div>
    <div id="bp-live" aria-live="assertive"></div>
    ${numField('pulse', 'Pulso <span class="muted">(opcional)</span>', d.pulse, 'lpm', { inputmode: 'numeric', error: e.pulse })}
    <fieldset class="fieldset"><legend>¿Tenés algún síntoma?</legend>
      <div class="chips"><label class="chip"><input type="radio" name="hasSymptoms" value="0" ${hasSym === false ? 'checked' : ''}>No</label><label class="chip"><input type="radio" name="hasSymptoms" value="1" ${hasSym ? 'checked' : ''}>Sí</label></div></fieldset>
    <div id="sym-box" ${hasSym ? '' : 'hidden'}>
      <fieldset class="fieldset" style="margin-top:18px"><legend>Señales de alarma</legend>
        <div class="checks">${ALARM_SYMPTOMS.map((s) => `<label class="check alarm"><input type="checkbox" name="symptoms" value="${s.id}" ${d.symptoms?.includes(s.id) ? 'checked' : ''}>${esc(s.label)}</label>`).join('')}</div></fieldset>
      <details class="more" ${d.symptoms?.some((x) => OTHER_SYMPTOMS.some((o) => o.id === x)) ? 'open' : ''} style="margin-top:12px"><summary>Otros síntomas</summary>
        <div class="checks">${OTHER_SYMPTOMS.map((s) => `<label class="check"><input type="checkbox" name="symptoms" value="${s.id}" ${d.symptoms?.includes(s.id) ? 'checked' : ''}>${esc(s.label)}</label>`).join('')}</div></details>
      <fieldset class="fieldset" id="now-q" style="margin-top:18px" ${d.symptoms?.length ? '' : 'hidden'}><legend>¿Los tenés en este momento?</legend>
        <div class="chips"><label class="chip"><input type="radio" name="symptomsNow" value="1" ${d.symptomsNow ? 'checked' : ''}>Sí, ahora</label><label class="chip"><input type="radio" name="symptomsNow" value="0" ${d.symptomsNow === false ? 'checked' : ''}>No, ya pasaron</label></div>
        <span class="hint">Así distinguimos un síntoma actual de un registro histórico.</span></fieldset>
    </div>
    <details class="more" ${d.arm ? 'open' : ''} style="margin-top:12px"><summary>Brazo</summary>
      <div class="chips">${['izquierdo', 'derecho'].map((a) => `<label class="chip"><input type="radio" name="arm" value="${a}" ${d.arm === a ? 'checked' : ''}>${a === 'izquierdo' ? 'Izquierdo' : 'Derecho'}</label>`).join('')}</div></details>`;
  }
  if (type === 'lab') {
    const t = LAB_TESTS[d.test] || LAB_TESTS.glucosa;
    fields = `
      <label class="field"><span class="label">Examen</span><select class="input" name="test">${Object.entries(LAB_TESTS).map(([k, v]) => `<option value="${k}" ${d.test === k ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></label>
      ${d.test === 'otro' ? `<label class="field"><span class="label">Nombre del examen</span><input class="input" name="name" value="${esc(d.name || '')}" ${e.name ? 'aria-invalid="true"' : ''}>${e.name ? `<span class="error-msg">${esc(e.name)}</span>` : ''}</label>` : ''}
      <div class="grid-2">
        <label class="field"><span class="label">Valor</span><input class="input" name="value" inputmode="decimal" value="${d.value ?? ''}" ${e.value ? 'aria-invalid="true"' : ''} autocomplete="off"></label>
        ${t.units ? `<label class="field"><span class="label">Unidad</span><select class="input" name="unit">${Object.keys(t.units).map((u) => `<option ${d.unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select></label>`
          : `<label class="field"><span class="label">Unidad</span><input class="input" name="unit" value="${esc(d.unit || '')}" ${e.unit ? 'aria-invalid="true"' : ''}></label>`}
      </div>
      ${e.value ? `<p class="error-msg">${icon('triangle-alert', 'sm')}${esc(e.value)}</p>` : ''}${e.unit ? `<p class="error-msg">${esc(e.unit)}</p>` : ''}
      <span class="hint">Usá la misma unidad que aparece en tu informe.</span>
      ${t.contexts ? `<fieldset class="fieldset"><legend>¿Cuándo se tomó la muestra?</legend><div class="chips">${t.contexts.map((c) => `<label class="chip"><input type="radio" name="context" value="${c}" ${d.context === c ? 'checked' : ''}>${CONTEXT_LABELS[c]}</label>`).join('')}</div></fieldset>` : ''}
      <fieldset class="fieldset"><legend>Origen</legend><div class="chips">${Object.entries(LAB_SOURCES).map(([k, v]) => `<label class="chip"><input type="radio" name="source" value="${k}" ${d.source === k ? 'checked' : ''}>${v}</label>`).join('')}</div></fieldset>`;
  }
  const html = `
    <a class="back" href="${meta.back}">${icon('chevron-left')}Volver</a>
    <div class="page-head"><h1>${existing ? 'Editar' : 'Registrar'}: ${meta.title.toLowerCase()}</h1></div>
    <form id="m-form" class="card" novalidate>
      ${fields}
      <div class="grid-2" style="margin-top:18px">
        <label class="field"><span class="label">Fecha</span><input class="input" type="date" name="date" value="${date}" max="${isoDate(now)}" ${e.measured_at ? 'aria-invalid="true"' : ''}></label>
        ${type === 'habit' || type === 'sleep' ? `<input type="hidden" name="time" value="${time}">` : `<label class="field"><span class="label">Hora</span><input class="input" type="time" name="time" value="${time}"></label>`}
      </div>
      ${e.measured_at ? `<p class="error-msg">${icon('triangle-alert', 'sm')}${esc(e.measured_at)}</p>` : ''}
      <label class="field" style="margin-top:18px"><span class="label">Notas <span class="muted">(opcional)</span></span><textarea class="input" name="notes" maxlength="500">${esc(d.notes || '')}</textarea></label>
      <div id="form-error"></div>
      <div class="actions" style="margin-top:22px">
        ${type === 'bp' && !existing ? `<button class="btn secondary block" type="submit" data-again="1">${icon('refresh-cw')}Guardar y tomar otra lectura</button>` : ''}
        <button class="btn block" type="submit">${icon('check')}${existing ? 'Guardar cambios' : 'Guardar'}</button>
        ${existing ? `<button class="btn ghost" type="button" data-act="delete" style="color:var(--alert-ink)">${icon('trash-2', 'sm')}Eliminar</button>` : ''}
      </div>
    </form>`;
  return { title: meta.title, html, bind: () => bindForm(type, id, existing, key) };
}
function defaultsFor(type) {
  if (type === 'bp') return { symptoms: [], symptomsNow: null, hasSymptoms: null };
  if (type === 'lab') return { test: 'glucosa', unit: 'mg/dL', context: 'ayunas', source: 'laboratorio' };
  if (type === 'habit') return { items: {} };
  if (type === 'activity') return { kind: 'caminar', intensity: 'moderada', afterMeal: false };
  return {};
}
function readForm(type, f, draft) {
  const v = (n) => f.elements[n]?.value;
  const radio = (n) => f.querySelector(`input[name=${n}]:checked`)?.value;
  const d = draft.data;
  if (type === 'weight') d.kg = v('kg');
  if (type === 'waist') d.cm = v('cm');
  if (type === 'activity') { d.minutes = v('minutes'); d.kind = radio('kind'); d.intensity = radio('intensity'); d.afterMeal = !!f.elements.afterMeal?.checked; }
  if (type === 'sleep') { d.hours = v('hours'); d.quality = radio('quality') ? Number(radio('quality')) : null; }
  if (type === 'habit') { d.items = Object.fromEntries(HABITS.map((h) => [h.id, !!f.elements[`h_${h.id}`]?.checked])); }
  if (type === 'bp') {
    d.sys = v('sys'); d.dia = v('dia'); d.pulse = v('pulse'); d.arm = radio('arm') || '';
    const hs = radio('hasSymptoms');
    d.hasSymptoms = hs === undefined ? null : hs === '1';
    d.symptoms = d.hasSymptoms ? $$('input[name=symptoms]:checked', f).map((x) => x.value) : [];
    const now = radio('symptomsNow');
    d.symptomsNow = now === undefined ? null : now === '1';
  }
  if (type === 'lab') {
    d.test = v('test'); d.name = v('name'); d.value = v('value'); d.unit = v('unit'); d.context = radio('context') || ''; d.source = radio('source') || '';
  }
  d.notes = v('notes');
  draft.measured_at = `${v('date')}T${v('time') || '12:00'}`;
}

function bindForm(type, id, existing, key) {
  const f = $('#m-form');
  const draft = formDrafts[key];
  f.addEventListener('input', () => { readForm(type, f, draft); if (type === 'bp') liveBp(); });
  f.addEventListener('change', (ev) => {
    readForm(type, f, draft);
    if (type === 'lab' && ev.target.name === 'test') {
      const t = LAB_TESTS[draft.data.test];
      draft.data.unit = t.units ? Object.keys(t.units)[0] : '';
      draft.data.context = t.contexts ? 'ayunas' : '';
      render();
    }
    if (type === 'bp') {
      $('#sym-box').hidden = !draft.data.hasSymptoms;
      $('#now-q').hidden = !draft.data.symptoms.length;
      liveBp();
    }
  });
  const liveBp = () => {
    if (type !== 'bp') return;
    const d = draft.data;
    const alarm = d.symptoms.some((s) => ALARM_SYMPTOMS.some((a) => a.id === s));
    const sys = Number(d.sys), dia = Number(d.dia);
    let msg = '';
    if (alarm && d.symptomsNow) msg = emergencyBanner();
    else if (sys >= 180 || dia >= 120) msg = `<div class="banner alert" role="alert">${icon('triangle-alert')}<div><p><strong>Cifra de 180/120 o más</strong></p><p>Guardá la medición, descansá sentado unos 5 minutos y volvé a medir. Si tenés síntomas de alarma, llamá al ${esc(S.profile.data.emergencyNumber || '911')} sin esperar.</p></div></div>`;
    $('#bp-live').innerHTML = msg ? `<div style="margin:4px 0 18px">${msg}</div>` : '';
  };
  liveBp();
  f.querySelector('[data-act=delete]')?.addEventListener('click', async (ev) => {
    const btn = ev.currentTarget;
    if (btn.dataset.confirm !== '1') { btn.dataset.confirm = '1'; btn.innerHTML = `${icon('trash-2', 'sm')}Tocá de nuevo para eliminar`; return; }
    btn.setAttribute('aria-busy', 'true');
    const r = await api('DELETE', `/api/measurements/${id}?version=${existing.version}`);
    if (!r.ok) {
      btn.removeAttribute('aria-busy');
      if (r.status === 409) { toast('Este registro cambió en otra ventana. Revisá la versión actual.', 'warn'); delete formDrafts[key]; await loadMeasurements(); render(); return; }
      $('#form-error').innerHTML = `<div class="banner alert" role="alert" style="margin-top:16px">${icon('triangle-alert')}<p>No se eliminó. ${esc(r.data.error || '')}</p></div>`;
      return;
    }
    S.measurements = S.measurements.filter((m) => m.id !== id);
    delete formDrafts[key];
    notifyOthers('m');
    toast('Registro eliminado.');
    go(FORM_META[type].back);
  });
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    const again = ev.submitter?.dataset.again === '1';
    readForm(type, f, draft);
    if (type === 'bp' && draft.data.symptoms.length && draft.data.symptomsNow === null) {
      draft.errors = {};
      $('#form-error').innerHTML = `<p class="error-msg" role="alert">${icon('triangle-alert', 'sm')}Indicá si tenés los síntomas en este momento.</p>`;
      $('#now-q').scrollIntoView({ block: 'center' });
      return;
    }
    const when = parseLocal(draft.measured_at);
    const v = validateMeasurement(type, draft.measured_at, draft.data);
    if (when && when - new Date() > 5 * 60000) v.errors.measured_at = 'La fecha y hora no pueden estar en el futuro.';
    draft.errors = v.errors;
    if (Object.keys(v.errors).length) { render(); $('[aria-invalid=true]')?.focus(); $('.error-msg')?.scrollIntoView({ block: 'center' }); return; }
    const btn = f.querySelector('button[type=submit]'); btn.setAttribute('aria-busy', 'true'); btn.disabled = true;
    const r = existing
      ? await api('PUT', `/api/measurements/${id}`, { measured_at: draft.measured_at, data: v.value, version: existing.version })
      : await api('POST', '/api/measurements', { type, measured_at: draft.measured_at, data: v.value });
    btn.removeAttribute('aria-busy'); btn.disabled = false;
    if (!r.ok) {
      if (r.status === 409 && r.data.current) {
        $('#form-error').innerHTML = `<div class="banner warn" role="alert" style="margin-top:16px">${icon('info')}<div><p><strong>No se guardó: este registro cambió en otra ventana.</strong></p><p>Para no sobrescribir esos cambios, cargá la versión actual y volvé a aplicar lo tuyo.</p><div class="actions"><button class="btn sm" type="button" data-act="reload-current">Ver versión actual</button></div></div></div>`;
        $('[data-act=reload-current]').onclick = async () => { delete formDrafts[key]; await loadMeasurements(); render(); };
        return;
      }
      if (r.status === 400 && r.data.errors) { draft.errors = r.data.errors; render(); return; }
      $('#form-error').innerHTML = `<div class="banner alert" role="alert" style="margin-top:16px">${icon('triangle-alert')}<div><p><strong>No se guardó.</strong> ${esc(r.data.error || '')}</p><p class="small">Tus datos siguen en el formulario. Intentá de nuevo.</p></div></div>`;
      return;
    }
    const saved = r.data.measurement;
    S.measurements = [saved, ...(S.measurements || []).filter((m) => m.id !== saved.id)].sort((a, b) => b.measured_at.localeCompare(a.measured_at));
    delete formDrafts[key];
    notifyOthers('m');
    const alert = type === 'bp' ? bpAlert({ ...saved.data, measured_at: saved.measured_at }) : null;
    // Ante una alerta no se celebra el guardado: el aviso de Salud dice qué hacer.
    if (alert === 'emergencia' || alert === 'muy_alta') { draftReading = 0; S.ui.healthTab = 'presion'; go('#/salud'); return; }
    if (again) {
      draftReading = 2;
      formDrafts[key] = { measured_at: isoLocal(new Date()), data: defaultsFor('bp'), errors: {} };
      toast('Lectura guardada. Esperá 1 minuto y tomá la siguiente.');
      render(); window.scrollTo(0, 0); $('input[name=sys]')?.focus();
      return;
    }
    draftReading = 0;
    toast(existing ? 'Cambios guardados.' : 'Guardado.');
    go(type === 'bp' && !existing ? '#/hoy' : FORM_META[type].back);
  };
}

// ---------------------------------------------------------------------------
// PERFIL Y DATOS
// ---------------------------------------------------------------------------
let profileDraft = null;
function viewProfile() {
  const p = profileDraft?.data || S.profile.data;
  const e = profileDraft?.errors || {};
  const html = `
    <div class="page-head"><h1>Perfil</h1><p class="muted">${esc(S.me.email)}</p></div>
    <form id="p-form" class="card" novalidate>
      <h2>Datos personales</h2>
      <label class="field" style="margin-top:14px"><span class="label">Nombre</span><input class="input" name="name" value="${esc(p.name)}" ${e.name ? 'aria-invalid="true"' : ''}></label>
      <div class="grid-2" style="margin-top:18px">${numField('age', 'Edad', p.age, 'años', { inputmode: 'numeric', error: e.age })}${numField('height', 'Estatura', p.height, 'cm', { inputmode: 'numeric', error: e.height })}</div>
      <div class="grid-2" style="margin-top:18px">${numField('initialWeight', 'Peso inicial', p.initialWeight, 'kg', { error: e.initialWeight })}${numField('milestonePct', 'Primer hito', p.milestonePct, '%', { error: e.milestonePct })}</div>
      <label class="field"><span class="label">Actividad física</span><select class="input" name="activity">${[['', 'Sin indicar'], ['sedentaria', 'Poca'], ['ligera', 'Ligera'], ['moderada', 'Moderada'], ['alta', 'Alta']].map(([v, l]) => `<option value="${v}" ${p.activity === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span class="label">Diagnósticos indicados por tu médico</span><textarea class="input" name="conditions">${esc(p.conditions)}</textarea></label>
      <label class="field"><span class="label">Medicamentos</span><textarea class="input" name="medications">${esc(p.medications)}</textarea><span class="hint">Solo para tu resumen de consulta. Pulso no modifica medicamentos.</span></label>
      <hr class="divider">
      <h2>Objetivos</h2>
      <div class="chips" style="margin-top:12px">${GOALS.map((g) => `<label class="chip"><input type="checkbox" name="goals" value="${g.id}" ${(p.goals || []).includes(g.id) ? 'checked' : ''}>${esc(g.short)}</label>`).join('')}</div>
      <hr class="divider">
      <h2>Alergias y preferencias</h2>
      <div class="chips" style="margin-top:12px">${ALLERGENS.map((a) => `<label class="chip"><input type="checkbox" name="allergies" value="${a.id}" ${p.allergies.includes(a.id) ? 'checked' : ''}>${esc(a.label)}</label>`).join('')}</div>
      <label class="field" style="margin-top:14px"><span class="label">Otras alergias</span><input class="input" name="otherAllergies" value="${esc(p.otherAllergies)}"></label>
      <div class="checks" style="margin-top:14px">${PREFERENCES.map((x) => `<label class="check"><input type="checkbox" name="preferences" value="${x.id}" ${p.preferences.includes(x.id) ? 'checked' : ''}>${esc(x.label)}</label>`).join('')}</div>
      <p class="hint">Excluir gluten o lácteos es una preferencia personal; no es necesario para todo el mundo.</p>
      <hr class="divider">
      <h2>Horarios de comida</h2>
      <div class="grid-3" style="margin-top:12px">${MEALS.map((m) => `<label class="field"><span class="label small">${m.label}</span><input class="input" type="time" name="time_${m.id}" value="${esc(p.mealTimes[m.id])}"></label>`).join('')}</div>
      <p class="hint">Una guía para organizar el día; no es una indicación de ayuno.</p>
      <label class="field" style="margin-top:14px"><span class="label">Número de emergencias</span><input class="input" name="emergencyNumber" inputmode="tel" value="${esc(p.emergencyNumber || '911')}"><span class="hint">En Costa Rica es el 911.</span></label>
      <div id="p-error"></div>
      <div class="row" style="margin-top:20px"><button class="btn" type="submit">Guardar perfil</button><span class="save-state" id="p-state"></span></div>
    </form>

    <section class="section"><h2>Tus datos</h2>
      <ul class="list">
        <li><a class="list-item" href="#/resumen">${icon('file-text')}<span class="grow"><span class="title">Resumen para tu consulta</span><br><span class="sub">Imprimible o guardable como PDF</span></span>${icon('chevron-right', 'chev')}</a></li>
        <li><a class="list-item" href="/api/export/csv" download>${icon('download')}<span class="grow"><span class="title">Exportar mediciones (CSV)</span><br><span class="sub">Para Excel o Google Sheets</span></span></a></li>
        <li><a class="list-item" href="/api/export/backup" download>${icon('shield-check')}<span class="grow"><span class="title">Descargar respaldo completo</span><br><span class="sub">Perfil, menú y registros en un archivo JSON</span></span></a></li>
        <li><label class="list-item" for="restore-file" style="cursor:pointer">${icon('upload')}<span class="grow"><span class="title">Restaurar desde un respaldo</span><br><span class="sub">Reemplaza tus datos actuales; primero verás un resumen</span></span></label><input type="file" id="restore-file" accept="application/json,.json" class="sr-only"></li>
      </ul>
      <div id="restore-box"></div>
    </section>

    <section class="section"><h2>Cuenta</h2>
      <div class="actions"><button class="btn secondary" type="button" data-act="logout">${icon('log-out')}Cerrar sesión</button></div>
      <details class="card" style="margin-top:16px"><summary style="font-weight:700;cursor:pointer;min-height:32px;color:var(--alert-ink)">Eliminar mi cuenta y mis datos</summary>
        <form id="del-form" style="margin-top:12px" novalidate><p class="small">Se borran tu perfil, tu menú y todos tus registros. No se puede deshacer. Descargá un respaldo antes si querés conservarlos.</p>
        <label class="field" style="margin-top:12px"><span class="label">Contraseña</span><input class="input" type="password" name="password" autocomplete="current-password"></label>
        <div id="del-error"></div>
        <button class="btn danger" style="margin-top:14px" type="submit">Eliminar definitivamente</button></form></details>
    </section>
    <p class="disclaimer">Tus datos se guardan en el servidor de Pulso, asociados a tu cuenta, y no se comparten con nadie. Cada persona solo ve su propia información.</p>`;
  return { title: 'Perfil', html, bind: bindProfile };
}
function bindProfile() {
  const f = $('#p-form');
  f.onsubmit = async (ev) => {
    ev.preventDefault();
    const v = (n) => f.elements[n]?.value;
    const data = {
      ...S.profile.data,
      name: v('name'), age: v('age'), height: v('height'), initialWeight: v('initialWeight'), milestonePct: v('milestonePct'),
      activity: v('activity'), conditions: v('conditions'), medications: v('medications'), otherAllergies: v('otherAllergies'),
      goals: $$('input[name=goals]:checked', f).map((x) => x.value),
      allergies: $$('input[name=allergies]:checked', f).map((x) => x.value), preferences: $$('input[name=preferences]:checked', f).map((x) => x.value),
      mealTimes: Object.fromEntries(MEALS.map((m) => [m.id, v(`time_${m.id}`)])), emergencyNumber: v('emergencyNumber'), onboarded: true,
    };
    const val = validateProfile(data);
    if (!val.ok) { profileDraft = { data: { ...S.profile.data, ...data }, errors: val.errors }; render(); $('#p-error').innerHTML = `<p class="error-msg" role="alert">${icon('triangle-alert', 'sm')}${esc(Object.values(val.errors)[0])}</p>`; return; }
    const st = $('#p-state'); st.className = 'save-state saving'; st.textContent = 'Guardando…';
    const prevAllergies = S.profile.data.allergies;
    const r = await api('PUT', '/api/profile', { data: val.value, version: S.profile.version });
    if (!r.ok) {
      if (r.status === 409) {
        profileDraft = null; S.profile = r.data.current;
        render();
        $('#p-error').innerHTML = `<div class="banner warn" role="alert" style="margin-top:16px">${icon('info')}<p><strong>No se guardó: tu perfil cambió en otra ventana.</strong> Cargamos la versión más reciente para no sobrescribirla. Revisala y aplicá tus cambios de nuevo.</p></div>`;
        return;
      }
      const st2 = $('#p-state'); st2.className = 'save-state failed'; st2.textContent = 'No se guardó';
      $('#p-error').innerHTML = `<div class="banner alert" role="alert" style="margin-top:16px">${icon('triangle-alert')}<p>No se guardó. ${esc(r.data.error || '')} Tus cambios siguen en el formulario.</p></div>`;
      return;
    }
    profileDraft = null;
    S.profile = r.data.profile;
    notifyOthers('profile');
    const newAllergy = val.value.allergies.some((a) => !prevAllergies.includes(a));
    render();
    const st3 = $('#p-state'); st3.className = 'save-state saved'; st3.textContent = 'Guardado';
    if (newAllergy) {
      const conflicts = [];
      S.plan.data.menu.forEach((d, i) => MEALS.forEach((m) => { const rr = d[m.id] && recipeById(d[m.id]); if (rr && !isCompatible(rr, val.value.allergies)) conflicts.push({ i, m: m.id }); }));
      if (conflicts.length) {
        toast(`${conflicts.length} comidas del menú contienen alérgenos nuevos.`, 'warn', { label: 'Reemplazarlas', run: () => {
          const ops = conflicts.map(({ i, m }) => {
            const opts = compatibleRecipes(m, val.value.allergies);
            return opts.length ? { type: 'setMeal', day: i, meal: m, recipeId: opts[(i + 1) % opts.length].id } : { type: 'setMeal', day: i, meal: m, recipeId: null };
          });
          planOps(ops, { okMsg: 'Menú actualizado según tus alergias.' });
        } });
      }
    }
  };
  $('[data-act=logout]').onclick = async () => {
    await api('POST', '/api/auth/logout', {});
    S.me = null; S.profile = null; S.plan = null; S.measurements = null;
    notifyOthers('logout');
    go('#/entrar');
  };
  $('#del-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const r = await api('DELETE', '/api/account', { password: ev.target.password.value });
    if (!r.ok) { $('#del-error').innerHTML = `<p class="error-msg" role="alert">${icon('triangle-alert', 'sm')}${esc(r.data.error || 'No se pudo eliminar.')}</p>`; return; }
    S.me = null; S.profile = null; S.plan = null; S.measurements = null;
    notifyOthers('logout');
    toast('Tu cuenta y tus datos fueron eliminados.');
    go('#/entrar');
  };
  $('#restore-file').onchange = async (ev) => {
    const file = ev.target.files[0];
    ev.target.value = '';
    const box = $('#restore-box');
    if (!file) return;
    const fail = (msg, list = []) => { box.innerHTML = `<div class="banner alert" role="alert" style="margin-top:14px">${icon('triangle-alert')}<div><p><strong>No se puede restaurar este archivo.</strong> ${esc(msg)}</p>${list.length ? `<ul class="small">${list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div></div>`; };
    if (file.size > 2 * 1024 * 1024) return fail('El archivo supera 2 MB.');
    if (!/\.json$/i.test(file.name)) return fail('Elegí un archivo .json descargado desde Pulso.');
    let obj;
    try { obj = JSON.parse(await file.text()); } catch { return fail('El archivo no es JSON válido o está dañado.'); }
    const pre = await api('POST', '/api/import', { backup: obj, dryRun: true });
    if (!pre.ok) return fail(pre.data.error || '', pre.data.errors || []);
    const pv = pre.data.preview;
    box.innerHTML = `<div class="banner warn" style="margin-top:14px">${icon('info')}<div><p><strong>Archivo válido: ${esc(file.name)}</strong></p><p>Contiene ${pv.profile ? 'perfil, ' : ''}${pv.plan ? 'menú y ' : ''}${pv.measurements} ${pv.measurements === 1 ? 'registro' : 'registros'}. Al restaurar, <strong>se reemplazan</strong> tus datos actuales.</p>
      <div class="actions"><button class="btn sm" type="button" data-act="do-restore">Restaurar</button><button class="btn sm secondary" type="button" data-act="cancel-restore">Cancelar</button></div></div></div>`;
    $('[data-act=cancel-restore]').onclick = () => { box.innerHTML = ''; };
    $('[data-act=do-restore]').onclick = async (e2) => {
      e2.currentTarget.setAttribute('aria-busy', 'true');
      const r = await api('POST', '/api/import', { backup: obj });
      if (!r.ok) return fail(r.data.error || '', r.data.errors || []);
      await loadMe(); await loadMeasurements();
      notifyOthers('restore');
      toast(`Respaldo restaurado: ${r.data.restored} registros.`);
      render();
    };
  };
}

// ---------------------------------------------------------------------------
// RESUMEN IMPRIMIBLE
// ---------------------------------------------------------------------------
function viewSummary() {
  const ms = measurementsState();
  if (ms.block) return { title: 'Resumen', html: ms.block, bind: bindMealActions };
  const p = S.profile.data;
  const bp = byType('bp'), w = byType('weight'), labs = byType('lab'), waist = byType('waist'), sl = byType('sleep');
  const it = (list, f) => list.map((x) => ({ measured_at: x.measured_at, value: f(x) }));
  const row = (label, s, s2, unit, d = 0) => s.count ? `<tr><td>${label}</td><td>${s2 ? `${fmt(s.avg, d)}/${fmt(s2.avg, d)}` : fmt(s.avg, 1)} ${unit}</td><td>${s.count}</td><td>${formatDateShort(s.from)} – ${formatDateShort(s.to)}</td></tr>` : `<tr><td>${label}</td><td colspan="3" class="muted">Sin mediciones</td></tr>`;
  const symptomEvents = bp.filter((m) => m.data.symptoms?.length);
  const html = `
    <div class="no-print"><a class="back" href="#/perfil">${icon('chevron-left')}Perfil</a></div>
    <div class="page-head"><h1>Resumen para consulta</h1><p class="muted">Generado el ${formatDateLong(isoDate(new Date()))} con Pulso. Datos registrados por la persona usuaria.</p></div>
    <div class="actions no-print" style="margin-bottom:18px"><button class="btn" type="button" data-act="print">${icon('printer')}Imprimir o guardar PDF</button></div>
    <section class="card">
      <h2>Datos declarados</h2>
      <table class="data" style="margin-top:10px"><tbody>
        <tr><th>Nombre</th><td>${esc(p.name)}</td></tr>
        <tr><th>Edad</th><td>${p.age ? `${p.age} años` : 'No indicada'}</td></tr>
        <tr><th>Estatura</th><td>${p.height ? `${p.height} cm` : 'No indicada'}</td></tr>
        <tr><th>Peso inicial declarado</th><td>${p.initialWeight ? `${fmt(p.initialWeight)} kg` : 'No indicado'}</td></tr>
        <tr><th>Diagnósticos (según la persona)</th><td>${esc(p.conditions) || 'No indicados'}</td></tr>
        <tr><th>Medicamentos (según la persona)</th><td>${esc(p.medications) || 'No indicados'}</td></tr>
        <tr><th>Alergias</th><td>${esc([...p.allergies.map((a) => ALLERGENS.find((x) => x.id === a)?.label), p.otherAllergies].filter(Boolean).join(', ')) || 'Ninguna indicada'}</td></tr>
      </tbody></table>
    </section>
    <section class="card" style="margin-top:16px">
      <h2>Promedios</h2>
      <div class="table-scroll"><table class="data" style="margin-top:10px"><thead><tr><th>Indicador</th><th>Promedio</th><th>N.º</th><th>Período</th></tr></thead><tbody>
        ${row('Presión, 7 días', stats(it(bp, (x) => x.data.sys), 7), stats(it(bp, (x) => x.data.dia), 7), 'mmHg')}
        ${row('Presión, 30 días', stats(it(bp, (x) => x.data.sys), 30), stats(it(bp, (x) => x.data.dia), 30), 'mmHg')}
        ${row('Pulso, 30 días', stats(it(bp.filter((x) => x.data.pulse), (x) => x.data.pulse), 30), null, 'lpm')}
        ${row('Peso, 30 días', stats(it(w, (x) => x.data.kg), 30), null, 'kg')}
        ${row('Cintura, 90 días', stats(it(waist, (x) => x.data.cm), 90), null, 'cm')}
        ${row('Sueño, 14 días', stats(it(sl, (x) => x.data.hours), 14), null, 'h')}
      </tbody></table></div>
      ${w.length ? `<p class="small" style="margin-top:10px">Peso: primer registro ${fmt(w.at(-1).data.kg)} kg (${formatDateShort(w.at(-1).measured_at)}), último ${fmt(w[0].data.kg)} kg (${formatDateShort(w[0].measured_at)}).</p>` : ''}
    </section>
    <section class="card" style="margin-top:16px">
      <h2>Presión arterial: últimas mediciones</h2>
      ${bp.length ? `<div class="table-scroll"><table class="data" style="margin-top:10px"><thead><tr><th>Fecha y hora</th><th>mmHg</th><th>Pulso</th><th>Síntomas</th></tr></thead><tbody>
        ${bp.slice(0, 30).map((m) => `<tr><td>${formatDateTime(m.measured_at)}</td><td>${m.data.sys}/${m.data.dia}</td><td>${m.data.pulse ?? '—'}</td><td>${m.data.symptoms?.length ? esc(m.data.symptoms.map(symptomLabel).join(', ')) + (m.data.symptomsNow ? ' (al medir)' : ' (registrados)') : '—'}</td></tr>`).join('')}
      </tbody></table></div>` : '<p class="muted" style="margin-top:8px">Sin mediciones.</p>'}
      ${symptomEvents.length ? `<p class="small" style="margin-top:8px">${symptomEvents.length} ${symptomEvents.length === 1 ? 'medición incluye' : 'mediciones incluyen'} síntomas.</p>` : ''}
    </section>
    <section class="card" style="margin-top:16px">
      <h2>Laboratorios</h2>
      ${labs.length ? `<div class="table-scroll"><table class="data" style="margin-top:10px"><thead><tr><th>Fecha</th><th>Examen</th><th>Resultado</th><th>Contexto</th></tr></thead><tbody>
        ${labs.map((m) => `<tr><td>${formatDateShort(m.measured_at)} ${m.measured_at.slice(0, 4)}</td><td>${esc(m.data.test === 'otro' ? m.data.name : LAB_TESTS[m.data.test].label)}</td><td>${fmt(m.data.value, 2)} ${esc(m.data.unit)}</td><td>${esc([CONTEXT_LABELS[m.data.context], LAB_SOURCES[m.data.source]].filter(Boolean).join(' · '))}</td></tr>`).join('')}
      </tbody></table></div>` : '<p class="muted" style="margin-top:8px">Sin resultados registrados.</p>'}
    </section>
    <p class="disclaimer">Este resumen contiene datos ingresados por la persona usuaria en una aplicación de registro. No constituye un diagnóstico.</p>`;
  return { title: 'Resumen para consulta', html, bind: () => { $('[data-act=print]').onclick = () => window.print(); } };
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
async function boot() {
  try {
    const svg = await (await fetch('/icons.svg')).text();
    if (svg.trim().startsWith('<svg')) { const holder = $('#icons'); holder.innerHTML = svg; holder.firstElementChild.setAttribute('aria-hidden', 'true'); }
  } catch { /* sin íconos no se bloquea la app */ }
  const r = await loadMe();
  if (!r.ok && r.status !== 401) {
    $('#root').innerHTML = `<main class="auth"><div class="brand">${icon('activity')}<span>Pulso</span></div><div class="banner alert" role="alert">${icon('triangle-alert')}<div><p><strong>No pudimos conectar con Pulso</strong></p><p>${esc(r.data.error || 'Error del servidor.')}</p><div class="actions"><button class="btn sm" type="button" id="retry-boot">Reintentar</button></div></div></div></main>`;
    $('#retry-boot').onclick = () => { $('#root').innerHTML = '<div class="app"><p class="muted" style="padding-top:24px">Conectando…</p></div>'; boot(); };
    return;
  }
  S.booted = true;
  render();
}
boot();
