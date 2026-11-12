import Link from "next/link";
import type { Metadata } from "next";
import { Camera } from "lucide-react";
import { requireGuardian } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { guardianStudents } from "@/lib/queries";
import { dateLabel, gradeSectionName } from "@/lib/format";
import { Card, EmptyState, SectionChip } from "@/components/ui";

export const metadata: Metadata = { title: "Fotos" };

export default async function FamilyPhotos() {
  const user = await requireGuardian();
  const students = await guardianStudents(user.id);
  const albums = await prisma.album.findMany({
    where: { sectionId: { in: students.map((s) => s.sectionId) } },
    include: { section: { include: { grade: true } }, photos: { select: { id: true }, orderBy: { order: "asc" } } },
    orderBy: [{ day: "desc" }, { createdAt: "desc" }],
    take: 60,
  });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold">Fotos</h1>
      <p className="mt-1 text-sm text-ink-2">Álbumes privados de la sección de sus hijos. Solo los ven las familias del grupo.</p>
      {albums.length === 0 ? (
        <Card className="mt-5">
          <EmptyState icon={<Camera className="size-5" />} title="Todavía no hay fotos">
            Cuando la docente comparta fotos de una actividad, aparecerán aquí.
          </EmptyState>
        </Card>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {albums.map((a) => (
            <li key={a.id}>
              <Link href={`/familia/fotos/${a.id}`} className="group block overflow-hidden rounded-xl bg-surface ring-1 ring-line transition-shadow hover:shadow-md">
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
                  {students.length > 1 && <SectionChip color={a.section.color} label={gradeSectionName(a.section)} className="mt-2" />}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
