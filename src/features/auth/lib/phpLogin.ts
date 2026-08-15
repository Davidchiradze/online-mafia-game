import { ONLINE_MAFIA_ORIGIN, PHP_API_BASE_URL } from "./constants";
import { isSafeRelativePath } from "./cookies";

/**
 * mafia.ge's login URL. PHP's `?from=` is where it sends the browser after a
 * successful login. `returnTo` is a same-origin relative path ("/lobby") that
 * pins the return to the page the user was actually on; anything unsafe or
 * absent falls back to the app root.
 */
export function phpLoginUrl(returnTo?: string | null): string {
  const from = isSafeRelativePath(returnTo)
    ? `${ONLINE_MAFIA_ORIGIN}${returnTo}`
    : ONLINE_MAFIA_ORIGIN;
  return `${PHP_API_BASE_URL}/ka/accounts/login/?from=${from}`;
}
