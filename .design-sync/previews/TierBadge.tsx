import { TierBadge } from "gitgud";

export const AllTiers = () => (
  <div style={{ display: "flex", gap: 16, alignItems: "center", padding: 8 }}>
    {(["S", "A", "B", "C"] as const).map((tier) => (
      <div key={tier} style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <TierBadge tier={tier} />
        <span className="text-xs text-ink3">
          {tier === "S" ? "Critical" : tier === "A" ? "Important" : tier === "B" ? "Maintenance" : "Chore"}
        </span>
      </div>
    ))}
  </div>
);

export const InContext = () => (
  <div className="chip r-lg px-4 py-3 flex items-center gap-3" style={{ width: 360 }}>
    <span className="w-6 h-6 shrink-0 r-md border-2 border-acc/70" />
    <div className="flex-1 min-w-0">
      <span className="text-sm font-medium text-ink truncate block">Ship the release candidate</span>
      <span className="text-[11px] text-acc font-semibold">+100 XP</span>
    </div>
    <TierBadge tier="S" />
  </div>
);
