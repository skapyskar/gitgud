import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { tierBaseXP, streakMultiplier } from "@/lib/gamification";

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
    const { taskId, isWeeklyBonus, durationMet } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID required" }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Prevent XP farming: Check if task is already completed
    if (task.isCompleted) {
      return NextResponse.json({
        error: "Task already completed",
        alreadyCompleted: true
      }, { status: 400 });
    }

    // Calculate XP reward using gamification system
    // Check frequency progress
    const frequency = task.frequency || 1;
    const completedFrequency = task.completedFrequency || 0;
    // Default to completing 1 tick if not specified, or clamp to remaining
    const remaining = frequency - completedFrequency;
    const countToComplete = Math.min(Math.max(1, body.count || 1), remaining);

    // Calculate new completion state
    const newCompletedFrequency = completedFrequency + countToComplete;
    const isFullyCompleted = newCompletedFrequency >= frequency;

    // Calculate XP reward using gamification system
    const baseXP = tierBaseXP(task.tier);
    // XP is proportional to the fraction completed
    const fraction = countToComplete / frequency;
    const proportionalXP = Math.round(baseXP * fraction);

    const streakBonus = streakMultiplier(user.streakDays);
    // Weekly bonus is also proportional? No, usually flat bonus. Let's make it proportional to avoid exploits.
    const weeklyBonus = isWeeklyBonus ? Math.round(10 * fraction) : 0;

    // Calculate duration bonus (25% extra if task was completed within allocated duration)
    // Duration bonus applies to the chunk being completed
    const durationBonusMultiplier = durationMet ? 1.25 : 1.0;

    // Calculate final XP: (base * streak * duration bonus) + weekly bonus
    // We apply streak bonus to the proportional base XP
    const totalXP = Math.round(proportionalXP * streakBonus * durationBonusMultiplier) + weeklyBonus;

    // Update streak logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastTaskDate = user.lastTaskDate ? new Date(user.lastTaskDate) : null;
    lastTaskDate?.setHours(0, 0, 0, 0);

    let newStreakDays = user.streakDays;

    if (!lastTaskDate || lastTaskDate.getTime() !== today.getTime()) {
      // First task of the day (any chunk counts as activity)
      if (lastTaskDate) {
        const daysDiff = Math.floor((today.getTime() - lastTaskDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff === 1) {
          // Consecutive day
          newStreakDays = user.streakDays + 1;
        } else if (daysDiff > 1) {
          // Streak broken
          newStreakDays = 1;
        }
        // If daysDiff === 0, same day, keep streak
      } else {
        // First task ever
        newStreakDays = 1;
      }
    }

    // Update task, user, and upsert DayLog in a transaction
    await prisma.$transaction([
      prisma.task.update({
        where: { id: taskId },
        data: {
          isCompleted: isFullyCompleted,
          completedFrequency: newCompletedFrequency,
          completedAt: isFullyCompleted ? new Date() : undefined, // Only set completedAt when fully done? Or last activity? Let's say when fully one.
          isBonus: isWeeklyBonus || false, // This tracks if it WAS a bonus task.
          finalPoints: { increment: totalXP }, // Accumulate points
          durationMet: durationMet || false, // This might be tricky if mixed.
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          xp: { increment: totalXP },
          level: {
            set: Math.floor(1 + Math.sqrt((user.xp + totalXP) / 500))
          },
          streakDays: newStreakDays,
          lastTaskDate: today,
        },
      }),
      prisma.dayLog.upsert({
        where: {
          userId_date: {
            userId: user.id,
            date: today,
          },
        },
        update: {
          totalXP: { increment: totalXP },
          // Only increment tasksDone if fully completed
          tasksDone: { increment: isFullyCompleted ? 1 : 0 },

          // For WEEKLY tasks, add to possibleXP if not already added?
          // The possibleXP logic for weekly tasks is handled in create/update or purely implicit?
          // In create route, it is added.
          // If we add fractional XP, we don't need to change possibleXP in DayLog, just realized.
          // possibleXP represents total potential. That is set when task appears.
          // So no change to possibleXP needed here.
        },
        create: {
          userId: user.id,
          date: today,
          totalXP: totalXP,
          tasksDone: isFullyCompleted ? 1 : 0,
          possibleXP: baseXP + (task.allocatedDuration ? Math.round(baseXP * 0.25) : 0), // Include duration bonus
          cTierCount: task.tier === 'C' && isFullyCompleted ? 1 : 0,
          sTierCount: task.tier === 'S' && isFullyCompleted ? 1 : 0,
          streakAtEnd: newStreakDays,
        },
      }),
    ]);

    const durationBonusAmount = durationMet ? Math.round(proportionalXP * streakBonus * 0.25) : 0;

    return NextResponse.json({
      success: true,
      xpGained: totalXP,
      baseXP: proportionalXP,
      streakBonus: streakBonus > 1 ? Math.round(proportionalXP * (streakBonus - 1)) : 0,
      weeklyBonus,
      durationBonus: durationBonusAmount,
      newStreak: newStreakDays,
      isFullyCompleted,
      newCompletedFrequency
    });
  } catch (error) {
    console.error("Complete task error:", error);
    return NextResponse.json(
      { error: "Failed to complete task" },
      { status: 500 }
    );
  }
}
