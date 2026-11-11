/** Opciones del reporte diario (preescolar). Texto corto para la docente, frase completa para la familia. */
export const DAILY_FIELDS = [
  {
    key: "mood",
    label: "Ánimo",
    options: [
      { value: "contento", label: "Contento", tone: "ok" },
      { value: "tranquilo", label: "Tranquilo", tone: "ok" },
      { value: "cansado", label: "Cansado", tone: "warn" },
      { value: "sensible", label: "Sensible", tone: "warn" },
    ],
  },
  {
    key: "meal",
    label: "Merienda",
    options: [
      { value: "todo", label: "Comió todo", tone: "ok" },
      { value: "mitad", label: "Comió la mitad", tone: "ok" },
      { value: "poco", label: "Comió poco", tone: "warn" },
      { value: "nada", label: "No comió", tone: "warn" },
    ],
  },
  {
    key: "participation",
    label: "Participación",
    options: [
      { value: "muy-activa", label: "Muy activa", tone: "ok" },
      { value: "buena", label: "Buena", tone: "ok" },
      { value: "apoyo", label: "Necesitó apoyo", tone: "warn" },
    ],
  },
  {
    key: "bathroom",
    label: "Baño",
    options: [
      { value: "normal", label: "Sin novedad", tone: "ok" },
      { value: "cambio", label: "Necesitó cambio de ropa", tone: "warn" },
    ],
  },
] as const;

export type DailyKey = (typeof DAILY_FIELDS)[number]["key"];

/** Lo habitual: para llenar a todos de un toque y ajustar solo las excepciones. */
export const DAILY_DEFAULTS: Record<DailyKey, string> = { mood: "contento", meal: "todo", participation: "buena", bathroom: "normal" };

export function dailyLabel(key: string, value: string | null | undefined) {
  if (!value) return null;
  const f = DAILY_FIELDS.find((x) => x.key === key);
  return f?.options.find((o) => o.value === value) ?? null;
}

export function isValidDaily(key: string, value: string) {
  return DAILY_FIELDS.some((f) => f.key === key && f.options.some((o) => o.value === value));
}
