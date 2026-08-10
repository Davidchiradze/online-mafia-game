/**
 * Derives the public URL surface from `src/app/**`.
 *
 * Shared by `tests/structure/routeManifest.test.ts` (snapshot) and
 * `tests/migration/moveMap.test.ts` (frozen-baseline check) so neither depends
 * on the other having run first.
 */

import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

const REPO_ROOT = new URL("../../", import.meta.url).pathname;
const APP_DIR = join(REPO_ROOT, "src/app");

/** Files that define a routable endpoint in the App Router. */
const ROUTE_FILES = new Set([
  "page.tsx",
  "page.ts",
  "route.ts",
  "route.tsx",
  "layout.tsx",
  "layout.ts",
  "loading.tsx",
  "error.tsx",
  "not-found.tsx",
  "template.tsx",
  "default.tsx",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/**
 * Derive the public URL from an app-relative file path.
 *  - `(group)` segments are stripped (they do not appear in the URL)
 *  - `[param]` / `[...slug]` segments are kept verbatim
 *  - `@slot` parallel-route segments are stripped
 */
function toUrl(appRelPath: string): string | null {
  const parts = appRelPath.split("/");
  const file = parts.pop()!;
  if (!ROUTE_FILES.has(file)) return null;

  const segments = parts.filter(
    (p) => !(p.startsWith("(") && p.endsWith(")")) && !p.startsWith("@"),
  );

  const url = "/" + segments.join("/");
  const kind = file.replace(/\.tsx?$/, "");
  // The source path is included deliberately: two files can derive the SAME url
  // (root `layout.tsx` and `(headquarters)/layout.tsx` both yield `/`), so a
  // url-only manifest would not change when a route GROUP is renamed. Pinning
  // the source path too makes group renames visible while the url column still
  // documents the public surface.
  return `${url === "/" ? "/" : url.replace(/\/$/, "")}  [${kind}]  ← src/app/${appRelPath}`;
}

/** Sorted route manifest lines. */
export function routeManifest(): string[] {
  return walk(APP_DIR)
    .map((f) => relative(APP_DIR, f))
    .map(toUrl)
    .filter((u): u is string => u !== null)
    .sort();
}

/** Manifest as a trailing-newline-terminated document. */
export function routeManifestText(): string {
  return routeManifest().join("\n") + "\n";
}
