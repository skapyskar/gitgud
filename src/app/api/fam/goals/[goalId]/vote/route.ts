import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { getMembership, logActivity } from "@/lib/fam";

export async function POST(request: Request, { params }: { params: Promise<{ goalId: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { goalId } = await params;

    const body = await request.json();
    const approve = body?.approve === true;

    const goal = await prisma.famGoal.findUnique({ where: { id: goalId } });
    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }
    if (goal.status !== "PROPOSED") {
      return NextResponse.json({ error: "This goal is no longer open for voting" }, { status: 400 });
    }

    const membership = await getMembership(user.id, goal.famId);
    if (!membership) {
      return NextResponse.json({ error: "Not a member of this Fam" }, { status: 403 });
    }

    await prisma.famGoalVote.upsert({
      where: { goalId_userId: { goalId, userId: user.id } },
      update: { approve },
      create: { goalId, userId: user.id, approve },
    });

    // 50%+ of current active members approving activates the goal.
    const [memberCount, approveCount] = await Promise.all([
      prisma.famMembership.count({ where: { famId: goal.famId } }),
      prisma.famGoalVote.count({ where: { goalId, approve: true } }),
    ]);

    let activated = false;
    if (approveCount / memberCount >= 0.5) {
      const updated = await prisma.famGoal.updateMany({
        where: { id: goalId, status: "PROPOSED" },
        data: { status: "ACTIVE", activatedAt: new Date() },
      });
      if (updated.count === 1) {
        activated = true;
        await logActivity(goal.famId, "GOAL_ACTIVATED", `Goal activated: "${goal.description}"`);
      }
    }

    return NextResponse.json({ success: true, activated });
  } catch (err) {
    console.error("Vote on goal error:", err);
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}
