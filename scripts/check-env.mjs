// Verifica las variables necesarias antes de arrancar y explica cómo arreglarlas.
const problems = [];
if (!process.env.DATABASE_URL) {
  problems.push(
    "Falta DATABASE_URL. En Railway: servicio de la app → Variables → New Variable → nombre DATABASE_URL, valor: escriba ${{ y elija su servicio de PostgreSQL → DATABASE_URL. Luego toque Deploy.",
  );
} else if (process.env.RAILWAY_ENVIRONMENT && /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL)) {
  problems.push(
    "DATABASE_URL apunta a localhost: es el valor de ejemplo del código, no su base de Railway. Cambie el valor por la referencia: escriba ${{ y elija su servicio de PostgreSQL → DATABASE_URL. Luego toque Deploy.",
  );
} else if (!/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL)) {
  problems.push("DATABASE_URL no parece una dirección de PostgreSQL (debe empezar con postgresql://). Revise que la referencia apunte al servicio correcto.");
}
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  problems.push("Falta AUTH_SECRET (32+ caracteres). En Railway use el valor ${{secret(48)}}.");
}
if (problems.length) {
  console.error("\n[configuración] La aplicación no puede arrancar:\n- " + problems.join("\n- ") + "\n");
  const present = Object.keys(process.env).filter((k) => /DATABASE|PG|POSTGRES|AUTH|SEED|RAILWAY_SERVICE_NAME/.test(k)).sort();
  console.error("[configuración] Variables relacionadas presentes: " + (present.join(", ") || "ninguna"));
  process.exit(1);
}
console.log("[configuración] Variables OK.");
