import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { requireGuardian } from "@/lib/auth";
import { guardianAnnouncements, guardianStudents } from "@/lib/queries";
import { FamilyTabBar } from "@/components/family-nav";
import { Avatar } from "@/components/ui";
import { logout } from "@/app/login/actions";

export default async function FamilyLayout({ children }: { children: React.ReactNode }) {
  const user = await requireGuardian();
  const students = await guardianStudents(user.id);
  const anns = await guardianAnnouncements(user, students);
  const pending = anns.filter((a) => a.requiresAck && !a.reads[0]?.acknowledgedAt).length;

  return (
    <div className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-xl items-center gap-3 px-4">
          <Link href="/familia" className="flex min-w-0 items-center gap-2.5">
            <Image src="/logo-scs.png" alt="" width={32} height={32} />
            <span className="truncate text-[15px] font-semibold">San Cayetano School</span>
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <Avatar name={user.name} size={32} />
            <form action={logout}>
              <button type="submit" className="flex size-10 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-canvas hover:text-ink" aria-label="Cerrar sesión" title="Cerrar sesión">
                <LogOut className="size-[18px]" aria-hidden />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 pt-5 pb-8">{children}</main>
      <FamilyTabBar pendingCount={pending} />
    </div>
  );
}
