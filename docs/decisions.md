# Architectural Decision Records (ADR)

This document records important architectural decisions, including what was chosen and why, and what was rejected.

## ADR-001: Real-time Communication - Supabase Realtime over Socket.IO

**Status**: ✅ Accepted

**Decision**: Use Supabase Realtime (postgres_changes subscriptions) instead of Socket.IO for real-time updates.

**Context**:

- Need real-time game state synchronization
- Need to broadcast updates to all connected clients
- Need to handle player joins, phase changes, voting, etc.

**Options Considered**:

1. **Socket.IO** - Custom WebSocket server
2. **Supabase Realtime** - Built-in PostgreSQL change subscriptions
3. **Redis Pub/Sub** - External message broker

**Decision**:

- Chose **Supabase Realtime** because:
  - Already using Supabase for database
  - No additional infrastructure needed
  - Automatic reconnection handling
  - Built-in filtering and security
  - Simpler architecture (one less service)

**Consequences**:

- ✅ Simpler deployment (no Socket.IO server to manage)
- ✅ Automatic reconnection and error handling
- ✅ Database changes automatically trigger updates
- ⚠️ Tied to Supabase (vendor lock-in)
- ⚠️ Less control over WebSocket behavior

**Rejected**:

- **Socket.IO**: Would require custom server setup, more infrastructure
- **Redis Pub/Sub**: Additional service to manage, more complexity

---

## ADR-002: State Management - No Global Store

**Status**: ✅ Accepted

**Decision**: Do not use Redux, Zustand, or any global state management library.

**Context**:

- Need to manage game state, player data, UI state
- Need real-time updates from Supabase
- Want to keep architecture simple

**Options Considered**:

1. **Redux Toolkit** - Global store with actions/reducers
2. **Zustand** - Lightweight global store
3. **React Context** - Feature-scoped state
4. **Local state + Subscriptions** - Component state + Supabase subscriptions

**Decision**:

- Chose **Local state + Subscriptions** because:
  - Real-time data comes from Supabase subscriptions
  - No need for global store when data is always fresh from database
  - Simpler mental model
  - Less boilerplate

**Consequences**:

- ✅ Simpler codebase (no store setup)
- ✅ Data always in sync with database
- ✅ Less state management complexity
- ⚠️ More prop drilling in some cases (mitigated with Context)
- ⚠️ No offline state management

**Rejected**:

- **Redux Toolkit**: Too much boilerplate for our use case
- **Zustand**: Not needed when data comes from subscriptions

---

## ADR-003: Server Actions over API Routes

**Status**: ✅ Accepted

**Decision**: Use Next.js Server Actions for all game logic instead of REST API routes.

**Context**:

- Need to handle game state transitions
- Need to validate permissions
- Need to update database

**Options Considered**:

1. **API Routes** - REST endpoints (`/api/*`)
2. **Server Actions** - Next.js server functions (`"use server"`)

**Decision**:

- Chose **Server Actions** because:
  - Type-safe (TypeScript)
  - Simpler (no route handlers)
  - Better integration with React components
  - Automatic request/response handling

**Consequences**:

- ✅ Type-safe function calls
- ✅ Simpler code (no route handlers)
- ✅ Better developer experience
- ⚠️ Less control over HTTP methods/status codes
- ⚠️ Not suitable for webhooks (still use API routes for those)

**Rejected**:

- **API Routes only**: More boilerplate, less type-safe

---

## ADR-004: Database Types - Generated Types Only

**Status**: ✅ Accepted

**Decision**: Always use generated types from `database.types.ts`, never create duplicate types.

**Context**:

- Need type safety for database operations
- Database schema changes frequently
- Want single source of truth

**Options Considered**:

1. **Manual types** - Define types manually
2. **Generated types** - Use `supabase gen types`
3. **Mixed** - Some manual, some generated

**Decision**:

- Chose **Generated types only** because:
  - Single source of truth (database schema)
  - Automatic updates when schema changes
  - Type safety guaranteed
  - Less maintenance

**Consequences**:

- ✅ Always in sync with database
- ✅ Type safety
- ✅ Less maintenance
- ⚠️ Must regenerate types after schema changes
- ⚠️ Generated types can be verbose

**Rejected**:

- **Manual types**: Would get out of sync with database
- **Mixed approach**: Confusing, inconsistent

---

## ADR-005: Video/Audio - LiveKit over Custom WebRTC

**Status**: ✅ Accepted

**Decision**: Use LiveKit for video/audio streaming instead of custom WebRTC implementation.

**Context**:

- Need video/audio communication between players
- Need role-based visibility control
- Need connection management

**Options Considered**:

1. **Custom WebRTC** - Build WebRTC implementation from scratch
2. **LiveKit** - Managed WebRTC service
3. **Agora** - Alternative managed service
4. **Twilio Video** - Alternative managed service

**Decision**:

- Chose **LiveKit** because:
  - Good React integration
  - Role-based visibility support (hidden participants)
  - Good documentation
  - Reasonable pricing

**Consequences**:

- ✅ Managed service (less infrastructure)
- ✅ Good React components
- ✅ Role-based visibility built-in
- ⚠️ External dependency
- ⚠️ Additional cost

**Rejected**:

- **Custom WebRTC**: Too complex, would take too long to build
- **Agora/Twilio**: Less suitable for our use case

---

## ADR-006: No Redis for Real-time Updates

**Status**: ✅ Rejected (Not Used)

**Decision**: Do not use Redis for real-time game state synchronization.

**Context**:

- Originally considered Redis for pub/sub
- Need to broadcast updates across server instances

**Why Rejected**:

- Supabase Realtime handles this automatically
- No need for additional infrastructure
- Simpler architecture

**Current Approach**:

- Supabase Realtime subscriptions handle all real-time updates
- Database changes automatically trigger subscriptions
- No Redis needed

---

## ADR-007: Component Organization - Feature-based

**Status**: ✅ Accepted

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

**Rejected**:

- **Type-based** (components/buttons, components/forms): Harder to find feature code

---

## ADR-008: Role Filtering - Server-side Only

**Status**: ✅ Accepted

**Decision**: Filter role information server-side, never send all roles to client.

**Context**:

- Role information is sensitive (game-breaking if leaked)
- Need to hide roles from non-teammates

**Implementation**:

- Roles stored in separate `game_player_roles` table (not in `game_players`)
- `getFilteredPlayerRoles()` server action in `src/lib/gamePlayerRoles/actions.ts`
- `usePlayerRoles` hook fetched ONCE at `GameRoomContext` level (not per participant)
- `usePlayerRolesListener` subscribes to role changes in real-time
- Teammates can see each other's roles:
  - Mafia team (DON, MAFIA, MAFIA_RIGHT_HAND) see each other
  - Yakuza team (YAKUZA, SHOGUN) see each other
- Host can see all roles
- Others cannot see roles (returned as `null`)

**Consequences**:

- ✅ Security (roles never leaked)
- ✅ Game integrity maintained
- ✅ Efficient (roles fetched once, not per participant)
- ✅ Real-time updates via Supabase subscription
- ⚠️ More server-side logic
- ⚠️ Must remember to filter in all queries

**Rejected**:

- **Client-side filtering**: Security risk, roles could be exposed
- **Per-participant role fetching**: Inefficient (N calls instead of 1)

---

## Summary

| Decision         | Status      | Key Technology              |
| ---------------- | ----------- | --------------------------- |
| Real-time        | ✅ Accepted | Supabase Realtime           |
| State Management | ✅ Accepted | Local state + Subscriptions |
| Server Actions   | ✅ Accepted | Next.js Server Actions      |
| Database Types   | ✅ Accepted | Generated types only        |
| Video/Audio      | ✅ Accepted | LiveKit                     |
| Redis            | ❌ Rejected | Not needed                  |
| Component Org    | ✅ Accepted | Feature-based               |
| Role Filtering   | ✅ Accepted | Server-side only            |
