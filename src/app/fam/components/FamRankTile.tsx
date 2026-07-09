import type { FamSummaryData } from "./FamSummaryCard";

/** Small inter-Fam ranking tile — placed in Overview's RIGHT column, in the gap between the week card and the Audio Dock. */
export default function FamRankTile({ fam, onOpen }: { fam: FamSummaryData; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="glass glass-hover r-xl p-4 flex items-center gap-3 text-left w-full">
      <span className="text-lg shrink-0">🏆</span>
      <div className="flex-1 min-w-0">
        <div className="text-[10.5px] tracking-widest text-ink3 font-bold">GLOBAL RANK</div>
        <div className="font-display text-[18px] font-extrabold truncate">
          #{fam.globalRank.rank} <span className="text-[12px] text-ink3 font-semibold">of {fam.globalRank.totalFams}</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[10.5px] tracking-widest text-ink3 font-bold">SCORE</div>
        <div className="font-display text-[15px] font-extrabold text-acc">{Math.round(fam.globalRank.score)}</div>
      </div>
    </button>
  );
}
