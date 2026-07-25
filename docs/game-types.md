# Game Types — Multi-Variant Architecture

> Status: **Design + refactor plan.** The rename `traditional → sports_mafia`
> (Phase 0) is **done**. A characterization test suite pinning current Japanese
> behavior is **in place** (`tests/`, see [testing.md](./testing.md)) to serve
> as the Phase-1 regression oracle. The variant-abstraction refactor
> (Phases 1–5) is **planned, not yet built.** This document is the source of
> truth for how the codebase should evolve to support more than one game variant
> without destabilizing the working Japanese game.
>
> For the concrete Sports Mafia ruleset, see [sports-mafia.md](./sports-mafia.md).
> For the (Japanese) game rules this all descends from, see
> [game-design.md](./game-design.md) and
> [game-end-conditions.md](./game-end-conditions.md).

## 1. The problem

The app was built for a single variant — **Japanese Mafia (12 players)** — and
the ruleset is **hardwired end to end**. There is **no dispatch layer**: nothing
in the live game-room render path or the phase engine consults `gameType`.
`gameType` is read only for labels, seat counts, filters, and ELO namespacing.

Everything below is Japanese-specific and must be made variant-aware before a
second variant can exist safely:

### Backend (`convex/`)

| Concern              | Location                                                                                             | Japanese assumption baked in                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Phase list           | `lib/constants.ts` → `GAME_PHASES` (also duplicated in `src/lib/constants/game.ts`)                  | 22 phases in the exact Japanese order; phases are referenced positionally (`GAME_PHASES[3]` etc.) |
| Role deck            | `lib/constants.ts` → `JAPANESE_MAFIA_ROLE_DISTRIBUTION`                                              | 12 cards incl. SHOGUN/YAKUZA/DOCTOR                                                               |
| Teams / factions     | `lib/constants.ts` → `MAFIA_TEAM_ROLES`, `YAKUZA_TEAM_ROLES`; `lib/roles.ts` → `roleToFaction`       | 3 factions (mafia/yakuza/citizens)                                                                |
| Night kill model     | `game/nightPhase.ts` → `getMafiaKillAuthority` / `getYakuzaKillAuthority` / `getDoctorHealAuthority` | single "kill authority" priority DON>RH>MAFIA; Yakuza + Doctor exist                              |
| Kill resolution      | `game/farewellSpeech.ts` → `startFarewellSpeech`                                                     | reads `mafiaTarget` / `yakuzaTarget` / `healedPlayer` (single scalars)                            |
| Win detection        | `lib/winConditions.ts` → `describeWin` / `decideWinner`                                              | 3-faction tables, N=5 Doctor+Yakuza context exception, Yakuza-clan sweeps                         |
| Phase transitions    | `lib/phaseTransitions.ts` → `enterNightPhase` / `enterDayPhase`                                      | correct as generic seams, but the win-check they call is Japanese                                 |
| Role deal            | `game/sessions.ts` → `assignRandomRoles`; `game/cardPicking.ts` → `start`                            | deck = `JAPANESE_MAFIA_ROLE_DISTRIBUTION`; deck-size cap = its length                             |
| Right-hand promotion | `game/roles.ts` → `promoteToRightHand`                                                               | Japanese-only mechanic                                                                            |
| Night session shape  | `tables/nightPhaseSessions.ts`                                                                       | `mafiaTarget` / `yakuzaTarget` / `healedPlayer` scalars                                           |

### Frontend (`src/`)

| Concern               | Location                                                                                                 | Japanese assumption baked in                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Phase → host buttons  | `components/game/GamePhaseControls.tsx`                                                                  | one big `switch (gamePhase)`; no `gameType` branch                                                      |
| Host phase buttons    | `components/gameSession/phaseButtonsForHost/*`                                                           | each button hardcodes the next `GAME_PHASES[n]` — the transition graph lives in the buttons             |
| Visibility            | `lib/game/visibility.ts`                                                                                 | `canSeeParticipant` / `getAwakeRoles` / `isNightActivityPhase` are phase+role literal chains            |
| Night authority       | `hooks/game/useNightActionAuthority.ts`, `useRightHandPromotion.ts`, `useNightPhaseReadiness.ts`         | DON>RH>MAFIA priority, Yakuza/Doctor/Shogun rules                                                       |
| Seat geometry         | `components/game/PlayerCircle.tsx`, `hooks/game/useSeatShuffleAnimation.ts`                              | fixed 4×4 grid; seats 1–13 mapped to explicit cells                                                     |
| Role labels           | `lib/game/roleDisplay.ts`, `lib/utils/roleDisplay.ts`, `components/participant/ParticipantRoleBadge.tsx` | iterate `JAPANESE_MAFIA_ROLES`                                                                          |
| `maxPlayers` plumbing | `components/liveKit/LiveKitTestComponent.tsx`, `components/game/SpectatorView.tsx`                       | **render `<PlayerCircle>` without `maxPlayers`** → defaults to 12 for every game (a latent bug, see §6) |

### Consequence

You cannot add a variant by "just adding a `gameType`." A second variant with
different phases, roles, night mechanics, win conditions, and player count would
either fork half the codebase or thread `if (gameType === ...)` through dozens
of files — both of which are exactly the fragility the user flagged.

## 2. The design: a Game Definition registry

Introduce a single abstraction — a **`GameDefinition`** — that declares
everything variant-specific behind stable interfaces. Shared _engine_ code
(voting mechanics, speaking order, fouls, LiveKit, presence, card-picking,
archiving, ELO, broadcasts) stays **one implementation**. Only the variant
_rules_ are swapped, chosen once per game by `game.gameType`.

```
                       game.gameType
                            │
                            ▼
                 getGameDefinition(gameType)   ← registry
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
  JAPANESE_DEF         SPORTS_DEF          CITY_DEF (future)
        │                   │
        └─────── implements GameDefinition ───────┘
                            │
   consumed by shared engine + shared UI (no gameType literals)
```

### 2.1 The interface (backend)

A definition is **pure data + pure functions** (no DB access), so it can be
imported by both Convex functions and React with no server coupling. Sketch:

```ts
// convex/games/core/types.ts  (shared, imported by every definition)
export type GameDefinition = {
  id: GameType; // "japanese_mafia" | "sports_mafia" | ...
  seatCount: number; // seated non-host players (12 | 10)

  roles: readonly Role[]; // every role this variant can assign
  roleDistribution: readonly Role[]; // the deck dealt at picking time (len === seatCount)
  factions: readonly Faction[]; // ["mafia","yakuza","citizens"] | ["mafia","citizens"]
  roleToFaction: (role: Role) => Faction;
  teams: Record<string, readonly Role[]>; // who meets/sees together (mafia team, yakuza team…)

  phases: readonly Phase[]; // ordered phase ids for THIS variant
  /** Given the current phase + game state, what phase is "next" on the host's
   *  advance action. Replaces the transition literals hardcoded in the phase
   *  buttons. Pure; the mutation applies the result. */
  nextPhase: (phase: Phase, ctx: PhaseContext) => Phase | null;

  night: NightModel; // how kills are chosen AND resolved (see §2.3)

  /** Returns the decided outcome or null to continue. Generalizes
   *  decideWinner; each variant ships its own tables. */
  decideWinner: (aliveRoles: Role[], context: WinContext) => Outcome | null;

  visibility: VisibilityRuleset; // phase+role → awake roles / can-see (see §2.4)

  timers: Partial<Record<Phase, number>>; // per-phase decision countdowns

  flags: {
    hasIntroductionPhase: boolean; // Japanese: true, Sports: false
    hasFarewellSpeech: boolean;
    firstDaySingleNomineeSkipsToNight: boolean; // Sports day-1 rule
    // …variant switches that the shared engine reads
  };
};
```

Key point: **phase ids stay strings, referenced by name, never by index.** The
positional `GAME_PHASES[3]` pattern in the phase buttons is the single biggest
source of coupling and must be replaced by `definition.nextPhase(...)`.

### 2.2 The registry

```ts
// convex/games/registry.ts
import { JAPANESE_DEFINITION } from "./japanese/definition";
import { SPORTS_DEFINITION } from "./sports/definition";

const DEFINITIONS = {
  japanese_mafia: JAPANESE_DEFINITION,
  sports_mafia: SPORTS_DEFINITION,
} as const;

export function getGameDefinition(gameType: string): GameDefinition {
  const def = DEFINITIONS[gameType as keyof typeof DEFINITIONS];
  if (!def) throw new ConvexError(`No game definition for "${gameType}"`);
  return def;
}
```

The frontend gets a **parallel** registry of UI rulesets (phase→controls map,
visibility, night-authority, seat layout) keyed the same way, resolved once in
`gameRoomContext` from `gameData.gameType` and passed down via context.

### 2.3 The night model — the deepest divergence

Japanese and Sports resolve night kills completely differently, so `NightModel`
is an interface, not a shared function:

- **Japanese** (`single-authority`): one kill authority per team picks one
  target; Doctor can save; two teams can kill. State: scalar
  `mafiaTarget` / `yakuzaTarget` / `healedPlayer`.
- **Sports** (`unanimous-vote`): every living mafia independently picks within a
  5s window; kill happens **iff all living mafia chose the same target**;
  otherwise no kill; a lone mafia may abstain. State: an **array** of per-mafia
  selections. No Doctor.

The night session table must therefore stop being Japanese-shaped. Two options:

1. **Add variant-specific optional fields** to `nightPhaseSessions` (e.g.
   `mafiaTargetSelections: {mafiaSeat, targetSeat}[]`) alongside the existing
   scalars. Lowest-risk; the shared cleanup/query code is unchanged. Preferred
   for the first extra variant.
2. **Generalize** to a `nightActions` sub-document keyed by action type. Cleaner
   long-term; larger blast radius. Defer until a 3rd variant justifies it.

The `NightModel` owns: which roles act (`getActingRoles`), how a selection is
recorded (`recordSelection`), and how the night **resolves to killed seats**
(`resolveKills`) — the shared `startFarewellSpeech` calls `resolveKills` instead
of reading scalars directly.

### 2.4 Visibility

`src/lib/game/visibility.ts` becomes a thin dispatcher that asks the variant's
`VisibilityRuleset` two questions the rest of the UI already needs:
`getAwakeRoles(phase)` and `canSeeParticipant(viewer, target, phase, state)`.
The Japanese literal chains move verbatim into `japanese/visibility.ts`; Sports
ships a smaller ruleset (no doctor/yakuza phases). The `VisibilityState`
enum and `getVisibilityStateWithDeath` layering stay shared.

## 3. Directory structure (target)

Physically separate the variants, per the requirement that each type's phases
and components live in their own folders so a new variant "does not cause bugs"
in the working one.

```
convex/
  games/
    core/                     # variant-AGNOSTIC engine (moved from game/ + lib/)
      types.ts                # GameDefinition, NightModel, VisibilityRuleset, …
      phaseTransitions.ts     # enterNightPhase/enterDayPhase (call def.decideWinner)
      speakingOrder.ts        # unchanged pure logic
      voting.ts               # shared voting mechanics
      fouls.ts                # shared foul counting (+ variant flags)
      cardPicking.ts          # deck comes from def.roleDistribution
      archive.ts              # archiveGameLog, ELO (def.roleToFaction)
    japanese/
      definition.ts  phases.ts  roles.ts  nightModel.ts  winConditions.ts  visibility.ts
    sports/
      definition.ts  phases.ts  roles.ts  nightModel.ts  winConditions.ts  visibility.ts
    registry.ts               # gameType → GameDefinition

src/
  game/
    core/                     # shared UI: PlayerCircle (parameterized), speaking/voting/foul controls
    japanese/
      phaseControls.tsx       # phase→button map for this variant
      visibility.ts  nightAuthority.ts  constants.ts  seatLayout.ts
    sports/
      phaseControls.tsx
      visibility.ts  nightAuthority.ts  constants.ts  seatLayout.ts
    registry.ts               # gameType → UI ruleset
```

The existing `convex/game/*` and `convex/lib/*` are migrated into
`convex/games/core` + `convex/games/japanese` during Phase 1 (a **pure move**,
no behavior change). Convex's flat function namespace means moving files changes
`api.*` paths — do this in one mechanical commit and update `convex/refs/*`.

## 4. Shared vs variant-specific — the split

**Stays shared (one implementation, reads the definition):**

- Card-picking flow & watchdog — deck = `def.roleDistribution`; the auto-pick,
  turn timer, and OCC logic are variant-agnostic.
- Speaking order & timers (`computeSpeakingOrder`, `getNextSpeaker`), day-speech
  and self-justification speaking controls.
- Voting mechanics (windows, auto-vote on last candidate, tie-break, both-leave)
  — the **flow** is shared; per-variant _rules_ (day-1 single-nominee handling)
  are flags on the definition.
- Fouls (counting, foul-speak 5s, elimination on the Nth) — the threshold and
  the **speaking-ban consequence** are variant flags.
- Farewell speech flow; phase-transition helpers; LiveKit; presence; broadcasts;
  game logs + ELO; admin analytics; match history; leaderboard.

**Becomes variant-specific (lives in the definition / variant folder):**

- Phase list and the transition graph (`nextPhase`).
- Role set, deck, factions, `roleToFaction`, team membership.
- Night model (who acts, how selections record, how kills resolve).
- Win detection.
- Visibility ruleset + awake roles.
- Host phase-controls map (which button per phase).
- Seat layout geometry (12-ring vs 10-ring).
- Special mechanics: right-hand promotion (Japanese), 3rd-foul speaking ban
  (Sports), day-1 single-nominee rule (Sports).

## 5. Phased refactor plan

> The live, task-by-task checklist that operationalizes this plan — with the
> guarding test for each task and status boxes to flip as work lands — is
> [game-types-refactor-tasks.md](./game-types-refactor-tasks.md).

Each phase is independently shippable and leaves the Japanese game fully working.

- **Phase 0 — Rename (DONE).** `traditional → sports_mafia` across the schema
  validator, `RATING_CONFIG`, `refs/*`, frontend constants, i18n (`en`/`ka`),
  and docs. The legacy `"traditional"` literal was dropped outright — there are
  no `traditional` rows in any deployment, so no data migration is needed (see
  §7). `sports_mafia` is defined but **not creatable** (filtered out in
  `CreateGameModal`).

- **Phase 1 — Introduce the abstraction, extract Japanese (no behavior change).**
  Define `GameDefinition` + the `NightModel` / `VisibilityRuleset` interfaces.
  Move Japanese constants/logic into `convex/games/japanese/*` and
  `src/game/japanese/*` and wire `getGameDefinition("japanese_mafia")`. Replace
  the positional `GAME_PHASES[n]` transitions in the phase buttons with
  `definition.nextPhase(...)`. **Ship it; the Japanese game must be byte-for-byte
  equivalent.** This is the biggest, most careful step and the one that "makes
  the new implementation safe."

- **Phase 2 — Author the Sports definition (data only).** Roles, deck, 2
  factions, phase list, `decideWinner` (parity rule), timers, flags. Unit-test
  `decideWinner` against the tables in [sports-mafia.md](./sports-mafia.md).
  Nothing wired to the UI yet.

- **Phase 3 — Sports night model + new mechanics.** Add
  `mafiaTargetSelections` to `nightPhaseSessions`; implement the unanimous-vote
  `NightModel` (5s window like the voting window; `resolveKills` = unanimity).
  Implement the 3rd-foul speaking ban and the day-1 single-nominee rule as
  shared-engine behavior gated on definition flags.

- **Phase 4 — Frontend dispatch + geometry.** `gameRoomContext` resolves the UI
  ruleset from `gameData.gameType`. `GamePhaseControls` renders from the
  variant's phase→controls map. `visibility.ts` and night-authority hooks
  dispatch to the ruleset. **Fix the `maxPlayers` plumbing** (§6) and add a
  10-seat layout for Sports.

- **Phase 5 — Enable + calibrate.** Un-filter `sports_mafia` in
  `CreateGameModal`. Ship **unrated** first (absent from `RATING_CONFIG` → ELO
  skipped, exactly as today), then add its own config + E-table once ~200
  decided games exist (see [ranking-system.md](./ranking-system.md) §9).

## 6. Latent bug to fix in Phase 4: `maxPlayers` is never plumbed

`PlayerCircle` takes `maxPlayers` (default `12`) but both call sites —
`LiveKitTestComponent.tsx` and `SpectatorView.tsx` — render it **without the
prop**, so every game renders a 12-seat ring regardless of `game.maxPlayers`.
Today all creatable games are 12-player Japanese, so it is invisible. A 10-player
Sports game would render two phantom empty seats and mis-place the host slot
(`hostSlotKey = maxPlayers + 1`). Additionally, `useSeatShuffleAnimation`'s
`gridPositionForSeat` hardcodes seats 1–13 into a 4×4 grid. Phase 4 must:

1. Thread `maxPlayers` from `useGameRoom()` into both `<PlayerCircle>` renders.
2. Make the seat layout come from the variant's `seatLayout` (a 10-seat ring +
   host for Sports, the current 12-ring for Japanese) instead of a hardcoded
   switch.

## 7. Data & migration notes

- **Legacy `"traditional"` rows — none exist, literal removed.** The type was
  never creatable in the UI, and there are no `traditional` rows in any
  deployment, so the literal was dropped from the `gameType` validator outright
  (no data migration). Convex validates existing documents against the schema at
  deploy time: if a stray `traditional` row ever did exist, the deploy would
  **fail with a clear "document does not match validator" error** (nothing is
  corrupted) — that error is the signal to reintroduce a one-shot rename
  migration (recoverable from git history) before retrying.
- **`winMethod` snapshot.** `tables/gameLogs.ts` → `winMethodValidator` carries
  `yakuzaAlive` / `shogunAlive`. Sports has neither faction; it should populate
  them `false` (backward-compatible) until `winMethod` is generalized. The
  `gameSessions.winner` union already includes `citizens` and `mafia`, which are
  the only outcomes Sports emits — no schema change needed there.
- **ELO ladders are per-`gameType`** (`playerRatings.by_gameType_rating`), so a
  Sports ladder is automatically separate from Japanese once a `RATING_CONFIG`
  entry is added. No cross-contamination.

## 8. Guardrails

- **No `gameType` string literals** in shared engine or shared UI after Phase 1
  — only the registry and the definitions may name a variant.
- **Phases by name, never by index.** Delete every `GAME_PHASES[n]` reference in
  favor of `definition.phases` / `definition.nextPhase`.
- **Definitions are pure.** No `ctx.db` in a definition — they take state in and
  return decisions out, so the same module is safe on client and server and is
  unit-testable in isolation.
- **Japanese is the regression oracle.** Every phase of the refactor is
  validated by the Japanese game behaving identically; only then is Sports wired
  in. This is enforced concretely by the characterization suite in `tests/`
  (see [testing.md](./testing.md)): when modules move, update only the import
  paths — never the assertions. A forced assertion change is a real regression,
  not a refactor. CI runs it on every push.
