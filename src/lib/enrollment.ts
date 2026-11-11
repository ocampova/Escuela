/** Requisitos de formalización de matrícula (folleto «Formalización de la matrícula 2027»). */
export const ENROLL_DOCS = [
  { field: "docBirth", kind: "Certificado de nacimiento", step: "nacimiento" },
  { field: "docVaccines", kind: "Registro de vacunas", step: "vacunas" },
  { field: "docGuardianId", kind: "Cédula de padres o encargados", step: "cedula" },
  { field: "docPhoto", kind: "Fotografía tamaño pasaporte", step: "fotos" },
  { field: "docInsurance", kind: "Póliza estudiantil del INS", step: "poliza" },
] as const;

export const TRANSFER_DOCS = [
  { field: "docTitle", kind: "Título de preescolar", step: "titulo" },
  { field: "docConduct", kind: "Carta de comportamiento", step: "conducta" },
] as const;

export const FORMAL_STEPS: { key: string; label: string; transferOnly?: boolean }[] = [
  { key: "expediente", label: "Expediente en línea completo" },
  { key: "fotos", label: "Dos fotografías tamaño pasaporte" },
  { key: "cedula", label: "Fotocopia de la cédula de los padres o encargados" },
  { key: "vacunas", label: "Fotocopia del registro de vacunas" },
  { key: "nacimiento", label: "Certificado de nacimiento del Registro Civil" },
  { key: "poliza", label: "Póliza estudiantil del INS" },
  { key: "contrato", label: "Contrato de servicios educativos firmado" },
  { key: "pago", label: "Pago de la matrícula" },
  { key: "titulo", label: "Título de preescolar (ingreso a primaria)", transferOnly: true },
  { key: "conducta", label: "Carta de comportamiento de la institución anterior", transferOnly: true },
];
