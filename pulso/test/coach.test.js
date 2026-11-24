import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTE, activeHabits, coachAdvice, weeklyReview, bpWeekProgress, activityWeek, weightTrend, habitAdherence } from '../public/js/coach.js';
import { HABITS, validateMeasurement, validatePlan, applyPlanOp, newPlan, isoLocal } from '../public/js/logic.js';

const now = new Date(2026, 10, 24, 20, 0); // martes 24 nov 2026, 20:00
const at = (daysAgo, h = 7, min = 0) => { const d = new Date(now); d.setDate(d.getDate() - daysAgo); d.setHours(h, min, 0, 0); return isoLocal(d); };
const m = (type, measured_at, data) => ({ id: Math.random().toString(16).slice(2), type, measured_at, data, version: 1 });
const profile = { name: 'A', initialWeight: 109, milestonePct: 5, goals: ['peso', 'insulina', 'presion'] };
const plan = (week = 1, since = '2026-11-17') => ({ ...newPlan([], now), coach: { week, since } });

test('la ruta tiene 12 etapas, con por qué, cómo y fuente', () => {
  assert.equal(ROUTE.length, 12);
  ROUTE.forEach((w, i) => {
    assert.equal(w.n, i + 1);
    assert.ok(w.why.length > 40 && w.how.length >= 3 && w.source?.url.startsWith('https://'), `semana ${w.n}`);
    assert.doesNotMatch(w.why + w.how.join(' '), /cura|reinici|garantiz|milagro|desintoxic/i, `semana ${w.n}: promesas`);
  });
});

test('los hábitos se acumulan semana a semana y existen en el catálogo', () => {
  assert.deepEqual(activeHabits(1).map((h) => h.id), []);
  assert.deepEqual(activeHabits(3).map((h) => h.id), ['verduras', 'sin_azucaradas']);
  assert.ok(activeHabits(12).length >= 8);
  for (const h of activeHabits(12)) assert.ok(HABITS.find((x) => x.id === h.id));
});

test('semana de presión: cuenta días con lectura de mañana y de noche', () => {
  const ms = [];
  for (let d = 0; d < 6; d++) { ms.push(m('bp', at(d, 7), { sys: 130, dia: 85 }), m('bp', at(d, 20), { sys: 128, dia: 84 })); }
  ms.push(m('bp', at(6, 7), { sys: 130, dia: 85 })); // día 7 solo mañana
  const p = bpWeekProgress(ms, now);
  assert.equal(p.completeDays, 6); assert.equal(p.done, true); assert.equal(p.readings, 13);
  assert.equal(bpWeekProgress(ms.slice(0, 4), now).completeDays, 2);
});

test('actividad: minutos semanales y días de fuerza', () => {
  const ms = [
    m('activity', at(0, 13), { minutes: 15, kind: 'caminar', intensity: 'ligera', afterMeal: true }),
    m('activity', at(1, 18), { minutes: 30, kind: 'caminar', intensity: 'moderada' }),
    m('activity', at(2, 18), { minutes: 25, kind: 'fuerza', intensity: 'moderada' }),
    m('activity', at(2, 19), { minutes: 10, kind: 'fuerza', intensity: 'moderada' }),
    m('activity', at(9, 18), { minutes: 60, kind: 'cardio', intensity: 'vigorosa' }), // fuera de la semana
  ];
  const a = activityWeek(ms, now);
  assert.equal(a.minutes, 80); assert.equal(a.strengthDays, 1); assert.equal(a.postMeal, 1);
});

test('tendencia de peso: requiere 2 semanas y 3 registros; detecta ritmo rápido', () => {
  assert.equal(weightTrend([m('weight', at(0), { kg: 108 }), m('weight', at(3), { kg: 109 })], now), null);
  const steady = [m('weight', at(0), { kg: 107 }), m('weight', at(7), { kg: 107.5 }), m('weight', at(14), { kg: 108 }), m('weight', at(21), { kg: 108.5 })];
  assert.equal(weightTrend(steady, now).perWeek, -0.5);
  const fast = [m('weight', at(0), { kg: 103 }), m('weight', at(7), { kg: 105 }), m('weight', at(14), { kg: 107 })];
  const adv = coachAdvice({ profile, plan: plan(5), measurements: fast }, now);
  assert.ok(adv.insights.find((i) => i.id === 'weight-fast'));
});

test('coach: sin datos propone la línea base y no inventa tendencias', () => {
  const adv = coachAdvice({ profile, plan: plan(1), measurements: [] }, now);
  const ids = adv.actions.map((a) => a.id);
  assert.ok(ids.includes('bp-week')); assert.ok(ids.includes('weight-first')); assert.ok(ids.includes('labs-missing'));
  assert.equal(adv.insights.length, 0);
  assert.ok(adv.actions.length <= 3);
});

test('coach: respeta objetivos (solo presión no pide laboratorios ni peso)', () => {
  const adv = coachAdvice({ profile: { ...profile, goals: ['presion'] }, plan: plan(3), measurements: [] }, now);
  const ids = adv.actions.map((a) => a.id);
  assert.deepEqual(ids, ['bp-week']);
});

test('coach: promedio de presión alto sugiere consultar, sin diagnosticar ni tocar medicamentos', () => {
  const ms = [];
  for (let d = 0; d < 4; d++) { ms.push(m('bp', at(d, 7), { sys: 146, dia: 92 }), m('bp', at(d, 20), { sys: 142, dia: 90 })); }
  const adv = coachAdvice({ profile, plan: plan(5), measurements: ms }, now);
  const ins = adv.insights.find((i) => i.id === 'bp-high');
  assert.ok(ins); assert.match(ins.detail, /médico/); assert.match(ins.detail, /no cambies medicamentos/);
  assert.match(ins.title, /144\/91/);
});

test('coach: actividad y fuerza aparecen solo desde las semanas 6 y 7', () => {
  const ids5 = coachAdvice({ profile: { ...profile, goals: ['peso'] }, plan: plan(5), measurements: [m('weight', at(1), { kg: 108 })] }, now).actions.map((a) => a.id);
  assert.ok(!ids5.includes('activity'));
  const ids7 = coachAdvice({ profile: { ...profile, goals: ['peso'] }, plan: plan(7), measurements: [m('weight', at(1), { kg: 108 })] }, now).actions.map((a) => a.id);
  assert.ok(ids7.includes('activity') && ids7.includes('strength'));
});

test('avanzar: se sugiere después de 6 días en la etapa', () => {
  assert.equal(coachAdvice({ profile, plan: plan(2, '2026-11-22'), measurements: [] }, now).canAdvance, false);
  assert.equal(coachAdvice({ profile, plan: plan(2, '2026-11-17'), measurements: [] }, now).canAdvance, true);
  assert.equal(coachAdvice({ profile, plan: plan(12, '2026-11-01'), measurements: [] }, now).canAdvance, false);
});

test('revisión semanal: adherencia y comparación con la semana previa', () => {
  const ms = [];
  for (let d = 0; d < 7; d++) ms.push(m('habit', at(d, 19), { items: { verduras: true, sin_azucaradas: d < 3 } }));
  for (let d = 0; d < 3; d++) { ms.push(m('bp', at(d, 7), { sys: 128, dia: 82 })); ms.push(m('bp', at(d + 7, 7), { sys: 136, dia: 86 })); }
  const r = weeklyReview({ profile, plan: plan(3), measurements: ms }, now);
  assert.equal(r.cur.byHabit.verduras.done, 7);
  assert.equal(r.cur.byHabit.sin_azucaradas.done, 3);
  assert.equal(r.hardest.id, 'sin_azucaradas');
  assert.ok(r.wins.some((w) => /136\/86 a 128\/82/.test(w)));
  assert.equal(habitAdherence(ms, activeHabits(3), now).total, 72);
});

test('validación: actividad y semana de la ruta', () => {
  assert.ok(validateMeasurement('activity', '2026-11-24T07:00', { minutes: '30', kind: 'caminar', intensity: 'moderada' }, now).ok);
  assert.ok(!validateMeasurement('activity', '2026-11-24T07:00', { minutes: 0, kind: 'caminar', intensity: 'moderada' }, now).ok);
  assert.ok(!validateMeasurement('activity', '2026-11-24T07:00', { minutes: 20, kind: 'volar', intensity: 'moderada' }, now).ok);
  const p = plan(1);
  assert.equal(applyPlanOp(p, { type: 'setCoachWeek', week: 4, since: '2026-11-24' }).coach.week, 4);
  assert.throws(() => applyPlanOp(p, { type: 'setCoachWeek', week: 13, since: '2026-11-24' }));
  // Planes viejos sin "coach" siguen siendo válidos
  const old = { ...p }; delete old.coach;
  assert.equal(validatePlan(old).value.coach.week, 1);
});
