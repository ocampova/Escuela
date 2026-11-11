import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

const HEADER = ["Nombre", "Apellidos", "Cédula", "Fecha de nacimiento", "Grado", "Sección", "Alergias", "Encargado", "Parentesco", "Correo encargado", "Teléfono encargado"];
const EXAMPLE = ["Sofía", "Pérez Mora", "1-2345-6789", "15/03/2021", "Transición", "A", "Maní", "Laura Mora Rojas", "Madre", "laura.mora@correo.com", "8888-1234"];

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role === "GUARDIAN") return new NextResponse("No autorizado", { status: 401 });
  const csv = "﻿" + [HEADER, EXAMPLE].map((r) => r.join(";")).join("\r\n") + "\r\n";
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="plantilla-alumnos-scs.csv"' },
  });
}
