"use client";

import { useMemo } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { authProfiles } from "@convex/refs/lobby";

export type ViewerProfile = NonNullable<
  FunctionReturnType<typeof authProfiles.currentProfile>
>;

export type Viewer =
  | {
      status: "loading";
      profile: undefined;
      isLoading: true;
      isGuest: false;
      isMember: false;
    }
  | {
      status: "syncing";
      profile: null;
      isLoading: true;
      isGuest: false;
      isMember: false;
    }
  | {
      status: "guest";
      profile: null;
      isLoading: false;
      isGuest: true;
      isMember: false;
    }
  | {
      status: "member";
      profile: ViewerProfile;
      isLoading: false;
      isGuest: false;
      isMember: true;
    };

const LOADING: Viewer = {
  status: "loading",
  profile: undefined,
  isLoading: true,
  isGuest: false,
  isMember: false,
};
const SYNCING: Viewer = {
  status: "syncing",
  profile: null,
  isLoading: true,
  isGuest: false,
  isMember: false,
};
const GUEST: Viewer = {
  status: "guest",
  profile: null,
  isLoading: false,
  isGuest: true,
  isMember: false,
};

/**
 * FOUR states, not three. `currentProfile` returns `null` for BOTH a
 * signed-out visitor AND an authenticated user whose profile row has not
 * been written yet (`ProfileSyncBootstrap` POSTs `/api/auth/sync-profile`
 * only after Convex reports authenticated). Only `guest` is terminal —
 * `loading` and `syncing` both still resolve, and a subtree that renders
 * during `syncing` will throw `PROFILE_SYNC_REQUIRED` from any query that
 * calls `getAuthenticatedUser` / `getAuthenticatedProfile`.
 *
 * `profile` is present on EVERY arm on purpose: `viewer.profile?.nickname`
 * compiles with no narrowing, so the ergonomic path and the correct path are
 * the same path. Narrow on `status`, or on the boolean-literal flags, when a
 * branch is needed.
 *
 * Any `useQuery` whose Convex handler calls `getAuthenticatedUser` /
 * `getAuthenticatedProfile` / `require*` must pass `"skip"` unless
 * `viewer.isMember` — otherwise it throws for a guest or during the sync
 * window.
 *
 * The result is referentially stable across renders that don't change
 * `profile`/`authLoading`/`isAuthenticated` (the three non-member states are
 * frozen singletons; the member state is memoized) — safe as a `useEffect` /
 * `useMemo` dependency.
 */
export function useViewer(): Viewer {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const profile = useQuery(authProfiles.currentProfile);

  return useMemo(() => {
    if (profile === undefined || authLoading) return LOADING;
    // A settled profile outranks any auth-flag flicker.
    if (profile) {
      return {
        status: "member",
        profile,
        isLoading: false,
        isGuest: false,
        isMember: true,
      };
    }
    return isAuthenticated ? SYNCING : GUEST;
  }, [profile, authLoading, isAuthenticated]);
}
