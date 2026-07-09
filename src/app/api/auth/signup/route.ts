import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { normalizeUsername, validateUsername } from "@/lib/username";
import { validatePassword } from "@/lib/password";
import { createSessionResponse } from "@/lib/auth-session";
import { checkRateLimit, clientKeyFor } from "@/lib/rate-limit";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 60_000;

// Direct username+password account creation — no OAuth, no email required.
// The placeholder email exists only because `User.email` is a required unique
// column shared with the OAuth path; it's never shown to the user or used to
// send mail. Username, not email, is this account's real identity.
function placeholderEmail(username: string): string {
  return `${username}@users.gitgud.local`;
}

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(`signup:${clientKeyFor(req)}`, MAX_ATTEMPTS, WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${Math.ceil(rateLimit.retryAfterSeconds / 60)}m.` },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const rawUsername = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const username = normalizeUsername(rawUsername);
  const usernameError = validateUsername(username);
  if (usernameError) {
    return NextResponse.json({ error: usernameError }, { status: 400 });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);

  let user;
  try {
    user = await prisma.user.create({
      data: { username, password: hashed, email: placeholderEmail(username), name: username },
    });
  } catch (e: unknown) {
    if (typeof e === "object" && e !== null && "code" in e && e.code === "P2002") {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }
    throw e;
  }

  return createSessionResponse(user.id);
}
