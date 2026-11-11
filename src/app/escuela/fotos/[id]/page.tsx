import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, CheckCircle2, Trash2 } from "lucide-react";
import { isManager, requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { capitalize, dateLabel, gradeSectionName } from "@/lib/format";
import { buttonClass, SectionChip } from "@/components/ui";
import { ShareWhatsApp } from "@/components/share-whatsapp";
import { deleteAlbum, deletePhoto } from "../../vida-actions";

export const metadata: Metadata = { title: "Álbum" };

export default async function StaffAlbum({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nuevo?: string }> }) {
  const { id } = await params;
  const { nuevo } = await searchParams;
  const user = await requireStaff();
  const album = await prisma.album.findFirst({
    where: { id, section: { schoolYear: { schoolId: user.schoolId }, ...(isManager(user) ? {} : { teacherId: user.id }) } },
    include: { section: { include: { grade: true } }, author: { select: { name: true } }, photos: { select: { id: true }, orderBy: { order: "asc" } } },
  });
  if (!album) notFound();

  return (
    <div>
      <Link href="/escuela/fotos" className="-ml-2 mb-3 inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-ink-2 hover:bg-canvas hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Fotos
      </Link>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{album.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-2">
            <SectionChip color={album.section.color} label={gradeSectionName(album.section)} />
            {capitalize(dateLabel(album.day, { weekday: "long", day: "numeric", month: "long" }))} · {album.photos.length} fotos · {album.author.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ShareWhatsApp
            title={`📷 ${album.title}`}
            body={`${album.photos.length} fotos nuevas de ${gradeSectionName(album.section)}.`}
            path={`/familia/fotos/${album.id}`}
            cta="Véalas en la plataforma (solo para las familias del grupo):"
            label="Avisar en el grupo"
          />
          <form action={deleteAlbum.bind(null, album.id)}>
            <button className={buttonClass("ghost")} aria-label="Eliminar álbum">
              <Trash2 className="size-4" aria-hidden /> Eliminar
            </button>
          </form>
        </div>
      </div>
      {nuevo && (
        <p role="status" className="ack-in mb-5 flex items-center gap-2 rounded-xl bg-ok-soft px-4 py-3 text-sm font-medium text-ok">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden /> Publicado. Las familias de la sección recibieron una notificación.
        </p>
      )}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {album.photos.map((p) => (
          <li key={p.id} className="group relative aspect-square overflow-hidden rounded-xl bg-canvas">
            <a href={`/fotos/${p.id}`} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/fotos/${p.id}`} alt="" loading="lazy" className="size-full object-cover" />
            </a>
            <form action={deletePhoto.bind(null, p.id)} className="absolute top-2 right-2">
              <button aria-label="Quitar esta foto" className="grid size-8 place-items-center rounded-full bg-ink/70 text-white opacity-90 hover:bg-danger">
                <Trash2 className="size-4" aria-hidden />
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
