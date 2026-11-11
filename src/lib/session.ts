import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "scs_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 días

export type SessionPayload = { userId: string; role: "ADMIN" | "STAFF" | "TEACHER" | "GUARDIAN" };

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET debe tener al menos 32 caracteres");
  if (process.env.NODE_ENV === "production" && /cambie-esto|change-me|dev-secret/i.test(secret)) {
    throw new Error("AUTH_SECRET tiene el valor de ejemplo. Use un secreto aleatorio (en Railway: ${{secret(48)}}).");
  }
  return new TextEncoder().encode(secret);
}

export async function encodeSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
}

export async function decodeSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return { userId: String(payload.userId), role: payload.role as SessionPayload["role"] };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};
