export const STATUS: Record<string, { label: string; tone: "brand" | "warn" | "ok" | "neutral" | "danger" | "blue" }> = {
  NEW: { label: "Nueva", tone: "blue" },
  CONTACTED: { label: "Contactada", tone: "warn" },
  VISIT: { label: "Visita agendada", tone: "warn" },
  ACCEPTED: { label: "Aceptada", tone: "brand" },
  ENROLLED: { label: "Matriculada", tone: "ok" },
  REJECTED: { label: "No continúa", tone: "neutral" },
};
