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

## Focus audio

The audio dock includes a 24-song playlist, with song selection, previous/next,
seeking, and automatic advance. Music streams one track at a time. Rain,
fireplace, snow wind, and ocean use bundled stereo recordings; each has its own
on/off button and volume slider, alongside a shared ambience mix slider.

**Upload MP3** plays a file from the listener's device without sending it to the
server. That file repeats until another song is selected. **Default playlist**
returns to the bundled music. The selected file and mixer settings last until
the audio dock is unmounted or the page is refreshed.

Recording attribution and license links are in the dock's **Sound credits** and
[public/audio/CREDITS.md](public/audio/CREDITS.md). The media manifest is
`src/lib/audio-library.json`. To regenerate the music from the supplied
compilation, install `ffmpeg` / `ffprobe` and run:

```bash
python3 scripts/prepare-focus-music.py /path/to/music.mp4
```

This preserves the AAC stream and splits it at the manifest's timestamps.
`scripts/prepare-focus-ambience.py` prepares the credited source recordings with
balanced loudness and crossfaded loop boundaries; its argument format is in the
script's opening docstring.

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

## Vercel database and login setup

In Supabase, open the intended project's **Connect** dialog and copy the full
**Transaction pooler** URI into Vercel's **Production** `DATABASE_URL`. Use the
**Session pooler** URI for `DIRECT_URL` (Prisma migrations). Replace only the
password placeholder with the database password, percent-encoding reserved
characters such as `@`, `:`, `/`, `#`, and `%`.
In Vercel's value field, paste the URI alone, without `DATABASE_URL=` or
surrounding quotes.

Copy the host exactly, including its `aws-0` / `aws-1` cluster index and region;
the region alone does not determine the host. The shared-pooler username must
include the project's reference, usually `postgres.<project-ref>`. Confirm that
the project is running; resume it in Supabase if it is paused.

An OAuth callback error containing `(ENOTFOUND) tenant/user ... not found` means
the shared pooler cannot match the host and username to a project, so NextAuth
cannot look up the account or create a session. Fix the connection URI first.
The `url.parse()` deprecation warning is separate from this database error.
See [Supabase's troubleshooting guide](https://supabase.com/docs/guides/troubleshooting/tenant-or-user-not-found).

Also set `NEXTAUTH_URL` to the canonical production HTTPS origin and keep a
stable `NEXTAUTH_SECRET`. OAuth provider callback URLs must use that origin:
`https://<your-domain>/api/auth/callback/github` and
`https://<your-domain>/api/auth/callback/google`. Vercel environment changes
apply to new deployments, so redeploy Production after updating them.

To check the connection and the auth tables without changing data, run this
with the same environment values as the deployment (do not commit secrets):

```bash
npm run db:check
```

The command uses Next.js environment-file precedence, prints no credentials,
and returns a nonzero exit status on failure. `DIRECT_URL` is only used by the
Prisma CLI; changing it alone will not fix the deployed app's `DATABASE_URL`.
Run `npm test` for connection configuration and login error regression checks.

Key layout:

```
src/lib/gamification.ts   ← all XP/level/coin math (single source of truth)
src/lib/api.ts            ← route auth helper + daily habit seeding
src/app/api/tasks/*       ← create / complete / uncomplete / update / delete
src/app/dashboard/*       ← the HUD
```
