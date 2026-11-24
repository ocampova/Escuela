import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, INGREDIENTS, recipeAllergens } from '../public/js/data.js';
import {
  buildMenu, newPlan, shoppingList, bpCategory, bpAlert, validateMeasurement, validateProfile, validatePlan,
  applyPlanOp, stats, milestone, measurementsCsv, validateBackup, isCompatible, mondayOf, isoLocal,
} from '../public/js/logic.js';

const now = new Date(2026, 10, 24, 9, 0);

test('hay al menos 12 recetas completas y todas usan ingredientes del catálogo', () => {
  assert.ok(RECIPES.length >= 12);
  for (const r of RECIPES) {
    assert.ok(r.steps.length >= 3, r.id);
    assert.ok(r.minutes > 0, r.id);
    assert.ok(r.batch.length && r.storage.length, r.id);
    for (const ing of r.ingredients) {
      const def = INGREDIENTS[ing.id];
      assert.ok(def, `${r.id}: ${ing.id}`);
      if (def.base !== 'gusto') {
        assert.ok(ing.qty > 0, `${r.id}: cantidad de ${ing.id}`);
        assert.ok(ing.state, `${r.id}: estado (crudo/cocido) de ${ing.id}`);
        assert.ok(def.toBuy[ing.state] != null, `${r.id}: conversión para ${ing.id} ${ing.state}`);
      }
    }
  }
});

test('ninguna receta usa lácteos, gluten, embutidos ni frituras (por catálogo)', () => {
  const forbidden = /leche|queso|natilla|crema de leche|mantequilla|harina de trigo|pan |pasta|salchich|chorizo|jamón|mortadela|frit|consomé|cubito|salsa lizano|mayonesa|ketchup/i;
  for (const r of RECIPES) {
    for (const ing of r.ingredients) assert.doesNotMatch(INGREDIENTS[ing.id].name, forbidden, `${r.id}: ${ing.id}`);
    for (const s of r.steps) assert.doesNotMatch(s, /\bfre[ií]r\b|freídas?|aceite abundante/i, `${r.id}: paso con fritura`);
  }
});

test('el menú respeta alergias declaradas', () => {
  for (const allergies of [['huevo'], ['pescado'], ['maiz'], ['huevo', 'pescado', 'maiz']]) {
    const menu = buildMenu(allergies);
    assert.equal(menu.length, 7);
    for (const day of menu) {
      for (const id of Object.values(day)) {
        if (!id) continue;
        const r = RECIPES.find((x) => x.id === id);
        assert.ok(isCompatible(r, allergies), `${id} contiene ${recipeAllergens(r)} con alergias ${allergies}`);
      }
    }
  }
  // Sin alergias, el menú tiene las 21 comidas asignadas y no repite almuerzo y cena el mismo día.
  const m = buildMenu([]);
  for (const d of m) { assert.ok(d.desayuno && d.almuerzo && d.cena); assert.notEqual(d.almuerzo, d.cena); }
});

test('lista de compras: agrupa, convierte cocido a seco y multiplica por adultos', () => {
  const plan = newPlan([], now);
  plan.menu = Array.from({ length: 7 }, () => ({ desayuno: 'gallo-pinto', almuerzo: null, cena: null }));
  const one = shoppingList(plan);
  const arroz1 = one.flatMap((g) => g.items).find((i) => i.id === 'arroz');
  // 7 × 80 g cocido × 0.4 = 224 g seco → redondeo a 250 g
  assert.equal(Math.round(arroz1.qty), 224);
  assert.equal(arroz1.label, '250 g en seco');
  assert.deepEqual(arroz1.fromCooked, ['cocido']);
  const huevos1 = one.flatMap((g) => g.items).find((i) => i.id === 'huevo');
  assert.equal(huevos1.label, '14 huevos');
  plan.adults = 3;
  const three = shoppingList(plan);
  const huevos3 = three.flatMap((g) => g.items).find((i) => i.id === 'huevo');
  assert.equal(huevos3.label, '42 huevos');
  const aguacate = three.flatMap((g) => g.items).find((i) => i.id === 'aguacate');
  assert.equal(aguacate.label, '6 aguacates'); // 7 × ¼ × 3 = 5,25 → 6
  // Agrupación por categoría y sin duplicados
  const ids = three.flatMap((g) => g.items.map((i) => i.id));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(three.find((g) => g.cat === 'huevos'));
});

test('lista de compras se actualiza al cambiar una receta', () => {
  const plan = newPlan([], now);
  plan.menu = Array.from({ length: 7 }, () => ({ desayuno: null, almuerzo: null, cena: null }));
  plan.menu[0].almuerzo = 'casado-pollo';
  let items = shoppingList(plan).flatMap((g) => g.items);
  assert.ok(items.find((i) => i.id === 'pechuga'));
  assert.ok(!items.find((i) => i.id === 'pescado'));
  const p2 = applyPlanOp(plan, { type: 'setMeal', day: 0, meal: 'almuerzo', recipeId: 'pescado-ajillo' });
  items = shoppingList(p2).flatMap((g) => g.items);
  assert.ok(!items.find((i) => i.id === 'pechuga'));
  const fish = items.find((i) => i.id === 'pescado');
  assert.equal(fish.label, '150 g crudo'); // 140 → redondeo a 150
});

test('pollo cocido se convierte a crudo para comprar', () => {
  const def = INGREDIENTS.pechuga;
  assert.equal(def.toBuy.cocido, 1.33);
});

test('categorías de presión (AHA)', () => {
  assert.equal(bpCategory(115, 75).key, 'normal');
  assert.equal(bpCategory(125, 78).key, 'elevada');
  assert.equal(bpCategory(132, 70).key, 'etapa1');
  assert.equal(bpCategory(118, 84).key, 'etapa1');
  assert.equal(bpCategory(145, 85).key, 'etapa2');
  assert.equal(bpCategory(120, 95).key, 'etapa2');
  assert.equal(bpCategory(180, 100).key, 'severa');
  assert.equal(bpCategory(150, 120).key, 'severa');
  assert.equal(bpCategory(179, 119).key, 'etapa2');
});

test('alertas: síntomas actuales mandan sobre la cifra; históricos se distinguen', () => {
  const at = isoLocal(new Date(now.getTime() - 10 * 60000));
  const old = isoLocal(new Date(now.getTime() - 3 * 86400000));
  assert.equal(bpAlert({ sys: 118, dia: 76, symptoms: ['dolor_pecho'], symptomsNow: true, measured_at: at }, now), 'emergencia');
  assert.equal(bpAlert({ sys: 118, dia: 76, symptoms: ['dolor_pecho'], symptomsNow: false, measured_at: at }, now), 'historico');
  assert.equal(bpAlert({ sys: 118, dia: 76, symptoms: ['dolor_pecho'], symptomsNow: true, measured_at: old }, now), 'historico');
  assert.equal(bpAlert({ sys: 182, dia: 100, symptoms: [], measured_at: at }, now), 'muy_alta');
  assert.equal(bpAlert({ sys: 150, dia: 121, symptoms: [], measured_at: at }, now), 'muy_alta');
  assert.equal(bpAlert({ sys: 185, dia: 100, symptoms: [], measured_at: old }, now), 'muy_alta_historico');
  assert.equal(bpAlert({ sys: 185, dia: 100, symptoms: ['falta_aire'], symptomsNow: true, measured_at: at }, now), 'emergencia');
  assert.equal(bpAlert({ sys: 179, dia: 119, symptoms: ['mareo'], symptomsNow: true, measured_at: at }, now), null);
});

test('validación de mediciones: cifras, unidades y fechas', () => {
  const t = '2026-11-24T08:00';
  assert.ok(validateMeasurement('weight', t, { kg: '108,4' }, now).ok);
  assert.equal(validateMeasurement('weight', t, { kg: '108,4' }, now).value.kg, 108.4);
  assert.ok(!validateMeasurement('weight', t, { kg: 'abc' }, now).ok);
  assert.ok(!validateMeasurement('weight', t, { kg: 5 }, now).ok);
  assert.ok(!validateMeasurement('weight', '2026-02-30T08:00', { kg: 100 }, now).ok, 'fecha imposible');
  assert.ok(!validateMeasurement('weight', '2027-01-10T08:00', { kg: 100 }, now).ok, 'fecha futura');
  assert.ok(!validateMeasurement('weight', '24/11/2026', { kg: 100 }, now).ok, 'formato');
  assert.ok(!validateMeasurement('bp', t, { sys: 80, dia: 90 }, now).ok, 'diastólica mayor');
  assert.ok(!validateMeasurement('bp', t, { sys: 120, dia: 80, symptoms: ['inventado'] }, now).ok);
  const bp = validateMeasurement('bp', t, { sys: '135', dia: '85', pulse: '', symptoms: ['mareo'], symptomsNow: true }, now);
  assert.ok(bp.ok); assert.equal(bp.value.sys, 135); assert.equal(bp.value.pulse, undefined);
  // Laboratorio: conserva unidad y contexto; rechaza unidad incorrecta o fuera de rango para esa unidad
  const g = validateMeasurement('lab', t, { test: 'glucosa', value: '5,6', unit: 'mmol/L', context: 'ayunas' }, now);
  assert.ok(g.ok); assert.equal(g.value.unit, 'mmol/L'); assert.equal(g.value.context, 'ayunas');
  assert.ok(!validateMeasurement('lab', t, { test: 'glucosa', value: 560, unit: 'mmol/L' }, now).ok);
  assert.ok(!validateMeasurement('lab', t, { test: 'glucosa', value: 100, unit: 'kg' }, now).ok);
  assert.ok(validateMeasurement('lab', t, { test: 'hba1c', value: 5.9, unit: '%' }, now).ok);
  assert.ok(validateMeasurement('lab', t, { test: 'otro', name: 'TSH', value: 2.1, unit: 'mUI/L' }, now).ok);
  assert.ok(!validateMeasurement('lab', t, { test: 'otro', value: 2.1 }, now).ok);
  assert.ok(!validateMeasurement('nope', t, {}, now).ok);
});

test('perfil: no inventa datos y valida rangos', () => {
  const v = validateProfile({ name: 'Allan', age: 41, initialWeight: 109 });
  assert.ok(v.ok);
  assert.equal(v.value.height, null);
  assert.equal(v.value.activity, '');
  assert.equal(v.value.conditions, '');
  assert.equal(v.value.medications, '');
  assert.equal(v.value.milestonePct, 5);
  assert.equal(v.value.emergencyNumber, '911');
  assert.ok(!validateProfile({ name: 'X', age: 5 }).ok);
  assert.ok(!validateProfile({ name: 'X', allergies: ['veneno'] }).ok);
  assert.ok(!validateProfile({ name: 'X', mealTimes: { desayuno: '25:00', almuerzo: '12:00', cena: '18:00' } }).ok);
});

test('hito: 5% de 109 kg', () => {
  const m = milestone(109, 5);
  assert.equal(m.loss, 5.5);
  assert.equal(m.target, 103.6);
  assert.equal(milestone(109, 3).target, 105.7);
});

test('estadísticas con fechas y cantidad', () => {
  const items = [
    { measured_at: '2026-11-20T07:00', value: 130 },
    { measured_at: '2026-11-22T07:00', value: 140 },
    { measured_at: '2026-10-01T07:00', value: 100 },
  ];
  const s7 = stats(items, 7, now);
  assert.equal(s7.count, 2); assert.equal(s7.avg, 135); assert.equal(s7.from, '2026-11-20T07:00'); assert.equal(s7.to, '2026-11-22T07:00');
  assert.equal(stats(items, null, now).count, 3);
  assert.equal(stats([], 7, now).count, 0);
});

test('plan: operaciones válidas e inválidas', () => {
  const p = newPlan([], now);
  assert.equal(p.weekStart, mondayOf(now));
  assert.equal(p.weekStart, '2026-11-23');
  assert.throws(() => applyPlanOp(p, { type: 'setMeal', day: 0, meal: 'desayuno', recipeId: 'casado-pollo' }), /incompatible/);
  assert.throws(() => applyPlanOp(p, { type: 'setMeal', day: 9, meal: 'desayuno', recipeId: 'gallo-pinto' }));
  assert.throws(() => applyPlanOp(p, { type: 'setMeal', day: 0, meal: 'desayuno', recipeId: '<script>' }));
  assert.throws(() => applyPlanOp(p, { type: 'setAdults', value: 0 }));
  const d = applyPlanOp(p, { type: 'setDone', date: '2026-11-23', meal: 'cena', value: true });
  assert.equal(d.done['2026-11-23:cena'], true);
  const b = applyPlanOp(d, { type: 'setBought', id: 'arroz', value: true });
  assert.equal(b.bought.arroz, true);
  assert.throws(() => applyPlanOp(b, { type: 'setBought', id: 'veneno', value: true }));
  assert.ok(validatePlan(b).ok);
});

test('CSV: encabezados, unidades y protección contra fórmulas', () => {
  const csv = measurementsCsv([
    { type: 'bp', measured_at: '2026-11-20T07:00', data: { sys: 130, dia: 85, pulse: 70, symptoms: ['mareo'], symptomsNow: false } },
    { type: 'lab', measured_at: '2026-11-01T07:00', data: { test: 'glucosa', value: 98, unit: 'mg/dL', context: 'ayunas', notes: '=HYPERLINK("x")' } },
  ]);
  const lines = csv.replace('﻿', '').split('\r\n');
  assert.match(lines[0], /^tipo,fecha,hora,valor/);
  assert.match(lines[1], /^laboratorio,2026-11-01,07:00,98,,,mg\/dL,Glucosa,En ayunas/);
  assert.match(lines[1], /"'=HYPERLINK\(""x""\)"/);
  assert.match(lines[2], /^presion,2026-11-20,07:00,130,85,70,mmHg/);
});

test('respaldo: rechaza archivos inválidos y acepta uno correcto', () => {
  assert.ok(!validateBackup(null).ok);
  assert.ok(!validateBackup([]).ok);
  assert.ok(!validateBackup({ format: 'otro' }).ok);
  assert.ok(!validateBackup({ format: 'pulso-respaldo', version: 99 }).ok);
  const bad = validateBackup({ format: 'pulso-respaldo', version: 1, measurements: [{ type: 'bp', measured_at: '2026-11-20T07:00', data: { sys: 'x', dia: 80 } }] }, now);
  assert.ok(!bad.ok); assert.match(bad.errors[0], /Medición 1/);
  const ok = validateBackup({ format: 'pulso-respaldo', version: 1, profile: { name: 'Allan', initialWeight: 109 }, plan: newPlan([], now), measurements: [{ type: 'weight', measured_at: '2026-11-20T07:00', data: { kg: 108.9 } }] }, now);
  assert.ok(ok.ok, ok.errors.join());
  assert.equal(ok.value.measurements.length, 1);
});
