import { type NextRequest, NextResponse } from "next/server";
import { CONVEX_AUTH_COOKIE_NAME } from "@/features/auth/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/token
 *
 * Returns the current Convex JWT to the client so that the Convex
 * React client can use it as a bearer credential. The token itself
 * lives in an httpOnly cookie that JavaScript can't read directly,
 * so this endpoint is the one-hop way to surface it to the browser.
 *
 * Returns `{ token: null }` (not 401) when there is no cookie, because
 * the Convex auth hook needs to distinguish "no session yet" from
 * "fetch failed" — the former should resolve as unauthenticated, the
 * latter would retry forever.
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(CONVEX_AUTH_COOKIE_NAME)?.value ?? null;
  return NextResponse.json({ token }, { headers: { "Cache-Control": "no-store" } });
}
