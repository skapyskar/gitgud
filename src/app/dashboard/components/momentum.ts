import { dayKey } from "@/lib/dates";

export interface DayLogLike {
  date: Date | string;
  totalXP: number;
}

/** date-key → totalXP for quick day lookups, missing days default to 0. */
export function buildDayMap(dayLogs: DayLogLike[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const log of dayLogs) map.set(dayKey(new Date(log.date)), log.totalXP);
  return map;
}

/** Trailing `n` days of XP ending today, oldest first. */
export function trailingDays(dayMap: Map<string, number>, n: number): number[] {
  const out: number[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(dayMap.get(dayKey(d)) ?? 0);
  }
  return out;
}

/** Catmull-Rom smoothed SVG path through evenly-spaced points. */
export function smoothPath(values: number[], width: number, height: number, padTop = 12, padBottom = 32) {
  const gmax = Math.max(1, ...values);
  const x = (i: number) => (i / Math.max(1, values.length - 1)) * width;
  const y = (v: number) => height - padBottom - (v / gmax) * (height - padTop - padBottom);
  const pts = values.map((v, i) => [x(i), y(v)] as [number, number]);

  let line = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    line += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  const area = `${line}L${width},${height}L0,${height}Z`;
  return { line, area, points: pts, y };
}
