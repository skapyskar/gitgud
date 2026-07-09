import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";

/** Day logs for graphs and the activity heatmap (last ~4 months). */
export async function GET() {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const dayLogs = await prisma.dayLog.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 120,
    });

    return NextResponse.json({ success: true, dayLogs });
  } catch (err) {
    console.error("Fetch daylogs error:", err);
    return NextResponse.json({ error: "Failed to fetch daylogs" }, { status: 500 });
  }
}
