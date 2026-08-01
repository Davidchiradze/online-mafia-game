# Architecture

## Stack Overview

### Frontend

- **Framework**: Next.js 15 with App Router
- **UI Library**: React 19
- **Styling**: TailwindCSS 4 + shadcn/ui components
- **State Management**: Convex reactive queries + local component state (no Redux/global store)
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React

### Backend

- **Database & Server Functions**: Convex (document DB + mutations/queries)
- **Authentication**: Convex Auth (`@convex-dev/auth` with Password + Resend OTP)
- **Real-time**: Convex reactive queries (guaranteed consistency)
- **Video/Audio**: LiveKit (WebRTC via LiveKit Server SDK)
- **Webhooks**: Next.js API Routes (LiveKit webhooks)

### Development

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with Next.js config
- **Type Generation**: Automatic via Convex (`convex/_generated/`)

## System Boundaries

### Client (Browser)

- React components and UI rendering
- Local state management (`useState`)
- Convex reactive queries (`useQuery` for real-time data)
- Convex mutations (`useMutation` for writes)
- LiveKit client (video/audio streaming)
- Form handling and validation

### Server (Convex)

- All game logic and state transitions (mutations)
- Database reads with access control (queries)
- Authentication via `getAuthUserId(ctx)`
- Role-based data filtering
- External API calls via `internalAction` (LiveKit token generation)

### Server (Next.js)

- Page routing and SSR
- Middleware for auth route protection
- API routes for webhooks (LiveKit)

### Data Flow

```
┌─────────────┐
│   Browser    │
│   (React)    │
└──────┬───────┘
       │
       │ 1. User Action (e.g., vote, start phase)
       │    calls useMutation(api.gameSessions.start)
       │
       ▼
┌──────────────────┐
│  Convex Mutation  │
│  (server-side)    │
└──────┬───────────┘
       │
       │ 2. Validate auth + permissions, write to DB
       │    (atomic transaction)
       │
       ▼
┌──────────────────┐
│    Convex DB     │
│ (document store)  │
└──────┬───────────┘
       │
       │ 3. Convex detects which queries read
       │    the changed data, re-runs them
       │
       ▼
┌──────────────────────────┐
│  All subscribed clients  │
│  useQuery auto-updates   │
│  (guaranteed delivery)   │
└──────────────────────────┘
```

## Directory Structure

```
convex/                          # All backend logic (deployed to Convex)
├── _generated/                  # Auto-generated types and API (DO NOT EDIT)
├── schema.ts                    # Database schema (imports tables/)
├── tables/                      # Table definitions (imported by schema.ts)
├── auth.config.ts               # Auth provider config (custom JWT bridge)
├── convex.config.ts             # Convex components config (presence, etc.)
├── auth/                        # Auth queries/mutations (profiles)
├── lobby/                       # Lobby: games CRUD, join requests, host transfer
├── games/                       # Game engine, split by variant
│   ├── core/                    #   shared engine (players, roles, sessions,
│   │                            #   dayPhase, nightPhase, voting, farewellSpeech)
│   ├── japanese/                #   Japanese Mafia variant (definition, phases)
│   ├── sports/                  #   Sports Mafia variant (definition, phases)
│   └── registry.ts              #   variant registry (getGameDefinition)
├── admin/                       # Admin/moderator queries (users, games, stats)
├── community/                   # Community chat (messages, read state)
├── crons.ts                     # Scheduled jobs (community prune, etc.)
├── presence.ts                  # Presence component wiring
├── migrations.ts                # One-off data migrations
├── lib/                         # Shared helpers (auth, access, constants, ratings)
└── refs/                        # makeFunctionReference wrappers (TS2589 workaround)

src/
├── app/                         # Next.js App Router pages (thin wrappers only)
│   ├── api/                     # API routes (LiveKit webhook, auth bridge)
│   ├── (headquarters)/          # Lobby, leaderboard, match history, subscriptions
│   ├── game/[id]/               # Game room page
│   └── layout.tsx               # Root layout (providers)
│
├── features/                    # Feature-first UI + hooks + feature-local lib
│   ├── admin/                   # Admin panel + analytics dashboard
│   ├── auth/                    # Auth components, hooks, middleware, JWT bridge
│   ├── game-room/               # The in-game experience (largest feature)
│   │   ├── components/          #   room/phase/actions/voting/participant/host/…
│   │   ├── context/             #   gameRoomContext (central room state)
│   │   ├── hooks/               #   game/participant/livekit hooks
│   │   ├── variants/            #   client rulesets: core/japanese/sports + registry
│   │   ├── assets/              #   role card PNGs
│   │   └── styles/              #   game.css
│   ├── headquarters/            # Authed shell: nav, community chat, match history
│   ├── landing/                 # Marketing landing page
│   ├── lobby/                   # Lobby content + room cards
│   └── subscriptions/           # Billing page + subscription config
│
├── providers/                   # App-level providers/bootstraps (Convex, ServerTime…)
├── i18n/                         # next-intl config
├── middleware.ts                # Next.js root middleware (composes auth middleware)
└── shared/                      # Cross-feature leaf modules (no upward deps)
    ├── ui/                      # Reusable UI primitives + icons
    ├── hooks/                   # Generic hooks (useInfiniteScroll)
    └── lib/                     # constants, game logic (visibility, speaking order),
                                 #   time (serverTime), env, livekit actions, cn, utils
```

## Key Architectural Patterns

### 1. Convex Mutations (Server-Side Logic)

All game state changes go through Convex mutations:

```typescript
// convex/gameSessions.ts
export const start = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    // Validate, update database
  },
});

// Frontend: useMutation(api.gameSessions.start)
```

### 2. Reactive Queries (Real-Time)

Convex `useQuery` provides guaranteed real-time sync:

```typescript
// Single line: fetches, subscribes, auto-updates, auto-cleans up
const gameSession = useQuery(api.gameSessions.getByGame, { gameId });
```

### 3. Type Safety

Use auto-generated Convex types:

```typescript
import { Doc, Id } from "@/convex/_generated/dataModel";

const game: Doc<"games"> = ...;
const gameId: Id<"games"> = ...;
```

### 4. Role-Based Data Filtering

Filter sensitive data in Convex queries (server-side):

```typescript
// convex/games/core/roles.ts - getFiltered query
// Returns roles filtered by team visibility
// Host sees all, teammates see each other, others see null
```

## Data Persistence

- **Primary Store**: Convex document database
- **Real-time Sync**: Convex reactive queries (guaranteed consistency)
- **No In-Memory State**: All game state is persisted in the database
- **Transactions**: Convex mutations are atomic (full success or full rollback)

## Authentication Flow

1. User signs up/signs in via Convex Auth (Password + Resend OTP)
2. Profile created in `profiles` table linked to `users` table
3. `convexAuthNextjsMiddleware` protects routes in `middleware.ts`
4. Convex functions authenticate via `getAuthUserId(ctx)`

## Deployment

- **Frontend**: Vercel (Next.js deployment)
- **Backend + Database**: Convex (managed service)
- **Video**: LiveKit (self-hosted or cloud)
- **Environment Variables**: `NEXT_PUBLIC_CONVEX_URL`, `AUTH_RESEND_KEY`, LiveKit credentials
