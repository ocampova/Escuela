import { NextResponse } from "next/server";
import { runPaymentReminders } from "@/lib/reminders";

/**
 * Tarea diaria de recordatorios de cobro. La llama un cron externo (Railway Cron o
 * cron-job.org) con el encabezado `Authorization: Bearer <CRON_SECRET>`.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("No autorizado", { status: 401 });
  const result = await runPaymentReminders();
  console.log("[recordatorios]", JSON.stringify(result));
  return NextResponse.json(result);
}
