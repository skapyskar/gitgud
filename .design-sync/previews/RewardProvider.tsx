import React from "react";
import { RewardProvider, useRewards, HudButton } from "gitgud";

/**
 * Keeps a reward toast on screen (re-fired before its auto-dismiss) and
 * triggers the persistent level-up takeover, so the card always shows the
 * celebration layer.
 */
const TriggerRewards = () => {
  const { celebrate } = useRewards();
  React.useEffect(() => {
    const fireToast = () =>
      celebrate({
        xpGained: 125,
        coinsGained: 12,
        breakdown: { baseXP: 100, streakBonus: 15, durationBonus: 25, weeklyBonus: 0 },
      });
    fireToast();
    const id = setInterval(fireToast, 2000);
    celebrate({ xpGained: 0, leveledUp: true, levelAfter: 7, rank: "Merge Sergeant" });
    return () => clearInterval(id);
  }, [celebrate]);
  return (
    <div style={{ padding: 24 }}>
      <HudButton variant="primary">Complete quest</HudButton>
    </div>
  );
};

export const LevelUpCelebration = () => (
  <RewardProvider>
    <TriggerRewards />
  </RewardProvider>
);
