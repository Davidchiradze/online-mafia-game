# Game End Conditions (Auto-Win Detection)

> Status: **Implemented.** All open questions resolved (see §8). This document
> describes the rules for automatically detecting the end of a Japanese-Mafia
> game. The logic lives in `convex/lib/winConditions.ts` (`decideWinner`, pure)
> and is wired in via `recordWinnerIfDecided` (`convex/lib/games.ts`).
>
> **Detection only — the host still confirms.** When a faction is decided, the
> winner is *recorded* on the session (`gameSessions.winner`) and the pending
> phase transition is skipped, pausing the game. The host then sees a
> faction-win banner (`WinnerBanner`) with a **Finish Game** button; clicking it
> runs the existing `finishGame` mutation, which is what actually finishes the
> game and schedules cleanup. The game is **not** auto-finished.

## 1. Purpose

Today a game only ends when the host manually clicks **Finish**
(`convex/game/sessions.ts` → `finishGame`).

Goal: a pure helper that is run **at every phase transition into `night_phase`
and into `day_phase`**. It inspects the alive players and their roles, decides
whether a faction has won, and if so **records the pending winner and pauses the
game** (skips the transition) so the host can confirm the end via the Finish
Game button. If no win condition is met, the transition proceeds normally.

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

(Confirmed from `convex/game/nightPhase.ts`.)

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

The check has **two contexts**, because the _next_ thing that happens changes the
outcome:

- **`beforeNight`** — we are about to enter `night_phase` (a day elimination just
  happened; the Yakuza/Mafia get to act at night next).
- **`beforeDay`** — we are about to enter `day_phase` (night kills just happened;
  a day discussion + vote happens next, where Mafia majority controls the vote).

The context **only changes the result for `N = 5`** (see §6). For all other counts
the result is identical in both contexts.

### Single-source transition helpers

Entering night/day is consolidated into **one helper per direction** in
`convex/lib/phaseTransitions.ts`:

- **`enterNightPhase(db, gameId)`** — clears any voting session, bumps the night
  number, resets speaking/nomination/foul state, creates the `nightPhaseSessions`
  row. This is the **single home for the `beforeNight` check.**
- **`enterDayPhase(db, gameId)`** — resets speaking state. The **single home for the
  `beforeDay` check.**

`gamePhase` may **not** be set to `night_phase` / `day_phase` anywhere else —
`game/sessions:update` rejects those values, so every flow is forced through the
helpers.

**Callers of `enterNightPhase` (`beforeNight`):**

- `nightPhase.ts` → `enterNight` (client-facing: intro → night, continue → night,
  day skip → night)
- `voting.ts` → `skipToNightAfterTie`
- `farewellSpeech.ts` → `advanceFromFarewell` (vote-elimination path)
- `dayPhase.ts` → `advanceNominatedSpeaker` (foul-elimination path)

**Callers of `enterDayPhase` (`beforeDay`):**

- `farewellSpeech.ts` → `startFarewellSpeech` (no-kill skip-to-day path)
- `farewellSpeech.ts` → `advanceFromFarewell` (night-kills path)

Because of this consolidation, the win-check is added in exactly **two** places
(the two helpers), not scattered across every transition mutation.

### Immediate check after a foul elimination

A 4th foul kills a player **instantly, outside any night/day transition**
(`convex/game/dayPhase.ts` → `giveFoul`: sets `isAlive: false` with no farewell and
sets `foulEliminationOccurred`). If this removes the last Mafia/Yakuza/Shogun, the
winner must be **detected immediately** — not at the next night/day boundary (the
host still confirms the finish from the resulting win banner).

So the check **also runs immediately at the end of `giveFoul`** (only when the foul
actually eliminates the player, i.e. the 4th foul).

- The immediate foul check runs the **full** win logic (§7), not just the sweep.
- Foul-allowed phases are all day-side (`introduction_phase`, `farewell_speech`,
  `day_phase`, `nominated_players_speak`, `voting`) and head toward night, so the
  `N = 5` context-sensitive case uses the **`beforeNight`** context.

> Scope note: only `giveFoul` triggers the immediate check. Host manual `kill`
> (`players.ts`) and `markDeadAndAdvance` (`farewellSpeech.ts`) do **not** — those
> are left to the normal night/day boundary checks.

## 5. Global rules (apply at any `N`)

1. **Citizens sweep (highest priority).** If **all** Mafia **and** Yakuza **and**
   Shogun are dead (`m = 0` and `!YA` and `!SH`), **Citizens win** — at _any_ player
   count, even above 6.
2. **No Mafia/Yakuza win above 6 players.** Apart from the Citizens-sweep above, the
   game can only be decided when **`N ≤ 6`**.

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
  if m == 0 and !YA and !SH:        return CITIZENS      // global sweep (any N)
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

## 9. Implementation (built)

1. **Schema:** ✅ optional `winner` (`mafia | yakuza | citizens`) on
   `convex/tables/gameSessions.ts`.
2. **Pure helper:** ✅ `decideWinner(aliveRoles, context)` in
   `convex/lib/winConditions.ts` — returns `"mafia" | "yakuza" | "citizens" | null`,
   implementing §6/§7. No DB access.
3. **Record helper:** ✅ `recordWinnerIfDecided(ctx, gameId, context)` in
   `convex/lib/games.ts` — loads the roles of alive role-holders (excludes the host),
   calls `decideWinner`; if non-null, patches only `winner` on the session and returns
   it. It does **not** set `isFinished`/`gameStatus` or schedule cleanup — that is the
   host's `finishGame` step. Idempotent (re-returns an already-recorded winner); no-ops
   once the session is finished.
4. **`enterNightPhase`** (`beforeNight`) and **`enterDayPhase`** (`beforeDay`): ✅ both
   take `ctx` and call `recordWinnerIfDecided` _before_ the phase patch; if a winner is
   returned they skip the transition (pausing the game) and return the winner. Single
   home per direction.
5. **`giveFoul`:** ✅ after a 4th-foul elimination, runs `recordWinnerIfDecided(ctx,
   gameId, "beforeNight")` and returns `{ playerEliminated: true, winnerDecided }`.
6. **Host confirmation (UI):** ✅ when `gameSessions.winner` is set and `isFinished` is
   false, the host's `GamePhaseControls` renders `WinnerBanner` (faction title +
   `FinishGameButton`) instead of phase controls; the button calls the existing
   `finishGame` mutation to actually end the game. (Host-only by design.)

> Note: `aliveRoles` counts only alive players that hold a `gamePlayerRoles` entry,
> so the host (who has no role) is naturally excluded from `N` and `m`.
