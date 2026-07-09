import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { requireRole, ACHIEVEMENT_DEFS } from "@/lib/fam";

export async function GET(request: Request, { params }: { params: Promise<{ famId: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { famId } = await params;

    const roleCheck = await requireRole(user.id, famId, ["OWNER", "ADMIN", "MEMBER"]);
    if (roleCheck.error) return roleCheck.error;

    const unlocked = await prisma.famAchievement.findMany({ where: { famId } });
    const unlockedMap = new Map(unlocked.map((a) => [a.key, a.unlockedAt]));

    const achievements = ACHIEVEMENT_DEFS.map((def) => ({
      key: def.key,
      label: def.label,
      unlocked: unlockedMap.has(def.key),
      unlockedAt: unlockedMap.get(def.key) ?? null,
    }));

    return NextResponse.json({ success: true, achievements });
  } catch (err) {
    console.error("List achievements error:", err);
    return NextResponse.json({ error: "Failed to load achievements" }, { status: 500 });
  }
}
