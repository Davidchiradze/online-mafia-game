/**
 * Convex API integrity — the standing guard on the 107 raw function-path strings
 * that `tsc` cannot see.
 *
 * WHY: see the header of `tests/support/convexModules.ts`. Short version —
 * `_generated/` is committed, `skipLibCheck: true` hides the one diagnostic that
 * would catch a bad Convex move, and CI runs only `tsc --noEmit` + `vitest`.
 * Without this file a broken backend move commits, pushes, and passes CI green.
 *
 * The strings guarded here fail in three especially quiet ways:
 *   - `src/app/api/livekit/webhook/route.ts` catches errors and returns HTTP 200
 *   - `src/app/api/auth/sync-profile/route.ts` is the PHP auth bridge (auth outage)
 *   - the scheduler refs in `games/core/voting` + `games/core/cardPicking` hang a live game
 *     mid-round with no client-visible error
 *
 * Three concerns, one shared module import:
 *   1. refs integrity   — every raw path resolves, and its declared kind is right
 *   2. _generated drift — `api.d.ts` matches the bundler's real module set
 *   3. inventory snapshot — signature-level pin on all 139 functions
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

import {
  convexModulePaths,
  inventoryLine,
  loadConvexFunctions,
  type FunctionKind,
} from "../support/convexModules";

const REPO_ROOT = new URL("../../", import.meta.url).pathname;

// ---------------------------------------------------------------------------
// Maintenance contract — read before editing
// ---------------------------------------------------------------------------

/**
 * Raw Convex function paths that are NOT passed to `makeFunctionReference` and
 * therefore invisible to the AST extractor. Each entry needs a `guard`: a
 * verbatim substring that must still be present in the file, so that deleting
 * or rewriting the call site fails this test rather than silently orphaning the
 * entry.
 *
 * TO ADD: only when a Convex function is invoked by raw string outside
 * `makeFunctionReference` (`sendBeacon`, `fetch` to `/api/mutation`, etc).
 */
const EXTRA_RAW_PATHS: {
  path: string;
  kind: FunctionKind;
  file: string;
  guard: string;
}[] = [
  {
    // Tab-close cleanup. No JWT is available during unload, so the
    // unguessable sessionToken authorizes removing exactly this session.
    path: "presence:disconnect",
    kind: "mutation",
    file: "src/providers/PresenceBootstrap.tsx",
    guard: 'path: "presence:disconnect"',
  },
];

/**
 * Function references that legitimately target INTERNAL functions.
 *
 * Asserted BIDIRECTIONALLY: a listed path must be internal AND an unlisted path
 * must be public. So both directions of a visibility flip are loud — a ref
 * silently becoming internal (breaking the client) and an internal function
 * silently becoming public (widening the attack surface) both fail here.
 *
 * These are reached via `ctx.scheduler` / `ctx.runMutation` from trusted server
 * code, never from the browser.
 */
const INTERNAL_REF_ALLOWLIST = new Set([
  "games/core/voting:endVoteWindowInternal",
  "games/core/voting:endBothLeaveVoteInternal",
  "games/core/cardPicking:expireTurnInternal",
  "games/core/players:leaveAdminInternal",
  "games/core/spectators:leaveAdminInternal",
  "lobby/games:removeInternal",
]);

/**
 * String literals that look like a Convex udf path (`module/path:export`) but
 * are not one. Keeps the ratchet below honest without weakening it.
 */
const NOT_A_UDF_PATH = new Set<string>([]);

// ---------------------------------------------------------------------------
// Source scanning
// ---------------------------------------------------------------------------

/**
 * Scanned roots. Deliberately `convex` + `src` only — production code. `tests/`
 * is excluded because the integration suite legitimately references functions
 * via the typed `api.*` object (tsc-checked, so a move breaks the build loudly)
 * rather than via raw strings. If a test ever starts calling a function by raw
 * string, add "tests" here.
 */
const SCAN_ROOTS = ["convex", "src"];
const SCAN_EXTS = [".ts", ".tsx"];
const SKIP_DIRS = new Set(["_generated", "node_modules", ".next"]);

function walkSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walkSourceFiles(join(dir, entry.name), out);
    } else if (SCAN_EXTS.some((e) => entry.name.endsWith(e))) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

const sourceFiles = SCAN_ROOTS.flatMap((r) => walkSourceFiles(join(REPO_ROOT, r)));

type ExtractedRef = {
  path: string;
  declaredKind: string | null;
  file: string;
  line: number;
};

/**
 * Extract every `makeFunctionReference` call with the TypeScript compiler API.
 *
 * Regex is not sufficient: the codebase uses two syntactic variants (single-line
 * `makeFunctionReference<"query", A, R>("p:e")` and a multi-line form with the
 * type args split across lines). Both parse to an identical `CallExpression`,
 * so `typeArguments[0]` (declared kind) and `arguments[0]` (path) pair up with
 * no special-casing.
 *
 * Runtime extraction is also insufficient — the kind type-arg is erased at
 * runtime, and the 5 inline sites are non-exported module-scope consts.
 */
function extractRefs(): { refs: ExtractedRef[]; udfShapedLiterals: Map<string, string[]> } {
  const refs: ExtractedRef[] = [];
  const udfShapedLiterals = new Map<string, string[]>();
  const udfShape = /^[a-zA-Z][\w-]*(\/[\w-]+)*:[a-zA-Z]\w*$/;

  for (const file of sourceFiles) {
    const rel = relative(REPO_ROOT, file);
    const text = readFileSync(file, "utf8");
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);

    const visit = (node: ts.Node): void => {
      // Collect every udf-shaped string literal for the ratchet.
      if (ts.isStringLiteral(node) && udfShape.test(node.text)) {
        const list = udfShapedLiterals.get(node.text) ?? [];
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        list.push(`${rel}:${line + 1}`);
        udfShapedLiterals.set(node.text, list);
      }

      if (ts.isCallExpression(node)) {
        const callee = node.expression;
        const name = ts.isIdentifier(callee)
          ? callee.text
          : ts.isPropertyAccessExpression(callee)
            ? callee.name.text
            : null;

        if (name === "makeFunctionReference") {
          const pathArg = node.arguments[0];
          const kindArg = node.typeArguments?.[0];
          const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));

          let declaredKind: string | null = null;
          if (
            kindArg &&
            ts.isLiteralTypeNode(kindArg) &&
            ts.isStringLiteral(kindArg.literal)
          ) {
            declaredKind = kindArg.literal.text;
          }

          refs.push({
            path: pathArg && ts.isStringLiteral(pathArg) ? pathArg.text : "<non-literal>",
            declaredKind,
            file: rel,
            line: line + 1,
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sf);
  }

  return { refs, udfShapedLiterals };
}

const { refs, udfShapedLiterals } = extractRefs();

// One shared load of the real Convex function inventory.
const inventoryPromise = loadConvexFunctions();

// ---------------------------------------------------------------------------

describe("refs integrity", () => {
  it("extracts every makeFunctionReference call site", () => {
    // 105 makeFunctionReference calls across 8 files (refs/game 76, refs/lobby 18,
    // refs/history 3, refs/admin 2, refs/leaderboard 1, games/core/webhookHandler 3,
    // games/core/sessions 1, admin/games 1) + 1 sendBeacon path = the 106 raw strings.
    expect(refs.length).toBe(105);
    expect(refs.length + EXTRA_RAW_PATHS.length).toBe(106);
  });

  it("passes a string literal as the path to every ref", () => {
    const nonLiteral = refs.filter((r) => r.path === "<non-literal>");
    expect(
      nonLiteral.map((r) => `${r.file}:${r.line}`),
      "a computed ref path cannot be verified statically — use a literal",
    ).toEqual([]);
  });

  it("declares a kind type-argument on every ref", () => {
    const missing = refs.filter((r) => r.declaredKind === null);
    expect(missing.map((r) => `${r.file}:${r.line} → ${r.path}`)).toEqual([]);
  });

  it("resolves every ref path to a real exported Convex function", async () => {
    const { functions } = await inventoryPromise;
    const byId = new Map(functions.map((f) => [f.id, f]));

    const dangling = [...refs, ...EXTRA_RAW_PATHS.map((e) => ({ ...e, line: 0 }))]
      .filter((r) => !byId.has(r.path))
      .map((r) => `${r.file}:${"line" in r ? r.line : 0} → ${r.path}`);

    expect(dangling, "these function paths do not exist in the Convex backend").toEqual(
      [],
    );
  });

  it("matches the declared kind against the real function kind", async () => {
    const { functions } = await inventoryPromise;
    const byId = new Map(functions.map((f) => [f.id, f]));

    const mismatched: string[] = [];
    for (const r of refs) {
      const fn = byId.get(r.path);
      if (!fn) continue; // reported by the previous test
      if (fn.kind !== r.declaredKind) {
        mismatched.push(
          `${r.file}:${r.line} → ${r.path} declared "${r.declaredKind}" but is "${fn.kind}"`,
        );
      }
    }
    for (const e of EXTRA_RAW_PATHS) {
      const fn = byId.get(e.path);
      if (fn && fn.kind !== e.kind) {
        mismatched.push(
          `${e.file} → ${e.path} declared "${e.kind}" but is "${fn.kind}"`,
        );
      }
    }

    expect(mismatched).toEqual([]);
  });

  it("keeps ref visibility in sync with the allowlist, in both directions", async () => {
    const { functions } = await inventoryPromise;
    const byId = new Map(functions.map((f) => [f.id, f]));

    const wrong: string[] = [];
    const referenced = new Set([...refs.map((r) => r.path), ...EXTRA_RAW_PATHS.map((e) => e.path)]);

    for (const path of referenced) {
      const fn = byId.get(path);
      if (!fn) continue;
      const allowlisted = INTERNAL_REF_ALLOWLIST.has(path);
      if (allowlisted && fn.visibility !== "internal") {
        wrong.push(
          `${path} is allowlisted as internal but is now PUBLIC — remove it from ` +
            `INTERNAL_REF_ALLOWLIST, or restore internalMutation`,
        );
      }
      if (!allowlisted && fn.visibility === "internal") {
        wrong.push(
          `${path} is INTERNAL but not allowlisted — a client-facing ref pointing at ` +
            `an internal function will fail at runtime`,
        );
      }
    }

    expect(wrong).toEqual([]);
  });

  it("has no stale entries in INTERNAL_REF_ALLOWLIST", () => {
    const referenced = new Set([
      ...refs.map((r) => r.path),
      ...EXTRA_RAW_PATHS.map((e) => e.path),
    ]);
    const stale = [...INTERNAL_REF_ALLOWLIST].filter((p) => !referenced.has(p));
    expect(stale, "allowlisted but no longer referenced — delete these").toEqual([]);
  });

  it("keeps every EXTRA_RAW_PATHS call site present verbatim", () => {
    const broken: string[] = [];
    for (const e of EXTRA_RAW_PATHS) {
      const text = readFileSync(join(REPO_ROOT, e.file), "utf8");
      if (!text.includes(e.guard)) {
        broken.push(
          `${e.file} no longer contains ${JSON.stringify(e.guard)} — the call site ` +
            `moved or changed shape; update or remove this EXTRA_RAW_PATHS entry`,
        );
      }
    }
    expect(broken).toEqual([]);
  });

  it("ratchet: every udf-shaped string literal is a tracked function path", async () => {
    const { functions } = await inventoryPromise;
    const byId = new Map(functions.map((f) => [f.id, f]));
    const tracked = new Set([
      ...refs.map((r) => r.path),
      ...EXTRA_RAW_PATHS.map((e) => e.path),
    ]);

    // A literal is suspicious if it resolves to a real Convex function but is
    // not one we track — i.e. somebody called a backend function by raw string
    // through a new, unguarded channel.
    const untracked: string[] = [];
    for (const [literal, locations] of udfShapedLiterals) {
      if (tracked.has(literal)) continue;
      if (NOT_A_UDF_PATH.has(literal)) continue;
      if (!byId.has(literal)) continue;
      untracked.push(`${literal} at ${locations.join(", ")}`);
    }

    expect(
      untracked,
      "these resolve to real Convex functions but are not tracked — add them to " +
        "EXTRA_RAW_PATHS (with a guard) so a move cannot silently break them",
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe("_generated drift", () => {
  /**
   * `npx convex codegen` CANNOT run in CI: it needs deployment credentials and
   * performs a network push, and the offline `--system-udfs` path omits the
   * `components` block the committed `api.d.ts` carries. So we verify the
   * committed artifact against the bundler's own rules instead — offline, no
   * credentials, ~5 ms.
   */
  it("matches api.d.ts module imports against the bundler's module set", () => {
    const apiDts = readFileSync(join(REPO_ROOT, "convex/_generated/api.d.ts"), "utf8");

    const generated = new Set<string>();
    const importRe = /^import type \* as .+ from "\.\.\/(.+)\.js";$/gm;
    for (const m of apiDts.matchAll(importRe)) generated.add(m[1]);

    const actual = new Set(convexModulePaths());

    const missingFromGenerated = [...actual].filter((p) => !generated.has(p)).sort();
    const staleInGenerated = [...generated].filter((p) => !actual.has(p)).sort();

    expect(
      { missingFromGenerated, staleInGenerated },
      "convex/_generated is out of date — run `npm run codegen` and commit the result",
    ).toEqual({ missingFromGenerated: [], staleInGenerated: [] });
  });

  it("has 86 modules in the bundler set", () => {
    expect(convexModulePaths().length).toBe(86);
  });

  it("never lets convex/games acquire a nested convex.config.ts", () => {
    // The bundler skips any directory containing convex.config.ts as a nested
    // component — silently, for the ENTIRE subtree. One such file under
    // convex/games/ would unregister the whole game backend.
    const offenders = walkSourceFiles(join(REPO_ROOT, "convex"))
      .map((f) => relative(REPO_ROOT, f))
      .filter((f) => f.endsWith("convex.config.ts") && f !== "convex/convex.config.ts");
    expect(offenders).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe("function inventory", () => {
  it("imports every Convex module without error", async () => {
    const { importErrors } = await inventoryPromise;
    // A failure here is often a circular import introduced by a file move.
    expect(importErrors).toEqual([]);
  });

  it("has 140 registered functions", async () => {
    const { functions } = await inventoryPromise;
    expect(functions.length).toBe(140);
  });

  it("matches the signature snapshot", async () => {
    const { functions } = await inventoryPromise;
    const lines = functions.map(inventoryLine).join("\n");
    // The validator hashes pin every function's arg/return shape — the
    // strongest cheap proxy for "zero behavior change" across a file move.
    await expect(lines + "\n").toMatchFileSnapshot("./__snapshots__/inventory.txt");
  });
});
