import { buildCalendar } from "@/lib/ics";

export const dynamic = "force-dynamic";

/** Feed privado del calendario (Google Calendar, iPhone, Outlook). El token va en el enlace. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ics = await buildCalendar(token.replace(/\.ics$/, ""));
  if (!ics) return new Response("Calendario no encontrado", { status: 404 });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="san-cayetano.ics"',
      "Cache-Control": "private, max-age=900",
    },
  });
}
