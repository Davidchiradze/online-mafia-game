# Game Types Refactor — Task Tracker

> **ARCHIVED — frozen 2026-08. This is a completed changelog, not a live checklist.**
>
> Every phase P0–P6 landed; the sole open item was `P5-T3` (Sports
> `RATING_CONFIG`, deferred by design). The remaining work has been lifted into
> [game-types.md](../game-types.md) §5, which is now the only place to look for
> it. Paths, test counts, and status boxes below are frozen at the date in this
> file's name and are largely pre-migration.
>
> Because its claims are intentionally frozen, this file is exempt from the
> stale-path check in `tests/structure/docLinks.test.ts`. The `ARCHIVED` marker
> above is what earns that exemption.
>
> Original purpose, for context: this file decomposed the phased plan in
> [game-types.md](../game-types.md) §5 into small, independently verifiable
> tasks, and recorded which characterization test in `tests/` /
> `convex/tests/` **guarded** each one.
>
> **Update protocol (historical):** after finishing a task, flip its status box and add the
> commit SHA. If a task's guarding test needed an *assertion* change (not just an
> import-path change), stop — per [testing.md](../testing.md), that is a behavior
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

Baseline: **377 tests passing** across 12 files (`npm test`), `npx tsc --noEmit`
clean. (Was 222/8 before Phase 1. New files: `tests/game/gameDefinition.test.ts`
— definition-equivalence oracle; `tests/game/phaseFlow.test.ts` — host-advance
`updates` payloads; `tests/game/uiRegistry.test.ts` — frontend UI-ruleset
registry; `tests/game/sportsDefinition.test.ts` — Sports definition (36 tests).
`convex/tests/gameEngine.test.ts` grew 27→71 with the G1 voting + G3
card-picking + G2 foul + P3-T2 sports-night suites.)

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
| G2 | Characterize fouls: `giveFoul` increment, phase gating, 4th-foul elimination + `foulEliminationOccurred`, on-elimination win check (5s foul-speak window is UI timing, out of scope) | `convex/tests/gameEngine.test.ts` (1 new `describe`, 7 tests) | ✅ | working tree |
| G3 | Characterize card-picking flow: turn order, auto-pick on timeout, OCC/double-pick rejection | `convex/tests/gameEngine.test.ts` (4 new `describe`s, 10 tests) | ✅ | working tree |
| G4 | Unit-test `gridPositionForSeat` for the 12-seat grid (pure fn) so Phase 4's 10-seat layout is a visible diff | `tests/game/seatLayout.test.ts` (new) | ✅ | working tree |

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
| P1-T2 | ~~Pure move of variant-agnostic engine into `convex/games/core/`~~ | `convex/games/core/*` | — | ⚠️ RESCOPE (see Finding) | |
| P1-T3 | Move Japanese constants/logic into `convex/games/japanese/*`. **winConditions ✅ done** (Incr. 6 — pure move, no shared-consumer entanglement); `roles`/`constants` still ⚠️ deferred (see Finding) | `convex/games/japanese/*` | `winConditions.test.ts` (oracle, path-only change) | 🟡 partial | working tree |
| P1-T4 | Assemble `JAPANESE_DEFINITION` (**wraps** current `lib/*` modules; no move yet) + pure `nightModel.resolveKills` + `phases.nextPhase` graph | `convex/games/japanese/{definition,nightModel,phases}.ts` | `tests/game/gameDefinition.test.ts` (46 equivalence assertions) | ✅ | working tree |
| P1-T5 | Registry `getGameDefinition(gameType)` (Japanese only; Sports in Phase 2) | `convex/games/registry.ts` | `gameDefinition.test.ts` registry block | ✅ | working tree |
| P1-T6 | Replace positional `GAME_PHASES[n]` in all 14 phase buttons with `advanceUpdates(...)` (backed by `definition.nextPhase`); centralize the graph + buffer-routing in `src/game/japanese/phaseFlow.ts` | `phaseButtonsForHost/*` (14 files), `src/game/japanese/phaseFlow.ts` (new) | `tests/game/phaseFlow.test.ts` (15 payload assertions); `GAME_PHASES` now absent from every button | ✅ | working tree |
| P1-T7 | `GAME_PHASES[0]` → `"game_session_started"` literal in `sessions.ts` **✅**; module move + refs/`api.*` swap **deferred** (see Finding) | `convex/game/sessions.ts` | full suite + `tsc` | 🟡 partial | working tree |
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

> **Finding (Increment 5) — the physical relocation is NOT a "pure mechanical
> move"; T2/T3/T7 rescoped.** Investigating the actual import graph before moving
> files surfaced two problems with §3's optimistic framing:
> - **T3 shared-infra entanglement.** The modules slated to move into
>   `games/japanese/` are not Japanese-only: `lib/winConditions` (`decideWinner`)
>   is imported by `admin/stats.ts`, `admin/gameLogs.ts`, `game/gameLogs.ts`; and
>   `lib/roles` (`roleToFaction`) is imported by `lib/access.ts` (authorization).
>   Moving them into a `japanese/` folder would make **admin + auth code import
>   from a variant folder** — architecturally backwards. The doc's own §4 says
>   `roleToFaction`/`decideWinner` *become* variant-specific and admin/ELO *stay
>   shared* — which means the real task is **rewiring those shared consumers to
>   call `getGameDefinition(gameType).roleToFaction` / `.decideWinner`**, not
>   relocating a file. That is substantive gameType-awareness work touching
>   sensitive auth/admin code — deferred, not mechanical.
> - **T2/T7 registered-function churn + runtime risk.** `voting.ts` /
>   `cardPicking.ts` are registered Convex functions; moving them rewrites their
>   `api.*` paths, which means editing **dozens of `makeFunctionReference` string
>   paths** in `convex/refs/*` (the full `convex/game/*` relocation rewrites ~83
>   such strings; 101 across all of `refs/` — the earlier "24+" estimate was low
>   by ~4×). Those strings are typed as plain strings — a typo is a
>   **runtime "function not found", invisible to `tsc`** and not covered by the
>   test suite (which calls `api.*` directly, not the refs). The move also
>   requires regenerating the committed `convex/_generated/` via a live
>   deployment codegen. All of this for a purely **organizational** relocation
>   that unlocks no capability — Sports (Phase 2/3) does not need it.
>
> **Decision:** ship the abstraction as-is (done, green, and functionally
> complete). Do only the safe, tsc-guarded `GAME_PHASES[0]` fix now. Treat the
> file relocation as optional cleanup to be done — if at all — surgically with a
> live `convex dev` validation loop, and rewire shared consumers to the
> definition as its own deliberate task rather than a file shuffle. **Phase 1's
> functional goal (variant rules behind stable interfaces, consumed via the
> registries) is met without T2/T3.**

> **Increment 6 landed (working tree, uncommitted) — Japanese winConditions
> relocated (the SAFE subset of T3).** The Finding above deferred T3 wholesale on
> the grounds that `lib/winConditions` had shared consumers (admin/game-logs).
> Re-checking the import graph after P3-T5 showed that entanglement no longer
> applies to the *logic*: the only shared consumers (`admin/stats`,
> `admin/gameLogs`, `game/gameLogs`) import **`winMethodLabel`** (a generic
> formatter), and `recordWinnerIfDecided` was already rerouted through
> `getGameDefinition().describeWin` in P3-T5. So the file split cleanly in three:
> - **`convex/games/japanese/winConditions.ts` (new):** the Japanese decision
>   tables — `describeWin`, `decideWinner`, and their private helpers.
> - **`convex/lib/winConditions.ts` (kept):** only the shared vocabulary
>   (`WinContext`, `Winner`, `GameOutcome`, `WinMethod`) + `winMethodLabel`.
> - `games/japanese/definition.ts` + the two test files repointed (path only).
>
> **Why this one was safe** (unlike the still-deferred `voting.ts`/`cardPicking.ts`
> and `roles.ts` moves): winConditions holds **no registered Convex function**, so
> nothing points at it via a `makeFunctionReference` string ref — zero runtime-typo
> risk, every importer is a `tsc`-checked ES import. Verified: `tsc` clean, **377
> tests** unchanged (the winConditions oracle's 41 assertions green → Japanese
> behavior byte-identical). Still deferred: `lib/roles` (auth-entangled) + the
> registered-function moves (T2/T7).

**Phase 1 exit gate:** full suite green with **only import paths changed** in
`tests/` and `convex/tests/`; no `gameType` string literal outside the registry /
definitions (game-types.md §8).

### Phase 2 — Author the Sports definition (data only, nothing wired to UI)

| ID | Task | Files | Guarding test | Status | Commit |
| --- | --- | --- | --- | --- | --- |
| P2-T1 | Sports roles, deck (10), 2 factions, `roleToFaction` | `convex/games/sports/roles.ts` | `tests/game/sportsDefinition.test.ts` (§2) | ✅ | working tree |
| P2-T2 | Sports phase list + `nextPhase` graph | `convex/games/sports/phases.ts` | `sportsDefinition.test.ts` (§3 — dropped phases + 8 edges) | ✅ | working tree |
| P2-T3 | Sports `decideWinner` (parity rule) | `convex/games/sports/winConditions.ts` | `sportsDefinition.test.ts` (§6 worked-examples table + context-independence) | ✅ | working tree |
| P2-T4 | Flags (`hasIntroductionPhase:false`, `firstDaySingleNomineeSkipsToNight:true`, `thirdFoulSpeakingBan:true`, …); timers deferred to Phase 4 (UI concern) | `convex/games/sports/definition.ts` | `sportsDefinition.test.ts` (flags) + `tsc` | ✅ | working tree |
| P2-T5 | Register `sports_mafia` in `getGameDefinition` (still not creatable) | `convex/games/registry.ts` | `sportsDefinition.test.ts` (registry) | ✅ | working tree |

> **Phase 2 landed (working tree, uncommitted):** the Sports definition exists
> as pure data and is registered. New files `convex/games/sports/{roles,phases,
> winConditions,nightModel,definition}.ts` + registered in `getGameDefinition`.
> 36 spec assertions in `tests/game/sportsDefinition.test.ts` pin it against
> sports-mafia.md: roles/deck/factions (§2), the phase graph incl. dropped
> phases + 8 host-advance edges (§3), the parity `decideWinner` worked-examples
> table (§6, context-independent), and the unanimous-vote `resolveKills` (§5.2).
> The `NightModel.resolveKills` signature gained an optional `context`
> (`livingMafiaSeats`) — backward-compatible, so Japanese + `startFarewellSpeech`
> are untouched. **Nothing is wired to the UI**, and Sports stays non-creatable.
> Total suite 316 → 352.

> **P3-T1 + P3-T2 landed (working tree, uncommitted):** the Sports night runs
> server-side.
> - **Schema (P3-T1):** `nightPhaseSessions` gained `mafiaTargetSelections`,
>   `mafiaTargetWindowStartedAt`, `mafiaTargetWindowActive` (all optional →
>   Japanese rows validate unchanged; codegen validated vs the dev deployment).
> - **Night wiring (P3-T2):** new `convex/game/sportsNightPhase.ts` —
>   `startMafiaTargetWindow` (arms a 5s scheduler via the type-safe generated
>   `internal`, closes the window without advancing the phase),
>   `selectMafiaTarget` (living-mafia-only, in-window, last-write-wins, private),
>   `getMySelection` (own pick only, §5.4). `startFarewellSpeech` now branches on
>   `definition.night.kind`; the `single-authority` (Japanese) branch is the
>   **exact prior call**, so the kill-resolution oracle stays green. 11 new
>   convex-test cases. Suite 359 → 370.
>
> **P3-T5 landed:** the win-check seam now dispatches through
> `definition.describeWin` (added to `GameDefinition`). Japanese reuses the exact
> existing `describeWin` (provably unchanged — 41 winCondition + phase-transition
> tests green); Sports gets the parity snapshot with `yakuza/shogun:false`.
> _Observation:_ for the current 3-mafia Sports deck the parity outcome coincides
> with Japanese on every reachable roster (Sports has no yakuza/doctor and caps
> mafia at 3), so this changes no reachable outcome today — its value is
> architectural (no Japanese hardcoding in the shared seam), the correct
> 2-faction snapshot, and future-proofing if the deck changes.
>
> **P3-T3 + P3-T4 landed (working tree, uncommitted):** the two shared-engine
> day-phase mechanics, both gated on definition flags with the Japanese flags
> false → its behavior byte-for-byte unchanged (full 377-test baseline still
> green; only additive tests + assertions added, total 377 → 395).
> - **Day-round groundwork:** `convex/games/core/dayRound.ts` — the monotonic day
>   round is DERIVED from the session's existing `currentNightNumber` (day round
>   = `nightNumber + 1`; the first day runs at night 0), so no new counter /
>   schema field. Both tasks key off it.
> - **P3-T4 (single-nominee rule, §4.1):** `startNominatedPlayersSpeaking` now
>   branches on `flags.firstDaySingleNomineeSkipsToNight`. Sports: a lone nominee
>   on day 1 skips voting → `enterNightPhase` (no elimination); on day 2+ it goes
>   straight to `farewell_speech` (→ night via `advanceFromFarewell`, since
>   `nominatedPlayers` stays non-empty). Japanese (flag off) is unchanged — a
>   single nominee still goes to `voting`.
> - **P3-T3 (3rd-foul speaking ban, §4.2):** `convex/games/core/fouls.ts` (pure
>   ban arithmetic) + `foulSpeakingBanRound` (optional) on `gamePlayers`.
>   `giveFoul` stamps the ban round on the 3rd foul when
>   `flags.thirdFoulSpeakingBan`; `startDaySpeaking` drops a player muted for the
>   current round from the day speaking order, EXCEPT on the final day phase
>   (≤ 4 alive) where the ban is lifted (the shortened 30s speech is a Phase-4 UI
>   concern). The 4th-foul elimination is retained across variants.
>
> **Known remaining gaps (Sports not yet playable):**
> - **Phase 4:** no Sports UI, no phase buttons calling `startMafiaTargetWindow` /
>   `selectMafiaTarget`, no frontend refs for them yet; the 30s banned-speaker
>   timer + `MafiaTargetIndicator` privacy gating are also Phase-4 UI. Sports
>   stays non-creatable.

### Phase 3 — Sports night model + new mechanics

| ID | Task | Files | Guarding test | Status | Commit |
| --- | --- | --- | --- | --- | --- |
| P3-T1 | Add optional `mafiaTargetSelections` + `mafiaTargetWindowStartedAt` + `mafiaTargetWindowActive` to `nightPhaseSessions` (all optional; Japanese scalars untouched) | `convex/tables/nightPhaseSessions.ts` | `gameEngine` night tests green (Japanese unchanged); `tsc`; codegen validated vs dev | ✅ | working tree |
| P3-T2 | Unanimous-vote `NightModel`: pure `resolveKills` (Phase 2) + `convex/game/sportsNightPhase.ts` (5s window open/close scheduler, private per-mafia `selectMafiaTarget` w/ last-write-wins, `getMySelection`) + `startFarewellSpeech` branch on `night.kind` passing `livingMafiaSeats` (Japanese branch byte-for-byte unchanged) | `convex/game/sportsNightPhase.ts`, `convex/game/farewellSpeech.ts`, `SPORTS` const | `sportsDefinition.test.ts` (§5.2) + `gameEngine.test.ts` sports-night suites (11 tests: window, selection, privacy, dawn resolution) | ✅ | working tree |
| P3-T3 | 3rd-foul speaking ban as shared-engine behavior gated on definition flag | `convex/games/core/fouls.ts`, `convex/games/core/dayRound.ts`, `convex/game/dayPhase.ts`, `tables/gamePlayers.ts` | `tests/game/dayRoundFouls.test.ts` + `gameEngine.test.ts` sports-foul-ban suite (5 tests) | ✅ | working tree |
| P3-T4 | Day-1 single-nominee → skip-to-night rule (+ later-round single-nominee auto-eliminate) gated on `firstDaySingleNomineeSkipsToNight` | `convex/game/dayPhase.ts`, `convex/games/core/dayRound.ts` | `gameEngine.test.ts` sports single-nominee suite (4 tests) | ✅ | working tree |
| P3-T5 | Route the win-check seam through the definition: added `describeWin` to `GameDefinition` (Japanese reuses the exact `lib/winConditions.describeWin`; Sports ships `describeSportsWin` — parity + `yakuza/shogun:false` §7). `recordWinnerIfDecided` now resolves `getGameDefinition(game.gameType).describeWin`. Japanese byte-for-byte unchanged | `convex/lib/games.ts`, `games/core/types.ts`, `games/{japanese,sports}/*` | `winConditions.test.ts` + `gameEngine` transitions green (Japanese) + Sports `describeWin` (4) + `recordWinnerIfDecided` sports (3) | ✅ | working tree |

> **P4-T2 landed (working tree, uncommitted):** `GamePhaseControls` no longer
> switches on positional `GAME_PHASES[n]` — it looks the current phase up **by
> name** in `ruleset.phaseControls` (new required field on `UiRuleset`), killing
> the last §8 index dependency in the host controls.
> - **Japanese** (`src/game/japanese/phaseControls.tsx`) is a byte-for-byte
>   transcription of the old switch — same components, same
>   `introduction_phase`/`day_phase` conditional branches. Verified by the green
>   `phaseFlow` + `phaseTransitionGraph` + full suite (404).
> - **Sports** is now **registered** (`SPORTS_UI_RULESET`): `sports/phaseFlow.ts`
>   (its own `advanceUpdates` + buffer set), `sports/phaseControls.tsx` (reuses
>   the shared card-pick/day/vote/farewell/continue/buffer controls; new generic
>   `PhaseAdvanceButton` for the meet/check advances whose target differs from
>   Japanese; `StartSportsMafiaPhaseButton` advances into `mafia_chooses_target`
>   **and arms the 5s window**). The last night check parks in the buffer with
>   `nextPhase: farewell_speech`, so the shared `StartNextPhaseButton` triggers
>   `startFarewellSpeech` (dawn resolution) exactly as Japanese's doctor step.
> - The `uiRegistry` Phase-1 "sports → Japanese fallback" assertion was flipped
>   to strict Sports dispatch (the planned P4 change the registry doc anticipated
>   — not a Japanese regression). Added `sportsNightPhase` frontend refs.
> - **Interim:** `SPORTS_UI_RULESET.visibility` reuses Japanese visibility until
>   **P4-T3** authors the Sports `VisibilityRuleset` (mafia-target privacy §5.4);
>   `seatLayout` is added in **P4-T5**. The interactive per-mafia kill buttons +
>   selection indicator (§5.4) are separate UI, not part of the host controls.
>   Sports stays non-creatable, so none of this is live yet.

> **P4-T3 landed (working tree, uncommitted):** shared UI now consults the
> resolved ruleset for visibility + night authority instead of importing the
> Japanese lib directly.
> - **Visibility dispatch:** `useParticipantVisibility` (`getVisibilityStateWithDeath`)
>   and `PhaseCountdown` (`getAwakeRoles`) call `ruleset.visibility.*`. The
>   `VisibilityState` enum + `GamePhase`/`Role` types stay imported from `lib`
>   (shared vocabulary). `lib/game/visibility.ts` and its 80-case oracle are
>   **untouched** — the functions didn't move, so the guard held trivially.
> - **Sports visibility** (`src/game/sports/visibility.ts`): wraps the same shared
>   fns (video-tile visibility is identical; Sports roles are a subset). Replaces
>   the P4-T2 interim Japanese reuse in `SPORTS_UI_RULESET`.
> - **Night-authority dispatch:** new `ruleset.nightAuthority(input)` (pure).
>   `useNightActionAuthority` now just gathers room context and delegates.
>   Japanese logic extracted verbatim (`japanese/nightAuthority.ts` — DON>RH>MAFIA,
>   SHOGUN>YAKUZA, lone-shogun-can't-kill, DOCTOR, host-never); Sports
>   (`sports/nightAuthority.ts`) gives EVERY living mafia authority during
>   `mafia_chooses_target`, no yakuza/doctor (§5). Pinned by `nightAuthority.test.ts`.
> - **Out of scope (interactive night UI, not these hooks):** the `MafiaTargetIndicator`
>   privacy gating + per-mafia kill buttons calling `sportsNightPhase.selectMafiaTarget`
>   (§5.4), and the 30s banned-speaker timer, remain follow-on UI.
>   `useNightPhaseReadiness` stays Japanese-scoped by construction — its only
>   consumers are the Japanese-only `End*` night buttons; Sports uses the
>   always-enabled `PhaseAdvanceButton` ("Finish Mafia Phase", host-manual §5.1).

### Phase 4 — Frontend dispatch + geometry (fixes §6 latent bug)

| ID | Task | Files | Guarding test | Status | Commit |
| --- | --- | --- | --- | --- | --- |
| P4-T1 | `gameRoomContext` resolves the UI ruleset from `gameData.gameType` | `gameRoomContext.tsx`, `src/game/registry.ts` | manual + existing visibility | ✅ (landed in P1-T8) | working tree |
| P4-T2 | `GamePhaseControls` renders from the variant's phase→controls map | `GamePhaseControls.tsx`, `src/game/{core/types,japanese/phaseControls,sports/{phaseFlow,phaseControls,ruleset}}`, `PhaseAdvanceButton`/`StartSportsMafiaPhaseButton`, `refs/game.ts` | `phaseTransitionGraph` still green; `uiRegistry.test.ts` (+ maps coverage) | ✅ | working tree |
| P4-T3 | `visibility.ts` + night-authority hooks dispatch to the ruleset | `useParticipantVisibility.ts`, `PhaseCountdown.tsx`, `useNightActionAuthority.ts`, `src/game/{core/types,japanese/nightAuthority,sports/{visibility,nightAuthority,ruleset}}` | `visibility.test.ts` green (**unchanged**); `nightAuthority.test.ts` (7) + `uiRegistry` sports | ✅ | working tree |
| P4-T4 | **Fix `maxPlayers` plumbing (§6):** thread `maxPlayers` from `useGameRoom()` into both `<PlayerCircle>` renders | `LiveKitTestComponent.tsx`, `SpectatorView.tsx` | needs **G4** ✅; Japanese no-op (`maxPlayers ?? 12` = 12) | ✅ | working tree |
| P4-T5 | Seat layout from variant `seatLayout` (10-ring + host for Sports; 12-ring for Japanese) instead of hardcoded switch | `PlayerCircle.tsx`, `useSeatShuffleAnimation.ts`, `src/game/{core/types,japanese/seatLayout,sports/seatLayout}` | `seatLayout.test.ts` extended (8 tests: 12-ring unchanged + 10-ring) | ✅ | working tree |

> **P4-T5 landed (working tree, uncommitted):** seat geometry now comes from
> `ruleset.seatLayout` (new `SeatLayout` on `UiRuleset`) instead of the hardcoded
> 4×4 switch.
> - **Japanese** (`src/game/japanese/seatLayout.ts`): the 12-seat 4×4 ring +
>   center panel (cols 2–3, rows 2–3), `positionForSeat` moved **verbatim** from
>   the old `useSeatShuffleAnimation` switch. The G4 oracle's 12-ring assertions
>   are unchanged (imports repointed only). `PlayerCircle`'s grid template +
>   center span are now inline styles computed from the layout — for Japanese
>   they resolve to the exact prior CSS (`grid-cols-4`/`grid-rows-4`,
>   `col-start-2 … row-end-4`), so it renders identically.
> - **Sports** (`src/game/sports/seatLayout.ts`): a 4×3, 10-seat ring (top 4,
>   one seat each side, bottom 4; host+controls in the center row) — no phantom
>   empty seats (the §6 bug). Pinned by `seatLayout.test.ts` (distinct cells,
>   all within the 4×3 grid).
> - `useSeatShuffleAnimation` no longer defines the geometry — it takes
>   `gridPositionForSeat` (the layout's `positionForSeat`) as a param for its
>   arc-distance math. `PlayerCircle` resolves `seatLayout` from `useGameRoom()`.
> - **Visual QA note:** the Sports center panel is 1 grid-row tall (vs Japanese's
>   2), so host-video/controls proportions want an eyeball once Sports is
>   creatable (Phase 5) — the mapping is correct, sizing is QA-tunable.

**Phase 4 exit gate:** ✅ T1 (context ruleset) · T2 (phase-controls map) · T3
(visibility + night-authority dispatch) · T4 (`maxPlayers` §6 fix) · T5 (variant
seat geometry). Japanese verified byte-identical by the unchanged oracles
(visibility 80, seatLayout 12-ring, phaseFlow, phaseTransitionGraph) + full suite.

> **§5.4 interactive mafia night UI landed (working tree, uncommitted):** the
> per-mafia private kill selection is wired through the ruleset — using the same
> **boundary-dispatch** discipline as `phaseControls`/`nightAuthority`, with NO
> `gameType` branching inside shared units.
> - New `UiRuleset.mafiaNightModel` discriminant (`single-authority` Japanese /
>   `unanimous-vote` Sports).
> - New `MafiaKillControl` (one component) is the single dispatch boundary: it
>   picks a cohesive per-model hook — `useSingleAuthorityMafiaKill` (Japanese
>   shared target; the old `useMafiaTargetSelection` logic verbatim) or
>   `useUnanimousMafiaKill` (Sports: caller's OWN pick via
>   `sportsNightPhase.getMySelection` §5.4, kill button gated on the open 5s
>   window, re-pickable last-write-wins) — and renders one shared presentational
>   `MafiaKillView`.
> - `MafiaKillButton` is now **purely presentational** (injected `onClick` +
>   flags; no ruleset, no mutations). The old `useMafiaTargetSelection` hook and
>   the mafia section of `NightActionButtons` were removed; `NightActionWrapper`
>   was extracted for reuse.
> - Combined with `sportsNightAuthority` (every living mafia acts) + the P4-T2
>   `StartSportsMafiaPhaseButton` (opens the window), the full loop works: start
>   → all mafia pick privately → window closes → host Finish → dawn unanimity.
> - Exposed `mafiaTargetWindowActive`/`StartedAt` on the client night-session
>   types (per-mafia selections stay server-private). Pinned by the
>   `mafiaNightModel` registry assertion; full suite 418. Japanese path preserved
>   verbatim (single-authority hook + view reproduce the prior behavior).
>
> **Remaining before Sports is playable:** (1) the visible 5s countdown for the
> Sports `mafia_chooses_target` — `PHASE_TIMERS` is a flat shared map (shows the
> Japanese 20s); the window is server-enforced regardless, so this is a cosmetic
> per-variant-timer follow-up. (2) the 30s banned-speaker timer (P3-T3 UI side).
> (3) **Phase 5** (un-filter in `CreateGameModal`, ship unrated).
> **Not yet visually QA'd** — the interactive night flow is logic-guarded (tsc +
> registry test) but a live multiplayer run is still needed to confirm the UX.

### Phase 5 — Enable + calibrate

| ID | Task | Files | Status | Commit |
| --- | --- | --- | --- | --- |
| P5-T1 | Un-filter `sports_mafia` in `CreateGameModal` (only `city_mafia` stays hidden — no ruleset yet) | `components/modals/CreateGameModal.tsx` | ✅ | working tree |
| P5-T2 | Ship **unrated** first (absent from `RATING_CONFIG` → ELO skipped) | `convex/lib/constants.ts` (`RATING_CONFIG`) | ✅ (no-op — already absent; consumers guard `undefined`) | working tree |
| P5-T3 | Add Sports `RATING_CONFIG` + E-table after ~200 decided games | `convex/lib/constants.ts` | 🔵 (deferred by design) | |

> **P5-T1 + P5-T2 landed (working tree, uncommitted):** `sports_mafia` is now
> **creatable, shipping unrated.**
> - **P5-T1:** the `CreateGameModal` game-type filter drops only `city_mafia`
>   now; `sports_mafia` shows in the dropdown. Server-side, `maxPlayers` is
>   already derived from `GAME_TYPE_MAX_PLAYERS[gameType]` (Sports → 10), the
>   schema validator + create path accept `sports_mafia`, and the i18n labels
>   exist in `en`/`ka` — so no other create-path change was needed.
> - **P5-T2:** already satisfied by omission — `RATING_CONFIG` has no
>   `sports_mafia` key, and every consumer guards the `undefined`
>   (`playerRatings` `?.start ?? 1000` / `annulGameLog` "undefined for unrated"),
>   so a finished Sports game archives with zero ELO change, exactly like an
>   unrated type. Nothing to change.
>
> **The refactor's core goal is met: two variants behind stable interfaces,
> Sports live + playable, Japanese byte-for-byte unchanged** (418-test suite,
> `tsc` clean). **Ship-blocker before real players:** the Sports UI has **not**
> been visually QA'd in a live multiplayer room — the interactive night flow,
> the 10-seat ring proportions, and the Sports center-panel sizing are all
> logic-guarded only. Recommend a live smoke test (host + ≥3 clients) before
> announcing. Cosmetic follow-ups still open: the visible 5s `mafia_chooses_target`
> countdown (per-variant `PHASE_TIMERS`) and the 30s banned-speaker timer (P3-T3
> UI side).

### Phase 6 — Post-QA fixes (bugs found in the first live Sports run)

> The first live Sports game (2026-07-16) surfaced two wiring gaps the
> logic-only suite couldn't catch: the card-picking flow and the host
> night-actions display were still hardcoded to Japanese. Both are now
> dispatched through the registries (backend `getGameDefinition`, frontend
> `ruleset`), matching the §8 "no `gameType` branching in shared units" rule.

| ID | Task | Files | Guarding test | Status | Commit |
| --- | --- | --- | --- | --- | --- |
| P6-T1 | **Card deck by variant.** `cardPicking.start` dealt `JAPANESE_MAFIA_ROLE_DISTRIBUTION` for **every** game, so Sports players drew SHOGUN/DOCTOR/YAKUZA. Now the deck + deck-size cap come from `getGameDefinition(game.gameType).roleDistribution` (Sports → the 10-card DON/2×MAFIA/DETECTIVE/6×CITIZEN deck; Japanese → the same 12-card deck, unchanged). This completes the seam the plan already documented (game-types.md §L203/L232) but left unwired. The legacy (now UI-unwired) `sessions.assignRandomRoles` deal path got the same fix for defense-in-depth. | `convex/game/cardPicking.ts`, `convex/game/sessions.ts` | `gameEngine.test.ts` "card-picking — start" (Japanese 12-deck assertions unchanged + new "deals the SPORTS deck" case) | ✅ | working tree |
| P6-T2 | **Sports night-actions display.** `NightActionsDisplay` was Japanese-only (keyed on `GAME_PHASES[8..14]` + the single-authority `mafiaTarget`/`yakuzaTarget`/`healedPlayer` scalars). It is now a pure dispatch boundary rendering `ruleset.nightActionsDisplay`. New `UiRuleset.nightActionsDisplay` renderer: Japanese moved **verbatim** into `src/game/japanese/nightActionsDisplay.tsx`; Sports (`src/game/sports/nightActionsDisplay.tsx`) shows one pill per living mafia (`#seat → #target`, or `-` while pending) from a NEW **host-only** query `sportsNightPhase.getHostSelections` (per-mafia picks stay private to everyone else, §5.4). | `src/components/game/NightActionsDisplay.tsx`, `src/game/{core/types,japanese/nightActionsDisplay,sports/nightActionsDisplay}`, both rulesets, `convex/game/sportsNightPhase.ts`, `convex/refs/game.ts` | `gameEngine.test.ts` new "getHostSelections … host only" case; `uiRegistry.test.ts` green (additive field) | ✅ | working tree |

> **Verification:** `tsc` clean, **421 tests** (was 419; +2 additive cases — a
> Sports-deck card-picking assertion and a `getHostSelections` host-only
> assertion). No existing assertion changed → Japanese byte-for-byte unchanged.
> Still needs a live multiplayer smoke test to confirm the Sports night-actions
> strip renders as expected in the host UI.

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
