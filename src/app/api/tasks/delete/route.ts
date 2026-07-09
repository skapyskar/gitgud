import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { coinsForXP, levelFromXP, possibleXPForTask } from "@/lib/gamification";
import { dayStart, todayDayIndex } from "@/lib/dates";

export async function DELETE(request: Request) {
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

    const today = dayStart();
    const tomorrow = new Date(today.getTime() + 86_400_000);
    const possible = possibleXPForTask(task.tier, !!task.allocatedDuration);

    // Removing a pending DAILY task removes its potential XP from that day.
    if (task.type === "DAILY" && !task.isCompleted && task.scheduledDate) {
      const logDate = dayStart(new Date(task.scheduledDate));
      const log = await prisma.dayLog.findUnique({
        where: { userId_date: { userId: user.id, date: logDate } },
      });
      if (log) {
        await prisma.dayLog.update({
          where: { userId_date: { userId: user.id, date: logDate } },
          data: { possibleXP: Math.max(0, log.possibleXP - possible) },
        });
      }
    }

    // Removing a WEEKLY template active today removes today's potential —
    // unless a spawned instance already carries it.
    if (task.type === "WEEKLY" && task.repeatDays) {
      const activeToday = task.repeatDays.split(",").map(Number).includes(todayDayIndex());
      if (activeToday) {
        const instanceToday = await prisma.task.findFirst({
          where: {
            userId: user.id,
            templateId: task.id,
            scheduledDate: { gte: today, lt: tomorrow },
          },
        });
        if (!instanceToday) {
          const log = await prisma.dayLog.findUnique({
            where: { userId_date: { userId: user.id, date: today } },
          });
          if (log) {
            await prisma.dayLog.update({
              where: { userId_date: { userId: user.id, date: today } },
              data: { possibleXP: Math.max(0, log.possibleXP - possible) },
            });
          }
        }
      }
    }

    // Deleting a task with banked points claws back XP and coins.
    if (task.finalPoints > 0) {
      const logDate = dayStart(new Date(task.completedAt || task.scheduledDate || new Date()));
      const log = await prisma.dayLog.findUnique({
        where: { userId_date: { userId: user.id, date: logDate } },
      });
      const newXP = Math.max(0, user.xp - task.finalPoints);

      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: {
            xp: newXP,
            coins: Math.max(0, user.coins - coinsForXP(task.finalPoints)),
            level: levelFromXP(newXP),
          },
        }),
        ...(log
          ? [
              prisma.dayLog.update({
                where: { userId_date: { userId: user.id, date: logDate } },
                data: {
                  totalXP: Math.max(0, log.totalXP - task.finalPoints),
                  tasksDone: task.isCompleted ? Math.max(0, log.tasksDone - 1) : log.tasksDone,
                },
              }),
            ]
          : []),
      ]);
    }

    await prisma.task.delete({ where: { id: taskId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete task error:", err);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
