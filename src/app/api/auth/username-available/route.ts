import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeUsername, validateUsername } from "@/lib/username";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("username") ?? "";
  const username = normalizeUsername(raw);

  const formatError = validateUsername(username);
  if (formatError) {
    return NextResponse.json({ available: false, error: formatError });
  }

  const existing = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  return NextResponse.json({ available: !existing });
}
