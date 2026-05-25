import { NextResponse, type NextRequest } from "next/server";
import { middlewareConfig } from "./constants";
import type { NextComposableMiddleware } from "./types";

export const jwtCookieMiddleware: NextComposableMiddleware = {
  matcher: (request: NextRequest) => {
    return !!request.cookies.get(middlewareConfig.convexAuthCookieName)?.value;
  },
  middleware: async ({ request }) => {
    const res = NextResponse.next();

    // Success path: clear stale loop-guard marker if present.
    if (request.cookies.get(middlewareConfig.bridgeAttemptCookieName)?.value) {
      res.cookies.set({
        name: middlewareConfig.bridgeAttemptCookieName,
        value: "",
        httpOnly: true,
        secure: middlewareConfig.isProd,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
    }

    return {
      next: res,
      stop: true,
    };
  },
};
