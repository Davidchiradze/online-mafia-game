import { NextResponse } from "next/server";
import {
  IS_PROD,
  PHP_LOGOUT_REDIRECT_URL,
  PHP_SESSION_COOKIE_NAME,
} from "@/features/auth/lib/constants";
import { clearAuthCookie } from "@/features/auth/lib/cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/logout
 *
 * Unbinds the local `cnvx-auth` cookie and hands the browser to PHP's
 * own logout URL so the PHP session is destroyed server-side.
 *
 * Why redirect to PHP logout rather than PHP login: on prod, PHPSESSID
 * is scoped to mafia.ge and cannot be cleared from online.mafia.ge, so
 * clearing it here is a no-op. If we redirected straight to the login
 * page the still-valid PHP session would be re-bridged into a fresh JWT
 * (via the middleware -> /api/auth/bridge) and the user would land back
 * logged in — "never gets logged out". A top-level navigation to the
 * PHP logout URL carries PHPSESSID to mafia.ge, letting PHP tear the
 * session down before bouncing back to login.
 *
 * Used for both explicit user-initiated sign-out and as the recovery
 * target when Convex rejects a JWT for any reason.
 */
export async function GET() {
  const res = NextResponse.redirect(PHP_LOGOUT_REDIRECT_URL);
  clearAuthCookie(res);

  // Best-effort local PHPSESSID clear. Effective only when the cookie is
  // visible to this origin (same host, e.g. localhost across ports). On a
  // cross-origin prod setup the browser ignores this delete — the PHP
  // logout redirect above is what actually ends the session there.
  res.cookies.set({
    name: PHP_SESSION_COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
  });

  return res;
}

export const POST = GET;
