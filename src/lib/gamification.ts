import { TaskTier } from "../../prisma/generated/client";

export function tierBaseXP(tier: TaskTier) {
  switch (tier) {
    case "S": return 100;
    case "A": return 60;
    case "B": return 30;
    case "C": return 10;
  }
}

export function diminishingReturns(
  tier: TaskTier,
  countToday: number
) {
  if (tier === "C") return Math.max(0.1, 1 - countToday * 0.15);
  if (tier === "S") return Math.max(0.5, 1 - countToday * 0.1);
  return 1;
}

export function streakMultiplier(days: number) {
  return Math.min(1.2, 1 + days * 0.02);
}
