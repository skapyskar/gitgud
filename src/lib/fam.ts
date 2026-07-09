import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dayStart } from "@/lib/dates";
import type { FamRole, FamActivityType } from "../../prisma/generated/client";

export { FAM_FREE_LIMIT, FAM_CREATION_COST, DEFAULT_INVITE_EXPIRY_DAYS } from "./fam-constants";

/** Fetch a user's membership row for a Fam, or null if they aren't a member. */
export async function getMembership(userId: string, famId: string) {
  return prisma.famMembership.findUnique({
    where: { userId_famId: { userId, famId } },
  });
}

/**
 * Require the caller to hold one of `allowed` roles in the given Fam.
 * Same shape convention as requireUser(): { membership } on success, { error } (ready NextResponse) on failure.
 */
export async function requireRole(
  userId: string,
  famId: string,
  allowed: FamRole[]
): Promise<
  | { membership: NonNullable<Awaited<ReturnType<typeof getMembership>>>; error?: undefined }
  | { membership?: undefined; error: NextResponse }
> {
  const membership = await getMembership(userId, famId);
  if (!membership) {
    return { error: NextResponse.json({ error: "Not a member of this Fam" }, { status: 403 }) };
  }
  if (!allowed.includes(membership.role)) {
    return { error: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  }
  return { membership };
}

/**
 * Atomically spend coins, race-safe via a conditional update (no read-then-write gap).
 * Returns true if the spend succeeded, false if the user didn't have enough coins.
 */
export async function spendCoins(userId: string, amount: number): Promise<boolean> {
  const result = await prisma.user.updateMany({
    where: { id: userId, coins: { gte: amount } },
    data: { coins: { decrement: amount } },
  });
  return result.count === 1;
}

/** Append one entry to a Fam's activity feed. Fire-and-forget from callers' perspective. */
export async function logActivity(
  famId: string,
  type: FamActivityType,
  message: string,
  actorId?: string
): Promise<void> {
  await prisma.famActivity.create({
    data: { famId, type, message, actorId: actorId ?? null },
  });
}

interface AchievementDef {
  key: string;
  label: string;
  check: (ctx: { fam: { xp: number }; memberCount: number; completedGoalCount: number }) => boolean;
}

/** Small fixed set of Fam-level achievements — no seasonal reset, no elaborate cabinet. */
export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { key: "FIRST_1000_POINTS", label: "First 1,000 Points", check: ({ fam }) => fam.xp >= 1000 },
  { key: "FIRST_10000_POINTS", label: "10,000 Points Club", check: ({ fam }) => fam.xp >= 10000 },
  { key: "SQUAD_OF_FIVE", label: "Squad of Five", check: ({ memberCount }) => memberCount >= 5 },
  { key: "FIRST_GOAL_COMPLETED", label: "Goal Getter", check: ({ completedGoalCount }) => completedGoalCount >= 1 },
];

/**
 * Evaluate all achievement definitions against a Fam's current state and unlock
 * any newly-earned ones (persisting + logging an activity entry). Call this after
 * events that could plausibly change the outcome (goal completed, member joined) —
 * it's cheap and idempotent (unique constraint on famId+key guards double-unlocks).
 */
export async function checkAndUnlockAchievements(famId: string): Promise<void> {
  const [xp, memberCount, completedGoalCount, alreadyUnlocked] = await Promise.all([
    famLifetimeXP(famId),
    prisma.famMembership.count({ where: { famId } }),
    prisma.famGoal.count({ where: { famId, status: "COMPLETED" } }),
    prisma.famAchievement.findMany({ where: { famId }, select: { key: true } }),
  ]);

  const unlockedKeys = new Set(alreadyUnlocked.map((a) => a.key));
  const ctx = { fam: { xp }, memberCount, completedGoalCount };

  for (const def of ACHIEVEMENT_DEFS) {
    if (unlockedKeys.has(def.key)) continue;
    if (!def.check(ctx)) continue;
    try {
      await prisma.famAchievement.create({ data: { famId, key: def.key } });
      await logActivity(famId, "ACHIEVEMENT_UNLOCKED", `Achievement unlocked: ${def.label}`);
    } catch {
      // Unique constraint race — another request already unlocked it, ignore.
    }
  }
}

/**
 * Live-computed per-day XP totals for a Fam across all its members, for the
 * trailing `days` window ending today. No background job / FamDailyStat writes
 * needed — DayLog is already the reliable, always-fresh source of truth.
 */
export async function famDailyTotals(
  famId: string,
  days: number,
  userIds?: string[]
): Promise<{ dailyTotals: number[]; memberCount: number; userIds: string[] }> {
  const today = dayStart();
  const start = new Date(today.getTime() - (days - 1) * 86_400_000);

  if (!userIds) {
    const memberIds = await prisma.famMembership.findMany({ where: { famId }, select: { userId: true } });
    userIds = memberIds.map((m) => m.userId);
  }

  const logs = await prisma.dayLog.findMany({
    where: { userId: { in: userIds }, date: { gte: start } },
    select: { date: true, totalXP: true },
  });

  const totalsByDay = new Map<string, number>();
  for (const log of logs) {
    const key = log.date.toISOString().slice(0, 10);
    totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + log.totalXP);
  }

  const dailyTotals: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000);
    dailyTotals.push(totalsByDay.get(d.toISOString().slice(0, 10)) ?? 0);
  }

  return { dailyTotals, memberCount: userIds.length, userIds };
}

export interface FamRankingScore {
  score: number;
  avgMomentum: number;
  consistencyPct: number;
  participationPct: number;
  stabilityPct: number;
}

/**
 * Weighted growth score — rewards consistent, long-term improvement rather
 * than raw points, so a new Fam can't buy rank #1 with a single huge day.
 * Combines: average daily momentum (7d), consistency (% of days active),
 * participation (% of members who contributed at least once), and stability
 * (inverse of day-to-day XP variance, so one spike doesn't dominate).
 */
export async function computeFamRankingScore(famId: string, days = 7): Promise<FamRankingScore> {
  const { dailyTotals, memberCount, userIds } = await famDailyTotals(famId, days);

  const avgMomentum = dailyTotals.reduce((s, v) => s + v, 0) / dailyTotals.length;
  const activeDays = dailyTotals.filter((v) => v > 0).length;
  const consistencyPct = (activeDays / dailyTotals.length) * 100;

  const activeMembers = await prisma.dayLog.groupBy({
    by: ["userId"],
    where: {
      userId: { in: userIds },
      date: { gte: new Date(dayStart().getTime() - (days - 1) * 86_400_000) },
      totalXP: { gt: 0 },
    },
  });
  const participationPct = memberCount > 0 ? (activeMembers.length / memberCount) * 100 : 0;

  const mean = avgMomentum;
  const variance = dailyTotals.reduce((s, v) => s + (v - mean) ** 2, 0) / dailyTotals.length;
  const stddev = Math.sqrt(variance);
  // Coefficient of variation, inverted and clamped — 100 = perfectly stable, 0 = wildly spiky.
  const cv = mean > 0 ? stddev / mean : 0;
  const stabilityPct = Math.max(0, 100 - Math.min(100, cv * 100));

  const score = avgMomentum * 0.4 + consistencyPct * 0.25 + participationPct * 0.2 + stabilityPct * 0.15;

  return { score, avgMomentum, consistencyPct, participationPct, stabilityPct };
}

/** Current calendar-month season, auto-created on first access. */
export async function getOrCreateCurrentSeason() {
  const now = new Date();
  const existing = await prisma.famSeason.findFirst({
    where: { startsAt: { lte: now }, endsAt: { gte: now } },
  });
  if (existing) return existing;

  const startsAt = new Date(now.getFullYear(), now.getMonth(), 1);
  const endsAt = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const label = startsAt.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  try {
    return await prisma.famSeason.create({ data: { label, startsAt, endsAt } });
  } catch {
    // Race with another request creating the same season — reload it.
    return prisma.famSeason.findFirstOrThrow({ where: { startsAt: { lte: now }, endsAt: { gte: now } } });
  }
}

/** Each member's total XP earned within the trailing `days` window — for the contribution pie chart. */
export async function famMemberContribution(
  famId: string,
  days: number
): Promise<Array<{ userId: string; label: string; total: number }>> {
  const today = dayStart();
  const start = new Date(today.getTime() - (days - 1) * 86_400_000);

  const members = await prisma.famMembership.findMany({
    where: { famId },
    include: { user: { select: { id: true, username: true, name: true } } },
  });

  const totals = await prisma.dayLog.groupBy({
    by: ["userId"],
    where: { userId: { in: members.map((m) => m.userId) }, date: { gte: start } },
    _sum: { totalXP: true },
  });
  const totalsMap = new Map(totals.map((t) => [t.userId, t._sum.totalXP ?? 0]));

  return members.map((m) => ({
    userId: m.user.id,
    label: m.user.username ? `@${m.user.username}` : m.user.name || "Member",
    total: totalsMap.get(m.user.id) ?? 0,
  }));
}

/** Completed-task category breakdown across all of a Fam's members — for the habit distribution chart. */
export async function famHabitDistribution(famId: string): Promise<Array<{ category: string; count: number }>> {
  const members = await prisma.famMembership.findMany({ where: { famId }, select: { userId: true } });
  const counts = await prisma.task.groupBy({
    by: ["category"],
    where: { userId: { in: members.map((m) => m.userId) }, isCompleted: true },
    _count: { _all: true },
  });
  return counts.map((c) => ({ category: c.category, count: c._count._all }));
}

/**
 * Lifetime Fam XP, computed live as the sum of its members' `User.xp`.
 * The `Fam.xp`/`Fam.level` schema fields exist but are never incremented
 * anywhere (task completion isn't coupled to Fam membership — see the
 * earlier decision to keep Fam stats derived from User/DayLog, not a
 * separately-maintained counter) — this is the actual source of truth
 * for anything that needs a real, current lifetime total.
 */
export async function famLifetimeXP(famId: string): Promise<number> {
  const members = await prisma.famMembership.findMany({
    where: { famId },
    include: { user: { select: { xp: true } } },
  });
  return members.reduce((sum, m) => sum + m.user.xp, 0);
}

/** Sum of a Fam's members' XP earned within a season's date range. */
export async function getFamSeasonScore(famId: string, seasonId: string): Promise<number> {
  const season = await prisma.famSeason.findUniqueOrThrow({ where: { id: seasonId } });
  const memberIds = (await prisma.famMembership.findMany({ where: { famId }, select: { userId: true } })).map(
    (m) => m.userId
  );
  const agg = await prisma.dayLog.aggregate({
    where: { userId: { in: memberIds }, date: { gte: season.startsAt, lte: season.endsAt } },
    _sum: { totalXP: true },
  });
  return agg._sum.totalXP ?? 0;
}
