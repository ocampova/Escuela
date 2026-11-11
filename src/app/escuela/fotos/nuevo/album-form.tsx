"use client";

import { useActionState, useState } from "react";
import { ImagePlus, ShieldAlert, X } from "lucide-react";
import { createAlbum, type FormState } from "../../vida-actions";
import { Button, Field, inputClass } from "@/components/ui";

const MAX_SIDE = 1600;

/** Achica la foto en el navegador (JPEG, lado mayor 1600 px). */
async function shrink(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

type Props = { sections: { id: string; label: string }[]; defaultSection?: string; today: string; noConsent: Record<string, { name: string; answered: boolean }[]> };

export function AlbumForm({ sections, defaultSection, today, noConsent }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(createAlbum, {});
  const [section, setSection] = useState(defaultSection ?? "");
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [working, setWorking] = useState(false);
  const missing = noConsent[section] ?? [];

  async function add(list: FileList | null) {
    if (!list) return;
    setWorking(true);
    const out = await Promise.all([...list].filter((f) => f.type.startsWith("image/")).map(shrink));
    setFiles((prev) => [...prev, ...out.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, 40));
    setWorking(false);
  }

  return (
    <form
      action={(fd) => {
        fd.delete("pick");
        files.forEach((f) => fd.append("photos", f.file));
        return action(fd);
      }}
      className="space-y-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sección" htmlFor="sectionId">
          <select id="sectionId" name="sectionId" value={section} onChange={(e) => setSection(e.target.value)} className={inputClass}>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fecha" htmlFor="date">
          <input id="date" type="date" name="date" defaultValue={today} max={today} className={inputClass} />
        </Field>
      </div>
      <Field label="Título" htmlFor="title" hint="Opcional. Ej.: Día de la fruta, Gira al museo.">
        <input id="title" name="title" maxLength={100} className={inputClass} />
      </Field>

      <div>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-canvas px-4 py-8 text-center transition-colors hover:border-brand hover:bg-brand-soft/40">
          <ImagePlus className="size-6 text-brand" aria-hidden />
          <span className="text-sm font-medium">{working ? "Preparando fotos…" : "Elegir fotos"}</span>
          <span className="text-xs text-ink-3">Hasta 40 por álbum</span>
          <input name="pick" type="file" accept="image/*" multiple className="sr-only" onChange={(e) => add(e.target.files)} />
        </label>
        {files.length > 0 && (
          <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
            {files.map((f, i) => (
              <li key={f.url} className="relative aspect-square overflow-hidden rounded-lg bg-canvas">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  aria-label="Quitar foto"
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-ink/70 text-white"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {missing.length > 0 && (
        <div className="rounded-xl bg-warn-soft p-4 text-sm">
          <p className="flex items-center gap-2 font-medium text-warn">
            <ShieldAlert className="size-4" aria-hidden /> Sin autorización para fotos
          </p>
          <p className="mt-1 text-ink-2">
            {missing.map((m) => m.name + (m.answered ? "" : " (la familia no ha respondido)")).join(", ")}. No deben aparecer en estas fotos.
          </p>
          <label className="mt-3 flex items-start gap-2">
            <input type="checkbox" name="consentChecked" required className="mt-0.5 size-4 accent-brand" />
            <span>Revisé las fotos y no aparecen.</span>
          </label>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {state.error && <p role="alert" className="mr-auto text-sm text-danger">{state.error}</p>}
        <Button type="submit" disabled={pending || working || files.length === 0}>
          {pending ? "Subiendo…" : `Publicar ${files.length || ""} ${files.length === 1 ? "foto" : "fotos"}`.replace("  ", " ")}
        </Button>
      </div>
    </form>
  );
}
