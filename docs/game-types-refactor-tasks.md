# Game Types Refactor — Task Tracker

> Status: **Living checklist.** This file decomposes the phased plan in
> [game-types.md](./game-types.md) §5 into small, independently verifiable
> tasks, and records which characterization test in `tests/` /
> `convex/tests/` **guards** each one. It is the operational companion to
> game-types.md (the design source of truth) and testing.md (the oracle spec).
>
> **Update protocol:** after finishing a task, flip its status box and add the
> commit SHA. If a task's guarding test needed an *assertion* change (not just an
> import-path change), stop — per [testing.md](./testing.md), that is a behavior
> regression, not a refactor. Record it under "Regressions caught" at the bottom
> instead of marking the task done.

## Status legend

| Mark | Meaning |
| --- | --- |
| ⬜ | Not started |
| 🟡 | In progress |
| ✅ | Done (green suite, assertions unchanged) |
| 🔵 | Deferred (intentionally, per plan) |
| ⚠️ | Blocked — needs a prerequisite (usually an oracle gap) closed first |

Baseline: **316 tests passing** across 11 files (`npm test`), `npx tsc --noEmit`
clean. (Was 222/8 before Phase 1. New files: `tests/game/gameDefinition.test.ts`
— definition-equivalence oracle; `tests/game/phaseFlow.test.ts` — host-advance
`updates` payloads; `tests/game/uiRegistry.test.ts` — frontend UI-ruleset
registry. `convex/tests/gameEngine.test.ts` grew 27→53 with the G1 voting + G3
card-picking suites.)

---

## 1. Oracle-readiness verdict

**Are the tests enough to start the refactor? — Yes for the hard part, with three
narrow gaps to close before the phases that touch shared engine code.**

The suite pins every one of the **deepest divergences** — the exact modules
game-types.md §2.3 calls out as the most dangerous to migrate. The table below
maps each variant-specific concern from game-types.md §1 to its guarding test.

### 1.1 Backend concerns (game-types.md §1)

| Concern | Guarding test | Coverage |
| --- | --- | --- |
| Phase list (`GAME_PHASES`, both copies + drift) | `tests/game/phases.test.ts` | ✅ Pinned (22 vs 21, exact order) |
| Role deck (`JAPANESE_MAFIA_ROLE_DISTRIBUTION`) | `phases.test.ts` + `gameEngine` *role deal* | ✅ Pinned (12 cards, 2 MAFIA / 5 CITIZEN, no RH) |
| Teams / factions (`MAFIA_TEAM_ROLES`, `YAKUZA_TEAM_ROLES`) | `phases.test.ts` | ✅ Pinned |
| `roleToFaction` (convex copy) | `tests/convex/roles.test.ts` | ✅ Pinned (every role + unknown) |
| Night kill authority (DON>RH>MAFIA, SHOGUN>YAKUZA, lone shogun, doctor) | `gameEngine` *night kill authority* | ✅ Pinned |
| Kill resolution (`startFarewellSpeech`) | `gameEngine` *night kill resolution* | ✅ Pinned (heal, dual, dedup, no-kill, host-only) |
| Win detection (`decideWinner` / `describeWin` / `winMethodLabel`) | `tests/convex/winConditions.test.ts` | ✅ Pinned (41 cases: all N, sweeps, N=5 exception, N=4 clan, 1v1) |
| Phase transitions (`enterNightPhase` / `enterDayPhase` / `enterVotingPhase`) | `gameEngine` *phase transitions + win check* | ✅ Pinned (pause-on-win, idempotency, no-contest) |
| Role deal (`assignRandomRoles`) | `gameEngine` *role deal* | ✅ Pinned |
| Right-hand promotion (`promoteToRightHand`) | `gameEngine` *right-hand promotion* | ✅ Pinned (Don-only, MAFIA-only, once, right phase) |
| Night session shape (`nightPhaseSessions`) | via kill-resolution seed/assert | ✅ Pinned indirectly |

### 1.2 Frontend concerns (game-types.md §1)

| Concern | Guarding test | Coverage |
| --- | --- | --- |
| Visibility (`canSeeParticipant` / `getAwakeRoles` / `isNightActivityPhase` / dimming / death layering) | `tests/game/visibility.test.ts` | ✅ Pinned (80 cases) |
| Role labels / display | `tests/game/roleDisplay.test.ts` | ✅ Pinned (both `roleToFaction` copies, labels, emoji, icons) |
| Phase→host-button transition graph | `tests/game/phaseTransitionGraph.test.ts` | ✅ Deterministic edges pinned as the `definition.nextPhase` spec |
| Speaking order (shared) | `tests/convex/speakingOrder.test.ts` | ✅ Pinned |

### 1.3 Gaps — shared-engine modules with NO characterization test

These are **shared** modules (game-types.md §4 "stays shared") that Phase 1
physically relocates into `convex/games/core/` and that Phase 3 later modifies via
definition flags. Moving or editing them with **zero** oracle violates the plan's
own guardrail ("when modules move, change only import paths"). They do **not**
block the variant-specific work, but each must be pinned before the phase that
touches it.

| Gap | Module | Relocated in | Modified in | Blocks |
| --- | --- | --- | --- | --- |
| **G1** Voting mechanics (windows, auto-vote on last candidate, tie-break, both-leave) | `convex/game/voting.ts` | Phase 1 | Phase 3 (day-1 single-nominee flag) | P1-T2, P3-T4 |
| **G2** Foul logic (counting, foul-speak 5s, elimination on Nth) | `useFoulSpeak` / `useFoulNotification` + server foul writes | Phase 1 | Phase 3 (3rd-foul speaking ban flag) | P3-T3 |
| **G3** Card-picking flow (watchdog, auto-pick, turn timer, OCC) | `convex/game/cardPicking.ts` | Phase 1 | — (stays shared, deck ← `def.roleDistribution`) | P1-T2 |
| **G4** Seat geometry (`gridPositionForSeat`, `maxPlayers` plumbing) | — | Phase 4 (§6 latent bug fix) | Phase 4 | P4-T4 |

**Bottom line:** start now with Phase 1's interface work and Phase 2's Sports
data (both fully guarded / additive). Close **G1 + G3** as part of Phase 1's
relocation, and **G2 + G4** before Phase 3 / Phase 4 respectively.

---

## 2. Oracle-gap tasks (do these first, where noted)

| ID | Task | Add test at | Status | Commit |
| --- | --- | --- | --- | --- |
| G1 | Characterize voting: open/close window, auto-vote on last candidate, tie-break, both-candidates-leave | `convex/tests/gameEngine.test.ts` (5 new `describe`s, 16 tests) | ✅ | working tree |
| G2 | Characterize fouls: increment, foul-speak 5s window, elimination on the Nth foul | `convex/tests/` + a pure `tests/` unit if extractable | ⬜ | |
| G3 | Characterize card-picking flow: turn order, auto-pick on timeout, OCC/double-pick rejection | `convex/tests/gameEngine.test.ts` (4 new `describe`s, 10 tests) | ✅ | working tree |
| G4 | Unit-test `gridPositionForSeat` for the 12-seat grid (pure fn) so Phase 4's 10-seat layout is a visible diff | `tests/game/seatLayout.test.ts` (new) | ⬜ | |

> These are characterization tests: assert **current** behavior, then never
> change the assertions during the move.

---

## 3. Phase task breakdown

### Phase 0 — Rename `traditional → sports_mafia` ✅ DONE

| ID | Task | Status |
| --- | --- | --- |
| P0 | Rename across schema validator, `RATING_CONFIG`, `refs/*`, frontend constants, i18n, docs; drop legacy literal; keep `sports_mafia` non-creatable | ✅ |

### Phase 1 — Introduce the abstraction, extract Japanese (no behavior change)

> The biggest, most careful step. Japanese must be **byte-for-byte equivalent**.
> Every task below is guarded by re-pointing an existing test's **import path
> only**.

| ID | Task | Files | Guarding test | Status | Commit |
| --- | --- | --- | --- | --- | --- |
| P1-T0 | Close relocation oracle gaps **G1** (voting) + **G3** (card-picking) before moving them | see §2 | 26 new convex-test cases green | ✅ | working tree |
| P1-T1 | Define **backend** core interfaces: `GameDefinition`, `NightModel`, `NightState`, `PhaseContext`, `Outcome`, `GameFlags` (`VisibilityRuleset` is a UI type → moved to P1-T8) | `convex/games/core/types.ts` (new) | `npx tsc --noEmit` | ✅ | working tree |
| P1-T2 | Pure move of variant-agnostic engine into `convex/games/core/` (`phaseTransitions`, `speakingOrder`, `voting`, `fouls`, `cardPicking`, `archive`/ELO) | `convex/games/core/*` | `gameEngine` + `speakingOrder` green, **imports only** | ⬜ | |
| P1-T3 | Move Japanese constants/logic into `convex/games/japanese/*` (`phases`, `roles`, `nightModel`, `winConditions`, `visibility`) | `convex/games/japanese/*` | `winConditions` + `roles` + `phases` green, **imports only** | ⬜ | |
| P1-T4 | Assemble `JAPANESE_DEFINITION` (**wraps** current `lib/*` modules; no move yet) + pure `nightModel.resolveKills` + `phases.nextPhase` graph | `convex/games/japanese/{definition,nightModel,phases}.ts` | `tests/game/gameDefinition.test.ts` (46 equivalence assertions) | ✅ | working tree |
| P1-T5 | Registry `getGameDefinition(gameType)` (Japanese only; Sports in Phase 2) | `convex/games/registry.ts` | `gameDefinition.test.ts` registry block | ✅ | working tree |
| P1-T6 | Replace positional `GAME_PHASES[n]` in all 14 phase buttons with `advanceUpdates(...)` (backed by `definition.nextPhase`); centralize the graph + buffer-routing in `src/game/japanese/phaseFlow.ts` | `phaseButtonsForHost/*` (14 files), `src/game/japanese/phaseFlow.ts` (new) | `tests/game/phaseFlow.test.ts` (15 payload assertions); `GAME_PHASES` now absent from every button | ✅ | working tree |
| P1-T7 | Move the wrapped modules into `convex/games/*` for real + update `convex/refs/*` / `api.*` paths; one mechanical commit | `convex/refs/*` | full suite + `tsc` | ⬜ (unblocked — G1/G3 done; T4 wrapper makes it a pure import-path swap) | |
| P1-T8 | Frontend core: define `VisibilityRuleset` + `UiRuleset` (`src/game/core/types.ts`); Japanese ruleset wrapping current visibility + phaseFlow (`src/game/japanese/{visibility,ruleset}.ts`); `src/game/registry.ts`; resolve + expose `ruleset` in `gameRoomContext` | `src/game/*`, `gameRoomContext.tsx` | `tests/game/uiRegistry.test.ts` (7 tests); `visibility` + `roleDisplay` untouched | ✅ | working tree |

> **Increment 1 landed (working tree, uncommitted):** P1-T1/T4/T5 via the
> **wrap-not-move** strategy — the definition + registry are new additive files
> that reference the current `convex/lib/*` implementations, so there is zero
> `api.*` churn and the Japanese game is untouched. The physical relocation
> (P1-T2/T3/T7) is deferred until the shared-module gaps (G1/G3) are pinned;
> once they are, T7 becomes a pure import-path swap because T4 already wrapped
> the seams. New pure logic (`resolveKills`, `nextPhase`) is characterized in
> `gameDefinition.test.ts` against the same cases the existing oracle asserts.

> **Increment 2 landed (working tree, uncommitted):** consumers wired to the
> abstraction, no new oracle gaps needed.
> - **P1-T6:** all 14 host phase buttons now call `advanceUpdates(source)` from
>   the new `src/game/japanese/phaseFlow.ts` (which resolves the destination via
>   `definition.nextPhase` and applies Japanese buffer-routing). Every positional
>   `GAME_PHASES[n]` is gone from the buttons. Pinned by `phaseFlow.test.ts`.
> - **Night resolution seam (§2.3):** `startFarewellSpeech` now computes killed
>   seats via `getGameDefinition(game.gameType).night.resolveKills(...)` instead
>   of inlining the scalar reads. Verified byte-for-byte by the existing
>   convex-test kill-resolution suite (still green).
>
> **Verification note:** behavior is pinned by the 283-test suite (incl. the
> DB-coupled `gameEngine` integration test that drives the rewired
> `startFarewellSpeech`). A live multiplayer/WebRTC E2E is deferred by design
> (testing.md §E2E), so the phase-button flow is verified via the exact-payload
> `phaseFlow.test.ts` rather than by driving the real game room.
>
> **Follow-up (small):** `convex/game/sessions.ts` still uses `GAME_PHASES[0]`
> (the initial phase) at 2 sites — a positional ref outside the transition graph.
> Fold into P1-T7 (swap to `definition.phases[0]` / a named constant) to fully
> satisfy the §8 "no `GAME_PHASES[n]`" guardrail.

> **Increment 3 landed (working tree, uncommitted):** oracle gaps **G1 + G3**
> closed, unblocking the physical relocation. Added 26 convex-test cases to
> `gameEngine.test.ts` driving the real mutations:
> - **G1 voting:** window activate/deactivate, per-round casting (+ duplicate /
>   dead-voter rejection), auto-vote for every non-voter on the last candidate,
>   `processResults` winner/tie/both-leave-excluded tally, tie-break (new round
>   vs same-seats → both-leave escalation), and the both-leave `>50%` threshold.
> - **G3 card-picking:** full-deck + partial-lobby deal, seat-ordered pick order,
>   the claim→role-write→advance contract, out-of-turn / already-taken / unknown
>   / post-complete rejections, the `expireTurnInternal` auto-pick watchdog and
>   its stale-index / missing-session no-ops, and `getState` role visibility
>   (claimer + host see roles; others don't).
>
> These pin the SHARED modules that P1-T2 relocates into `core/`, so that move is
> now a guarded import-path swap. **P1-T2/T3/T7 are unblocked.** (G2 fouls remains
> open — only needed before P3-T3.)

> **Increment 4 landed (working tree, uncommitted):** P1-T8 — the frontend UI
> ruleset seam.
> - New `src/game/core/types.ts` (`VisibilityRuleset`, `UiRuleset`),
>   `src/game/japanese/visibility.ts` + `ruleset.ts` (wrap the current
>   `lib/game/visibility` + `phaseFlow` by reference), and `src/game/registry.ts`
>   (`getUiRuleset(gameType)`, Japanese-only; loads-safe + non-crashing fallback).
> - `gameRoomContext` now resolves the ruleset from `gameData.gameType` and
>   exposes it as `ruleset` on the context value.
> - Pinned by `tests/game/uiRegistry.test.ts`; `visibility`/`roleDisplay` oracles
>   untouched (wrap-not-move, so "imports only" holds trivially).
>
> **Scope note:** this makes the ruleset *available*; it does not yet rewire
> consumers. Components/hooks still import `lib/game/visibility` directly —
> switching them to `useGameRoom().ruleset` (and the phase-controls map + seat
> geometry + `maxPlayers` fix) is **Phase 4** per game-types.md §5.

**Phase 1 exit gate:** full suite green with **only import paths changed** in
`tests/` and `convex/tests/`; no `gameType` string literal outside the registry /
definitions (game-types.md §8).

### Phase 2 — Author the Sports definition (data only, nothing wired to UI)

| ID | Task | Files | Guarding test | Status | Commit |
| --- | --- | --- | --- | --- | --- |
| P2-T1 | Sports roles, deck (10), 2 factions, `roleToFaction` | `convex/games/sports/roles.ts` | new `tests/game/sports/roles.test.ts` | ⬜ | |
| P2-T2 | Sports phase list + `nextPhase` graph | `convex/games/sports/phases.ts` | new `tests/game/sports/phases.test.ts` | ⬜ | |
| P2-T3 | Sports `decideWinner` (parity rule) | `convex/games/sports/winConditions.ts` | new characterization test vs [sports-mafia.md](./sports-mafia.md) tables | ⬜ | |
| P2-T4 | Timers + flags (`hasIntroductionPhase:false`, `hasFarewellSpeech`, `firstDaySingleNomineeSkipsToNight:true`, …) | `convex/games/sports/definition.ts` | assemble + `tsc` | ⬜ | |
| P2-T5 | Register `sports_mafia` in `getGameDefinition` (still not creatable) | `convex/games/registry.ts` | registry unit | ⬜ | |

### Phase 3 — Sports night model + new mechanics

| ID | Task | Files | Guarding test | Status | Commit |
| --- | --- | --- | --- | --- | --- |
| P3-T1 | Add optional `mafiaTargetSelections: {voterSeat,targetSeat}[]` to `nightPhaseSessions` (additive; Japanese scalars untouched) | `convex/tables/nightPhaseSessions.ts` | existing `gameEngine` night tests stay green (Japanese unchanged) | ⬜ | |
| P3-T2 | Implement unanimous-vote `NightModel` (`getActingRoles`, `recordSelection`, `resolveKills` = unanimity, 5s window; lone mafia may abstain) | `convex/games/sports/nightModel.ts` | new `convex/tests` sports night suite | ⬜ | |
| P3-T3 | 3rd-foul speaking ban as shared-engine behavior gated on definition flag | `convex/games/core/fouls.ts` | needs **G2**; new flagged test | ⚠️ (needs G2) | |
| P3-T4 | Day-1 single-nominee → skip-to-night rule gated on flag | `convex/games/core/voting.ts` | needs **G1**; new flagged test | ⚠️ (needs G1) | |

### Phase 4 — Frontend dispatch + geometry (fixes §6 latent bug)

| ID | Task | Files | Guarding test | Status | Commit |
| --- | --- | --- | --- | --- | --- |
| P4-T1 | `gameRoomContext` resolves the UI ruleset from `gameData.gameType` | `gameRoomContext.tsx`, `src/game/registry.ts` | manual + existing visibility | ⬜ | |
| P4-T2 | `GamePhaseControls` renders from the variant's phase→controls map | `components/game/GamePhaseControls.tsx` | `phaseTransitionGraph` still green | ⬜ | |
| P4-T3 | `visibility.ts` + night-authority hooks dispatch to the ruleset | `lib/game/visibility.ts`, `hooks/game/useNight*` | `visibility.test.ts` green, **imports only** | ⬜ | |
| P4-T4 | **Fix `maxPlayers` plumbing (§6):** thread `maxPlayers` from `useGameRoom()` into both `<PlayerCircle>` renders | `LiveKitTestComponent.tsx`, `SpectatorView.tsx` | needs **G4** | ⚠️ (needs G4) | |
| P4-T5 | Seat layout from variant `seatLayout` (10-ring + host for Sports; 12-ring for Japanese) instead of hardcoded switch | `PlayerCircle.tsx`, `useSeatShuffleAnimation.ts`, `src/game/*/seatLayout.ts` | `seatLayout.test.ts` extended for 10-seat | ⬜ | |

### Phase 5 — Enable + calibrate

| ID | Task | Files | Status | Commit |
| --- | --- | --- | --- | --- |
| P5-T1 | Un-filter `sports_mafia` in `CreateGameModal` | `components/.../CreateGameModal` | ⬜ | |
| P5-T2 | Ship **unrated** first (absent from `RATING_CONFIG` → ELO skipped) | `convex/lib/ratings.ts` | ⬜ | |
| P5-T3 | Add Sports `RATING_CONFIG` + E-table after ~200 decided games | `convex/lib/ratings.ts` | 🔵 (deferred by design) | |

---

## 4. Per-task regression protocol

1. Make the change.
2. `npx tsc --noEmit` then `npm test`.
3. If a `tests/` or `convex/tests/` file needed edits:
   - **import path only** → fine, mark the task ✅.
   - **any assertion changed** → **stop.** That is a behavior regression
     (testing.md §"Using the suite"). Revert, investigate, and log it under
     "Regressions caught" below. Do not mark the task done.
4. Record the commit SHA in the task row.

## 5. Regressions caught

_(none yet — append `PHASE-TASK · date · what assertion tried to change · resolution`)_
