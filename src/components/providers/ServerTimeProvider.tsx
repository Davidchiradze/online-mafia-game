"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ServerTimeContext } from "@/lib/time/serverTime";

/**
 * Fetches the server clock via `GET /api/time` on mount and computes
 * the device-vs-server offset. Immune to SSR caching, static
 * optimisation, and preview-vs-prod differences because the offset is
 * always measured with a fresh round-trip at runtime.
 *
 * The offset stays constant for the session — sufficient for timer math
 * because device clocks are typically *set* wrong (a static error), not
 * *running* wrong (drift). A full page reload re-syncs.
 *
 * See `src/lib/time/serverTime.ts` for consumer hooks
 * (`useServerTime`, `useServerTimeOffset`).
 */
export default function ServerTimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [serverTimeOffsetMs, setServerTimeOffsetMs] = useState(0);

  useEffect(() => {
    const before = Date.now();
    fetch("/api/time", { cache: "no-store" })
      .then((r) => r.json())
      .then(({ t }: { t: number }) => {
        const rtt = Date.now() - before;
        setServerTimeOffsetMs(t + Math.round(rtt / 2) - Date.now());
      })
      .catch(() => {
        // Fetch failed — offset stays 0 (device clock fallback).
      });
  }, []);

  return (
    <ServerTimeContext.Provider value={{ serverTimeOffsetMs }}>
      {children}
    </ServerTimeContext.Provider>
  );
}
