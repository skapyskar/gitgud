import { Panel, HudButton, TierBadge } from "gitgud";

const Row = ({ tier, title, meta }: { tier: "S" | "A" | "B" | "C"; title: string; meta: string }) => (
  <div className="chip chip-hover r-lg px-4 py-3 flex items-center gap-3">
    <span className="w-6 h-6 shrink-0 r-md border-2 border-acc/70" />
    <div className="flex-1 min-w-0">
      <span className="text-sm font-medium text-ink truncate block">{title}</span>
      <span className="text-[11px] text-ink3">{meta}</span>
    </div>
    <TierBadge tier={tier} />
  </div>
);

export const QuestBoard = () => (
  <div style={{ width: 420 }}>
    <Panel
      title="Today's quests"
      subtitle="Tuesday, July 8"
      accent="neon"
      right={<HudButton variant="primary">+ New quest</HudButton>}
    >
      <div className="space-y-2">
        <Row tier="S" title="Ship the release candidate" meta="DEV · +100 XP · due 18:00" />
        <Row tier="A" title="DSA practice — graphs" meta="ACADEMICS · +60 XP · 45m limit" />
        <Row tier="C" title="Reply to internship email" meta="LIFE · +10 XP" />
      </div>
    </Panel>
  </div>
);

export const Accents = () => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: 560 }}>
    <Panel title="Today's quests" accent="neon" subtitle="primary accent">
      <p className="text-xs text-ink3">Daily missions live here.</p>
    </Panel>
    <Panel title="Habits" accent="habit" subtitle="repeat weekly">
      <p className="text-xs text-ink3">Recurring quests respawn on schedule.</p>
    </Panel>
    <Panel title="The Dump" accent="gold" subtitle="capture now, schedule later">
      <p className="text-xs text-ink3">Zero-friction brain dump.</p>
    </Panel>
    <Panel title="Analytics" accent="cyan" subtitle="efficiency · 7d">
      <p className="text-xs text-ink3">Earned vs possible XP.</p>
    </Panel>
  </div>
);
