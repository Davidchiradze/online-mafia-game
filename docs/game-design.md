# Game Design

## Overview

This is a **Japanese Mafia** game variant with 12 players. The game follows a structured phase-based flow with role-based visibility rules.

## Game Types

Currently supported:

- `traditional` - 10 players
- `city_mafia` - 12 players
- `japanese_mafia` - 12 players (primary variant)

## Roles (Japanese Mafia - 12 Players)

1. **DON** - Mafia boss
2. **MAFIA** (3x) - Mafia members
3. **MAFIA_RIGHT_HAND** - Don's right hand (chosen by Don)
4. **SHOGUN** - Yakuza leader
5. **YAKUZA** (2x) - Yakuza members
6. **DETECTIVE** - Can check if a player is mafia
7. **DOCTOR** - Can heal a player
8. **CITIZEN** (2x) - Regular citizens

## Game Phases

The game follows this phase sequence:

1. **game_session_started** - Game begins, players can see everyone
2. **picking_roles** - Host assigns roles, only host can see
3. **mafia_meet** - Mafia team meets (Don, Mafia, Right Hand visible to each other)
4. **don_chooses_right_hand** - Don selects their right hand
5. **yakuda_shogun_meet** - Yakuza team meets (Shogun, Yakuza visible to each other)
6. **detective_meet** - Detective phase (only Detective + Host visible)
7. **doctor_meet** - Doctor phase (only Doctor + Host visible)
8. **introduction_phase** - Day begins, everyone introduces themselves
9. **night_phase** - Night falls, no one can see anyone
10. **mafia_chooses_target** - Mafia selects kill target
11. **don_checks_for_detective** - Don checks if a player is Detective
12. **right_hand_checks_for_yakuza** - Right Hand checks if a player is Yakuza
13. **yakuza_and_shogun_chooses_target** - Yakuza team selects kill target
14. **detective_checks_for_mafia** - Detective checks if a player is Mafia
15. **doctor_heals_player** - Doctor selects a player to heal
16. **farewell_speech** - Killed player(s) give farewell speech
17. **day_phase** - Day discussion phase, everyone can see everyone
18. **nominated_players_speak** - Nominated players give 30-second self-justification in nomination order
19. **voting** - Players vote to eliminate someone
20. **repeat** - Cycle back to night_phase (if game continues)
21. **end_game** - Game ends, win condition met

## Role-Based Visibility

Visibility rules determine who can see whom during each phase. See `src/lib/game/visibility.ts` for the complete implementation.

### Key Rules

- **Host always sees everyone** (game moderator)
- **Night phases**: No one sees anyone (except host)
- **Team meetings**: Only team members see each other
- **Day phases**: Everyone sees everyone
- **Role-specific phases**: Only that role (and host) can see
- **Sleeping players appear dimmed**: During night phases, both the host and the awake role see sleeping players with a blur overlay -- this signals to the active player that others are asleep

### Visibility States

Participant tiles are driven by a single `VisibilityState` enum:

| State | Meaning |
|---|---|
| `VISIBLE` | Full video shown |
| `DIMMED` | Video with blur overlay -- host or awake role viewing sleeping players |
| `COVERED` | Video replaced with sleeping cover -- player cannot see this target |
| `DEAD` | Permanent dead overlay |
| `DISCONNECTED` | No video track / connection lost |

The primary function is `getVisibilityStateWithDeath()` which accounts for game phase, roles, alive status, and game-finished state. See `src/lib/game/visibility.ts` for the full implementation.

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

**Mafia wins** when:

- Mafia + Don + Right Hand >= Citizens + Detective + Doctor + Yakuza + Shogun

**Citizens win** when:

- All Mafia, Don, and Right Hand are eliminated

**Yakuza wins** when:

- Yakuza + Shogun >= All other players

## Data Model

### Games Table (`games`)

- `_id` - Convex auto-generated ID
- `code` - Unique game code (6 chars)
- `name` - Game name
- `hostId` - Reference to `profiles` table
- `gameStatus` - `"not_started"` | `"playing"` | `"finished"`
- `gameType` - `"traditional"` | `"city_mafia"` | `"japanese_mafia"`
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

- **Durations** live in `PHASE_TIMERS` in `src/lib/constants/game.ts` (fixed
  per phase). Speaking/voting phases are intentionally excluded — they already
  have their own per-speaker timers.
- **Timestamp**: `gameSessions.update` stamps `phaseStartedAt = Date.now()`
  whenever `gamePhase` changes. All meet/decision transitions route through this
  mutation, so the stamp is centralized (not duplicated across phase buttons).
- **Who sees it**: the acting role(s) for the phase — resolved via
  `getAwakeRoles()` in `src/lib/game/visibility.ts` — plus the host. **Never
  spectators.**
- **Rendering**: `<PhaseCountdown />` (in `src/components/game/`) sits in the
  `PhaseTitle` area and self-gates on role/host. The countdown is computed with
  `useCountdown()` (`src/hooks/game/useCountdown.ts`), which is server-clock
  corrected via `useServerTime()` — see `/docs/server-time.md`. Turns red and
  pulses in the final 5 seconds.

### Room-closing countdown

After a game finishes, the winner banner shows a "Room closes in Ns" countdown
until the server's scheduled cleanup deletes the room. It counts down
`GAME_CLEANUP.DELAY_MS` from `gameSessions.finishedAt`. The client copy of
`GAME_CLEANUP.DELAY_MS` (in `src/lib/constants/game.ts`) **must** match the
server copy (in `convex/lib/constants.ts`).

## Role Filtering (Security)

**Critical**: Role information must be filtered server-side in Convex queries based on team relationships.

- **Teammates** can always see each other's roles
- **Non-teammates** cannot see roles (returned as `null`)
- **Host** can see all roles

See `convex/gamePlayerRoles.ts` (`getFiltered` query) for implementation.

## Constants

All game constants are defined in `src/lib/constants/game.ts`:

- `GAME_PHASES` - Array of all game phases
- `JAPANESE_MAFIA_ROLES` - Array of all roles
- `GAME_STATUSES` - Array of game statuses
- `GAME_TYPES` - Array of game types
- `PHASE_TIMERS` - Per-phase decision countdown durations (see **Phase Timers**)

**Always use these constants** instead of hardcoding strings.

## Phase Transitions

Phase transitions are controlled by host actions in `src/components/gameSession/phaseButtonsForHost/`. Each phase has:

- **Start button** - Transitions TO this phase
- **End button** - Transitions FROM this phase to the next

Example:

- `StartMafiaTargetButton` - Transitions to `mafia_chooses_target`
- `EndMafiaTargetButton` - Transitions from `mafia_chooses_target` to next phase

## Implementation Notes

1. **Server-side authority**: All phase transitions happen via Convex mutations
2. **Real-time updates**: Phase changes automatically update all clients via reactive queries
3. **Visibility logic**: Centralized in `src/lib/game/visibility.ts` (pure functions, no DB dependency)
4. **Role assignment**: Random shuffle in `convex/game/sessions.ts` (`assignRandomRoles`)
5. **Seat shuffling**: Implemented in `convex/game/sessions.ts` (`startGame`)
6. **Atomic transitions**: Convex mutations ensure phase transitions are transactional
