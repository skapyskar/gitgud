import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";

// Manual database-session creation, shared by the username/password login and
// signup routes. Bypasses NextAuth's Credentials flow entirely — NextAuth v4
// always issues a JWT for Credentials logins, which would conflict with the
// `session: { strategy: "database" }` used everywhere else in this app. This
// mirrors what PrismaAdapter does internally for OAuth logins, so
// getServerSession() reads it identically afterwards regardless of how the
// user signed in.
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days, matches NextAuth's default

// Cookie name + options must be IDENTICAL on the write side (these manual
// login/signup routes) and the read side (NextAuth's getServerSession), or the
// session set at login won't be found on the next request and the user is
// bounced back to /login. We key this off NODE_ENV rather than NEXTAUTH_URL so
// it stays deterministic even when NEXTAUTH_URL is misconfigured on the host:
// production (Vercel, HTTPS) -> secure "__Secure-" cookie; dev -> plain cookie.
// authOptions.cookies.sessionToken in src/lib/auth.ts imports these same values.
const useSecureCookies = process.env.NODE_ENV === "production";
export const SESSION_COOKIE_NAME = `${useSecureCookies ? "__Secure-" : ""}next-auth.session-token`;
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: useSecureCookies,
};

/** Creates a Session row for `userId` and returns a JSON response with the session cookie set. */
export async function createSessionResponse(userId: string): Promise<NextResponse> {
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  const session = await prisma.session.create({
    data: { sessionToken: randomBytes(32).toString("hex"), userId, expires },
  });

  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE_NAME, session.sessionToken, { ...SESSION_COOKIE_OPTIONS, expires });
  return res;
}
