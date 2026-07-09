"use client";

import { Panel } from "../../components/ui";
import { FamMembershipRow } from "../famApi";

export default function FamListPanel({
  memberships,
  selectedFamId,
  onSelect,
}: {
  memberships: FamMembershipRow[];
  selectedFamId: string | null;
  onSelect: (famId: string) => void;
}) {
  return (
    <Panel title="My Fams" accent="neon">
      {memberships.length === 0 ? (
        <p className="text-sm text-ink3">You haven&apos;t joined a Fam yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {memberships.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelect(m.fam.id)}
              className={`chip chip-hover r-lg flex items-center gap-3 px-3.5 py-2.5 text-left transition-all ${
                selectedFamId === m.fam.id ? "border border-acc/60 shadow-[0_0_16px_var(--glow)]" : ""
              }`}
            >
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold truncate">{m.fam.name}</span>
                <span className="block text-[11px] text-ink3">
                  {m.role} · Lv {m.fam.level} · {m.fam._count?.memberships ?? 0} members
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}
