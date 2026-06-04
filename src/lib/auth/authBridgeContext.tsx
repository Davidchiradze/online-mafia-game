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
import {
  AUTH_TOKEN_ENDPOINT,
  AUTH_TOKEN_REFRESH_ENDPOINT,
} from "@/lib/auth/constants";

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
 * token on success. On failure (expired session, server error) the
 * endpoint clears the auth cookie and signals logout — we immediately
 * redirect to the logout route so the user doesn't sit in a broken state.
 */
async function refreshTokenFromEndpoint(): Promise<string | null> {
  try {
    const res = await fetch(REFRESH_ENDPOINT, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });

    const data = (await res.json()) as {
      token: string | null;
      logout?: boolean;
    };

    if (data.logout) {
      window.location.replace("/api/auth/logout");
      return null;
    }

    if (!res.ok) return null;
    return data.token ?? null;
  } catch (err) {
    console.error("[auth] token refresh failed", err);
    window.location.replace("/api/auth/logout");
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
