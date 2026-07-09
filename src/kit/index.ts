/**
 * GIT GUD UI Kit — the presentational surface synced to Claude Design.
 * App-wired components (boards, auth, anything using the Next router or
 * API routes) are deliberately not exported here.
 */

export {
  Panel,
  HudButton,
  Modal,
  ModalTitle,
  ConfirmModal,
  TierBadge,
  TIER_STYLE,
  inputCls,
  labelCls,
} from "../app/components/ui";

export { KitSurface } from "./KitSurface";
export { GitGudLogo } from "../app/components/GitGudLogo";
export { default as LoadingScreen } from "../app/components/LoadingScreen";
export { default as Heatmap } from "../app/components/Heatmap";
export { default as RewardProvider, useRewards, MuteToggle } from "../app/components/RewardLayer";
export { default as ThemeProvider, useTheme, SKIN_INFO } from "../app/components/theme";
export { default as SettingsMenu } from "../app/components/SettingsMenu";

export { default as MiniEfficiencyGraph } from "../app/dashboard/components/MiniEfficiencyGraph";
export { default as FullPerformanceGraph } from "../app/dashboard/components/FullPerformanceGraph";
export { default as TaskTimer } from "../app/dashboard/components/TaskTimer";
export { default as ScheduleTaskModal } from "../app/dashboard/components/ScheduleTaskModal";
