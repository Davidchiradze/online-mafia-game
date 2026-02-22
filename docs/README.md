# Online Mafia Game - Documentation

> **⚠️ IMPORTANT: Always read this documentation before implementing features or fixing bugs.**

This documentation describes the architecture, patterns, and conventions used in the Online Mafia Game codebase. All AI agents and developers should consult these docs before making changes.

## Quick Start

1. **New to the codebase?** Start with [architecture.md](./architecture.md) for an overview
2. **Implementing a feature?** Check [frontend.md](./frontend.md) and [backend.md](./backend.md)
3. **Working with real-time updates?** Read [realtime.md](./realtime.md)
4. **Understanding game logic?** See [game-design.md](./game-design.md)
5. **Making architectural decisions?** Review [decisions.md](./decisions.md)

## Documentation Structure

- **[architecture.md](./architecture.md)** - Stack overview, system boundaries, data flow
- **[realtime.md](./realtime.md)** - Supabase real-time subscriptions and patterns
- **[game-design.md](./game-design.md)** - Mafia game rules, phases, role visibility
- **[frontend.md](./frontend.md)** - React conventions, component patterns, UI guidelines
- **[backend.md](./backend.md)** - Server actions, API routes, database patterns
- **[decisions.md](./decisions.md)** - Architectural Decision Records (ADRs)
- **[livekit-server.md](./livekit-server.md)** - Self-hosted LiveKit server (VPS setup, monitoring, maintenance)

## Core Principles

1. **Server-side authority**: All game logic runs server-side via Next.js Server Actions
2. **Real-time via Supabase**: Use Supabase `postgres_changes` subscriptions for real-time updates
3. **Type safety**: Always use `database.types.ts` for database types, avoid hardcoded types
4. **Component composition**: Break down UIs into small, reusable components
5. **Custom hooks**: Extract data fetching and side effects into hooks under `src/hooks`
6. **Role-based visibility**: Game phase and role determine what players can see (video/UI)

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Database & Auth**: Supabase (PostgreSQL + Auth)
- **Real-time**: Supabase Realtime (postgres_changes subscriptions)
- **Video/Audio**: LiveKit (WebRTC)
- **Styling**: TailwindCSS + shadcn/ui
- **Validation**: Zod
- **Language**: TypeScript (strict mode)

## Key Files to Know

- `src/db/supabase/database.types.ts` - Generated database types (always use these)
- `src/lib/constants/game.ts` - Game phases, roles, statuses
- `src/lib/game/visibility.ts` - Role-based visibility logic
- `src/lib/gameSession/actions.ts` - Game session server actions
- `src/hooks/useGameSessionListener.ts` - Real-time game session subscription
- `src/hooks/useGamePlayerListener.ts` - Real-time player updates subscription

## Before You Code

1. ✅ Read the relevant documentation file
2. ✅ Check existing patterns in similar features
3. ✅ Use `database.types.ts` types, don't create new ones
4. ✅ Run `npx tsc` after changes to catch type errors
5. ✅ Follow component and hook patterns from existing code
