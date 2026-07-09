import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { normalizeUsername } from "@/lib/username";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireUser();
    if (error) return error;

    const raw = request.nextUrl.searchParams.get("username") ?? "";
    const username = normalizeUsername(raw);
    if (!username) {
      return NextResponse.json({ error: "username query param required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, name: true, image: true },
    });

    return NextResponse.json({ success: true, user: user ?? null });
  } catch (err) {
    console.error("User search error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
