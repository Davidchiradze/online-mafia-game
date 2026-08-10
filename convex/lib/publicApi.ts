/**
 * Shared plumbing for the machine-to-machine HTTP API that mafia.ge (PHP)
 * calls. Routed in `convex/http.ts`; handlers live under `convex/integrations/`.
 *
 * Everything here is PURE — no `ctx`, no db — so the request contract is unit
 * tested in the plain node environment (`tests/convex/publicApi.test.ts`)
 * without a Convex backend. That matters more than usual: this surface has no
 * typed client. PHP sends hand-built JSON, so parsing is the only contract
 * enforcement there is, and a regression here is invisible until the caller
 * gets a wrong number back.
 */

/** Machine-readable error codes. Stable — PHP branches on these strings. */
export type ApiErrorCode =
  | "unauthorized"
  | "invalid_body"
  | "too_many_accounts";

/**
 * Per-request cap on `accountIds`. One request costs 2 indexed point-reads per
 * id, so 200 is ~400 reads — comfortably inside a single Convex query. The cap
 * exists so a caller bug cannot turn one request into an unbounded fan-out;
 * raise it deliberately, and page on the PHP side rather than removing it.
 */
export const MAX_ACCOUNT_IDS = 200;

export type ParsedAccountIds =
  | { ok: true; accountIds: string[] }
  | { ok: false; code: ApiErrorCode; message: string };

/**
 * Constant-time string comparison.
 *
 * `node:crypto.timingSafeEqual` is not available in the Convex default
 * runtime, so this is the hand-rolled equivalent: always walk the full length
 * of both strings and accumulate differences, so the loop cannot exit early on
 * the first mismatched character. Length is folded into the result rather than
 * short-circuiting on it.
 */
function timingSafeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/**
 * Verify an `Authorization: Bearer <secret>` header against the configured
 * shared secret.
 *
 * An unset/empty `secret` always fails. That is the important case: if the
 * deployment is missing its environment variable we must reject everything,
 * never accept a request that also happens to send an empty bearer.
 */
export function isAuthorized(
  authorizationHeader: string | null,
  secret: string | undefined,
): boolean {
  if (!secret) return false;
  if (!authorizationHeader) return false;

  const match = authorizationHeader.match(/^Bearer (.+)$/);
  if (!match) return false;

  return timingSafeEqual(match[1], secret);
}

/**
 * Validate and normalize the `accountIds` field of a request body.
 *
 * Accepts numbers as well as strings: PHP's `json_encode` emits bare integers
 * for an int-keyed account id, and requiring the caller to cast every id to a
 * string is the kind of contract detail that produces a silent empty result
 * instead of an error. Ids are stored as strings on `profiles.accountId`, so
 * numbers are coerced here.
 *
 * Blank ids are dropped and duplicates collapse, so `["7", 7, " "]` parses to
 * `["7"]`. The cap is applied to the DEDUPED list — a caller that repeats one
 * id 500 times is not doing 500 reads and should not be rejected for it.
 */
export function parseAccountIds(body: unknown): ParsedAccountIds {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return {
      ok: false,
      code: "invalid_body",
      message: "Request body must be a JSON object.",
    };
  }

  const raw = (body as { accountIds?: unknown }).accountIds;
  if (!Array.isArray(raw)) {
    return {
      ok: false,
      code: "invalid_body",
      message: "`accountIds` must be an array of account ids.",
    };
  }

  const accountIds: string[] = [];
  const seen = new Set<string>();

  for (const entry of raw) {
    if (typeof entry !== "string" && typeof entry !== "number") {
      return {
        ok: false,
        code: "invalid_body",
        message: "`accountIds` entries must be strings or numbers.",
      };
    }
    // Number entries: reject anything that would not round-trip as an id
    // (NaN/Infinity stringify to "NaN"/"Infinity", which would silently miss).
    if (typeof entry === "number" && !Number.isFinite(entry)) {
      return {
        ok: false,
        code: "invalid_body",
        message: "`accountIds` entries must be finite numbers.",
      };
    }

    const id = String(entry).trim();
    if (id === "" || seen.has(id)) continue;
    seen.add(id);
    accountIds.push(id);
  }

  if (accountIds.length > MAX_ACCOUNT_IDS) {
    return {
      ok: false,
      code: "too_many_accounts",
      message: `At most ${MAX_ACCOUNT_IDS} account ids per request (received ${accountIds.length}).`,
    };
  }

  return { ok: true, accountIds };
}

/** JSON response with the headers every endpoint on this surface returns. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      // Server-to-server only. No browser origin is ever allowed to read this,
      // because the bearer secret would have to be shipped to the client.
      "Cache-Control": "no-store",
    },
  });
}

/** Error response in the envelope PHP branches on: `{ error, message }`. */
export function errorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
): Response {
  return jsonResponse({ error: code, message }, status);
}
