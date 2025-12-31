import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { tierBaseXP } from "@/lib/gamification";

export async function PATCH(request: Request) {
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
    const { taskId, type, scheduledDate, plannedDate, deadline, tier, category, deadlineTime, allocatedDuration } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID required" }, { status: 400 });
    }

    // Get existing task to check if type is changing
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Update the task
    const updateData: any = {};

    if (type) updateData.type = type;
    if (tier) updateData.tier = tier;
    if (category) updateData.category = category;

    // Handle deadline time and duration
    if (deadlineTime !== undefined) {
      updateData.deadlineTime = deadlineTime ? new Date(deadlineTime) : null;
    }
    if (allocatedDuration !== undefined) {
      updateData.allocatedDuration = allocatedDuration;
    }
    if (body.frequency !== undefined) {
      updateData.frequency = body.frequency;
    }

    // Handle plannedDate (preferred) or scheduledDate (backward compatibility)
    // IMPORTANT: Always set BOTH scheduledDate and plannedDate for daily tasks
    if (plannedDate !== undefined) {
      const dateValue = plannedDate ? new Date(plannedDate) : null;
      updateData.plannedDate = dateValue;
      updateData.scheduledDate = dateValue; // Always sync both
      console.log('[Update API] Setting dates from plannedDate:', {
        plannedDate: updateData.plannedDate,
        scheduledDate: updateData.scheduledDate,
      });
    } else if (scheduledDate !== undefined) {
      const dateValue = scheduledDate ? new Date(scheduledDate) : null;
      updateData.scheduledDate = dateValue;
      updateData.plannedDate = dateValue || new Date(); // Always sync both
      console.log('[Update API] Setting dates from scheduledDate:', {
        plannedDate: updateData.plannedDate,
        scheduledDate: updateData.scheduledDate,
      });
    }

    if (deadline !== undefined) {
      updateData.deadline = deadline ? new Date(deadline) : null;
    }

    console.log('[Update API] Final update data:', updateData);

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    console.log('[Update API] Updated task:', {
      id: task.id,
      type: task.type,
      scheduledDate: task.scheduledDate,
      plannedDate: task.plannedDate,
    });

    // If task is being moved to DAILY (from BACKLOG), update DayLog possibleXP
    if (type === "DAILY" && existingTask.type !== "DAILY" && task.scheduledDate) {
      const taskDate = new Date(task.scheduledDate);
      taskDate.setHours(0, 0, 0, 0);
      const baseXP = tierBaseXP(tier || task.tier || "C");
      // Include duration bonus (25%) in possibleXP if task has allocated duration
      const taskDuration = allocatedDuration !== undefined ? allocatedDuration : task.allocatedDuration;
      const durationBonus = taskDuration ? Math.round(baseXP * 0.25) : 0;
      const totalPossibleXP = baseXP + durationBonus;

      await prisma.dayLog.upsert({
        where: {
          userId_date: {
            userId: user.id,
            date: taskDate,
          },
        },
        update: {
          possibleXP: { increment: totalPossibleXP },
        },
        create: {
          userId: user.id,
          date: taskDate,
          totalXP: 0,
          tasksDone: 0,
          possibleXP: totalPossibleXP,
        },
      });
    }

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error("Update task error:", error);

    // Handle Prisma P2025 error (record not found)
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: "Task not found. It may have been deleted or not yet saved." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}
