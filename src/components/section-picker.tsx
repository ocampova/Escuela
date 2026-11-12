import Link from "next/link";
import { gradeSectionName } from "@/lib/format";
import { cx, sectionSolid } from "./ui";

type S = { id: string; name: string; color: string; grade: { name: string } };

/** Fila de secciones como pestañas (asistencia, diario, fotos, notas). */
export function SectionPicker({ sections, current, href }: { sections: S[]; current?: string; href: (id: string) => string }) {
  return (
    <nav aria-label="Secciones" className="flex flex-wrap gap-1.5">
      {sections.map((s) => (
        <Link
          key={s.id}
          href={href(s.id)}
          aria-current={s.id === current ? "page" : undefined}
          className={cx(
            "inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium ring-1 ring-inset transition-colors",
            s.id === current ? `${sectionSolid[s.color] ?? "bg-brand ring-brand"} text-white` : "bg-surface text-ink-2 ring-line-strong hover:bg-canvas",
          )}
        >
          {s.id !== current && <span aria-hidden className={cx("mr-2 size-2 rounded-full", sectionSolid[s.color]?.split(" ")[0])} />}
          {gradeSectionName(s)}
        </Link>
      ))}
    </nav>
  );
}
