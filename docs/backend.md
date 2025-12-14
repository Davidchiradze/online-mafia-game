# Backend Patterns

## Server Actions

All game logic and database operations happen via **Next.js Server Actions**.

### Pattern

```typescript
"use server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { Tables } from "@/db/supabase/database.types";

export async function myAction(
  gameId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  // 1. Authenticate user
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, message: "Not authenticated" };
  }

  // 2. Validate permissions (e.g., check if user is host)
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("host_id")
    .eq("id", gameId)
    .single<Tables<"games">>();

  if (gameError || !game) {
    return { ok: false, message: "Game not found" };
  }

  if (game.host_id !== user.id) {
    return { ok: false, message: "Forbidden" };
  }

  // 3. Perform database operation (use adminClient for writes)
  const { error: updateError } = await adminClient
    .from("games")
    .update({ game_status: "playing" })
    .eq("id", gameId);

  if (updateError) {
    return { ok: false, message: updateError.message };
  }

  // 4. Return success
  return { ok: true };
}
```

### Key Points

1. **Always use `"use server"`** directive at the top
2. **Authenticate first** - Check user with `supabase.auth.getUser()`
3. **Validate permissions** - Check if user has permission (e.g., is host)
4. **Use adminClient for writes** - Use `adminClient` from `@/lib/supabase/admin` for database writes
5. **Return consistent format** - `{ ok: true }` or `{ ok: false; message: string }`
6. **Handle errors** - Always check for errors and return appropriate messages

## Supabase Clients

### Server Client (`createClient` from `@/lib/supabase/server`)

**Use for**:

- Reading data (SELECT queries)
- Authentication checks
- Row Level Security (RLS) applies

```typescript
const supabase = await createClient();
const { data, error } = await supabase
  .from("games")
  .select("*")
  .eq("id", gameId)
  .single();
```

### Admin Client (`adminClient` from `@/lib/supabase/admin`)

**Use for**:

- Writing data (INSERT, UPDATE, DELETE)
- Bypassing RLS when needed
- Bulk operations

```typescript
import { adminClient } from "@/lib/supabase/admin";

const { error } = await adminClient
  .from("games")
  .update({ game_status: "playing" })
  .eq("id", gameId);
```

**⚠️ Important**: Only use adminClient when you've already validated permissions server-side.

## API Routes

API routes are used for:

- Webhooks (e.g., LiveKit webhooks)
- Auth callbacks (e.g., email confirmation)
- External integrations

**Location**: `src/app/api/`

### Pattern

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Process webhook/callback
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
```

## Database Operations

### Reading Data

```typescript
// Single record
const { data, error } = await supabase
  .from("games")
  .select("*")
  .eq("id", gameId)
  .single<Tables<"games">>();

// Multiple records
const { data, error } = await supabase
  .from("game_players")
  .select("*")
  .eq("game_id", gameId)
  .order("seat_number", { ascending: true });
```

### Writing Data

```typescript
// Insert
const { error } = await adminClient.from("game_sessions").insert({
  game_id: gameId,
  game_phase: "game_session_started",
});

// Update
const { error } = await adminClient
  .from("games")
  .update({ game_status: "playing" })
  .eq("id", gameId);

// Delete
const { error } = await adminClient
  .from("join_requests")
  .delete()
  .eq("id", requestId);
```

### Transactions

For multiple related operations, perform them sequentially and check errors:

```typescript
// Update game status
const { error: gameError } = await adminClient
  .from("games")
  .update({ game_status: "playing" })
  .eq("id", gameId);

if (gameError) {
  return { ok: false, message: gameError.message };
}

// Create game session
const { error: sessionError } = await adminClient
  .from("game_sessions")
  .insert({ game_id: gameId, game_phase: "game_session_started" });

if (sessionError) {
  return { ok: false, message: sessionError.message };
}

return { ok: true };
```

## Type Safety

### Use Database Types

Always use types from `database.types.ts`:

```typescript
import { Tables } from "@/db/supabase/database.types";

// ✅ DO: Use database types
const game: Tables<"games"> = ...;
const player: Tables<"game_players"> = ...;

// ❌ DON'T: Create duplicate types
type Game = { id: string; name: string; ... };
```

### Type Queries

Type your queries for better type safety:

```typescript
const { data } = await supabase
  .from("games")
  .select("id, host_id, game_status")
  .eq("id", gameId)
  .single<Pick<Tables<"games">, "id" | "host_id" | "game_status">>();
```

## Error Handling

### Consistent Error Format

All server actions return:

```typescript
type ActionResult = { ok: true } | { ok: false; message: string };
```

### Error Messages

- **Authentication errors**: "Not authenticated"
- **Permission errors**: "Forbidden" or "Only host can perform this action"
- **Not found errors**: "Game not found" or "Player not found"
- **Validation errors**: Specific validation message
- **Database errors**: `error.message` from Supabase

## Security

### Authentication

Always authenticate in server actions:

```typescript
const supabase = await createClient();
const {
  data: { user },
  error,
} = await supabase.auth.getUser();
if (error || !user) {
  return { ok: false, message: "Not authenticated" };
}
```

### Authorization

Check permissions before operations:

```typescript
// Check if user is host
if (game.host_id !== user.id) {
  return { ok: false, message: "Forbidden" };
}

// Check if user is player in game
const { data: player } = await supabase
  .from("game_players")
  .select("id")
  .eq("game_id", gameId)
  .eq("player_id", user.id)
  .single();

if (!player) {
  return { ok: false, message: "Not a player in this game" };
}
```

### Role Filtering

Filter sensitive data (like roles) based on team relationships:

```typescript
import { filterPlayerRoles } from "@/lib/utils/filterPlayerRoles";

const filteredPlayers = filterPlayerRoles({
  allPlayers,
  requestingUserId: user.id,
  requestingRole: playerData.role,
  isHost: game.host_id === user.id,
});
```

## LiveKit Integration

### Server Actions for LiveKit

LiveKit operations happen via server actions:

```typescript
"use server";
import { RoomServiceClient } from "livekit-server-sdk";

export async function createLivekitRoom(roomId: string) {
  const roomService = new RoomServiceClient(
    process.env.NEXT_PUBLIC_LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );

  await roomService.createRoom({
    name: roomId,
    emptyTimeout: 10 * 60,
    maxParticipants: 20,
  });
}
```

### Access Tokens

Generate access tokens for clients:

```typescript
import { AccessToken, VideoGrant } from "livekit-server-sdk";

export async function generateLivekitAccessToken(
  roomId: string,
  participantId: string,
  permissions: { hidden: boolean; roomAdmin: boolean }
) {
  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    { identity: participantId }
  );

  const grant: VideoGrant = {
    room: roomId,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    hidden: permissions.hidden,
    roomAdmin: permissions.roomAdmin,
  };

  at.addGrant(grant);
  return await at.toJwt();
}
```

## Environment Variables

Required environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...  # For adminClient

# LiveKit
NEXT_PUBLIC_LIVEKIT_URL=...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
```

## Best Practices

1. **Always authenticate** - Check user in every server action
2. **Validate permissions** - Check if user can perform the action
3. **Use adminClient for writes** - Use admin client for database writes
4. **Return consistent format** - Use `{ ok: true }` or `{ ok: false; message }`
5. **Handle all errors** - Check for errors and return appropriate messages
6. **Use database types** - Always use types from `database.types.ts`
7. **Filter sensitive data** - Filter roles and other sensitive data server-side
8. **Keep actions focused** - One action per operation
9. **Validate input** - Validate and sanitize input data
10. **Log errors** - Log errors for debugging (but don't expose to client)
