# GIT GUD UI Kit — build conventions

Gamified-productivity aesthetic: dark glass panels, violet→fuchsia→cyan gradients, XP/reward motifs. React + Tailwind utility classes.

## Wrap everything in `KitSurface`

Every color in this kit resolves from CSS variables keyed off `<html data-skin data-mode>`, and the page base is painted by the wrapper — **without it, text renders washed-out on a white page**. Wrap each screen once:

```jsx
import { KitSurface, Panel, HudButton, TierBadge } from "gitgud";

<KitSurface skin="aurora" mode="dark">           {/* skins: aurora | terminal | zen; modes: dark | light */}
  <Panel title="Today's quests" subtitle="Tuesday" accent="neon"
         right={<HudButton variant="primary">+ New quest</HudButton>}>
    <div className="chip chip-hover r-lg px-4 py-3 flex items-center gap-3">
      <span className="w-6 h-6 r-md border-2 border-acc/70" />
      <div className="flex-1">
        <span className="text-sm font-medium text-ink">Ship the release</span>
        <span className="text-[11px] text-acc font-semibold block">+100 XP</span>
      </div>
      <TierBadge tier="S" />
    </div>
  </Panel>
</KitSurface>
```

`ThemeProvider` (persisted skin/mode prefs + `useTheme()`) is for full apps; `RewardProvider` is required around anything calling `useRewards()`/`MuteToggle`.

## Styling idiom — semantic utilities, never raw grays

Layout glue uses Tailwind, but colors/surfaces must come from the kit's semantic classes so every skin×mode works:

- **Text**: `text-ink` (primary) · `text-ink2` (secondary) · `text-ink3` (muted). Never `text-white`/`text-slate-*` except on gradient-filled surfaces.
- **Accents**: `text-acc` / `text-acc2` / `text-acc3` (brand gradient stops), `text-hab` (habits/cyan), `text-gold`, `text-warm`, `text-rosy` (danger). Tier colors: `text-ts|ta|tb|tc`. All support opacity + bg/ring forms — tinted chip pattern: `bg-acc/10 ring-1 ring-inset ring-acc/30 text-acc rounded-full px-2.5`.
- **Surfaces**: `.glass` = frosted card (pair with `.r-xl`, optionally `.glass-hover`); `.chip` = inner row/input surface (+ `.chip-hover`); borders `border-line`.
- **Radius scale** (skin-aware — terminal is sharp, aurora soft): `r-xl` cards/modals · `r-lg` rows/large buttons · `r-md` chips/small controls. Don't use `rounded-2xl/3xl`.
- **Gradients & glow**: `.grad-primary` (fill), `.grad-text`, `.grad-text-warm`, `.glow-shadow`; progress bars add `.xp-shimmer`.
- **Motion**: `.animate-rise` (entrances), `.animate-pop`, `.animate-blink`; page backdrops: `<div className="aurora" />` + `<div className="noise" />` behind a `relative z-10` content wrapper.
- **Fonts**: `font-display` for headings/numerals, default body is set by the theme; `font-mono` for tabular figures.

## Where the truth lives

Read `styles.css` → `_ds_bundle.css` (all variables per skin×mode plus every utility above) before inventing styling. Each component's `.d.ts` is the props contract; its `.prompt.md` shows composition.

## Component quick map

Primitives: `Panel` (accent: neon|habit|gold|cyan), `HudButton` (variant: primary|ghost|danger|habit|gold), `Modal`/`ModalTitle`/`ConfirmModal`, `TierBadge` (tier: S|A|B|C), `inputCls`/`labelCls` (className strings for form fields). Feedback: `RewardProvider` + `useRewards().celebrate(...)` (XP toasts, level-up takeover), `MuteToggle`, `LoadingScreen`. Data-viz: `Heatmap` (dayLogs: {date,totalXP}[]), `MiniEfficiencyGraph`, `FullPerformanceGraph` (dayLogs: {date,totalXP,possibleXP,tasksDone}[]). Widgets: `TaskTimer`, `ScheduleTaskModal`. Brand: `GitGudLogo`.
