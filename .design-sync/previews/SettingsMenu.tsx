import { ThemeProvider, RewardProvider, SettingsMenu, MuteToggle, GitGudLogo } from "gitgud";

/** SettingsMenu in its natural habitat: the app navbar (gear opens the skin/mode popover). */
export const InNavbar = () => (
  <ThemeProvider>
    <RewardProvider>
      <header className="glass r-xl px-4 py-2.5 flex items-center justify-between gap-3" style={{ width: 460 }}>
        <GitGudLogo className="w-8 h-8" withText />
        <div className="flex items-center gap-1.5">
          <MuteToggle />
          <SettingsMenu />
        </div>
      </header>
    </RewardProvider>
  </ThemeProvider>
);
