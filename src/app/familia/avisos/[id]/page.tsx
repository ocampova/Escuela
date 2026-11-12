import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireGuardian } from "@/lib/auth";
import { audienceFilter, audienceLabel, guardianStudents } from "@/lib/queries";
import { dateLabel, dateTimeLabel, keyToDate, timeLabel, todayKey } from "@/lib/format";
import { AckButton } from "@/components/ack-button";
import { PermissionButtons } from "@/components/permission-buttons";
import { MarkRead } from "@/components/mark-read";
import { AnnouncementImages } from "@/components/announcement-images";
import { Avatar, Badge, Card } from "@/components/ui";

import { i18n } from "@/lib/i18n-server";

const ROLE: Record<string, string> = { ADMIN: "Dirección", STAFF: "Secretaría", TEACHER: "Docente" };

export default async function FamilyAnnouncement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireGuardian();
  const { t, locale } = await i18n();
  const students = await guardianStudents(user.id);
  const a = await prisma.announcement.findFirst({
    where: { id, schoolId: user.schoolId, ...audienceFilter(students) },
    include: { author: true, level: true, section: { include: { grade: true } }, reads: { where: { userId: user.id } }, images: { select: { id: true }, orderBy: { order: "asc" } }, permissionAnswers: { include: { guardian: { select: { name: true } } } } },
  });
  if (!a) notFound();
  const ack = a.reads[0]?.acknowledgedAt;
  const kids = students.filter((s) => a.audience === "SCHOOL" || (a.audience === "LEVEL" && s.section.grade.levelId === a.levelId) || (a.audience === "SECTION" && s.sectionId === a.sectionId));
  const closed = !!a.permissionDeadline && a.permissionDeadline < keyToDate(todayKey());

  return (
    <article className="mx-auto max-w-3xl">
      <MarkRead id={a.id} />
      <Link href="/familia/avisos" className="-ml-2 inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-ink-2 hover:bg-surface hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> {t("Avisos")}
      </Link>
      <Card className="mt-3 p-5">
        <Badge>{t(audienceLabel(a))}</Badge>
        <h1 className="mt-3 text-xl font-semibold leading-snug">{a.title}</h1>
        <div className="mt-4 flex items-center gap-3">
          <Avatar name={a.author.name} size={36} />
          <div className="text-sm">
            <p className="font-medium">{a.author.name}</p>
            <p className="text-ink-2">
              {t(ROLE[a.author.role])} · <span className="first-letter:uppercase">{dateTimeLabel(a.createdAt, { weekday: "long", day: "numeric", month: "long" })}</span>
            </p>
          </div>
        </div>
        <AnnouncementImages images={a.images} title={a.title} className="mt-5" />
        {a.body && <div className="mt-5 max-w-[65ch] whitespace-pre-line text-[15px] leading-relaxed text-ink">{a.body}</div>}
      </Card>

      {a.permissionQuestion && (
        <Card className="mt-4 p-5">
          <h2 className="font-semibold">{a.permissionQuestion}</h2>
          {a.permissionDeadline && (
            <p className={`mt-1 text-sm ${closed ? "text-danger" : "text-ink-2"}`}>
              {t(closed ? "El plazo para responder venció el " : "Responder antes del ")}
              {dateLabel(a.permissionDeadline, { weekday: "long", day: "numeric", month: "long" })}.
            </p>
          )}
          <div className="mt-4 space-y-4">
            {kids.map((k) => {
              const r = a.permissionAnswers.find((x) => x.studentId === k.id);
              return (
                <div key={k.id}>
                  <p className="mb-2 text-sm font-medium">{k.firstName}</p>
                  <PermissionButtons announcementId={a.id} studentId={k.id} current={r?.answer ?? null} closed={closed} locale={locale} />
                  {r && (
                    <p className="mt-1.5 text-xs text-ink-3">
                      {t("Respondió {name} el {date} a las {time}.", { name: r.guardian.name.split(" ")[0], date: dateTimeLabel(r.respondedAt, { day: "numeric", month: "long" }), time: timeLabel(r.respondedAt) })}{" "}
                      {t(a.permissionDeadline ? "Puede cambiar su respuesta antes del plazo." : "Puede cambiar su respuesta.")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
      {a.requiresAck && !a.permissionQuestion && (
        <div className="mt-4">
          {ack ? (
            <p className="rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok">
              {t("Confirmó este aviso el {date} a las {time}.", { date: dateTimeLabel(ack, { day: "numeric", month: "long" }), time: timeLabel(ack) })}
            </p>
          ) : (
            <Card className="p-4">
              <p className="mb-3 text-sm text-ink-2">{t("La escuela le pide confirmar que leyó este aviso.")}</p>
              <AckButton id={a.id} acknowledged={false} size="lg" locale={locale} />
            </Card>
          )}
        </div>
      )}
    </article>
  );
}
