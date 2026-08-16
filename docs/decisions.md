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
- A single place to authenticate every call — today
  `getAuthenticatedUser(ctx)` (see ADR-006, superseded)
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

**Status**: ⚠️ **SUPERSEDED** — auth is now a custom JWT bridge to an external
PHP service. `@convex-dev/auth` is **not a dependency** and `getAuthUserId` does
**not exist** in this repo. Use `getAuthenticatedUser(ctx)` from
`convex/lib/auth.ts` (90 call sites); see [authorization.md](./authorization.md).

> Kept as the record of what was originally chosen and why it changed. Everything
> below describes a system this codebase no longer has — do not write code
> against it.

**Original decision**: Use Convex Auth (`@convex-dev/auth`) with Password provider and Resend OTP.

**Original rationale**:

- Integrated with Convex (same platform as database)
- `getAuthUserId(ctx)` in Convex functions — **this API no longer exists here**
- `convexAuthNextjsMiddleware` for route protection
- Password provider with Resend OTP for email verification
- Custom forms using `useAuthActions()`
- Profile data stored in separate `profiles` table (app-level identity)

**Why it changed**: accounts live in an existing external PHP system, which owns
registration, verification and payments. Duplicating identity in Convex would
have meant two sources of truth for who a user is. Convex now trusts a signed
JWT minted by that service; `profiles` remains the app-level identity row, and
`profiles.role` is Convex-owned and deliberately **not** synced from PHP.

**Rejected at the time**:

- **NextAuth/Auth.js standalone**: Would add another service; Convex Auth is simpler

---

## ADR-007: Component Organization - Feature-based

**Status**: ⚠️ **SUPERSEDED by ADR-011.** The intent — organize by feature, not
by type — survived; the layout below did not. `src/components/` was dissolved
entirely. Current layout: `src/features/<feature>/{components,hooks,lib}` plus
`src/shared/{ui,hooks,lib}`, described in [AGENTS.md](../AGENTS.md) and enforced
by `tests/structure/conventions.test.ts`.

> Kept for the reasoning. **None of the directories below exist.**

**Original decision**: Organize components by feature/domain, not by type.

**Original structure** (dissolved):

```
components/
├── game/              # Game-related components
├── auth/              # Auth-related components
├── liveKit/           # LiveKit-related components
├── ui/                # Reusable UI primitives
└── modals/            # Modal dialogs
```

**Rationale** (still holds, and is why ADR-011 went further):

- Easier to find related components
- Better code organization
- Clearer boundaries

**Why it changed**: grouping by feature *inside* a global `components/` still
left six sibling folders with no inferable rule — `MafiaKillButton` lived in
`components/game/` while `MafiaKillControl` lived in `components/participant/`.
ADR-011 moved the boundary up: a feature owns its components, hooks and lib
together, and only genuinely shared things live in `shared/`.

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
- Teammates can see each other's roles. **Which roles form a team is
  variant-specific** — read `definition.teams`, never a hardcoded list. Japanese
  has two teams (mafia and yakuza); Sports has one.
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

## ADR-012: Rules that exist in code are generated into docs

**Status**: Accepted

**Decision**: Anything derivable from the game definitions —
roles, deck counts, factions, phase order, transition graphs, win outcomes,
night resolution — is **generated** into `docs/generated/game-spec.md`. Prose
docs keep only what a generator cannot produce: rationale, decisions, and
behaviour that is genuinely narrative.

**Context**:

The rules were written down twice: as data in `convex/games/*`, and as prose
across four documents. Only the prose could rot, and it did. Measured before
the change:

- The role roster appeared **four times** and the copies disagreed.
  `game-design.md` said `MAFIA (3x)` and `CITIZEN (2x)`; the deck holds two and
  five.
- The phase list appeared three times with three different counts.
- `game-design.md` stated a naive-parity win rule. Enumerating every reachable
  alive-roster shows **81 of 280 Japanese cases where parity gives the wrong
  answer** — it would end games above `N = 6`, which the real rules forbid.

None of this was catchable. Markdown is not compiled.

**Consequences**:

- The disagreement is now unrepresentable rather than merely fixed.
- `npm test` fails when a rule changes and the spec is not regenerated, so a
  rules change and its documentation land in the same commit.
- The generator iterates the registry, so a new variant is documented
  automatically.
- Cost: the spec is a build artefact in git. `docs/generated/**` must never be
  hand-edited; a test asserts the DO-NOT-EDIT banner.

**Rejected**:

- **A `scripts/*.mjs` generator.** CI pins Node 20, which cannot import
  TypeScript. It would need `tsx` or a Node bump. Running under Vitest reuses the
  existing transform and aliases, and `toMatchFileSnapshot` provides the drift
  guard for free.
- **Fixing the prose by hand.** It would have been correct for exactly as long
  as it took someone to change a rule.

---

## ADR-013: Docs mirror the engine/variant code seam, enforced by a firewall

**Status**: Accepted

**Decision**: Documentation is split the same way the code is.
`docs/engine/` describes mechanism true for every variant;
`docs/variants/<id>/` describes one variant's rules. A test derives the
variant-specific vocabulary **from the registry** and fails if any of it appears
under `docs/engine/`. A second test fails if a registered variant has no doc.

**Context**:

The project shipped with one variant, so its docs were written as if Japanese
Mafia were simply "the game". When `sports_mafia` was added, nothing noticed
that `game-end-conditions.md` — generic title, cited from shared-engine files —
described three factions, a `SHOGUN` and a `DOCTOR` that Sports does not have.
`city_mafia` is already reserved in the `GameType` union, so this would have
happened again.

The seam was already latent in how code cited that doc: five of its six
citations came from shared-engine files wanting to know *when* the win check
runs, and exactly one from `games/japanese/winConditions.ts` wanting the
algorithm.

**Consequences**:

- Adding a variant is additive. Registering it fails the build until its doc
  exists, so documentation is a step that cannot be forgotten.
- A rule that cannot be stated without naming a variant's role is, by
  construction, in the wrong file — and CI says so.
- The banned vocabulary is derived, not hardcoded, so it stays correct as
  variants change.
- Cost: one deliberate exemption. `variant-architecture.md` may name variant
  vocabulary because comparing variants is its subject; the exemption is
  explicit and checked for staleness.

**Rejected**:

- **Splitting `variant-architecture.md` and `sports.md` by mechanic.** 32 of the
  former's citations and 42 of the latter's carry a `§N` anchor. Renaming a file
  is a path-only edit; renumbering its sections is a 74-site change with no
  compiler help. They were moved, never renumbered.

---

## ADR-014: One ladder and one record per variant, calibrated per variant

**Status**: Accepted (2026-08-16)

**Decision**: Every game variant has its **own** rating, peak, leaderboard and
player record, the way chess.com separates time controls. A result in one
variant moves nothing in another. Each rated variant supplies its own
calibration through `RATING_CONFIG[gameType]`, covering exactly its own
factions, and may derive that calibration differently: `japanese_mafia`
**measures** its faction win rates from its archive and recalibrates on a
cadence; `sports_mafia` **declares** a symmetric `E = 0.50` and never
recalibrates. The formula shape, the table-strength term, the level brackets and
the seams stay shared.

**Context**:

`playerRatings` was already keyed by `(playerId, gameType)`, so the ladders were
separate by construction — but only one variant was ever rated, so everything
downstream quietly assumed a single one: `RATING_CONFIG.deltas` requires all
three of Japanese's factions, `playerStats` is one global row per player, and
both the profile stats query and the leaderboard page name `japanese_mafia`
literally. Rating Sports surfaces all of it at once, and two more variants are
expected.

Sports also has no calibration data and, by this decision, never will need any:
a two-faction game declared balanced needs no measurement, which is what lets it
be rated on day one instead of after ~200 games.

**Consequences**:

- Adding a rated variant is a config entry plus a `docs/variants/<id>/rating.md`,
  not a code path. The contract is written down in `docs/ranking-system.md` §13.
- Payouts must cover a variant's **own** factions, so `deltas` stops being a
  total record over the global faction union. A variant that introduces a new
  faction still needs a schema change, and that is now stated rather than
  discovered.
- The record splits too: `playerStats` becomes per `(playerId, gameType)`, which
  retires the leaderboard's "global W/L beside a per-variant ELO" caveat and
  stops `roleStats` from summing roles that exist in different games.
- Level brackets stay shared, which converts into a constraint on every future
  calibration: K must land in the same volatility band (≈38–40 std per game) or
  the same Level number means different things on different ladders.
- Sports' declared `E` will be wrong if the variant turns out unbalanced, and
  nothing detects that automatically. Accepted knowingly; the risk and the exit
  are recorded in the variant's rating doc.
- Backfill becomes a per-variant decision. Sports is **not** backfilled — the
  games were played as unrated — and the existing migration, which selects by
  "has a config", must be scoped before it is ever run again.

**Rejected**:

- **A single global rating across variants.** Simplest, and wrong: it would
  price a Sports result with Japanese's faction calibration and let skill at one
  game rank a player at another.
- **Seeding a new ladder from an existing one.** Tempting for retention, but it
  imports an assumption (that the variants measure the same skill) that the
  separate calibrations explicitly deny. Everyone starts a new ladder at 1000.
- **Waiting for ~200 decided Sports games before rating it** (the original
  plan). Correct-by-construction, but it leaves the variant permanently second
  class: unrated games attract fewer players, which is what keeps the sample
  from arriving.

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
| Game rules in docs | Generated from the definitions into `docs/generated/` |
| Doc layout | Mirrors the engine/variant code seam, enforced by a vocabulary firewall |
| Ranking | One ELO ladder and one player record per variant, calibrated per variant |
