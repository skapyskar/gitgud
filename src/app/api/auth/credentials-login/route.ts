import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSessionResponse } from "@/lib/auth-session";
import { checkRateLimit, clientKeyFor } from "@/lib/rate-limit";

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 5 * 60_000;

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(`login:${clientKeyFor(req)}`, MAX_ATTEMPTS, WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${rateLimit.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

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

  return createSessionResponse(user.id);
}
