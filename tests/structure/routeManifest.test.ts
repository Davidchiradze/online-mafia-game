/**
 * Public URL surface guard.
 *
 * `src/app/**` filenames ARE the routing table. Move, rename, or re-group a
 * directory in there and the public URLs change silently — `tsc` sees nothing,
 * `vitest` sees nothing, `next build` succeeds happily on the new URLs. A
 * shuffled route group is a 404 for real users and a broken external link.
 *
 * This snapshots the derived URL set so any change to it must be deliberate.
 * All 29 files under `src/app/` are framework filenames; the migration plan
 * treats the whole directory as immovable, and this test enforces that.
 *
 * Derivation logic lives in `tests/support/routeManifest.ts` so the migration's
 * frozen-baseline check can compute the same manifest without depending on this
 * test having run first.
 */

import { expect, it } from "vitest";

import { routeManifest, routeManifestText } from "../support/routeManifest";

it("matches the route manifest snapshot", async () => {
  await expect(routeManifestText()).toMatchFileSnapshot("./__snapshots__/routes.txt");
});

it("finds the app router's route files", () => {
  // A route file that escapes src/app stops being routable — silently.
  expect(routeManifest().length).toBeGreaterThan(0);
});
