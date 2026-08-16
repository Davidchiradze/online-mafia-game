import { type NextRequest, NextResponse } from "next/server";
import {
  clearAuthCookie,
  clearBridgeAttemptCookie,
  isSafeRelativePath,
} from "@/features/auth/lib/cookies";
import { phpLoginUrl } from "@/features/auth/lib/phpLogin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/login?next=/lobby
 *
 * Entry point for the sign-in flow. Every sign-in affordance points here
 * rather than straight at mafia.ge, because *starting* a login has to
 * invalidate the `bridge_attempted` cooldown first.
 *
 * That cookie caches the verdict "this PHPSESSID has no user" for
 * BRIDGE_ATTEMPT_TTL_SECONDS, so a browsing guest doesn't re-hit PHP on every
 * navigation. Logging in is precisely the event that falsifies it — and the
 * round trip through mafia.ge is far shorter than the TTL. Without this hop
 * the visitor returns holding a freshly-valid session, the middleware sees
 * the stale marker, skips the bridge, no JWT is ever minted, and they land
 * back on the page as a guest: the sign-in button appears to do nothing.
 *
 * A plain `<a href>` can't clear that cookie itself — it's httpOnly — which
 * is the whole reason this lives on our origin instead of in the markup.
 */
export async function GET(req: NextRequest) {
  const nextParam = req.nextUrl.searchParams.get("next");
  const destination = isSafeRelativePath(nextParam) ? nextParam! : "/";

  const res = NextResponse.redirect(phpLoginUrl(destination));
  // Re-authenticating from scratch: drop stale local auth state so the return
  // trip goes through the bridge cleanly rather than short-circuiting on it.
  clearBridgeAttemptCookie(res);
  clearAuthCookie(res);
  return res;
}
