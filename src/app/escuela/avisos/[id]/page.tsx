import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { isManager, requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { announcementRecipients, audienceLabel, staffSections } from "@/lib/queries";
import { dateTimeLabel, timeLabel } from "@/lib/format";
import { Avatar, Badge, Card, SectionHeading } from "@/components/ui";
import { ReadMeter } from "@/components/read-meter";
import { ShareWhatsApp } from "@/components/share-whatsapp";
import { AnnouncementImages } from "@/components/announcement-images";

export default async function StaffAnnouncement({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ enviado?: string }> }) {
  const { id } = await params;
  const { enviado } = await searchParams;
  const user = await requireStaff();
  const sections = await staffSections(user);
  const a = await prisma.announcement.findFirst({
    where: { id, schoolId: user.schoolId, ...(isManager(user) ? {} : { OR: [{ sectionId: { in: sections.map((s) => s.id) } }, { authorId: user.id }] }) },
    include: { author: true, level: true, section: { include: { grade: true } }, reads: true, images: { select: { id: true }, orderBy: { order: "asc" } } },
  });
  if (!a) notFound();
  const recipients = await announcementRecipients(a);
  const readMap = new Map(a.reads.map((r) => [r.userId, r]));
  const rows = recipients.map((r) => ({ ...r, read: readMap.get(r.id) }));
  const acked = rows.filter((r) => r.read?.acknowledgedAt);
  const pending = rows.filter((r) => !r.read?.acknowledgedAt);

  return (
    <div>
      <Link href="/escuela/avisos" className="-ml-2 inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-ink-2 hover:bg-surface hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Avisos
      </Link>
      {enviado && (
        <div role="status" className="ack-in mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-ok-soft px-4 py-3">
          <p className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium text-ok">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden /> Aviso publicado para {recipients.length} familias. Compártalo en el grupo de WhatsApp para que lo lean y confirmen.
          </p>
          <ShareWhatsApp title={a.title} body={a.body} path={`/familia/avisos/${a.id}`} label="Compartir en el grupo" />
        </div>
      )}
      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="h-fit p-5 sm:p-6">
          <Badge tone="brand">{audienceLabel(a)}</Badge>
          <h1 className="mt-3 text-xl font-semibold">{a.title}</h1>
          <p className="mt-1 text-sm text-ink-2">
            {a.author.name} · <span className="first-letter:uppercase">{dateTimeLabel(a.createdAt, { weekday: "long", day: "numeric", month: "long" })}</span> a las {timeLabel(a.createdAt)}
          </p>
          <AnnouncementImages images={a.images} title={a.title} className="mt-5" />
          {a.body && <div className="mt-5 max-w-[65ch] whitespace-pre-line text-[15px] leading-relaxed">{a.body}</div>}
        </Card>

        <div className="space-y-6">
          {!enviado && (
            <Card className="p-4">
              <p className="mb-1 text-sm font-medium">Grupo de WhatsApp</p>
              <p className="mb-3 text-sm text-ink-2">Comparta el aviso con un enlace: las familias lo abren, lo leen y tocan «Enterado».</p>
              <ShareWhatsApp title={a.title} body={a.body} path={`/familia/avisos/${a.id}`} size="sm" />
            </Card>
          )}
          {a.requiresAck ? (
            <>
              <Card className="p-4">
                <p className="mb-2 text-sm font-medium">Confirmación</p>
                <ReadMeter done={acked.length} total={rows.length} />
              </Card>
              <section>
                <SectionHeading
                  title={`Sin confirmar (${pending.length})`}
                  action={
                    pending.length > 0 ? (
                      <ShareWhatsApp
                        title={`Recordatorio: ${a.title}`}
                        body={`Todavía faltan ${pending.length} ${pending.length === 1 ? "familia" : "familias"} de confirmar este aviso. Por favor léanlo y toquen «Enterado».`}
                        path={`/familia/avisos/${a.id}`}
                        size="sm"
                        label="Recordar en el grupo"
                      />
                    ) : undefined
                  }
                />
                <Card className="divide-y divide-line">
                  {pending.length === 0 && <p className="px-4 py-3 text-sm text-ok">Todas las familias confirmaron.</p>}
                  {pending.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                      <Avatar name={r.name} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.name}</p>
                        <p className="truncate text-xs text-ink-2">
                          {r.guardianOf.map((g) => g.student.firstName).join(", ")}
                          {r.read ? " · Lo abrió, falta confirmar" : " · No lo ha abierto"}
                        </p>
                      </div>
                      {r.phone && <span className="tabular text-xs text-ink-2">{r.phone}</span>}
                    </div>
                  ))}
                </Card>
              </section>
              <section>
                <SectionHeading title={`Confirmaron (${acked.length})`} />
                <Card className="divide-y divide-line">
                  {acked.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                      <CheckCircle2 className="size-4 shrink-0 text-ok" aria-hidden />
                      <p className="min-w-0 flex-1 truncate text-sm">{r.name}</p>
                      <span className="text-xs text-ink-3">{dateTimeLabel(r.read!.acknowledgedAt!, { day: "numeric", month: "short" })}</span>
                    </div>
                  ))}
                  {acked.length === 0 && <p className="px-4 py-3 text-sm text-ink-2">Nadie ha confirmado todavía.</p>}
                </Card>
              </section>
            </>
          ) : (
            <Card className="p-4 text-sm text-ink-2">Este aviso es solo informativo y no pide confirmación. Llegó a {rows.length} familias.</Card>
          )}
        </div>
      </div>
    </div>
  );
}
