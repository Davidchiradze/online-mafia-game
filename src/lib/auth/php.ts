import { PHP_API_BASE_URL } from "@/lib/auth/constants";
import { serverEnv } from "@/shared/lib/env/server";
import type { PhpUser } from "./jwt";

/**
 * Calls the PHP backend's `/api/auth/user-by-session` endpoint with the
 * shared internal-api key and an explicit session id. Returns the user
 * on success, `null` on a 401 (invalid/expired session), throws on
 * everything else so the bridge route can surface real errors.
 */
export async function fetchUserBySession(
  sessionId: string,
): Promise<PhpUser | null> {
  const base = PHP_API_BASE_URL.replace(/\/+$/, "");
  const url = `${base}/api/auth/user-by-session`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Internal-Api-Key": serverEnv.internalApiKey,
      "X-Session-Id": sessionId,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (res.status === 401) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `PHP user-by-session failed with ${res.status}: ${body.slice(0, 200)}`,
    );
  }


  const json = (await res.json()) as { user?: PhpUser };
  if (!json.user || !json.user.id) {
    throw new Error("PHP user-by-session returned malformed payload");
  }
  return json.user;
}
