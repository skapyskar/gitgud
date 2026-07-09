import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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
  const [fam, memberCount, completedGoalCount, alreadyUnlocked] = await Promise.all([
    prisma.fam.findUniqueOrThrow({ where: { id: famId }, select: { xp: true } }),
    prisma.famMembership.count({ where: { famId } }),
    prisma.famGoal.count({ where: { famId, status: "COMPLETED" } }),
    prisma.famAchievement.findMany({ where: { famId }, select: { key: true } }),
  ]);

  const unlockedKeys = new Set(alreadyUnlocked.map((a) => a.key));
  const ctx = { fam, memberCount, completedGoalCount };

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
