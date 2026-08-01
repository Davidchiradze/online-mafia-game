"use client";

import { useEffect, useRef } from "react";
import { useConvexAuth } from "convex/react";
import { useAuthBridge } from "@/features/auth/lib/authBridgeContext";
import { LOGOUT_ENDPOINT } from "@/features/auth/lib/constants";

/**
 * Recovers from a Convex JWT validation failure for any reason —
 * missing kid, bad signature, issuer/audience mismatch, expired token,
 * unreachable JWKS, etc. The failure mode is always the same from the
 * client's perspective: a JWT cookie is present, but Convex reports
 * `useConvexAuth().isAuthenticated === false`.
 *
 * When that combination is observed we navigate to `/api/auth/logout`,
 * which clears `cnvx-auth` (and best-effort the PHP session cookie) and
 * 302s to `PHP_LOGIN_REDIRECT_URL`. Without this, a stale/bad JWT would
 * leave the app stuck in an unauthenticated state with no UI affordance
 * to recover.
 *
 * Mounted as a sibling under `<ConvexProviderWithAuth>` (so
 * `useConvexAuth` is available) and inside `<AuthBridgeProvider>` (so
 * we can see whether a JWT cookie was actually present).
 */
export default function ConvexAuthFailureRedirect() {
  const { hasToken, isLoading: bridgeLoading } = useAuthBridge();
  const { isLoading: convexLoading, isAuthenticated: convexAuthenticated } =
    useConvexAuth();
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (triggeredRef.current) return;
    if (bridgeLoading || convexLoading) return;
    if (hasToken !== true) return;
    if (convexAuthenticated) return;

    triggeredRef.current = true;
    console.warn(
      "[auth] Convex rejected the JWT — clearing auth cookies and redirecting to PHP login",
    );
    window.location.replace(LOGOUT_ENDPOINT);
  }, [bridgeLoading, convexLoading, hasToken, convexAuthenticated]);

  return null;
}
