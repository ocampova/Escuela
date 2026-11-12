import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Download } from "lucide-react";
import { requireGuardian } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { capitalize, dateLabel, gradeSectionName } from "@/lib/format";
import { SectionChip } from "@/components/ui";

import { i18n } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await i18n();
  return { title: t("Álbum") };
}

export default async function FamilyAlbum({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireGuardian();
  const { t } = await i18n();
  const album = await prisma.album.findFirst({
    where: { id, section: { students: { some: { guardians: { some: { userId: user.id } } } } } },
    include: { section: { include: { grade: true } }, photos: { select: { id: true }, orderBy: { order: "asc" } } },
  });
  if (!album) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/familia/fotos" className="-ml-2 mb-3 inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-ink-2 hover:bg-canvas hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> {t("Fotos")}
      </Link>
      <h1 className="text-2xl font-semibold">{album.title}</h1>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-2">
        <SectionChip color={album.section.color} label={gradeSectionName(album.section)} />
        {capitalize(dateLabel(album.day, { weekday: "long", day: "numeric", month: "long" }))}
      </p>
      <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {album.photos.map((p, i) => (
          <li key={p.id} className="group relative aspect-square overflow-hidden rounded-xl bg-canvas">
            <a href={`/fotos/${p.id}`} target="_blank" rel="noreferrer" aria-label={t("Abrir foto {n}", { n: i + 1 })}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/fotos/${p.id}`} alt="" loading="lazy" className="size-full object-cover" />
            </a>
            <a
              href={`/fotos/${p.id}`}
              download={`${album.title}-${i + 1}.jpg`}
              aria-label={t("Descargar foto {n}", { n: i + 1 })}
              className="absolute right-2 bottom-2 grid size-9 place-items-center rounded-full bg-ink/65 text-white backdrop-blur-sm hover:bg-ink/80"
            >
              <Download className="size-4" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-ink-3">{t("Estas fotos son para uso de su familia. Por respeto a los demás niños, no las publique en redes sociales.")}</p>
    </div>
  );
}
