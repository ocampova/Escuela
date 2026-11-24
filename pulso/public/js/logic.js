// Pulso: lógica pura (sin DOM). La usan el navegador, el servidor y las pruebas.
import { RECIPES, INGREDIENTS, CATEGORIES, MEALS, ALLERGENS, PREFERENCES, recipeAllergens, recipeById, RECIPE_IDS } from './data.js';

export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// ---------- Fechas ----------
const pad = (n) => String(n).padStart(2, '0');
export const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const isoLocal = (d) => `${isoDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function mondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - dow);
  return isoDate(d);
}
export function parseIsoDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  if (d.getFullYear() !== +m[1] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3]) return null;
  return d;
}
export function parseLocal(s) {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(s || '');
  if (!m) return null;
  const d = parseIsoDate(m[1]);
  const h = +m[2], mi = +m[3];
  if (!d || h > 23 || mi > 59) return null;
  d.setHours(h, mi);
  return d;
}
export function addDays(iso, n) {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}
export const isTime = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s || '');

// ---------- Compatibilidad y menú ----------
export function isCompatible(recipe, allergies = []) {
  const a = recipeAllergens(recipe);
  return !a.some((x) => allergies.includes(x));
}
export function compatibleRecipes(meal, allergies = []) {
  return RECIPES.filter((r) => r.meals.includes(meal) && isCompatible(r, allergies));
}

// Menú de 7 días que rota recetas compatibles y evita repetir la misma receta en el mismo día
// o en días consecutivos para la misma comida cuando hay opciones suficientes.
export function buildMenu(allergies = [], offset = 0) {
  const days = [];
  const breakfasts = compatibleRecipes('desayuno', allergies);
  const mains = RECIPES.filter((r) => (r.meals.includes('almuerzo') || r.meals.includes('cena')) && isCompatible(r, allergies));
  let mi = offset * 3;
  for (let d = 0; d < 7; d++) {
    const day = { desayuno: null, almuerzo: null, cena: null };
    if (breakfasts.length) day.desayuno = breakfasts[(d + offset) % breakfasts.length].id;
    if (mains.length) {
      day.almuerzo = mains[mi % mains.length].id; mi++;
      let c = mains[mi % mains.length].id; mi++;
      if (c === day.almuerzo && mains.length > 1) { c = mains[mi % mains.length].id; mi++; }
      day.cena = c;
    }
    days.push(day);
  }
  return days;
}

export function defaultMealTimes() {
  return Object.fromEntries(MEALS.map((m) => [m.id, m.defaultTime]));
}

export function newPlan(allergies = [], today = new Date()) {
  return {
    weekStart: mondayOf(today),
    adults: 1,
    menu: buildMenu(allergies),
    coach: { week: 1, since: isoDate(today) },
    done: {},      // { 'YYYY-MM-DD:desayuno': true }
    bought: {},    // { ingredientId: true }
  };
}

// ---------- Lista de compras ----------
function roundBuy(def, qty) {
  if (def.base === 'g') {
    if (qty <= 100) return Math.ceil(qty / 10) * 10;
    return Math.ceil(qty / 50) * 50;
  }
  if (def.base === 'ml') return Math.ceil(qty / 5) * 5;
  if (def.base === 'u') {
    if (def.round) return Math.ceil(qty - 1e-9);
    return Math.ceil(qty - 1e-9);
  }
  return qty;
}

export function formatNumber(n, decimals = 1) {
  if (!Number.isFinite(n)) return '';
  const r = Math.round(n * 10 ** decimals) / 10 ** decimals;
  return r.toLocaleString('es-CR', { maximumFractionDigits: decimals });
}

export function formatWeight(g) {
  if (g >= 1000) return `${formatNumber(g / 1000, 2)} kg`;
  return `${Math.round(g)} g`;
}

function plural(word, n) {
  if (n === 1) return word;
  if (/[aeiouáéó]$/.test(word)) return word + 's';
  if (word.endsWith('ón')) return word.slice(0, -2) + 'ones';
  return word + 'es';
}

export function buyLabel(def, qty) {
  if (def.base === 'gusto') return 'al gusto';
  const r = roundBuy(def, qty);
  if (def.base === 'g') {
    if (def.pack) {
      const n = Math.ceil(qty / def.pack.size - 1e-9);
      return `${n} ${plural(def.pack.unit, n)} (≈${Math.round(qty)} g escurrido)`;
    }
    const suf = def.buyState === 'seco' ? ' en seco' : def.buyState === 'crudo' ? ' crudo' : '';
    return formatWeight(r) + suf;
  }
  if (def.base === 'ml') return `${r} ml`;
  if (def.base === 'u') {
    if (def.pack) {
      const n = Math.ceil(qty / def.pack.size);
      return `${n} ${plural(def.pack.unit, n)} (${Math.ceil(qty)} ${plural(def.unit, Math.ceil(qty))})`;
    }
    return `${r} ${plural(def.unit || 'unidad', r)}`;
  }
  return '';
}

// Devuelve [{ cat, label, items:[{ id, name, qty, label, conv, uses, fromCooked }] }]
export function shoppingList(plan, { includeDone = true } = {}) {
  const adults = clampInt(plan?.adults ?? 1, 1, 12);
  const totals = new Map();
  (plan?.menu || []).forEach((day) => {
    for (const meal of MEALS) {
      const rid = day?.[meal.id];
      const recipe = rid && recipeById(rid);
      if (!recipe) continue;
      for (const ing of recipe.ingredients) {
        const def = INGREDIENTS[ing.id];
        if (!def) continue;
        const cur = totals.get(ing.id) || { id: ing.id, qty: 0, uses: 0, fromStates: new Set() };
        if (def.base !== 'gusto' && ing.qty != null) {
          const f = def.toBuy?.[ing.state] ?? 1;
          cur.qty += ing.qty * f * adults;
          if (ing.state && ing.state !== def.buyState) cur.fromStates.add(ing.state);
        }
        cur.uses += 1;
        totals.set(ing.id, cur);
      }
    }
  });
  const groups = CATEGORIES.map((c) => ({ cat: c.id, label: c.label, items: [] }));
  for (const t of totals.values()) {
    const def = INGREDIENTS[t.id];
    const group = groups.find((g) => g.cat === def.cat);
    group.items.push({
      id: t.id,
      name: def.name,
      qty: t.qty,
      label: buyLabel(def, t.qty),
      conv: def.conv || '',
      uses: t.uses,
      fromCooked: [...t.fromStates],
      bought: !!plan?.bought?.[t.id],
    });
  }
  groups.forEach((g) => g.items.sort((a, b) => a.name.localeCompare(b.name, 'es')));
  return groups.filter((g) => g.items.length);
}

export function shoppingText(groups, adults, weekStart) {
  const lines = [`Lista de compras Pulso — semana del ${formatDateLong(weekStart)} — ${adults} ${adults === 1 ? 'adulto' : 'adultos'}`, ''];
  for (const g of groups) {
    lines.push(g.label.toUpperCase());
    for (const it of g.items) lines.push(`${it.bought ? '[x]' : '[ ]'} ${it.name}: ${it.label}`);
    lines.push('');
  }
  lines.push('Cantidades aproximadas, calculadas a partir del menú. No incluye precios.');
  return lines.join('\n');
}

// ---------- Formato de fechas ----------
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export function formatDateShort(iso) {
  const d = parseIsoDate(iso.slice(0, 10));
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : iso;
}
export function formatDateLong(iso) {
  const d = parseIsoDate(iso.slice(0, 10));
  return d ? `${d.getDate()} de ${MONTHS_LONG[d.getMonth()]} de ${d.getFullYear()}` : iso;
}
export function formatDateTime(local) {
  const d = parseLocal(local);
  if (!d) return local;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------- Presión arterial ----------
// Categorías del American Heart Association (adultos).
export function bpCategory(sys, dia) {
  if (sys >= 180 || dia >= 120) return { key: 'severa', label: 'Muy alta (180/120 o más)' };
  if (sys >= 140 || dia >= 90) return { key: 'etapa2', label: 'Hipertensión etapa 2 (rango)' };
  if (sys >= 130 || dia >= 80) return { key: 'etapa1', label: 'Hipertensión etapa 1 (rango)' };
  if (sys >= 120) return { key: 'elevada', label: 'Elevada (rango)' };
  return { key: 'normal', label: 'Normal (rango)' };
}

export const ALARM_SYMPTOMS = [
  { id: 'dolor_pecho', label: 'Dolor o presión en el pecho' },
  { id: 'falta_aire', label: 'Falta de aire' },
  { id: 'desmayo', label: 'Desmayo o casi desmayo' },
  { id: 'neuro', label: 'Debilidad o adormecimiento de cara, brazo o pierna' },
  { id: 'habla', label: 'Dificultad para hablar o entender' },
  { id: 'vision', label: 'Cambio repentino en la visión' },
  { id: 'confusion', label: 'Confusión repentina' },
  { id: 'cefalea', label: 'Dolor de cabeza intenso y repentino' },
  { id: 'espalda', label: 'Dolor fuerte de espalda' },
];
export const OTHER_SYMPTOMS = [
  { id: 'mareo', label: 'Mareo' },
  { id: 'cefalea_leve', label: 'Dolor de cabeza leve' },
  { id: 'palpitaciones', label: 'Palpitaciones' },
  { id: 'nauseas', label: 'Náuseas' },
  { id: 'cansancio', label: 'Cansancio' },
];
export const SYMPTOM_IDS = new Set([...ALARM_SYMPTOMS, ...OTHER_SYMPTOMS].map((s) => s.id));
export const symptomLabel = (id) => [...ALARM_SYMPTOMS, ...OTHER_SYMPTOMS].find((s) => s.id === id)?.label || id;

// Una medición se considera "actual" si se tomó hace 60 minutos o menos y el usuario
// indica que los síntomas están presentes ahora.
export function isRecent(local, now = new Date(), minutes = 60) {
  const d = parseLocal(local);
  if (!d) return false;
  const diff = (now - d) / 60000;
  return diff <= minutes && diff >= -5;
}

// Nivel de alerta para una lectura de presión.
// 'emergencia' -> síntomas de alarma presentes ahora (sin importar la cifra)
// 'muy_alta'   -> 180/120 o más sin síntomas de alarma actuales
// 'historico'  -> síntomas de alarma registrados en una medición pasada
// null         -> nada especial
export function bpAlert({ sys, dia, symptoms = [], symptomsNow = false, measured_at }, now = new Date()) {
  const alarm = symptoms.some((s) => ALARM_SYMPTOMS.some((a) => a.id === s));
  const current = symptomsNow && isRecent(measured_at, now);
  if (alarm && current) return 'emergencia';
  const high = sys >= 180 || dia >= 120;
  if (high && isRecent(measured_at, now, 120)) return 'muy_alta';
  if (high) return 'muy_alta_historico';
  if (alarm) return 'historico';
  return null;
}

// ---------- Validación ----------
export const LAB_TESTS = {
  glucosa: { label: 'Glucosa', units: { 'mg/dL': [20, 700], 'mmol/L': [1, 40] }, contexts: ['ayunas', 'postprandial_2h', 'aleatoria'] },
  hba1c: { label: 'HbA1c (hemoglobina glicosilada)', units: { '%': [3, 20], 'mmol/mol': [9, 195] } },
  insulina: { label: 'Insulina', units: { 'µUI/mL': [0.5, 300], 'pmol/L': [3, 2100] }, contexts: ['ayunas', 'postprandial_2h', 'aleatoria'] },
  colesterol_total: { label: 'Colesterol total', units: { 'mg/dL': [50, 600], 'mmol/L': [1.3, 15.5] } },
  ldl: { label: 'Colesterol LDL', units: { 'mg/dL': [10, 400], 'mmol/L': [0.3, 10.4] } },
  hdl: { label: 'Colesterol HDL', units: { 'mg/dL': [5, 150], 'mmol/L': [0.1, 3.9] } },
  trigliceridos: { label: 'Triglicéridos', units: { 'mg/dL': [10, 5000], 'mmol/L': [0.1, 56] } },
  otro: { label: 'Otro resultado', units: null },
};
export const CONTEXT_LABELS = { ayunas: 'En ayunas', postprandial_2h: '2 horas después de comer', aleatoria: 'En cualquier momento' };
export const LAB_SOURCES = { laboratorio: 'Laboratorio', glucometro: 'Glucómetro en casa', otro: 'Otro' };

export const MEASUREMENT_TYPES = ['weight', 'waist', 'bp', 'lab', 'sleep', 'habit', 'activity'];
export const ACTIVITY_KINDS = { caminar: 'Caminar', fuerza: 'Fuerza', cardio: 'Bici, baile, trote u otro cardio', otro: 'Otra actividad' };
export const INTENSITIES = { ligera: 'Ligera', moderada: 'Moderada (podés hablar, no cantar)', vigorosa: 'Vigorosa (cuesta hablar)' };
// Hábitos diarios. 'week' = semana de la ruta en que se incorporan al checklist.
export const HABITS = [
  { id: 'verduras', label: 'Medio plato de verduras en almuerzo y cena', week: 2, goals: ['peso', 'insulina', 'presion'] },
  { id: 'sin_azucaradas', label: 'Sin bebidas azucaradas ni jugos', week: 3, goals: ['peso', 'insulina'] },
  { id: 'caminar_post', label: 'Caminé 10 minutos después de una comida', week: 4, goals: ['insulina', 'peso'] },
  { id: 'sal', label: 'Sin sal en la mesa, ni cubitos, consomé o embutidos', week: 5, goals: ['presion'] },
  { id: 'fibra', label: 'Frijoles, avena o fruta entera (no jugo) hoy', week: 8, goals: ['insulina', 'peso', 'presion'] },
  { id: 'proteina_desayuno', label: 'Desayuno con proteína (huevo, frijoles, pollo)', week: 8, goals: ['peso', 'insulina'] },
  { id: 'dormir', label: 'Me acosté a una hora que permite dormir 7 horas', week: 9, goals: ['peso', 'insulina', 'presion'] },
  { id: 'respiracion', label: '5 minutos de respiración lenta o una pausa', week: 10, goals: ['presion'] },
  // Hábitos de la versión anterior (se conservan para no perder registros).
  { id: 'agua', label: 'Tomé agua como bebida principal', week: 99, legacy: true },
  { id: 'caminar', label: 'Me moví o caminé al menos 20 minutos', week: 99, legacy: true },
  { id: 'cocinar', label: 'Cociné en casa la mayoría de las comidas', week: 99, legacy: true },
];

const num = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v.replace(',', '.')) : NaN);
function clampInt(v, min, max) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
const isStr = (s, max = 500) => typeof s === 'string' && s.length <= max;

// Valida y normaliza. Devuelve { ok, value, errors: {campo: mensaje} }
export function validateMeasurement(type, measured_at, data, now = new Date()) {
  const errors = {};
  const out = {};
  if (!MEASUREMENT_TYPES.includes(type)) return { ok: false, errors: { type: 'Tipo de registro desconocido.' } };
  const d = parseLocal(measured_at);
  if (!d) errors.measured_at = 'Fecha u hora no válida.';
  else if (d.getFullYear() < 1900) errors.measured_at = 'La fecha es demasiado antigua.';
  else if (d - now > 24 * 3600 * 1000) errors.measured_at = 'La fecha no puede estar en el futuro.';
  data = data && typeof data === 'object' ? data : {};
  const range = (field, v, min, max, label, unit, required = true, decimals = 1) => {
    if (v === undefined || v === null || v === '') {
      if (required) errors[field] = `Ingresá ${label}.`;
      return;
    }
    const n = num(v);
    if (!Number.isFinite(n)) { errors[field] = `${cap(label)} debe ser un número.`; return; }
    if (n < min || n > max) { errors[field] = `${cap(label)} debe estar entre ${min} y ${max} ${unit}.`; return; }
    out[field] = Math.round(n * 10 ** decimals) / 10 ** decimals;
  };
  if (type === 'weight') range('kg', data.kg, 30, 350, 'el peso', 'kg');
  if (type === 'waist') range('cm', data.cm, 40, 250, 'la cintura', 'cm');
  if (type === 'bp') {
    range('sys', data.sys, 60, 260, 'la presión sistólica', 'mmHg', true, 0);
    range('dia', data.dia, 30, 160, 'la presión diastólica', 'mmHg', true, 0);
    range('pulse', data.pulse, 30, 220, 'el pulso', 'lpm', false, 0);
    if (out.sys != null && out.dia != null && out.dia >= out.sys) errors.dia = 'La diastólica (número de abajo) debe ser menor que la sistólica.';
    const sy = Array.isArray(data.symptoms) ? data.symptoms : [];
    if (!sy.every((s) => SYMPTOM_IDS.has(s))) errors.symptoms = 'Síntoma no reconocido.';
    out.symptoms = [...new Set(sy.filter((s) => SYMPTOM_IDS.has(s)))];
    out.symptomsNow = !!data.symptomsNow && out.symptoms.length > 0;
    if (data.arm != null && data.arm !== '' && !['izquierdo', 'derecho'].includes(data.arm)) errors.arm = 'Brazo no válido.';
    if (data.arm) out.arm = data.arm;
  }
  if (type === 'lab') {
    const t = LAB_TESTS[data.test];
    if (!t) errors.test = 'Elegí el tipo de resultado.';
    else {
      out.test = data.test;
      if (data.test === 'otro') {
        if (!isStr(data.name, 80) || !data.name.trim()) errors.name = 'Escribí el nombre del examen.';
        else out.name = data.name.trim();
        if (!isStr(data.unit, 20) || !data.unit.trim()) errors.unit = 'Escribí la unidad tal como aparece en el resultado.';
        else out.unit = data.unit.trim();
        const n = num(data.value);
        if (!Number.isFinite(n)) errors.value = 'El valor debe ser un número.';
        else if (Math.abs(n) > 1e7) errors.value = 'El valor es demasiado grande.';
        else out.value = n;
      } else {
        const r = t.units[data.unit];
        if (!r) errors.unit = 'Elegí la unidad que aparece en tu resultado.';
        else { out.unit = data.unit; range('value', data.value, r[0], r[1], 'el valor', data.unit, true, 2); }
      }
      if (t.contexts) {
        if (data.context && !t.contexts.includes(data.context)) errors.context = 'Contexto no válido.';
        if (data.context) out.context = data.context;
      }
      if (data.source && !LAB_SOURCES[data.source]) errors.source = 'Origen no válido.';
      if (data.source) out.source = data.source;
    }
  }
  if (type === 'sleep') {
    range('hours', data.hours, 0, 16, 'las horas de sueño', 'horas');
    if (data.quality != null && data.quality !== '') {
      const q = num(data.quality);
      if (![1, 2, 3, 4, 5].includes(q)) errors.quality = 'La calidad va de 1 a 5.';
      else out.quality = q;
    }
  }
  if (type === 'activity') {
    range('minutes', data.minutes, 1, 600, 'los minutos', 'minutos', true, 0);
    if (!ACTIVITY_KINDS[data.kind]) errors.kind = 'Elegí el tipo de actividad.'; else out.kind = data.kind;
    if (!INTENSITIES[data.intensity]) errors.intensity = 'Elegí la intensidad.'; else out.intensity = data.intensity;
    out.afterMeal = !!data.afterMeal;
  }
  if (type === 'habit') {
    const items = data.items && typeof data.items === 'object' ? data.items : {};
    out.items = {};
    for (const h of HABITS) out.items[h.id] = !!items[h.id];
  }
  if (data.notes != null && data.notes !== '') {
    if (!isStr(data.notes, 500)) errors.notes = 'Las notas pueden tener hasta 500 caracteres.';
    else out.notes = data.notes.trim();
  }
  const ok = Object.keys(errors).length === 0;
  return { ok, value: ok ? out : null, errors };
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function validateProfile(p) {
  const errors = {};
  const out = {};
  if (!p || typeof p !== 'object') return { ok: false, errors: { _: 'Perfil no válido.' } };
  if (!isStr(p.name, 60) || !p.name.trim()) errors.name = 'Escribí tu nombre.'; else out.name = p.name.trim();
  const opt = (field, min, max, label, unit, decimals = 1) => {
    if (p[field] === undefined || p[field] === null || p[field] === '') { out[field] = null; return; }
    const n = num(p[field]);
    if (!Number.isFinite(n) || n < min || n > max) errors[field] = `${cap(label)} debe estar entre ${min} y ${max} ${unit}.`;
    else out[field] = Math.round(n * 10 ** decimals) / 10 ** decimals;
  };
  opt('age', 18, 110, 'la edad', 'años', 0);
  opt('initialWeight', 30, 350, 'el peso inicial', 'kg');
  opt('height', 120, 230, 'la estatura', 'cm', 0);
  opt('milestonePct', 1, 15, 'el porcentaje del hito', '%');
  if (out.milestonePct == null) out.milestonePct = 5;
  const lists = { allergies: ALLERGENS.map((a) => a.id), preferences: PREFERENCES.map((a) => a.id) };
  for (const [k, allowed] of Object.entries(lists)) {
    const arr = Array.isArray(p[k]) ? p[k] : [];
    if (!arr.every((x) => allowed.includes(x))) errors[k] = 'Opción no reconocida.';
    out[k] = [...new Set(arr.filter((x) => allowed.includes(x)))];
  }
  const GOAL_IDS = ['peso', 'insulina', 'presion'];
  const goals = Array.isArray(p.goals) ? p.goals : [];
  if (!goals.every((x) => GOAL_IDS.includes(x))) errors.goals = 'Objetivo no reconocido.';
  out.goals = [...new Set(goals.filter((x) => GOAL_IDS.includes(x)))];
  const ACT = ['', 'sedentaria', 'ligera', 'moderada', 'alta'];
  if (p.activity != null && !ACT.includes(p.activity)) errors.activity = 'Nivel de actividad no válido.';
  out.activity = p.activity || '';
  for (const k of ['conditions', 'medications', 'otherAllergies']) {
    if (p[k] != null && !isStr(p[k], 1000)) errors[k] = 'Texto demasiado largo (máximo 1000 caracteres).';
    out[k] = typeof p[k] === 'string' ? p[k].trim() : '';
  }
  if (!isStr(p.country || 'Costa Rica', 60)) errors.country = 'País no válido.';
  out.country = (p.country || 'Costa Rica').trim();
  out.emergencyNumber = /^[0-9+ ]{2,15}$/.test(p.emergencyNumber || '') ? p.emergencyNumber.trim() : '911';
  const times = p.mealTimes && typeof p.mealTimes === 'object' ? p.mealTimes : defaultMealTimes();
  out.mealTimes = {};
  for (const m of MEALS) {
    if (!isTime(times[m.id])) errors[`time_${m.id}`] = `Hora de ${m.label.toLowerCase()} no válida.`;
    else out.mealTimes[m.id] = times[m.id];
  }
  out.onboarded = !!p.onboarded;
  return { ok: Object.keys(errors).length === 0, value: out, errors };
}

export function validatePlan(plan) {
  if (!plan || typeof plan !== 'object') return { ok: false, error: 'Plan no válido.' };
  if (!parseIsoDate(plan.weekStart)) return { ok: false, error: 'Fecha de inicio de semana no válida.' };
  if (!Array.isArray(plan.menu) || plan.menu.length !== 7) return { ok: false, error: 'El menú debe tener 7 días.' };
  for (const day of plan.menu) {
    if (!day || typeof day !== 'object') return { ok: false, error: 'Día del menú no válido.' };
    for (const m of MEALS) {
      const r = day[m.id];
      if (r !== null && !RECIPE_IDS.has(r)) return { ok: false, error: `Receta desconocida: ${String(r).slice(0, 40)}` };
      if (r && !recipeById(r).meals.includes(m.id)) return { ok: false, error: 'Receta asignada a una comida incompatible.' };
    }
  }
  const adults = Number(plan.adults);
  if (!Number.isInteger(adults) || adults < 1 || adults > 12) return { ok: false, error: 'El número de adultos debe estar entre 1 y 12.' };
  const done = {};
  for (const [k, v] of Object.entries(plan.done || {})) {
    if (!/^\d{4}-\d{2}-\d{2}:(desayuno|almuerzo|cena)$/.test(k)) return { ok: false, error: 'Registro de comida realizada no válido.' };
    if (v) done[k] = true;
  }
  const bought = {};
  for (const [k, v] of Object.entries(plan.bought || {})) {
    if (!INGREDIENTS[k]) return { ok: false, error: 'Producto de compras desconocido.' };
    if (v) bought[k] = true;
  }
  let coach = { week: 1, since: plan.weekStart };
  if (plan.coach != null) {
    const wk = Number(plan.coach.week);
    if (!Number.isInteger(wk) || wk < 1 || wk > 12) return { ok: false, error: 'Semana de la ruta no válida.' };
    if (!parseIsoDate(plan.coach.since)) return { ok: false, error: 'Fecha de la ruta no válida.' };
    coach = { week: wk, since: plan.coach.since };
  }
  return { ok: true, value: { weekStart: plan.weekStart, adults, coach, menu: plan.menu.map((d) => ({ desayuno: d.desayuno ?? null, almuerzo: d.almuerzo ?? null, cena: d.cena ?? null })), done, bought } };
}

// Aplica una operación al plan (el servidor la usa para evitar sobrescrituras entre ventanas).
export function applyPlanOp(plan, op) {
  const p = structuredClone(plan);
  switch (op?.type) {
    case 'setMeal': {
      if (!Number.isInteger(op.day) || op.day < 0 || op.day > 6) throw new Error('Día no válido.');
      if (!MEALS.some((m) => m.id === op.meal)) throw new Error('Comida no válida.');
      p.menu[op.day][op.meal] = op.recipeId;
      break;
    }
    case 'setDone': p.done[`${op.date}:${op.meal}`] = !!op.value; if (!op.value) delete p.done[`${op.date}:${op.meal}`]; break;
    case 'setBought': p.bought[op.id] = !!op.value; if (!op.value) delete p.bought[op.id]; break;
    case 'clearBought': p.bought = {}; break;
    case 'setAdults': p.adults = op.value; break;
    case 'regenerate': p.menu = buildMenu(op.allergies || [], op.offset || 0); break;
    case 'setCoachWeek': p.coach = { week: op.week, since: op.since }; break;
    case 'newWeek': p.weekStart = op.weekStart; p.bought = {}; break;
    default: throw new Error('Operación no reconocida.');
  }
  const v = validatePlan(p);
  if (!v.ok) throw new Error(v.error);
  return v.value;
}

// ---------- Estadísticas ----------
// items: [{ measured_at, value }]
export function stats(items, days = null, now = new Date()) {
  let list = items.filter((x) => Number.isFinite(x.value));
  if (days) {
    const until = new Date(now); until.setHours(24, 0, 0, 0);
    // Ventana única en toda la app: hoy + (days − 1) días calendario anteriores.
    const from = new Date(now); from.setDate(from.getDate() - (days - 1)); from.setHours(0, 0, 0, 0);
    list = list.filter((x) => { const t = parseLocal(x.measured_at); return t >= from && t < until; });
  }
  if (!list.length) return { count: 0 };
  const sorted = [...list].sort((a, b) => a.measured_at.localeCompare(b.measured_at));
  const vals = sorted.map((x) => x.value);
  return {
    count: vals.length,
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    min: Math.min(...vals),
    max: Math.max(...vals),
    from: sorted[0].measured_at,
    to: sorted[sorted.length - 1].measured_at,
    first: vals[0],
    last: vals[vals.length - 1],
  };
}

export function milestone(initialWeight, pct = 5) {
  if (!Number.isFinite(initialWeight) || !Number.isFinite(pct)) return null;
  const loss = initialWeight * pct / 100;
  return { pct, loss: Math.round(loss * 10) / 10, target: Math.round((initialWeight - loss) * 10) / 10 };
}

export function bmi(kg, cm) {
  if (!kg || !cm) return null;
  return Math.round((kg / ((cm / 100) ** 2)) * 10) / 10;
}

// ---------- Exportación ----------
function csvCell(v) {
  if (v === null || v === undefined) return '';
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // evitar inyección de fórmulas en hojas de cálculo
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function measurementsCsv(list) {
  const header = ['tipo', 'fecha', 'hora', 'valor', 'valor_2', 'pulso', 'unidad', 'examen', 'contexto', 'sintomas', 'sintomas_presentes_al_medir', 'notas'];
  const rows = [header];
  const sorted = [...list].sort((a, b) => a.measured_at.localeCompare(b.measured_at));
  for (const m of sorted) {
    const [date, time] = m.measured_at.split('T');
    const d = m.data || {};
    const base = { tipo: '', valor: '', valor_2: '', pulso: '', unidad: '', examen: '', contexto: '', sintomas: '', ahora: '', notas: d.notes || '' };
    if (m.type === 'weight') Object.assign(base, { tipo: 'peso', valor: d.kg, unidad: 'kg' });
    if (m.type === 'waist') Object.assign(base, { tipo: 'cintura', valor: d.cm, unidad: 'cm' });
    if (m.type === 'bp') Object.assign(base, { tipo: 'presion', valor: d.sys, valor_2: d.dia, pulso: d.pulse ?? '', unidad: 'mmHg', sintomas: (d.symptoms || []).map(symptomLabel).join(' | '), ahora: d.symptoms?.length ? (d.symptomsNow ? 'sí' : 'no') : '' });
    if (m.type === 'lab') Object.assign(base, { tipo: 'laboratorio', valor: d.value, unidad: d.unit, examen: d.test === 'otro' ? d.name : LAB_TESTS[d.test]?.label, contexto: CONTEXT_LABELS[d.context] || '' });
    if (m.type === 'sleep') Object.assign(base, { tipo: 'sueno', valor: d.hours, valor_2: d.quality ?? '', unidad: 'horas' });
    if (m.type === 'activity') Object.assign(base, { tipo: 'actividad', valor: d.minutes, unidad: 'minutos', examen: ACTIVITY_KINDS[d.kind], contexto: (INTENSITIES[d.intensity] || '').split(' (')[0] + (d.afterMeal ? ' · después de comer' : '') });
    if (m.type === 'habit') Object.assign(base, { tipo: 'habitos', valor: Object.values(d.items || {}).filter(Boolean).length, valor_2: HABITS.filter((h) => !h.legacy).length, unidad: 'hábitos cumplidos', examen: HABITS.filter((h) => d.items?.[h.id]).map((h) => h.id).join(' | ') });
    rows.push([base.tipo, date, time, base.valor, base.valor_2, base.pulso, base.unidad, base.examen, base.contexto, base.sintomas, base.ahora, base.notas]);
  }
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}

export const BACKUP_FORMAT = 'pulso-respaldo';
export const BACKUP_VERSION = 1;

// Valida un respaldo completo antes de restaurarlo. No modifica nada.
export function validateBackup(obj, now = new Date()) {
  const errors = [];
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, errors: ['El archivo no es un respaldo de Pulso.'] };
  if (obj.format !== BACKUP_FORMAT) return { ok: false, errors: ['El archivo no es un respaldo de Pulso.'] };
  if (obj.version !== BACKUP_VERSION) return { ok: false, errors: [`Versión de respaldo no compatible (${String(obj.version).slice(0, 10)}).`] };
  let profile = null, plan = null;
  if (obj.profile != null) {
    const v = validateProfile(obj.profile);
    if (!v.ok) errors.push('Perfil: ' + Object.values(v.errors).join(' '));
    else profile = v.value;
  }
  if (obj.plan != null) {
    const v = validatePlan(obj.plan);
    if (!v.ok) errors.push('Menú: ' + v.error);
    else plan = v.value;
  }
  const ms = Array.isArray(obj.measurements) ? obj.measurements : [];
  if (obj.measurements != null && !Array.isArray(obj.measurements)) errors.push('Las mediciones deben ser una lista.');
  if (ms.length > 20000) errors.push('El respaldo tiene demasiadas mediciones (máximo 20 000).');
  const measurements = [];
  ms.slice(0, 20000).forEach((m, idx) => {
    const v = validateMeasurement(m?.type, m?.measured_at, m?.data, now);
    if (!v.ok) errors.push(`Medición ${idx + 1}: ${Object.values(v.errors).join(' ')}`);
    else measurements.push({ type: m.type, measured_at: m.measured_at, data: v.value });
  });
  return { ok: errors.length === 0, errors: errors.slice(0, 20), totalErrors: errors.length, value: { profile, plan, measurements } };
}
