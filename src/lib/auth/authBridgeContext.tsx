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
import { AUTH_TOKEN_ENDPOINT } from "@/lib/auth/constants";

const TOKEN_ENDPOINT = AUTH_TOKEN_ENDPOINT;

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

      const promise = fetchTokenFromEndpoint().then((token) => {
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
