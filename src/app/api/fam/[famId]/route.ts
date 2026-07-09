import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { requireRole } from "@/lib/fam";
import { buildDayMap, trailingDays } from "@/app/dashboard/components/momentum";
import { levelProgress } from "@/lib/gamification";
import { dayKey } from "@/lib/dates";

export async function GET(request: Request, { params }: { params: Promise<{ famId: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { famId } = await params;

    const roleCheck = await requireRole(user.id, famId, ["OWNER", "ADMIN", "MEMBER"]);
    if (roleCheck.error) return roleCheck.error;

    const fam = await prisma.fam.findUnique({
      where: { id: famId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
                xp: true,
                streakDays: true,
                dayLogs: { orderBy: { date: "desc" }, take: 30 },
                tasks: {
                  where: { type: "WEEKLY" },
                  select: { id: true, title: true },
                  take: 3,
                },
              },
            },
          },
        },
      },
    });

    if (!fam) {
      return NextResponse.json({ error: "Fam not found" }, { status: 404 });
    }

    const today = dayKey();
    const members = fam.memberships.map((m) => {
      const dayMap = buildDayMap(m.user.dayLogs);
      const momentum14d = trailingDays(dayMap, 14);
      return {
        userId: m.user.id,
        name: m.user.name,
        username: m.user.username,
        image: m.user.image,
        role: m.role,
        joinedAt: m.joinedAt,
        xp: m.user.xp,
        streakDays: m.user.streakDays,
        todayPoints: dayMap.get(today) ?? 0,
        momentum14d,
        levelProgress: levelProgress(m.user.xp),
        majorHabits: m.user.tasks.map((t) => t.title),
      };
    });

    return NextResponse.json({
      success: true,
      fam: {
        id: fam.id,
        name: fam.name,
        description: fam.description,
        icon: fam.icon,
        xp: fam.xp,
        level: fam.level,
        ownerId: fam.ownerId,
        createdAt: fam.createdAt,
      },
      members,
    });
  } catch (err) {
    console.error("Get fam detail error:", err);
    return NextResponse.json({ error: "Failed to load Fam" }, { status: 500 });
  }
}
