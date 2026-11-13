import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExternalLink, Inbox, Paperclip } from "lucide-react";
import type { ApplicantStatus } from "@prisma/client";
import { isManager, requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { relativeDay } from "@/lib/format";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, cx } from "@/components/ui";
import { STATUS } from "./status";

export const metadata: Metadata = { title: "Matrícula" };

const FILTERS: { key?: string; label: string; statuses?: ApplicantStatus[] }[] = [
  { label: "Por atender", statuses: ["NEW", "CONTACTED", "VISIT", "ACCEPTED"] },
  { key: "nuevas", label: "Nuevas", statuses: ["NEW"] },
  { key: "matriculadas", label: "Matriculadas", statuses: ["ENROLLED"] },
  { key: "todas", label: "Todas" },
];

export default async function EnrollmentPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const user = await requireStaff();
  if (!isManager(user)) redirect("/escuela");
  const { filtro } = await searchParams;
  const current = FILTERS.find((f) => f.key === filtro) ?? FILTERS[0];
  const [applicants, counts] = await Promise.all([
    prisma.applicant.findMany({
      where: { schoolId: user.schoolId, ...(current.statuses ? { status: { in: current.statuses } } : {}) },
      include: { grade: true, _count: { select: { documents: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.applicant.groupBy({ by: ["status"], where: { schoolId: user.schoolId }, _count: true }),
  ]);
  const n = (sts?: ApplicantStatus[]) => counts.filter((c) => !sts || sts.includes(c.status)).reduce((a, c) => a + c._count, 0);

  return (
    <div>
      <PageHeader
        title="Matrícula"
        description="Solicitudes que llegan desde el formulario público de matrícula."
        actions={
          <ButtonLink href="/matricula" target="_blank" variant="secondary">
            <ExternalLink className="size-4" aria-hidden /> Ver formulario público
          </ButtonLink>
        }
      />
      <nav aria-label="Filtro" className="mb-3 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f.label}
            href={f.key ? `/escuela/matricula?filtro=${f.key}` : "/escuela/matricula"}
            aria-current={current === f ? "page" : undefined}
            className={cx(
              "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium ring-1 ring-inset transition-colors",
              current === f ? "bg-brand text-white ring-brand" : "bg-surface text-ink-2 ring-line-strong hover:bg-canvas",
            )}
          >
            {f.label}
            <span className={cx("tabular text-xs", current === f ? "text-white/75" : "text-ink-3")}>{n(f.statuses)}</span>
          </Link>
        ))}
      </nav>
      <Card className="divide-y divide-line">
        {applicants.length === 0 && (
          <EmptyState icon={<Inbox className="size-5" />} title="No hay solicitudes aquí">
            Comparta el enlace del formulario de matrícula en Facebook o WhatsApp; cada solicitud llegará a esta bandeja.
          </EmptyState>
        )}
        {applicants.map((a) => (
          <Link key={a.id} href={`/escuela/matricula/${a.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5 transition-colors hover:bg-canvas">
            <div className="min-w-0 flex-1 basis-48">
              <p className="font-medium break-words">
                {a.childFirstName} {a.childLastName}
              </p>
              <p className="truncate text-sm text-ink-2">
                {a.grade?.name ?? "Grado sin definir"} {a.forYear} · {a.guardianName} · {a.guardianPhone}
              </p>
            </div>
            {a._count.documents > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-ink-3">
                <Paperclip className="size-3.5" aria-hidden /> {a._count.documents}
              </span>
            )}
            <span className="w-16 text-right text-xs text-ink-3">{relativeDay(a.createdAt)}</span>
            <Badge tone={STATUS[a.status].tone}>{STATUS[a.status].label}</Badge>
          </Link>
        ))}
      </Card>
    </div>
  );
}
