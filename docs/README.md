# Online Mafia Game - Documentation

> **Always read this documentation before implementing features or fixing bugs.**

This documentation describes the architecture, patterns, and conventions used in the Online Mafia Game codebase. All AI agents and developers should consult these docs before making changes.

## Quick Start

1. **New to the codebase?** Start with [architecture.md](./architecture.md) for an overview
2. **Implementing a feature?** Check [frontend.md](./frontend.md) and [backend.md](./backend.md)
3. **Working with real-time updates?** Read [realtime.md](./realtime.md)
4. **Understanding game logic?** See [game-design.md](./game-design.md)
5. **Making architectural decisions?** Review [decisions.md](./decisions.md)

## Documentation Structure

- **[architecture.md](./architecture.md)** - Stack overview, system boundaries, data flow
- **[realtime.md](./realtime.md)** - Convex reactive queries (real-time updates)
- **[game-design.md](./game-design.md)** - Mafia game rules, phases, role visibility
- **[frontend.md](./frontend.md)** - React conventions, component patterns, UI guidelines
- **[backend.md](./backend.md)** - Convex mutations, queries, database patterns
- **[decisions.md](./decisions.md)** - Architectural Decision Records (ADRs)
- **[livekit-server.md](./livekit-server.md)** - Self-hosted LiveKit server (VPS setup, monitoring, maintenance)

## Core Principles

1. **Server-side authority**: All game logic runs in Convex mutations (server-side functions)
2. **Reactive real-time**: Convex `useQuery` auto-syncs UI with database -- guaranteed consistency
3. **Type safety**: Use `Doc<"tableName">` from `convex/_generated/dataModel` for all types
4. **Component composition**: Break down UIs into small, reusable components
5. **Custom hooks**: Extract data fetching and side effects into hooks under `src/hooks`
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
- `src/lib/constants/game.ts` - Game phases, roles, statuses
- `src/lib/game/visibility.ts` - Role-based visibility logic
- `src/lib/context/gameRoomContext.tsx` - Central game room React context
- `src/components/providers/ConvexClientProvider.tsx` - Convex client provider

## Before You Code

1. Read the relevant documentation file
2. Check existing patterns in similar features
3. Use `Doc<"tableName">` types, don't create new ones
4. Run `npx tsc` after changes to catch type errors
5. Follow component and hook patterns from existing code
