# Serial Killer Mafia — Rating (ELO)

> **Status: DESIGNED — NOT BUILT.** The variant is unregistered, so it is
> neither rated nor ratable today. Rest of the design: [rules.md](./rules.md),
> [win-conditions.md](./win-conditions.md).
>
> This doc owns one question — is the variant rated, and on what numbers. The
> mechanism those numbers plug into (formula shape, table adjustment, levels,
> seasons, annulment) is shared and lives in
> [ranking-system.md](../../ranking-system.md).

## 1. Decision — launch UNRATED

**Decided 2026-08-18.** A missing `RATING_CONFIG` entry means `archiveGameLog`
skips rating entirely, with no error. That is a legitimate choice and it is the
one taken here, but
[ranking-system.md §13](../../ranking-system.md) is emphatic that it must be a
**choice**: an oversight and a decision look identical in the code, which is why
this file exists before the variant does.

Sports set the precedent — it shipped unrated on purpose, ran, and was given a
ladder later ([sports/rating.md §1](../sports/rating.md)).

Three reasons the same sequencing applies here, the third of which is a hard
blocker rather than a preference:

1. **No calibration data.** Neither sibling's numbers transfer. Japanese's are
   measured from its own archive; Sports' declared 0.50/0.50 is a statement
   about a *balanced two-faction contest*, which this is not.
2. **The faction is not balanced by construction.** One player in seven-to-one
   opposition, with a single bullet, is not a 1-in-3 shot at a win. There is no
   defensible declared `E` — this variant genuinely needs ~200 decided games and
   the measured path (§2).
3. **A Serial Killer win cannot be stored yet.** `gameLogs.winner`,
   `winMethodValidator.faction`, and both `gameLogPlayers` unions are closed over
   `mafia | yakuza | citizens`. Rating reads an outcome it has no column for
   ([rules.md §10](./rules.md)). This is schema work, and it blocks rating
   whatever `E` you would have picked.

## 2. When it becomes rated — the measured path

Per [ranking-system.md §2](../../ranking-system.md) and §13, in order:

1. **Widen the faction union first** — all four validators, plus
   `RatingConfig.deltas` (keyed by `Faction`) and the four local re-declarations
   that will not produce a compile error when the shared type changes
   ([rules.md §10](./rules.md)).
2. **Play ~200 decided games unrated** and measure each faction's real win rate.
   That is `E`, per faction, for this variant only.
3. **Derive payouts** as `K × (S − E)`. Cover **exactly** this variant's three
   factions — no dead row, and none missing.
   `tests/structure/ratedVariants.test.ts` checks the config against the
   registry, so a mismatch is a build failure rather than a silent hole.
4. **Check `K` against the volatility band** (§5 there): rating std per game
   ≈ 38–40 keeps the shared level brackets honest across variants. Both existing
   variants use `K = 80`; expect this one to need a different value, because a
   faction that wins rarely gets a large win payout, and a one-in-eleven role
   winning at a low rate is exactly that shape.
5. **Check the safety property**: the table-adjustment cap must stay strictly
   below the *smallest* base payout, or a win at a weak table can round to
   nothing. Both siblings use `divisor: 20, cap: 16` against a smallest base of
   40. A rare-faction payout is larger, not smaller, so the risk is on the
   common factions' side.
6. **Decide backfill explicitly** in `BACKFILL_POLICY`
   (`convex/lib/constants.ts`). Proposed: **`"never"`**, matching Sports — games
   played and shown to players as unrated should stay that way. The migration
   sweeps a variant's whole archive as soon as a config exists unless the policy
   says otherwise, so this is not optional.

## 3. The one calibration question this variant raises that neither sibling did

`E` is a faction's win rate, and payouts are per faction. With one player per
Serial Killer game, "the Serial Killer faction's win rate" and "that one
player's win rate" are the same number — so the payout for a Serial Killer win
will be large and its loss cheap, and a player is dealt the role roughly one
game in eleven.

That is the formula working as intended, and it is the same logic that pays
Japanese's Yakuza more than its Citizens. It is worth stating anyway, because
the asymmetry is much sharper here and will look like a bug the first time
someone sees a Serial Killer win pay triple a Citizens win.

## 4. What does not change

- **Host and spectators are never rated** — they hold no role.
- **No-contest games move nothing.**
- **No per-player performance term.** Rating is a pure team outcome
  ([ranking-system.md §11](../../ranking-system.md)). Surviving to the 1-on-1 as
  the Serial Killer is worth exactly one Serial Killer win, with no bonus.
- **The ladder is per-`gameType`.** `playerRatings` is keyed by
  `(playerId, gameType)`, so this variant's ELO is automatically separate from
  Japanese's and Sports' the moment a config exists. Nothing cross-contaminates.
