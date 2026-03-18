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
├── schema.ts                    # Database schema (tables, indexes)
├── tables/                      # Table definitions (imported by schema.ts)
├── auth.ts                      # Convex Auth configuration
├── auth.config.ts               # Auth provider config
├── http.ts                      # HTTP routes (auth endpoints)
├── ResendOTP.ts                 # Email OTP verification
├── ResendOTPPasswordReset.ts    # Password reset OTP
├── auth/                        # Auth queries/mutations (profiles)
├── lobby/                       # Lobby: games CRUD, join requests, host transfer
├── game/                        # Game: players, spectators, roles, sessions,
│                                #   dayPhase, nightPhase, voting, farewellSpeech
├── lib/                         # Shared helpers (auth, constants, speakingOrder)
└── refs/                        # makeFunctionReference wrappers (TS2589 workaround)

src/
├── app/                         # Next.js App Router pages
│   ├── api/                     # API routes (LiveKit webhook)
│   ├── (auth)/                  # Authentication pages (sign-in, sign-up)
│   ├── lobby/                   # Game lobby
│   ├── game/[id]/               # Game room page
│   └── layout.tsx               # Root layout (Convex providers)
│
├── components/                  # React components
│   ├── providers/               # ConvexClientProvider
│   ├── auth/                    # Auth forms (SignInForm, SignUpForm)
│   ├── game/                    # Game UI components
│   ├── gameSession/             # Phase-specific host controls
│   ├── host-controls/           # Host-only UI
│   ├── liveKit/                 # LiveKit video components
│   ├── modals/                  # Modal dialogs
│   ├── participant/             # Participant video components
│   ├── ui/                      # Reusable UI primitives
│   └── video/                   # Video-related components
│
├── hooks/                       # Custom React hooks
│   ├── game/                    # Game logic hooks
│   ├── livekit/                 # LiveKit hooks
│   └── participant/             # Participant state hooks
│
└── lib/                         # Utility libraries
    ├── constants/               # Game constants (phases, roles)
    ├── context/                 # React contexts (GameRoomContext)
    ├── game/                    # Game logic (visibility, speaking order)
    ├── liveKit/                 # LiveKit server actions (token, room mgmt)
    └── utils/                   # Utility functions
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
// convex/gamePlayerRoles.ts - getFiltered query
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
