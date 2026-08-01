# Online Mafia Game - Documentation

> **Always read this documentation before implementing features or fixing bugs.**

This documentation describes the architecture, patterns, and conventions used in the Online Mafia Game codebase. All AI agents and developers should consult these docs before making changes.

## Quick Start

1. **New to the codebase?** Start with [architecture.md](./architecture.md) for an overview
2. **Implementing a feature?** Check [frontend.md](./frontend.md) and [backend.md](./backend.md)
3. **Working with real-time updates?** Read [realtime.md](./realtime.md)
4. **Understanding game logic?** See [game-design.md](./game-design.md)
   - **Adding / changing a game variant?** Read [game-types.md](./game-types.md)
     (multi-variant architecture) and [sports-mafia.md](./sports-mafia.md).
5. **Adding roles, permissions, or the admin panel?** Read [authorization.md](./authorization.md)
6. **Gating features by paid subscription?** Read [subscriptions.md](./subscriptions.md)
7. **Writing or running tests?** See [testing.md](./testing.md)
8. **Making architectural decisions?** Review [decisions.md](./decisions.md)

## Documentation Structure

- **[architecture.md](./architecture.md)** - Stack overview, system boundaries, data flow
- **[realtime.md](./realtime.md)** - Convex reactive queries (real-time updates)
- **[game-design.md](./game-design.md)** - Mafia game rules, phases, role visibility (Japanese variant)
- **[game-end-conditions.md](./game-end-conditions.md)** - Auto win-detection rules (when a game ends automatically)
- **[game-types.md](./game-types.md)** - Multi-variant architecture: the `GameDefinition` registry, shared-core vs per-variant split, and the phased refactor plan for supporting more than one variant
- **[sports-mafia.md](./sports-mafia.md)** - Sports Mafia ruleset spec (10 players, 2 factions), defined as a diff from Japanese
- **[frontend.md](./frontend.md)** - React conventions, component patterns, UI guidelines
- **[backend.md](./backend.md)** - Convex mutations, queries, database patterns
- **[authorization.md](./authorization.md)** - Access roles (admin/moderator), permissions, `/admin` route gating
- **[subscriptions.md](./subscriptions.md)** - Subscription tiers, feature entitlements, and gating create/join/spectate + the game route
- **[community-chat.md](./community-chat.md)** - Global community chat channel + online sidebar (subscription-gated, soft-delete moderation, daily prune)
- **[game-broadcasts.md](./game-broadcasts.md)** - Per-game notification channel (staff broadcasts + reusable system pushes) delivered as one-time toasts to players + spectators
- **[admin-dashboard.md](./admin-dashboard.md)** - Admin panel routes + the analytics dashboard (KPIs, leaderboards, charts, presence)
- **[ranking-system.md](./ranking-system.md)** - Player ELO rating + FACEIT-style Levels 1-10 (faction-calibrated payouts, level badges, leaderboards, backfill)
- **[server-time.md](./server-time.md)** - Server-corrected client clock (use `useServerTime()` for any timer math involving a server timestamp)
- **[testing.md](./testing.md)** - Vitest setup, pure-logic unit tests, testing tiers, CI, and the game-types refactor regression oracle
- **[decisions.md](./decisions.md)** - Architectural Decision Records (ADRs)
- **[livekit-server.md](./livekit-server.md)** - Self-hosted LiveKit server (VPS setup, monitoring, maintenance)

### Not current

- **[archive/](./archive/)** - Completed migration narratives, frozen at the date in each filename. Historical only; paths are deliberately pre-migration.
- **[proposals/](./proposals/)** - Designed but unbuilt. Do not assume any of it exists.

## Core Principles

1. **Server-side authority**: All game logic runs in Convex mutations (server-side functions)
2. **Reactive real-time**: Convex `useQuery` auto-syncs UI with database -- guaranteed consistency
3. **Type safety**: Use `Doc<"tableName">` from `convex/_generated/dataModel` for all types
4. **Component composition**: Break down UIs into small, reusable components
5. **Custom hooks**: Extract data fetching and side effects into hooks — `src/features/<feature>/hooks/` when feature-specific, `src/shared/hooks/` when used by two or more features
6. **Role-based visibility**: Game phase and role determine what players can see (video/UI)

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Database & Backend**: Convex (document DB + server functions)
- **Authentication**: Convex Auth (`@convex-dev/auth` with Password + Resend OTP)
- **Real-time**: Convex reactive queries (`useQuery` auto-updates)
- **Video/Audio**: LiveKit (WebRTC)
- **Styling**: TailwindCSS + shadcn/ui
- **Validation**: Zod (client-side), Convex validators (server-side)
- **Language**: TypeScript (strict mode)

## Key Files to Know

- `convex/schema.ts` - Database schema (all tables, indexes, types)
- `convex/_generated/dataModel.d.ts` - Auto-generated types (`Doc<>`, `Id<>`)
- `convex/_generated/api.d.ts` - Auto-generated API (`api.games.create`, etc.)
- `src/shared/lib/constants/game.ts` - Game phases, roles, statuses
- `src/shared/lib/game/visibility.ts` - Role-based visibility logic
- `src/features/game-room/context/gameRoomContext.tsx` - Central game room React context
- `src/providers/ConvexClientProvider.tsx` - Convex client provider

## Before You Code

1. Read the relevant documentation file
2. Check existing patterns in similar features
3. Use `Doc<"tableName">` types, don't create new ones
4. Run `npx tsc` after changes to catch type errors
5. Run `npm test` (add/adjust unit tests when changing pure game logic) — see [testing.md](./testing.md)
6. Follow component and hook patterns from existing code
