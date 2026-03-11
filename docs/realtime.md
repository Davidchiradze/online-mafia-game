# Real-time Communication

## Overview

This application uses **Convex reactive queries** for all real-time updates. Convex `useQuery` hooks automatically subscribe to data changes and re-render components when the underlying data changes. This guarantees the frontend is always in sync with the database -- no events can be missed.

**What we use**: Convex `useQuery` (reactive, guaranteed consistency)

**What we do NOT use**:
- Supabase Realtime / `postgres_changes` (removed -- events could be missed)
- Socket.IO / Redis Pub/Sub
- Manual `useEffect` subscriptions with cleanup

## How It Works

```
┌─────────────┐
│   Browser    │
│  (React)     │
└──────┬───────┘
       │
       │ 1. User Action (e.g., vote, start phase)
       │    calls useMutation(api.gameSessions.start)
       │
       ▼
┌──────────────────┐
│  Convex Mutation  │
│  (server-side)    │
└──────┬───────────┘
       │
       │ 2. Mutation writes to Convex DB
       │
       ▼
┌──────────────────┐
│   Convex DB      │
│  (document store) │
└──────┬───────────┘
       │
       │ 3. Convex detects which queries read this data
       │    and re-runs them automatically
       │
       ▼
┌──────────────────────────┐
│  All subscribed clients  │
│  useQuery auto-updates   │
└──────────────────────────┘
```

The key difference from the old Supabase approach: Convex does not send "change events" that can be missed. Instead, it re-runs the query and pushes the **current state** to every subscribed client. If a client disconnects and reconnects, it gets the current state immediately.

## Reactive Query Pattern

All real-time data uses `useQuery` from `convex/react`:

```typescript
"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function GameComponent({ gameId }: { gameId: Id<"games"> }) {
  const gameSession = useQuery(api.gameSessions.getByGame, { gameId });

  if (gameSession === undefined) return <LoadingSpinner />;
  if (gameSession === null) return <div>No session found</div>;

  return <div>Phase: {gameSession.gamePhase}</div>;
}
```

That single `useQuery` call:
- Fetches the initial data
- Subscribes to changes
- Re-renders the component when data changes
- Cleans up automatically when the component unmounts
- Reconnects and syncs after network interruptions

## Active Subscriptions

### 1. Game Session

**Query**: `api.gameSessions.getByGame`
**Returns**: Current game session (phase, speaking order, nominations, etc.)

```typescript
const session = useQuery(api.gameSessions.getByGame, { gameId });
// session.gamePhase, session.speakingOrder, session.nominatedPlayers, etc.
```

**When to use**: Anywhere you need the current game phase, speaking state, or session data.

### 2. Game Players

**Query**: `api.gamePlayers.listByGame`
**Returns**: All players in the game (seat, alive status, fouls, etc.)

```typescript
const players = useQuery(api.gamePlayers.listByGame, { gameId });
// Array of players with seatNumber, isAlive, fouls, state, nickname
```

**When to use**: Player list, seat assignments, alive/dead status.

### 3. Game Data (includes host)

**Query**: `api.games.getById`
**Returns**: Game room data including `hostId`

```typescript
const game = useQuery(api.games.getById, { gameId });
// game.hostId, game.gameStatus, game.name, game.gameType
```

**When to use**: Detecting host changes, game status, game metadata.

### 4. Night Phase Session

**Query**: `api.nightPhaseSessions.getCurrent`
**Returns**: Current night session (mafia target, yakuza target, healed player)

```typescript
const nightSession = useQuery(
  api.nightPhaseSessions.getCurrent,
  session?.gamePhase === "night_phase" ? { gameId } : "skip"
);
```

**When to use**: During night phases to show target selections to team members.

### 5. Player Roles (filtered by visibility)

**Query**: `api.gamePlayerRoles.getFiltered`
**Returns**: Roles filtered by team visibility (teammates see each other, others see null)

```typescript
const roles = useQuery(api.gamePlayerRoles.getFiltered, { gameId });
// Each role entry: { playerId, role } where role is null if not visible
```

**When to use**: Displaying role badges, team indicators.

### 6. Join Requests

**Query**: `api.joinRequests.getMyStatus` / `api.joinRequests.listPending`

```typescript
// Player checking their own request status
const myRequest = useQuery(api.joinRequests.getMyStatus, { gameId });

// Host viewing pending requests
const pending = useQuery(api.joinRequests.listPending, { gameId });
```

**When to use**: Join request flow, host approval drawer.

### 7. Lobby (all games)

**Query**: `api.games.listAll`

```typescript
const games = useQuery(api.games.listAll);
// Auto-updates when any game is created, deleted, or changes status
```

**When to use**: Lobby page game list.

## Conditional Queries

Use `"skip"` to conditionally disable a query:

```typescript
// Only subscribe when we have a gameId
const session = useQuery(
  api.gameSessions.getByGame,
  gameId ? { gameId } : "skip"
);

// Only subscribe during night phase
const nightSession = useQuery(
  api.nightPhaseSessions.getCurrent,
  isNightPhase ? { gameId } : "skip"
);
```

## Loading States

`useQuery` returns `undefined` while the initial data is loading:

```typescript
const session = useQuery(api.gameSessions.getByGame, { gameId });

if (session === undefined) {
  // Still loading initial data
  return <LoadingSpinner />;
}

// session is now the actual data (could be null if not found)
```

## Best Practices

### 1. No useEffect for Subscriptions

```typescript
// DO: Single useQuery call
const players = useQuery(api.gamePlayers.listByGame, { gameId });

// DON'T: useEffect with manual subscription (old Supabase pattern)
// useEffect(() => {
//   const channel = supabase.channel(...).subscribe();
//   return () => supabase.removeChannel(channel);
// }, []);
```

### 2. Use "skip" Instead of Enabled Flags

```typescript
// DO: Use "skip" for conditional queries
const data = useQuery(api.myQuery.get, condition ? { id } : "skip");

// DON'T: Use enabled flags (old pattern)
// useMySubscription(id, setState, enabled);
```

### 3. Combine Queries in Components

```typescript
// DO: Multiple useQuery calls in one component
function GameRoom({ gameId }) {
  const game = useQuery(api.games.getById, { gameId });
  const session = useQuery(api.gameSessions.getByGame, { gameId });
  const players = useQuery(api.gamePlayers.listByGame, { gameId });
  // Each updates independently
}
```

### 4. Mutations Trigger Query Updates Automatically

```typescript
const castVote = useMutation(api.votes.cast);

// After this mutation completes, any useQuery reading from the votes
// table will automatically re-run and update the UI
await castVote({ votingSessionId, voterSeat: 3, seatNumber: 5 });
```

## Why Convex Over Supabase Realtime

| Issue | Supabase Realtime | Convex |
|---|---|---|
| Missed events | Events can be dropped under load or during reconnection | Impossible -- queries return current state |
| Reconnection | Must re-subscribe; may miss events during gap | Automatic catch-up with current state |
| Tab backgrounding | Browser throttles WebSocket, events lost | Re-syncs on tab focus |
| Rapid updates | Intermediate states can be coalesced | Always shows latest state |
| Initial load + subscribe | Two separate steps (fetch then subscribe) | Single `useQuery` call |
| Cleanup | Must manually remove channels in useEffect return | Automatic on unmount |

## Testing Real-time Updates

1. Open the game in two browser windows (host + player)
2. Perform an action in one window (e.g., advance phase)
3. Verify the other window updates immediately
4. Test with browser tab backgrounded for 60 seconds, then switch back
5. Test with slow network (Chrome DevTools throttling)

In all cases, the UI should always show the correct current state.
