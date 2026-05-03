# Frontend Guidelines

## React Conventions

### Component Structure

```typescript
"use client"; // Only if component uses hooks or browser APIs

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

export default function MyComponent({ gameId }: { gameId: Id<"games"> }) {
  // 1. Convex queries (reactive, real-time)
  const gameSession = useQuery(api.gameSessions.getByGame, { gameId });

  // 2. Convex mutations
  const startGame = useMutation(api.gameSessions.start);

  // 3. Local state
  const [isOpen, setIsOpen] = useState(false);

  // 4. Event handlers
  const handleStart = async () => {
    try {
      await startGame({ gameId });
    } catch (error) {
      console.error(error);
    }
  };

  // 5. Loading state
  if (gameSession === undefined) return <LoadingSpinner />;

  // 6. Render
  return <div>Phase: {gameSession?.gamePhase}</div>;
}
```

### Custom Hooks

**Location**: `src/hooks/`

**Purpose**: Extract reusable logic, data fetching, side effects

**Naming**: `use` prefix (e.g., `useGameSession`, `useLivekitRoom`)

**Pattern with Convex**:

```typescript
"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useGameSession(gameId: Id<"games">) {
  const session = useQuery(api.gameSessions.getByGame, { gameId });
  const start = useMutation(api.gameSessions.start);

  return { session, start };
}
```

**DO**:

- Use `useQuery` for reactive data (no `useEffect` needed)
- Use `useMutation` for write operations
- Use `"skip"` for conditional queries
- Extract complex query combinations into hooks

**DON'T**:

- Use `useEffect` for data subscriptions (Convex handles this)
- Create manual WebSocket/channel subscriptions
- Forget to handle `undefined` (loading) state from `useQuery`

### Component Organization

```
src/components/
├── providers/       # ConvexClientProvider
├── ui/              # Reusable UI primitives (buttons, modals, etc.)
├── game/            # Game-specific components
├── gameSession/     # Phase-specific host controls
├── auth/            # Authentication components
├── liveKit/         # LiveKit video components
├── participant/     # Participant video/state components
├── lobby/           # Lobby components
├── host-controls/   # Host-only UI
├── modals/          # Modal dialogs
└── video/           # Video-related components
```

### UI Components (shadcn/ui)

Located in `src/components/ui/`:

- `Modal.tsx` - Modal dialog
- `Drawer.tsx` - Side drawer
- `LoadingSpinner.tsx` - Loading indicator
- `Tooltip.tsx` - Tooltip component
- `PopupMenu.tsx` - Popup menu
- `ReadyButton.tsx` - Ready button component

**Usage**: Import and use these primitives, don't recreate them.

## State Management

### Convex Reactive Queries (Primary)

All server data comes from `useQuery` -- reactive, always in sync:

```typescript
const game = useQuery(api.games.getById, { gameId });
const players = useQuery(api.gamePlayers.listByGame, { gameId });
const session = useQuery(api.gameSessions.getByGame, { gameId });
```

### Local State (useState)

Use `useState` for UI-only state:

```typescript
const [isOpen, setIsOpen] = useState(false);
const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
```

### Context (useContext)

Use React Context for shared state within a feature:

```typescript
const { gameId, userId, isHost, gameSessionState } = useGameRoom();
```

**Location**: `src/lib/context/`

### No Global Store

**We do NOT use Redux, Zustand, or any global state management library.**

State is managed via:

- Convex reactive queries (`useQuery` for server data)
- Local component state (`useState` for UI state)
- React Context (for feature-scoped shared state)

## Styling

### TailwindCSS

Use Tailwind utility classes for styling:

```typescript
<div className="flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-900">
  <button className="px-4 py-2 bg-blue-500 text-white rounded">Click me</button>
</div>
```

### Dark Mode

Always support dark mode:

```typescript
className = "bg-white dark:bg-gray-900 text-gray-900 dark:text-white";
```

### Responsive Design

Use Tailwind responsive prefixes:

```typescript
className = "w-full sm:w-1/2 md:w-1/3 lg:w-1/4";
```

## Forms

### React Hook Form + Zod

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
});

export function CreateGameForm() {
  const createGame = useMutation(api.games.create);
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    try {
      await createGame({ name: data.name, type: "japanese_mafia" });
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("name")} />
      {errors.name && <span>{errors.name.message}</span>}
      <button type="submit">Create</button>
    </form>
  );
}
```

## Data Fetching

### Reactive Queries (Real-Time Data)

```typescript
"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function GameComponent({ gameId }: { gameId: Id<"games"> }) {
  const gameSession = useQuery(api.gameSessions.getByGame, { gameId });

  if (gameSession === undefined) return <LoadingSpinner />;

  return <div>Phase: {gameSession?.gamePhase}</div>;
}
```

### Conditional Queries

```typescript
// Only query when condition is met
const nightSession = useQuery(
  api.nightPhaseSessions.getCurrent,
  isNightPhase ? { gameId } : "skip"
);
```

### Mutations (Write Operations)

```typescript
"use client";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function StartGameButton({ gameId }: { gameId: Id<"games"> }) {
  const startGame = useMutation(api.gameSessions.start);

  const handleClick = async () => {
    try {
      await startGame({ gameId });
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Failed");
    }
  };

  return <button onClick={handleClick}>Start Game</button>;
}
```

## File Organization

### Component Files

- One component per file
- File name matches component name (PascalCase)
- Export default for main component
- Named exports for sub-components/types

### Utility Functions

**Location**: `src/lib/utils/`

**Pattern**: Named exports, pure functions

```typescript
// src/lib/utils/date.ts
export function formatDate(date: Date): string {
  // Implementation
}
```

**DON'T**: Define helper functions inside React components. Extract them to `src/lib/utils/`.

## TypeScript

### Type Imports

Use Convex generated types:

```typescript
import { Doc, Id } from "@/convex/_generated/dataModel";

const game: Doc<"games"> = ...;
const gameId: Id<"games"> = ...;
```

### Type Safety

- Use strict TypeScript
- Run `npx tsc` after changes
- Avoid `any` types
- Use type guards for runtime checks

### Component Props

```typescript
import { Id } from "@/convex/_generated/dataModel";

interface MyComponentProps {
  gameId: Id<"games">;
  userId: Id<"users">;
  onComplete?: () => void;
}

export function MyComponent({ gameId, userId, onComplete }: MyComponentProps) {
  // ...
}
```

## Auth Components

### Sign In / Sign Up

Use `useAuthActions()` from `@convex-dev/auth/react`:

```typescript
import { useAuthActions } from "@convex-dev/auth/react";

const { signIn, signOut } = useAuthActions();
```

### Auth State

```typescript
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";

<AuthLoading>Loading...</AuthLoading>
<Unauthenticated>Please sign in</Unauthenticated>
<Authenticated>Welcome!</Authenticated>
```

## Performance

### Memoization

Use `useMemo` and `useCallback` sparingly (only when needed):

```typescript
const expensiveValue = useMemo(() => computeExpensiveValue(data), [data]);
const handleClick = useCallback(() => doSomething(), [dependencies]);
```

### Code Splitting

Next.js App Router handles code splitting automatically. Use dynamic imports for heavy components:

```typescript
import dynamic from "next/dynamic";
const HeavyComponent = dynamic(() => import("./HeavyComponent"), {
  loading: () => <LoadingSpinner />,
});
```

## Time-Based UI (Timers, Progress Bars)

Any UI that subtracts a server-issued timestamp from "now" (voting
countdowns, speaker progress bar, farewell speech timer, etc.) MUST go
through `useServerTime()` from `@/lib/time/serverTime` instead of
`Date.now()` / `new Date()`.

```typescript
import { useServerTime } from "@/lib/time/serverTime";

const getServerTime = useServerTime();

const tick = () => {
  const elapsedMs = getServerTime() - new Date(serverStartIso).getTime();
};
```

`getServerTime()` returns `Date.now() + offsetMs`, where `offsetMs` is
captured at SSR from the Vercel Node clock. This makes timers correct
even when a user's device clock is wildly wrong.

Pure helpers should accept a `currentServerTimeMs: number` parameter
rather than calling `new Date()` internally. See
[server-time.md](./server-time.md) for the full pattern, exceptions
(pure local countdowns are fine to keep using `setInterval` deltas),
and the rationale.

## Best Practices

1. **Keep components small** - Break down large components
2. **Extract logic to hooks** - Don't put business logic in components
3. **Use TypeScript strictly** - Avoid `any`, use `Doc<>` and `Id<>` types
4. **Support dark mode** - Always include dark mode styles
5. **Handle loading states** - `useQuery` returns `undefined` while loading
6. **Handle errors** - Wrap `useMutation` calls in try/catch
7. **Use `"skip"` for conditional queries** - Not `enabled` flags
8. **Don't use `useEffect` for data** - Convex `useQuery` handles subscriptions
9. **Don't use `Date.now()` for timer math** - Use `useServerTime()` (see [server-time.md](./server-time.md))
