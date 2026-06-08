import { NextResponse } from "next/server";
import {
  IS_PROD,
  PHP_LOGIN_REDIRECT_URL,
  PHP_SESSION_COOKIE_NAME,
} from "@/lib/auth/constants";
import { clearAuthCookie } from "@/lib/auth/cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/logout
 *
 * Clears all auth-related cookies this origin can see (`cnvx-auth`
 * always; `PHPSESSID` best-effort) and redirects the browser to the
 * PHP login page.
 *
 * Used for both explicit user-initiated sign-out and as the recovery
 * target when Convex rejects a JWT for any reason. Invalidating the
 * PHP session itself is the PHP app's job — we just unbind the local
 * cookies so the next page load forces a fresh bridge.
 */
export async function GET() {
  const res = NextResponse.redirect(PHP_LOGIN_REDIRECT_URL);
  clearAuthCookie(res);

  // Best-effort PHP session clear. Effective only when the cookie is
  // visible to this origin (same host / parent domain). On a cross-
  // origin setup (PHP on mafia.ge, Next.js on online.mafia.ge with
  // PHPSESSID scoped to mafia.ge), the browser ignores this delete.
  res.cookies.set({
    name: PHP_SESSION_COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
  });

  res.cookies.delete({
    name: PHP_SESSION_COOKIE_NAME,
  });

  return res;
}

export const POST = GET;
