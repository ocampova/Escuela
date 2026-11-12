import { BookOpenCheck, ClipboardList } from "lucide-react";
import { SubTabs } from "@/components/sub-tabs";

const TABS = [
  { href: "/escuela/academico", label: "Notas e informes", icon: BookOpenCheck },
  { href: "/escuela/tareas", label: "Tareas", icon: ClipboardList },
];

export function AcademicoTabs({ active }: { active: string }) {
  return <SubTabs tabs={TABS} active={active} label="Académico" />;
}
