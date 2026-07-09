import Link from "next/link";

export interface FamSummaryData {
  id: string;
  name: string;
  level: number;
  leaderboard: Array<{ userId: string; label: string; points: number; isMe: boolean }>;
  recentActivity: string[];
  activeGoal: { id: string; description: string; currentValue: number; targetValue: number } | null;
}

/** Server-rendered dashboard summary card — placed above the Momentum section on Overview. */
export default function FamSummaryCard({ fam }: { fam: FamSummaryData }) {
  return (
    <Link href="/fam" className="glass glass-hover r-xl p-4 flex flex-col gap-2.5 block">
      <div className="flex items-center gap-2.5">
        <span className="text-base">⚡</span>
        <span className="font-display font-bold text-[15px] truncate">{fam.name}</span>
        <span className="text-[10px] font-extrabold text-acc bg-acc/12 r-md px-1.5 py-0.5 ml-auto shrink-0">
          LV {fam.level}
        </span>
      </div>
      <div className="text-[10.5px] tracking-widest text-ink3 font-bold">TODAY</div>
      <div className="flex flex-col gap-1">
        {fam.leaderboard.map((row, i) => (
          <div key={row.userId} className="flex items-center gap-2 text-[13px]">
            <span className="text-ink3 font-bold w-4 shrink-0">{i + 1}.</span>
            <span className={`flex-1 min-w-0 truncate ${row.isMe ? "text-acc font-semibold" : "text-ink2"}`}>
              {row.label}
            </span>
            <span className="font-bold text-ink shrink-0">+{row.points}</span>
          </div>
        ))}
      </div>

      {fam.activeGoal && (
        <div className="pt-1.5 border-t border-line">
          <div className="text-[10.5px] tracking-widest text-ink3 font-bold mb-1">GOAL</div>
          <div className="text-[12.5px] text-ink2 truncate mb-1">{fam.activeGoal.description}</div>
          <div className="chip r-md h-1.5 overflow-hidden">
            <div
              className="grad-primary h-full"
              style={{ width: `${Math.min(100, (fam.activeGoal.currentValue / fam.activeGoal.targetValue) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {fam.recentActivity.length > 0 && (
        <div className="pt-1.5 border-t border-line flex flex-col gap-0.5">
          {fam.recentActivity.map((msg, i) => (
            <div key={i} className="text-[11.5px] text-ink3 truncate">
              {msg}
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}
