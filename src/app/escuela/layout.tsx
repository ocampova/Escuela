import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { isManager, requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StaffNav } from "@/components/staff-nav";
import { Avatar, BrandStripe } from "@/components/ui";
import { logout } from "@/app/login/actions";

const ROLE: Record<string, string> = { ADMIN: "Dirección", STAFF: "Secretaría", TEACHER: "Docente" };

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const manager = isManager(user);
  const [year, pendingReports, newApplicants] = await Promise.all([
    prisma.schoolYear.findFirst({ where: { schoolId: user.schoolId, active: true } }),
    manager ? prisma.paymentReport.count({ where: { status: "PENDING", student: { section: { schoolYear: { schoolId: user.schoolId } } } } }) : 0,
    manager ? prisma.applicant.count({ where: { schoolId: user.schoolId, status: "NEW" } }) : 0,
  ]);
  const counts = { "/escuela/cobros": pendingReports, "/escuela/matricula": newApplicants };

  const account = (
    <div className="flex items-center gap-3">
      <Avatar name={user.name} size={34} color="onBrand" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{user.name}</p>
        <p className="truncate text-xs text-white/65">{ROLE[user.role]}</p>
      </div>
      <form action={logout}>
        <button type="submit" aria-label="Cerrar sesión" title="Cerrar sesión" className="flex size-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white">
          <LogOut className="size-[18px]" aria-hidden />
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Barra lateral (computadora) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-brand px-3 pb-4 lg:flex">
        <BrandStripe className="-mx-3 mb-4" />
        <Link href="/escuela" className="mb-6 flex items-center gap-2.5 px-2">
          <Image src="/logo-scs.png" alt="" width={36} height={36} className="rounded-full bg-white" />
          <span className="leading-tight">
            <span className="block text-[15px] font-semibold text-white">San Cayetano</span>
            <span className="block text-xs text-white/65">{year?.name ?? "Escuela"}</span>
          </span>
        </Link>
        <StaffNav manager={manager} variant="rail" counts={counts} />
        <div className="mt-auto border-t border-white/10 px-2 pt-4">{account}</div>
      </aside>

      {/* Encabezado (celular y tableta) */}
      <header className="sticky top-0 z-30 bg-brand pt-[env(safe-area-inset-top)] lg:hidden">
        <div className="flex h-14 items-center gap-3 px-4">
          <Image src="/logo-scs.png" alt="" width={30} height={30} className="rounded-full bg-white" />
          <span className="text-[15px] font-semibold text-white">San Cayetano</span>
          <form action={logout} className="ml-auto">
            <button type="submit" aria-label="Cerrar sesión" className="flex size-10 items-center justify-center rounded-lg text-white/75 hover:bg-white/10">
              <LogOut className="size-[18px]" aria-hidden />
            </button>
          </form>
        </div>
        <StaffNav manager={manager} variant="bar" counts={counts} />
        <BrandStripe />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
    </div>
  );
}
