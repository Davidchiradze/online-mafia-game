import { type NextRequest, NextResponse } from "next/server";
import { PHP_SESSION_COOKIE_NAME } from "@/features/auth/lib/constants";
import {
  clearAuthCookie,
  setBridgeAttemptCookie,
  isSafeRelativePath,
  setAuthCookie,
} from "@/features/auth/lib/cookies";
import { jwtMaxAgeSeconds, signConvexJwt } from "@/features/auth/lib/jwt";
import { phpLoginUrl } from "@/features/auth/lib/phpLogin";
import { fetchUserBySession } from "@/features/auth/lib/php";
import {
  AUTH_ERROR_PATH,
  isGuestViewablePath,
} from "@/features/auth/middleware/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/bridge?next=/somewhere
 *
 * Exchanges the caller's PHP session for a freshly-signed Convex JWT,
 * sets it as an httpOnly cookie, and redirects to the original
 * destination. Called by the middleware when a request has a PHP
 * session but no Convex JWT yet.
 */
export async function GET(req: NextRequest) {
  const nextParam = req.nextUrl.searchParams.get("next");
  const destination = isSafeRelativePath(nextParam) ? nextParam! : "/";

  const sessionId = req.cookies.get(PHP_SESSION_COOKIE_NAME)?.value;
  if (!sessionId) {
    const res = NextResponse.redirect(phpLoginUrl(destination));
    clearAuthCookie(res);
    return res;
  }

  try {
    const user = await fetchUserBySession(sessionId);
    if (!user) {
      // PHP hands a PHPSESSID to logged-out visitors too, so a null user here
      // is the normal guest case, not an error. Marking the attempt is load-
      // bearing, not an optimisation: without it, guest-viewable page ->
      // middleware -> bridge -> guest-viewable page -> middleware -> bridge
      // would repeat on every navigation.
      const target = isGuestViewablePath(destination)
        ? new URL(destination, req.nextUrl.origin)
        : new URL(AUTH_ERROR_PATH, req.nextUrl.origin);
      const res = NextResponse.redirect(target);
      setBridgeAttemptCookie(res);
      clearAuthCookie(res);
      return res;
    }

    const token = await signConvexJwt({ id: user.id });
    const redirectUrl = new URL(destination, req.nextUrl.origin);

    const res = NextResponse.redirect(redirectUrl);
    // Loop guard for middleware: if JWT cookie fails to stick, middleware
    // sees this short-lived marker and redirects to PHP login instead of
    // re-bouncing through /api/auth/bridge forever.
    setBridgeAttemptCookie(res);
    setAuthCookie(res, token, { maxAgeSeconds: jwtMaxAgeSeconds() });
    return res;
  } catch (err) {
    console.error("[auth/bridge] failed to bridge session", err);
    // PHP being unreachable/erroring is not the same as PHP saying "invalid
    // session" (the !user branch above), but a hard bounce to mafia.ge on a
    // guest-viewable page during a PHP outage is a dead end — degrade to
    // guest there too, same as an explicit invalid-session response would.
    if (isGuestViewablePath(destination)) {
      const res = NextResponse.redirect(new URL(destination, req.nextUrl.origin));
      setBridgeAttemptCookie(res);
      clearAuthCookie(res);
      return res;
    }
    const res = NextResponse.redirect(phpLoginUrl(destination));
    clearAuthCookie(res);
    return res;
  }
}
