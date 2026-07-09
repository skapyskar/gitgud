import { HudButton } from "gitgud";

export const Variants = () => (
  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", padding: 8 }}>
    <HudButton variant="primary">Deploy quest</HudButton>
    <HudButton variant="ghost">Cancel</HudButton>
    <HudButton variant="danger">Delete</HudButton>
    <HudButton variant="habit">+ Habit</HudButton>
    <HudButton variant="gold">+ Dump</HudButton>
  </div>
);

export const Disabled = () => (
  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", padding: 8 }}>
    <HudButton variant="primary" disabled>
      Deploy quest
    </HudButton>
    <HudButton variant="ghost" disabled>
      Cancel
    </HudButton>
    <HudButton variant="danger" disabled>
      Delete
    </HudButton>
  </div>
);

export const WideCTA = () => (
  <div style={{ width: 320, padding: 8 }}>
    <HudButton variant="primary" className="w-full py-2.5">
      Press start
    </HudButton>
  </div>
);
