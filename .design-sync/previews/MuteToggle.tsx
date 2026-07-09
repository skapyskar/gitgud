import { RewardProvider, MuteToggle } from "gitgud";

export const InToolbar = () => (
  <RewardProvider>
    <div className="chip r-lg px-3 py-2 flex items-center gap-2" style={{ width: 220 }}>
      <span className="text-xs text-ink2 flex-1">Reward sounds</span>
      <MuteToggle />
    </div>
  </RewardProvider>
);
