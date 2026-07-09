import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { coinsForXP, levelFromXP } from "@/lib/gamification";
import { dayStart } from "@/lib/dates";

/** Undo one (or `count`) completion ticks and claw back the XP/coins. */
export async function POST(request: Request) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const body = await request.json();
    const { taskId } = body;
    if (!taskId) {
      return NextResponse.json({ error: "Task ID required" }, { status: 400 });
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, userId: user.id },
    });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const completedFrequency = task.completedFrequency || 0;
    if (completedFrequency === 0) {
      return NextResponse.json({ error: "Task has no progress to undo" }, { status: 400 });
    }

    const countToRemove = Math.min(Math.max(1, body.count || 1), completedFrequency);

    // Remove a proportional slice of the points this task has banked.
    const xpToRemove = Math.round(((task.finalPoints || 0) / completedFrequency) * countToRemove);
    const coinsToRemove = coinsForXP(xpToRemove);
    const newCompletedFrequency = completedFrequency - countToRemove;

    const newXP = Math.max(0, user.xp - xpToRemove);
    const dayLogDate = dayStart(new Date(task.completedAt || task.scheduledDate || new Date()));

    const log = await prisma.dayLog.findUnique({
      where: { userId_date: { userId: user.id, date: dayLogDate } },
    });

    await prisma.$transaction([
      prisma.task.update({
        where: { id: taskId },
        data: {
          isCompleted: false,
          completedFrequency: newCompletedFrequency,
          completedAt: null,
          finalPoints: Math.max(0, (task.finalPoints || 0) - xpToRemove),
          durationMet: false,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          xp: newXP,
          coins: Math.max(0, user.coins - coinsToRemove),
          level: levelFromXP(newXP),
        },
      }),
      ...(log
        ? [
            prisma.dayLog.update({
              where: { userId_date: { userId: user.id, date: dayLogDate } },
              data: {
                totalXP: Math.max(0, log.totalXP - xpToRemove),
                tasksDone: task.isCompleted ? Math.max(0, log.tasksDone - 1) : log.tasksDone,
                cTierCount:
                  task.tier === "C" && task.isCompleted
                    ? Math.max(0, log.cTierCount - 1)
                    : log.cTierCount,
                sTierCount:
                  task.tier === "S" && task.isCompleted
                    ? Math.max(0, log.sTierCount - 1)
                    : log.sTierCount,
              },
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ success: true, xpRemoved: xpToRemove, coinsRemoved: coinsToRemove });
  } catch (err) {
    console.error("Uncomplete task error:", err);
    return NextResponse.json({ error: "Failed to uncomplete task" }, { status: 500 });
  }
}
