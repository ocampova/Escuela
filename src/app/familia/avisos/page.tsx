import Link from "next/link";
import type { Metadata } from "next";
import { Bell, ChevronRight } from "lucide-react";
import { requireGuardian } from "@/lib/auth";
import { audienceLabel, guardianAnnouncements, guardianStudents } from "@/lib/queries";
import { relativeDay } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Avisos" };

export default async function FamilyAnnouncements() {
  const user = await requireGuardian();
  const students = await guardianStudents(user.id);
  const anns = await guardianAnnouncements(user, students);
  const pending = anns.filter((a) => a.requiresAck && !a.reads[0]?.acknowledgedAt).length;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Avisos</h1>
      <p className="mt-1 text-sm text-ink-2">
        {pending > 0 ? `${pending} ${pending === 1 ? "aviso espera" : "avisos esperan"} su confirmación.` : "Ha confirmado todos los avisos."}
      </p>
      <Card className="mt-5 divide-y divide-line">
        {anns.length === 0 && (
          <EmptyState icon={<Bell className="size-5" />} title="Todavía no hay avisos">
            Aquí aparecerán las circulares de la escuela y de la docente de su hijo.
          </EmptyState>
        )}
        {anns.map((a) => {
          const read = a.reads[0];
          const needsAck = a.requiresAck && !read?.acknowledgedAt;
          return (
            <Link key={a.id} href={`/familia/avisos/${a.id}`} className="flex gap-3 p-4 transition-colors hover:bg-canvas">
              <span aria-hidden className={`mt-2 size-2 shrink-0 rounded-full ${!read ? "bg-scs-blue" : "bg-transparent"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={`min-w-0 ${!read ? "font-semibold" : "font-medium"}`}>{a.title}</p>
                  <span className="shrink-0 pt-0.5 text-xs text-ink-3">{relativeDay(a.createdAt)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-ink-2">{a.body}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge>{audienceLabel(a)}</Badge>
                  {needsAck ? <Badge tone="warn">Falta confirmar</Badge> : a.requiresAck ? <Badge tone="ok">Enterado</Badge> : null}
                </div>
              </div>
              <ChevronRight className="mt-0.5 size-5 shrink-0 self-center text-ink-3" aria-hidden />
            </Link>
          );
        })}
      </Card>
    </div>
  );
}
