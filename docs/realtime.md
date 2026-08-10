# Real-time Communication

## Overview

This application uses **Convex reactive queries** for all real-time updates. Convex `useQuery` hooks automatically subscribe to data changes and re-render components when the underlying data changes. This guarantees the frontend is always in sync with the database -- no events can be missed.

**What we use**: Convex `useQuery` (reactive, guaranteed consistency)

**What we do NOT use**:
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

Convex does not send "change events" that can be missed. Instead, it re-runs the query and pushes the **current state** to every subscribed client. If a client disconnects and reconnects, it gets the current state immediately.

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
**Returns**: the current night session. Its **shape is variant-dependent** —
the row carries the union of every variant's fields and each variant populates
only its own. Japanese uses the single-authority scalars; Sports adds the
per-player selection array and the best-move fields. See
`convex/tables/nightPhaseSessions.ts` for the authoritative field list.

```typescript
const nightSession = useQuery(
  api.nightPhaseSessions.getCurrent,
  session?.gamePhase === "night_phase" ? { gameId } : "skip"
);
```

**When to use**: during night phases, to render whatever the resolved ruleset
says this viewer may see.

> ⚠️ Target visibility is **not** universal. Under a `single-authority` night
> model a team shares one visible target; under `unanimous-vote` each player
> sees **only their own** pick, and revealing the others would leak the vote.
> Never assume either — branch on the ruleset's night model, never on `gameType`
> ([engine/variant-architecture.md](./engine/variant-architecture.md) §2.3).

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

### 8. Game Broadcasts (room notifications)

**Query**: `api.game.broadcasts.recent`
**Returns**: Recent room notifications for a game (staff messages / system pushes)

```typescript
const broadcasts = useQuery(api.game.broadcasts.recent, { gameId });
// Each: { _id, kind, text, title?, senderNickname?, senderRole?, createdAt }
```

**When to use**: The `useGameBroadcasts` listener toasts each new broadcast to
everyone in the room. See [game-broadcasts.md](./game-broadcasts.md).

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

// DON'T: useEffect with manual subscription
```

### 2. Use "skip" Instead of Enabled Flags

```typescript
// DO: Use "skip" for conditional queries
const data = useQuery(api.myQuery.get, condition ? { id } : "skip");
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

## Testing Real-time Updates

1. Open the game in two browser windows (host + player)
2. Perform an action in one window (e.g., advance phase)
3. Verify the other window updates immediately
4. Test with browser tab backgrounded for 60 seconds, then switch back
5. Test with slow network (Chrome DevTools throttling)

In all cases, the UI should always show the correct current state.
