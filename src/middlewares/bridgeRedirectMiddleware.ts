import { NextResponse, type NextRequest } from "next/server";
import { middlewareConfig } from "./constants";
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

    return {
      next: NextResponse.redirect(middlewareConfig.phpLoginRedirectUrl),
      stop: true,
    };
  },
};
