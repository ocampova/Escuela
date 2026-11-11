import { NextResponse } from "next/server";
import { getCurrentUser, isManager } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !isManager(user)) return new NextResponse("No autorizado", { status: 401 });
  const doc = await prisma.applicantDocument.findFirst({ where: { id, applicant: { schoolId: user.schoolId } } });
  if (!doc) return new NextResponse("No encontrado", { status: 404 });
  return new NextResponse(Buffer.from(doc.data), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.filename)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
