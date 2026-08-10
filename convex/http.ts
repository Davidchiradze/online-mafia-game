/**
 * HTTP routing table for the machine-to-machine API — the Convex analogue of
 * `src/app/`: routes only, no logic. Handlers live beside their data under
 * `convex/integrations/`.
 *
 * ⚠️ MAGIC PATH. Convex discovers this file at exactly `convex/http.ts`.
 * Rename or move it and every route below silently 404s — no build error, no
 * type error, no deploy warning. Guarded by `tests/structure/magicPaths.test.ts`.
 *
 * These routes are served from the deployment's `.convex.site` origin (NOT
 * `.convex.cloud`, and NOT the Next.js domain), so they are unaffected by
 * frontend deploys and never pass through `src/middleware.ts`.
 *
 * Callers are servers, not browsers: authorization is a shared bearer secret,
 * and no CORS headers are emitted by design — a browser must never be able to
 * reach these, since it could only do so by shipping the secret to the client.
 */

import { httpRouter } from "convex/server";

import { handleGetPlayerStats } from "./integrations/playerStats";

const http = httpRouter();

// Batch player stats for mafia.ge. POST (not GET) because the `accountIds`
// list would otherwise hit URL length limits; the call is still idempotent.
http.route({
  path: "/api/stats/players",
  method: "POST",
  handler: handleGetPlayerStats,
});

export default http;
