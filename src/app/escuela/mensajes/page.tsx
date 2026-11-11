import Link from "next/link";
import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { conversationScope } from "@/lib/messages";
import { gradeSectionName, relativeDay } from "@/lib/format";
import { Avatar, Badge, Card, EmptyState, PageHeader, cx } from "@/components/ui";

export const metadata: Metadata = { title: "Mensajes" };

export default async function StaffMessages({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const user = await requireStaff();
  const { filtro } = await searchParams;
  const convs = await prisma.conversation.findMany({
    where: { ...conversationScope(user), ...(filtro === "docentes" ? { channel: "TEACHER" } : filtro === "oficina" ? { channel: "OFFICE" } : {}) },
    include: {
      student: { include: { section: { include: { grade: true } } } },
      guardian: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { name: true } } } },
      reads: { where: { userId: user.id } },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
  });
  const rows = convs.map((c) => {
    const last = c.messages[0];
    const unread = !!last && last.senderId !== user.id && last.senderId === c.guardianId && (!c.reads[0] || c.reads[0].lastReadAt < c.lastMessageAt);
    return { c, last, unread };
  });
  const shown = filtro === "sin-leer" ? rows.filter((r) => r.unread) : rows;
  const tabs = [
    { key: undefined, label: "Todas" },
    { key: "sin-leer", label: "Sin leer", n: rows.filter((r) => r.unread).length },
    ...(user.role === "ADMIN" ? [{ key: "docentes", label: "Docentes" }, { key: "oficina", label: "Oficina" }] : []),
  ];

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Mensajes"
        description={
          user.role === "TEACHER"
            ? "Conversaciones con las familias de sus secciones."
            : user.role === "STAFF"
              ? "Consultas que las familias envían a la oficina."
              : "Todas las conversaciones con las familias: docentes y oficina."
        }
      />
      <nav aria-label="Filtro" className="mb-3 flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={t.key ? `/escuela/mensajes?filtro=${t.key}` : "/escuela/mensajes"}
            aria-current={filtro === t.key ? "page" : undefined}
            className={cx(
              "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium ring-1 ring-inset transition-colors",
              filtro === t.key ? "bg-brand text-white ring-brand" : "bg-surface text-ink-2 ring-line-strong hover:bg-canvas",
            )}
          >
            {t.label}
            {"n" in t && t.n !== undefined && <span className={cx("tabular text-xs", filtro === t.key ? "text-white/75" : "text-ink-3")}>{t.n}</span>}
          </Link>
        ))}
      </nav>
      <Card className="divide-y divide-line">
        {shown.length === 0 && (
          <EmptyState icon={<MessageCircle className="size-5" />} title={filtro === "sin-leer" ? "Está al día" : "Todavía no hay conversaciones"}>
            Las familias escriben desde su app. También puede iniciar una conversación desde la ficha de cada alumno.
          </EmptyState>
        )}
        {shown.map(({ c, last, unread }) => (
          <Link key={c.id} href={`/escuela/mensajes/${c.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-canvas">
            <Avatar name={`${c.student.firstName} ${c.student.lastName}`} color={c.student.section.color} size={42} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className={cx("truncate", unread ? "font-semibold" : "font-medium")}>
                  {c.guardian.name} <span className="font-normal text-ink-2">· {c.student.firstName} ({gradeSectionName(c.student.section)})</span>
                </p>
                {last && <span className="shrink-0 text-xs text-ink-3">{relativeDay(last.createdAt)}</span>}
              </div>
              <p className={cx("truncate text-sm", unread ? "font-medium text-ink" : "text-ink-2")}>
                {last ? `${last.senderId === user.id ? "Usted" : last.sender.name.split(" ")[0]}: ${last.body}` : "Sin mensajes"}
              </p>
            </div>
            {user.role === "ADMIN" && <Badge className="hidden sm:inline-flex">{c.channel === "TEACHER" ? "Docente" : "Oficina"}</Badge>}
            {unread && <span className="size-2.5 shrink-0 rounded-full bg-scs-blue" aria-label="Sin leer" />}
          </Link>
        ))}
      </Card>
    </div>
  );
}
