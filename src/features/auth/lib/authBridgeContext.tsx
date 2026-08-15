"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isGuestViewablePath } from "@convex/lib/access";
import {
  AUTH_TOKEN_ENDPOINT,
  AUTH_TOKEN_REFRESH_ENDPOINT,
  LOGOUT_ENDPOINT,
} from "@/features/auth/lib/constants";

const TOKEN_ENDPOINT = AUTH_TOKEN_ENDPOINT;
const REFRESH_ENDPOINT = AUTH_TOKEN_REFRESH_ENDPOINT;

interface AuthBridgeState {
  /**
   * Tri-state cookie presence:
   * - `null`: still resolving the initial fetch
   * - `true`: `/api/auth/token` returned a non-null JWT (cookie present)
   * - `false`: cookie missing or empty
   */
  hasToken: boolean | null;
  isLoading: boolean;
  fetchAccessToken: (args: {
    forceRefreshToken: boolean;
  }) => Promise<string | null>;
}

const AuthBridgeContext = createContext<AuthBridgeState | null>(null);

async function fetchTokenFromEndpoint(): Promise<string | null> {
  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const { token } = (await res.json()) as { token: string | null };
    return token ?? null;
  } catch (err) {
    console.error("[auth] token endpoint fetch failed", err);
    return null;
  }
}

/**
 * Re-validates the PHP session and mints a fresh JWT. Returns the new
 * token on success. On failure (expired/invalid session, PHP unreachable)
 * the endpoint clears the auth cookie and this resolves to `null` — the
 * server doesn't know what page the caller is on, so the decision of what
 * happens next lives here: on a guest-viewable page, dropping the token is
 * enough (the app settles into guest state in place, no navigation);
 * anywhere else the session is genuinely dead, so we redirect to logout
 * rather than leave the page stuck half-authenticated.
 */
async function refreshTokenFromEndpoint(): Promise<string | null> {
  try {
    const res = await fetch(REFRESH_ENDPOINT, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
    const { token } = (await res.json()) as { token: string | null };
    if (token) return token;
    if (!isGuestViewablePath(window.location.pathname)) {
      window.location.replace(LOGOUT_ENDPOINT);
    }
    return null;
  } catch (err) {
    console.error("[auth] token refresh failed", err);
    if (!isGuestViewablePath(window.location.pathname)) {
      window.location.replace(LOGOUT_ENDPOINT);
    }
    return null;
  }
}

/**
 * Owns the JWT-fetching state shared between Convex's `useAuth` hook and
 * the auth-failure recovery component. Both need to know whether a JWT
 * is present in the cookie; lifting the state here lets a sibling
 * component see "we had a token but Convex rejected it" and react.
 *
 * The fetch itself targets `/api/auth/token`, which reads the httpOnly
 * `cnvx-auth` cookie server-side and echoes the JWT back to the browser.
 */
export function AuthBridgeProvider({ children }: { children: ReactNode }) {
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const tokenRef = useRef<string | null>(null);
  const inflightRef = useRef<Promise<string | null> | null>(null);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!forceRefreshToken && tokenRef.current) return tokenRef.current;
      if (inflightRef.current) return inflightRef.current;

      const fetcher = forceRefreshToken
        ? refreshTokenFromEndpoint
        : fetchTokenFromEndpoint;

      const promise = fetcher().then((token) => {
        tokenRef.current = token;
        inflightRef.current = null;
        setHasToken(token !== null);
        return token;
      });
      inflightRef.current = promise;
      return promise;
    },
    [],
  );

  useEffect(() => {
    void fetchAccessToken({ forceRefreshToken: false });
  }, [fetchAccessToken]);

  const value = useMemo<AuthBridgeState>(
    () => ({
      hasToken,
      isLoading: hasToken === null,
      fetchAccessToken,
    }),
    [hasToken, fetchAccessToken],
  );

  return (
    <AuthBridgeContext.Provider value={value}>
      {children}
    </AuthBridgeContext.Provider>
  );
}

export function useAuthBridge(): AuthBridgeState {
  const ctx = useContext(AuthBridgeContext);
  if (!ctx) {
    throw new Error(
      "useAuthBridge must be used inside <AuthBridgeProvider>. Check the provider hierarchy in ConvexClientProvider.",
    );
  }
  return ctx;
}
