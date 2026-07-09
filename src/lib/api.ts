import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { possibleXPForTask } from "@/lib/gamification";
import { dayStart, todayDayIndex } from "@/lib/dates";
import type { User } from "../../prisma/generated/client";

/**
 * Resolve the authenticated user for an API route.
 * Returns { user } on success or { error } (a ready NextResponse) on failure.
 */
export async function requireUser(): Promise<
  { user: User; error?: undefined } | { user?: undefined; error: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return { error: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  }
  return { user };
}

/**
 * Make sure today's DayLog exists and — once per day — add the XP that
 * today's active weekly templates make possible. Idempotent and race-safe:
 * the seeding update only fires while weeklySeeded is still false.
 */
export async function ensureTodayLog(userId: string): Promise<void> {
  const today = dayStart();

  await prisma.dayLog.upsert({
    where: { userId_date: { userId, date: today } },
    update: {},
    create: { userId, date: today, totalXP: 0, tasksDone: 0, possibleXP: 0 },
  });

  const templates = await prisma.task.findMany({
    where: { userId, type: "WEEKLY" },
    select: { tier: true, allocatedDuration: true, repeatDays: true },
  });

  const dow = todayDayIndex();
  const weeklyPossible = templates
    .filter((t) => t.repeatDays?.split(",").map(Number).includes(dow))
    .reduce((sum, t) => sum + possibleXPForTask(t.tier, !!t.allocatedDuration), 0);

  await prisma.dayLog.updateMany({
    where: { userId, date: today, weeklySeeded: false },
    data: { possibleXP: { increment: weeklyPossible }, weeklySeeded: true },
  });
}
