# Frontend Guidelines

## React Conventions

### Component Structure

```typescript
"use client"; // Only if component uses hooks or browser APIs

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function MyComponent() {
  // 1. Hooks
  const [state, setState] = useState(null);

  // 2. Effects
  useEffect(() => {
    // Side effects
  }, [dependencies]);

  // 3. Event handlers
  const handleClick = () => {
    // Handler logic
  };

  // 4. Render
  return <div>...</div>;
}
```

### Custom Hooks

**Location**: `src/hooks/`

**Purpose**: Extract reusable logic, data fetching, side effects

**Naming**: `use` prefix (e.g., `useGameSession`, `useLivekitRoom`)

**Pattern**:

```typescript
"use client";
import { useEffect } from "react";

export function useMyHook(
  param: string,
  setter: React.Dispatch<React.SetStateAction<State>>,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;
    // Hook logic
    return () => {
      // Cleanup
    };
  }, [param, enabled, setter]);
}
```

**✅ DO**:

- Extract data fetching into hooks
- Extract subscriptions into hooks
- Extract complex state logic into hooks
- Return cleanup functions from hooks

**❌ DON'T**:

- Put business logic directly in components
- Create hooks that only wrap useState
- Forget to clean up subscriptions/effects

### Component Organization

```
src/components/
├── ui/              # Reusable UI primitives (buttons, modals, etc.)
├── game/            # Game-specific components
├── auth/            # Authentication components
├── liveKit/         # LiveKit video components
└── modals/          # Modal dialogs
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

### Local State (useState)

Use `useState` for component-local state:

```typescript
const [isOpen, setIsOpen] = useState(false);
const [count, setCount] = useState(0);
```

### Context (useContext)

Use React Context for shared state within a feature:

```typescript
// Example: GameRoomContext
const { game, userId } = useGameRoom();
```

**Location**: `src/lib/context/`

### No Global Store

**We do NOT use Redux, Zustand, or any global state management library.**

State is managed via:

- Local component state (`useState`)
- React Context (for feature-scoped state)
- Supabase subscriptions (for real-time data)

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

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
});

export function MyForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    // Call server action
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("name")} />
      {errors.name && <span>{errors.name.message}</span>}
      <button type="submit">Submit</button>
    </form>
  );
}
```

## Data Fetching

### Server Actions

Call server actions from client components:

```typescript
"use client";
import { startGame } from "@/lib/gameSession/actions";

export function StartGameButton({ gameId }: { gameId: string }) {
  const handleClick = async () => {
    const result = await startGame(gameId);
    if (!result.ok) {
      console.error(result.message);
    }
  };

  return <button onClick={handleClick}>Start Game</button>;
}
```

### Real-time Subscriptions

Use custom hooks for subscriptions:

```typescript
"use client";
import { useGameSessionListener } from "@/hooks/useGameSessionListener";

export function GameComponent({ gameId }: { gameId: string }) {
  const [gameSession, setGameSession] = useState(null);

  useGameSessionListener(gameId, setGameSession, true);

  return <div>{gameSession?.game_phase}</div>;
}
```

## File Organization

### Component Files

- One component per file
- File name matches component name (PascalCase)
- Export default for main component
- Named exports for sub-components/types

### Utility Functions

**Location**: `src/lib/utils/` or `src/utils.ts`

**Pattern**: Named exports, pure functions

```typescript
// src/lib/utils/debounce.ts
export function debounce<T>(fn: T, delay: number) {
  // Implementation
}
```

**❌ DON'T**: Define helper functions inside React components

```typescript
// ❌ BAD
export function MyComponent() {
  const formatDate = (date: Date) => {
    // Helper function inside component
  };
  return <div>{formatDate(new Date())}</div>;
}

// ✅ GOOD
// src/lib/utils/date.ts
export function formatDate(date: Date): string {
  // Implementation
}

// Component
import { formatDate } from "@/lib/utils/date";
export function MyComponent() {
  return <div>{formatDate(new Date())}</div>;
}
```

## Assets

### Icons

**Location**: `src/assets/icons/`

**Pattern**: Export as React components

```typescript
// src/assets/icons/MicOn.tsx
export function MicOn() {
  return <svg>...</svg>;
}

// src/assets/icons/index.ts
export { MicOn } from "./MicOn";
export { MicOff } from "./MicOff";
```

**❌ DON'T**: Inline SVG markup in components

### Images

**Location**: `public/` for static images

## TypeScript

### Type Imports

Always use `database.types.ts` for database types:

```typescript
import { Tables } from "@/db/supabase/database.types";
const game: Tables<"games"> = ...;
```

### Type Safety

- Use strict TypeScript
- Run `npx tsc` after changes
- Avoid `any` types
- Use type guards for runtime checks

### Component Props

```typescript
// ✅ DO: Explicit prop types
interface MyComponentProps {
  gameId: string;
  userId: string;
  onComplete?: () => void;
}

export function MyComponent({ gameId, userId, onComplete }: MyComponentProps) {
  // ...
}
```

## Performance

### Memoization

Use `useMemo` and `useCallback` sparingly (only when needed):

```typescript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

const handleClick = useCallback(() => {
  doSomething();
}, [dependencies]);
```

### Code Splitting

Next.js App Router handles code splitting automatically. Use dynamic imports for heavy components:

```typescript
import dynamic from "next/dynamic";

const HeavyComponent = dynamic(() => import("./HeavyComponent"), {
  loading: () => <LoadingSpinner />,
});
```

## Best Practices

1. **Keep components small** - Break down large components
2. **Extract logic to hooks** - Don't put business logic in components
3. **Use TypeScript strictly** - Avoid `any`, use proper types
4. **Support dark mode** - Always include dark mode styles
5. **Handle loading states** - Show loading indicators
6. **Handle errors** - Display error messages to users
7. **Clean up subscriptions** - Always return cleanup from useEffect
8. **Use server actions** - Don't call Supabase directly from client (except subscriptions)
