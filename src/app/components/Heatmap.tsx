"use client";

import { dayKey } from "@/lib/dates";

interface HeatmapLog {
  date: Date | string;
  totalXP: number;
}

/**
 * GitHub-style contribution heatmap of daily XP — the "git" in GIT GUD.
 * Renders the last `weeks` weeks, current week rightmost.
 */
export default function Heatmap({ dayLogs, weeks = 16 }: { dayLogs: HeatmapLog[]; weeks?: number }) {
  const xpByDay = new Map<string, number>();
  for (const log of dayLogs) {
    xpByDay.set(dayKey(new Date(log.date)), log.totalXP);
  }

  // Grid starts on the Sunday `weeks-1` weeks back.
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay() - (weeks - 1) * 7);

  const columns: Array<Array<{ key: string; xp: number; future: boolean }>> = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(start);
      cell.setDate(start.getDate() + w * 7 + d);
      const key = dayKey(cell);
      col.push({
        key,
        xp: xpByDay.get(key) ?? 0,
        future: cell.getTime() > today.getTime() && key !== dayKey(today),
      });
    }
    columns.push(col);
  }

  const levelCls = (xp: number) => {
    if (xp <= 0) return "bg-[var(--chip)]";
    if (xp < 50) return "bg-acc/30";
    if (xp < 150) return "bg-acc/55";
    if (xp < 300) return "bg-acc/80";
    return "bg-acc2 shadow-[0_0_6px_var(--glow)]";
  };

  const todayKey = dayKey(today);

  return (
    <div>
      <div className="flex gap-[3px] justify-between">
        {columns.map((col, w) => (
          <div key={w} className="flex flex-col gap-[3px] flex-1">
            {col.map((cell) => (
              <div
                key={cell.key}
                title={cell.future ? undefined : `${cell.key} — ${cell.xp} XP`}
                className={`aspect-square w-full rounded-[3px] ${
                  cell.future
                    ? "bg-transparent"
                    : `${levelCls(cell.xp)} ${cell.key === todayKey ? "ring-1 ring-acc2" : ""}`
                }`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-1.5 mt-2 text-[10px] text-ink3">
        <span>less</span>
        {["bg-[var(--chip)]", "bg-acc/30", "bg-acc/55", "bg-acc/80", "bg-acc2"].map((c) => (
          <span key={c} className={`w-2.5 h-2.5 rounded-[3px] ${c}`} />
        ))}
        <span>more</span>
      </div>
    </div>
  );
}
