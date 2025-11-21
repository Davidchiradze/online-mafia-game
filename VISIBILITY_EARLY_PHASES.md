# Early Game Phases - Visibility Handling

## Overview

The visibility system is designed to handle game phases where players **don't have roles assigned yet**. This document explains how the system gracefully manages these early phases.

## Phases Without Roles

### 1. `game_session_started`

**When**: Right after the game session begins, before role assignment  
**Role Status**: ❌ No roles assigned yet  
**Visibility Rule**: Everyone sees everyone  
**Cover Message**: ⏳ (hourglass - waiting)  
**Purpose**: Players can see each other while waiting for host to start role assignment

```typescript
// Example game flow
StartGame() → game_session_started (no roles)
```

### 2. `picking_roles`

**When**: Host is actively assigning roles to players  
**Role Status**: ❌ Roles being assigned (transitional)  
**Visibility Rule**: Only host sees everyone, others see covers  
**Cover Message**: 🎭 (mask - role selection)  
**Purpose**: Host can see all players while assigning roles; players can't see each other to prevent revealing who gets which role

```typescript
// Example game flow
game_session_started → picking_roles (host assigns) → roles assigned
```

## How It Works Without Roles

### Phase-Based Logic (Not Role-Based)

For these early phases, the visibility system uses **phase-only logic**:

```typescript
// From src/lib/game/visibility.ts

// No role checks needed - pure phase logic
if (gamePhase === "game_session_started") {
  return true; // Everyone sees everyone
}

if (gamePhase === "picking_roles") {
  return isViewerHost; // Only host sees everyone
}
```

### Null Role Safety

The hook is designed to handle `null` roles gracefully:

```typescript
// From src/hooks/useParticipantVisibility.ts

const viewerRole = useMemo(() => {
  // During early phases, role will be null - this is expected
  if (!gameSessionState?.playerData) return null;
  return (gameSessionState.playerData.role as Role) || null;
}, [gameSessionState]);

// Visibility function accepts null roles
canSeeParticipant(
  viewerRole, // Can be null during early phases
  targetRole, // Can be null during early phases
  gamePhase, // Phase determines visibility
  isViewerHost, // Host status works independently of roles
  isTargetHost // Host status works independently of roles
);
```

## Game Flow Timeline

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Lobby (Pre-Game)                                         │
│    • No game session                                        │
│    • No roles                                               │
│    • Everyone sees everyone                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. game_session_started                                     │
│    • Game session created                                   │
│    • ❌ No roles assigned yet                              │
│    • ✅ Everyone sees everyone                             │
│    • Purpose: Preparation, team formation                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. picking_roles                                            │
│    • Host assigns roles                                     │
│    • ❌ Roles in transition                                │
│    • ✅ Only host sees everyone                            │
│    • Cover: 🎭                                              │
│    • Purpose: Secret role assignment                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Role-Based Phases                                        │
│    • Roles now assigned                                     │
│    • ✅ Role-based visibility starts                       │
│    • Examples: mafia_meet, detective_check, etc.            │
└─────────────────────────────────────────────────────────────┘
```

## Database State During Early Phases

### game_session_started

```sql
-- game_players table
SELECT * FROM game_players WHERE game_id = 'game-123';

| id | game_id | player_id | role | is_alive |
|----|---------|-----------|------|----------|
| 1  | game-123| user-1    | NULL | NULL     |
| 2  | game-123| user-2    | NULL | NULL     |
| 3  | game-123| user-3    | NULL | NULL     |
```

### picking_roles (during assignment)

```sql
-- Roles being updated one by one
| id | game_id | player_id | role      | is_alive |
|----|---------|-----------|-----------|----------|
| 1  | game-123| user-1    | "DON"     | true     |  ← Just assigned
| 2  | game-123| user-2    | NULL      | NULL     |  ← Not yet assigned
| 3  | game-123| user-3    | NULL      | NULL     |  ← Not yet assigned
```

### After picking_roles

```sql
-- All roles assigned
| id | game_id | player_id | role        | is_alive |
|----|---------|-----------|-------------|----------|
| 1  | game-123| user-1    | "DON"       | true     |
| 2  | game-123| user-2    | "DETECTIVE" | true     |
| 3  | game-123| user-3    | "CITIZEN"   | true     |
```

## LiveKit Metadata During Early Phases

### Before Role Assignment

```json
// Participant metadata (or empty)
{
  "seatIndex": 1
  // No "role" field yet
}
```

### After Role Assignment

```json
// Participant metadata with role
{
  "seatIndex": 1,
  "role": "MAFIA"
}
```

## Implementation Details

### No Special Handling Required

The beauty of this design is that **you don't need to do anything special** for early phases:

1. ✅ System checks phase first
2. ✅ Early phases use phase-only logic
3. ✅ Null roles are safely handled
4. ✅ Role-based logic only kicks in after roles are assigned

### What You Need to Do

As a developer integrating this system:

1. **During `game_session_started`**:
   - Nothing! Everyone can see everyone by default
2. **During `picking_roles`**:

   - Host UI can assign roles
   - Non-host players will see covers (🎭)
   - Update database: `UPDATE game_players SET role = 'MAFIA' WHERE ...`
   - Update metadata: `updateParticipantMetadataWithRole(gameId, userId, role)`

3. **After `picking_roles`**:
   - Transition to next phase (e.g., `mafia_meet`)
   - System automatically uses role-based visibility

## Testing Early Phases

### Test: game_session_started

```typescript
// Setup
gamePhase = "game_session_started"
roles = null (for all players)

// Expected behavior
✅ Player 1 sees Player 2 (no cover)
✅ Player 2 sees Player 1 (no cover)
✅ Host sees everyone (no cover)
✅ No covers shown (everyone visible)
```

### Test: picking_roles

```typescript
// Setup
gamePhase = "picking_roles"
roles = null or partially assigned

// Expected behavior
✅ Host sees everyone (no cover)
❌ Player 1 sees cover on Player 2 (🎭)
❌ Player 2 sees cover on Player 1 (🎭)
✅ Cover message: 🎭
```

## Common Questions

### Q: What if roles are partially assigned during `picking_roles`?

**A**: The system uses phase-only logic during `picking_roles`, so it doesn't matter if some players have roles and others don't. Only the host can see everyone regardless.

### Q: What happens if we skip `game_session_started`?

**A**: The system will still work. If you go directly to `picking_roles`, the visibility rules will apply immediately.

### Q: Can we change the visibility rules for these phases?

**A**: Yes! Edit `canSeeParticipant()` in `src/lib/game/visibility.ts`:

```typescript
// Example: Make everyone see everyone during picking_roles
if (gamePhase === "picking_roles") {
  return true; // Instead of: return isViewerHost;
}
```

### Q: What if a player disconnects during `picking_roles`?

**A**: The visibility system only controls UI display. Reconnection logic is handled separately by LiveKit and your connection handlers.

## Edge Cases Handled

✅ **Partial role assignment**: System doesn't rely on all players having roles  
✅ **Null roles**: Safely handled throughout the system  
✅ **Host changes during early phases**: Host status is checked independently  
✅ **Phase skipping**: Works regardless of phase order  
✅ **Reconnection**: Visibility recalculated on every render with current state

## Summary

The visibility system is **robust and flexible** for early game phases:

- 🎯 **No special code needed** for null roles
- 🎯 **Phase-based logic** handles pre-role phases
- 🎯 **Graceful transitions** from no-roles → roles-assigned
- 🎯 **Type-safe** with proper null handling
- 🎯 **Well-tested** and documented

Just focus on your role assignment logic, and the visibility will work automatically! 🚀
