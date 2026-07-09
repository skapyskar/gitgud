/**
 * Date helpers — all "which day is it" logic lives here so the
 * client and API agree on day boundaries (local server time).
 */

/** Local-midnight Date for the day containing `d` (defaults to now). */
export function dayStart(d: Date = new Date()): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

/** YYYY-MM-DD key in local time. */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isSameDay(a: Date | string, b: Date | string): boolean {
  return dayKey(new Date(a)) === dayKey(new Date(b));
}

/** Whole days from a → b (local midnights). */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((dayStart(b).getTime() - dayStart(a).getTime()) / 86_400_000);
}

/** Today's Date at a given "HH:MM" local time. */
export function todayAt(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

/** Minutes from now until a Date (floored, min 0). */
export function minutesUntil(target: Date, from: Date = new Date()): number {
  return Math.max(0, Math.floor((target.getTime() - from.getTime()) / 60_000));
}

/** Day-of-week index (0 = Sunday) for repeatDays matching. */
export function todayDayIndex(): number {
  return new Date().getDay();
}
