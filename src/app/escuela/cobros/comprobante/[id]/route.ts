import { NextResponse } from "next/server";
import { getCurrentUser, isManager } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !isManager(user)) return new NextResponse("No autorizado", { status: 401 });
  const r = await prisma.paymentReport.findFirst({ where: { id, student: { section: { schoolYear: { schoolId: user.schoolId } } } } });
  if (!r) return new NextResponse("No encontrado", { status: 404 });
  return new NextResponse(Buffer.from(r.fileData), {
    headers: {
      "Content-Type": r.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(r.fileName)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
