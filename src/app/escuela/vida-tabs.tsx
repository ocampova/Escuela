import { Camera, NotebookPen } from "lucide-react";
import { SubTabs } from "@/components/sub-tabs";

const TABS = [
  { href: "/escuela/diario", label: "Reporte diario", icon: NotebookPen },
  { href: "/escuela/fotos", label: "Fotos", icon: Camera },
];

/** Pestañas de Vida diaria. */
export function VidaTabs({ active }: { active: string }) {
  return <SubTabs tabs={TABS} active={active} label="Vida diaria" />;
}
