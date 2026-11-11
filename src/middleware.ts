import { NextResponse, type NextRequest } from "next/server";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const session = await decodeSession(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = req.nextUrl;
  if (!session) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/escuela") && session.role === "GUARDIAN") return NextResponse.redirect(new URL("/familia", req.url));
  if (pathname.startsWith("/familia") && session.role !== "GUARDIAN") return NextResponse.redirect(new URL("/escuela", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/", "/familia/:path*", "/escuela/:path*"] };
