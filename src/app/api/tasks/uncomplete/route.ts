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

    // Check frequency state
    const completedFrequency = task.completedFrequency || 1; // Default to 1 if 0/null to avoid divide by zero, though logically should be >0 if we are uncompleting
    const frequency = task.frequency || 1;

    // How many to uncomplete? Default 1.
    const countToRemove = Math.min(Math.max(1, body.count || 1), completedFrequency);

    if (completedFrequency === 0) {
      return NextResponse.json({ error: "Task has no progress to undo" }, { status: 400 });
    }

    // XP to remove: Average of current points
    // If completedFrequency is 5, and finalPoints is 100, we remove 20 per tick.
    const currentTotalPoints = task.finalPoints || 0;
    const xpToRemove = Math.round((currentTotalPoints / completedFrequency) * countToRemove);

    const newCompletedFrequency = completedFrequency - countToRemove;
    const isNowCompleted = newCompletedFrequency >= frequency; // Should be false usually if we uncompleted, unless we uncompleted 0? 

    // Get the date for DayLog update (use completedAt or scheduledDate)
    const taskDate = task.completedAt || task.scheduledDate || new Date();
    const dayLogDate = new Date(taskDate);
    dayLogDate.setHours(0, 0, 0, 0);

    // Update task, user, and DayLog in a transaction
    await prisma.$transaction([
      prisma.task.update({
        where: { id: taskId },
        data: {
          isCompleted: false, // Always false if we are uncompleting? 
          // Wait, if I had 5/5 (Completed), and I uncomplete 1, I have 4/5. isCompleted = false.
          // If I had 4/5 (Not Completed), and I uncomplete 1, I have 3/5. isCompleted = false.
          // So yes, if we uncomplete, it usually becomes not completed (unless it was > frequency? Unlikely).
          // But purely, it should be based on new frequency.
          // Since newCompletedFrequency < frequency (because we subtracted), it is NOT completed.

          completedFrequency: newCompletedFrequency,
          completedAt: null, // If it stands partially completed, is it "completedAt"? No.
          isBonus: false, // Reset bonus flag if we uncomplete? Maybe only if new frequency is 0? 
          // Actually, if we just uncomplete 1 tick of a 5-tick weekly bonus task, is it still a bonus task?
          // The `isBonus` flag usually marks if the *Final* completion was a bonus.
          // So if we uncomplete, we lose the "Completed" status, so yes, reset isBonus.

          finalPoints: { decrement: xpToRemove },
          durationMet: false, // Reset duration met? If partially done? 
          // If we uncomplete, we probably want to reset these status flags until full completion again.
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
          // Only decrement tasksDone if it WAS completed and now is NOT.
          // If it was 5/5 (Completed) -> 4/5 (Not Completed), decrement tasksDone.
          // If it was 3/5 (Not Completed) -> 2/5 (Not Completed), DO NOT decrement tasksDone.
          ...(task.isCompleted ? { tasksDone: { decrement: 1 } } : {}),
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
