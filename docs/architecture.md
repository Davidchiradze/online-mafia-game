# Architecture

## Stack Overview

### Frontend

- **Framework**: Next.js 15 with App Router
- **UI Library**: React 19
- **Styling**: TailwindCSS 4 + shadcn/ui components
- **State Management**: React hooks + local component state (no Redux/global store)
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React

### Backend

- **Framework**: Next.js API Routes + Server Actions
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime (postgres_changes subscriptions)
- **Video/Audio**: LiveKit (WebRTC via LiveKit Server SDK)

### Development

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with Next.js config
- **Type Generation**: `supabase gen types` for database types

## System Boundaries

### Client-Server Boundary

**Client (Browser)**

- React components and UI rendering
- Local state management (useState, useEffect)
- Supabase client subscriptions (real-time listeners)
- LiveKit client (video/audio streaming)
- Form handling and validation

**Server (Next.js)**

- All game logic and state transitions
- Database operations (via Supabase Admin Client)
- Authentication checks
- LiveKit room management
- Role-based data filtering

### Data Flow

```
┌─────────────┐
│   Browser   │
│  (React)    │
└──────┬──────┘
       │
       │ 1. User Action (e.g., vote, start phase)
       │
       ▼
┌─────────────────┐
│  Server Action  │
│  ("use server") │
└──────┬──────────┘
       │
       │ 2. Validate & Update Database
       │
       ▼
┌─────────────┐
│  Supabase   │
│  PostgreSQL │
└──────┬──────┘
       │
       │ 3. Database Change Event
       │
       ▼
┌──────────────────────┐
│ Supabase Realtime   │
│ (postgres_changes)   │
└──────┬───────────────┘
       │
       │ 4. Real-time Update
       │
       ▼
┌─────────────┐
│   Browser   │
│ (Subscription)       │
└─────────────┘
```

## Directory Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (webhooks, auth callbacks)
│   ├── auth/              # Authentication pages
│   ├── lobby/             # Game lobby
│   ├── game/[id]/         # Game room page
│   └── layout.tsx          # Root layout
│
├── components/             # React components
│   ├── auth/              # Auth forms
│   ├── game/               # Game UI components
│   ├── gameSession/        # Phase-specific host controls
│   ├── host-controls/      # Host-only UI
│   ├── liveKit/            # LiveKit video components
│   ├── modals/             # Modal dialogs
│   ├── participant/        # Participant video components
│   ├── ui/                 # Reusable UI primitives
│   └── video/              # Video-related components
│
├── hooks/                  # Custom React hooks
│   ├── useGameSessionListener.ts    # Real-time game session
│   ├── useGamePlayerListener.ts      # Real-time player updates
│   ├── useGameHostSubscription.ts    # Host change listener
│   ├── useLivekitRoom.ts             # LiveKit room management
│   └── ...                 # Other hooks
│
├── lib/                    # Utility libraries
│   ├── auth/               # Auth actions & schemas
│   ├── constants/          # Game constants (phases, roles)
│   ├── context/            # React contexts
│   ├── game/               # Game logic (visibility, shuffle)
│   ├── gamePlayers/        # Player-related actions
│   ├── gameRoom/           # Game room actions
│   ├── gameSession/        # Game session actions
│   ├── liveKit/            # LiveKit server actions
│   ├── supabase/           # Supabase clients (server, client, admin)
│   └── utils/              # Utility functions
│
├── db/
│   └── supabase/
│       └── database.types.ts  # Generated database types (DO NOT EDIT)
│
└── types/
    └── game/
        └── type.ts          # Game-specific TypeScript types
```

## Key Architectural Patterns

### 1. Server Actions Pattern

All game state changes go through Next.js Server Actions:

```typescript
// ✅ DO: Use server actions
"use server";
export async function startGame(gameId: string) {
  // Validate, update database, return result
}

// ❌ DON'T: Direct client-side database writes
```

### 2. Real-time Subscriptions

Use Supabase `postgres_changes` subscriptions for real-time updates:

```typescript
// ✅ DO: Subscribe to database changes
const channel = supabase
  .channel(`game_session_${gameId}`)
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "game_sessions",
      filter: `game_id=eq.${gameId}`,
    },
    (payload) => {
      // Handle update
    }
  )
  .subscribe();
```

### 3. Type Safety

Always use generated database types:

```typescript
// ✅ DO: Use database types
import { Tables } from "@/db/supabase/database.types";
const game: Tables<"games"> = ...;

// ❌ DON'T: Create duplicate types
type Game = { id: string; name: string; ... };
```

### 4. Role-Based Data Filtering

Filter sensitive data server-side based on roles:

```typescript
// ✅ DO: Filter roles server-side
const filteredPlayers = filterPlayerRoles({
  allPlayers,
  requestingUserId,
  requestingRole,
  isHost,
});
```

## Data Persistence

- **Primary Store**: Supabase PostgreSQL database
- **Real-time Sync**: Supabase Realtime (postgres_changes)
- **No In-Memory State**: All game state is persisted in the database
- **No Redis**: Not used in this architecture

## Authentication Flow

1. User signs up/signs in via Supabase Auth
2. Profile created automatically in `profiles` table
3. Middleware checks auth on protected routes
4. Server actions verify user identity via `supabase.auth.getUser()`

## Deployment

- **Platform**: Vercel (Next.js deployment)
- **Database**: Supabase (hosted PostgreSQL)
- **Video**: LiveKit (external service)
- **Environment Variables**: Required for Supabase and LiveKit credentials
