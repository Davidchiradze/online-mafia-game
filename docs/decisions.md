# Architectural Decision Records (ADR)

This document records important architectural decisions, including what was chosen and why, and what was rejected.

## ADR-001: Real-time Communication - Convex Reactive Queries

**Status**: Superseded (was Supabase Realtime, now Convex)

**Decision**: Use Convex reactive queries (`useQuery`) for all real-time updates.

**Context**:

- Need real-time game state synchronization
- Need guaranteed delivery (no missed events)
- Need to handle player joins, phase changes, voting, etc.
- Supabase Realtime (`postgres_changes`) was dropping events under load, during reconnection, and when tabs were backgrounded

**Options Considered**:

1. **Supabase Realtime** - PostgreSQL change subscriptions (original choice)
2. **Socket.IO** - Custom WebSocket server
3. **Ably** - Pub/sub messaging service
4. **Convex** - Reactive queries with guaranteed consistency

**Decision**:

- Chose **Convex reactive queries** because:
  - Guaranteed consistency (queries return current state, not change events)
  - Automatic reconnection with full state catch-up
  - No manual subscription setup or cleanup
  - Single `useQuery` call replaces fetch + subscribe pattern
  - Simpler code (no `useEffect`, no channel management)

**Consequences**:

- All 7 Supabase realtime hooks replaced by `useQuery` calls
- No more missed events or stale state
- Simpler codebase (removed ~500 lines of subscription code)
- Vendor change from Supabase to Convex

**Rejected**:

- **Supabase Realtime**: Events could be dropped (the problem that triggered this migration)
- **Socket.IO**: Would require custom server, still event-based (same missed-event risk)
- **Ably**: Pub/sub only, still needs separate DB + reconciliation logic

---

## ADR-002: State Management - No Global Store

**Status**: Accepted

**Decision**: Do not use Redux, Zustand, or any global state management library.

**Context**:

- Need to manage game state, player data, UI state
- Need real-time updates
- Want to keep architecture simple

**Decision**:

- Chose **Convex reactive queries + local state** because:
  - `useQuery` provides always-fresh server data
  - No need for global store when data is always in sync with database
  - Simpler mental model
  - Less boilerplate

**Consequences**:

- Simpler codebase (no store setup)
- Data always in sync with database
- Some prop drilling (mitigated with React Context)

**Rejected**:

- **Redux Toolkit**: Too much boilerplate
- **Zustand**: Not needed when data comes from reactive queries

---

## ADR-003: Convex Mutations over Server Actions

**Status**: Superseded (was Next.js Server Actions, now Convex mutations)

**Decision**: Use Convex mutations for all game logic instead of Next.js Server Actions.

**Context**:

- Need to handle game state transitions
- Need to validate permissions
- Need atomic transactions
- Server Actions required separate `adminClient` for writes and had no built-in transactions

**Decision**:

- Chose **Convex mutations** because:
  - Atomic transactions (all writes succeed or all rollback)
  - Single `ctx.db` for all operations (no separate admin client)
  - Type-safe with auto-generated API (`api.games.create`)
  - Mutations automatically trigger reactive query updates
  - Built-in auth via `getAuthUserId(ctx)`

**Consequences**:

- All `"use server"` action files replaced by `convex/*.ts` files
- Frontend uses `useMutation(api.x.y)` instead of importing server actions
- Error handling via try/catch instead of `{ ok, message }` pattern
- Transactions are automatic (no manual error checking between operations)

**Rejected**:

- **Next.js Server Actions**: No built-in transactions, required separate admin client, `{ ok, message }` pattern was verbose

---

## ADR-004: Database Types - Convex Auto-Generated

**Status**: Superseded (was Supabase generated types, now Convex generated types)

**Decision**: Use auto-generated types from `convex/_generated/dataModel`.

**Context**:

- Need type safety for database operations
- Schema defined in `convex/schema.ts`
- Want single source of truth

**Decision**:

- Chose **Convex auto-generated types** because:
  - `Doc<"tableName">` and `Id<"tableName">` are always in sync with schema
  - No manual regeneration needed (auto-generated on `npx convex dev`)
  - Type-safe validators (`v.id("games")`) in function args

**Consequences**:

- `Tables<"games">` replaced by `Doc<"games">`
- `string` UUIDs replaced by `Id<"games">`
- `database.types.ts` deleted (replaced by `convex/_generated/dataModel.d.ts`)

---

## ADR-005: Video/Audio - LiveKit over Custom WebRTC

**Status**: Accepted (unchanged)

**Decision**: Use LiveKit for video/audio streaming instead of custom WebRTC implementation.

**Context**:

- Need video/audio communication between players
- Need role-based visibility control
- Need connection management

**Decision**:

- Chose **LiveKit** because:
  - Good React integration
  - Role-based visibility support (hidden participants)
  - Good documentation
  - Self-hostable

**Consequences**:

- Managed/self-hosted service (less custom infrastructure)
- Good React components
- Role-based visibility built-in
- External dependency

**Rejected**:

- **Custom WebRTC**: Too complex
- **Agora/Twilio**: Less suitable for our use case

---

## ADR-006: Authentication - Convex Auth

**Status**: Superseded (was Supabase Auth, now Convex Auth)

**Decision**: Use Convex Auth (`@convex-dev/auth`) with Password provider and Resend OTP.

**Context**:

- Migrating from Supabase to Convex
- Need email/password authentication with email verification
- Need route protection via middleware

**Decision**:

- Chose **Convex Auth** because:
  - Integrated with Convex (same platform as database)
  - `getAuthUserId(ctx)` in Convex functions (no separate auth check)
  - `convexAuthNextjsMiddleware` for route protection
  - Password provider with Resend OTP for email verification

**Consequences**:

- `supabase.auth.getUser()` replaced by `getAuthUserId(ctx)`
- Supabase Auth UI replaced by custom forms using `useAuthActions()`
- `user.id` (UUID string) replaced by `Id<"users">`
- Profile data stored in separate `profiles` table (not in auth metadata)

**Rejected**:

- **Supabase Auth**: Tied to Supabase (which we're migrating away from)
- **NextAuth/Auth.js standalone**: Would add another service; Convex Auth is simpler

---

## ADR-007: Component Organization - Feature-based

**Status**: Accepted (unchanged)

**Decision**: Organize components by feature/domain, not by type.

**Structure**:

```
components/
├── game/              # Game-related components
├── auth/              # Auth-related components
├── liveKit/           # LiveKit-related components
├── ui/                # Reusable UI primitives
└── modals/            # Modal dialogs
```

**Rationale**:

- Easier to find related components
- Better code organization
- Clearer boundaries

---

## ADR-008: Role Filtering - Server-side Only

**Status**: Accepted (updated for Convex)

**Decision**: Filter role information server-side in Convex queries, never send all roles to client.

**Context**:

- Role information is sensitive (game-breaking if leaked)
- Need to hide roles from non-teammates

**Implementation**:

- Roles stored in `gamePlayerRoles` table (separate from `gamePlayers`)
- `getFiltered` query in `convex/gamePlayerRoles.ts` filters by team visibility
- `useQuery(api.gamePlayerRoles.getFiltered, { gameId })` at `GameRoomContext` level
- Teammates can see each other's roles:
  - Mafia team (DON, MAFIA, MAFIA_RIGHT_HAND) see each other
  - Yakuza team (YAKUZA, SHOGUN) see each other
- Host can see all roles
- Others see `null` for role field

**Consequences**:

- Security (roles never leaked)
- Game integrity maintained
- Efficient (single reactive query, not per participant)
- Real-time updates via Convex reactive query

---

## ADR-009: Database - Convex over Supabase

**Status**: Accepted

**Decision**: Migrate from Supabase (PostgreSQL) to Convex (document database) for the entire data layer.

**Context**:

- Supabase Realtime was unreliable (missed events)
- Need guaranteed real-time sync for a multiplayer game
- Evaluated Convex and Ably as alternatives

**Decision**:

- Chose **Convex** because:
  - Reactive queries guarantee frontend is always in sync with DB
  - All-in-one platform (database + server functions + auth + real-time)
  - Atomic transactions (Supabase had no built-in transactions)
  - Simpler architecture (no separate admin client, no RLS, no subscription cleanup)
  - Document model works well for game state (nested objects, arrays)

**Consequences**:

- Relational schema converted to document schema (foreign keys become `v.id()` references)
- snake_case fields converted to camelCase
- No JOINs (use multiple queries or denormalization)
- `_creationTime` replaces `created_at`
- All Supabase code removed (clients, types, subscriptions)

**Rejected**:

- **Ably**: Pub/sub only, would still need Supabase for DB + custom reconciliation
- **Keeping Supabase**: Fundamental reliability issue with `postgres_changes`

---

## Summary

| Decision | Status | Key Technology |
|---|---|---|
| Real-time | Superseded | Convex reactive queries |
| State Management | Accepted | Convex queries + local state |
| Server Logic | Superseded | Convex mutations |
| Database Types | Superseded | Convex auto-generated (`Doc<>`) |
| Video/Audio | Accepted | LiveKit |
| Authentication | Superseded | Convex Auth |
| Component Org | Accepted | Feature-based |
| Role Filtering | Accepted | Server-side (Convex queries) |
| Database | Accepted | Convex (document DB) |
