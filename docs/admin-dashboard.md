# Admin Panel & Dashboard

> The `/admin` area: its route structure, the analytics **dashboard** at
> `/admin` (KPIs, leaderboards, game/role analytics, live presence), and the
> conventions every admin widget follows. Access control (roles, permissions,
> route gating) lives in [authorization.md](./authorization.md) — this doc
> assumes it and focuses on the panel's pages and the dashboard feature.

## Overview

The admin panel is a staff-only area mounted at `/admin`, gated by the
`admin_panel.access` permission (see [authorization.md](./authorization.md)).
It has four routes, all wrapped by a shared shell:

| Route | Component | Requires | Purpose |
|---|---|---|---|
| `/admin` | `src/app/admin/page.tsx` | `admin_panel.access` | **Analytics dashboard** (this doc) |
| `/admin/users` | `UsersTable` | `user.view` | Paginated user list; assign roles, ban/unban |
| `/admin/games` | `GamesTable` | `game.view_all` | Live games; force-end / cancel |
| `/admin/archive` | `ArchiveRow` list | `game.view_all` | Every finished game, full rosters + roles; per-row **annul** action (`game.annul`) |

The layout (`src/app/admin/layout.tsx`) wraps all of them in
`<PermissionGuard permission={ADMIN_PANEL_ACCESS}>` then `AdminShell`. The shell
(`src/features/admin/components/AdminShell.tsx`) provides the sticky frosted-glass header,
the top nav, the ambient glow backdrop, and the `max-w-7xl` content frame.

### Archive row actions

Each `ArchiveRow` renders `ArchiveRowActions` — a 3-dot (kebab) menu, shown only
to holders of `game.annul` (moderator + admin) on games with a decided winner.
Its one action — **Annul game** — calls `admin.gameLogs.annulGame`, converting
the game to a no-contest and reversing every player's ELO from it (see
[ranking-system.md](./ranking-system.md) §4 and
[authorization.md](./authorization.md)). It confirms via `window.confirm` (same
pattern as `GamesTable`'s force-end) and is authoritatively gated server-side —
the menu is UX only. After annulment the game reads `winner: null`, so it shows
as "No winner" and the action disappears (a no-contest has no ELO to reverse).

## The dashboard

The landing page (`/admin`) is a live, reactive analytics dashboard. It is
**read-only** — no mutations — and every widget auto-updates via Convex
`useQuery`. Sections are permission-gated so a moderator sees only what their
role allows.

### Layout (`src/app/admin/page.tsx`)

| Section | Gate | Widgets |
|---|---|---|
| Stat bar | `user.view` | `KpiStrip` — compact strip: live online count + 6 KPIs |
| Top players | `game.view_all` | `TopPlayersLeaderboard` — scrollable, sortable |
| Game analytics | `game.view_all` | `FactionWinDonut`, `GamesOverTimeArea`, `GamesByTypeBar`, `RoleAnalyticsTable`, `WinMethodBreakdown` |
| Recent activity | `user.view` | `RecentActivityFeed` — latest games + admin actions |

## Backend — `convex/admin/stats.ts`

All dashboard data comes from one file of **reactive, read-only aggregation
queries**. Each one starts with `requirePermission(ctx, …)` (the authoritative
gate — never trust the UI) and returns plain serializable data.

| Query | Permission | Returns |
|---|---|---|
| `overviewKpis` | `user.view` | total users, new-this-week, banned, finished games, total matches, active/waiting games |
| `topPlayers({ sortBy, limit })` | `game.view_all` | leaderboard from `playerStats` ⨝ `profiles`; `sortBy` ∈ `wins \| winRate \| matches` |
| `gameAnalytics` | `game.view_all` | avg duration, faction win split, games-by-type, win-method breakdown, games/day (30d) |
| `roleAnalytics` | `game.view_all` | per-role matches + win rate, aggregated across `playerStats.roleStats` |
| `recentActivity({ limit })` | `user.view` | recent `gameLogs` + recent `adminAuditLog` actions |

The live "online now" count is **not** here — it comes from the presence
component's `api.presence.onlineNow` (see [realtime.md](./realtime.md) / the
presence wiring in `convex/presence.ts`).

### Data sources

The queries read existing tables — the dashboard adds **no new tables or
write-path logic**:

- `playerStats` — per-player aggregates (the basis for leaderboards & role
  win-rates). Maintained incrementally in `archiveGameLog`.
- `gameLogs` — permanent finished-game snapshots (durations, winners,
  `winMethod`, game type, finish time).
- `profiles` — user counts, signups (`createdAt`), bans.
- `games` — live active/waiting counts.
- `adminAuditLog` — the moderation feed.

### Derived values

- **Win rate** = `wins / (wins + losses)` as a 0–100 integer; `noContests` are
  excluded from the denominator (matches `playerStats`' own contract). A player
  with no decided games is `0%`.
- **`topPlayers` by `winRate`** requires ≥3 decided games to rank, so a lone
  1-0 player can't top a seasoned 80% one; ties break by volume.
- **Win-method label** is derived via `winMethodLabel` (`convex/games/core/winConditions.ts`),
  never stored — wording can change without migration.

### Performance — compute-on-read

> **PERF:** every query aggregates on read via `.collect()` + reduce.

This is intentional and fine at the current volume (admin-only, low traffic,
modest tables). It is the documented trade-off, not an oversight. If
`gameLogs` / `playerStats` / `profiles` grow large, migrate the hot queries to a
**denormalized aggregates document** maintained incrementally inside
`archiveGameLog` (`convex/lib/games.ts`) — the same O(1)-read pattern
`playerStats` already uses. Each query in `stats.ts` carries a `// PERF:` note
marking this.

## Frontend — `src/features/admin/dashboard/`

### Design language — "Elevated Dark"

A modern dark dashboard (not flat black): a deep `slate-950` base with ambient
indigo/violet/emerald glow blobs, translucent **glass cards**, and per-card neon
accents. The shared pieces live in two files:

- **`theme.ts`** — the accent system. Six accents
  (`indigo · violet · emerald · sky · amber · rose`), each defining an icon-chip
  gradient, tinted text, glow blob, and top hairline. **Use these — don't invent
  per-component colors.**
- **`primitives.tsx`** — `DashboardCard` (the glass panel: gradient fill,
  `backdrop-blur`, hairline border, soft shadow, optional `accent` prop for the
  top line + corner glow), `CardTitle` (with optional lucide icon), `EmptyState`,
  and `formatRole` (formats role constants like `MAFIA_RIGHT_HAND` →
  "Mafia Right Hand", crash-safe vs. any unmapped role string).

Faction colors are centralized separately in
**`src/shared/lib/constants/factions.ts`** (`FACTION_HEX` for Recharts, `FACTION_TEXT` /
`FACTION_BADGE` for markup; mafia = red, citizens = emerald, yakuza = violet).

### Charts — Recharts via `ChartFrame`

Charts use **Recharts** (`recharts`). Every chart is wrapped in
**`ChartFrame`**, which owns the `DashboardCard`, title/icon/accent, the
`ResponsiveContainer` + fixed height, the empty state, and the shared dark
`TOOLTIP_STYLE`. A chart component therefore only declares its series. Recharts
needs a **single child element**, so `ChartFrame` casts `children` to one
`ReactElement` — pass exactly one `<PieChart>` / `<AreaChart>` / `<BarChart>`.

### Component conventions

- Reuse `UserAvatar` and `LoadingSpinner` (`src/shared/ui/`); reuse
  `getRoleDisplayConfig` / `getRoleEmoji` (`src/shared/lib/utils/roleDisplay.ts`) for
  role emoji + color.
- Long lists scroll **inside** the card (e.g. the leaderboard caps at
  `max-h-80 overflow-y-auto`) so a widget never stretches the page.
- The KPI strip folds the live online count in as its first cell (emerald pulse
  dot) — there is no separate online card and no online user *list*, just the
  number.
- Fully responsive: the stat strip collapses from a single desktop row to a 2–3
  col grid; charts use `ResponsiveContainer`; tables drop secondary columns on
  small screens.

## Internationalization

All strings live under the **`admin.dashboard.*`** namespace in **both**
`messages/en.json` and `messages/ka.json` (Georgian), consumed via
`useTranslations("admin")`. Key groups: `sections`, `online`, `kpi`,
`leaderboard`, `charts`, `roleStats`, `winMethods`, `recent` (with nested
`actionLabels.<entity>.<action>` so dotted audit keys like `role.assign` resolve
through next-intl's path lookup). Never hard-code user-facing strings.

## Adding a new dashboard widget

1. Add a `requirePermission`-gated query to `convex/admin/stats.ts` (add a
   `// PERF:` note if it scans a table).
2. Build the component in `src/features/admin/dashboard/` using
   `DashboardCard` + an accent from `theme.ts`; for a chart, wrap it in
   `ChartFrame`.
3. Add its strings to `admin.dashboard.*` in **both** locale files.
4. Mount it in `src/app/admin/page.tsx` behind the right permission gate.
5. `npx tsc --noEmit` and lint must be clean.

## Verification

1. `npx tsc --noEmit` and `npx eslint` clean.
2. Open `/admin` as an **admin**: every section renders, charts draw, the online
   count changes when a second tab opens, leaderboard re-ranks across the three
   tabs and scrolls internally past ~7 rows.
3. Open as a **moderator** (no `game.view_all` in a hypothetical future role):
   game/role analytics + leaderboard are hidden, stat bar + recent activity
   remain; no errors.
4. Empty states render gracefully with zero finished games / zero online users.
5. Authoritative check: calling a `stats.ts` query without the permission is
   rejected with `FORBIDDEN`, regardless of UI.
