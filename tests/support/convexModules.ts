/**
 * Convex module map + function inventory — the backbone of the migration safety net.
 *
 * WHY THIS EXISTS
 * ---------------
 * `convex/_generated/` is committed to git and `tsconfig.json` sets
 * `skipLibCheck: true`. `api.d.ts` imports real relative paths
 * (`import type * as game_bestMove from "../game/bestMove.js"`). Move a Convex
 * file without regenerating and that import becomes unresolvable — but
 * `skipLibCheck` suppresses the diagnostic, the type silently degrades to
 * `any`, and every `api.game.*` call site typechecks clean. A broken backend
 * move can be committed, pushed, and pass CI green.
 *
 * Verified empirically: `git mv convex/game/bestMove.ts …` then
 *   npx tsc --noEmit                     → exit 0  (false green)
 *   npx tsc --noEmit --skipLibCheck false → TS2307 in api.d.ts(20,37)
 *
 * `--skipLibCheck false` is NOT usable as a standing gate: `node_modules`
 * (@livekit/components-core, next-intl) carries its own pre-existing TS2307s.
 * Hence this offline, credential-free, ~ms inventory instead.
 *
 * WHAT IT PROVIDES
 * ----------------
 *  - `convexModulePaths()`  — the module set the Convex bundler would deploy,
 *                             derived from a transcription of its own rules.
 *  - `loadConvexFunctions()` — every registered function with its kind,
 *                             visibility, and arg/return validator hashes.
 *
 * MAINTENANCE
 * -----------
 * `entryPoints()` rules are transcribed from
 * `node_modules/convex/src/bundler/index.ts:395-493` (convex ^1.32.0). If a
 * convex upgrade changes that function, re-read it and update `isEntryPoint()`
 * below. The module-count assertion in `apiIntegrity.test.ts` is what will
 * fail first if this drifts.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// ---------------------------------------------------------------------------
// Module discovery
// ---------------------------------------------------------------------------

/**
 * Lazy module map. `import.meta.glob` (not a runtime fs walk + dynamic import)
 * because Vite must statically register these specifiers for the dynamic
 * import to resolve at all. `eager: false` so filtering happens BEFORE any
 * module is evaluated — we must never evaluate `_generated/` or a `*.test.ts`.
 */
const GLOB = import.meta.glob<Record<string, unknown>>(
  "../../convex/**/*.{ts,tsx,js,jsx,mjs,cjs,mts,cts}",
);

/** Repo-root-relative path (`convex/game/roles.ts`) from a glob key. */
function globKeyToRepoPath(key: string): string {
  return key.replace(/^\.\.\/\.\.\//, "");
}

/** Absolute path on disk from a repo-relative path. */
function absPath(repoPath: string): string {
  return new URL(`../../${repoPath}`, import.meta.url).pathname;
}

const ENTRY_POINT_EXTENSIONS = [
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".jsx",
];

/**
 * Transcription of the Convex bundler's `entryPoints()` filter.
 * Source: node_modules/convex/src/bundler/index.ts:412-492
 *
 * `relPath` is relative to the `convex/` directory, POSIX separators.
 */
function isEntryPoint(relPath: string, readContents: () => string): boolean {
  const base = relPath.slice(relPath.lastIndexOf("/") + 1);

  // Must be a JS/TS entry-point extension.
  if (!ENTRY_POINT_EXTENSIONS.some((ext) => relPath.endsWith(ext))) return false;
  // Generated code is never an entry point.
  if (relPath.startsWith("_generated/")) return false;
  // Dotfiles.
  if (base.startsWith(".")) return false;
  // Likely emacs tempfiles.
  if (base.startsWith("#")) return false;
  // schema is bundled separately (matched by BASENAME, not path).
  if (base === "schema.ts" || base === "schema.js") return false;
  // More than one dot in the basename. This is the rule that exempts
  // `*.test.ts` / `*.spec.ts` (so `convex/tests/gameEngine.test.ts` is not a
  // deployed module) as well as `auth.config.ts` and `convex.config.ts`.
  if ((base.match(/\./g) || []).length > 1) return false;
  // Paths containing a space are skipped.
  if (relPath.includes(" ")) return false;

  // TypeScript files must have at least one line starting with import/export,
  // else they are not valid TS modules. Regex copied verbatim from the bundler.
  if (relPath.endsWith(".ts") || relPath.endsWith(".tsx")) {
    if (!/^\s{0,100}(import|export)/m.test(readContents())) return false;
  }

  return true;
}

/**
 * Convex "module path" as it appears in function references and `api.*`:
 * `convex/game/roles.ts` → `game/roles`.
 */
export function toModulePath(repoPath: string): string {
  return repoPath.replace(/^convex\//, "").replace(/\.[^.]+$/, "");
}

export type ConvexModule = {
  /** e.g. `convex/game/roles.ts` */
  repoPath: string;
  /** e.g. `game/roles` — the key used by `api.*` and function references. */
  modulePath: string;
  /** Evaluates the module. */
  load: () => Promise<Record<string, unknown>>;
};

/**
 * Every module the Convex bundler would deploy, sorted by module path.
 * Nothing is evaluated by this call.
 */
export function convexModules(): ConvexModule[] {
  const out: ConvexModule[] = [];

  for (const [key, load] of Object.entries(GLOB)) {
    const repoPath = globKeyToRepoPath(key);
    const relPath = repoPath.replace(/^convex\//, "");
    if (!isEntryPoint(relPath, () => readFileSync(absPath(repoPath), "utf8"))) {
      continue;
    }
    out.push({ repoPath, modulePath: toModulePath(repoPath), load });
  }

  return out.sort((a, b) => (a.modulePath < b.modulePath ? -1 : 1));
}

/** Just the module paths (`game/roles`, …), sorted. */
export function convexModulePaths(): string[] {
  return convexModules().map((m) => m.modulePath);
}

// ---------------------------------------------------------------------------
// Function classification
// ---------------------------------------------------------------------------

export type FunctionKind = "query" | "mutation" | "action" | "httpAction";
export type Visibility = "public" | "internal";

export type ConvexFunction = {
  /** `game/roles` */
  modulePath: string;
  /** exported name, e.g. `dealRoles` */
  exportName: string;
  /** `game/roles:dealRoles` */
  id: string;
  kind: FunctionKind;
  visibility: Visibility;
  /** sha256(12) of the args validator JSON, or `-` when unavailable. */
  argsHash: string;
  /** sha256(12) of the returns validator JSON, or `-` when unavailable. */
  returnsHash: string;
};

/**
 * Markers set by Convex's registration helpers. Verified against
 * node_modules/convex/src/server/impl/registration_impl.ts:117-229 —
 * every registered function carries exactly one of isQuery/isMutation/isAction
 * (or isHttp) plus exactly one of isPublic/isInternal, and `exportArgs` /
 * `exportReturns` are zero-arg functions returning a JSON string.
 */
type Registered = {
  isQuery?: boolean;
  isMutation?: boolean;
  isAction?: boolean;
  isHttp?: boolean;
  isPublic?: boolean;
  isInternal?: boolean;
  exportArgs?: () => string;
  exportReturns?: () => string;
};

function isRegistered(v: unknown): v is Registered {
  if (typeof v !== "function" && typeof v !== "object") return false;
  if (v === null) return false;
  const r = v as Registered;
  return (
    r.isQuery === true ||
    r.isMutation === true ||
    r.isAction === true ||
    r.isHttp === true
  );
}

function kindOf(r: Registered): FunctionKind {
  if (r.isHttp) return "httpAction";
  if (r.isQuery) return "query";
  if (r.isMutation) return "mutation";
  return "action";
}

function hash(json: string): string {
  return createHash("sha256").update(json).digest("hex").slice(0, 12);
}

/**
 * Safely read a validator export. `exportArgs()` throws on circular imports,
 * which makes this a free circular-import detector — precisely the class of bug
 * a folder move introduces. We surface the throw rather than swallow it.
 */
function validatorHash(fn: (() => string) | undefined, id: string, which: string): string {
  if (typeof fn !== "function") return "-";
  try {
    return hash(fn());
  } catch (err) {
    throw new Error(
      `Failed to export ${which} for ${id}. This usually means a circular import ` +
        `between Convex modules. Original error: ${(err as Error).message}`,
    );
  }
}

/**
 * Import every deployed module and inventory its registered functions.
 * Import failures are collected, not thrown, so a single bad module reports as
 * a clear test failure instead of aborting the whole suite.
 */
export async function loadConvexFunctions(): Promise<{
  functions: ConvexFunction[];
  modulePaths: string[];
  importErrors: { modulePath: string; error: string }[];
}> {
  const modules = convexModules();
  const functions: ConvexFunction[] = [];
  const importErrors: { modulePath: string; error: string }[] = [];

  for (const mod of modules) {
    let loaded: Record<string, unknown>;
    try {
      loaded = await mod.load();
    } catch (err) {
      importErrors.push({ modulePath: mod.modulePath, error: String(err) });
      continue;
    }

    for (const [exportName, value] of Object.entries(loaded)) {
      if (!isRegistered(value)) continue;
      const r = value as Registered;
      const id = `${mod.modulePath}:${exportName}`;
      functions.push({
        modulePath: mod.modulePath,
        exportName,
        id,
        kind: kindOf(r),
        visibility: r.isInternal ? "internal" : "public",
        argsHash: validatorHash(r.exportArgs, id, "args"),
        returnsHash: validatorHash(r.exportReturns, id, "returns"),
      });
    }
  }

  functions.sort((a, b) => (a.id < b.id ? -1 : 1));
  return { functions, modulePaths: modules.map((m) => m.modulePath), importErrors };
}

/** One inventory line: `kind | visibility | module:export | argsHash | returnsHash`. */
export function inventoryLine(f: ConvexFunction): string {
  return [f.kind, f.visibility, f.id, f.argsHash, f.returnsHash].join(" | ");
}
