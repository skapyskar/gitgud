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
    const { taskId, isWeeklyBonus } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID required" }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Calculate XP reward using gamification system
    const baseXP = tierBaseXP(task.tier);
    const streakBonus = streakMultiplier(user.streakDays);
    const weeklyBonus = isWeeklyBonus ? 10 : 0;
    
    // Calculate final XP: base * streak + weekly bonus
    const totalXP = Math.round(baseXP * streakBonus) + weeklyBonus;

    // Update streak logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastTaskDate = user.lastTaskDate ? new Date(user.lastTaskDate) : null;
    lastTaskDate?.setHours(0, 0, 0, 0);
    
    let newStreakDays = user.streakDays;
    
    if (!lastTaskDate || lastTaskDate.getTime() !== today.getTime()) {
      // First task of the day
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

    // Update task and user in a transaction
    await prisma.$transaction([
      prisma.task.update({
        where: { id: taskId },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          isBonus: isWeeklyBonus || false,
          finalPoints: totalXP,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          xp: { increment: totalXP },
          level: { 
            set: Math.floor(1 + Math.sqrt((user.xp + totalXP) / 100))
          },
          streakDays: newStreakDays,
          lastTaskDate: today,
        },
      }),
    ]);

    return NextResponse.json({ 
      success: true, 
      xpGained: totalXP,
      baseXP,
      streakBonus: streakBonus > 1 ? Math.round(baseXP * (streakBonus - 1)) : 0,
      weeklyBonus,
      newStreak: newStreakDays,
    });
  } catch (error) {
    console.error("Complete task error:", error);
    return NextResponse.json(
      { error: "Failed to complete task" },
      { status: 500 }
    );
  }
}
