import Link from "next/link";
import type { Metadata } from "next";
import { Bell, ChevronRight } from "lucide-react";
import { requireGuardian } from "@/lib/auth";
import { audienceLabel, guardianAnnouncements, guardianStudents, isPending } from "@/lib/queries";
import { relativeDay } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui";
import { AnnouncementThumb } from "@/components/announcement-images";

import { i18n } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await i18n();
  return { title: t("Avisos") };
}

export default async function FamilyAnnouncements() {
  const user = await requireGuardian();
  const { t } = await i18n();
  const students = await guardianStudents(user.id);
  const anns = await guardianAnnouncements(user, students);
  const pending = anns.filter((a) => isPending(a, students)).length;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">{t("Avisos")}</h1>
      <p className="mt-1 text-sm text-ink-2">
        {pending > 0 ? t(pending === 1 ? "{n} aviso espera su confirmación." : "{n} avisos esperan su confirmación.", { n: pending }) : t("Ha confirmado todos los avisos.")}
      </p>
      <Card className="mt-5 divide-y divide-line">
        {anns.length === 0 && (
          <EmptyState icon={<Bell className="size-5" />} title={t("Todavía no hay avisos")}>
            {t("Aquí aparecerán las circulares de la escuela y de la docente de su hijo.")}
          </EmptyState>
        )}
        {anns.map((a) => {
          const read = a.reads[0];
          const needsAck = isPending(a, students);
          return (
            <Link key={a.id} href={`/familia/avisos/${a.id}`} className="flex gap-3 p-4 transition-colors hover:bg-canvas">
              <span aria-hidden className={`mt-2 size-2 shrink-0 rounded-full ${!read ? "bg-scs-blue" : "bg-transparent"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={`min-w-0 ${!read ? "font-semibold" : "font-medium"}`}>{a.title}</p>
                  <span className="shrink-0 pt-0.5 text-xs text-ink-3">{relativeDay(a.createdAt)}</span>
                </div>
                {a.body ? <p className="mt-1 line-clamp-2 text-sm text-ink-2">{a.body}</p> : a.images[0] ? <p className="mt-1 text-sm text-ink-2">{t("Aviso con imagen")}</p> : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge>{t(audienceLabel(a))}</Badge>
                  {needsAck ? <Badge tone="warn">{t(a.permissionQuestion ? "Falta autorizar" : "Falta confirmar")}</Badge> : a.requiresAck ? <Badge tone="ok">{t(a.permissionQuestion ? "Respondido" : "Enterado")}</Badge> : null}
                </div>
              </div>
              {a.images[0] && <AnnouncementThumb id={a.images[0].id} className="self-center" />}
              <ChevronRight className="mt-0.5 size-5 shrink-0 self-center text-ink-3" aria-hidden />
            </Link>
          );
        })}
      </Card>
    </div>
  );
}
