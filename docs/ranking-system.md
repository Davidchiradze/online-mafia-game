# Ranking System (ELO + Levels)

> Status: **Implemented** (backfill pending — run
> `npx convex run migrations:backfillRatings`, see §8). This document is the
> single source of truth for the player ranking system: a faction-calibrated,
> table-strength-adjusted ELO rating plus FACEIT-style skill **Levels 1–10**
> with custom badges. Ratings are
> **namespaced per game type** — each game variant gets its own ELO
> calculation and its own ladder (only `japanese_mafia` is rated today).
> Rating math runs server-side inside `archiveGameLog`
> (`convex/lib/games.ts`); levels and badges are display-only and derived on
> the client.

## 1. Purpose

Give players a persistent skill rating that is **fair regardless of which role
the shuffle deals them**. The game has three factions with different sizes and
different win probabilities, so a naive "+25 win / −25 loss" system would:

1. Bleed the average player's rating (the average player wins only ~33.5% of
   games in a 3-faction format), and
2. Make Mafia seats strictly more profitable than Yakuza seats.

The fix: point payouts **calibrated to each faction's real win rate** — so the
expected rating change for an average player is ~zero in every role — plus a
**bounded table-strength adjustment** so winning against stronger tables pays
extra and farming weaker tables doesn't (§3). Only above-average play climbs
the ladder.

### Multi-game principle

The platform will host **multiple game variants over time, and each game has
its own ELO calculation**. Nothing about a rating is global:

- A player has **one rating per `gameType`**, stored in a dedicated
  `playerRatings` table keyed by `(playerId, gameType)` — never a single
  rating field on `playerStats`.
- Payouts/K/start/floor/table-adjustment live in a **per-game-type config**
  (`RATING_CONFIG[gameType]`). A game type with no config is simply
  **unrated** — `archiveGameLog` skips rating for it. Today only
  `japanese_mafia` has a config (calibrated in §2–§3); future variants add
  their own entry with their own calculation.
- Leaderboards, seasons, and profile badges are always **scoped to one game
  type** (`gameLogPlayers` already denormalizes `gameType`, so per-game season
  sums come for free).
- Level **brackets** (§5) are shared across game types by default (one mental
  model for players, like FACEIT); a future variant may override them in its
  config if its rating scale differs.

## 2. Production data (calibration source)

Snapshot from production as of **2026-07** (280 archived games, 269 decided):

| Faction  | Wins | Win rate (E) | Faction size | Chance of being dealt it |
| -------- | ---- | ------------ | ------------ | ------------------------ |
| Mafia    | 104  | **38.7%**    | 3 / 12       | 25%                      |
| Citizens | 88   | **32.7%**    | 7 / 12       | 58.3%                    |
| Yakuza   | 77   | **28.6%**    | 2 / 12       | 16.7%                    |
| No contest | 11 | —            | —            | —                        |

Average per-player win rate (weighted by faction size): **~33.5%**.

> Within a faction every role shares the outcome (the Don wins exactly when
> Mafia wins; the Doctor wins exactly when Citizens win) and every role appears
> in every game — so **faction-level payouts are the correct granularity**. No
> per-role adjustment is needed or wanted.

## 3. Rating formula

Two parts: a **faction-calibrated base** (expected-score ELO, K = 80 — the
K = 40 ratios scaled 2×, see below) plus a
**bounded table-strength adjustment**:

```
ΔR = base + b

base = K × (S − E)          K = 80 (the K = 40 ratios scaled 2×)
S    = 1 (faction won) | 0 (faction lost)
E    = faction's calibrated win rate (§2)

b    = clamp( round((T − R) / 20), −16, +16 )
T    = table average ELO — mean rating of ALL role-holders in the game,
       including yourself (host excluded; players with no rating row count
       as the default 1000)
R    = your ELO before the game
```

Rounded to integers, the **base** payouts are (the original K = 40 numbers ×2):

| Faction  | E     | **Win** | **Loss** | EV/game for an average player |
| -------- | ----- | ------- | -------- | ----------------------------- |
| Mafia    | 0.387 | **+48** | **−30**  | +0.16                         |
| Citizens | 0.327 | **+54** | **−26**  | +0.16                         |
| Yakuza   | 0.286 | **+56** | **−22**  | +0.32                         |
| No contest | —   | 0       | 0        | 0                             |

> **Why 2×?** The K = 40 base was tuned for stability, but with a median of
> only ~6 rated games per player the ladder over-compressed: replaying the real
> archive left 85% of players stuck in Level 4 (rating std ≈ 46). Doubling the
> payouts (formula and E untouched) spreads the same players across Levels 3–6
> (std ≈ 92, 41% out of Level 4) while preserving their ranking order. See §5
> pacing.

### The table adjustment `b`

`b` is **symmetric** — the same signed value is added to every result:

| Table vs you       | Win       | Loss       |
| ------------------ | --------- | ---------- |
| Stronger (`T > R`) | pays more | costs less |
| Weaker (`T < R`)   | pays less | costs more |

Worked examples (Citizens base +54 / −26):

- You are `1000`, table average `1140` → `b = +7`. Win **+61**, loss **−19**.
- You are `1400`, table average `1150` → `b = −13` (rounded from −12.5, within
  the ±16 cap). Win **+41**, loss **−39**.
- You are `1050`, table average `1050` → `b = 0`. Base numbers apply as-is.

Why these numbers are safe:

- `1 point per 20 ELO` keeps the divisor deliberately loose (a weaker spring
  than the K-linear value would give at K = 80) so skilled players can
  separate. The hard cap of ±16 (reached at ±320 table difference) bounds how
  much any lobby can swing a result.
- Because the cap (16) is **below the smallest base numbers** (win +48,
  loss −22), a win always pays **at least +32** and a loss always costs **at
  least −6** — a win can never become ≤ 0 and a loss can never turn positive,
  no matter how lopsided the table. Maximum possible swing: win +72, loss −46.

Properties:

- **Role-fair**: hardest faction (Yakuza) pays the most for a win and costs the
  least for a loss; easiest (Mafia) the reverse. Expected value ≈ 0 everywhere.
- **Table-fair**: beating a stronger table pays more; farming weaker tables
  pays less *and* losing to them costs more — high-rated players can't grind
  beginner lobbies for full value.
- **Win ≈ 2× loss** at a balanced table — compensates for the ~33.5% average
  win rate.
- The tiny positive drift (+0.16…+0.32/game ≈ +20 rating per 100 games) is a
  deliberate rounding choice: imperceptibly slow inflation beats slow decay.
  The symmetric `b` adds no drift of its own.

## 4. Rating mechanics

- **Starting rating: `1000`** (lands new players in Level 4, see §5). No
  placement/provisional games — payouts are fixed, so there is nothing to
  converge.
- **Default rating: `1000`.** A player with no rated game history reads as
  `1000` / Level 4 everywhere (profile, badges, player tiles) — there is
  **no "unranked" state**. Their `playerRatings` row simply doesn't exist yet
  (created on first rated game); readers treat a missing row as `1000`.
  Leaderboards are the one exception: they list only players with ≥1 rated
  game, so thousands of zero-game accounts don't pad the board at 1000.
- **Floor: `100`** — a rating can never drop below Level 1's lower bound. When
  the floor clips a loss, the **actual** (clipped) delta is what gets recorded.
- **Pre-game snapshot**: all deltas for a game — including the table average
  `T` — are computed from every player's rating **before** that game, then
  applied together. Processing order within a game never affects the result.
- **No-contest games** (`winner: null`): zero rating change (no base, no `b`)
  — consistent with `playerStats` win-rate math, which already excludes them.
- **Host & spectators**: never rated. The host holds no role/faction and is
  naturally absent from role-holder archives.
- **Leavers**: a player who abandons a game that later finishes with a winner
  keeps their faction's outcome (usually a loss). No extra penalty in v1.
- **Peak rating** is stored alongside current rating (same pattern as
  `bestStreak`).
- **Scope**: ratings are per game type (§1). Only `japanese_mafia` has a
  rating config today — `traditional` / `city_mafia` have different faction
  structures and no calibration data, so they stay unrated until they get
  their **own** config + E table (§9).

## 5. Levels (FACEIT-style)

Rating is bucketed into **10 levels** using the official FACEIT ELO brackets:

| Level  | ELO range   | Color group |
| ------ | ----------- | ----------- |
| **1**  | 100 – 500   | Gray        |
| **2**  | 501 – 750   | Green       |
| **3**  | 751 – 900   | Green       |
| **4**  | 901 – 1050  | Yellow      |
| **5**  | 1051 – 1200 | Yellow      |
| **6**  | 1201 – 1350 | Yellow      |
| **7**  | 1351 – 1530 | Yellow      |
| **8**  | 1531 – 1750 | Orange      |
| **9**  | 1751 – 2000 | Orange      |
| **10** | 2001+       | Red         |

- Levels are **derived on read from rating** — never stored. Single pure
  function (`getLevelForRating`) in `src/lib/ranking/levels.ts`, brackets in
  `src/lib/constants/ranking.ts`.
- Bounds are inclusive: rating `750` is Level 2, `751` is Level 3.
- The rating floor (`100`) equals Level 1's lower bound, so a level always
  exists for any rating.
- New players (1000) start at **Level 4** — same as FACEIT.
- **Progress within a level** (for progress bars / badge tooltips):
  `progress = (rating − min) / (max − min)`, Level 10 is always shown full.
- Pacing sanity check: max single-game gain is +72 (base +56 + table cap +16)
  and the narrowest bracket is 150 wide, so a player still can never skip a
  level in one game. A solidly above-average player (~40% personal win rate)
  gains ~+5.2/game at balanced tables — brisk enough that levels move with real
  play, while the symmetric table adjustment still slows climbing once a player
  out-rates their usual tables.

## 6. Level badges (our own design)

We render our **own** badge set — one visual per level, FACEIT-inspired
(circular gauge + centered level number) but drawn in the app's palette.

### Design spec

- **One React SVG component**, not 10 static image files:
  `<LevelBadge level={1..10} size="sm" | "md" | "lg" />` in
  `src/components/ranking/LevelBadge.tsx`. SVG keeps badges crisp at every
  size, themeable, and adding a level-11 rebracket later is a constants change.
- **Geometry**: circular ring gauge with a gap at the bottom (like a car
  dial). The arc sweep is proportional to the level — `level / 10` of the
  ring — so higher levels visibly "fill up". Rounded line caps. Level number
  centered, bold, on a dark inner disc (`zinc-800/900`) so badges sit well on
  the app's dark theme.
- **Colors** (Tailwind 400-series, matching `src/lib/constants/factions.ts`
  hues):

  | Levels | Arc color                  | Rationale                          |
  | ------ | -------------------------- | ---------------------------------- |
  | 1      | `zinc-400` (#a1a1aa)       | Neutral entry level                |
  | 2–3    | `emerald-400` (#34d399)    | App's "alive/active" green         |
  | 4–7    | `amber-400` (#fbbf24)      | Mid ladder                         |
  | 8–9    | `orange-400` (#fb923c)     | High ladder                        |
  | 10     | `red-400` (#f87171)        | Top — matches the app's red accent |

- **Sizes**: `sm` ≈ 20px (leaderboard rows, match-history cards, chat/sidebar),
  `md` ≈ 32px (profile summary, player tiles), `lg` ≈ 64px (profile page hero,
  with ELO number + progress-to-next-level bar beneath).
- **Tooltip** (where hover exists): exact ELO, level range, progress to next
  level (e.g. `1134 ELO — Level 4 · 66 to Level 5`).
- All level→color/bracket mappings live in `src/lib/constants/ranking.ts`
  next to the brackets — the badge component contains **no magic numbers**.

### Where badges appear

1. **Leaderboard page** — rank, badge, nickname, ELO, W/L, win rate.
2. **Player profile** — `lg` badge + ELO + progress bar + peak rating, per
   rated game type (a single block today; one per variant later).
3. **Match history cards** — the stored per-game delta (e.g. `+27` / `−13`)
   rendered green/red, next to the player's badge at that time (optional v2:
   use `ratingAfter` to show historical level).
4. **Lobby / game room player tiles & community sidebar** — `sm` badge beside
   the nickname (subtle; never revealing anything about in-game roles).

## 7. Seasons

Lifetime rating **never resets**. Seasonal competition is a **view**, not
separate state:

- Every rated game stores `ratingDelta` on the player's `gameLogPlayers` row.
- A seasonal leaderboard = sum of `ratingDelta` where `finishedAt` falls in
  the season window, filtered to one `gameType` (rows already denormalize
  both fields).
- The all-time board sorts `playerRatings` by rating within a game type
  (`by_gameType_rating` index).

No season tables, no reset migrations, no cold starts.

## 8. Backfill

One-time internal migration replays the existing archive so the leaderboard is
meaningful on day one:

1. Load all **rated-game-type** `gameLogs` (today: `japanese_mafia`) sorted by
   `finishedAt` — **global chronological order across all games**, because
   each game's table average depends on everyone's rating at that moment.
2. Keep an in-memory rating map (`playerId → rating`, default `1000`). For
   each game: compute `T` from the map, then each player's `base + b` (§3);
   stamp `ratingDelta` + `ratingAfter` (+ `tableAvgRating`) on their
   `gameLogPlayers` row; update the map.
3. Write final `rating` + `peakRating` to each player's `playerRatings` row
   for that game type.

> The table adjustment makes the replay **order-dependent** — deltas depend on
> ratings at the time of each game, so the migration must process games
> strictly by `finishedAt` (a per-player walk is not valid). Games with
> `outcome: "no_contest"` get `ratingDelta: 0`.

## 9. Recalibration policy

269 decided games gives a standard error of ~±3 percentage points on each win
rate, so the E values are good but not gospel.

- Re-derive faction win rates from `gameLogs` every **~200 new decided games**
  (or quarterly) and update the payout constants.
- Payout changes apply **forward only** — past deltas are never re-adjusted.
- Only the faction win rates (E) recalibrate. The table-adjustment constants
  (`divisor: 20`, `cap: 16`) are structural — the cap scales with K (the base
  payout magnitude), the divisor is a deliberately loose spring — and only
  change if K changes.
- If faction balance shifts (e.g. after rule tweaks), the payouts follow it
  automatically at the next recalibration.
- Per game type: each rated `gameType` gets its own E table (§4).

## 10. Implementation plan

| # | Piece | Where | Notes |
| - | ----- | ----- | ----- |
| 1 | `RATING_CONFIG: Record<gameType, { start, floor, K, deltas, tableAdjustment: { divisor: 20, cap: 16 } }>` — one entry per **rated** game type (today: `japanese_mafia` only) | `convex/lib/constants.ts` | Server-only — clients never compute deltas (they read stored ones). A game type absent from the record is unrated. |
| 2 | `RANK_LEVELS` brackets + colors, `getLevelForRating()`, `getLevelProgress()` | `src/lib/constants/ranking.ts`, `src/lib/ranking/levels.ts` | Client-only, pure functions (same spirit as `visibility.ts`). Shared across game types by default (§1). |
| 3 | New `playerRatings` table: `{ playerId, gameType, rating, peakRating }`; indexes `by_playerId_gameType` + `by_gameType_rating`; register in `convex/schema.ts` | `convex/tables/playerRatings.ts` | One row per player per rated game type, created lazily on first rated game. Missing row ⇒ read as the default `1000` / Level 4 (no "unranked" state, §4). |
| 4 | Schema: `ratingDelta` + `ratingAfter` + `tableAvgRating` (`v.optional(v.number())`) on `gameLogPlayers`; optional `by_finishedAt` index for season sums | `convex/tables/gameLogPlayers.ts` | Denormalized for match-history cards — no parent join. `tableAvgRating` lets the card explain the delta ("table avg 1140"). |
| 5 | Apply payouts inside `archiveGameLog` | `convex/lib/games.ts` | Same mutation that updates `playerStats` ⇒ atomic with the archive. Look up `RATING_CONFIG[gameType]` — missing ⇒ skip rating entirely. Read all role-holders' pre-game ratings (missing row ⇒ 1000), compute `T` once, then per player `base + b`; skip host; clip at floor; record the clipped delta. |
| 6 | Backfill migration (§8) | `convex/migrations/` (internal mutation) | One-time; **global chronological replay** by `finishedAt` (order-dependent, §8); idempotent guard (skip rows that already have `ratingDelta`). |
| 7 | `<LevelBadge />` (§6) | `src/components/ranking/LevelBadge.tsx` | Single SVG component, `sm/md/lg`. |
| 8 | Leaderboard page + profile rating block + delta on match-history card | `src/app` / `src/components` | Leaderboard reads `playerRatings` via `by_gameType_rating`, scoped to one game type (single board today; game-type tabs when a second rated variant ships). Season view via `ratingDelta` sums. |

Run `npx tsc` after each schema/step change, per repo convention.

## 11. Trade-offs & future levers

Accepted deliberately (decided 2026-07):

- **Table strength is linear and capped, not full logistic ELO.** The `b`
  term values every ELO point of table difference equally and stops at ±8
  (~±160 difference) — beyond that, an even stronger table adds nothing. This
  is intentional: bounded, predictable numbers players can verify by hand,
  while still killing lobby-farming and gently mean-reverting runaway ratings.
- **Escape hatch — full logistic ELO.** If the linear cap ever proves too
  blunt, replace `base + b` with a rating-aware expectation using faction
  handicaps calibrated to the same base rates
  (`E = 1 / (1 + 10^(−(T − R + H)/400))`, `H ≈` Mafia −80, Citizens −125,
  Yakuza −159). The schema already stores everything needed; no reset
  required.
- **No individual-performance modifiers** (survival, detective checks, doctor
  saves, fouls): rating is pure team outcome — transparent and unfarmable.
  Individual stats stay on the profile via `roleStats` but never move rating.
