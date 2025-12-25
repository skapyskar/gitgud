import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { tierBaseXP } from "@/lib/gamification";

export async function DELETE(request: Request) {
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

    // Get the task first to calculate possibleXP to remove
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // If task is DAILY and not completed, decrement possibleXP from DayLog
    if (task.type === "DAILY" && !task.isCompleted && task.scheduledDate) {
      const baseXP = tierBaseXP(task.tier);
      // Include duration bonus (25%) if task had allocated duration
      const durationBonus = task.allocatedDuration ? Math.round(baseXP * 0.25) : 0;
      const totalPossibleXP = baseXP + durationBonus;

      const taskDate = new Date(task.scheduledDate);
      taskDate.setHours(0, 0, 0, 0);

      await prisma.dayLog.updateMany({
        where: {
          userId: user.id,
          date: taskDate,
        },
        data: {
          possibleXP: { decrement: totalPossibleXP },
        },
      });
    }

    // If task was completed, also remove the XP and tasksDone count
    if (task.isCompleted && task.finalPoints) {
      const taskDate = task.completedAt || task.scheduledDate || new Date();
      const dayLogDate = new Date(taskDate);
      dayLogDate.setHours(0, 0, 0, 0);

      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: {
            xp: { decrement: task.finalPoints },
          },
        }),
        prisma.dayLog.updateMany({
          where: {
            userId: user.id,
            date: dayLogDate,
          },
          data: {
            totalXP: { decrement: task.finalPoints },
            tasksDone: { decrement: 1 },
          },
        }),
      ]);
    }

    // Delete the task
    await prisma.task.delete({
      where: { id: taskId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete task error:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
