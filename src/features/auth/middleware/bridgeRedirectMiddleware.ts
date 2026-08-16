import { NextResponse } from "next/server";
import { isGuestViewablePath, middlewareConfig } from "./constants";
import type { NextComposableMiddleware } from "./types";

export const bridgeRedirectMiddleware: NextComposableMiddleware = {
  matcher: () => true,
  middleware: async ({ request }) => {
    const { pathname, search } = request.nextUrl;

    const hasPhpSession = !!request.cookies.get(
      middlewareConfig.phpSessionCookieName,
    )?.value;
    const alreadyBridged = !!request.cookies.get(
      middlewareConfig.bridgeAttemptCookieName,
    )?.value;

    if (hasPhpSession && !alreadyBridged) {
      const bridge = new URL("/api/auth/bridge", request.nextUrl.origin);
      bridge.searchParams.set("next", pathname + search);
      return {
        next: NextResponse.redirect(bridge),
        stop: true,
      };
    }

    // Terminal verdict. Guest-viewable product pages render read-only
    // instead of bouncing to the auth wall; everything else stays
    // authenticated-only. No PHP session and no recent bridge attempt means
    // there is nothing left to try — this is a guest.
    if (isGuestViewablePath(pathname)) {
      return { stop: true };
    }

    const authErrorUrl = new URL(
      middlewareConfig.authErrorPath,
      request.nextUrl.origin,
    );
    authErrorUrl.searchParams.set("next", pathname + search);
    return {
      next: NextResponse.redirect(authErrorUrl),
      stop: true,
    };
  },
};
