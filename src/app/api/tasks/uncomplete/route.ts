import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { tierBaseXP } from "@/lib/gamification";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID required" }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Only allow uncompleting if task was completed
    if (!task.isCompleted) {
      return NextResponse.json({
        error: "Task is not completed",
      }, { status: 400 });
    }

    // Subtract the XP that was gained
    const xpToRemove = task.finalPoints ?? 0;
    const baseXP = tierBaseXP(task.tier);

    // Get the date for DayLog update (use completedAt or scheduledDate)
    const taskDate = task.completedAt || task.scheduledDate || new Date();
    const dayLogDate = new Date(taskDate);
    dayLogDate.setHours(0, 0, 0, 0);

    // Update task, user, and DayLog in a transaction
    await prisma.$transaction([
      prisma.task.update({
        where: { id: taskId },
        data: {
          isCompleted: false,
          completedAt: null,
          isBonus: false,
          finalPoints: 0,
          durationMet: false,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          xp: {
            decrement: xpToRemove
          },
          level: {
            set: Math.floor(1 + Math.sqrt(Math.max(0, user.xp - xpToRemove) / 500))
          },
        },
      }),
      // Update DayLog to reduce stats
      prisma.dayLog.updateMany({
        where: {
          userId: user.id,
          date: dayLogDate,
        },
        data: {
          totalXP: { decrement: xpToRemove },
          tasksDone: { decrement: 1 },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      xpRemoved: xpToRemove,
    });
  } catch (error) {
    console.error("Uncomplete task error:", error);
    return NextResponse.json(
      { error: "Failed to uncomplete task" },
      { status: 500 }
    );
  }
}
