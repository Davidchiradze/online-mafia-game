import {
  BRIDGE_ATTEMPT_COOKIE_NAME,
  CONVEX_AUTH_COOKIE_NAME,
  IS_PROD,
  PHP_LOGIN_REDIRECT_URL,
  PHP_SESSION_COOKIE_NAME,
} from "@/lib/auth/constants";

export const middlewareConfig = {
  phpSessionCookieName: PHP_SESSION_COOKIE_NAME,
  convexAuthCookieName: CONVEX_AUTH_COOKIE_NAME,
  phpLoginRedirectUrl: PHP_LOGIN_REDIRECT_URL,
  bridgeAttemptCookieName: BRIDGE_ATTEMPT_COOKIE_NAME,
  isProd: IS_PROD,
} as const;

export const PUBLIC_PATH_PREFIXES = [
  "/api/auth/",
  "/api/livekit/webhook",
  "/.well-known/",
  "/_next/",
  "/favicon.ico",
] as const;
