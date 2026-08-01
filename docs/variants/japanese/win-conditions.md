# Japanese Mafia — Win Conditions

> **Scope: `japanese_mafia` only.** These are the rules the Japanese variant
> evaluates. *When* they are evaluated, who calls them, and what happens when
> one fires are variant-agnostic and documented once in
> [engine/win-check-seam.md](../../engine/win-check-seam.md).
>
> Implemented in `convex/games/japanese/winConditions.ts` (`decideWinner` /
> `describeWin`, both pure). Sports has its own rules — a flat parity rule with
> no context sensitivity — in [variants/sports.md](../sports.md) §7.
>
> Section numbers here are load-bearing: `convex/games/japanese/winConditions.ts`
> cites §7. Do not renumber.

## 1. Purpose

> Moved. The detection-vs-confirmation model, and why a pure helper runs at the
> phase-transition seams at all, are shared engine concerns:
> [engine/win-check-seam.md §1](../../engine/win-check-seam.md).
>
> What remains Japanese-specific is *which* faction wins at which alive-count,
> and that is §5 through §8 below.

## 2. Factions

There are **three factions**:

| Faction      | Roles                               | Count at start |
| ------------ | ----------------------------------- | -------------- |
| **Mafia**    | `DON`, `MAFIA_RIGHT_HAND`, `MAFIA`  | 3              |
| **Yakuza**   | `YAKUZA`, `SHOGUN`                  | 2              |
| **Citizens** | `DETECTIVE`, `DOCTOR`, `CITIZEN` ×5 | 7              |

Throughout this doc:

- **`m`** = number of alive Mafia-faction players (`DON` + `MAFIA_RIGHT_HAND` + `MAFIA`).
- **`YA`** = the `YAKUZA` is alive.
- **`SH`** = the `SHOGUN` is alive.
- **Town** = `DETECTIVE` / `DOCTOR` / `CITIZEN` (Citizens faction).
- **`N`** = total alive players.

## 3. Role abilities that matter for win detection

(Confirmed from `convex/games/core/nightPhase.ts`.)

- **Mafia** can kill **every night** while at least one Mafia member is alive.
- **Yakuza faction can kill only if `YAKUZA` is alive.**
  - Both alive → `SHOGUN` performs the kill.
  - `YAKUZA` alive, `SHOGUN` dead → `YAKUZA` performs the kill.
  - **`SHOGUN` alone (Yakuza dead) cannot kill** — this is why most rules below
    care about "is the **Yakuza** alive", not the Shogun.
- **Doctor** heals one player per night; **each player can be healed only once per
  whole game** (`getAllHealedSeats`).
- **Detective** only gathers information — **no effect on win conditions** (counts
  purely as Town).

> NOTE: The win conditions below are **declared outcomes** defined by the game's
> rules. They are not re-simulated from night mechanics. Where a stated rule and a
> naive simulation disagree, the stated rule wins.

## 4. When the check runs

> Mostly moved. The two transition seams (`enterNightPhase` / `enterDayPhase`),
> their full caller list, and the immediate re-check after an eliminating foul
> are shared engine mechanism:
> [engine/win-check-seam.md §4–§5](../../engine/win-check-seam.md).

One thing here **is** Japanese-specific and stays:

- The seam supplies a `beforeNight` / `beforeDay` context on every call. For
  Japanese, that context **only changes the result at `N = 5`** (see §6) — every
  other alive-count evaluates identically in both. Sports ignores the context
  entirely.
- Because the foul trigger fires from day-side phases that head toward night, it
  always evaluates with the **`beforeNight`** context.

## 5. Global rules (apply at any `N`)

0. **No contest (`N = 0`)** is checked first and is shared engine behaviour —
   see [engine/win-check-seam.md §6](../../engine/win-check-seam.md). It matters
   here for one Japanese-specific reason: the Citizens-sweep condition below
   (`m = 0` and `!YA` and `!SH`) is *vacuously true* when nobody is alive, so
   without the earlier `N = 0` check this variant would mis-declare a Citizens
   win on total mutual elimination.

1. **Single-faction sweep (highest priority).** If **every** alive player belongs to
   a single faction, that faction wins — at _any_ player count, even above 6:
   - all **Town** (`m = 0` and `!YA` and `!SH`) → **Citizens win**
   - all **Mafia** (`m = N`) → **Mafia win**
   - all **Yakuza clan** (`m = 0` and every survivor is `YAKUZA`/`SHOGUN`) → **Yakuza win**

   The Mafia/Yakuza sweeps matter because **two players can die in one night**,
   dropping the count straight past the `N = 2` boundary the per-`N` tables stop at —
   e.g. `N = 3` `CIT,YA,M`, mafia kills the citizen and yakuza kills the mafia → a lone
   `YAKUZA` (`N = 1`). Only the sweep can end the game in that case. (Mafia caps at 3
   and the Yakuza clan at 3, so a non-Town sweep never exceeds `N ≤ 6`.)
2. **No Mafia/Yakuza win above 6 players.** Apart from the single-faction sweeps above,
   the game can only be decided when **`N ≤ 6`**.

## 6. Decision tables (with examples)

Notation for examples: `DON`, `RH`(=right hand), `M`, `SH`, `YA`, `DOC`, `DET`, `CIT`.

### N = 6

| Alive                   | m   | Result        | Why                                   |
| ----------------------- | --- | ------------- | ------------------------------------- |
| `DON,RH,M, CIT,CIT,YA`  | 3   | **continue**  | Yakuza alive → can still kill a Mafia |
| `DON,RH,M, YA,SH,CIT`   | 3   | **continue**  | Yakuza alive                          |
| `DON,RH,M, CIT,CIT,SH`  | 3   | **MAFIA win** | Yakuza dead (lone Shogun can't kill)  |
| `DON,RH,M, DET,DOC,CIT` | 3   | **MAFIA win** | Yakuza dead                           |
| `DON,M, ...` (m ≤ 2)    | ≤2  | **continue**  | —                                     |

**Rule:** at `N = 6`, **Mafia win iff `m = 3` and Yakuza is dead**. Otherwise continue
(Shogun presence is irrelevant here).

### N = 5 — context matters

**`beforeNight`:** Mafia win iff `m = 3`, **except** the other 2 are exactly
`DOCTOR + YAKUZA` → continue.

| Alive (beforeNight) | m   | Result        | Why                                                |
| ------------------- | --- | ------------- | -------------------------------------------------- |
| `DON,RH,M, DOC,YA`  | 3   | **continue**  | Yakuza can kill a Mafia + Doctor can save → unsure |
| `DON,RH,M, DOC,SH`  | 3   | **MAFIA win** | Shogun can't kill                                  |
| `DON,RH,M, YA,SH`   | 3   | **MAFIA win** | No Doctor to save → Mafia majority guaranteed      |
| `DON,RH,M, YA,CIT`  | 3   | **MAFIA win** | No Doctor                                          |
| `DON,RH,M, DOC,DET` | 3   | **MAFIA win** | No Yakuza                                          |

**`beforeDay`:** Mafia win iff `m = 3` (no exceptions — Mafia majority controls the day vote).

| Alive (beforeDay)   | m   | Result        |
| ------------------- | --- | ------------- |
| `DON,RH,M, DOC,YA`  | 3   | **MAFIA win** |
| `DON,RH,M, <any 2>` | 3   | **MAFIA win** |

For `m ≤ 2` at `N = 5`: **continue** (both contexts).

### N = 4

Priority: Citizens-sweep → Yakuza-pair win → Mafia win → continue.

| Alive             | Result           | Why                                               |
| ----------------- | ---------------- | ------------------------------------------------- |
| `DON,RH,M, X`     | **MAFIA win**    | `m = 3`                                           |
| `M,M, SH,CIT`     | **MAFIA win**    | `m = 2`, no Yakuza among the other 2              |
| `M,M, DOC,DET`    | **MAFIA win**    | `m = 2`, no Yakuza                                |
| `YA,SH, M,M`      | **YAKUZA win**   | Yakuza+Shogun pair beats any 2 (incl. 2 Mafia)    |
| `YA,SH, M,CIT`    | **YAKUZA win**   | Yakuza+Shogun pair                                |
| `YA,SH, DOC,CIT`  | **YAKUZA win**   | Yakuza+Shogun pair (`m = 0`)                      |
| `YA,SH, M,DOC`    | **continue**     | **Exception:** other 2 are Doctor + any 1 Mafia member |
| `M,M, YA,CIT`     | **continue**     | `m = 2` but Yakuza alive                          |
| `M,M, YA,DOC`     | **continue**     | `m = 2` but Yakuza alive                          |
| `M, YA, CIT,CIT`  | **continue**     | `m = 1`, no Yakuza+Shogun pair                    |
| `YA, CIT,CIT,CIT` | **continue**     | `m = 0`, lone Yakuza — NOT a sweep (Yakuza alive) |
| `SH, CIT,CIT,CIT` | **continue**     | `m = 0`, lone Shogun — NOT a sweep (Shogun alive) |
| `DOC,DET,CIT,CIT` | **CITIZENS win** | `m = 0`, no Yakuza, no Shogun → sweep             |

### N = 3

| Alive         | Result           | Why                                  |
| ------------- | ---------------- | ------------------------------------ |
| `M,M, X`      | **MAFIA win**    | `m = 2`                              |
| `YA,SH, X`    | **YAKUZA win**   | Yakuza+Shogun pair (incl. `YA,SH,M`) |
| `M, YA, CIT`  | **continue**     | `m = 1`, no Yakuza+Shogun pair       |
| `M, CIT,CIT`  | **continue**     | —                                    |
| `YA, CIT,CIT` | **continue**     | lone Yakuza, `m = 0`, not a sweep    |
| `SH, CIT,CIT` | **continue**     | lone Shogun, `m = 0`, not a sweep    |
| `DOC,DET,CIT` | **CITIZENS win** | sweep                                |

### N = 1

Reachable only when two players die in one night (see §5 rule 1). The lone survivor
is always the last faction standing — decided by the single-faction sweep, so context
is irrelevant.

| Alive  | Result           | Why                         |
| ------ | ---------------- | --------------------------- |
| `YA`   | **YAKUZA win**   | only Yakuza clan remains    |
| `SH`   | **YAKUZA win**   | only Yakuza clan remains    |
| `M`    | **MAFIA win**    | only Mafia remains          |
| `CIT`  | **CITIZENS win** | Town sweep                  |

### N = 2

| Alive      | Result           | Why                                     |
| ---------- | ---------------- | --------------------------------------- |
| `M,M`      | **MAFIA win**    | last faction standing                   |
| `M, CIT`   | **MAFIA win**    | Mafia beats Town 1-on-1                 |
| `M, DOC`   | **MAFIA win**    | Mafia beats Town 1-on-1                 |
| `M, DET`   | **MAFIA win**    | Mafia beats Town 1-on-1                 |
| `M, YA`    | **YAKUZA win**   | Yakuza beats lone Mafia                 |
| `M, SH`    | **YAKUZA win**   | Shogun beats lone Mafia (declared rule) |
| `YA, SH`   | **YAKUZA win**   | last faction standing                   |
| `DOC, CIT` | **CITIZENS win** | sweep                                   |
| `YA, CIT`  | **YAKUZA win**   | 1vs1 Yakuza and shogun clan always wins |
| `SH, CIT`  | **YAKUZA win**   | 1vs1 Yakuza and shogun clan always wins |
| `SH, M`    | **YAKUZA win**   | 1vs1 Yakuza and shogun clan always wins |

## 7. Evaluation algorithm (priority order)

```
function decideWinner(alive, context):           // context ∈ {beforeNight, beforeDay}
  if N == 0:                        return NO_CONTEST    // mutual elimination — nobody left alive
  // Single-faction sweeps — last faction standing wins at any N (incl. N = 1).
  if m == 0 and !YA and !SH:        return CITIZENS      // only Town remain
  if N >= 1 and m == N:             return MAFIA         // only Mafia remain
  if N >= 1 and m == 0 and allYakuzaClan(alive):
                                    return YAKUZA        // only Yakuza clan remain
  if N > 6:                         return CONTINUE      // nothing else above 6

  switch N:
    case 6:
      if m == 3 and !YA:            return MAFIA
      return CONTINUE
    case 5:
      if m == 3:
        if context == beforeNight and others == {DOCTOR, YAKUZA}:
                                    return CONTINUE
        return MAFIA
      return CONTINUE
    case 4:
      if m == 3:                    return MAFIA
      if YA and SH:
        if others == {DOCTOR, <any 1 Mafia member>}:  return CONTINUE   // exception
        return YAKUZA
      if m == 2 and !YA:            return MAFIA
      return CONTINUE
    case 3:
      if m == 2:                    return MAFIA
      if YA and SH:                 return YAKUZA
      return CONTINUE
    case 2:
      if m == 2:                    return MAFIA
      if YA or SH:                  return YAKUZA   // clan always wins a 1-on-1,
                                                    // incl. lone YA / lone SH vs Town
      if m == 1:                    return MAFIA    // lone Mafia vs Town
      return CONTINUE   // unreachable (m==0 w/o YA/SH is a sweep → CITIZENS above)
```

## 8. Resolved decisions

These were confirmed and are baked into the rules above:

- **Lone Yakuza / lone Shogun vs Town (all Mafia dead): `continue` — except at
  `N = 2`.** While more than 2 players are alive, no winner is declared for a lone
  Yakuza or lone Shogun + Town (it is not a Citizens-sweep). Known caveat: `SH + Town`
  can stalemate at `N ≥ 3` (Shogun can never kill); accepted for now. **At `N = 2`,
  the Yakuza/Shogun clan wins any 1-on-1** (`YA,CIT` and `SH,CIT` → YAKUZA), per the
  `N = 2` table — this declared outcome overrides §7's lone-YA/SH fall-through.
- **Context only matters at `N = 5`.** All other counts are identical for
  `beforeNight` and `beforeDay`.
- **Doctor exceptions use role presence only.** "Doctor alive" is sufficient for the
  `N=5 DOC+YA` and `N=4 DOC+Mafia` exceptions; per-player heal availability is **not**
  considered. The `N=4` exception fires for Doctor + **any one Mafia member**
  (`DON` / `MAFIA_RIGHT_HAND` / `MAFIA`), since any of them can kill.
- **Detective has zero impact** on win detection (counts purely as Town).
- **Winner is recorded.** Add `winner: v.union("mafia", "yakuza", "citizens")` (optional)
  to `gameSessions` and set it on auto-finish, reusing `finishGame`'s cleanup scheduling.
- **`N ≥ 7`:** only the Citizens-sweep can end the game; no Mafia/Yakuza win.
- **Foul elimination triggers an immediate full check** (`beforeNight` context) — see
  §4. Only `giveFoul` triggers it; manual `kill` and `markDeadAndAdvance` do not.
- **Two deaths in one night can skip the `N = 2` boundary.** When both the Mafia and
  the Yakuza kill on the same night, the count can drop by 2 (e.g. `N = 3` → `N = 1`),
  so a game can reach a lone non-Town survivor without ever passing through an `N = 2`
  check. The **single-faction sweeps** (§5 rule 1: all-Mafia → Mafia, all-Yakuza-clan →
  Yakuza) resolve this — without them a lone Yakuza/Shogun/Mafia would loop back into
  `day_phase` forever. (A lone Town survivor was already covered by the Citizens sweep.)
- **All survivors leaving at once is a no contest (`N = 0`).** A repeated tie among the
  last players triggers a **"both leave"** vote; if it passes for every remaining player
  they are all eliminated in one farewell round, leaving nobody alive. This is a **no
  contest** (§5 rule 0), not a Citizens win — recorded as `winner: "no_contest"` (host
  confirms on the banner) and logged as no contest (`winner: null`, no ELO), reusing the
  same terminal outcome as an admin force-end (no separate "draw" state). Returning
  `CONTINUE` here instead would transition into a phase with 0 players and loop forever,
  so `N = 0` must resolve to an explicit outcome.

## 9. Implementation (built)

> Moved. The schema field, the `recordWinnerIfDecided` record helper, the two
> transition helpers, the `giveFoul` trigger, and the host-confirmation UI are
> all shared engine wiring:
> [engine/win-check-seam.md §7](../../engine/win-check-seam.md).

What is Japanese-owned is only the pure rule module itself:

- `convex/games/japanese/winConditions.ts` — `decideWinner(aliveRoles, context)`
  returns `"mafia" | "yakuza" | "citizens" | "no_contest" | null`, implementing
  §6 and §7 above. `describeWin` returns the same decision plus a full
  `WinMethod` snapshot for faction wins. No DB access.
- Reached through `JAPANESE_DEFINITION.decideWinner` / `.describeWin`, so the
  engine never names this module directly.

> `aliveRoles` counts only alive players holding a `gamePlayerRoles` entry, so
> the host — who has no role — is excluded from `N` and `m`.
