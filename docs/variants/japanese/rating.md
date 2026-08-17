# Japanese Mafia — Rating (ELO)

> **Scope: `japanese_mafia` only.** The numbers that calibrate the Japanese
> ladder, and the production data they were derived from. The mechanism they
> plug into — formula shape, table adjustment, levels, seasons, annulment — is
> shared and lives in [ranking-system.md](../../ranking-system.md).
>
> Which faction won is decided elsewhere:
> [win-conditions.md](./win-conditions.md). Rating only reads the outcome.
>
> Sibling: [sports/rating.md](../sports/rating.md), whose calibration is
> **declared** (a flat 0.50) rather than measured.

## 1. Calibration source

Snapshot from production as of **2026-07** (280 archived games, 269 decided):

| Faction | Wins | Win rate (E) | Faction size | Chance of being dealt it |
| -------- | ---- | ------------ | ------------ | ------------------------ |
| Mafia | 104 | **38.7%** | 3 / 12 | 25% |
| Citizens | 88 | **32.7%** | 7 / 12 | 58.3% |
| Yakuza | 77 | **28.6%** | 2 / 12 | 16.7% |
| No contest | 11 | — | — | — |

Average per-player win rate (weighted by faction size): **~33.5%**.

> Within a faction every role shares the outcome (the Don wins exactly when
> Mafia wins; the Doctor wins exactly when Citizens win) and every role appears
> in every game — so **faction-level payouts are the correct granularity**. No
> per-role adjustment is needed or wanted.

269 decided games gives a standard error of ~±3 percentage points on each win
rate, so these values are good but not gospel — hence the recalibration cadence
in §3.

## 2. Payouts

`K = 80` (the original K = 40 ratios scaled 2×), applied as `base = K × (S − E)`
and rounded to integers:

| Faction | E | **Win** | **Loss** | EV/game for an average player |
| -------- | ----- | ------- | -------- | ----------------------------- |
| Mafia | 0.387 | **+48** | **−30** | +0.16 |
| Citizens | 0.327 | **+54** | **−26** | +0.16 |
| Yakuza | 0.286 | **+56** | **−22** | +0.32 |
| No contest | — | 0 | 0 | 0 |

> **Why 2×?** The K = 40 base was tuned for stability, but with a median of
> only ~6 rated games per player the ladder over-compressed: replaying the real
> archive left 85% of players stuck in Level 4 (rating std ≈ 46). Doubling the
> payouts (formula and E untouched) spreads the same players across Levels 3–6
> (std ≈ 92, 41% out of Level 4) while preserving their ranking order.

Properties this calibration buys:

- **Role-fair**: the hardest faction (Yakuza) pays the most for a win and costs
  the least for a loss; the easiest (Mafia) the reverse. Expected value ≈ 0 in
  every seat, so no faction is worth farming.
- **Win ≈ 2× loss** at a balanced table — the compensation for a ~33.5% average
  win rate. (Sports needs no such spread; at a declared 50/50 its win and loss
  are equal.)
- The tiny positive drift (+0.16…+0.32/game ≈ +20 rating per 100 games) is a
  deliberate rounding choice: imperceptibly slow inflation beats slow decay.

The shared table-strength term `b` (divisor 20, cap ±16) is added on top —
worked examples in [ranking-system.md §3](../../ranking-system.md). Because the
cap sits below the smallest base number (yakuza loss −22), a win never pays ≤ 0
and a loss never turns positive. Maximum swing: **+72** / **−46**.

## 3. Recalibration

Japanese **does** recalibrate — its E values are measurements, and measurements
go stale when the rules or the meta change:

- Re-derive faction win rates from `gameLogs` every **~200 new decided games**
  (or quarterly) and update the payout constants.
- Only the E-derived payouts move. `divisor: 20` and `cap: 16` are structural —
  the cap scales with K, the divisor is a deliberately loose spring — and change
  only if K changes.
- Payout changes apply **forward only**; past deltas are never re-adjusted.
- If faction balance shifts after a rule tweak, the payouts follow it at the
  next recalibration automatically.

## 4. Backfill

The Japanese archive **was** replayed, so the ladder was meaningful on day one:
a global chronological replay by `finishedAt` (order matters — every game's
table average depends on the ratings at that moment), stamping `ratingDelta`,
`ratingAfter` and `tableAvgRating` on each row. Mechanism and re-run caveats:
[ranking-system.md §8](../../ranking-system.md).
