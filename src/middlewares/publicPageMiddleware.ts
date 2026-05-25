import { NextResponse, type NextRequest } from "next/server";
import { PUBLIC_PATH_PREFIXES } from "./constants";
import type { NextComposableMiddleware } from "./types";

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export const publicPageMiddleware: NextComposableMiddleware = {
  matcher: () => true,
  middleware: async ({ request }) => {
    if (!isPublicPath(request.nextUrl.pathname)) {
      return;
    }

    return {
      next: NextResponse.next(),
      stop: true,
    };
  },
};
