# Japanese Mafia — Rules

> **Scope: `japanese_mafia` only.** 12 players, three factions, structured
> phase flow with role-based visibility. Sports is a separate variant with a
> separate doc ([variants/sports.md](../sports.md)); shared engine mechanism
> lives under [docs/engine/](../../engine/).
>
> Roles, decks, phase order and win outcomes are **generated** from the
> definition — see [generated/game-spec.md](../../generated/game-spec.md).
> This doc owns the parts that are not derivable: visibility rules, flow
> narrative, data model and constants.

## Overview

A structured phase-based flow in which what each player can see depends on
the current phase and their role.

## Game Types

Currently supported:

- `japanese_mafia` - 12 players — **the variant this document describes.**
- `sports_mafia` - 10 players — **built and creatable**; documented separately in
  [variants/sports.md](../sports.md) as a diff from this one. Renamed from the
  legacy `traditional`.
- `city_mafia` - reserved in the `GameType` union; **no definition registered**,
  so it cannot be created.

For how a variant is resolved at runtime rather than branched on, see
[engine/variant-architecture.md](../../engine/variant-architecture.md).

## Roles (Japanese Mafia - 12 Players)

> **Generated.** Role list, deck counts, faction mapping and which roles act
> at night come from the deck itself:
> [game-spec.md#roles](../../generated/game-spec.md#roles).
>
> The prose that used to live here said `MAFIA (3x)` and `CITIZEN (2x)`.
> The real deck is `MAFIA ×2` and `CITIZEN ×5`. That is exactly the kind of
> drift generating the table removes.

`MAFIA_RIGHT_HAND` is worth calling out: it is a real role but is **not in
the deck**. It is reached in-game when the Don promotes a `MAFIA` during
`don_chooses_right_hand`.

## Game Phases

> **Generated.** Phase order, display labels, decision timers, which roles
> are awake, and each phase's host-advance target:
> [game-spec.md#phases](../../generated/game-spec.md#phases).
> The transition graph is drawn at
> [game-spec.md#state-machine](../../generated/game-spec.md#state-machine).

Two things the table encodes that are easy to miss:

- Phases marked `server-owned` have no fixed successor — the next phase
  depends on database state, so a Convex mutation picks it.
- Most Japanese host-advances park in the shared `phase_transition` sleep
  buffer before landing on the target phase.

## Role-Based Visibility

Visibility rules determine who can see whom during each phase. See `src/shared/lib/game/visibility.ts` for the complete implementation.

### Key Rules

- **Host always sees everyone** (game moderator)
- **Night phases**: No one sees anyone (except host)
- **Team meetings**: Only team members see each other
- **Day phases**: Everyone sees everyone
- **Role-specific phases**: Only that role (and host) can see
- **Sleeping players appear dimmed**: During night phases, both the host and the awake role see sleeping players with a blur overlay -- this signals to the active player that others are asleep

### Visibility States

Participant tiles are driven by a single `VisibilityState` enum:

| State          | Meaning                                                                |
| -------------- | ---------------------------------------------------------------------- |
| `VISIBLE`      | Full video shown                                                       |
| `DIMMED`       | Video with blur overlay -- host or awake role viewing sleeping players |
| `COVERED`      | Video replaced with sleeping cover -- player cannot see this target    |
| `DEAD`         | Permanent dead overlay                                                 |
| `DISCONNECTED` | No video track / connection lost                                       |

The primary function is `getVisibilityStateWithDeath()` which accounts for game phase, roles, alive status, and game-finished state. See `src/shared/lib/game/visibility.ts` for the full implementation.

## Game Flow

### 1. Game Creation

- Host creates a game room
- Players request to join
- Host accepts/rejects join requests
- Players are assigned seat numbers

### 2. Game Start

- Host clicks "Start Game"
- Seats are shuffled (except host's seat if present)
- Game status changes to `playing`
- First game session is created

### 3. Role Assignment

- Host clicks "Start Picking Roles"
- Phase: `picking_roles` (only host can see)
- Host clicks "Confirm Roles"
- Roles are randomly assigned to players
- Phase transitions to `mafia_meet`

### 4. Night Phases

- Mafia meets and chooses target
- Don checks for Detective
- Right Hand checks for Yakuza
- Yakuza meets and chooses target
- Detective checks for Mafia
- Doctor heals a player

### 5. Day Phase

- Everyone wakes up
- Host announces who died (if any)
- Players discuss and vote
- Player with most votes is eliminated
- Check win conditions

### 6. Win Conditions

> **Generated.** Complete decision table — every reachable alive-roster, in
> both contexts: [game-spec.md#win-conditions](../../generated/game-spec.md#win-conditions).
> Rules and rationale: [win-conditions.md](./win-conditions.md).
> When the check runs: [engine/win-check-seam.md](../../engine/win-check-seam.md).
>
> ⚠️ The prose removed from here stated a **naive parity rule** (mafia win
> once they equal the rest). That is not what ships. Enumerating every
> roster shows **81 of 280 cases where parity gives the wrong answer** — most
> visibly, the real rules refuse to end the game above `N = 6` except by a
> single-faction sweep. Do not reason about this from parity.

## Data Model

### Games Table (`games`)

- `_id` - Convex auto-generated ID
- `code` - Unique game code (6 chars)
- `name` - Game name
- `hostId` - Reference to `profiles` table
- `gameStatus` - `"not_started"` | `"playing"` | `"finished"`
- `gameType` - `"sports_mafia"` | `"city_mafia"` | `"japanese_mafia"`
- `maxPlayers` - Maximum players (10 or 12)

### Game Players Table (`gamePlayers`)

- `_id` - Convex auto-generated ID
- `gameId` - Reference to `games`
- `playerId` - Reference to `profiles`
- `isAlive` - Whether player is alive
- `seatNumber` - Seat position (1-12)
- `state` - Player connection state (optional)
- `fouls` - Number of fouls
- `nickname` - Player display name

### Game Player Roles Table (`gamePlayerRoles`)

- `_id` - Convex auto-generated ID
- `gameId` - Reference to `games`
- `playerId` - Reference to `profiles`
- `role` - Player's role string

### Game Sessions Table (`gameSessions`)

- `_id` - Convex auto-generated ID
- `gameId` - Reference to `games`
- `gamePhase` - Current game phase
- `isFinished` - Whether game is finished
- `speakingOrder` - Array of seat numbers
- `currentSpeakerIndex` - Current speaker position
- `nominatedPlayers` - Array of seat numbers nominated for voting
- `currentNightNumber` - Current night round
- `phaseStartedAt` - ms epoch, stamped on every phase change; drives the per-phase decision countdown (see **Phase Timers** below)
- `finishedAt` - ms epoch, set when the game finishes; drives the "room closes in Ns" countdown in the winner banner

### Night Phase Sessions Table (`nightPhaseSessions`)

- `_id` - Convex auto-generated ID
- `gameId` - Reference to `games`
- `nightNumber` - Night round number
- `mafiaTarget` - Seat number targeted by mafia
- `yakuzaTarget` - Seat number targeted by yakuza
- `healedPlayer` - Seat number healed by doctor

### Voting Sessions Table (`votingSessions`)

- `_id` - Convex auto-generated ID
- `gameId` - Reference to `games`
- `candidates` - Array of nominated seat numbers
- `currentCandidateIndex` - Current candidate being voted on
- `votingActive` - Whether voting window is open
- `roundNumber` - Voting round number

### Votes Table (`votes`)

- `_id` - Convex auto-generated ID
- `votingSessionId` - Reference to `votingSessions`
- `voterSeat` - Seat number of voter
- `seatNumber` - Seat number voted for (optional)
- `isAutoVote` - Whether vote was auto-cast
- `isBothLeave` - Whether this is a "both leave" vote

## Phase Timers

Each non-speaking meet/decision phase shows a **visual-only** countdown so the
acting role knows how long they have to decide (e.g. mafia choosing a target,
detective checking a player). It does **not** auto-advance — the host still
clicks the phase's End button when the timer runs out.

- **Durations** live in `PHASE_TIMERS` in `src/shared/lib/constants/game.ts` (fixed
  per phase). Speaking/voting phases are intentionally excluded — they already
  have their own per-speaker timers.
- **Timestamp**: `gameSessions.update` stamps `phaseStartedAt = Date.now()`
  whenever `gamePhase` changes. All meet/decision transitions route through this
  mutation, so the stamp is centralized (not duplicated across phase buttons).
- **Who sees it**: the acting role(s) for the phase — resolved via
  `getAwakeRoles()` in `src/shared/lib/game/visibility.ts` — plus the host. **Never
  spectators.**
- **Rendering**: `<PhaseCountdown />` (in `src/features/game-room/components/phase/`) sits in the
  `PhaseTitle` area and self-gates on role/host. The countdown is computed with
  `useCountdown()` (`src/features/game-room/hooks/game/useCountdown.ts`), which is server-clock
  corrected via `useServerTime()` — see `/docs/server-time.md`. Turns red and
  pulses in the final 5 seconds.

### Room-closing countdown

After a game finishes, the winner banner shows a "Room closes in Ns" countdown
until the server's scheduled cleanup deletes the room. It counts down
`GAME_CLEANUP.DELAY_MS` from `gameSessions.finishedAt`. The client copy of
`GAME_CLEANUP.DELAY_MS` (in `src/shared/lib/constants/game.ts`) **must** match the
server copy (in `convex/lib/constants.ts`).

## Role Filtering (Security)

**Critical**: Role information must be filtered server-side in Convex queries based on team relationships.

- **Teammates** can always see each other's roles
- **Non-teammates** cannot see roles (returned as `null`)
- **Host** can see all roles

See `convex/games/core/roles.ts` (`getFiltered` query) for implementation.

## Constants

All game constants are defined in `src/shared/lib/constants/game.ts`:

- `GAME_PHASES` - Array of all game phases
- `JAPANESE_MAFIA_ROLES` - Array of all roles
- `GAME_STATUSES` - Array of game statuses
- `GAME_TYPES` - Array of game types
- `PHASE_TIMERS` - Per-phase decision countdown durations (see **Phase Timers**)

**Always use these constants** instead of hardcoding strings.

## Phase Transitions

Phase transitions are controlled by host actions in `src/features/game-room/components/phase-controls/`. Each phase has:

- **Start button** - Transitions TO this phase
- **End button** - Transitions FROM this phase to the next

Example:

- `StartMafiaTargetButton` - Transitions to `mafia_chooses_target`
- `EndMafiaTargetButton` - Transitions from `mafia_chooses_target` to next phase

## Implementation Notes

1. **Server-side authority**: All phase transitions happen via Convex mutations
2. **Real-time updates**: Phase changes automatically update all clients via reactive queries
3. **Visibility logic**: Centralized in `src/shared/lib/game/visibility.ts` (pure functions, no DB dependency)
4. **Role assignment**: Random shuffle in `convex/games/core/sessions.ts` (`assignRandomRoles`)
5. **Seat shuffling**: Implemented in `convex/games/core/sessions.ts` (`startGame`)
6. **Atomic transitions**: Convex mutations ensure phase transitions are transactional
