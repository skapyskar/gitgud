"use server";

import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { calculateFinalXP } from "@/lib/gamification"; // ✅ USE THE HELPER FUNCTION

export async function completeTask(taskId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      throw new Error("Unauthorized - Please log in");
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { dayLogs: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const task = await prisma.task.findUnique({ 
      where: { id: taskId },
    });

    if (!task) {
      throw new Error("Task not found");
    }

    if (task.userId !== user.id) {
      throw new Error("Unauthorized - Not your task");
    }

    if (task.isCompleted) {
      return { success: false, error: "Task already completed" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayLog = await prisma.dayLog.upsert({
      where: {
        userId_date: { userId: user.id, date: today },
      },
      update: {},
      create: {
        userId: user.id,
        date: today,
      },
    });

    // Get tier count for diminishing returns calculation
    const tierCount =
      task.tier === "C" ? dayLog.cTierCount :
      task.tier === "S" ? dayLog.sTierCount : 0;

    // ✅ USE THE UNIFIED CALCULATION FUNCTION
    const finalXP = calculateFinalXP(task.tier, tierCount, user.streakDays);

    // Calculate new streak
    const lastTaskDate = user.lastTaskDate ? new Date(user.lastTaskDate) : null;
    let newStreakDays = user.streakDays;
    
    if (!lastTaskDate) {
      newStreakDays = 1; // First task ever
    } else {
      const lastTaskDateOnly = new Date(lastTaskDate);
      lastTaskDateOnly.setHours(0, 0, 0, 0);
      
      if (lastTaskDateOnly.getTime() === today.getTime()) {
        // Same day - keep streak
        newStreakDays = user.streakDays;
      } else if (lastTaskDateOnly.getTime() === today.getTime() - 86400000) {
        // Yesterday - increment streak
        newStreakDays = user.streakDays + 1;
      } else {
        // Streak broken - reset to 1
        newStreakDays = 1;
      }
    }

    await prisma.$transaction([
      prisma.task.update({
        where: { id: taskId },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          finalPoints: finalXP,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          xp: { increment: finalXP },
          streakDays: newStreakDays,
          lastTaskDate: today,
        },
      }),
      prisma.dayLog.update({
        where: { id: dayLog.id },
        data: {
          totalXP: { increment: finalXP },
          tasksDone: { increment: 1 },
          cTierCount: task.tier === "C" ? { increment: 1 } : undefined,
          sTierCount: task.tier === "S" ? { increment: 1 } : undefined,
          streakAtEnd: newStreakDays,
        },
      }),
    ]);

    revalidatePath("/dashboard");
    
    return { success: true, xpGained: finalXP };
  } catch (error) {
    console.error("Error completing task:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to complete task" 
    };
  }
}
