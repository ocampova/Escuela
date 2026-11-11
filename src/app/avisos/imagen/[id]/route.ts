import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audienceFilter, guardianStudents } from "@/lib/queries";

/** Imagen de un aviso: solo la ven el personal de la escuela y las familias a las que va dirigido. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("No autorizado", { status: 401 });
  const where =
    user.role === "GUARDIAN"
      ? { id, announcement: { schoolId: user.schoolId, ...audienceFilter(await guardianStudents(user.id)) } }
      : { id, announcement: { schoolId: user.schoolId } };
  const img = await prisma.announcementImage.findFirst({ where, select: { data: true, mimeType: true } });
  if (!img) return new NextResponse("No encontrado", { status: 404 });
  return new NextResponse(Buffer.from(img.data), {
    headers: { "Content-Type": img.mimeType, "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
