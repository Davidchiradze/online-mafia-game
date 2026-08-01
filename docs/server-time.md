# Server Time on the Client

## TL;DR

Never compute elapsed time as `Date.now() - serverTimestamp` on the
client. Use `useServerTime()` from `src/shared/lib/time/serverTime.ts` instead.

```ts
import { useServerTime } from "@/shared/lib/time/serverTime";

const getServerTime = useServerTime();

const tick = () => {
  const elapsedMs = getServerTime() - new Date(serverStartIso).getTime();
};
```

## The bug we are preventing

Convex mutations write absolute server timestamps. For example
`convex/games/core/voting.ts` does:

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
Client mount
        |
        | fetch("/api/time")  -->  Vercel Node runtime  -->  { t: Date.now() }
        |                                                         |
        | before = Date.now()                                     |
        |<--------------------------------------------------------|
        | rtt = Date.now() - before
        | offsetMs = t + rtt/2 - Date.now()
        v
ServerTimeProvider
        |
        v
ServerTimeContext
        |
        v
useServerTime()  ->  getServerTime() returns Date.now() + offsetMs
```

- On mount, `ServerTimeProvider` sends `GET /api/time` to the Vercel
  Node runtime. The route returns `{ t: Date.now() }` with
  `force-dynamic` and `Cache-Control: no-store`, so the value is always
  fresh.
- The provider compensates for network round-trip by assuming the
  server timestamp was captured halfway through the RTT (`rtt / 2`).
- All timer code calls `getServerTime()` (= `Date.now() + offsetMs`),
  which yields server-corrected milliseconds even on a device with a
  wildly wrong clock.

This approach is immune to SSR caching, static optimisation, and
preview-vs-prod deployment differences because the offset is always
measured with a live round-trip at runtime.

A full page reload re-syncs the offset. Within a single session the
offset stays constant — sufficient because device clocks are typically
*set* wrong (a static error), not *running* wrong (rapid drift).

## Public API

`src/shared/lib/time/serverTime.ts`:

| Symbol | When to use |
|---|---|
| `useServerTime(): () => number` | The default. Returns a stable `getServerTime()` you can call inside ticks, effects, or event handlers. |
| `useServerTimeOffset(): number` | Rare. When you need the raw offset as a number to pass through props or pure functions. |
| `ServerTimeContext` | Internal — exported only for the provider. |

`src/providers/ServerTimeProvider.tsx`:

| Symbol | Where |
|---|---|
| `<ServerTimeProvider>` | Mounted once in `src/app/layout.tsx` (already done). Fetches server time via `/api/time` on mount. |

## Rules

1. In any client component or hook that subtracts a server-issued
   timestamp from "now", use `useServerTime()`.
2. In pure helper functions (no React), accept a
   `currentServerTimeMs: number` parameter. The calling hook passes
   `getServerTime()` into it. Do **not** add a `= new Date()` default
   — that brings the device clock back through the side door.
3. Do **not** call `Date.now()` or `new Date()` for timer math in
   files under:
   - `src/features/**/hooks/**`
   - `src/features/**/components/**`
   - `src/shared/lib/game/**` (and other shared timer helpers)

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
// src/shared/lib/game/speakingOrder.ts (pure)
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
// src/features/game-room/hooks/game/useSpeakingState.ts (consumer)
import { useServerTime } from "@/shared/lib/time/serverTime";
import { calculateRemainingTime } from "@/shared/lib/game/speakingOrder";

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
`convex/games/core/voting.ts`, `convex/games/core/dayPhase.ts`,
`convex/games/core/farewellSpeech.ts` run on Convex's NTP-synced hosts and
are correct. Do not change them.

## Future extensions (not implemented yet)

If telemetry ever shows users on long-running sessions whose clocks
*drift* (rare — orders of seconds per day at worst), have
`ServerTimeProvider` re-measure periodically (e.g. once a minute,
with median-of-N samples for improved RTT-compensated precision).
Until then, the single fetch-on-mount offset is both simpler and
sufficient.
