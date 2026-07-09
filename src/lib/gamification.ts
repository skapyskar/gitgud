import { TaskTier } from "../../prisma/generated/client";

/**
 * ──────────────────────────────────────────────────────────────
 *  GAMIFICATION CORE — the single source of truth.
 *  Every XP / level / coin number in the app comes from here.
 *  Never duplicate these tables in components or routes.
 * ──────────────────────────────────────────────────────────────
 */

/** Base XP by tier. S = critical, A = important, B = maintenance, C = chores. */
export function tierBaseXP(tier: TaskTier): number {
  switch (tier) {
    case "S": return 100;
    case "A": return 60;
    case "B": return 30;
    case "C": return 10;
    default: return 10;
  }
}

export const TIER_LABELS: Record<TaskTier, string> = {
  S: "Critical",
  A: "Important",
  B: "Maintenance",
  C: "Chore",
};

/** Flat XP bonus for completing a weekly (habit) task on its scheduled day. */
export const WEEKLY_BONUS_XP = 10;

/** Multiplier applied when a task is finished within its allocated duration. */
export const DURATION_BONUS_MULTIPLIER = 1.25;

/**
 * Diminishing returns to prevent grinding, applied per-tier per-day.
 * `countToday` = fully completed tasks of this tier already logged today.
 */
export function diminishingReturns(tier: TaskTier, countToday: number): number {
  if (tier === "C") {
    if (countToday >= 10) return 0.1;
    if (countToday >= 5) return 0.3;
    return 1.0;
  }
  if (tier === "S") {
    if (countToday >= 3) return 0.7;
    return 1.0;
  }
  return 1.0; // A/B: reward consistent important work
}

/** Streak multiplier for consecutive active days. */
export function streakMultiplier(streakDays: number): number {
  if (streakDays >= 30) return 2.0;
  if (streakDays >= 14) return 1.5;
  if (streakDays >= 7) return 1.3;
  if (streakDays >= 3) return 1.1;
  return 1.0;
}

/** The next streak milestone, for "3 days until x1.5" style UI. */
export function nextStreakMilestone(streakDays: number): { days: number; multiplier: number } | null {
  if (streakDays < 3) return { days: 3, multiplier: 1.1 };
  if (streakDays < 7) return { days: 7, multiplier: 1.3 };
  if (streakDays < 14) return { days: 14, multiplier: 1.5 };
  if (streakDays < 30) return { days: 30, multiplier: 2.0 };
  return null;
}

/* ── Level curve ────────────────────────────────────────────────
 * xpForLevel(n) = 500 · (n−1)²   (level 1 → 0, 2 → 500, 3 → 2000, 4 → 4500 …)
 * Quadratic keeps early levels fast and later levels prestigious.
 */

export function xpForLevel(level: number): number {
  return 500 * Math.pow(Math.max(0, level - 1), 2);
}

export function levelFromXP(xp: number): number {
  return Math.floor(1 + Math.sqrt(Math.max(0, xp) / 500));
}

/** Progress inside the current level, for progress bars. */
export function levelProgress(xp: number): {
  level: number;
  currentLevelXP: number;   // XP earned inside this level
  neededLevelXP: number;    // XP span of this level
  remaining: number;        // XP left until next level
  percent: number;          // 0–100
} {
  const level = levelFromXP(xp);
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  const currentLevelXP = xp - floor;
  const neededLevelXP = ceil - floor;
  return {
    level,
    currentLevelXP,
    neededLevelXP,
    remaining: neededLevelXP - currentLevelXP,
    percent: Math.min(100, Math.round((currentLevelXP / neededLevelXP) * 100)),
  };
}

/* ── Ranks ── operator titles unlocked by level ── */

const RANKS: Array<{ minLevel: number; title: string }> = [
  { minLevel: 1, title: "Script Kiddie" },
  { minLevel: 3, title: "Code Cadet" },
  { minLevel: 5, title: "Branch Wrangler" },
  { minLevel: 8, title: "Merge Sergeant" },
  { minLevel: 12, title: "Refactor Ronin" },
  { minLevel: 17, title: "Kernel Knight" },
  { minLevel: 23, title: "System Architect" },
  { minLevel: 30, title: "Root Overlord" },
  { minLevel: 40, title: "The Compiler" },
];

export function rankForLevel(level: number): { title: string; next: { title: string; atLevel: number } | null } {
  let current = RANKS[0];
  let next: { title: string; atLevel: number } | null = null;
  for (let i = 0; i < RANKS.length; i++) {
    if (level >= RANKS[i].minLevel) {
      current = RANKS[i];
      next = RANKS[i + 1] ? { title: RANKS[i + 1].title, atLevel: RANKS[i + 1].minLevel } : null;
    }
  }
  return { title: current.title, next };
}

/** Coins earned alongside XP (spendable currency, 1 coin per 10 XP). */
export function coinsForXP(xp: number): number {
  return Math.floor(Math.max(0, xp) / 10);
}

/* ── Task reward computation ── */

export interface TaskRewardInput {
  tier: TaskTier;
  /** Fully-completed tasks of this tier already logged today (for diminishing returns). */
  tierCountToday: number;
  streakDays: number;
  /** Fraction of the task being completed now (frequency ticks), 0–1. */
  fraction?: number;
  /** Completed within the allocated duration? */
  durationMet?: boolean;
  /** Is this a weekly (habit) task completed on its scheduled day? */
  isWeekly?: boolean;
}

export interface TaskReward {
  baseXP: number;          // proportional tier XP after diminishing returns
  streakBonusXP: number;   // extra XP from the streak multiplier
  durationBonusXP: number; // extra XP from finishing on time
  weeklyBonusXP: number;   // flat habit bonus (proportional to fraction)
  totalXP: number;
  coins: number;
}

export function computeTaskReward(input: TaskRewardInput): TaskReward {
  const fraction = Math.min(1, Math.max(0, input.fraction ?? 1));
  const raw = tierBaseXP(input.tier) * fraction;
  const base = raw * diminishingReturns(input.tier, input.tierCountToday);

  const streakMult = streakMultiplier(input.streakDays);
  const durationMult = input.durationMet ? DURATION_BONUS_MULTIPLIER : 1.0;

  const baseXP = Math.round(base);
  const withStreak = base * streakMult;
  const withDuration = withStreak * durationMult;
  const weeklyBonusXP = input.isWeekly ? Math.round(WEEKLY_BONUS_XP * fraction) : 0;

  const totalXP = Math.round(withDuration) + weeklyBonusXP;

  return {
    baseXP,
    streakBonusXP: Math.round(withStreak - base),
    durationBonusXP: Math.round(withDuration - withStreak),
    weeklyBonusXP,
    totalXP,
    coins: coinsForXP(totalXP),
  };
}

/** Max XP a task can be worth (used for DayLog.possibleXP / efficiency). */
export function possibleXPForTask(tier: TaskTier, hasAllocatedDuration: boolean): number {
  const base = tierBaseXP(tier);
  return base + (hasAllocatedDuration ? Math.round(base * (DURATION_BONUS_MULTIPLIER - 1)) : 0);
}
