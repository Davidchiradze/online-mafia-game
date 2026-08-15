import { NextResponse } from "next/server";
import { isPublicPath } from "./constants";
import type { NextComposableMiddleware } from "./types";

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
