"use client";

import { useEffect, useState } from "react";
import { Panel } from "../../components/ui";
import { browseFams, FamSummary } from "../famApi";

export default function BrowseFamsPanel() {
  const [fams, setFams] = useState<FamSummary[]>([]);

  useEffect(() => {
    browseFams().then((res) => setFams(res?.fams ?? []));
  }, []);

  return (
    <Panel title="Browse Fams" subtitle="ranked by XP" accent="habit">
      {fams.length === 0 ? (
        <p className="text-sm text-ink3">No Fams yet.</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
          {fams.map((f, i) => (
            <div key={f.id} className="chip r-lg flex items-center gap-3 px-3.5 py-2.5">
              <span className="text-[11px] font-bold text-ink3 w-5 shrink-0">{i + 1}</span>
              <span className="flex-1 min-w-0 text-sm font-semibold truncate">{f.name}</span>
              <span className="text-[11px] text-ink3 shrink-0">
                Lv {f.level} · {f._count?.memberships ?? 0} members
              </span>
              <span className="text-[12px] font-bold text-acc shrink-0">{f.xp.toLocaleString()} XP</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
