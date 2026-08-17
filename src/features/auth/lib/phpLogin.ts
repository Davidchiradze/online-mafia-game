import { ONLINE_MAFIA_ORIGIN, PHP_API_BASE_URL } from "./constants";
import { isSafeRelativePath } from "./cookies";

/** Same-origin entry point for the sign-in flow. See the route's docblock. */
export const LOGIN_START_PATH = "/api/auth/login";

/**
 * Where a sign-in affordance in the UI should point.
 *
 * Deliberately NOT `phpLoginUrl` — it hops through our own origin first so
 * the server can invalidate the `bridge_attempted` cooldown before handing
 * the browser to mafia.ge. A plain `<a>` cannot do that itself: the cookie is
 * httpOnly. Link straight to `phpLoginUrl` and the user comes back from a
 * successful login only to be rendered as a guest again.
 */
export function loginStartUrl(returnTo?: string | null): string {
  if (!isSafeRelativePath(returnTo)) return LOGIN_START_PATH;
  return `${LOGIN_START_PATH}?next=${encodeURIComponent(returnTo!)}`;
}

/**
 * mafia.ge's login URL. PHP's `?from=` is where it sends the browser after a
 * successful login. `returnTo` is a same-origin relative path ("/lobby") that
 * pins the return to the page the user was actually on; anything unsafe or
 * absent falls back to the app root.
 *
 * Server-side use only — UI links go through `loginStartUrl` above.
 */
export function phpLoginUrl(returnTo?: string | null): string {
  const from = isSafeRelativePath(returnTo)
    ? `${ONLINE_MAFIA_ORIGIN}${returnTo}`
    : ONLINE_MAFIA_ORIGIN;
  return `${PHP_API_BASE_URL}/ka/accounts/login/?from=${from}`;
}
