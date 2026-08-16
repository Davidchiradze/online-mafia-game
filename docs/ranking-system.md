# Ranking System (ELO + Levels)

> Status: **Implemented**, Japanese backfilled. This document is the single
> source of truth for the **mechanism** of the player ranking system: a
> faction-calibrated, table-strength-adjusted ELO rating plus FACEIT-style skill
> **Levels 1–10** with custom badges.
>
> Ratings are **namespaced per game type** — every variant has its own ladder,
> its own record, and its own calibration, the way chess.com keeps blitz and
> rapid apart. The *numbers* for each rated variant live with that variant:
>
> | Variant | Ladder | Calibration |
> | --- | --- | --- |
> | `japanese_mafia` | rated | [variants/japanese/rating.md](./variants/japanese/rating.md) — measured from 269 decided games |
> | `sports_mafia` | rated | [variants/sports/rating.md](./variants/sports/rating.md) — declared 0.50 / 0.50, never recalibrated |
> | `city_mafia` | unrated | no definition registered, so no ladder |
>
> Rating math runs server-side inside `archiveGameLog` (`convex/lib/games.ts`);
> levels and badges are display-only and derived on the client.

## 1. Purpose

Give players a persistent skill rating that is **fair regardless of which role
the shuffle deals them**, and **fair across variants that are not the same
game**. A naive "+25 win / −25 loss" system, applied globally, would:

1. Bleed the average player's rating wherever the average win rate is below 50%
   (in Japanese's 3-faction format the average player wins only ~33.5% of
   games), and
2. Make some faction's seats strictly more profitable than another's — in
   Japanese, Mafia over Yakuza — and
3. Mix skill at one variant into the rating shown for another, so a strong
   Japanese player would arrive at a Sports table already ranked.

The fix has two halves. Per game: payouts **calibrated to each faction's win
rate in that variant** — so the expected rating change for an average player is
~zero in every seat — plus a **bounded table-strength adjustment** so winning
against stronger tables pays extra and farming weaker ones doesn't (§3). Across
games: **one ladder per variant**, below.

### Multi-game principle

The platform hosts **multiple variants, and each has its own ELO calculation**.
Nothing about a rating is global:

- A player has **one rating per `gameType`**, stored in a dedicated
  `playerRatings` table keyed by `(playerId, gameType)` — never a single
  rating field on `playerStats`.
- A player's **record** — wins, losses, streaks, per-role stats — is per
  `gameType` too (§12). A Sports board that showed Japanese win/loss beside a
  Sports ELO would be reporting a different game's results.
- Payouts/K/start/floor/table-adjustment live in a **per-game-type config**
  (`RATING_CONFIG[gameType]`), and each config's payouts are keyed by **that
  variant's own factions** — Sports has no yakuza row to fill in. A game type
  with no config is simply **unrated**: `archiveGameLog` skips rating for it,
  silently and by design.
- Calibration is **per variant and may be derived differently per variant**.
  Japanese measures its E values from its archive and recalibrates on a cadence;
  Sports declares a flat 0.50 and never recalibrates. Both plug into the same
  formula (§3).
- Leaderboards, seasons, and profile badges are always **scoped to one game
  type** (`gameLogPlayers` already denormalizes `gameType`, so per-game season
  sums come for free).
- Level **brackets** (§5) are shared across game types deliberately — one
  mental model for players, like FACEIT — which is only honest while every
  ladder moves at a comparable pace (§5).
- Nothing outside the registry and the config names a variant. Adding the third
  or fourth variant is a config entry, not a code path (§13).

## 2. Calibration sources (per variant)

> **Moved.** Each variant's E values, the data behind them and its payout table
> now live with that variant, because they are that variant's rules — not the
> platform's:
>
> | Variant | E comes from | Doc |
> | --- | --- | --- |
> | `japanese_mafia` | **measured** — 269 decided games, 2026-07 | [variants/japanese/rating.md](./variants/japanese/rating.md) |
> | `sports_mafia` | **declared** — a balanced two-faction contest, 0.50 / 0.50 | [variants/sports/rating.md](./variants/sports/rating.md) |
>
> This heading keeps its number: `convex/lib/constants.ts` cites §2–§3.

What is shared is the **granularity**, and it is worth stating once. Within a
faction every role shares the outcome (the Don wins exactly when Mafia wins;
the Detective wins exactly when Citizens win) and every role appears in every
game — so **faction-level payouts are the correct granularity** in any variant.
No per-role adjustment is needed or wanted.

The two ways to arrive at an E value are both legitimate, and the choice is a
per-variant one:

- **Measured** — derive each faction's win rate from that variant's archive,
  and recalibrate on a cadence (§9). Correct by construction, but needs volume:
  ~200 decided games before the numbers mean anything.
- **Declared** — assert the intended balance (e.g. 0.50 / 0.50 for a symmetric
  two-faction game) and hold it fixed. Available on day one and verifiable by
  hand, at the cost of being wrong if the variant turns out unbalanced. The
  variant doc must then say so out loud.

## 3. Rating formula

> **Shape is shared; every constant is per variant.** `RATING_CONFIG` is keyed
> by `gameType`, and a variant absent from it is unrated rather than rated with
> someone else's numbers. The base payouts below are Japanese's — Sports uses
> the same formula with `E = 0.5`, giving ±40 ([sports/rating.md §3](./variants/sports/rating.md)).

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

Rounded to integers, the **base** payouts per rated variant are:

| Variant | Faction | E | **Win** | **Loss** |
| --- | --- | ----- | ------- | -------- |
| `japanese_mafia` | Mafia | 0.387 | **+48** | **−30** |
| `japanese_mafia` | Citizens | 0.327 | **+54** | **−26** |
| `japanese_mafia` | Yakuza | 0.286 | **+56** | **−22** |
| `sports_mafia` | Mafia | 0.500 | **+40** | **−40** |
| `sports_mafia` | Citizens | 0.500 | **+40** | **−40** |
| either | No contest | — | 0 | 0 |

Rationale for each column belongs to the variant:
[japanese/rating.md §2](./variants/japanese/rating.md) explains the 2× scaling
and the ~2:1 win/loss ratio; [sports/rating.md §3](./variants/sports/rating.md)
explains why a symmetric E collapses that spread to a single pair of numbers and
removes the drift.

> **Why K = 80 for both?** In Japanese, the K = 40 base over-compressed the
> ladder — replaying the real archive left 85% of players stuck in Level 4
> (rating std ≈ 46); doubling it spread the same players across Levels 3–6
> (std ≈ 92) with their ranking order preserved. Sports then inherits K = 80 not
> by copying but because it lands on the same per-game volatility (≈40 vs ≈38),
> which is the condition for sharing level brackets (§5).

### The table adjustment `b`

`b` is **symmetric** — the same signed value is added to every result:

| Table vs you       | Win       | Loss       |
| ------------------ | --------- | ---------- |
| Stronger (`T > R`) | pays more | costs less |
| Weaker (`T < R`)   | pays less | costs more |

Worked examples (Japanese Citizens, base +54 / −26 — the Sports equivalents are
in [sports/rating.md §3](./variants/sports/rating.md)):

- You are `1000`, table average `1140` → `b = +7`. Win **+61**, loss **−19**.
- You are `1400`, table average `1150` → `b = −12` (from −12.5). Win **+42**,
  loss **−38**.
- You are `1050`, table average `1050` → `b = 0`. Base numbers apply as-is.

> **Exact halves round toward +∞**, because the term is `Math.round`. So −12.5
> becomes −12, not −13: at a `.5` boundary the player keeps one point. This doc
> claimed −13 until `tests/convex/ratings.test.ts` was written and pinned what
> actually ships. The one-point asymmetry is left alone deliberately — changing
> it would move shipped payouts to fix a rounding aesthetic.

Why these numbers are safe:

- `1 point per 20 ELO` keeps the divisor deliberately loose (a weaker spring
  than the K-linear value would give at K = 80) so skilled players can
  separate. The hard cap of ±16 (reached at ±320 table difference) bounds how
  much any lobby can swing a result.
- **The cap must stay below the smallest base number in every rated variant.**
  In Japanese the smallest are +48 / −22, so a win always pays at least +32 and
  a loss always costs at least −6; in Sports they are ±40, so at least ±24.
  Either way a win can never become ≤ 0 and a loss can never turn positive, no
  matter how lopsided the table. This is the constraint a new variant's config
  has to satisfy — check it before shipping a lower K (§13).

Properties:

- **Role-fair**: where factions win at different rates, the hardest one pays the
  most for a win and costs the least for a loss (Japanese: Yakuza most, Mafia
  least). Where they are declared equal, the payouts are equal. Expected value
  ≈ 0 in every seat either way.
- **Table-fair**: beating a stronger table pays more; farming weaker tables
  pays less *and* losing to them costs more — high-rated players can't grind
  beginner lobbies for full value.
- **Win : loss ratio tracks the average win rate.** ≈ 2:1 in Japanese (~33.5%
  average win rate), 1:1 in Sports (50%). Drift follows: Japanese carries a
  deliberate +0.16…+0.32/game rounding inflation, Sports exactly zero. The
  symmetric `b` adds no drift of its own in either.

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
- **Annulled games** (staff action): a moderator or admin can annul a finished
  game from the `/admin/archive` list (`game.annul` permission → `annulGame`),
  which converts it to a no-contest and **reverses** each player's rating for
  that game —
  `rating −= ratingDelta` (the stored, already-clipped delta), re-clamped at the
  floor. The reversal is **forward-only**: games played *after* the annulled one
  are **not** recomputed, so their table averages (`T`) keep the values they were
  computed with — the same "past deltas are never re-adjusted" stance as
  recalibration (§9). `peakRating` is left untouched (it was genuinely reached).
  Each player's `playerStats` is fully recomputed from their `gameLogPlayers`
  history (so wins/losses/streaks self-correct), and the game's rows are rewritten
  as a no-contest (`outcome: "no_contest"`, `ratingDelta: 0`) — which also makes a
  second annul a no-op. Only games with a decided `winner` can be annulled; a
  no-contest has no ELO to reverse. Logic: `annulGameLog` in `convex/lib/games.ts`.
- **Host & spectators**: never rated. The host holds no role/faction and is
  naturally absent from role-holder archives.
- **Leavers**: a player who abandons a game that later finishes with a winner
  keeps their faction's outcome (usually a loss). No extra penalty in v1.
- **Peak rating** is stored alongside current rating (same pattern as
  `bestStreak`), and is per game type like everything else.
- **Scope**: ratings are per game type (§1). `japanese_mafia` and
  `sports_mafia` are rated, each with its own config and E table;
  `city_mafia` has no definition registered at all, so it cannot be played and
  is not a ladder. A player carries an independent rating, peak, level and
  record on each ladder, starting at 1000 / Level 4 on a ladder they have never
  played — there is no transfer, seeding or cross-credit between variants.
- **Rating never leaves its variant.** The delta is computed from
  `RATING_CONFIG[game.gameType]` and written to the `playerRatings` row for
  that same game type. There is no code path that reads one variant's rating
  while writing another's, and the schema has no place to express one.

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
  function (`getLevelForRating`) in `src/shared/lib/ranking/levels.ts`, brackets in
  `src/shared/lib/constants/ranking.ts`.
- Bounds are inclusive: rating `750` is Level 2, `751` is Level 3.
- The rating floor (`100`) equals Level 1's lower bound, so a level always
  exists for any rating.
- New players (1000) start at **Level 4** — same as FACEIT.
- **Progress within a level** (for progress bars / badge tooltips):
  `progress = (rating − min) / (max − min)`, Level 10 is always shown full.
- Pacing sanity check: max single-game gain is +72 (Japanese base +56 + table
  cap +16; Sports tops out at +56) and the narrowest bracket is 150 wide, so a
  player still can never skip a level in one game. A solidly above-average
  Japanese player (~40% personal win rate) gains ~+5.2/game at balanced tables —
  brisk enough that levels move with real play, while the symmetric table
  adjustment still slows climbing once a player out-rates their usual tables.

### Why one bracket table can serve every variant

Shared brackets are a **claim** — that Level 7 means something comparable
wherever you earned it — and the claim holds only while the ladders move at
comparable speed. They currently do, because each variant's calibration is
chosen with that in mind:

| Variant | payouts | avg win rate | rating std per game |
| --- | --- | --- | --- |
| `japanese_mafia` | +48 / −30 (mafia seat) | ~33.5% | ≈ **38** |
| `sports_mafia` | +40 / −40 | 50% | ≈ **40** |

Wider payouts are cancelled by a lower win rate and vice versa. **A new
variant's K should be chosen to land in this band** rather than copied blindly
(§13); if one ever cannot, that variant overrides the brackets in its own config
instead of quietly climbing twice as fast on the shared ones.

## 6. Level badges (our own design)

We render our **own** badge set — one visual per level, FACEIT-inspired
(circular gauge + centered level number) but drawn in the app's palette.

### Design spec

- **One React SVG component**, not 10 static image files:
  `<LevelBadge level={1..10} size="sm" | "md" | "lg" />` in
  `src/shared/ui/LevelBadge.tsx`. SVG keeps badges crisp at every
  size, themeable, and adding a level-11 rebracket later is a constants change.
- **Geometry**: circular ring gauge with a gap at the bottom (like a car
  dial). The arc sweep is proportional to the level — `level / 10` of the
  ring — so higher levels visibly "fill up". Rounded line caps. Level number
  centered, bold, on a dark inner disc (`zinc-800/900`) so badges sit well on
  the app's dark theme.
- **Colors** (Tailwind 400-series, matching `src/shared/lib/constants/factions.ts`
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
- All level→color/bracket mappings live in `src/shared/lib/constants/ranking.ts`
  next to the brackets — the badge component contains **no magic numbers**.

### Where badges appear

1. **Leaderboard page** — rank, badge, nickname, ELO, W/L, win rate. **One
   board per rated variant**, selected by a tab; every number on a row comes
   from that variant only.
2. **Player profile** — `lg` badge + ELO + progress bar + peak rating, **one
   block per rated game type**. A player who only plays Sports shows a Sports
   block; the Japanese default (1000 / Level 4) is not paraded as an
   achievement.
3. **Match history cards** — the stored per-game delta (e.g. `+27` / `−13`)
   rendered green/red, next to the player's badge at that time (optional v2:
   use `ratingAfter` to show historical level). The delta already belongs to
   the row's own `gameType`, so a mixed-variant history reads correctly with no
   extra work.
4. **Lobby / game room player tiles & community sidebar** — `sm` badge beside
   the nickname (subtle; never revealing anything about in-game roles).

> **Which ladder does a badge show?** The one belonging to the context it is
> rendered in: a Sports room shows Sports ELO on every tile, a Japanese room
> Japanese. A badge next to a nickname **outside** any variant context (the
> community sidebar) must pick one deliberately and label it — an unlabelled
> number is read as "their rating", which no longer exists as a single value.

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

One-time internal migration replays an existing archive so a leaderboard is
meaningful on day one. **It has been run for `japanese_mafia`. It must not be
re-run as-is** — see the warning below.

1. Load all **rated-game-type** `gameLogs` sorted by
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

> **Backfilling is a per-variant decision, and the migration now says so.** It
> used to select games by "does this game type have a `RATING_CONFIG` entry",
> which would have swept a newly rated variant's whole archive in — including
> games that were played, and shown to players, as unrated. Two locks replaced
> that:
>
> - **`BACKFILL_POLICY`** (`convex/lib/constants.ts`) — `"replay"` or `"never"`
>   per variant, a **total** record over the same union `RATING_CONFIG` is keyed
>   by, so a new variant cannot be added without answering the question.
> - **`backfillRatings` takes a required `gameTypes` argument** and is a **dry
>   run unless `apply: true`**. There is no "all", and a type the policy refuses
>   is rejected before anything is read.
>
> Sports is `"never"` ([sports/rating.md §5](./variants/sports/rating.md)): its
> ladder starts empty and fills from the first game finished after its config
> ships.

## 9. Recalibration policy

**Recalibration is per variant, and whether a variant recalibrates at all is
part of its calibration decision.**

| Variant | Policy |
| --- | --- |
| `japanese_mafia` | **Recalibrates.** Its E values are measurements (~±3pp standard error at 269 games), so they go stale — re-derive every ~200 new decided games or quarterly ([japanese/rating.md §3](./variants/japanese/rating.md)). |
| `sports_mafia` | **Does not.** Its E values are declared 0.50, not derived, so there is nothing to re-derive. Changing them is a deliberate decision with its own trade-off, recorded in [sports/rating.md §2](./variants/sports/rating.md). |

Rules that apply to any recalibration:

- Payout changes apply **forward only** — past deltas are never re-adjusted.
- Only the faction win rates (E) recalibrate. The table-adjustment constants
  (`divisor: 20`, `cap: 16`) are structural — the cap scales with K (the base
  payout magnitude), the divisor is a deliberately loose spring — and only
  change if K changes.
- If faction balance shifts (e.g. after rule tweaks), a measured variant's
  payouts follow it automatically at the next recalibration; a declared one
  does not, which is exactly what "declared" means.
- Re-derive from **that variant's** games only. `gameLogs` denormalizes
  `gameType`, so the query is a filter, never a join across ladders.

## 10. Implementation surfaces

Where each piece lives, and whether it is **already** variant-aware. This is the
gap analysis for making a second variant rated — not a sequenced plan.

| Piece | Where | Variant-aware? |
| --- | --- | --- |
| `RATING_CONFIG` — `{ start, floor, deltas, tableAdjustment }` per game type; absent ⇒ unrated | `convex/lib/constants.ts` | ✓ keyed by game type, and `deltas` prices only the variant's **own** factions. A type cannot know which those are, so exact coverage is a build failure in `tests/structure/ratedVariants.test.ts` instead. |
| `computeRatingDelta` — the pure formula | `convex/lib/ratings.ts` | ✓ fully config-driven; shared by the live path and the migration so they cannot drift. A faction the config does not price moves nothing rather than throwing — a throw here would roll back the whole archive. |
| `playerRatings` table + `by_playerId_gameType` / `by_gameType_rating` | `convex/tables/playerRatings.ts` | ✓ one row per (player, game type). Nothing to change, ever, per variant. |
| Snapshot/apply helpers, default-rating reads | `convex/lib/playerRatings.ts` | ✓ resolves the config by game type; returns `null` (skip) for unrated. |
| Live table average shown in lobby/room | `convex/lib/playerRatings.ts` → `getLiveTableAvgRating` | ✓ per game type; starts rendering for a variant the moment it has a config. |
| Rating pass inside `archiveGameLog`; annul reversal | `convex/lib/games.ts` | ✓ both. `bumpPlayerStats` takes the game's type, and the annul recompute rebuilds only that variant's record (§12). |
| Per-game snapshot on the log row (`ratingDelta`, `ratingAfter`, `tableAvgRating`) | `convex/tables/gameLogPlayers.ts` | ✓ already denormalizes `gameType` alongside them. |
| Backfill migration | `convex/migrations.ts` | ✓ scoped: required `gameTypes` arg, dry run by default, and `BACKFILL_POLICY` refuses a variant whose archive must stay unrated (§8). |
| `playerStats` — wins/losses/streaks/`roleStats` | `convex/tables/playerStats.ts` | ✓ one row per `(playerId, gameType)`, with `by_playerId` kept for the cross-variant readers (§12). |
| Profile stats query | `convex/games/core/gameLogs.ts` → `getMyStats` | ✓ takes a required `gameType` — required, not defaulted, so the hardcode cannot come back one layer down. |
| Leaderboard query | `convex/games/core/leaderboard.ts` | ✓ every column belongs to the board's own variant, rating and record alike. |
| Deliberately cross-variant readers | `convex/integrations/playerStats.ts`, `convex/admin/stats.ts` | ✓ by design — they fold a player's rows with `mergePlayerStats` (public `gamesPlayed` is global by contract, /docs/public-api.md §3). |
| Leaderboard ref | `convex/refs/leaderboard.ts` | ✓ `gameType` is already an argument. |
| Leaderboard page | `src/features/headquarters/leaderboard/LeaderboardContent.tsx` | ✗ hardcodes `gameType: "japanese_mafia"`; no tabs. |
| Levels, brackets, `<LevelBadge />` | `src/shared/lib/constants/ranking.ts`, `src/shared/lib/ranking/levels.ts`, `src/shared/ui/LevelBadge.tsx` | ✓ variant-agnostic by design (§5) — shared brackets are the intended behaviour, not an oversight. |
| Faction union + log validators | `convex/lib/roles.ts`, `convex/tables/gameLogPlayers.ts` | ⚠️ `"mafia" \| "yakuza" \| "citizens"` is a global union. A future variant with a **new** faction touches the schema, not just a config (§13). |
| Variant labels for tabs/filters | `messages/en.json`, `messages/ka.json` (`game.gameTypes.*`) | ✓ keys already exist for all three ids, at parity in both locales. |

The gate for any of it is `npm run lint && npm run typecheck && npm test`.

## 11. Trade-offs & future levers

Accepted deliberately (decided 2026-07):

- **Table strength is linear and capped, not full logistic ELO.** The `b`
  term values every ELO point of table difference equally and stops at ±16
  (±320 difference, per §3) — beyond that, an even stronger table adds nothing. This
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
  This is why a Sports best move scores nothing, and it would remain true even
  if the picks were durable.
- **Sports' E values are declared, not measured** (decided 2026-08-16). A
  symmetric 0.50 is available on day one, gives exactly zero drift, and is
  verifiable by hand — but it is an assertion about balance that no data backs
  and no cadence revisits. If the real split is lopsided, the more common seat
  quietly earns more. The full statement of the risk, and what changing it would
  take, is in [sports/rating.md §2](./variants/sports/rating.md).
- **Level brackets are shared across variants** rather than per-ladder. One
  mental model for players, at the cost of a constraint on every future
  calibration: a new variant's K has to land in the same volatility band, or it
  climbs faster for the same skill (§5).
- **Ladders never interact.** No seeding a new ladder from an existing one, no
  cross-variant "overall" rating. A strong Japanese player starts Sports at 1000
  like everyone else. Simple and honest, at the cost of a fresh grind per
  variant — the same trade chess.com makes between time controls.

## 12. Per-variant player record

A rating is only half of "a player's standing in a variant". The other half —
**wins, losses, no-contests, streaks and per-role stats** — used to live in one
global `playerStats` row per player, keyed by `playerId` alone. That was
correct while effectively every archived game was Japanese, and wrong the
moment a second variant was played:

- A leaderboard joined `playerStats` for its W/L, win rate, best streak and
  "top role" columns, so a Sports row would report a player's **Japanese**
  results beside their Sports ELO.
- `roleStats` mixed vocabularies. `SHOGUN` and `DOCTOR` exist only in Japanese;
  `CITIZEN` and `DETECTIVE` exist in both and were silently summed across two
  different games. "Top role" became a statement about neither variant.
- A win streak spanning both variants describes nothing a player recognises.

**Decision (2026-08-16), implemented: the record splits per variant, exactly
like the rating.** One row per `(playerId, gameType)`, so every leaderboard
column, profile block and streak is scoped to the ladder it is displayed on.

| Concern | How it landed |
| --- | --- |
| Schema | `gameType` + a `(playerId, gameType)` index on `playerStats`; `by_playerId` kept, because the cross-variant readers need every row. |
| Write path | `bumpPlayerStats(ctx, playerId, gameType, role, outcome)` — `archiveGameLog` already had the game's type in scope. |
| Annulment | The recompute filters that player's `gameLogPlayers` history to the annulled game's variant, so annulling a Japanese game cannot touch a Sports streak. |
| Shared aggregation | `aggregateHistory` is the one definition of what the counters mean; the annul path and the migration both call it, so a rebuild cannot drift from the incremental writer. |
| Reads | `getMyStats` takes a **required** `gameType`; the leaderboard joins the same-variant row. Genuinely global readers (public `gamesPlayed`, admin board) fold rows with `mergePlayerStats`. |
| Migration | `splitPlayerStatsByGameType` rebuilds from `gameLogPlayers` rather than stamping a type onto the existing row — a single row holds two variants' games mixed, and only the archive can separate them. Dry run by default. |
| UI + i18n | Still open: a variant selector on the profile and the leaderboard. `game.gameTypes.*` labels already exist in both locales; anything new needs `en` **and** `ka`. |

> **The migration's dry run is not a formality.** On the dev deployment it
> reported **129 `sports_mafia` rows against 16 `japanese_mafia`**, with 9
> players having played both. The "every existing row is Japanese history in
> practice" assumption was simply false there, and stamping it would have
> mislabelled 129 records. Read `byGameType` and `playersWithMultipleVariants`
> on every deployment before applying.

Streaks deserve one explicit note: `currentStreak` / `bestStreak` are
**per variant**, so a player can hold a live streak on two ladders at once.
That is the intended reading — a Sports streak is a statement about Sports. The
cross-variant fold therefore reports **no streak at all**, rather than an
invented one.

## 13. Adding a rated variant

The scalability contract, in the order it bites. Two more variants are expected;
none of this should require touching the engine.

1. **Register the variant first.** Rating reads `game.gameType`; a variant with
   no definition in `convex/games/registry.ts` cannot produce a rated game.
   Everything below assumes the checklist in the `add-game-variant` skill is
   done.
2. **Decide rated or unrated, deliberately.** A missing `RATING_CONFIG` entry is
   a silent, valid choice — `archiveGameLog` skips rating with no error. Say
   which it is in the variant's docs either way; an oversight and a decision
   look identical in the code.
3. **Choose how E is derived** (§2): measured needs ~200 decided games and buys
   in to the recalibration cadence (§9); declared is available immediately and
   opts out of it. Record the choice and its risk in
   `docs/variants/<id>/rating.md`.
4. **Cover exactly that variant's factions.** Payouts are per faction, and the
   faction set comes from the definition — a two-faction variant must not carry
   a third faction's row, and a variant that introduces a **new** faction needs
   the shared `Faction` union and the `gameLogPlayers` / `gameLogs` validators
   widened first. That is schema work, not config work.
5. **Check K against the volatility band** (§5): std per game ≈ 38–40 keeps the
   shared level brackets meaningful. Then check the safety property (§3): the
   table-adjustment cap must stay below the smallest base payout, or a win at a
   weak table can round to nothing.
6. **Decide backfill explicitly** (§8). The migration will otherwise sweep the
   new variant's whole archive in as soon as its config exists.
7. **Add the ladder to the surfaces that enumerate variants** — leaderboard tab,
   profile block — not to any that branch on one (§10). If a new `if (gameType
   === …)` is needed anywhere in the rating path, the config is missing a field.
8. **Docs**: a `docs/variants/<id>/rating.md` alongside the variant's other
   docs, and a row in the calibration table in §2 here. The variant doc owns
   the numbers; this doc owns the mechanism.
