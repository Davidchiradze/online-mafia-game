"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NOT_VERIFIED_PATH } from "@convex/lib/access";
import { useViewer } from "@/features/auth/hooks/useViewer";

/**
 * Global guard that keeps unverified PHP accounts out of the app. The PHP
 * verification state (`status_id`) is synced into `profiles.verified` on every
 * profile sync; when it is `false`, we navigate to `/auth/not-verified`.
 *
 * UX, not security: the authoritative boundary stays server-side (game-entry
 * mutations guard via `requireFeature`/`requirePermission`). This just stops an
 * unverified user from sitting on app pages they can't use.
 *
 * Mounted as a sibling of `<ProfileSyncBootstrap />` in the root layout.
 */
export default function VerificationGate() {
  const viewer = useViewer();
  const router = useRouter();
  const pathname = usePathname();
  const redirectedRef = useRef(false);

  useEffect(() => {
    // Not settled yet (loading/syncing), or a guest with no profile to check
    // -> never redirect.
    if (!viewer.isMember) return;
    if (viewer.profile.verified !== false) return;
    if (pathname === NOT_VERIFIED_PATH) return;
    if (redirectedRef.current) return;

    redirectedRef.current = true;
    router.replace(NOT_VERIFIED_PATH);
  }, [viewer, pathname, router]);

  return null;
}
