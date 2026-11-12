import { keyToDate, todayKey } from "./format";

/** Niveles de logro del informe al hogar (preescolar). */
export const ACHIEVEMENTS = [
  { value: "logrado", label: "Logrado", tone: "ok" },
  { value: "en-proceso", label: "En proceso", tone: "brand" },
  { value: "apoyo", label: "Necesita apoyo", tone: "warn" },
] as const;

export const achievementLabel = (v: string | null | undefined) => ACHIEVEMENTS.find((a) => a.value === v) ?? null;

/** Nota mínima de aprobación en primaria (MEP). */
export const PASSING = 65;

type C = { id: string; weight: number };
type S = { componentId: string; value: number };

/** Nota del periodo: suma ponderada de los componentes. Null si no hay ninguna nota. */
export function termGrade(components: C[], scores: S[]) {
  if (!scores.length) return null;
  let total = 0;
  for (const c of components) {
    const s = scores.find((x) => x.componentId === c.id);
    if (s) total += (s.value * c.weight) / 100;
  }
  return Math.round(total);
}

/** Periodo vigente (o el último que ya empezó). */
export function currentTerm<T extends { startsOn: Date; endsOn: Date }>(terms: T[]) {
  const today = keyToDate(todayKey());
  return terms.find((t) => t.startsOn <= today && t.endsOn >= today) ?? [...terms].reverse().find((t) => t.startsOn <= today) ?? terms[0];
}
