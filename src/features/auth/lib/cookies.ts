import type { NextResponse } from "next/server";
import {
  BRIDGE_ATTEMPT_COOKIE_NAME,
  BRIDGE_ATTEMPT_TTL_SECONDS,
  CONVEX_AUTH_COOKIE_NAME,
  IS_PROD,
} from "@/features/auth/lib/constants";

interface AuthCookieOptions {
  maxAgeSeconds: number;
}

export function setAuthCookie(
  res: NextResponse,
  token: string,
  opts: AuthCookieOptions,
): void {
  res.cookies.set({
    name: CONVEX_AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
    maxAge: opts.maxAgeSeconds,
  });
}

export function clearAuthCookie(res: NextResponse): void {
  res.cookies.set({
    name: CONVEX_AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function setBridgeAttemptCookie(res: NextResponse): void {
  res.cookies.set({
    name: BRIDGE_ATTEMPT_COOKIE_NAME,
    value: "1",
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
    maxAge: BRIDGE_ATTEMPT_TTL_SECONDS,
  });
}

export function clearBridgeAttemptCookie(res: NextResponse): void {
  res.cookies.set({
    name: BRIDGE_ATTEMPT_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Validates that `next` is a safe same-origin relative path. Rejects
 * protocol-relative URLs (`//evil.com`) and absolute URLs to prevent
 * open-redirects through the bridge.
 */
export function isSafeRelativePath(next: string | null | undefined): boolean {
  if (!next) return false;
  if (!next.startsWith("/")) return false;
  if (next.startsWith("//")) return false;
  if (next.startsWith("/\\")) return false;
  return true;
}
