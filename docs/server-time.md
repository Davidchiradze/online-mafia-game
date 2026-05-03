# Server Time on the Client

## TL;DR

Never compute elapsed time as `Date.now() - serverTimestamp` on the
client. Use `useServerTime()` from `src/lib/time/serverTime.ts` instead.

```ts
import { useServerTime } from "@/lib/time/serverTime";

const getServerTime = useServerTime();

const tick = () => {
  const elapsedMs = getServerTime() - new Date(serverStartIso).getTime();
};
```

## The bug we are preventing

Convex mutations write absolute server timestamps. For example
`convex/game/voting.ts` does:

```ts
await ctx.db.patch(id, { votingStartedAt: new Date().toISOString() });
```

The naive client computation is:

```ts
const startMs = new Date(votingStartedAt).getTime();
const elapsed = Date.now() - startMs; // BUG when device clock is wrong
```

If the user's OS clock is off (a real-world failure mode — incorrect
timezone configurations, manually-set clocks, drained CMOS batteries,
buggy "automatic time" on some Android devices), `Date.now()` does not
match the server's clock. Symptoms reported by users:

- Voting timer stuck at `30s` and never moves down.
- Voting timer instantly snaps to `0s`.
- Speaker progress bar (the "loader") freezes at 0% or 100%.

The bug is silent and only affects users with wrong device clocks, so
it is easy to miss in QA.

## Architecture

```
Vercel Server Component (RSC)
        |
        | initialServerTime = Date.now()    <-- correct, NTP-synced
        v
ServerTimeProvider (client)
        |
        | offsetMs = initialServerTime - Date.now()
        v
ServerTimeContext
        |
        v
useServerTime()  ->  getServerTime() returns Date.now() + offsetMs
```

- The Vercel Node runtime captures `Date.now()` at SSR.
- That value is passed as a prop into the client `ServerTimeProvider`.
- On mount, the provider measures the offset between the SSR time and
  the device's local clock.
- All timer code calls `getServerTime()` (= `Date.now() + offsetMs`),
  which yields server-corrected milliseconds even on a device with a
  wildly wrong clock.

A full page reload re-syncs the offset because SSR runs again. Within a
single session the offset stays constant — sufficient because device
clocks are typically *set* wrong (a static error), not *running* wrong
(rapid drift).

## Public API

`src/lib/time/serverTime.ts`:

| Symbol | When to use |
|---|---|
| `useServerTime(): () => number` | The default. Returns a stable `getServerTime()` you can call inside ticks, effects, or event handlers. |
| `useServerTimeOffset(): number` | Rare. When you need the raw offset as a number to pass through props or pure functions. |
| `ServerTimeContext` | Internal — exported only for the provider. |

`src/components/providers/ServerTimeProvider.tsx`:

| Symbol | Where |
|---|---|
| `<ServerTimeProvider initialServerTime={Date.now()}>` | Mounted once in `src/app/layout.tsx` (already done). |

## Rules

1. In any client component or hook that subtracts a server-issued
   timestamp from "now", use `useServerTime()`.
2. In pure helper functions (no React), accept a
   `currentServerTimeMs: number` parameter. The calling hook passes
   `getServerTime()` into it. Do **not** add a `= new Date()` default
   — that brings the device clock back through the side door.
3. Do **not** call `Date.now()` or `new Date()` for timer math in
   files under:
   - `src/hooks/**`
   - `src/components/**`
   - `src/lib/game/**` (and other shared timer helpers)

   Exceptions:
   - Pure interval-based countdowns that only subtract local
     `setInterval` ticks from each other (e.g. `useFoulSpeak`,
     `useFoulNotification`) are immune to clock skew. Leave them alone.
   - The host's "instant feedback" branch in `useVotingTimer` records
     a local `Date.now()` as the start and subtracts another local
     `Date.now()` later — both endpoints are local, so skew cancels.
     The server-timestamp branch in the same hook still uses
     `getServerTime()`.

## Example: pure helper + hook

```ts
// src/lib/game/speakingOrder.ts (pure)
export function calculateRemainingTime(
  speakerStartedAt: string | Date,
  maxSpeakingTimeMs: number,
  currentServerTimeMs: number,
): number {
  const startMs = new Date(speakerStartedAt).getTime();
  return Math.max(0, maxSpeakingTimeMs - (currentServerTimeMs - startMs));
}
```

```ts
// src/hooks/game/useSpeakingState.ts (consumer)
import { useServerTime } from "@/lib/time/serverTime";
import { calculateRemainingTime } from "@/lib/game/speakingOrder";

export function useSpeakingProgress(/* ... */) {
  const getServerTime = useServerTime();

  useEffect(() => {
    const tick = () => {
      const remaining = calculateRemainingTime(
        speakerStartedAt,
        duration,
        getServerTime(),
      );
      // ...
    };
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [/* ..., */ getServerTime]);
}
```

## Server-side timestamps are unaffected

Convex mutations like `new Date().toISOString()` in
`convex/game/voting.ts`, `convex/game/dayPhase.ts`,
`convex/game/farewellSpeech.ts` run on Convex's NTP-synced hosts and
are correct. Do not change them.

## Future extensions (not implemented yet)

If telemetry ever shows users on long-running sessions whose clocks
*drift* (rare — orders of seconds per day at worst), add an
`/api/time` Route Handler and have `ServerTimeProvider` re-measure
periodically (e.g. once a minute, with median-of-N samples for
RTT-compensated precision). Until then, the SSR-snapshot offset is
both simpler and sufficient.
