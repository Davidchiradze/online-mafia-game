import type { NextFetchEvent, NextRequest } from "next/server";
import {
  bridgeRedirectMiddleware,
  composeNextMiddlewares,
  jwtCookieMiddleware,
  publicPageMiddleware,
} from "@/features/auth/middleware";
import { LOCALE_COOKIE } from "@/i18n/config";

// Temporary: force every visitor to Georgian (see src/i18n/request.ts).
const FORCED_LOCALE = "ka";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const runMiddleware = composeNextMiddlewares(
  publicPageMiddleware,
  jwtCookieMiddleware,
  bridgeRedirectMiddleware,
);

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const res = await runMiddleware(req, event);

  // Overwrite any stale NEXT_LOCALE cookie (e.g. a returning visitor's saved
  // "en") with the forced locale. Set on the final response so it persists
  // across every branch (public, authed, redirect).
  if (req.cookies.get(LOCALE_COOKIE)?.value !== FORCED_LOCALE) {
    res.cookies.set(LOCALE_COOKIE, FORCED_LOCALE, {
      maxAge: ONE_YEAR_SECONDS,
      sameSite: "lax",
      path: "/",
    });
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
