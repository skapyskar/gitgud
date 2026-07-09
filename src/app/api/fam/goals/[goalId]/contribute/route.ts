import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { getMembership, logActivity, checkAndUnlockAchievements } from "@/lib/fam";

export async function POST(request: Request, { params }: { params: Promise<{ goalId: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { goalId } = await params;

    const body = await request.json();
    const amount = Number(body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
    }

    const goal = await prisma.famGoal.findUnique({ where: { id: goalId } });
    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }
    if (goal.status !== "ACTIVE") {
      return NextResponse.json({ error: "This goal isn't active" }, { status: 400 });
    }

    const membership = await getMembership(user.id, goal.famId);
    if (!membership) {
      return NextResponse.json({ error: "Not a member of this Fam" }, { status: 403 });
    }

    const newValue = Math.min(goal.targetValue, goal.currentValue + amount);
    const isComplete = newValue >= goal.targetValue;

    await prisma.famGoal.update({
      where: { id: goalId },
      data: {
        currentValue: newValue,
        status: isComplete ? "COMPLETED" : "ACTIVE",
        completedAt: isComplete ? new Date() : null,
      },
    });

    if (isComplete) {
      await logActivity(goal.famId, "GOAL_COMPLETED", `Goal completed: "${goal.description}"`);
      await checkAndUnlockAchievements(goal.famId);
    }

    return NextResponse.json({ success: true, currentValue: newValue, completed: isComplete });
  } catch (err) {
    console.error("Contribute to goal error:", err);
    return NextResponse.json({ error: "Failed to contribute" }, { status: 500 });
  }
}
