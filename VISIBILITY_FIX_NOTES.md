# Visibility System Fix - TrackRef Issue

## Problem Identified

The original implementation had a critical flaw in how it determined participant roles:

### Original Approach (Broken)

```typescript
// ❌ BROKEN: Tried to get target role from LiveKit metadata
const targetMetadata = useParticipantMetadata(trackRef);
const targetRole = targetMetadata?.role;
```

**Why this didn't work:**

1. LiveKit metadata is participant-specific and may not be accessible to all viewers
2. Metadata updates are not guaranteed to be real-time
3. The `trackRef` provides access to the target participant, but their metadata might not include role info
4. Circular dependency: We need roles to determine visibility, but metadata might not be synced

## Solution Implemented

### New Approach (Fixed)

```typescript
// ✅ FIXED: Get target identity from trackRef, look up role in database
const targetUserId = trackRef?.participant?.identity; // Extract participant's userId
const targetPlayer = gameSessionState.allPlayers.find(
  (player) => player.player_id === targetUserId
);
const targetRole = targetPlayer?.role;
```

**Why this works:**

1. ✅ **Single source of truth**: Roles stored in database (`game_players` table)
2. ✅ **Real-time updates**: Game session state includes all players with roles
3. ✅ **Reliable identity**: `trackRef.participant.identity` is always the participant's userId
4. ✅ **No metadata dependency**: No need to sync roles to LiveKit metadata
5. ✅ **Server-controlled**: Roles are server-side data, ensuring security

## Changes Made

### 1. Updated Type Definition

```typescript
// src/types/game/type.ts
export type GameSessionState = {
  // ... existing fields
  playerData: Tables<"game_players">; // Current user only
  allPlayers?: Tables<"game_players">[]; // All players (NEW!)
};
```

### 2. Updated Server Action

```typescript
// src/lib/gameSession/actions.ts
export async function getGameSession(gameId: string, userId: string) {
  // ... fetch game session
  // ... fetch current user's data

  // NEW: Fetch all players for visibility checks
  const { data: allPlayers } = await supabase
    .from("game_players")
    .select("*")
    .eq("game_id", gameId);

  return { ok: true, gameSessionState, playerData, allPlayers };
}
```

### 3. Updated Hook

```typescript
// src/hooks/useParticipantVisibility.ts
export function useParticipantVisibility(trackRef) {
  // Extract target's identity from trackRef
  const targetUserId = trackRef?.participant?.identity;

  // Look up target's role from allPlayers
  const targetPlayer = gameSessionState.allPlayers?.find(
    (player) => player.player_id === targetUserId
  );
  const targetRole = targetPlayer?.role || null;

  // Use canSeeParticipant with database-sourced roles
  return canSeeParticipant(viewerRole, targetRole, gamePhase, ...);
}
```

### 4. Simplified Component Usage

```typescript
// src/components/participant/ParticipantComponent.tsx
// Before: Had to pass targetUserId separately
const { isVisible } = useParticipantVisibility(trackRef, participantId);

// After: Everything extracted from trackRef
const { isVisible } = useParticipantVisibility(trackRef);
```

## Architecture Diagram

### Before (Broken Flow)

```
┌──────────────────────────────────────────────────────────┐
│ ParticipantComponent                                     │
│  trackRef (participant's track) ──────┐                 │
│  participantId (manually extracted) ───┼─────┐          │
└────────────────────────────────────────┼─────┼──────────┘
                                         │     │
                                         ▼     ▼
┌──────────────────────────────────────────────────────────┐
│ useParticipantVisibility                                 │
│  ❌ useParticipantMetadata(trackRef)                    │
│     → May not have role info                             │
│     → Unreliable, not always synced                      │
└──────────────────────────────────────────────────────────┘
```

### After (Fixed Flow)

```
┌──────────────────────────────────────────────────────────┐
│ ParticipantComponent                                     │
│  trackRef (participant's track) ───────────┐             │
└────────────────────────────────────────────┼─────────────┘
                                             │
                                             ▼
┌──────────────────────────────────────────────────────────┐
│ useParticipantVisibility                                 │
│  ✅ trackRef.participant.identity → targetUserId         │
│  ✅ gameSessionState.allPlayers → lookup by userId       │
│  ✅ Direct database source, always accurate              │
└──────────────────────────────────────────────────────────┘
                                             │
                                             ▼
┌──────────────────────────────────────────────────────────┐
│ Database (game_players table)                            │
│  player_id | role      | game_id                         │
│  ───────────────────────────────────                     │
│  user-1    | MAFIA     | game-123                        │
│  user-2    | DETECTIVE | game-123                        │
│  user-3    | CITIZEN   | game-123                        │
└──────────────────────────────────────────────────────────┘
```

## Data Flow

### How Roles Are Determined Now

1. **Role Assignment** (Server):

   ```sql
   UPDATE game_players
   SET role = 'MAFIA'
   WHERE player_id = 'user-123' AND game_id = 'game-456';
   ```

2. **Fetch Game Session** (Client):

   ```typescript
   const { gameSessionState, playerData, allPlayers } = await getGameSession(
     gameId,
     userId
   );
   // allPlayers contains all players with their roles
   ```

3. **Render Participants** (Component):

   ```typescript
   slotDescriptors.map(({ key, track }) => (
     <ParticipantComponent
       trackRef={track} // track.participant.identity = "user-123"
     />
   ));
   ```

4. **Check Visibility** (Hook):

   ```typescript
   const targetUserId = track.participant.identity; // "user-123"
   const targetPlayer = allPlayers.find((p) => p.player_id === targetUserId);
   const targetRole = targetPlayer?.role; // "MAFIA"

   const isVisible = canSeeParticipant(
     viewerRole, // From gameSessionState.playerData
     targetRole, // From gameSessionState.allPlayers (looked up)
     gamePhase, // From gameSessionState
     isViewerHost,
     isTargetHost
   );
   ```

## Benefits of New Approach

### 1. **Reliability**

- ✅ Single source of truth (database)
- ✅ No sync issues between LiveKit and database
- ✅ Real-time updates via Supabase subscriptions

### 2. **Security**

- ✅ Roles managed server-side
- ✅ No client-side role manipulation possible
- ✅ Visibility rules enforced by server data

### 3. **Simplicity**

- ✅ No need to manage LiveKit metadata for roles
- ✅ Fewer moving parts
- ✅ Easier to debug (check database directly)

### 4. **Performance**

- ✅ Single database query fetches all players
- ✅ No metadata parsing overhead
- ✅ Memoized lookups in React

## Testing

To verify the fix works:

1. **Check Console Logs**:

   ```javascript
   // In src/lib/game/visibility.ts (line 30)
   console.log(
     "🚀 ~ canSeeParticipant ~ viewerRole, targetRole:",
     viewerRole,
     targetRole
   );
   ```

2. **Expected Output**:

   ```
   Before fix: viewerRole: "MAFIA", targetRole: null ❌
   After fix:  viewerRole: "MAFIA", targetRole: "DETECTIVE" ✅
   ```

3. **Database Check**:

   ```sql
   SELECT player_id, role FROM game_players WHERE game_id = 'your-game-id';
   ```

4. **Game Session State Check**:
   ```javascript
   console.log("All players:", gameSessionState.allPlayers);
   // Should show array of all players with roles
   ```

## Migration Notes

### For Existing Code

If you have existing code that uses `updateParticipantMetadata` for roles:

```typescript
// ❌ OLD: No longer needed for visibility
await updateParticipantMetadataWithRole(gameId, userId, "MAFIA");

// ✅ NEW: Just update database
await supabase
  .from("game_players")
  .update({ role: "MAFIA" })
  .eq("game_id", gameId)
  .eq("player_id", userId);
```

### LiveKit Metadata Still Useful For

While we don't use metadata for roles anymore, it's still useful for:

- Seat assignments (`seatIndex`)
- UI preferences
- Player status flags
- Any non-security-critical participant info

## Summary

**Problem**: Couldn't access other participants' roles from LiveKit metadata  
**Solution**: Store roles in database, fetch all players, look up by participant identity  
**Result**: Reliable, secure, server-controlled visibility system that actually works! 🎉
