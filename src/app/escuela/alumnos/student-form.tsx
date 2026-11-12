import { ActionForm } from "@/components/action-form";
import { Field, inputClass } from "@/components/ui";
import { saveStudent } from "./actions";
import { ADAPTATION_LABEL, NATIONALITIES } from "@/lib/student";
import { AdaptationFields } from "./adaptation-fields";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  idNumber: string | null;
  birthDate: Date;
  sectionId: string;
  bloodType: string | null;
  allergies: string | null;
  medicalNotes: string | null;
  sex: string | null;
  nationality: string | null;
  enrolledOn: Date | null;
  repeating: boolean;
  adaptation: string;
  adaptationNote: string | null;
};

export function StudentForm({ student, sections }: { student?: Student; sections: { id: string; label: string }[] }) {
  return (
    <ActionForm action={saveStudent} submitLabel={student ? "Guardar cambios" : "Crear alumno"} resetOnOk={false}>
      {student && <input type="hidden" name="id" value={student.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="firstName">
          <input id="firstName" name="firstName" required defaultValue={student?.firstName} className={inputClass} />
        </Field>
        <Field label="Apellidos" htmlFor="lastName">
          <input id="lastName" name="lastName" required defaultValue={student?.lastName} className={inputClass} />
        </Field>
        <Field label="Cédula" htmlFor="idNumber" hint="Formato 1-2345-6789. DIMEX o pasaporte si es extranjero.">
          <input id="idNumber" name="idNumber" defaultValue={student?.idNumber ?? ""} className={inputClass} />
        </Field>
        <Field label="Fecha de nacimiento" htmlFor="birthDate">
          <input id="birthDate" name="birthDate" type="date" required defaultValue={student?.birthDate.toISOString().slice(0, 10)} className={inputClass} />
        </Field>
        <Field label="Sección" htmlFor="sectionId">
          <select id="sectionId" name="sectionId" required defaultValue={student?.sectionId ?? ""} className={inputClass}>
            <option value="" disabled>Elegir sección…</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Tipo de sangre" htmlFor="bloodType">
          <select id="bloodType" name="bloodType" defaultValue={student?.bloodType ?? ""} className={inputClass}>
            <option value="">Sin dato</option>
            {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </Field>
      </div>
      <fieldset className="space-y-4 border-t border-line pt-5">
        <legend className="text-sm font-semibold">Datos para el MEP</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sexo" htmlFor="sex">
            <select id="sex" name="sex" required defaultValue={student?.sex ?? ""} className={inputClass}>
              <option value="" disabled>Elegir…</option>
              <option value="F">Mujer</option>
              <option value="M">Hombre</option>
            </select>
          </Field>
          <Field label="Nacionalidad" htmlFor="nationality">
            <input id="nationality" name="nationality" list="nationalities" defaultValue={student?.nationality ?? "Costarricense"} className={inputClass} />
            <datalist id="nationalities">
              {NATIONALITIES.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </Field>
          <Field label="Fecha de ingreso a la escuela" htmlFor="enrolledOn" hint="Si entró a mitad de año, la estadística lo cuenta como ingreso.">
            <input id="enrolledOn" name="enrolledOn" type="date" defaultValue={student?.enrolledOn?.toISOString().slice(0, 10) ?? ""} className={inputClass} />
          </Field>
          <label className="flex items-center gap-3 self-end rounded-lg px-3 py-2.5 text-sm ring-1 ring-inset ring-line-strong sm:mb-0.5">
            <input type="checkbox" name="repeating" defaultChecked={student?.repeating} className="size-4" />
            Repite este grado
          </label>
        </div>
        <AdaptationFields labels={ADAPTATION_LABEL} adaptation={student?.adaptation ?? "NONE"} note={student?.adaptationNote ?? ""} />
      </fieldset>
      <Field label="Alergias" htmlFor="allergies" hint="Se muestran en rojo a la docente al pasar lista.">
        <input id="allergies" name="allergies" defaultValue={student?.allergies ?? ""} placeholder="Ej.: Maní, penicilina" className={inputClass} />
      </Field>
      <Field label="Notas médicas o de apoyo" htmlFor="medicalNotes" hint="Visible para la dirección, la secretaría y la docente de la sección.">
        <textarea id="medicalNotes" name="medicalNotes" rows={3} defaultValue={student?.medicalNotes ?? ""} className={inputClass} />
      </Field>
    </ActionForm>
  );
}
