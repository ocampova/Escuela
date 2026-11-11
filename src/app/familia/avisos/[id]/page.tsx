import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireGuardian } from "@/lib/auth";
import { audienceFilter, audienceLabel, guardianStudents } from "@/lib/queries";
import { dateTimeLabel, timeLabel } from "@/lib/format";
import { AckButton } from "@/components/ack-button";
import { MarkRead } from "@/components/mark-read";
import { AnnouncementImages } from "@/components/announcement-images";
import { Avatar, Badge, Card } from "@/components/ui";

const ROLE: Record<string, string> = { ADMIN: "Dirección", STAFF: "Secretaría", TEACHER: "Docente" };

export default async function FamilyAnnouncement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireGuardian();
  const students = await guardianStudents(user.id);
  const a = await prisma.announcement.findFirst({
    where: { id, schoolId: user.schoolId, ...audienceFilter(students) },
    include: { author: true, level: true, section: { include: { grade: true } }, reads: { where: { userId: user.id } }, images: { select: { id: true }, orderBy: { order: "asc" } } },
  });
  if (!a) notFound();
  const ack = a.reads[0]?.acknowledgedAt;

  return (
    <article className="mx-auto max-w-3xl">
      <MarkRead id={a.id} />
      <Link href="/familia/avisos" className="-ml-2 inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-ink-2 hover:bg-surface hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Avisos
      </Link>
      <Card className="mt-3 p-5">
        <Badge>{audienceLabel(a)}</Badge>
        <h1 className="mt-3 text-xl font-semibold leading-snug">{a.title}</h1>
        <div className="mt-4 flex items-center gap-3">
          <Avatar name={a.author.name} size={36} />
          <div className="text-sm">
            <p className="font-medium">{a.author.name}</p>
            <p className="text-ink-2">
              {ROLE[a.author.role]} · <span className="first-letter:uppercase">{dateTimeLabel(a.createdAt, { weekday: "long", day: "numeric", month: "long" })}</span>
            </p>
          </div>
        </div>
        <AnnouncementImages images={a.images} title={a.title} className="mt-5" />
        {a.body && <div className="mt-5 max-w-[65ch] whitespace-pre-line text-[15px] leading-relaxed text-ink">{a.body}</div>}
      </Card>

      {a.requiresAck && (
        <div className="mt-4">
          {ack ? (
            <p className="rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok">
              Confirmó este aviso el {dateTimeLabel(ack, { day: "numeric", month: "long" })} a las {timeLabel(ack)}.
            </p>
          ) : (
            <Card className="p-4">
              <p className="mb-3 text-sm text-ink-2">La escuela le pide confirmar que leyó este aviso.</p>
              <AckButton id={a.id} acknowledged={false} size="lg" />
            </Card>
          )}
        </div>
      )}
    </article>
  );
}
