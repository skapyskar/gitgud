import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { possibleXPForTask } from "@/lib/gamification";
import { dayStart, todayDayIndex } from "@/lib/dates";
import { TaskTier, Category, TaskType } from "../../../../../prisma/generated/enums";

const TIERS = Object.values(TaskTier);
const CATEGORIES = Object.values(Category);
const TYPES = Object.values(TaskType);

export async function POST(request: Request) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const body = await request.json();
    const { title, type, deadline, scheduledDate, repeatDays, deadlineTime, allocatedDuration } = body;

    if (!title?.trim() || !type || !TYPES.includes(type)) {
      return NextResponse.json({ error: "Title and a valid type are required" }, { status: 400 });
    }

    const tier: TaskTier = TIERS.includes(body.tier) ? body.tier : "C";
    const category: Category = CATEGORIES.includes(body.category) ? body.category : "LIFE";
    const frequency = Math.min(50, Math.max(1, parseInt(body.frequency) || 1));

    const task = await prisma.task.create({
      data: {
        userId: user.id,
        title: title.trim().slice(0, 200),
        type,
        tier,
        category,
        deadline: deadline ? new Date(deadline) : null,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        plannedDate: scheduledDate ? new Date(scheduledDate) : new Date(),
        repeatDays: repeatDays || null,
        deadlineTime: deadlineTime ? new Date(deadlineTime) : null,
        allocatedDuration: allocatedDuration || null,
        frequency,
        completedFrequency: 0,
      },
    });

    // Track the XP this task makes possible (efficiency denominator).
    const possible = possibleXPForTask(tier, !!allocatedDuration);

    const isActiveWeeklyToday =
      type === "WEEKLY" &&
      !!repeatDays &&
      repeatDays.split(",").map(Number).includes(todayDayIndex());

    const logDate =
      type === "DAILY" && scheduledDate
        ? dayStart(new Date(scheduledDate))
        : isActiveWeeklyToday
          ? dayStart()
          : null;

    if (logDate) {
      await prisma.dayLog.upsert({
        where: { userId_date: { userId: user.id, date: logDate } },
        update: { possibleXP: { increment: possible } },
        create: { userId: user.id, date: logDate, totalXP: 0, tasksDone: 0, possibleXP: possible },
      });
    }

    return NextResponse.json({ success: true, task });
  } catch (err) {
    console.error("Create task error:", err);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
