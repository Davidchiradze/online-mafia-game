"use client";

import { useEffect, useRef } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { authProfiles } from "@convex/refs/lobby";

/**
 * Idempotent profile sync. Once Convex reports an authenticated session,
 * we call `auth.profiles.syncCurrentProfile` once per page load to mirror
 * the latest PHP-backed JWT claims into the Convex `profiles` row.
 *
 * Runs as a leaf client component (renders null) and lives inside
 * `ConvexClientProvider`. We can't perform this from middleware (Edge
 * runtime, no Convex client) and we can't perform it inside the bridge
 * route (no Convex auth context, no React lifecycle). The client-side
 * bootstrap is the safest production-ready spot.
 */
export default function ProfileSyncBootstrap() {
  const { isAuthenticated } = useConvexAuth();
  const syncProfile = useMutation(authProfiles.syncCurrentProfile);
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || syncedRef.current) return;
    syncedRef.current = true;
    syncProfile({}).catch((err) => {
      syncedRef.current = false;
      console.error("[auth] profile sync failed", err);
    });
  }, [isAuthenticated, syncProfile]);

  return null;
}
