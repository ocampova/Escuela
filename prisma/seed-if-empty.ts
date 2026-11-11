/**
 * Al arrancar en producción: si SEED_DEMO=true y la base está vacía, carga los
 * datos de demostración. Nunca toca una base que ya tiene datos.
 */
import { PrismaClient } from "@prisma/client";
import { spawnSync } from "node:child_process";

async function main() {
  if (process.env.SEED_DEMO !== "true") return;
  const prisma = new PrismaClient();
  const schools = await prisma.school.count();
  await prisma.$disconnect();
  if (schools > 0) {
    console.log("[seed] La base ya tiene datos: no se cargan datos de demostración.");
    return;
  }
  console.log("[seed] Base vacía: cargando datos de demostración…");
  const r = spawnSync("npx", ["tsx", "prisma/seed.ts"], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
