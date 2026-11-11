/**
 * Recordatorios de cobro del día. Para Railway Cron: un servicio con este repositorio,
 * comando de inicio `npm run recordatorios` y horario `0 14 * * *` (8:00 a. m. en Costa Rica).
 */
import { runPaymentReminders } from "../src/lib/reminders";
import { prisma } from "../src/lib/db";

runPaymentReminders()
  .then((r) => console.log("[recordatorios]", JSON.stringify(r)))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
