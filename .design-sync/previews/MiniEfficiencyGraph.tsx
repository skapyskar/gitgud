import { MiniEfficiencyGraph } from "gitgud";

const week = [92, 71, 100, 55, 84, 63, 95].map((pct, i) => {
  const date = new Date();
  date.setDate(date.getDate() - i);
  return { date, totalXP: pct * 3, possibleXP: 300, tasksDone: 3 + (i % 3) };
});

export const SevenDaySparkline = () => (
  <div className="glass r-xl p-5" style={{ width: 340, height: 150 }}>
    <span className="text-[11px] font-semibold tracking-widest text-ink3 uppercase block mb-2">
      Efficiency · 7d
    </span>
    <div style={{ height: 80 }}>
      <MiniEfficiencyGraph dayLogs={week} />
    </div>
  </div>
);
