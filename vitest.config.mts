import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Resolve a path relative to this config file (ESM-safe; no __dirname).
const fromRoot = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Vitest is set up for UNIT tests over the game's pure logic (win conditions,
// visibility, speaking order, role→faction, phase transitions). These modules
// have no DB access, so the default "node" environment is enough and no Convex
// backend needs to run.
//
// Aliases mirror tsconfig.json (`@/*` → src, `@convex/*` → convex) so tests
// import exactly like the app does. These point at directory roots, so they
// stay correct even as the game-types refactor relocates modules within them.
//
// Backend integration tests (convex-test) come later (Phase 3): they need the
// "edge-runtime" environment and can be added via a `projects` split without
// disturbing this unit config.
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "convex/_generated"],
  },
  resolve: {
    alias: {
      "@convex": fromRoot("./convex"),
      "@": fromRoot("./src"),
    },
  },
});
