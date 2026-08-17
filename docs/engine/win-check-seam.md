# Win-Check Seam (variant-agnostic)

> **Scope: shared engine.** This describes *when* the win check runs, *who calls
> it*, and *what happens* when it decides — none of which depends on the game
> variant. The rules it evaluates are per-variant and live under
> [`docs/variants/`](../variants/).
>
> This file is subject to the vocabulary firewall in
> `tests/structure/variantDocs.test.ts`: it may not name a role, phase, or seat
> count that only exists in one variant. If a rule you want to write here needs
> one, the rule belongs in that variant's doc instead.

## 1. What this seam does

A game does not end when a faction "should" have won — it ends when the host
confirms. This seam is the *detection* half.

At each of the two transition points below, the engine inspects the alive
players and their roles and asks the variant whether anyone has won. If so it
**records the pending winner on the session and skips the transition**, pausing
the game. The host then sees a win banner with a **Finish Game** button, and
that button runs `finishGame`, which is what actually ends the game and
schedules cleanup.

Nothing here auto-finishes a game.

## 2. Dispatch — which rules get evaluated

The engine never implements a win rule. It asks the definition:

```ts
getGameDefinition(game.gameType).describeWin(aliveRoles, context);
```

| Variant | Rule module | Rules documented in |
| --- | --- | --- |
| `japanese_mafia` | `convex/games/japanese/winConditions.ts` | [variants/japanese/win-conditions.md](../variants/japanese/win-conditions.md) |
| `sports_mafia` | `convex/games/sports/winConditions.ts` | [variants/sports/win-conditions.md](../variants/sports/win-conditions.md) |

Dispatch happens in `recordWinnerIfDecided` (`convex/lib/games.ts`). Adding a
variant means adding a `decideWinner` / `describeWin` pair to its definition —
no change to this seam.

## 3. The two contexts

The check takes a context, because what happens *next* can change the answer:

- **`beforeNight`** — about to enter `night_phase`; a day elimination just
  happened and the night actors get to act next.
- **`beforeDay`** — about to enter `day_phase`; night kills just happened and a
  day discussion + vote happens next.

Whether the context actually changes any outcome is a per-variant question. The
seam always supplies it, so a variant that ignores it stays interface-compatible.

## 4. Where it runs

Entering night or day is consolidated into **one helper per direction** in
`convex/games/core/phaseTransitions.ts`:

- **`enterNightPhase(db, gameId)`** — clears any voting session, bumps the night
  number, resets speaking/nomination/foul state, creates the
  `nightPhaseSessions` row. The single home for the `beforeNight` check.
- **`enterDayPhase(db, gameId)`** — resets speaking state. The single home for
  the `beforeDay` check.

`gamePhase` may **not** be set to `night_phase` / `day_phase` anywhere else:
`games/core/sessions:update` rejects those values, so every flow is forced
through the helpers. That consolidation is why the check lives in exactly two
places rather than in every transition mutation.

**Callers of `enterNightPhase` (`beforeNight`):**

- `games/core/nightPhase.ts` → `enterNight` (intro → night, continue → night, day skip → night)
- `games/core/voting.ts` → `skipToNightAfterTie`
- `games/core/farewellSpeech.ts` → `advanceFromFarewell` (vote-elimination path)
- `games/core/dayPhase.ts` → `advanceNominatedSpeaker` (foul-elimination path)

**Callers of `enterDayPhase` (`beforeDay`):**

- `games/core/farewellSpeech.ts` → `startFarewellSpeech` (no-kill skip-to-day path)
- `games/core/farewellSpeech.ts` → `advanceFromFarewell` (night-kills path)

## 5. The third trigger: immediate check after a foul elimination

A final foul kills a player **instantly, outside any night/day transition**
(`convex/games/core/dayPhase.ts` → `giveFoul` sets `isAlive: false` with no
farewell and sets `foulEliminationOccurred`). If that removes the last member of
a faction, the winner must be detected **immediately** rather than at the next
night/day boundary.

So the check also runs at the end of `giveFoul`, but only when the foul actually
eliminated the player.

- It runs the **full** variant win logic, not a reduced sweep.
- Foul-allowed phases (`FOULS.ALLOWED_PHASES` in `convex/lib/constants.ts`) are
  all day-side and head toward night, so this trigger always uses the
  **`beforeNight`** context.

> Scope note: only `giveFoul` triggers the immediate check. Host manual `kill`
> (`games/core/players.ts`) and `markDeadAndAdvance`
> (`games/core/farewellSpeech.ts`) do **not** — those are left to the normal
> night/day boundary checks.

## 6. No contest (`N = 0`)

If **no** player is left alive, the game is a **no contest** — nobody met a win
condition. This is checked **first**, before any variant rule, because a
"everyone alive belongs to one faction" rule is vacuously true when nobody is
alive and would otherwise mis-declare a winner.

Reachable when the last survivors all leave at once: the final players tie
repeatedly, trigger a **"both leave"** vote, and all vote to leave, so all of
them are eliminated in one farewell round.

A no contest pauses on the winner banner like a faction win (the host still
confirms via **Finish Game**), and is recorded as `winner: "no_contest"` on the
session. `archiveGameLog` maps it to `gameLogs.winner = null` — no `winMethod`,
**no rating change for anyone** — the same terminal outcome as an admin
force-end. There is no separate "draw" state.

Returning "continue" here instead would transition into a phase with zero
players and loop forever, so `N = 0` must resolve to an explicit outcome.

## 7. Implementation

1. **Schema** — optional `winner` on `convex/tables/gameSessions.ts`, one of
   `mafia | yakuza | citizens | no_contest`.
2. **Pure per-variant helper** — `decideWinner(aliveRoles, context)` on the
   definition. No DB access. `describeWin` returns the same decision plus a
   `WinMethod` snapshot for faction wins, and the bare `"no_contest"` sentinel
   for `N = 0`. Shared vocabulary (`WinContext`, `Winner`, `GameOutcome`,
   `WinMethod`, `winMethodLabel`) lives in `convex/games/core/winConditions.ts`.
3. **Record helper** — `recordWinnerIfDecided(ctx, gameId, context)` in
   `convex/lib/games.ts` loads the roles of alive role-holders, dispatches via
   the registry, and if the result is non-null patches `winner` (plus
   `winMethod` for faction wins) on the session. It does **not** set
   `isFinished` / `gameStatus` or schedule cleanup — that is the host's
   `finishGame` step. Idempotent: it re-returns an already-recorded outcome and
   no-ops once the session is finished.
4. **The two helpers** — `enterNightPhase` and `enterDayPhase` both call
   `recordWinnerIfDecided` *before* the phase patch; if a winner comes back they
   skip the transition and return it.
5. **`giveFoul`** — after an eliminating foul, calls
   `recordWinnerIfDecided(ctx, gameId, "beforeNight")` and returns
   `{ playerEliminated: true, winnerDecided }`.
6. **Host confirmation (UI)** — when `gameSessions.winner` is set and
   `isFinished` is false, the host's `GamePhaseControls` renders `WinnerBanner`
   (faction title + `FinishGameButton`) instead of phase controls. Host-only by
   design.

> `aliveRoles` counts only alive players holding a `gamePlayerRoles` entry, so
> the host — who has no role — is naturally excluded from the totals a variant's
> rules reason about.
