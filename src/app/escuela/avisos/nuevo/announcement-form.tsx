"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { createAnnouncement, type FormState } from "../../actions";
import { Button, Field, inputClass } from "@/components/ui";

type Picked = { file: File; url: string };

export function AnnouncementForm({ targets }: { targets: { value: string; label: string; group: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createAnnouncement, {});
  const [images, setImages] = useState<Picked[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const groups = [...new Set(targets.map((t) => t.group))];

  // Mantener el <input type=file> sincronizado con la lista (para poder quitar imágenes)
  useEffect(() => {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    images.forEach((i) => dt.items.add(i.file));
    inputRef.current.files = dt.files;
  }, [images]);
  useEffect(() => () => images.forEach((i) => URL.revokeObjectURL(i.url)), [images]);

  function add(list: FileList | null) {
    if (!list) return;
    const next = [...list].filter((f) => f.type.startsWith("image/")).map((file) => ({ file, url: URL.createObjectURL(file) }));
    setImages((prev) => [...prev, ...next].slice(0, 6));
  }

  return (
    <form action={action} className="space-y-5">
      <Field label="Para" htmlFor="target">
        <select id="target" name="target" required className={inputClass} defaultValue={targets[0]?.value}>
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {targets
                .filter((t) => t.group === g)
                .map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </Field>

      <div>
        <p className="mb-1.5 text-sm font-medium">Imagen de la circular</p>
        <input
          ref={inputRef}
          type="file"
          name="images"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="sr-only"
          id="images"
          onChange={(e) => add(e.target.files)}
        />
        {images.length > 0 && (
          <ul className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((img, i) => (
              <li key={img.url} className="ack-in relative overflow-hidden rounded-lg bg-canvas ring-1 ring-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={`Imagen ${i + 1}`} className="aspect-[4/5] w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((p) => p.url !== img.url))}
                  aria-label={`Quitar imagen ${i + 1}`}
                  className="absolute top-1.5 right-1.5 flex size-8 items-center justify-center rounded-full bg-ink/70 text-white transition-colors hover:bg-ink"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        {images.length < 6 && (
          <label
            htmlFor="images"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              add(e.dataTransfer.files);
            }}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line-strong px-4 py-4 transition-colors hover:border-brand hover:bg-brand-soft/40"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <ImagePlus className="size-5" aria-hidden />
            </span>
            <span className="text-sm">
              <span className="block font-medium">{images.length ? "Agregar otra imagen" : "Subir la imagen del aviso"}</span>
              <span className="text-ink-2">Por ejemplo, la circular hecha en Canva. Puede enviar solo la imagen. JPG o PNG, hasta 8 MB.</span>
            </span>
          </label>
        )}
      </div>

      <Field label="Título" htmlFor="title" hint={images.length ? "Opcional: si lo deja vacío, se llama «Aviso del» y la fecha de hoy." : undefined}>
        <input id="title" name="title" maxLength={120} required={images.length === 0} placeholder="Ej.: Fiesta de Fin de Año" className={inputClass} />
      </Field>
      <Field label={images.length ? "Mensaje (opcional)" : "Mensaje"} htmlFor="body" hint="Escriba como en una circular. Los saltos de línea se respetan.">
        <textarea id="body" name="body" required={images.length === 0} rows={images.length ? 4 : 8} className={`${inputClass} resize-y leading-relaxed`} />
      </Field>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-canvas p-3">
        <input type="checkbox" name="requiresAck" defaultChecked className="mt-0.5 size-4 rounded" />
        <span className="text-sm">
          <span className="block font-medium">Pedir «Enterado» a las familias</span>
          <span className="text-ink-2">Podrá ver quién confirmó y a quién recordarle.</span>
        </span>
      </label>
      {state.error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando…" : "Enviar aviso"}
        </Button>
      </div>
    </form>
  );
}
