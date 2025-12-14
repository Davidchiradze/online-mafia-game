# Real-time Communication

## Overview

This application uses **Supabase Realtime** for all real-time updates. We subscribe to PostgreSQL database changes via `postgres_changes` events, which automatically push updates to connected clients when data changes.

**⚠️ Important**: We do NOT use Socket.IO, Redis Pub/Sub, or any other real-time solution.

## Supabase Realtime Subscriptions

### How It Works

1. **Server Action** updates the database (e.g., `updateGameSession`)
2. **Database change** triggers a Supabase Realtime event
3. **Client subscription** receives the update via `postgres_changes`
4. **React state** updates, triggering UI re-render

### Subscription Pattern

All real-time subscriptions follow this pattern:

```typescript
"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useMySubscription(
  gameId: string,
  setState: React.Dispatch<React.SetStateAction<State>>,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!gameId || !enabled) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`unique_channel_name_${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // or "INSERT", "UPDATE", "DELETE"
          schema: "public",
          table: "table_name",
          filter: `game_id=eq.${gameId}`, // Optional filter
        },
        (payload) => {
          // Handle the change
          setState((prev) => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, enabled, setState]);
}
```

## Existing Subscriptions

### 1. Game Session Updates

**Hook**: `useGameSessionListener`
**File**: `src/hooks/useGameSessionListener.ts`
**Subscribes to**: `game_sessions` table
**Events**: All events (`*`)
**Filter**: `game_id=eq.${gameId}`

```typescript
useGameSessionListener(gameId, setGameSessionState, enabled);
```

**When to use**: When you need to react to game phase changes, voting updates, or any game session state changes.

### 2. Player Updates

**Hook**: `useGamePlayerListener`
**File**: `src/hooks/useGamePlayerListener.ts`
**Subscribes to**: `game_players` table
**Events**: `INSERT`, `UPDATE`, `DELETE`
**Filter**: `game_id=eq.${gameId}`

```typescript
useGamePlayerListener(gameId, userId, setGameSessionState, enabled);
```

**When to use**: When you need to track player joins, role assignments, seat changes, or player removals.

### 3. Host Changes

**Hook**: `useGameHostSubscription`
**File**: `src/hooks/useGameHostSubscription.ts`
**Subscribes to**: `games` table
**Events**: `UPDATE`
**Filter**: `id=eq.${gameId}`

```typescript
useGameHostSubscription(
  gameId,
  (newHostId) => {
    // Handle host change
  },
  enabled
);
```

**When to use**: When you need to detect when the game host changes.

### 4. Join Requests

**Hook**: `useJoinRequests`
**File**: `src/hooks/useJoinRequests.ts`
**Subscribes to**: `join_requests` table
**Events**: `INSERT`, `UPDATE`, `DELETE`
**Filter**: `game_id=eq.${gameId}`

**When to use**: When you need to show pending join requests to the host.

## Best Practices

### 1. Always Clean Up Subscriptions

```typescript
// ✅ DO: Return cleanup function
useEffect(() => {
  const channel = supabase.channel(...).subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}, [dependencies]);
```

### 2. Use Unique Channel Names

```typescript
// ✅ DO: Include unique identifiers
const channel = supabase.channel(`game_session_${gameId}_${userId}`);

// ❌ DON'T: Use generic names that might conflict
const channel = supabase.channel("game_updates");
```

### 3. Enable/Disable Subscriptions

```typescript
// ✅ DO: Add enabled flag
export function useMySubscription(gameId: string, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return; // Early return
    // ... subscription logic
  }, [enabled, gameId]);
}
```

### 4. Handle Loading States

```typescript
// ✅ DO: Fetch initial data, then subscribe
useEffect(() => {
  // Fetch initial state
  fetchInitialData().then(setState);

  // Then subscribe to changes
  const channel = supabase.channel(...).subscribe();
  return () => supabase.removeChannel(channel);
}, []);
```

## Channel Naming Convention

Use descriptive, unique channel names:

- `game_session_changes_${gameId}` - Game session updates
- `game_players_changes_${gameId}_${userId}` - Player updates (with user context)
- `game_host_${gameId}` - Host changes
- `join_requests_${gameId}` - Join request updates

## Error Handling

Supabase subscriptions handle reconnection automatically. However, you should handle edge cases:

```typescript
const channel = supabase
  .channel(`my_channel_${gameId}`)
  .on("postgres_changes", {...}, (payload) => {
    if (payload.errors) {
      console.error("Subscription error:", payload.errors);
      return;
    }
    // Handle successful update
  })
  .subscribe((status) => {
    if (status === "SUBSCRIBED") {
      console.log("Subscribed successfully");
    } else if (status === "CHANNEL_ERROR") {
      console.error("Channel error");
    }
  });
```

## Performance Considerations

1. **Filter at the database level**: Use `filter` to only receive relevant updates
2. **Limit subscriptions**: Don't create multiple subscriptions for the same data
3. **Unsubscribe when not needed**: Use the `enabled` flag to disable subscriptions
4. **Debounce rapid updates**: Use `debounce` utility if needed for rapid state changes

## Testing Subscriptions

To test subscriptions:

1. Open browser DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. Look for Supabase WebSocket connections
4. Trigger a database change (via server action)
5. Verify the subscription receives the update

## Common Pitfalls

### ❌ Creating Subscriptions in Loops

```typescript
// ❌ DON'T: This creates multiple subscriptions
players.forEach((player) => {
  supabase.channel(`player_${player.id}`).subscribe();
});
```

### ❌ Not Cleaning Up

```typescript
// ❌ DON'T: Memory leak
useEffect(() => {
  supabase.channel(...).subscribe();
  // Missing cleanup!
}, []);
```

### ❌ Subscribing to Too Much Data

```typescript
// ❌ DON'T: Subscribe to all games
supabase.channel("all_games").on("postgres_changes", {
  table: "games",
  // No filter - receives ALL game updates
}, ...);

// ✅ DO: Filter to specific game
supabase.channel(`game_${gameId}`).on("postgres_changes", {
  table: "games",
  filter: `id=eq.${gameId}`,
}, ...);
```
