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
    const { title, type, tier, category, deadline, scheduledDate, repeatDays, deadlineTime, allocatedDuration } = body;

    // Validate required fields
    if (!title || !type) {
      return NextResponse.json(
        { error: "Title and type are required" },
        { status: 400 }
      );
    }

    // Create the task
    const task = await prisma.task.create({
      data: {
        userId: user.id,
        title,
        type,
        tier: tier || "C",
        category: category || "LIFE",
        deadline: deadline ? new Date(deadline) : null,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        plannedDate: scheduledDate ? new Date(scheduledDate) : new Date(),
        repeatDays: repeatDays || null,
        deadlineTime: deadlineTime ? new Date(deadlineTime) : null,
        allocatedDuration: allocatedDuration || null,
      },
    });

    // For DAILY tasks, update DayLog to track possibleXP (for efficiency calculation)
    if (type === "DAILY" && scheduledDate) {
      const taskDate = new Date(scheduledDate);
      taskDate.setHours(0, 0, 0, 0);
      const baseXP = tierBaseXP(tier || "C");
      // Include duration bonus (25%) in possibleXP if task has allocated duration
      const durationBonus = allocatedDuration ? Math.round(baseXP * 0.25) : 0;
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
  } catch (error) {
    console.error("Create task error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
