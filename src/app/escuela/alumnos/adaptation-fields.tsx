"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui";

/** Tipo de adecuación curricular; si tiene, pide una descripción para la docente. */
export function AdaptationFields({ labels, adaptation, note }: { labels: Record<string, string>; adaptation: string; note: string }) {
  const [value, setValue] = useState(adaptation);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Adecuación curricular" htmlFor="adaptation">
        <select id="adaptation" name="adaptation" value={value} onChange={(e) => setValue(e.target.value)} className={inputClass}>
          {Object.entries(labels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </Field>
      {value !== "NONE" && (
        <Field label="Qué necesita" htmlFor="adaptationNote" hint="La docente lo ve al pasar lista y al poner notas.">
          <input id="adaptationNote" name="adaptationNote" required defaultValue={note} placeholder="Ej.: más tiempo en pruebas, ubicación al frente" className={inputClass} />
        </Field>
      )}
    </div>
  );
}
