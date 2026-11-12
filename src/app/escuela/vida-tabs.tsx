import { Camera, DoorOpen, NotebookPen } from "lucide-react";
import { SubTabs } from "@/components/sub-tabs";

const TABS = [
  { href: "/escuela/diario", label: "Reporte diario", icon: NotebookPen },
  { href: "/escuela/fotos", label: "Fotos", icon: Camera },
  { href: "/escuela/salida", label: "Salida", icon: DoorOpen },
];

/** Pestañas de Vida diaria. */
export function VidaTabs({ active }: { active: string }) {
  return <SubTabs tabs={TABS} active={active} label="Vida diaria" />;
}
