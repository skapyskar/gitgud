"use client";

import { useEffect, useState } from "react";
import { fetchSeason, FamSeasonInfo } from "../famApi";

export default function SeasonBadge({ famId }: { famId: string }) {
  const [info, setInfo] = useState<FamSeasonInfo | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchSeason(famId).then((res) => {
      if (res) setInfo({ season: res.season, score: res.score, history: res.history });
    });
  }, [famId]);

  if (!info) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="chip chip-hover r-md text-[11px] font-bold px-2.5 py-1 text-acc"
        title="Click for past seasons"
      >
        {info.season.label} · {Math.round(info.score).toLocaleString()} pts
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 w-56 glass r-lg p-3 animate-pop">
            <div className="text-[10.5px] tracking-widest text-ink3 font-bold mb-2">PAST SEASONS</div>
            {info.history.length === 0 ? (
              <p className="text-xs text-ink3">No past seasons yet.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {info.history.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-[12px]">
                    <span className="text-ink2">{s.label}</span>
                    <span className="font-bold text-ink">{Math.round(s.score).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
