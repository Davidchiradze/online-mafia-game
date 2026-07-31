"use client";

import { useMemo } from "react";
import { useAuthBridge } from "@/features/auth/lib/authBridgeContext";

/**
 * Bridges Convex's `ConvexProviderWithAuth` to our cookie-backed JWT.
 *
 * The actual fetching/caching lives in `<AuthBridgeProvider>` so a
 * sibling component (`ConvexAuthFailureRedirect`) can also observe
 * whether a JWT cookie is present. This hook is a thin adapter that
 * shapes that state into the contract Convex's provider expects.
 *
 * `isAuthenticated: true` means "we have a JWT cookie"; whether Convex's
 * backend will accept it is a separate signal exposed via `useConvexAuth`.
 */
export function useAuthFromTokenEndpoint(): {
  isLoading: boolean;
  isAuthenticated: boolean;
  fetchAccessToken: (args: {
    forceRefreshToken: boolean;
  }) => Promise<string | null>;
} {
  const { isLoading, hasToken, fetchAccessToken } = useAuthBridge();

  return useMemo(
    () => ({
      isLoading,
      isAuthenticated: hasToken === true,
      fetchAccessToken,
    }),
    [isLoading, hasToken, fetchAccessToken],
  );
}
