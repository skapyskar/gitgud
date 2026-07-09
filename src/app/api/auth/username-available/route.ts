import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeUsername, validateUsername } from "@/lib/username";
import { checkRateLimit, clientKeyFor } from "@/lib/rate-limit";

// Generous — the signup form checks as the user types — but bounded, so the
// endpoint can't be used for bulk username enumeration or DB hammering.
const MAX_ATTEMPTS = 60;
const WINDOW_MS = 60_000;

export async function GET(request: NextRequest) {
  const rateLimit = checkRateLimit(`username-check:${clientKeyFor(request)}`, MAX_ATTEMPTS, WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const raw = request.nextUrl.searchParams.get("username") ?? "";
  const username = normalizeUsername(raw);

  const formatError = validateUsername(username);
  if (formatError) {
    return NextResponse.json({ available: false, error: formatError });
  }

  const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  return NextResponse.json({ available: !existing });
}
