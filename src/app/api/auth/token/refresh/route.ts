import { type NextRequest, NextResponse } from "next/server";
import { PHP_SESSION_COOKIE_NAME } from "@/features/auth/lib/constants";
import { clearAuthCookie, setAuthCookie } from "@/features/auth/lib/cookies";
import { jwtMaxAgeSeconds, signConvexJwt } from "@/features/auth/lib/jwt";
import { fetchUserBySession } from "@/features/auth/lib/php";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/token/refresh
 *
 * Silent JWT refresh: validates the caller's PHP session, mints a fresh
 * Convex JWT, sets it as the httpOnly cookie, and returns it in the body.
 *
 * Called by the Convex auth bridge when `forceRefreshToken` is true
 * (i.e. the previous JWT expired and Convex requested a new one).
 *
bef * On any failure (missing/invalid PHP session, PHP API error), clears the
 * auth cookie and returns `{ token: null }`. This endpoint doesn't know
 * which page the caller is on, so it only reports the outcome — what
 * happens next (drop to guest on a guest-viewable page, or redirect to
 * logout anywhere else) is decided client-side in `authBridgeContext.tsx`.
 */
export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get(PHP_SESSION_COOKIE_NAME)?.value;
  if (!sessionId) {
    const res = NextResponse.json(
      { token: null },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
    clearAuthCookie(res);
    return res;
  }

  try {
    const user = await fetchUserBySession(sessionId);
    if (!user) {
      const res = NextResponse.json(
        { token: null },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
      clearAuthCookie(res);
      return res;
    }

    const token = await signConvexJwt({ id: user.id });

    const res = NextResponse.json(
      { token },
      { headers: { "Cache-Control": "no-store" } },
    );
    setAuthCookie(res, token, { maxAgeSeconds: jwtMaxAgeSeconds() });
    return res;
  } catch (err) {
    console.error("[auth/token/refresh] failed", err);
    const res = NextResponse.json(
      { token: null },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
    clearAuthCookie(res);
    return res;
  }
}
