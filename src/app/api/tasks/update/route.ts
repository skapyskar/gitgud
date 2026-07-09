import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { possibleXPForTask } from "@/lib/gamification";
import { dayStart } from "@/lib/dates";
import { TaskTier, Category, TaskType } from "../../../../../prisma/generated/enums";
import type { Prisma } from "../../../../../prisma/generated/client";

const TIERS = Object.values(TaskTier);
const CATEGORIES = Object.values(Category);
const TYPES = Object.values(TaskType);

export async function PATCH(request: Request) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const body = await request.json();
    const { taskId, type, scheduledDate, plannedDate, deadline, tier, category, deadlineTime, allocatedDuration } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID required" }, { status: 400 });
    }

    const existingTask = await prisma.task.findFirst({
      where: { id: taskId, userId: user.id },
    });
    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updateData: Prisma.TaskUpdateInput = {};

    if (type && TYPES.includes(type)) updateData.type = type;
    if (tier && TIERS.includes(tier)) updateData.tier = tier;
    if (category && CATEGORIES.includes(category)) updateData.category = category;
    if (typeof body.title === "string" && body.title.trim()) {
      updateData.title = body.title.trim().slice(0, 200);
    }
    if (deadlineTime !== undefined) {
      updateData.deadlineTime = deadlineTime ? new Date(deadlineTime) : null;
    }
    if (allocatedDuration !== undefined) {
      updateData.allocatedDuration = allocatedDuration;
    }
    if (body.frequency !== undefined) {
      updateData.frequency = Math.min(50, Math.max(1, parseInt(body.frequency) || 1));
    }

    // plannedDate and scheduledDate always move together for daily tasks.
    if (plannedDate !== undefined) {
      const dateValue = plannedDate ? new Date(plannedDate) : null;
      updateData.plannedDate = dateValue ?? new Date();
      updateData.scheduledDate = dateValue;
    } else if (scheduledDate !== undefined) {
      const dateValue = scheduledDate ? new Date(scheduledDate) : null;
      updateData.scheduledDate = dateValue;
      updateData.plannedDate = dateValue ?? new Date();
    }

    if (deadline !== undefined) {
      updateData.deadline = deadline ? new Date(deadline) : null;
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    // Moving into DAILY (e.g. from the backlog) adds to that day's possible XP.
    if (type === "DAILY" && existingTask.type !== "DAILY" && task.scheduledDate) {
      const taskDuration = allocatedDuration !== undefined ? allocatedDuration : task.allocatedDuration;
      const possible = possibleXPForTask(task.tier, !!taskDuration);
      const logDate = dayStart(new Date(task.scheduledDate));

      await prisma.dayLog.upsert({
        where: { userId_date: { userId: user.id, date: logDate } },
        update: { possibleXP: { increment: possible } },
        create: { userId: user.id, date: logDate, totalXP: 0, tasksDone: 0, possibleXP: possible },
      });
    }

    return NextResponse.json({ success: true, task });
  } catch (err) {
    console.error("Update task error:", err);
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json(
        { error: "Task not found. It may have been deleted." },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
