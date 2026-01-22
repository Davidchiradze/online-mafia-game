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
16. **day_phase** - Day discussion phase, everyone can see everyone
17. **nominated_players_speak** - Nominated players give 30-second self-justification in nomination order
18. **voting** - Players vote to eliminate someone
19. **repeat** - Cycle back to night_phase (if game continues)
20. **end_game** - Game ends, win condition met

## Role-Based Visibility

Visibility rules determine who can see whom during each phase. See `src/lib/game/visibility.ts` for the complete implementation.

### Key Rules

- **Host always sees everyone** (game moderator)
- **Night phases**: No one sees anyone (except host)
- **Team meetings**: Only team members see each other
- **Day phases**: Everyone sees everyone
- **Role-specific phases**: Only that role (and host) can see

### Visibility Function

```typescript
canSeeParticipant(
  viewerRole: Role,
  targetRole: Role,
  gamePhase: GamePhase | null,
  isViewerHost: boolean,
  isTargetHost: boolean
): boolean
```

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

- Mafia + Don + Right Hand ≥ Citizens + Detective + Doctor + Yakuza + Shogun

**Citizens win** when:

- All Mafia, Don, and Right Hand are eliminated

**Yakuza wins** when:

- Yakuza + Shogun ≥ All other players

## Data Model

### Games Table

- `id` - UUID
- `code` - Unique game code
- `name` - Game name
- `host_id` - User ID of host
- `game_status` - `not_started` | `playing` | `finished`
- `game_type` - `traditional` | `city_mafia` | `japanese_mafia`
- `max_players` - Maximum players (10 or 12)
- `current_players` - Current player count

### Game Players Table

- `id` - UUID
- `game_id` - Foreign key to games
- `player_id` - Foreign key to profiles
- `role` - Player's role (null until assigned)
- `is_alive` - Whether player is alive
- `seat_number` - Seat position (1-12)
- `state` - Player state (optional)
- `fouls` - Number of fouls

### Game Sessions Table

- `id` - UUID
- `game_id` - Foreign key to games
- `game_phase` - Current game phase
- `is_finished` - Whether game is finished
- `nominated_players` - Array of seat numbers nominated for voting
- `attempt_to_kill_players` - Array of seat numbers targeted for kill
- `healed_players` - Array of seat numbers healed

## Role Filtering (Security)

**Critical**: Role information must be filtered server-side based on team relationships.

- **Teammates** can always see each other's roles
- **Non-teammates** cannot see roles (except host)
- **Host** can see all roles

See `src/lib/utils/filterPlayerRoles.ts` for implementation.

## Constants

All game constants are defined in `src/lib/constants/game.ts`:

- `GAME_PHASES` - Array of all game phases
- `JAPANESE_MAFIA_ROLES` - Array of all roles
- `GAME_STATUSES` - Array of game statuses
- `GAME_TYPES` - Array of game types

**Always use these constants** instead of hardcoding strings.

## Phase Transitions

Phase transitions are controlled by host actions in `src/components/gameSession/phaseButtonsForHost/`. Each phase has:

- **Start button** - Transitions TO this phase
- **End button** - Transitions FROM this phase to the next

Example:

- `StartMafiaTargetButton` - Transitions to `mafia_chooses_target`
- `EndMafiaTargetButton` - Transitions from `mafia_chooses_target` to next phase

## Implementation Notes

1. **Server-side authority**: All phase transitions happen via server actions
2. **Real-time updates**: Phase changes trigger Supabase subscriptions
3. **Visibility logic**: Centralized in `src/lib/game/visibility.ts`
4. **Role assignment**: Random shuffle in `src/lib/gameSession/actions.ts`
5. **Seat shuffling**: Implemented in `src/lib/game/shuffleSeats.ts`
