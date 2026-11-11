"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Download, Upload } from "lucide-react";
import { previewImport, type Preview } from "./parse";
import { importStudents } from "../actions";
import { Badge, Button, ButtonLink, Card, cx } from "@/components/ui";

export function ImportWizard() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<{ created: number; linked: number; error?: string } | null>(null);
  const [fileName, setFileName] = useState("");
  const [pending, start] = useTransition();

  if (result && !result.error) {
    return (
      <Card className="ack-in p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-ok" aria-hidden />
        <p className="mt-3 text-lg font-semibold">Se importaron {result.created} alumnos</p>
        <p className="mt-1 text-sm text-ink-2">
          {result.linked > 0 && `${result.linked} encargados ya tenían cuenta y quedaron vinculados. `}Ahora puede invitar a las familias desde la ficha de cada alumno.
        </p>
        <ButtonLink href="/escuela/alumnos" className="mt-5">Ver alumnos</ButtonLink>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <ol className="space-y-4 text-sm">
          <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">1</span>
            <div>
              <p className="font-medium">Descargue la plantilla y llénela en Excel</p>
              <p className="text-ink-2">Una fila por alumno. Grado y sección deben coincidir con los de Configuración (ej.: «Preparatoria» y «A»).</p>
              <Link href="/escuela/alumnos/importar/plantilla" prefetch={false} className="mt-2 inline-flex items-center gap-1.5 font-medium text-brand hover:underline">
                <Download className="size-4" aria-hidden /> Descargar plantilla
              </Link>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">2</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">Suba el archivo (.xlsx o .csv)</p>
              <p className="text-ink-2">Primero le mostramos una vista previa; no se guarda nada hasta que confirme.</p>
              <form
                className="mt-3 flex flex-wrap items-center gap-3"
                action={(fd) =>
                  start(async () => {
                    setResult(null);
                    setPreview(await previewImport(fd));
                  })
                }
              >
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm font-medium ring-1 ring-inset ring-line-strong hover:bg-canvas">
                  <Upload className="size-4" aria-hidden />
                  {fileName || "Elegir archivo"}
                  <input
                    type="file"
                    name="file"
                    accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    required
                    className="sr-only"
                    onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
                  />
                </label>
                <Button type="submit" variant="secondary" disabled={pending || !fileName}>
                  {pending && !preview ? "Leyendo…" : "Ver vista previa"}
                </Button>
              </form>
            </div>
          </li>
        </ol>
      </Card>

      {preview?.error && <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{preview.error}</p>}

      {preview && !preview.error && (
        <section className="space-y-4">
          {preview.errors.length > 0 && (
            <Card className="p-4">
              <p className="flex items-center gap-2 font-medium text-danger">
                <AlertTriangle className="size-4" aria-hidden /> {preview.errors.length} {preview.errors.length === 1 ? "fila tiene" : "filas tienen"} errores y no se importarán
              </p>
              <ul className="mt-2 space-y-1 text-sm text-ink-2">
                {preview.errors.map((e) => (
                  <li key={e.line}>
                    <span className="tabular font-medium text-ink">Fila {e.line}:</span> {e.message}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-ink-3">Corrija el archivo y vuelva a subirlo, o importe solo las filas correctas.</p>
            </Card>
          )}
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-canvas text-left text-xs text-ink-2">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Fila</th>
                  <th className="px-4 py-2.5 font-medium">Alumno</th>
                  <th className="px-4 py-2.5 font-medium">Sección</th>
                  <th className="px-4 py-2.5 font-medium">Encargado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {preview.rows.map((r) => (
                  <tr key={r.line}>
                    <td className="tabular px-4 py-2.5 text-ink-3">{r.line}</td>
                    <td className="px-4 py-2.5 font-medium">
                      {r.firstName} {r.lastName}
                      {r.allergies && <span className="block text-xs font-normal text-danger">Alergia: {r.allergies}</span>}
                    </td>
                    <td className="px-4 py-2.5">{r.sectionLabel}</td>
                    <td className="px-4 py-2.5">
                      {r.guardianName} <span className="text-ink-3">· {r.guardianEmail}</span>
                      {r.existingGuardian && <Badge className="ml-2">Hermano: se vincula</Badge>}
                    </td>
                  </tr>
                ))}
                {preview.rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-ink-2">No hay filas válidas para importar.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
          {result?.error && <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{result.error}</p>}
          <div className={cx("flex items-center justify-end gap-3")}>
            <Link href="/escuela/alumnos" className="text-sm font-medium text-ink-2 hover:underline">Cancelar</Link>
            <Button
              disabled={pending || preview.rows.length === 0}
              onClick={() => start(async () => setResult(await importStudents(preview.rows)))}
            >
              {pending ? "Importando…" : `Importar ${preview.rows.length} ${preview.rows.length === 1 ? "alumno" : "alumnos"}`}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
