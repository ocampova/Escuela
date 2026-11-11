import Image from "next/image";
import Link from "next/link";
import { Info, LogOut } from "lucide-react";
import { requireGuardian } from "@/lib/auth";
import { guardianAnnouncements, guardianStudents } from "@/lib/queries";
import { FamilyTabBar } from "@/components/family-nav";
import { Avatar, BrandStripe } from "@/components/ui";
import { logout } from "@/app/login/actions";

export default async function FamilyLayout({ children }: { children: React.ReactNode }) {
  const user = await requireGuardian();
  const students = await guardianStudents(user.id);
  const anns = await guardianAnnouncements(user, students);
  const pending = anns.filter((a) => a.requiresAck && !a.reads[0]?.acknowledgedAt).length;

  return (
    <div className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 bg-brand pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-xl items-center gap-3 px-4">
          <Link href="/familia" className="flex min-w-0 items-center gap-2.5">
            <Image src="/logo-scs.png" alt="" width={34} height={34} className="rounded-full bg-white ring-2 ring-white/20" />
            <span className="truncate text-[15px] font-semibold text-white">San Cayetano School</span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <Link href="/familia/escuela" aria-label="Información de la escuela" title="Información de la escuela" className="flex size-10 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white">
              <Info className="size-5" aria-hidden />
            </Link>
            <Avatar name={user.name} size={32} color="onBrand" />
            <form action={logout}>
              <button type="submit" className="flex size-10 items-center justify-center rounded-lg text-white/75 transition-colors hover:bg-white/10 hover:text-white" aria-label="Cerrar sesión" title="Cerrar sesión">
                <LogOut className="size-[18px]" aria-hidden />
              </button>
            </form>
          </div>
        </div>
        <BrandStripe />
      </header>
      <main className="mx-auto max-w-xl px-4 pt-5 pb-8">{children}</main>
      <FamilyTabBar pendingCount={pending} />
    </div>
  );
}
