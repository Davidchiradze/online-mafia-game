import {
  BRIDGE_ATTEMPT_COOKIE_NAME,
  CONVEX_AUTH_COOKIE_NAME,
  IS_PROD,
  PHP_LOGIN_REDIRECT_URL,
  PHP_SESSION_COOKIE_NAME,
} from "@/lib/auth/constants";
import { AUTH_ERROR_PATH } from "@convex/lib/access";

// Route policy (public prefixes, protected routes) is owned by the central
// access-control source of truth (`@convex/lib/access`) so the middleware,
// layouts, and Convex authorization never drift. Re-exported here to keep
// existing middleware imports (`./constants`) stable.
export { AUTH_ERROR_PATH, PUBLIC_PATH_PREFIXES } from "@convex/lib/access";

export const middlewareConfig = {
  phpSessionCookieName: PHP_SESSION_COOKIE_NAME,
  convexAuthCookieName: CONVEX_AUTH_COOKIE_NAME,
  phpLoginRedirectUrl: PHP_LOGIN_REDIRECT_URL,
  bridgeAttemptCookieName: BRIDGE_ATTEMPT_COOKIE_NAME,
  authErrorPath: AUTH_ERROR_PATH,
  isProd: IS_PROD,
} as const;
