import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Camera, Info, LogOut } from "lucide-react";
import { requireGuardian } from "@/lib/auth";
import { guardianAnnouncements, guardianStudents, isPending } from "@/lib/queries";
import { FamilyTabBar, FamilyTopNav } from "@/components/family-nav";
import { unreadConversations } from "@/lib/messages";
import { Avatar, BrandStripe } from "@/components/ui";
import { logout } from "@/app/login/actions";
import { i18n } from "@/lib/i18n-server";

export default async function FamilyLayout({ children }: { children: React.ReactNode }) {
  const user = await requireGuardian();
  if (!user.privacyAcceptedAt) redirect("/bienvenida");
  const { t, locale } = await i18n();
  const students = await guardianStudents(user.id);
  const anns = await guardianAnnouncements(user, students);
  const pending = anns.filter((a) => isPending(a, students)).length;
  const messaging = user.school.messagingEnabled;
  const unreadMessages = messaging ? await unreadConversations(user) : 0;

  return (
    <div className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-20 bg-brand pt-[env(safe-area-inset-top)] print:hidden">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 md:h-16 md:gap-6 md:px-6 lg:px-8">
          <Link href="/familia" className="flex min-w-0 items-center gap-2.5">
            <Image src="/logo-scs.png" alt="" width={34} height={34} className="rounded-full bg-white ring-2 ring-white/20" />
            <span className="truncate text-[15px] font-semibold text-white md:hidden lg:inline">San Cayetano School</span>
          </Link>
          <FamilyTopNav pendingCount={pending} unreadMessages={unreadMessages} messaging={messaging} locale={locale} />
          <div className="ml-auto flex items-center gap-1">
            <Link href="/familia/fotos" aria-label={t("Fotos")} title={t("Fotos")} className="flex size-10 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white">
              <Camera className="size-5" aria-hidden />
            </Link>
            <Link href="/familia/escuela" aria-label={t("Información de la escuela")} title={t("Información de la escuela")} className="flex size-10 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white">
              <Info className="size-5" aria-hidden />
            </Link>
            <Link href="/familia/perfil" aria-label={t("Mi perfil")} title={t("Mi perfil")} className="rounded-full transition-[box-shadow] hover:ring-2 hover:ring-white/40">
              <Avatar name={user.name} size={32} color="onBrand" />
            </Link>
            <form action={logout}>
              <button type="submit" className="flex size-10 items-center justify-center rounded-lg text-white/75 transition-colors hover:bg-white/10 hover:text-white" aria-label={t("Cerrar sesión")} title={t("Cerrar sesión")}>
                <LogOut className="size-[18px]" aria-hidden />
              </button>
            </form>
          </div>
        </div>
        <BrandStripe />
      </header>
      <main className="mx-auto max-w-xl px-4 pt-5 pb-8 md:max-w-6xl md:px-6 md:pt-8 md:pb-16 lg:px-8">{children}</main>
      <FamilyTabBar pendingCount={pending} unreadMessages={unreadMessages} messaging={messaging} locale={locale} />
    </div>
  );
}
