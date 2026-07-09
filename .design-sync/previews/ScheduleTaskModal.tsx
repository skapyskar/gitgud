import { ScheduleTaskModal } from "gitgud";

export const DeployQuest = () => (
  <ScheduleTaskModal
    mode="create"
    heading="Deploy new quest"
    initial={{ title: "DSA practice — graph algorithms", tier: "A", category: "ACADEMICS", frequency: 1 }}
    onSubmit={() => {}}
    onClose={() => {}}
  />
);
