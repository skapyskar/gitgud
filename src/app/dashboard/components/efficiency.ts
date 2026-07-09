/** Shared efficiency math for the graphs — earned XP vs possible XP per day. */

export interface DayLogLike {
  date: Date | string;
  totalXP: number;
  tasksDone: number;
  possibleXP?: number;
}

export function efficiencyOf(log: DayLogLike): number {
  // Legacy rows may predate possibleXP tracking; approximate from tasksDone.
  const possible = log.possibleXP ?? (log.tasksDone > 0 ? log.tasksDone * 30 : 0);
  if (possible <= 0) return 100; // nothing scheduled = nothing missed
  return Math.min(100, (log.totalXP / possible) * 100);
}

export function possibleOf(log: DayLogLike): number {
  return log.possibleXP ?? (log.tasksDone > 0 ? log.tasksDone * 30 : 0);
}
