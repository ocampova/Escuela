"use client";

import { useTransition } from "react";
import { setUserActive } from "./actions";
import { buttonClass } from "@/components/ui";

export function ActiveToggle({ userId, active }: { userId: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (active && !confirm("¿Desactivar esta cuenta? La persona ya no podrá entrar.")) return;
        start(() => setUserActive(userId, !active));
      }}
      className={buttonClass("ghost", "sm")}
    >
      {active ? "Desactivar" : "Reactivar"}
    </button>
  );
}
