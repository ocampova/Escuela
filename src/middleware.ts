import { NextResponse, type NextRequest } from "next/server";
import { decodeJwt } from "jose";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * Solo enruta según el rol que dice la cookie. La verificación real de la firma
 * se hace en cada página (requireGuardian / requireStaff), en el servidor, con el
 * AUTH_SECRET disponible en tiempo de ejecución. Así el middleware no depende de
 * variables que en algunos hostings (Railway) no existen al compilar.
 */
function peekRole(token: string | undefined) {
  if (!token) return null;
  try {
    const { role, exp } = decodeJwt(token);
    if (typeof exp === "number" && exp * 1000 < Date.now()) return null;
    return typeof role === "string" ? role : null;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const role = peekRole(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = req.nextUrl;
  if (!role) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/escuela") && role === "GUARDIAN") return NextResponse.redirect(new URL("/familia", req.url));
  if (pathname.startsWith("/familia") && role !== "GUARDIAN") return NextResponse.redirect(new URL("/escuela", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/", "/familia/:path*", "/escuela/:path*"] };
