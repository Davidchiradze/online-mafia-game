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
- `getFiltered` query in `convex/games/core/roles.ts` filters by team visibility
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

## ADR-010: Authorization - Convex-owned Roles & Permission-based RBAC

**Status**: Accepted

**Decision**: App-level access control uses a single Convex-owned role per user
(`user`/`moderator`/`admin`) mapped to permissions; authorization is enforced
authoritatively in Convex functions; the `/admin` route is gated in layers.

**Context**:

- Going to production with real users; need an `/admin` panel and staff roles
- `profiles.role` existed but was a free-form string overwritten by the PHP sync
- "Role" already means two other things here (in-game roles, PHP account roles)

**Decision**:

- **Source of truth** is Convex `profiles.role` — unrelated to PHP `accounts.role`
  (no longer synced) and to in-game roles (`gamePlayerRoles`)
- **Single role enum per user**; permissions derived via a role→permission map.
  Roles/permissions/route policy live in one file, `convex/lib/access.ts`, because
  `convex/` is the authoritative gate and `src/` can import it (one-way boundary)
- **Layered route protection**: middleware = authenticated-only; `/admin` layout =
  redirect non-admins (UX); Convex `requirePermission(...)` = authoritative
- Role is **not** put in the JWT (see Rejected); admin actions write an audit log

**Consequences**:

- One place to add a role/permission; checks read role live from Convex (no staleness)
- Brief `/admin` shell flash possible for non-admins, but no privileged data loads
  (every admin function enforces `requirePermission`)
- See [authorization.md](./authorization.md) for the full spec

**Rejected**:

- **Role claim in the JWT**: would let middleware hard-block at the edge, but a
  promote/demote wouldn't take effect until the token refreshes (staleness)
- **Direct role checks at call sites** (`if role === "admin"`): doesn't scale to new
  roles; permission checks decouple capability from role
- **PHP-owned roles**: admin/moderator are app concepts, not account/billing concepts

---

## ADR-011: Folder Structure — Feature-first `src/`, variant-keyed `convex/games/`

**Status**: Accepted (in progress — folder-structure migration)

**Decision**: Reorganize the repository so a newcomer learns exactly one rule:
*"find the feature, then pick `components`/`hooks`/`lib`; shared things are in
`shared/`; the backend lives in `convex/games/`."*

**Context**:

- `convex/game/` (15 feature mutation files) and `convex/games/` (the variant
  registry) were one letter apart with completely different jobs. Game UI was
  scattered across six sibling `components/` folders with no inferable rule
  (`MafiaKillButton` in `components/game/` but `MafiaKillControl` in
  `components/participant/`). Three directory naming conventions (kebab, camel,
  flat) coexisted, so no path could be typed from memory.

**Target layout**:

```
convex/games/{core,japanese,sports}/     ← backend, keyed by variant (Phase 1, done)
src/
├── app/  middleware.ts  i18n/            ★ immovable (framework/next-intl coupled)
├── providers/                            root-layout composition
├── features/
│   ├── auth/  subscriptions/  lobby/  headquarters/  admin/  game-room/  landing/
│   │        each: components/, hooks/, lib/ (+ feature-specific subdirs)
└── shared/  ui/ (+ ui/icons/)  hooks/  lib/ (cn, format, constants, game, …)
```

`tsconfig.json`/`vitest.config.mts` need no change — `@/*` → `./src/*` already
resolves `@/features/*` and `@/shared/*`.

**Absolute constraint**: **zero behavior change** — file moves and import-path
updates only. Exactly two deviations from "pure move", both path-only:
`src/lib/utils.ts` → `shared/lib/cn.ts`, and directory kebab-casing (component
filenames stay PascalCase; hooks stay `useXxx.ts`).

**Sanctioned cross-feature edges** (kept intentionally; splitting them would be a
logic refactor, which this migration forbids):

1. `lobby → headquarters` — `LobbyContent` imports `RatingCard` (a named export
   sharing a file with `StatsHeader`).
2. `game-room → lobby` — `GameRoomHeader` imports `CreateGameModal`.

Edges the migration *removes*: `admin → dashboard` (`format.ts` → `shared/`) and
`game → landing` (`LandingLogo` → `shared/`).

**Runtime value cycle — preserve byte-for-byte**: `gameRoomContext ⇄ registry ⇄
ruleset ⇄ nightActionsDisplay ⇄ useGameRoom` is a real ESM value cycle that works
only because the back-edge is called at render, not module-eval. **No new
`index.ts` barrels**, and **no import reordering** (an import landing above a
`"use client"` directive silently converts a Client Component to a Server
Component). The whole SCC lands inside `features/game-room/`.

**`src/game/` (variant UI) → `features/game-room/variants/`**: it has ~33 edges
into game-room components, sits inside the runtime SCC, and has zero importers
outside game-room + tests — so it is game-room's *interior*, not a shared layer.
Sequenced last so disagreeing costs one `git revert`.

**Rejected**:

- **Type-first folders** (`components/`, `hooks/`, `lib/` at the root) — the
  status quo; gives no locality and no inferable path.
- **Barrels to tidy imports** — would risk `Cannot access 'X' before
  initialization` inside the live render-time cycle, invisible to tsc and CI.

**Consequences**: one navigation sentence; every later codemod in the migration
becomes a pure path-prefix swap once cross-directory `../` imports are normalized
to `@/`. See
[archive/folder-migration-2026-08.md](./archive/folder-migration-2026-08.md).

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
| Authorization | Convex-owned roles + permission-based RBAC |
| Folder Structure | Feature-first `src/features/*` + `src/shared/*`; variant-keyed `convex/games/*` |
