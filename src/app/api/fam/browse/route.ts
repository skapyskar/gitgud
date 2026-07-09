import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";

// Simple ranked browse list — orderBy xp desc. This is explicitly NOT the
// deferred weighted global-ranking algorithm from the expanded Fam design.
export async function GET() {
  try {
    const { error } = await requireUser();
    if (error) return error;

    const fams = await prisma.fam.findMany({
      orderBy: { xp: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        icon: true,
        xp: true,
        level: true,
        _count: { select: { memberships: true } },
      },
    });

    return NextResponse.json({ success: true, fams });
  } catch (err) {
    console.error("Browse fams error:", err);
    return NextResponse.json({ error: "Failed to load Fams" }, { status: 500 });
  }
}
