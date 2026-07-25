# Online Mafia Game - Claude Code

> **Read `/docs/README.md` before implementing features or fixing bugs.**

## Documentation Index

- **`/docs/README.md`** — Entry point (start here)
- **`/docs/architecture.md`** — Stack, boundaries, data flow
- **`/docs/realtime.md`** — Convex reactive queries (real-time)
- **`/docs/game-design.md`** — Mafia rules, phases, role visibility (Japanese variant)
- **`/docs/game-end-conditions.md`** — Auto win-detection rules
- **`/docs/game-types.md`** — Multi-variant architecture (`GameDefinition` registry, shared-core vs per-variant split, refactor plan)
- **`/docs/sports-mafia.md`** — Sports Mafia ruleset spec (10 players, 2 factions) as a diff from Japanese
- **`/docs/frontend.md`** — React / UI conventions
- **`/docs/backend.md`** — Server patterns
- **`/docs/authorization.md`** — Access roles (admin/moderator), permissions, `/admin` gating
- **`/docs/subscriptions.md`** — Subscription tiers, feature entitlements, gating create/join/spectate + game route
- **`/docs/community-chat.md`** — Global community chat channel + online sidebar (subscription-gated, soft-delete moderation, daily prune)
- **`/docs/game-broadcasts.md`** — Per-game notification channel (staff broadcasts + reusable system pushes) as one-time toasts to players + spectators
- **`/docs/admin-dashboard.md`** — Admin panel routes + analytics dashboard (KPIs, leaderboards, charts, presence)
- **`/docs/ranking-system.md`** — Player ELO rating + FACEIT-style Levels 1–10 (faction-calibrated payouts, level badges, leaderboards, backfill)
- **`/docs/server-time.md`** — Server-corrected client clock for timers
- **`/docs/testing.md`** — Vitest setup, pure-logic unit tests, CI, refactor regression oracle
- **`/docs/decisions.md`** — Architectural decisions (ADR)
- **`/docs/livekit-server.md`** — Self-hosted LiveKit VPS setup

## Core Stack

- **Framework**: Next.js 15 (App Router)
- **Database & Backend**: Convex (document DB + server functions)
- **Authentication**: Convex Auth (`@convex-dev/auth`) — custom JWT bridge to external PHP auth
- **Real-time**: Convex reactive queries (`useQuery` auto-updates)
- **Video/Audio**: LiveKit (WebRTC)
- **Styling**: TailwindCSS + shadcn/ui
- **Validation**: Zod (client), Convex validators (server)
- **Language**: TypeScript (strict mode)

## File Structure

```
/convex          — All backend logic (schema, mutations, queries, actions)
/src/app         — Next.js App Router pages (thin wrappers only)
/src/components  — React components (organized by feature)
/src/hooks       — Custom React hooks
/src/lib         — Utilities, constants, context
```

### Key files

- `convex/schema.ts` — Database schema (single source of truth)
- `src/lib/constants/game.ts` — Game phases, roles, statuses
- `src/lib/game/visibility.ts` — Role-based visibility logic (pure functions)
- `src/lib/time/serverTime.ts` — `useServerTime()` for server-corrected client clock
- `src/lib/context/gameRoomContext.tsx` — Central game room React context

## Key Principles

1. **All game logic in Convex**: `mutation` for writes, `query` for reads
2. **Reactive real-time**: `useQuery` auto-syncs — no manual subscriptions, no `useEffect`
3. **Type safety**: Use `Doc<"tableName">` and `Id<"tableName">` from `convex/_generated/dataModel`
4. **Auth in every function**: `getAuthUserId(ctx)` at the start of mutations/queries
5. **Transactional mutations**: Convex mutations are atomic
6. **Server-corrected time**: Use `useServerTime()` for any timer math against a server timestamp — never raw `Date.now()` (see `/docs/server-time.md`)
7. **Role-based visibility**: Game phase and role determine what players see

## What We Do NOT Use

- `"use server"` actions for game logic (use Convex mutations)
- `useEffect` for data subscriptions (use `useQuery`)
- Redux / Zustand (Convex reactive queries are the state)
- Socket.IO / Redis / custom WebRTC (use LiveKit)

## Testing

- **Vitest** (`npm test`, watch: `npm run test:watch`). Two tiers:
  - **Unit** — pure logic (win conditions, visibility, speaking order,
    role→faction, phases, role display, transition-graph spec) in `tests/`
    (`node` env).
  - **Integration** — DB-coupled engine (night authority, kill resolution, phase
    transitions + win check, role deal, promotion) via `convex-test` in
    `convex/tests/gameEngine.test.ts` (`edge-runtime` env; `*.test.ts` is ignored
    by the Convex bundler). See `/docs/testing.md` for conventions.
- These are **characterization tests**: they pin current behavior and act as the
  **regression oracle** for the game-types refactor. When moving modules, change
  only import paths — never the assertions (a forced change = a real regression).
- **CI** (`.github/workflows/tests.yml`) runs `npm run typecheck` + `npm test`
  on every push and PR. A local **pre-push** hook (`.githooks/pre-push`, wired by
  the `prepare` script) runs the same gate before a push; bypass with
  `git push --no-verify`.

## Before Implementing

1. Read the relevant `/docs` file
2. Check existing patterns in similar features
3. Use `Doc<"tableName">` types — don't invent new ones
4. Run `npx tsc` after changes to catch type errors
5. Run `npm test`; add/adjust unit tests when changing pure game logic
