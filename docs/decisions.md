# Architectural Decision Records (ADR)

This document records important architectural decisions, including what was chosen and why, and what was rejected.

## ADR-001: Real-time Communication - Convex Reactive Queries

**Status**: Accepted

**Decision**: Use Convex reactive queries (`useQuery`) for all real-time updates.

**Rationale**:

- Guaranteed consistency (queries return current state, not change events)
- Automatic reconnection with full state catch-up
- No manual subscription setup or cleanup
- Single `useQuery` call handles fetch + subscribe + re-render
- No `useEffect` or channel management needed

**Rejected**:

- **Socket.IO**: Would require custom server, event-based (risk of missed events)
- **Ably**: Pub/sub only, needs separate DB + reconciliation logic

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

## ADR-003: Convex Mutations for Server Logic

**Status**: Accepted

**Decision**: Use Convex mutations for all game logic.

**Rationale**:

- Atomic transactions (all writes succeed or all rollback)
- Single `ctx.db` for all operations (no separate admin client)
- Type-safe with auto-generated API (`api.games.create`)
- Mutations automatically trigger reactive query updates
- Built-in auth via `getAuthUserId(ctx)`
- Frontend uses `useMutation(api.x.y)` with try/catch error handling

---

## ADR-004: Database Types - Convex Auto-Generated

**Status**: Accepted

**Decision**: Use auto-generated types from `convex/_generated/dataModel`.

**Rationale**:

- `Doc<"tableName">` and `Id<"tableName">` are always in sync with schema
- No manual regeneration needed (auto-generated on `npx convex dev`)
- Type-safe validators (`v.id("games")`) in function args

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

**Status**: Accepted

**Decision**: Use Convex Auth (`@convex-dev/auth`) with Password provider and Resend OTP.

**Rationale**:

- Integrated with Convex (same platform as database)
- `getAuthUserId(ctx)` in Convex functions (no separate auth check)
- `convexAuthNextjsMiddleware` for route protection
- Password provider with Resend OTP for email verification
- Custom forms using `useAuthActions()`
- Profile data stored in separate `profiles` table (app-level identity)

**Rejected**:

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

**Status**: Accepted

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

## ADR-009: Database - Convex Document Database

**Status**: Accepted

**Decision**: Use Convex as the database and backend platform.

**Rationale**:

- Reactive queries guarantee frontend is always in sync with DB
- All-in-one platform (database + server functions + auth + real-time)
- Atomic transactions
- Simpler architecture (no separate admin client, no RLS, no subscription cleanup)
- Document model works well for game state (nested objects, arrays)
- Foreign keys use `v.id("tableName")` references
- `_creationTime` is automatic on every document

---

## Summary

| Decision | Key Technology |
|---|---|
| Real-time | Convex reactive queries |
| State Management | Convex queries + local state |
| Server Logic | Convex mutations |
| Database Types | Convex auto-generated (`Doc<>`) |
| Video/Audio | LiveKit |
| Authentication | Convex Auth |
| Component Org | Feature-based |
| Role Filtering | Server-side (Convex queries) |
| Database | Convex (document DB) |
