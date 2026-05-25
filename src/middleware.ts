import type { NextFetchEvent, NextRequest } from "next/server";
import {
  bridgeRedirectMiddleware,
  composeNextMiddlewares,
  jwtCookieMiddleware,
  publicPageMiddleware,
} from "@/middlewares";

const runMiddleware = composeNextMiddlewares(
  publicPageMiddleware,
  jwtCookieMiddleware,
  bridgeRedirectMiddleware,
);

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  return runMiddleware(req, event);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
