import {
  BRIDGE_ATTEMPT_COOKIE_NAME,
  CONVEX_AUTH_COOKIE_NAME,
  IS_PROD,
  PHP_LOGIN_REDIRECT_URL,
  PHP_SESSION_COOKIE_NAME,
} from "@/lib/auth/constants";

export const AUTH_ERROR_PATH = "/auth/required";

export const middlewareConfig = {
  phpSessionCookieName: PHP_SESSION_COOKIE_NAME,
  convexAuthCookieName: CONVEX_AUTH_COOKIE_NAME,
  phpLoginRedirectUrl: PHP_LOGIN_REDIRECT_URL,
  bridgeAttemptCookieName: BRIDGE_ATTEMPT_COOKIE_NAME,
  authErrorPath: AUTH_ERROR_PATH,
  isProd: IS_PROD,
} as const;

export const PUBLIC_PATH_PREFIXES = [
  "/api/auth/",
  "/api/livekit/webhook",
  "/api/time",
  "/.well-known/",
  "/_next/",
  "/favicon.ico",
  AUTH_ERROR_PATH,
] as const;
