import { TaskTier } from "../../prisma/generated/client";

/**
 * Base XP values by tier
 * S = Critical tasks (projects, exams)
 * A = Important tasks (coding, DSA)
 * B = Maintenance tasks (assignments, classes)
 * C = Chores (laundry, emails)
 */
export function tierBaseXP(tier: TaskTier): number {
  switch (tier) {
    case "S": return 100; // Keep your higher rewards
    case "A": return 60;
    case "B": return 30;
    case "C": return 10;
    default: return 10;
  }
}

/**
 * Diminishing returns to prevent spam/grinding
 * Applies per-tier, per-day
 */
export function diminishingReturns(
  tier: TaskTier,
  countToday: number
): number {
  // C-tier: Harsh diminishing (spam protection)
  // Full XP for first 5, then drops sharply
  if (tier === "C") {
    if (countToday >= 10) return 0.1;  // 10% after 10 tasks
    if (countToday >= 5) return 0.3;   // 30% after 5 tasks
    return 1.0;                         // 100% for first 5
  }
  
  // S-tier: Light diminishing (encourage variety)
  // Prevent grinding only S-tier tasks
  if (tier === "S") {
    if (countToday >= 3) return 0.7;   // 70% after 3 tasks
    return 1.0;                         // 100% for first 3
  }
  
  // A/B tier: No diminishing
  // Reward consistent important work
  return 1.0;
}

/**
 * Streak multiplier for consecutive days
 * Encourages daily engagement
 */
export function streakMultiplier(streakDays: number): number {
  if (streakDays >= 30) return 2.0;  // 2x XP at 30+ days
  if (streakDays >= 14) return 1.5;  // 1.5x at 2 weeks
  if (streakDays >= 7) return 1.3;   // 1.3x at 1 week
  if (streakDays >= 3) return 1.1;   // 1.1x at 3 days
  return 1.0;                         // Base multiplier
}

/**
 * Calculate final XP with all modifiers
 * Usage: calculateFinalXP("S", 2, 7) => S-tier, 2nd task today, 7-day streak
 */
export function calculateFinalXP(
  tier: TaskTier,
  tierCountToday: number,
  streakDays: number
): number {
  const base = tierBaseXP(tier);
  const diminished = base * diminishingReturns(tier, tierCountToday);
  const withStreak = diminished * streakMultiplier(streakDays);
  return Math.round(withStreak);
}
