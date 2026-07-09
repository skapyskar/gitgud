import { TaskTimer } from "gitgud";

export const FocusTimer = () => (
  <TaskTimer
    taskTitle="Deep work: refactor the auth flow"
    initialMinutes={25}
    hasAllocatedDuration
    onClose={() => {}}
  />
);
