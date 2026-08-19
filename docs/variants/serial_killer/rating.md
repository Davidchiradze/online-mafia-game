# Serial Killer Mafia — Rating (ELO)

> **Scope: `serial_killer_mafia` only.** This doc owns one thing: the numbers
> that make this variant *rated*, and why they are those numbers. The mechanism
> they plug into — formula shape, table adjustment, levels, seasons, annulment —
> is shared and lives in [ranking-system.md](../../ranking-system.md).
>
> Which faction won is decided elsewhere:
> [win-conditions.md](./win-conditions.md). Rating only reads the outcome. Rest
> of the design: [rules.md](./rules.md).
>
> Siblings: [japanese/rating.md](../japanese/rating.md) is **measured** from
> production data; [sports/rating.md](../sports/rating.md) is **declared**. This
> one is declared too — and it is the only variant whose `K` is not 80 (§3).

## 1. Status

**Rated** — live, with a declared three-way symmetric calibration (decided and
shipped 2026-08-19).

It launched unrated on purpose and stayed that way for a day. The reasoning then
was that a solo faction has no comparable ladder to calibrate against and the
variant needed ~200 decided games first. That is now overtaken by the same move
Sports made: *declare* the balance instead of measuring it (§2), and the ladder
opens immediately.

> **Two claims in the previous version of this doc were wrong; do not go looking
> for them.**
>
> - It listed a hard blocker — "a Serial Killer win cannot be stored,
>   `gameLogs.winner`, `winMethodValidator.faction` and both `gameLogPlayers`
>   unions are closed over `mafia | yakuza | citizens`". Those unions, the
>   `Faction` type, every local re-declaration and both locale files were all
>   widened when the variant shipped ([rules.md §10](./rules.md)). Rating this
>   variant was config work, not schema work.
> - It predicted "a Serial Killer win will pay triple a Citizens win". Under a
>   declared equal `E` it pays exactly the same. The asymmetry that *does*
>   survive is a different one (§2).

Its ladder is **completely separate** from both siblings: separate rating,
separate peak, separate leaderboard, separate record. `playerRatings` is keyed by
`(playerId, gameType)`, so nothing here can move a Japanese or Sports number —
see [ranking-system.md §1](../../ranking-system.md).

## 2. Calibration — declared, not measured

| Faction | Roles | Faction size | Chance of being dealt it | **E** |
| --- | --- | --- | --- | --- |
| Mafia | `DON` + 2×`MAFIA` | 3 / 11 | 27.3% | **0.333** |
| Serial Killer | 1×`SERIAL_KILLER` | 1 / 11 | 9.1% | **0.333** |
| Citizens | `DETECTIVE` + `DOCTOR` + 5×`CITIZEN` | 7 / 11 | 63.6% | **0.333** |
| No contest | — | — | — | — |

`E = 1/3` for all three is a **rule of the ladder, not an observation**. The
variant is declared a three-way contest in which the mafia, the lone Serial
Killer and the town are each intended to win a third of decided games, and the
rating is set to treat it as exactly that: a win is worth what a loss costs
times two, identically for every seat, however often the shuffle deals it.

**This is fixed. This variant does not recalibrate.** The per-variant policy in
[ranking-system.md §9](../../ranking-system.md) applies to variants whose E comes
from data; this one opts out by construction, exactly as Sports does — there is
nothing to re-derive, because 1/3 was never derived.

> **The risk this accepts, stated plainly — and it is sharper here than in
> Sports.** With one Serial Killer per game, "the Serial Killer faction's win
> rate" and "that one player's win rate" are the same number. So if the real
> split is not 1/3 each — say the Serial Killer actually wins 20% — the error
> does not spread thinly across a faction, it lands on **one seat per game**:
> whoever holds the role loses ≈ 11 rating in expectation, the other ten seats
> each gain, and the ladder inflates by ≈ +4/game overall. Over many games it
> averages out per player, since the role is dealt uniformly; over a session it
> reads as seat luck. Nothing detects this automatically; the only signal is the
> faction win rates in the archive. Changing the stance is a deliberate decision,
> not a maintenance task: swap the three `E` values for measured ones and the
> formula shape carries over unchanged.

## 3. Payouts — and why `K = 81`

```
base = K × (S − E) = 81 × (S − 1/3)   →   S = 1 → +54   S = 0 → −27
```

| Faction | E | **Win** | **Loss** | EV/game for an average player |
| --- | --- | --- | --- | --- |
| Mafia | 0.333 | **+54** | **−27** | 0 |
| Serial Killer | 0.333 | **+54** | **−27** | 0 |
| Citizens | 0.333 | **+54** | **−27** | 0 |
| No contest | — | 0 | 0 | 0 |

**`K = 81`, not the 80 both siblings use.** This is the one place a constant
differs across variants, so it is worth being explicit: `80 × (1 − 1/3)` is
53.33, which does not exist as a payout. 81 is the only `K` that lands **both**
sides on whole numbers at `E = 1/3`, and the integers are what buy the three
properties the ladder is checked against:

| Property | At `K = 81` (+54 / −27) | At `K = 80` (+53 / −27) |
| --- | --- | --- |
| Win : loss ratio | `54/27` = **2.00** = `(1−E)/E`, exact | 1.96 — a slight spread with no cause behind it |
| Ladder drift | `⅓(+54) + ⅔(−27)` = **0**, exact | −0.33/game ≈ **−33 rating per 100 games** |
| Rating std per game | ≈ **38.2** — inside the 38–40 band (§4) | ≈ 37.7 — just under it |

Choosing 80 for consistency would therefore have bought a deflating ladder to
keep a constant looking tidy. The shared thing is the *formula*; every number in
it is per variant ([ranking-system.md §3](../../ranking-system.md)).

Two properties fall out of the symmetry, as they do in Sports:

- **No faction spread.** Japanese pays its hardest faction more for a win and
  charges it less for a loss, because its factions win at different rates. With
  a single shared E there is nothing to compensate for, so all three rows are
  equal — including the Serial Killer's.
- **Zero drift.** The ladder neither inflates nor decays on its own.

### The table adjustment

Identical to both siblings — `divisor: 20`, `cap: 16` — and it is the only reason
two players in the same game can gain different amounts:

```
b = clamp( round((T − R) / 20), −16, +16 )
```

| You | Table avg `T` | `b` | Win | Loss |
| --- | --- | --- | --- | --- |
| 1000 | 1140 | +7 | **+61** | **−20** |
| 1400 | 1150 | −12 | **+42** | **−39** |
| 1050 | 1050 | 0 | **+54** | **−27** |

(−12, not −13: exact halves round toward +∞ — see
[ranking-system.md §3](../../ranking-system.md).)

The cap (16) stays below the smallest base number (27), so the sign can never
flip: a win pays at least **+38** and a loss costs at least **−11**. Full range:
**+70** to **−43**.

That 11-point margin is the **narrowest of any rated variant** — Japanese clears
by 6 on its yakuza loss, Sports by 24. It is still a margin, and
`tests/structure/ratedVariants.test.ts` asserts the inequality rather than
trusting this paragraph, but it is the number to look at first if `K` or the cap
is ever revisited here.

## 4. Pace parity with both siblings

Levels 1–10 use the **same brackets** for every variant
([ranking-system.md §5](../../ranking-system.md)), which only stays honest if a
game moves a rating by roughly the same amount in each. It does:

| | payouts | avg win rate | rating std per game |
| --- | --- | --- | --- |
| Japanese | +48 / −30 (mafia) | ~33.5% | ≈ **38** |
| Sports | +40 / −40 | 50% | ≈ **40** |
| Serial Killer | +54 / −27 | 33.3% | ≈ **38.2** |

Serial Killer lands almost exactly on Japanese, which is no coincidence: a
three-faction game declared even sits within a point of Japanese's *measured*
citizens rate (32.7%), so its payouts (+54/−27) come out beside Japanese's
citizens row (+54/−26). A Level 7 therefore means a comparable amount of
above-average play on any of the three ladders — the assumption the shared
brackets encode.

Max single-game gain is **+70**, under Japanese's +72, so the pacing note in
[ranking-system.md §5](../../ranking-system.md) still holds: with the narrowest
bracket 150 wide, no player can skip a level in one game.

## 5. No backfill

Serial Killer games archived before 2026-08-19 stay **permanently unrated**. They
were played, and shown to players, as unrated games; their rows keep
`ratingDelta` absent — no chip on the match-history card, no contribution to the
ladder. The board starts **empty** and fills from the first game finished after
the config shipped. Same call as Sports, for the same reason.

`BACKFILL_POLICY` (`convex/lib/constants.ts`) holds `serial_killer_mafia:
"never"`, and `backfillRatings` (`convex/migrations.ts`) refuses to replay a
variant the policy has not opted in — a required `gameTypes` argument, nothing
written without `apply: true`. **No migration is run as part of rating this
variant.** Note the entry changed meaning even though its value did not: it used
to be vacuous (no config existed to replay with), and it is now load-bearing.

## 6. What the config turned on

Adding the `RATING_CONFIG` entry is not only a leaderboard change — several
surfaces read "is this game type rated" implicitly and start showing data the
moment it lands:

| Surface | Before | After |
| --- | --- | --- |
| Lobby room card + game-room header "Avg ELO" | hidden (`getLiveTableAvgRating` returns `undefined` for an unrated type) | live table average of the 11-seat roster, host excluded |
| Match-history card | no ± chip | `+54` / `−27` chip, with the table average behind it |
| Leaderboard | two boards | a third, appearing on its own — `RATED_GAME_TYPES` derives from `RATING_CONFIG` in registration order, so it lands last and the default board stays Japanese |
| Profile | one block per rated variant | one more |
| Staff annul | no rating to reverse | reverses the stored delta, same as both siblings |

## 7. What deliberately does **not** change

- **Surviving to the 1-on-1 as the Serial Killer is worth one win.** No bonus,
  no per-player term. Rating is a pure team outcome
  ([ranking-system.md §11](../../ranking-system.md)) — the same reason a Sports
  best move scores nothing.
- **Firing the bullet, or holding it, scores nothing.** The shot decides the
  *winner* in five positions ([win-conditions.md §5](./win-conditions.md)); the
  ladder reads only the winner.
- **No per-role adjustment.** Every role in a faction shares that faction's
  outcome, so faction granularity is the correct granularity here as everywhere.
  The Serial Killer is a faction of one, which makes its faction row and its role
  row the same row — a coincidence of deck size, not a new mechanism.
- **Host and spectators are never rated**; they hold no role.
- **No-contest games move nothing**, including the `N = 0` sweep.
