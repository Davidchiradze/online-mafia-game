# Sports Mafia — Rating (ELO)

> **Scope: `sports_mafia` only.** This doc owns one thing: the numbers that
> make Sports a *rated* variant, and why they are those numbers. The mechanism
> they plug into — formula shape, table adjustment, levels, seasons, annulment
> — is shared and lives in [ranking-system.md](../../ranking-system.md).
>
> Which faction won is decided elsewhere:
> [win-conditions.md](./win-conditions.md). Rating only reads the outcome.
>
> Sibling: [japanese/rating.md](../japanese/rating.md), whose calibration is
> **measured** from production data. Sports' is **declared**. That difference is
> the whole content of §2.

## 1. Status

**Rated**, with a declared symmetric calibration (decided 2026-08-16).

Sports shipped unrated on purpose — it had no calibration data and Japanese's
numbers would have been meaningless for a two-faction game. That gap is now
closed by *declaring* the calibration instead of measuring it (§2), so Sports
gets its own ladder without waiting for ~200 decided games.

Its ladder is **completely separate** from Japanese: separate rating, separate
peak, separate leaderboard, separate record. Winning or losing here moves
nothing on any other variant — see [ranking-system.md §1](../../ranking-system.md).

## 2. Calibration — declared, not measured

| Faction | Roles | Faction size | Chance of being dealt it | **E** |
| --- | --- | --- | --- | --- |
| Mafia | `DON` + 2×`MAFIA` | 3 / 10 | 30% | **0.500** |
| Citizens | `DETECTIVE` + 6×`CITIZEN` | 7 / 10 | 70% | **0.500** |
| No contest | — | — | — | — |

`E = 0.50` for both factions is a **rule of the ladder, not an observation**.
The classic sports format is defined as a balanced two-faction contest, and the
rating is set to treat it as exactly that: a win is worth precisely what a loss
costs, and every seat has the same expected value regardless of how often the
shuffle deals it.

**This is fixed. Sports does not recalibrate.** The per-variant recalibration
policy in [ranking-system.md §9](../../ranking-system.md) applies to variants
whose E values come from data; Sports opts out by construction — there is
nothing to re-derive, because 0.50 was never derived.

> **The risk this accepts, stated plainly.** If real Sports play is not 50/50 —
> say citizens win 55% — then citizens (70% of seats) earn ≈ +4 rating per game
> on average and mafia ≈ −4, so the ladder slowly rewards seat luck rather than
> skill, and everyone's rating inflates. Nothing detects this automatically; the
> only signal is the faction win rates in the archive. Changing the stance is a
> deliberate decision, not a maintenance task: swap the two `E` values for
> measured ones and the formula shape carries over unchanged.

## 3. Payouts

`K = 80`, the same as Japanese, so the two ladders move at the same pace (§4):

```
base = K × (S − E) = 80 × (S − 0.5)   →   S = 1 → +40   S = 0 → −40
```

| Faction | E | **Win** | **Loss** | EV/game for an average player |
| --- | --- | --- | --- | --- |
| Mafia | 0.500 | **+40** | **−40** | 0 |
| Citizens | 0.500 | **+40** | **−40** | 0 |
| No contest | — | 0 | 0 | 0 |

Two properties fall out of the symmetry, both different from Japanese:

- **No faction spread.** Japanese pays the hardest faction more for a win and
  charges it less for a loss, because its factions win at different rates. With
  a single shared E there is nothing to compensate for, so both rows are equal.
- **Zero drift.** Japanese carries a deliberate +0.16…+0.32/game rounding drift.
  `80 × (S − 0.5)` is exact at both outcomes, so the Sports ladder neither
  inflates nor decays on its own.

### The table adjustment

Identical to Japanese — `divisor: 20`, `cap: 16` — and it is the only reason
two Sports players in the same game can gain different amounts:

```
b = clamp( round((T − R) / 20), −16, +16 )
```

| You | Table avg `T` | `b` | Win | Loss |
| --- | --- | --- | --- | --- |
| 1000 | 1140 | +7 | **+47** | **−33** |
| 1400 | 1150 | −13 | **+27** | **−53** |
| 1050 | 1050 | 0 | **+40** | **−40** |

The cap (16) stays below the base (40), so the sign can never flip: a Sports win
pays at least **+24** and a loss costs at least **−24**. Full range: **+56** to
**−56**.

## 4. Why `K = 80` — pace parity with Japanese

Levels 1–10 use the **same brackets** for every variant
([ranking-system.md §5](../../ranking-system.md)), which only stays honest if a
game moves a rating by roughly the same amount in each. It does:

| | payouts | avg win rate | rating std per game |
| --- | --- | --- | --- |
| Japanese | +48 / −30 (mafia) | ~33.5% | ≈ **38** |
| Sports | +40 / −40 | 50% | ≈ **40** |

The wider Japanese payouts are cancelled by its lower win rate; the narrower
Sports spread by its higher one. A Level 7 therefore means a comparable amount
of above-average play on either ladder — which is exactly the assumption the
shared brackets encode.

A smaller `K` was considered and rejected: at `K = 40` (±20) the ±16 table cap
would nearly swallow the base, leaving a win at a weak table worth +4.

## 5. No backfill

Archived Sports games stay **permanently unrated**. They were played as unrated
games, and their rows keep `ratingDelta` absent — no chip on the match-history
card, no contribution to the ladder. The Sports leaderboard starts **empty** and
fills from the first game finished after the config ships.

> **This does not happen by itself, and it is now enforced.** `backfillRatings`
> (`convex/migrations.ts`) used to select games by "does this game type have a
> `RATING_CONFIG` entry" — the moment Sports got one, a re-run would have
> replayed the Sports archive and retro-rated every one of those games. It now
> takes a **required** `gameTypes` argument, writes nothing without
> `apply: true`, and checks `BACKFILL_POLICY` (`convex/lib/constants.ts`), where
> `sports_mafia` is **`"never"`**. Naming Sports explicitly is rejected too — the
> policy is the authority, not the caller.

## 6. What turns on when the config lands

Adding the `RATING_CONFIG` entry is not only a leaderboard change — several
surfaces read "is this game type rated" implicitly and start showing data:

| Surface | Before | After |
| --- | --- | --- |
| Lobby room card + game-room header "Avg ELO" | hidden (`getLiveTableAvgRating` returns `undefined` for an unrated type) | live table average of the Sports roster |
| Match-history card | no ± chip | `+40` / `−40` chip, with the table average behind it |
| Leaderboard | Japanese only | a Sports board, scoped to the Sports ladder |
| Profile | one ELO block | one block per rated variant |
| Staff annul | no rating to reverse | reverses the stored Sports delta, same as Japanese |

## 7. What deliberately does **not** change

- **Best move stays unscored.** Real sports mafia awards points for 2–3 correct
  guesses ([rules.md §6.7](./rules.md)); this rating does not, because rating is
  a pure team outcome with no individual-performance modifiers
  ([ranking-system.md §11](../../ranking-system.md)). The reason is no longer
  "Sports is unrated" — it is that the ladder has no per-player term at all.
  Adding one would also need the picks to be durable, which they are not.
- **No per-role adjustment.** Every role in a faction shares that faction's
  outcome, so faction granularity is the correct granularity here exactly as it
  is in Japanese.
- **Host and spectators are never rated**; they hold no role.
- **No-contest games move nothing** — including a Sports game that ends with
  everyone eliminated ([win-conditions.md §5](./win-conditions.md)).
