/** Datos del expediente que pide el MEP (estadística y evaluación). */

export const SEX_LABEL: Record<string, string> = { F: "Mujer", M: "Hombre" };

export const ADAPTATION_LABEL: Record<string, string> = {
  NONE: "Sin adecuación",
  ACCESS: "De acceso",
  NON_SIGNIFICANT: "No significativa",
  SIGNIFICANT: "Significativa",
};
/** Texto corto para listas (asistencia, notas). */
export const ADAPTATION_SHORT: Record<string, string> = { ACCESS: "Adecuación de acceso", NON_SIGNIFICANT: "Adecuación no significativa", SIGNIFICANT: "Adecuación significativa" };

export const STATUS_LABEL: Record<string, string> = { ACTIVE: "Activo", WITHDRAWN: "Retirado", TRANSFERRED: "Trasladado" };

export const EXIT_REASONS = ["Cambio de domicilio", "Traslado a otra institución", "Motivos económicos", "Motivos de salud", "Motivos familiares", "Otro"];

export const NATIONALITIES = ["Costarricense", "Nicaragüense", "Venezolana", "Colombiana", "Estadounidense", "Panameña", "Otra"];

/** Filtro de Prisma para alumnos que siguen en la escuela. */
export const ACTIVE = { status: "ACTIVE" } as const;

/** Edad cumplida a una fecha (para la estadística del MEP). */
export function ageAt(birth: Date, at: Date) {
  let age = at.getUTCFullYear() - birth.getUTCFullYear();
  const m = at.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && at.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}
