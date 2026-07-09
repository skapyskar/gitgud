import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import {
  computeTaskReward,
  levelFromXP,
  possibleXPForTask,
  rankForLevel,
  streakMultiplier,
} from "@/lib/gamification";
import { dayStart, daysBetween, todayAt } from "@/lib/dates";
import type { Task } from "../../../../../prisma/generated/client";

/**
 * Complete a task (or one tick of a multi-frequency task).
 *
 * Accepts either a normal task id or a WEEKLY template id. Templates are
 * never marked completed themselves — completing one spawns/updates a
 * per-day instance linked via templateId, so the habit resets tomorrow.
 */
export async function POST(request: Request) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const body = await request.json();
    const { taskId, durationMet } = body;
    if (!taskId) {
      return NextResponse.json({ error: "Task ID required" }, { status: 400 });
    }

    const source = await prisma.task.findFirst({
      where: { id: taskId, userId: user.id },
    });
    if (!source) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const today = dayStart();
    const tomorrow = new Date(today.getTime() + 86_400_000);

    // Resolve the actual task row we complete against.
    let task: Task | null = source;
    let spawnFromTemplate = false;

    if (source.type === "WEEKLY") {
      task = await prisma.task.findFirst({
        where: {
          userId: user.id,
          templateId: source.id,
          scheduledDate: { gte: today, lt: tomorrow },
        },
      });
      spawnFromTemplate = !task;
    }

    const isWeekly = source.type === "WEEKLY" || !!source.templateId;
    const frequency = (task ?? source).frequency || 1;
    const completedFrequency = task?.completedFrequency ?? 0;

    if (task?.isCompleted) {
      return NextResponse.json(
        { error: "Task already completed", alreadyCompleted: true },
        { status: 400 }
      );
    }

    const remaining = frequency - completedFrequency;
    const count = Math.min(Math.max(1, body.count || 1), remaining);
    const newCompletedFrequency = completedFrequency + count;
    const isFullyCompleted = newCompletedFrequency >= frequency;

    // Diminishing returns need today's completed count for this tier.
    const todayLog = await prisma.dayLog.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
    });
    const tier = source.tier;
    const tierCountToday =
      tier === "C" ? todayLog?.cTierCount ?? 0 : tier === "S" ? todayLog?.sTierCount ?? 0 : 0;

    // Streak: any completion today counts as activity.
    let newStreakDays = user.streakDays;
    if (!user.lastTaskDate) {
      newStreakDays = 1;
    } else {
      const diff = daysBetween(new Date(user.lastTaskDate), today);
      if (diff === 1) newStreakDays = user.streakDays + 1;
      else if (diff > 1) newStreakDays = 1;
    }

    const reward = computeTaskReward({
      tier,
      tierCountToday,
      streakDays: newStreakDays,
      fraction: count / frequency,
      durationMet: !!durationMet,
      isWeekly,
    });

    const newXP = user.xp + reward.totalXP;
    const levelBefore = levelFromXP(user.xp);
    const levelAfter = levelFromXP(newXP);

    // Instance data if we're spawning one from a template today.
    const instanceData = spawnFromTemplate
      ? {
          userId: user.id,
          templateId: source.id,
          title: source.title,
          description: source.description,
          type: "DAILY" as const,
          tier: source.tier,
          category: source.category,
          plannedDate: today,
          scheduledDate: today,
          deadlineTime: source.deadlineTime
            ? todayAt(
                `${new Date(source.deadlineTime).getHours()}:${new Date(
                  source.deadlineTime
                ).getMinutes()}`
              )
            : null,
          allocatedDuration: source.allocatedDuration,
          frequency,
          completedFrequency: newCompletedFrequency,
          isCompleted: isFullyCompleted,
          completedAt: isFullyCompleted ? new Date() : null,
          isBonus: true,
          finalPoints: reward.totalXP,
          durationMet: !!durationMet,
        }
      : null;

    await prisma.$transaction([
      instanceData
        ? prisma.task.create({ data: instanceData })
        : prisma.task.update({
            where: { id: (task ?? source).id },
            data: {
              isCompleted: isFullyCompleted,
              completedFrequency: newCompletedFrequency,
              completedAt: isFullyCompleted ? new Date() : null,
              isBonus: isWeekly,
              finalPoints: { increment: reward.totalXP },
              durationMet: !!durationMet,
            },
          }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          xp: newXP,
          coins: { increment: reward.coins },
          level: levelAfter,
          streakDays: newStreakDays,
          multiplier: streakMultiplier(newStreakDays),
          lastTaskDate: today,
        },
      }),
      prisma.dayLog.upsert({
        where: { userId_date: { userId: user.id, date: today } },
        update: {
          totalXP: { increment: reward.totalXP },
          tasksDone: { increment: isFullyCompleted ? 1 : 0 },
          cTierCount: { increment: tier === "C" && isFullyCompleted ? 1 : 0 },
          sTierCount: { increment: tier === "S" && isFullyCompleted ? 1 : 0 },
          streakAtEnd: newStreakDays,
        },
        create: {
          userId: user.id,
          date: today,
          totalXP: reward.totalXP,
          tasksDone: isFullyCompleted ? 1 : 0,
          possibleXP: possibleXPForTask(tier, !!source.allocatedDuration),
          cTierCount: tier === "C" && isFullyCompleted ? 1 : 0,
          sTierCount: tier === "S" && isFullyCompleted ? 1 : 0,
          streakAtEnd: newStreakDays,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      xpGained: reward.totalXP,
      coinsGained: reward.coins,
      breakdown: {
        baseXP: reward.baseXP,
        streakBonus: reward.streakBonusXP,
        durationBonus: reward.durationBonusXP,
        weeklyBonus: reward.weeklyBonusXP,
      },
      newStreak: newStreakDays,
      levelBefore,
      levelAfter,
      leveledUp: levelAfter > levelBefore,
      rank: rankForLevel(levelAfter).title,
      isFullyCompleted,
      newCompletedFrequency,
    });
  } catch (err) {
    console.error("Complete task error:", err);
    return NextResponse.json({ error: "Failed to complete task" }, { status: 500 });
  }
}
