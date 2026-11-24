// Pulso — coach metabólico.
// Ruta de 12 semanas (un cambio por semana, acumulativo) y un motor de recomendaciones
// basado SOLO en los registros reales de la persona. No diagnostica ni ajusta medicamentos.
import { parseLocal, isoDate, addDays, parseIsoDate, stats, HABITS } from './logic.js';

export const GOALS = [
  { id: 'peso', label: 'Bajar de peso', short: 'Peso' },
  { id: 'insulina', label: 'Mejorar la resistencia a la insulina', short: 'Insulina' },
  { id: 'presion', label: 'Bajar la presión arterial', short: 'Presión' },
];

export const DAILY_HABITS = HABITS;

const SRC = {
  niddkWeight: { org: 'NIDDK', title: 'Control del peso', url: 'https://www.niddk.nih.gov/health-information/weight-management' },
  niddkIR: { org: 'NIDDK', title: 'Resistencia a la insulina y prediabetes', url: 'https://www.niddk.nih.gov/health-information/diabetes/overview/what-is-diabetes/prediabetes-insulin-resistance' },
  niddkActivity: { org: 'NIDDK', title: 'Actividad física y peso', url: 'https://www.niddk.nih.gov/health-information/weight-management/physical-activity-weight-management' },
  ahaHome: { org: 'American Heart Association', title: 'Medir la presión en casa', url: 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/monitoring-your-blood-pressure-at-home' },
  ahaSodium: { org: 'American Heart Association', title: 'Sodio y presión arterial', url: 'https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/sodium' },
  ahaSugar: { org: 'American Heart Association', title: 'Azúcares añadidos', url: 'https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/sugar/added-sugars' },
  ahaActivity: { org: 'American Heart Association', title: 'Recomendaciones de actividad física', url: 'https://www.heart.org/en/healthy-living/fitness/fitness-basics/aha-recs-for-physical-activity-in-adults' },
  ahaSleep: { org: 'American Heart Association', title: 'Sueño y salud del corazón', url: 'https://www.heart.org/en/healthy-living/healthy-lifestyle/sleep' },
  ahaStress: { org: 'American Heart Association', title: 'Estrés y salud', url: 'https://www.heart.org/en/healthy-living/healthy-lifestyle/stress-management' },
  dash: { org: 'NHLBI', title: 'Plan de alimentación DASH', url: 'https://www.nhlbi.nih.gov/education/dash-eating-plan' },
  nhlbiBP: { org: 'NHLBI', title: 'Presión arterial alta', url: 'https://www.nhlbi.nih.gov/health/high-blood-pressure' },
  plate: { org: 'NIDDK', title: 'Alimentación saludable y el método del plato', url: 'https://www.niddk.nih.gov/health-information/diabetes/overview/diet-eating-physical-activity' },
};
export const COACH_SOURCES = SRC;

// La ruta: un foco por semana. Avanzar es decisión de la persona; no hay fechas límite.
export const ROUTE = [
  {
    n: 1, title: 'Tu punto de partida', habit: null, task: 'baseline', icon: 'ruler',
    why: 'No se puede mejorar lo que no se mide. Una semana de mediciones en casa da una base mucho más confiable que una lectura aislada en el consultorio.',
    how: [
      'Pesate una vez esta semana, en ayunas y después de ir al baño.',
      'Medí tu cintura a la altura del ombligo.',
      'Semana de presión: 2 lecturas en la mañana y 2 en la noche, durante 7 días, antes de comer y de tomar medicamentos.',
      'Si tenés exámenes recientes (glucosa, HbA1c, colesterol), registralos con su unidad.',
    ],
    goals: ['peso', 'insulina', 'presion'], source: SRC.ahaHome,
  },
  {
    n: 2, title: 'El plato que te ayuda', habit: 'verduras', icon: 'salad',
    why: 'Llenar medio plato de verduras aumenta la fibra y el volumen con pocas calorías, ayuda a la saciedad y hace que el arroz y los tubérculos se absorban más lento.',
    how: [
      'Medio plato: verduras (ensalada, chayote, vainica, brócoli, repollo).',
      'Un cuarto: proteína (pollo, pescado, huevo, carne magra, frijoles).',
      'Un cuarto: almidón (arroz, papa, yuca, camote, tortilla).',
      'Empezá por la verdura y dejá el almidón para el final.',
    ],
    goals: ['peso', 'insulina', 'presion'], source: SRC.plate,
  },
  {
    n: 3, title: 'Lo que tomás', habit: 'sin_azucaradas', icon: 'droplet',
    why: 'Las bebidas azucaradas y los jugos elevan rápido la glucosa y aportan calorías que no quitan el hambre. Es uno de los cambios con mejor relación esfuerzo-resultado.',
    how: [
      'Agua, agua con limón o café y té sin azúcar como bebidas principales.',
      'Fruta entera en lugar de jugo, aunque sea natural.',
      'Si te cuesta, bajá el azúcar del café de a poco durante la semana.',
    ],
    goals: ['peso', 'insulina'], source: SRC.ahaSugar,
  },
  {
    n: 4, title: 'Caminar después de comer', habit: 'caminar_post', icon: 'footprints',
    why: 'Los músculos usan glucosa al moverse. Unos 10–15 minutos de caminata suave después del almuerzo o la cena ayudan a bajar el pico de glucosa de esa comida.',
    how: [
      'Elegí una comida fija: por ejemplo, salir a caminar después del almuerzo.',
      'Ritmo cómodo: podés hablar mientras caminás.',
      'Si no podés salir, subí y bajá escaleras o caminá dentro de la casa.',
    ],
    goals: ['insulina', 'peso'], source: SRC.niddkIR,
  },
  {
    n: 5, title: 'Menos sal, más sabor', habit: 'sal', icon: 'heart-pulse',
    why: 'El exceso de sodio sube la presión. La American Heart Association recomienda menos de 2300 mg al día y, de manera ideal, alrededor de 1500 mg para la mayoría de adultos con presión alta.',
    how: [
      'Lo que más sodio aporta casi nunca es el salero: son los consomés, cubitos, salsas, embutidos, snacks y pan.',
      'Sazoná con ajo, cebolla, culantro, chile dulce, limón, comino y orégano.',
      'Probá la comida antes de agregar sal en la mesa.',
      'En etiquetas, comparé el sodio por porción y elegí la opción más baja.',
    ],
    goals: ['presion'], source: SRC.ahaSodium,
  },
  {
    n: 6, title: '150 minutos por semana', habit: null, task: 'activity', icon: 'timer',
    why: 'La recomendación para adultos es al menos 150 minutos semanales de actividad moderada. Mejora la presión, la sensibilidad a la insulina y ayuda a mantener el peso.',
    how: [
      'Son unos 30 minutos, 5 días por semana; pueden ser bloques de 10 minutos.',
      'Las caminatas después de comer cuentan.',
      'Registrá los minutos en Progreso › Actividad para ver tu total semanal.',
    ],
    goals: ['peso', 'insulina', 'presion'], source: SRC.ahaActivity,
  },
  {
    n: 7, title: 'Fuerza: músculo que usa glucosa', habit: null, task: 'strength', icon: 'dumbbell',
    why: 'El músculo es el principal lugar donde se guarda y usa la glucosa. Entrenar fuerza 2 días por semana mejora la sensibilidad a la insulina y protege la masa muscular mientras bajás de peso.',
    how: [
      'Sentadilla a una silla, flexiones contra la pared, remo con botellas o ligas, puente de glúteos.',
      '2 o 3 series de 8–12 repeticiones, con descanso entre series.',
      'Dejá al menos un día entre sesiones de fuerza.',
      'Si tenés dolor de pecho, mareo o falta de aire al hacer ejercicio, detenete y consultá.',
    ],
    goals: ['insulina', 'peso'], source: SRC.ahaActivity,
  },
  {
    n: 8, title: 'Fibra y proteína', habit: 'fibra', extraHabit: 'proteina_desayuno', icon: 'chef-hat',
    why: 'La fibra (frijoles, avena, verduras, fruta entera) y la proteína en el desayuno dan más saciedad y una glucosa más estable durante la mañana.',
    how: [
      'Frijoles al menos una vez al día: gallo pinto, casado o ensalada.',
      'Desayuno con huevo, frijoles o pollo, no solo pan o fruta.',
      'Fruta entera de postre o merienda, no en jugo.',
    ],
    goals: ['insulina', 'peso', 'presion'], source: SRC.dash,
  },
  {
    n: 9, title: 'Dormir para regular el apetito', habit: 'dormir', icon: 'moon',
    why: 'Dormir menos de 7 horas se asocia a más hambre, peor control de la glucosa y presión más alta. Un horario regular ayuda tanto como las horas.',
    how: [
      'Elegí una hora fija para acostarte que te deje 7 horas o más.',
      'Pantallas fuera 30 minutos antes; cuarto oscuro y fresco.',
      'Café solo antes del mediodía.',
      'Si roncás fuerte o te despertás cansado, comentalo con tu médico: la apnea del sueño sube la presión.',
    ],
    goals: ['peso', 'insulina', 'presion'], source: SRC.ahaSleep,
  },
  {
    n: 10, title: 'Estrés y presión', habit: 'respiracion', icon: 'wind',
    why: 'Una app no elimina el estrés sostenido, pero las pausas y la respiración lenta ayudan a manejarlo y a evitar comer por ansiedad. Limitar el alcohol también ayuda a la presión.',
    how: [
      'Respiración lenta: inhalá 4 segundos, exhalá 6, durante 5 minutos.',
      'Una pausa al día lejos del teléfono.',
      'Si tomás alcohol, menos es mejor para la presión y el peso.',
    ],
    goals: ['presion'], source: SRC.ahaStress,
  },
  {
    n: 11, title: 'Comer fuera y fines de semana', habit: null, task: 'outside', icon: 'utensils',
    why: 'Los avances se sostienen cuando el plan funciona también en sodas, fiestas y fines de semana, no solo en casa.',
    how: [
      'En un casado: pedí más ensalada, media porción de arroz y el plátano sin freír si es posible.',
      'Elegí a la plancha o al horno antes que frito o empanizado.',
      'Agua o refresco natural sin azúcar.',
      'Una comida fuera de plan no borra la semana: seguí con la siguiente comida normal.',
    ],
    goals: ['peso', 'insulina', 'presion'], source: SRC.niddkWeight,
  },
  {
    n: 12, title: 'Revisión y siguiente etapa', habit: null, task: 'review', icon: 'flag',
    why: 'Comparar con tu punto de partida te muestra qué funcionó. Es un buen momento para revisar resultados con tu médico y proponer el siguiente hito.',
    how: [
      'Repetí la semana de presión (2 + 2 lecturas por 7 días).',
      'Pesate y medí tu cintura.',
      'Si tu médico lo indica, repetí glucosa o HbA1c.',
      'Imprimí el resumen para la consulta y definí tu próximo hito.',
    ],
    goals: ['peso', 'insulina', 'presion'], source: SRC.nhlbiBP,
  },
];

export const routeWeek = (n) => ROUTE.find((w) => w.n === n) || ROUTE[0];

// Hábitos activos del checklist según la semana de la ruta.
export function activeHabits(week) {
  const ids = [];
  for (const w of ROUTE) {
    if (w.n > week) break;
    if (w.habit) ids.push(w.habit);
    if (w.extraHabit) ids.push(w.extraHabit);
  }
  return DAILY_HABITS.filter((h) => ids.includes(h.id));
}

// ---------- utilidades ----------
const DAY = 86400000;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
function within(list, days, now) {
  const from = startOfDay(now).getTime() - (days - 1) * DAY;
  return list.filter((m) => { const t = parseLocal(m.measured_at)?.getTime(); return t >= from && t < startOfDay(now).getTime() + DAY; });
}
const of = (ms, type) => ms.filter((m) => m.type === type).sort((a, b) => b.measured_at.localeCompare(a.measured_at));

export function daysSince(local, now) {
  const d = parseLocal(local) || parseIsoDate(local);
  if (!d) return Infinity;
  return Math.floor((startOfDay(now) - startOfDay(d)) / DAY);
}

// Semana de presión: días (de los últimos 7) con lectura de mañana (<12 h) y de noche (≥17 h).
export function bpWeekProgress(ms, now) {
  const bp = within(of(ms, 'bp'), 7, now);
  const days = {};
  for (const m of bp) {
    const d = m.measured_at.slice(0, 10), h = Number(m.measured_at.slice(11, 13));
    days[d] ||= { am: 0, pm: 0 };
    if (h < 12) days[d].am++; else if (h >= 17) days[d].pm++;
  }
  const complete = Object.values(days).filter((x) => x.am >= 1 && x.pm >= 1).length;
  return { readings: bp.length, daysWithReadings: Object.keys(days).length, completeDays: complete, done: complete >= 6 };
}

export function activityWeek(ms, now) {
  const a = within(of(ms, 'activity'), 7, now);
  const minutes = a.filter((x) => x.data.intensity !== 'ligera' || x.data.kind === 'caminar').reduce((s, x) => s + x.data.minutes, 0);
  const strengthDays = new Set(a.filter((x) => x.data.kind === 'fuerza').map((x) => x.measured_at.slice(0, 10))).size;
  const postMeal = a.filter((x) => x.data.afterMeal).length;
  return { minutes, strengthDays, postMeal, sessions: a.length };
}

// Adherencia a cada hábito activo en los últimos n días con registro.
export function habitAdherence(ms, habits, now, days = 7) {
  const recs = within(of(ms, 'habit'), days, now);
  const out = {};
  for (const h of habits) {
    const done = recs.filter((r) => r.data.items?.[h.id]).length;
    out[h.id] = { done, of: days, pct: Math.round((done / days) * 100) };
  }
  const total = habits.length ? Math.round(habits.reduce((s, h) => s + out[h.id].pct, 0) / habits.length) : null;
  return { byHabit: out, total, daysLogged: recs.length };
}

// Ritmo de cambio de peso (kg/semana) con regresión lineal simple, últimos 35 días.
export function weightTrend(ms, now) {
  const w = within(of(ms, 'weight'), 35, now);
  if (w.length < 3) return null;
  const pts = w.map((m) => ({ x: parseLocal(m.measured_at).getTime() / (7 * DAY), y: m.data.kg }));
  const span = Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x));
  if (span < 2) return null; // menos de 2 semanas: no se puede hablar de tendencia
  const mx = pts.reduce((s, p) => s + p.x, 0) / pts.length, my = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const slope = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / pts.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  return { perWeek: Math.round(slope * 100) / 100, n: w.length, weeks: Math.round(span * 10) / 10 };
}

export function bpAvg(ms, now, days) {
  const bp = within(of(ms, 'bp'), days, now);
  if (!bp.length) return null;
  const s = stats(bp.map((m) => ({ measured_at: m.measured_at, value: m.data.sys })));
  const d = stats(bp.map((m) => ({ measured_at: m.measured_at, value: m.data.dia })));
  return { sys: Math.round(s.avg), dia: Math.round(d.avg), n: bp.length, from: s.from, to: s.to };
}

function latestLab(ms, test) {
  return of(ms, 'lab').find((m) => m.data.test === test) || null;
}

// ---------- motor de recomendaciones ----------
// Devuelve acciones priorizadas (máx. 3) y observaciones basadas en datos.
// Cada elemento: { id, title, detail, href, cta, tone: 'info'|'warn'|'ok' }
export function coachAdvice({ profile, plan, measurements }, now = new Date()) {
  const goals = profile.goals?.length ? profile.goals : ['peso', 'insulina', 'presion'];
  const ms = measurements || [];
  const week = plan?.coach?.week || 1;
  const actions = [];
  const insights = [];

  // 1. Presión: semana de medición
  const bpw = bpWeekProgress(ms, now);
  const bpNeeded = goals.includes('presion') || week === 1 || week === 12;
  if (bpNeeded && !bpw.done) {
    const h = now.getHours();
    actions.push({
      id: 'bp-week', title: `Semana de presión: día ${Math.min(7, bpw.completeDays + 1)} de 7`,
      detail: `${h < 12 ? 'Toca la medición de la mañana' : h >= 17 ? 'Toca la medición de la noche' : 'Esta noche toca medir'}: 2 lecturas con 1 minuto de diferencia. Llevás ${bpw.completeDays} ${bpw.completeDays === 1 ? 'día completo' : 'días completos'}.`,
      href: '#/registrar/bp', cta: 'Registrar presión', tone: 'info',
    });
  }

  // 2. Peso
  const w = of(ms, 'weight');
  if (goals.includes('peso') || week === 1) {
    if (!w.length) actions.push({ id: 'weight-first', title: 'Registrá tu peso de inicio', detail: 'En ayunas, después de ir al baño, con poca ropa.', href: '#/registrar/weight', cta: 'Registrar peso', tone: 'info' });
    else if (daysSince(w[0].measured_at, now) >= 7) actions.push({ id: 'weight-weekly', title: 'Toca pesarte', detail: `Tu último registro fue hace ${daysSince(w[0].measured_at, now)} días. Una vez por semana, el mismo día y a la misma hora, es suficiente.`, href: '#/registrar/weight', cta: 'Registrar peso', tone: 'info' });
  }

  // 3. Laboratorios para resistencia a la insulina
  if (goals.includes('insulina')) {
    const a1c = latestLab(ms, 'hba1c'), glu = of(ms, 'lab').find((m) => m.data.test === 'glucosa' && m.data.context === 'ayunas');
    if (!a1c && !glu) actions.push({ id: 'labs-missing', title: 'Sin datos de glucosa todavía', detail: 'Si tenés exámenes de glucosa en ayunas o HbA1c, registralos. Si no, preguntale a tu médico si conviene hacerlos: son la forma de medir tu avance en resistencia a la insulina.', href: '#/registrar/lab', cta: 'Agregar resultado', tone: 'info' });
    else if (a1c && daysSince(a1c.measured_at, now) > 180) insights.push({ id: 'a1c-old', title: 'Tu última HbA1c tiene más de 6 meses', detail: 'Consultá con tu médico si corresponde repetirla. La HbA1c refleja el promedio de glucosa de los últimos 2–3 meses.', tone: 'info' });
  }

  // 4. Actividad
  const act = activityWeek(ms, now);
  if (week >= 4) {
    if (week >= 6 && act.minutes < 150) actions.push({ id: 'activity', title: `${act.minutes} de 150 minutos esta semana`, detail: act.minutes ? `Te faltan ${150 - act.minutes} minutos. Una caminata de 20–30 minutos hoy te acerca.` : 'Empezá con una caminata de 10–15 minutos después de una comida.', href: '#/registrar/activity', cta: 'Registrar actividad', tone: 'info' });
    if (week >= 7 && act.strengthDays < 2) actions.push({ id: 'strength', title: `Fuerza: ${act.strengthDays} de 2 días esta semana`, detail: 'Sentadillas a una silla, flexiones contra la pared y remo con botellas: 20 minutos alcanzan.', href: '#/registrar/activity', cta: 'Registrar sesión', tone: 'info' });
  }

  // 5. Sueño
  const sl = within(of(ms, 'sleep'), 7, now);
  if (sl.length >= 3) {
    const avg = sl.reduce((s, x) => s + x.data.hours, 0) / sl.length;
    if (avg < 7) insights.push({ id: 'sleep-low', title: `Dormiste ${avg.toFixed(1).replace('.', ',')} horas en promedio`, detail: 'Menos de 7 horas se asocia a más hambre y peor control de la glucosa y la presión. La semana 9 de la ruta trabaja este tema.', tone: 'warn' });
  }

  // ---------- observaciones de tendencia (no diagnósticas) ----------
  const bp7 = bpAvg(ms, now, 7);
  if (bp7 && bp7.n >= 6) {
    if (bp7.sys >= 140 || bp7.dia >= 90) insights.push({ id: 'bp-high', title: `Tu presión promedio de la semana: ${bp7.sys}/${bp7.dia} mmHg`, detail: `Con ${bp7.n} lecturas, está en 140/90 o más. Conversalo pronto con tu médico y llevale el resumen; no cambies medicamentos por tu cuenta.`, tone: 'warn' });
    else if (bp7.sys >= 130 || bp7.dia >= 80) insights.push({ id: 'bp-mid', title: `Tu presión promedio de la semana: ${bp7.sys}/${bp7.dia} mmHg`, detail: `Con ${bp7.n} lecturas, está por encima de 130/80. Menos sal, actividad y bajar de peso son los cambios con más efecto; llevá estos datos a tu próxima cita.`, tone: 'info' });
    else insights.push({ id: 'bp-ok', title: `Tu presión promedio de la semana: ${bp7.sys}/${bp7.dia} mmHg`, detail: `Con ${bp7.n} lecturas. Seguí midiendo para ver si se mantiene.`, tone: 'ok' });
    const first = of(ms, 'bp').slice(-14);
    if (first.length >= 6 && of(ms, 'bp').length >= 20) {
      const s0 = Math.round(first.reduce((s, m) => s + m.data.sys, 0) / first.length);
      if (s0 - bp7.sys >= 5) insights.push({ id: 'bp-better', title: `La sistólica bajó ${s0 - bp7.sys} mmHg desde tus primeras mediciones`, detail: 'Comparando tus primeras 14 lecturas con los últimos 7 días.', tone: 'ok' });
    }
  }

  const trend = weightTrend(ms, now);
  if (trend) {
    if (trend.perWeek <= -1.2) insights.push({ id: 'weight-fast', title: `Estás bajando ${Math.abs(trend.perWeek).toString().replace('.', ',')} kg por semana`, detail: 'Es más rápido que el ritmo que suelen recomendar (0,5–1 kg por semana). Asegurate de comer suficiente proteína y verduras; si no estás haciendo un plan supervisado, comentalo con tu médico.', tone: 'warn' });
    else if (trend.perWeek < -0.2) insights.push({ id: 'weight-down', title: `Tendencia: −${Math.abs(trend.perWeek).toString().replace('.', ',')} kg por semana`, detail: `Calculada con ${trend.n} registros en ${trend.weeks.toString().replace('.', ',')} semanas. Un ritmo sostenible.`, tone: 'ok' });
    else if (trend.perWeek <= 0.2) {
      const adh = habitAdherence(ms, activeHabits(week), now, 14);
      insights.push({ id: 'weight-flat', title: 'Tu peso se mantiene estable', detail: adh.total != null && adh.total >= 70 ? 'Venís cumpliendo tus hábitos. Probá reducir un poco la porción de almidón (arroz, tortilla) en la cena y sumar minutos de actividad. Los cambios en cintura y presión también cuentan.' : 'Antes de ajustar porciones, enfocate en cumplir los hábitos de tu semana actual; ahí suele estar la diferencia.', tone: 'info' });
    } else insights.push({ id: 'weight-up', title: 'Tu peso subió un poco en las últimas semanas', detail: 'Pasa. Revisá bebidas, comidas fuera de casa y porciones de almidón. Volvé al plato de la semana 2 sin castigarte.', tone: 'info' });
  }

  const a1cs = of(ms, 'lab').filter((m) => m.data.test === 'hba1c' && m.data.unit === '%');
  if (a1cs.length >= 2) {
    const diff = Math.round((a1cs[0].data.value - a1cs[a1cs.length - 1].data.value) * 10) / 10;
    insights.push({ id: 'a1c-change', title: `HbA1c: ${String(a1cs[a1cs.length - 1].data.value).replace('.', ',')}% → ${String(a1cs[0].data.value).replace('.', ',')}%`, detail: diff < 0 ? `Bajó ${String(Math.abs(diff)).replace('.', ',')} puntos. Tu médico puede decirte qué significa para tu caso.` : 'Revisá este resultado con tu médico.', tone: diff < 0 ? 'ok' : 'info' });
  }

  // Avance de ruta
  const since = plan?.coach?.since;
  const daysInWeek = since ? daysSince(since, now) : 0;
  const canAdvance = week < ROUTE.length && daysInWeek >= 6;

  return { week, goals, actions: actions.slice(0, 3), insights, bpWeek: bpw, activity: act, daysInWeek, canAdvance };
}

// Resumen semanal: compara los últimos 7 días con los 7 anteriores.
export function weeklyReview({ profile, plan, measurements }, now = new Date()) {
  const ms = measurements || [];
  const week = plan?.coach?.week || 1;
  const habits = activeHabits(week);
  const cur = habitAdherence(ms, habits, now, 7);
  const prevNow = new Date(now.getTime() - 7 * DAY);
  const prev = habitAdherence(ms, habits, prevNow, 7);
  const bpNow = bpAvg(ms, now, 7), bpPrev = bpAvg(ms, prevNow, 7);
  const w = of(ms, 'weight');
  const wNow = within(w, 7, now)[0], wPrev = within(w, 7, prevNow)[0];
  const act = activityWeek(ms, now), actPrev = activityWeek(ms, prevNow);
  const wins = [];
  if (cur.total != null && cur.total >= 70) wins.push(`Cumpliste tus hábitos el ${cur.total}% de los días.`);
  if (act.minutes >= 150) wins.push(`Llegaste a ${act.minutes} minutos de actividad.`);
  if (bpNow && bpPrev && bpNow.sys < bpPrev.sys) wins.push(`Tu presión promedio bajó de ${bpPrev.sys}/${bpPrev.dia} a ${bpNow.sys}/${bpNow.dia}.`);
  if (wNow && wPrev && wNow.data.kg < wPrev.data.kg) wins.push(`Tu peso pasó de ${String(wPrev.data.kg).replace('.', ',')} a ${String(wNow.data.kg).replace('.', ',')} kg.`);
  const hardest = habits.map((h) => ({ h, pct: cur.byHabit[h.id].pct })).sort((a, b) => a.pct - b.pct)[0];
  return { week, habits, cur, prev, bpNow, bpPrev, wNow, wPrev, act, actPrev, wins, hardest: hardest && cur.daysLogged >= 3 && hardest.pct < 60 ? hardest.h : null };
}

export function weekRangeLabel(since) {
  return since ? `${since} – ${addDays(since, 6)}` : '';
}
export { isoDate };
