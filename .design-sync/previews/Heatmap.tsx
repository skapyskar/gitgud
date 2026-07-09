import { Heatmap } from "gitgud";

// Deterministic synthetic activity: ~4 months of daily XP with streaks and gaps.
const logs = Array.from({ length: 112 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - i);
  const wave = Math.round(180 + 170 * Math.sin(i / 5) + ((i * 37) % 90));
  return { date, totalXP: i % 11 === 3 || i % 17 === 8 ? 0 : wave };
});

export const CommitHistory = () => (
  <div className="glass r-xl p-5" style={{ width: 460 }}>
    <span className="text-[11px] font-semibold tracking-widest text-ink3 uppercase block mb-3">
      Commit history
    </span>
    <Heatmap dayLogs={logs} weeks={16} />
  </div>
);
