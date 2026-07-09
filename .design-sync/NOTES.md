# design-sync notes — gitgud

- This is a Next.js **app**, not a packaged DS. The kit surface is the committed barrel `src/kit/index.ts`; the converter runs with `--entry ./src/kit/index.ts`. New kit components must be added BOTH to the barrel and to `componentSrcMap` in config (there is no `.d.ts` tree, so discovery is map-only — `[ZERO_MATCH]` without it).
- `buildCmd` compiles Tailwind v4 → `.design-sync/.cache/kit.css` via the devDependency `@tailwindcss/cli`, then prepends `.design-sync/fonts.css` (Google-hosted Inter/Sora/JetBrains Mono + the `--font-*` var definitions next/font would normally inject).
- `cfg.provider` = `KitSurface` (`src/kit/KitSurface.tsx`, exported from the barrel, deliberately not a card): paints `var(--base)` and sets `data-skin`/`data-mode` on `<html>`. Without it every preview renders washed-out on the harness's white page.
- Playwright: the machine cache pins chromium-1228 → `playwright@1.61.0` (installed in `.ds-sync/`). Repo has no playwright of its own.
- App-wired components (DailyBoard, BacklogPanel, WeeklyPlanner, StatsPanel, FocusView, DashboardShell, AuthGate, LogoutButton, ConnectGitHubButton) are deliberately out of scope — they import `next/navigation` / next-auth / call API routes.
- RewardProvider preview re-fires the XP toast every 2s and triggers the persistent level-up; a single fire raced the screenshot (mid-animation blur).
- Overlay components carry `cardMode: single` + viewport overrides; HudButton/Panel/TierBadge use `cardMode: column` (grid overflow).
- Known render warns: none outstanding. `[FONT_REMOTE]` (Google fonts) is expected and permanent.

## Re-sync risks

- `kit.css` is regenerated per sync by scanning `src/**` — app refactors that rename utility classes change the bundle CSS even when kit components didn't change.
- Preview data is synthetic and relative to "today" (Heatmap/graphs) — stable across days by construction, but a `[SPOT_CHECK]` on them is expected pipeline churn, not drift.
- Fonts load from fonts.googleapis.com at render time — offline design rendering falls back to system fonts.
- npm postinstall scripts are blocked in this environment (`allow-scripts`); esbuild works via optionalDependency binaries, no action needed.
- The `gitgud` package.json is the app's; there is no publishable dist. If the app ever gets a real component-lib build, switch `--entry` to it for stronger `.d.ts` contracts.
