# Backend Patterns

## Convex Functions

All game logic and database operations happen via **Convex mutations and queries** defined in the `convex/` folder.

### Mutation Pattern (Write Operations)

```typescript
// convex/games.ts
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(v.literal("sports_mafia"), v.literal("city_mafia"), v.literal("japanese_mafia")),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate user
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // 2. Perform database operation
    const gameId = await ctx.db.insert("games", {
      name: args.name,
      code: generateGameCode(),
      hostId: userId,
      gameStatus: "not_started",
      gameType: args.type,
      // Never hardcode a seat count — it is variant-specific (Japanese 12,
      // Sports 10). Read it from the definition.
      maxPlayers: getGameDefinition(args.type).seatCount,
    });

    return gameId;
  },
});
```

### Query Pattern (Read Operations)

```typescript
// convex/gameSessions.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getByGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gameSessions")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .unique();
  },
});
```

### Key Points

1. **Authenticate first** - Call `getAuthUserId(ctx)` at the start of mutations/queries
2. **Validate permissions** - Check if user has permission (e.g., is host)
3. **Use `ctx.db` for all operations** - No separate admin client needed
4. **Throw errors on failure** - Caught by `useMutation` on frontend
5. **Mutations are transactional** - All writes succeed or all rollback
6. **Queries are reactive** - `useQuery` auto-updates when data changes

## Function Types

| Type | Use For | DB Access | External APIs |
|---|---|---|---|
| `query` | Reading data (reactive, real-time) | Read only | No |
| `mutation` | Writing data (transactional) | Read + Write | No |
| `action` | External API calls | Via `ctx.runQuery`/`ctx.runMutation` | Yes |
| `internalAction` | Internal-only external calls (e.g., LiveKit) | Via helpers | Yes |
| `httpAction` | HTTP endpoints (webhooks) | Via helpers | Yes |

## Database Operations

### Reading Data

```typescript
// Get by ID
const game = await ctx.db.get(gameId);

// Query with index (single result)
const session = await ctx.db
  .query("gameSessions")
  .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
  .unique();

// Query with index (multiple results)
const players = await ctx.db
  .query("gamePlayers")
  .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
  .collect();

// Query with compound index
const player = await ctx.db
  .query("gamePlayers")
  .withIndex("by_gameId_playerId", (q) =>
    q.eq("gameId", gameId).eq("playerId", userId)
  )
  .unique();

// Query with filter (when no index exists)
const alive = await ctx.db
  .query("gamePlayers")
  .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
  .filter((q) => q.eq(q.field("isAlive"), true))
  .collect();
```

### Writing Data

```typescript
// Insert (returns the new document ID)
const id = await ctx.db.insert("gameSessions", {
  gameId,
  gamePhase: "game_session_started",
  speakingOrder: [],
  nominatedPlayers: [],
  currentNightNumber: 0,
  isFinished: false,
});

// Update (partial patch)
await ctx.db.patch(gameId, { gameStatus: "playing" });

// Delete
await ctx.db.delete(requestId);
```

### Transactions

Convex mutations are automatically transactional. All writes in a single mutation either succeed together or rollback together:

```typescript
export const startGame = mutation({
  handler: async (ctx, args) => {
    // These all happen atomically
    await ctx.db.patch(args.gameId, { gameStatus: "playing" });
    await ctx.db.insert("gameSessions", {
      gameId: args.gameId,
      gamePhase: "game_session_started",
      // ...
    });
    // If the insert fails, the patch is also rolled back
  },
});
```

## API Routes

API routes are only used for **webhooks** that receive external HTTP requests:

**Location**: `src/app/api/`

### LiveKit Webhook

```typescript
// src/app/api/livekit/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Verify webhook signature
  // Process participant_joined, participant_left events
  // Call Convex mutations to update player state
}
```

## Type Safety

### Use Convex Generated Types

```typescript
import { Doc, Id } from "@/convex/_generated/dataModel";

// Document type (full row)
const game: Doc<"games"> = ...;

// ID type
const gameId: Id<"games"> = ...;

// In function args, use validators
args: { gameId: v.id("games") }
```

### Validators

```typescript
import { v } from "convex/values";

v.string()                                    // string
v.number()                                    // number
v.boolean()                                   // boolean
v.id("games")                                 // Id<"games">
v.array(v.number())                           // number[]
v.object({ key: v.string() })                 // { key: string }
v.optional(v.string())                        // string | undefined
v.union(v.literal("a"), v.literal("b"))       // "a" | "b"
```

## Error Handling

### In Convex Functions

Throw errors in mutations/queries. The error message is available on the frontend:

```typescript
export const start = mutation({
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (game.hostId !== userId) throw new Error("Only host can start the game");
  },
});
```

### On Frontend

```typescript
const startGame = useMutation(api.gameSessions.start);

try {
  await startGame({ gameId });
} catch (error) {
  toast.error(error instanceof Error ? error.message : "Something went wrong");
}
```

## Security

### Authentication

Always authenticate in Convex functions:

```typescript
const userId = await getAuthUserId(ctx);
if (!userId) throw new Error("Not authenticated");
```

### Authorization

Check permissions before operations:

```typescript
const game = await ctx.db.get(args.gameId);
if (game?.hostId !== userId) throw new Error("Forbidden");
```

### Role Filtering

Filter sensitive data in Convex queries:

```typescript
// convex/games/core/roles.ts - getFiltered query
// Host sees all roles
// Teammates see each other's roles
// Others see null for role field
```

## LiveKit Integration

### Token Generation (Convex Internal Action)

LiveKit operations use `internalAction` since they call external APIs:

```typescript
// convex/livekit.ts
import { internalAction } from "./_generated/server";
import { AccessToken } from "livekit-server-sdk";

export const generateToken = internalAction({
  args: { roomId: v.string(), participantId: v.string(), isHost: v.boolean() },
  handler: async (ctx, args) => {
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      { identity: args.participantId }
    );
    at.addGrant({
      room: args.roomId,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      hidden: args.isHost,
      roomAdmin: args.isHost,
    });
    return await at.toJwt();
  },
});
```

## Environment Variables

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
CONVEX_SITE_URL=https://your-project.convex.site

# Auth (Resend for email OTP)
AUTH_RESEND_KEY=re_xxxx

# LiveKit
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
```

## File Organization

Organized by domain in `convex/`:

| Folder / File | Purpose |
|---|---|
| `lobby/games.ts` | Game room CRUD (create, list, delete) |
| `lobby/joinRequests.ts` | Join request create/accept/reject/kick |
| `lobby/hostTransfer.ts` | Host transfer |
| `game/players.ts` | Player join/leave/kill |
| `game/spectators.ts` | Spectator join/leave |
| `game/roles.ts` | Role assignment and filtered visibility |
| `game/sessions.ts` | Game session state machine (start, phase transitions) |
| `game/nightPhase.ts` | Night phase actions (mafia/yakuza target, doctor heal) |
| `game/dayPhase.ts` | Day phase speaking (advance speaker, nominate, fouls) |
| `game/voting.ts` | Voting session management and vote casting |
| `game/farewellSpeech.ts` | Farewell speech flow |
| `auth/profiles.ts` | Profile queries/mutations |
| `lib/auth.ts` | Auth helpers (`getAuthenticatedUser`) |
| `lib/games.ts` | Shared game helpers (host assertion, player lookup) |
| `lib/constants.ts` | Backend constants (speaking, fouls, voting) |
| `lib/speakingOrder.ts` | Speaking order computation (pure functions) |
| `refs/lobby.ts` | Function references for lobby (TS2589 workaround) |
| `refs/game.ts` | Function references for game (TS2589 workaround) |

## Best Practices

1. **Always authenticate** - `getAuthUserId(ctx)` in every function
2. **Validate permissions** - Check if user can perform the action
3. **Use indexes** - Always query with `.withIndex()` for performance
4. **Throw descriptive errors** - Clear error messages for the frontend
5. **Keep mutations focused** - One logical operation per mutation
6. **Filter sensitive data** - Roles and other sensitive data filtered in queries
7. **Use validators** - Define `args` with `v.*` validators for type safety
8. **Leverage transactions** - Group related writes in a single mutation
