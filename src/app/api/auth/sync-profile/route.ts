import { type NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import {
  PHP_SESSION_COOKIE_NAME,
  CONVEX_AUTH_COOKIE_NAME,
} from "@/features/auth/lib/constants";
import { fetchUserBySession } from "@/features/auth/lib/php";
import { normalizeAvatarUrl } from "@/features/auth/lib/avatar";
import { serverEnv } from "@/shared/lib/env/server";
import { authProfiles } from "@convex/refs/lobby";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/sync-profile
 *
 * Fetches fresh profile data from PHP (via the httpOnly PHPSESSID cookie)
 * and pushes it into the Convex `profiles` table through a secret-gated
 * mutation. Called once per page load by `ProfileSyncBootstrap` after
 * Convex auth is established.
 *
 * Status codes:
 * - 200: profile upserted successfully
 * - 401: missing cookies or PHP session invalid/expired (client should logout)
 * - 502: PHP backend unreachable (transient, client should retry)
 * - 500: Convex upsert failed (transient)
 */
export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get(PHP_SESSION_COOKIE_NAME)?.value;
  const token = req.cookies.get(CONVEX_AUTH_COOKIE_NAME)?.value;

  if (!sessionId || !token) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let user;
  try {
    user = await fetchUserBySession(sessionId);
  } catch (err) {
    console.error("[auth/sync-profile] PHP fetch failed", err);
    return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  }

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(token);

    await convex.mutation(authProfiles.upsertFromPhp, {
      secret: serverEnv.convexSyncSecret,
      accountId: user.id,
      email: user.email ?? undefined,
      nickname: user.username ?? undefined,
      name: user.name ?? undefined,
      avatar: normalizeAvatarUrl(user.avatar) ?? undefined,
      amount: user.amount != null ? String(user.amount) : undefined,
      // PHP status_id 0 = unverified account; null -> treated as verified.
      verified: user.status !== 0,
      subscription: user.subscription
        ? {
            packageId: user.subscription.packageId,
            from: user.subscription.from ?? undefined,
            to: user.subscription.to ?? undefined,
            active: user.subscription.active,
          }
        : undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[auth/sync-profile] Convex upsert failed", err);
    return NextResponse.json({ ok: false, error: "upsert" }, { status: 500 });
  }
}
