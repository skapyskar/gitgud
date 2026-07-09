# GIT GUD

Gamified productivity. Tasks earn XP, streaks multiply it, habits respawn on schedule, and you rank up from **Script Kiddie** to **The Compiler**.

## How the game works

- **Tiers** — every task is S / A / B / C (100 / 60 / 30 / 10 base XP).
- **Time limits** — give a task a duration and beat it for **+25% XP**. The focus timer auto-completes with the bonus.
- **Streaks** — complete anything each day to keep the flame. Multipliers: ×1.1 @ 3d, ×1.3 @ 7d, ×1.5 @ 14d, ×2 @ 30d.
- **Habits** — weekly templates spawn a fresh instance every scheduled day (+10 bonus XP each).
- **Diminishing returns** — C-tier spam and S-tier grinding pay less as the day goes on.
- **Coins** — 1 coin per 10 XP earned (currency for future shop features).
- **Levels** — quadratic curve: level n needs 500·(n−1)² lifetime XP. Ranks unlock as you climb.
- **Efficiency** — earned XP vs. possible XP per day, graphed, plus a commit-style activity heatmap.

## Appearance

Three skins × light/dark, switchable from the gear menu (persisted per browser):
**Aurora** (glass & gradients), **Terminal** (green phosphor + scanlines), **Zen** (barely-there chrome for wallpaper duty).
The navbar toggles between **Board** (the three panels) and **Focus** — a fullscreen live clock with date, greeting, streak/XP chips, and your next quests, made to sit on a spare desktop workspace. On phones the boards become bottom-tab pages and the stat cards swipe horizontally.

## The three boards

1. **The Dump** — zero-friction capture. Add a title (and optional deadline), schedule it later.
2. **Today's Ops** — today's missions with deadlines, time limits, and rep counters. Overdue tasks nag until rescheduled or dumped.
3. **Habits** — recurring weekly templates.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind v4 · Prisma 7 + PostgreSQL · NextAuth (GitHub / Google)

## Setup

```bash
cp .env.example .env    # fill in DATABASE_URL, NEXTAUTH_SECRET, OAuth creds
npm install
npx prisma migrate deploy   # or `migrate dev` while developing
npx prisma generate
npm run dev
```

Key layout:

```
src/lib/gamification.ts   ← all XP/level/coin math (single source of truth)
src/lib/api.ts            ← route auth helper + daily habit seeding
src/app/api/tasks/*       ← create / complete / uncomplete / update / delete
src/app/dashboard/*       ← the HUD
```
