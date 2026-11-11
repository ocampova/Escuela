"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { removeGuardian, removePickup } from "./actions";

export function RemoveButton({ kind, studentId, id, label }: { kind: "guardian" | "pickup"; studentId: string; id: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Quitar a ${label}`}
      title="Quitar"
      onClick={() => {
        if (!confirm(`¿Quitar a ${label}?`)) return;
        start(() => (kind === "guardian" ? removeGuardian(studentId, id) : removePickup(id)));
      }}
      className="flex size-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
    >
      <X className="size-4" aria-hidden />
    </button>
  );
}
