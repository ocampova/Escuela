import Link from "next/link";
import type { Metadata } from "next";
import { Camera, Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { staffSections } from "@/lib/queries";
import { dateLabel, gradeSectionName } from "@/lib/format";
import { ButtonLink, Card, EmptyState, PageHeader, SectionChip } from "@/components/ui";
import { SectionPicker } from "@/components/section-picker";
import { VidaTabs } from "../vida-tabs";

export const metadata: Metadata = { title: "Fotos" };

export default async function PhotosPage({ searchParams }: { searchParams: Promise<{ seccion?: string }> }) {
  const user = await requireStaff();
  const sp = await searchParams;
  const sections = await staffSections(user);
  const section = sections.find((s) => s.id === sp.seccion);
  const albums = await prisma.album.findMany({
    where: { sectionId: section ? section.id : { in: sections.map((s) => s.id) } },
    include: { section: { include: { grade: true } }, photos: { select: { id: true }, orderBy: { order: "asc" } } },
    orderBy: [{ day: "desc" }, { createdAt: "desc" }],
    take: 60,
  });

  return (
    <div>
      <PageHeader
        title="Vida diaria"
        description="Lo que pasa en el aula, para que la familia lo sepa el mismo día."
        actions={
          <ButtonLink href={`/escuela/fotos/nuevo${section ? `?seccion=${section.id}` : ""}`}>
            <Plus className="size-4" aria-hidden /> Subir fotos
          </ButtonLink>
        }
      />
      <VidaTabs active="/escuela/fotos" />
      <p className="mb-4 max-w-2xl text-sm text-ink-2">
        Álbumes privados por sección: solo los ven las familias de ese grupo, con su usuario. Nada queda público en redes ni en el grupo de WhatsApp.
      </p>
      {sections.length > 1 && (
        <div className="mb-5">
          <SectionPicker sections={sections} current={section?.id} href={(id) => (id === section?.id ? "/escuela/fotos" : `/escuela/fotos?seccion=${id}`)} />
        </div>
      )}
      {albums.length === 0 ? (
        <Card>
          <EmptyState icon={<Camera className="size-5" />} title="Todavía no hay álbumes">
            Suba las fotos de una actividad y las familias de la sección reciben una notificación.
          </EmptyState>
        </Card>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {albums.map((a) => (
            <li key={a.id}>
              <Link href={`/escuela/fotos/${a.id}`} className="group block overflow-hidden rounded-xl bg-surface ring-1 ring-line transition-shadow hover:shadow-md">
                <div className="aspect-[4/3] overflow-hidden bg-canvas">
                  {a.photos[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/fotos/${a.photos[0].id}`} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="mt-0.5 text-xs text-ink-2">
                    {dateLabel(a.day, { day: "numeric", month: "short" })} · {a.photos.length} {a.photos.length === 1 ? "foto" : "fotos"}
                  </p>
                  <SectionChip color={a.section.color} label={gradeSectionName(a.section)} className="mt-2" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
