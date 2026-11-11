"use client";

import { useActionState, useState } from "react";
import { FileUp } from "lucide-react";
import { apply, type ApplyState } from "./actions";
import { ENROLL_DOCS, TRANSFER_DOCS } from "@/lib/enrollment";
import { Button, Field, inputClass } from "@/components/ui";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-4 text-[15px] font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

function FileField({ name, label, hint }: { name: string; label: string; hint?: string }) {
  return (
    <label className="block cursor-pointer rounded-lg px-3 py-3 ring-1 ring-inset ring-line-strong transition-colors hover:bg-canvas has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand">
      <span className="flex items-center gap-3">
        <FileUp className="size-5 shrink-0 text-brand" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{label}</span>
          <span className="block text-xs text-ink-3">{hint ?? "PDF o foto, hasta 5 MB"}</span>
        </span>
      </span>
      <input
        type="file"
        name={name}
        accept="application/pdf,image/jpeg,image/png,image/heic,image/webp"
        className="mt-2 block w-full min-w-0 text-xs text-ink-2 file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-brand"
      />
    </label>
  );
}

export function ApplyForm({ grades }: { grades: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(apply, {});
  const v = state.fields ?? {};
  const [transfer, setTransfer] = useState(v.transfer === "on");
  return (
    <form action={action} className="space-y-8" key={JSON.stringify(v)}>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <Group title="Sobre el niño o la niña">
        <Field label="Grado al que desea matricular" htmlFor="gradeId">
          <select id="gradeId" name="gradeId" required defaultValue={v.gradeId ?? ""} className={inputClass}>
            <option value="" disabled>Elegir grado…</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>{g.label}</option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" htmlFor="childFirstName">
            <input id="childFirstName" name="childFirstName" required defaultValue={v.childFirstName} className={inputClass} />
          </Field>
          <Field label="Apellidos" htmlFor="childLastName">
            <input id="childLastName" name="childLastName" required defaultValue={v.childLastName} className={inputClass} />
          </Field>
          <Field label="Fecha de nacimiento" htmlFor="childBirthDate">
            <input id="childBirthDate" name="childBirthDate" type="date" required defaultValue={v.childBirthDate} className={inputClass} />
          </Field>
          <Field label="Cédula (opcional)" htmlFor="childIdNumber">
            <input id="childIdNumber" name="childIdNumber" defaultValue={v.childIdNumber} placeholder="1-2345-6789" className={inputClass} />
          </Field>
        </div>
        <Field label="Alergias o condiciones de salud (opcional)" htmlFor="allergies">
          <input id="allergies" name="allergies" defaultValue={v.allergies} className={inputClass} />
        </Field>
        <Field label="Escuela o centro anterior (opcional)" htmlFor="previousSchool">
          <input id="previousSchool" name="previousSchool" defaultValue={v.previousSchool} className={inputClass} />
        </Field>
      </Group>

      <Group title="Sobre usted">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo" htmlFor="guardianName">
            <input id="guardianName" name="guardianName" required autoComplete="name" defaultValue={v.guardianName} className={inputClass} />
          </Field>
          <Field label="Parentesco" htmlFor="relationship">
            <select id="relationship" name="relationship" required defaultValue={v.relationship ?? "Madre"} className={inputClass}>
              {["Madre", "Padre", "Encargado legal", "Abuela", "Abuelo", "Otro"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field label="Correo electrónico" htmlFor="guardianEmail">
            <input id="guardianEmail" name="guardianEmail" type="email" required autoComplete="email" defaultValue={v.guardianEmail} className={inputClass} />
          </Field>
          <Field label="Teléfono o WhatsApp" htmlFor="guardianPhone">
            <input id="guardianPhone" name="guardianPhone" required inputMode="tel" autoComplete="tel" placeholder="8888-8888" defaultValue={v.guardianPhone} className={inputClass} />
          </Field>
          <Field label="Su cédula (opcional)" htmlFor="guardianIdNumber">
            <input id="guardianIdNumber" name="guardianIdNumber" defaultValue={v.guardianIdNumber} className={inputClass} />
          </Field>
        </div>
        <Field label="¿Algo que quiera contarnos? (opcional)" htmlFor="message">
          <textarea id="message" name="message" rows={3} defaultValue={v.message} className={inputClass} />
        </Field>
      </Group>

      <Group title="Documentos (puede enviarlos después)">
        <p className="-mt-2 text-sm text-ink-2">Adelante lo que tenga a mano. Los originales y el resto se entregan al formalizar la matrícula.</p>
        {ENROLL_DOCS.map((d) => (
          <FileField key={d.field} name={d.field} label={d.kind} hint={d.field === "docInsurance" ? "Si ya la adquirió. PDF o foto, hasta 5 MB" : undefined} />
        ))}
        <label className="flex items-start gap-3 rounded-lg bg-canvas p-3 text-sm">
          <input type="checkbox" name="transfer" checked={transfer} onChange={(e) => setTransfer(e.target.checked)} className="mt-0.5 size-4" />
          <span>
            <span className="block font-medium">Viene trasladado de otra institución</span>
            <span className="text-ink-2">Se pide además el título de preescolar (si entra a primaria) y una carta de comportamiento.</span>
          </span>
        </label>
        {transfer && TRANSFER_DOCS.map((d) => <FileField key={d.field} name={d.field} label={d.kind} />)}
      </Group>

      <label className="flex items-start gap-3 rounded-lg bg-canvas p-3 text-sm">
        <input type="checkbox" name="consent" required defaultChecked={v.consent === "on"} className="mt-0.5 size-4" />
        <span className="text-ink-2">
          Autorizo a San Cayetano School a usar estos datos solo para el proceso de matrícula, según la Ley 8968 de Protección de la Persona frente al Tratamiento de sus Datos Personales.
        </span>
      </label>

      {state.error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Enviando solicitud…" : "Enviar solicitud de matrícula"}
      </Button>
    </form>
  );
}
