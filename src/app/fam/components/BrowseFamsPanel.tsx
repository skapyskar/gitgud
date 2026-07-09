"use client";

import { useEffect, useState } from "react";
import { Panel } from "../../components/ui";
import { fetchRankings, RankingRow } from "../famApi";

const SCOPES = [
  { key: "global", label: "7d" },
  { key: "monthly", label: "30d" },
  { key: "all-time", label: "All-time" },
] as const;

/**
 * Weighted growth rankings, not a raw-points leaderboard — see the formula in
 * src/lib/fam.ts's computeFamRankingScore. All-Time is the one exception:
 * lifetime accumulated XP, a simple complementary view.
 */
export default function BrowseFamsPanel() {
  const [scope, setScope] = useState<(typeof SCOPES)[number]["key"]>("global");
  const [rankings, setRankings] = useState<RankingRow[]>([]);

  useEffect(() => {
    fetchRankings(scope).then((res) => setRankings(res?.rankings ?? []));
  }, [scope]);

  return (
    <Panel
      title="Rankings"
      subtitle="weighted for consistent growth, not one-day spikes"
      accent="habit"
      right={
        <div className="chip r-lg p-1 flex flex-wrap gap-1">
          {SCOPES.map((s) => (
            <button
              key={s.key}
              onClick={() => setScope(s.key)}
              className={`px-2.5 py-1 r-md text-[11px] font-semibold whitespace-nowrap transition-all ${
                scope === s.key ? "grad-primary text-white" : "text-ink3 hover:text-ink"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      }
    >
      {rankings.length === 0 ? (
        <p className="text-sm text-ink3">No Fams yet.</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
          {rankings.map((r, i) => (
            <div key={r.famId} className="chip r-lg flex items-center gap-3 px-3.5 py-2.5">
              <span className="text-[11px] font-bold text-ink3 w-5 shrink-0">{i + 1}</span>
              <span className="flex-1 min-w-0 text-sm font-semibold truncate">{r.name}</span>
              {scope !== "all-time" && (
                <span className="text-[10.5px] text-ink3 shrink-0" title="consistency / participation / stability">
                  {Math.round(r.consistencyPct)}% · {Math.round(r.participationPct)}% · {Math.round(r.stabilityPct)}%
                </span>
              )}
              <span className="text-[12px] font-bold text-acc shrink-0">{Math.round(r.score).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
