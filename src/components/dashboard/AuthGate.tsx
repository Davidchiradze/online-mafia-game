"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { authProfiles } from "@convex/refs/lobby";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

/**
 * Renders its children only once the current user's profile is available.
 *
 * `currentProfile` returns `null` in BOTH unsettled states — no JWT identity
 * yet (auth bootstrap) and identity-present-but-profile-not-synced — and only
 * resolves to an object once the profile exists. Gating on a non-null profile
 * therefore guarantees every query inside the subtree that calls
 * `getAuthenticatedUser` will find both an identity AND a profile, so it can't
 * throw "Not authenticated" or "Profile not found".
 *
 * Route protection itself is handled upstream by middleware + the provider's
 * `ConvexAuthFailureRedirect`; this only smooths the client-side timing window.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const profile = useQuery(authProfiles.currentProfile);
  const tc = useTranslations("common");

  // undefined = query loading; null = not authenticated / profile not synced.
  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner message={tc("loading")} />
      </div>
    );
  }

  return <>{children}</>;
}
