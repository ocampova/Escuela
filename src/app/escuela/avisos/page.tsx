import Link from "next/link";
import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { isManager, requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { announcementRecipients, audienceLabel, staffSections } from "@/lib/queries";
import { relativeDay } from "@/lib/format";
import { Badge, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { ReadMeter } from "@/components/read-meter";

export const metadata: Metadata = { title: "Avisos" };

export default async function StaffAnnouncements() {
  const user = await requireStaff();
  const sections = await staffSections(user);
  const anns = await prisma.announcement.findMany({
    where: { schoolId: user.schoolId, ...(isManager(user) ? {} : { OR: [{ sectionId: { in: sections.map((s) => s.id) } }, { authorId: user.id }] }) },
    include: { author: true, level: true, section: { include: { grade: true } }, reads: { where: { acknowledgedAt: { not: null } }, select: { userId: true } } },
    orderBy: { createdAt: "desc" },
  });
  const stats = await Promise.all(
    anns.map(async (a) => {
      const r = await announcementRecipients(a);
      const ack = new Set(a.reads.map((x) => x.userId));
      return { a, total: r.length, done: r.filter((x) => ack.has(x.id)).length };
    }),
  );

  return (
    <div>
      <PageHeader title="Avisos" description="Circulares enviadas a las familias y quién ya las confirmó." actions={<ButtonLink href="/escuela/avisos/nuevo">Nuevo aviso</ButtonLink>} />
      <Card className="divide-y divide-line">
        {stats.length === 0 && (
          <EmptyState icon={<Bell className="size-5" />} title="Todavía no ha enviado avisos" action={<ButtonLink href="/escuela/avisos/nuevo">Escribir el primero</ButtonLink>}>
            Los avisos llegan a las familias del grupo que elija y usted ve quién los confirmó.
          </EmptyState>
        )}
        {stats.map(({ a, total, done }) => (
          <Link key={a.id} href={`/escuela/avisos/${a.id}`} className="grid gap-x-6 gap-y-2 px-4 py-4 transition-colors hover:bg-canvas md:grid-cols-[minmax(0,1fr)_260px] md:items-center">
            <div className="min-w-0">
              <p className="font-medium">{a.title}</p>
              <p className="mt-0.5 text-sm text-ink-2">
                {a.author.name.split(" ").slice(0, 2).join(" ")} · {relativeDay(a.createdAt)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="brand">{audienceLabel(a)}</Badge>
                {!a.requiresAck && <Badge>Solo informativo</Badge>}
              </div>
            </div>
            {a.requiresAck ? <ReadMeter done={done} total={total} /> : <span className="text-sm text-ink-3">No pide confirmación</span>}
          </Link>
        ))}
      </Card>
    </div>
  );
}
