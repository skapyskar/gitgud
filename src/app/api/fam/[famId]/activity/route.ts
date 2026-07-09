import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { requireRole } from "@/lib/fam";

export async function GET(request: Request, { params }: { params: Promise<{ famId: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { famId } = await params;

    const roleCheck = await requireRole(user.id, famId, ["OWNER", "ADMIN", "MEMBER"]);
    if (roleCheck.error) return roleCheck.error;

    const activities = await prisma.famActivity.findMany({
      where: { famId },
      include: { actor: { select: { username: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return NextResponse.json({ success: true, activities });
  } catch (err) {
    console.error("List activity error:", err);
    return NextResponse.json({ error: "Failed to load activity" }, { status: 500 });
  }
}
