import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// Manual username/password login. Bypasses NextAuth's Credentials flow entirely —
// NextAuth v4 always issues a JWT for Credentials logins, which would conflict with
// the `session: { strategy: "database" }` used everywhere else in this app. Instead,
// this route validates the password, then creates a Session row and sets the cookie
// exactly like PrismaAdapter does internally for OAuth logins, so getServerSession()
// reads it identically afterwards regardless of how the user signed in.
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days, matches NextAuth's default
const useSecureCookies = (process.env.NEXTAUTH_URL ?? "").startsWith("https://");
const SESSION_COOKIE_NAME = useSecureCookies ? "__Secure-next-auth.session-token" : "next-auth.session-token";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user?.password) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  const session = await prisma.session.create({
    data: {
      sessionToken: randomBytes(32).toString("hex"),
      userId: user.id,
      expires,
    },
  });

  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE_NAME, session.sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: useSecureCookies,
    expires,
  });
  return res;
}
