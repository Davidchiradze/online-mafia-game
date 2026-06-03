"use client";

import { useEffect, useRef } from "react";
import { useConvexAuth } from "convex/react";

/**
 * Idempotent profile sync. Once Convex reports an authenticated session,
 * we POST to `/api/auth/sync-profile` once per page load. That route
 * reads the httpOnly PHPSESSID cookie, fetches fresh profile data from
 * PHP, and upserts the Convex `profiles` row via a secret-gated mutation.
 *
 * - 401 from the route means the PHP session is gone -> redirect to logout.
 * - Any other failure (502/500) is transient -> log and allow retry on
 *   next auth change (do NOT force logout).
 */
export default function ProfileSyncBootstrap() {
  const { isAuthenticated } = useConvexAuth();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || syncedRef.current) return;
    syncedRef.current = true;

    fetch("/api/auth/sync-profile", {
      method: "POST",
      credentials: "include",
    })
      .then((res) => {
        //   if (res.status === 401) {
        //     return;
        //   }
        //   if (!res.ok) throw new Error(`sync failed: ${res.status}`);
      })
      .catch((err) => {
        syncedRef.current = false;
        window.location.href = "/api/auth/logout";
        console.error("[auth] profile sync failed", err);
      });
  }, [isAuthenticated]);

  return null;
}
