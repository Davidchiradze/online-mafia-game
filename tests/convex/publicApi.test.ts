/**
 * Request contract for the mafia.ge stats API (`convex/lib/publicApi.ts`).
 *
 * WHY THIS EXISTS: every other backend surface in this repo is reached through
 * a typed client — `convex/refs/*` for the browser, `api.*` for tests — so a
 * shape mismatch is a compile error. This one is reached by PHP over HTTP with
 * hand-built JSON. There is no compiler on either side of that wire, so these
 * assertions ARE the contract; anything they do not pin can drift without a
 * single red signal until mafia.ge renders a wrong number.
 *
 * The two behaviours worth reading before changing anything here:
 *   - numbers are accepted as account ids (PHP's `json_encode` emits bare ints)
 *   - a missing/empty `STATS_API_SECRET` rejects EVERY request, rather than
 *     accepting one that happens to send an empty bearer
 *
 * Handler-level behaviour (auth → parse → query → envelope) is not covered
 * here: `convexTest` is not wired up in this repo yet (see vitest.config.mts),
 * so the pure layer is deliberately where the logic lives.
 */

import { describe, expect, it } from "vitest";

import {
  MAX_ACCOUNT_IDS,
  errorResponse,
  isAuthorized,
  jsonResponse,
  parseAccountIds,
} from "../../convex/lib/publicApi";

const SECRET = "s3cret-token-value";

describe("isAuthorized", () => {
  it("accepts an exact bearer match", () => {
    expect(isAuthorized(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it("rejects a wrong, truncated, or extended secret", () => {
    expect(isAuthorized("Bearer wrong", SECRET)).toBe(false);
    expect(isAuthorized(`Bearer ${SECRET.slice(0, -1)}`, SECRET)).toBe(false);
    expect(isAuthorized(`Bearer ${SECRET}x`, SECRET)).toBe(false);
  });

  it("rejects every request when the deployment has no secret configured", () => {
    // THE important case. If `STATS_API_SECRET` is unset in the Convex
    // environment, a naive `header === secret` would make `Bearer ` (empty)
    // authenticate — an open endpoint produced by a missing env var.
    expect(isAuthorized("Bearer ", undefined)).toBe(false);
    expect(isAuthorized("Bearer ", "")).toBe(false);
    expect(isAuthorized(`Bearer ${SECRET}`, undefined)).toBe(false);
    expect(isAuthorized(null, undefined)).toBe(false);
  });

  it("requires the Bearer scheme, spelled exactly", () => {
    expect(isAuthorized(SECRET, SECRET)).toBe(false);
    expect(isAuthorized(`bearer ${SECRET}`, SECRET)).toBe(false);
    expect(isAuthorized(`Basic ${SECRET}`, SECRET)).toBe(false);
    expect(isAuthorized(null, SECRET)).toBe(false);
  });
});

describe("parseAccountIds", () => {
  it("passes through a list of string ids in order", () => {
    expect(parseAccountIds({ accountIds: ["7", "12", "3"] })).toEqual({
      ok: true,
      accountIds: ["7", "12", "3"],
    });
  });

  it("coerces numeric ids to strings", () => {
    // PHP's `json_encode([7, 12])` emits `[7,12]`. `profiles.accountId` is a
    // string column, so an uncoerced number matches nothing and the caller
    // gets a silent zero instead of an error.
    expect(parseAccountIds({ accountIds: [7, 12] })).toEqual({
      ok: true,
      accountIds: ["7", "12"],
    });
  });

  it("trims, drops blanks, and collapses duplicates across both types", () => {
    expect(parseAccountIds({ accountIds: ["7", 7, " 7 ", "", "  "] })).toEqual({
      ok: true,
      accountIds: ["7"],
    });
  });

  it("accepts an empty list as a well-formed request", () => {
    // Not an error: a caller batching an empty page should get `{}` back, not
    // a 400 it has to special-case.
    expect(parseAccountIds({ accountIds: [] })).toEqual({ ok: true, accountIds: [] });
  });

  it("rejects a body that is not a JSON object", () => {
    for (const body of [null, "x", 42, ["7"], undefined]) {
      expect(parseAccountIds(body)).toMatchObject({ ok: false, code: "invalid_body" });
    }
  });

  it("rejects a missing or non-array accountIds field", () => {
    expect(parseAccountIds({})).toMatchObject({ ok: false, code: "invalid_body" });
    expect(parseAccountIds({ accountIds: "7" })).toMatchObject({
      ok: false,
      code: "invalid_body",
    });
  });

  it("rejects entries that are neither string nor finite number", () => {
    for (const entry of [null, true, {}, [], Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(parseAccountIds({ accountIds: ["7", entry] })).toMatchObject({
        ok: false,
        code: "invalid_body",
      });
    }
  });

  it("caps the request at MAX_ACCOUNT_IDS distinct ids", () => {
    const distinct = (n: number) => Array.from({ length: n }, (_, i) => String(i));

    expect(parseAccountIds({ accountIds: distinct(MAX_ACCOUNT_IDS) })).toMatchObject({
      ok: true,
    });
    expect(parseAccountIds({ accountIds: distinct(MAX_ACCOUNT_IDS + 1) })).toMatchObject({
      ok: false,
      code: "too_many_accounts",
    });
  });

  it("applies the cap AFTER dedupe, not to the raw array", () => {
    // A caller repeating one id 500 times costs two reads, not a thousand.
    // Rejecting it would be a confusing 413 for a trivially cheap request.
    const repeated = Array.from({ length: MAX_ACCOUNT_IDS * 3 }, () => "7");
    expect(parseAccountIds({ accountIds: repeated })).toEqual({
      ok: true,
      accountIds: ["7"],
    });
  });
});

describe("response envelopes", () => {
  it("returns uncacheable JSON", async () => {
    const res = jsonResponse({ stats: {}, missing: [] });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    // The response is per-account data behind a bearer secret; a shared cache
    // storing it would be a cross-account leak.
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ stats: {}, missing: [] });
  });

  it("emits no CORS header — this surface is server-to-server only", () => {
    // A browser could only call this by shipping the secret to the client.
    // If a CORS header ever appears here, that is the bug.
    expect(jsonResponse({}).headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("puts the machine-readable code in `error`", async () => {
    const res = errorResponse("unauthorized", "Invalid or missing bearer token.", 401);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: "unauthorized",
      message: "Invalid or missing bearer token.",
    });
  });
});
