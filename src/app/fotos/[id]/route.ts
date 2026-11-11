import { NextResponse } from "next/server";
import { getCurrentUser, isManager } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Foto de un álbum: solo la ven las familias de esa sección y el personal que la atiende. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("No autorizado", { status: 401 });
  const section =
    user.role === "GUARDIAN"
      ? { students: { some: { guardians: { some: { userId: user.id } } } } }
      : { schoolYear: { schoolId: user.schoolId }, ...(isManager(user) ? {} : { teacherId: user.id }) };
  const photo = await prisma.albumPhoto.findFirst({ where: { id, album: { section } }, select: { data: true, mimeType: true } });
  if (!photo) return new NextResponse("No encontrado", { status: 404 });
  return new NextResponse(Buffer.from(photo.data), {
    headers: { "Content-Type": photo.mimeType, "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
