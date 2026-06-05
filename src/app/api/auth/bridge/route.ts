import { type NextRequest, NextResponse } from "next/server";
import {
  PHP_LOGIN_REDIRECT_URL,
  PHP_SESSION_COOKIE_NAME,
} from "@/lib/auth/constants";
import {
  clearAuthCookie,
  setBridgeAttemptCookie,
  isSafeRelativePath,
  setAuthCookie,
} from "@/lib/auth/cookies";
import { jwtMaxAgeSeconds, signConvexJwt } from "@/lib/auth/jwt";
import { fetchUserBySession } from "@/lib/auth/php";
import { AUTH_ERROR_PATH } from "@/middlewares/constants";

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
    const res = NextResponse.redirect(PHP_LOGIN_REDIRECT_URL);
    clearAuthCookie(res);
    return res;
  }

  try {
    const user = await fetchUserBySession(sessionId);
    if (!user) {
      const res = NextResponse.redirect(
        new URL(AUTH_ERROR_PATH, req.nextUrl.origin),
      );
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
    const res = NextResponse.redirect(PHP_LOGIN_REDIRECT_URL);
    clearAuthCookie(res);
    return res;
  }
}
