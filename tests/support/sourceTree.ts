/**
 * Folder-structure and naming derivation.
 *
 * SILENT FAILURE MODE: nothing in this toolchain has an opinion about where a
 * file goes or what it is called. `tsc` resolves `src/features/lobby/foo-bar.tsx`
 * exactly as happily as `src/features/lobby/components/FooBar.tsx`. ESLint is
 * the stock create-next-app preset and is not wired into CI at all. So a
 * component dropped in the wrong directory, a hook that never made it into a
 * `hooks/` folder, or a 500-line file holding eight components all ship green.
 *
 * Every rule here is expressed as a pure `(files) => violations[]` so the test
 * can run the same rule set two ways: hard-zero for conventions the codebase
 * already satisfies, and a checked-in debt baseline for the ones it does not.
 *
 * Consumers: tests/structure/conventions.test.ts.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const REPO_ROOT = new URL("../../", import.meta.url).pathname;
const p = (rel: string) => join(REPO_ROOT, rel);

export type SourceFile = {
  /** Repo-relative, e.g. `src/features/lobby/components/RoomCard.tsx`. */
  repoPath: string;
  /** Basename including extension. */
  name: string;
  text: string;
  lines: string[];
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "_generated" || entry.name === "node_modules") continue;
      walk(full, out);
    } else out.push(full);
  }
  return out;
}

export function sourceFiles(roots: readonly string[] = ["src", "convex"]): SourceFile[] {
  return roots
    .flatMap((root) => walk(p(root)))
    .filter((f) => /\.(ts|tsx)$/.test(f))
    .map((abs) => {
      const text = readFileSync(abs, "utf8");
      return {
        repoPath: relative(REPO_ROOT, abs),
        name: abs.split("/").pop()!,
        text,
        lines: text.split("\n"),
      };
    })
    .sort((a, b) => a.repoPath.localeCompare(b.repoPath));
}

// ---------------------------------------------------------------------------
// Shared predicates
// ---------------------------------------------------------------------------

/**
 * Filenames whose casing Next.js dictates. Everything under `src/app/` is a
 * framework filename by definition — `src/app/**` IS the routing table, so its
 * names are not ours to choose (guarded separately by routeManifest.test.ts).
 */
const NEXT_FRAMEWORK_NAMES = new Set([
  "page",
  "layout",
  "loading",
  "error",
  "global-error",
  "not-found",
  "template",
  "default",
  "route",
  "middleware",
  "sitemap",
  "robots",
  "manifest",
  "icon",
  "apple-icon",
  "opengraph-image",
  "twitter-image",
  "instrumentation",
]);

const stem = (name: string) => name.replace(/\.(ts|tsx)$/, "");
const isNextFrameworkFile = (f: SourceFile) =>
  f.repoPath.startsWith("src/app/") || NEXT_FRAMEWORK_NAMES.has(stem(f.name));
const isHookName = (name: string) => /^use[A-Z]/.test(stem(name));
const isTest = (f: SourceFile) => /\.(test|spec)\.tsx?$/.test(f.name);

/** Strip block/line comments and string literals before scanning for code shapes. */
function stripNonCode(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, '""');
}

/**
 * Strict PascalCase: leading capital, no underscores, at least one lowercase.
 * This is what separates a component from an UPPER_SNAKE constant — without it
 * `const PODIUM_ACCENTS = {...}` counts as a second component and the
 * one-component-per-file rule fills with false positives, which is how a rule
 * gets trained out of usefulness.
 */
const PASCAL_CASE = /^[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]*)*$/;

/**
 * Top-level component declarations: `function Foo`, `const Foo = `, at column 0.
 * Column 0 is the nesting test — an indented declaration is inside something
 * else. Deliberately syntactic rather than semantic: a top-level PascalCase
 * binding in a .tsx file is a component by this codebase's own convention, and
 * that convention is exactly what is being enforced.
 */
export function componentDeclarations(text: string): string[] {
  const code = stripNonCode(text);
  const names = new Set<string>();
  for (const m of code.matchAll(/^(?:export\s+)?(?:default\s+)?function\s+([A-Za-z_$]\w*)/gm)) {
    if (PASCAL_CASE.test(m[1])) names.add(m[1]);
  }
  for (const m of code.matchAll(/^(?:export\s+)?(?:default\s+)?const\s+([A-Za-z_$]\w*)\s*[:=]/gm)) {
    if (PASCAL_CASE.test(m[1])) names.add(m[1]);
  }
  return [...names];
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export type Rule = {
  id: string;
  /** Stated as the consequence, not the condition — it becomes the failure message. */
  consequence: string;
  check: (files: SourceFile[]) => string[];
};

/**
 * Conventions the codebase ALREADY satisfies. These are asserted at exactly
 * zero: any new violation is a regression, and there is no debt to grandfather.
 */
export const HARD_RULES: readonly Rule[] = [
  {
    id: "kebab-directories",
    consequence: "directory names drift between kebab, camel, and Pascal, so paths stop being guessable",
    check: (files) => {
      const dirs = new Set<string>();
      for (const f of files) {
        // Every directory under src/app/ is a URL path segment, not a naming
        // choice — including `.well-known` (RFC 8615) and route folders like
        // `jwks.json`. The URL surface is guarded by routeManifest.test.ts.
        if (f.repoPath.startsWith("src/app/")) continue;
        const parts = f.repoPath.split("/");
        for (let i = 1; i < parts.length - 1; i++) {
          const segment = parts[i];
          // Route groups `(headquarters)`, private folders `_x`, and dynamic
          // segments `[id]` are Next.js syntax, not naming choices.
          if (/^[[(_.]/.test(segment)) continue;
          if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(segment)) {
            dirs.add(`${parts.slice(0, i + 1).join("/")} → not kebab-case`);
          }
        }
      }
      return [...dirs];
    },
  },
  {
    id: "hook-file-naming",
    consequence: "a hook that is not named useXxx is invisible to every grep for hooks",
    check: (files) =>
      files
        .filter((f) => !isTest(f) && !isNextFrameworkFile(f))
        .filter((f) => /^use-|^use_/.test(stem(f.name)))
        .map((f) => `${f.repoPath} → hooks are useCamelCase.ts, never kebab or snake`),
  },
  {
    id: "convex-module-naming",
    consequence: "Convex module paths are raw strings in convex/refs/* — a casing change breaks them silently",
    check: (files) =>
      files
        .filter((f) => f.repoPath.startsWith("convex/") && !isTest(f))
        .filter((f) => !/^[a-z][A-Za-z0-9]*$/.test(stem(f.name)) && stem(f.name) !== "convex.config")
        .filter((f) => !stem(f.name).includes("."))
        .map((f) => `${f.repoPath} → Convex modules are camelCase.ts`),
  },
  {
    id: "no-deep-relative-imports",
    consequence: "`../../` imports break on every file move; `@/` and `@convex/` survive one",
    check: (files) =>
      files
        // src/ only. Convex resolves its own modules relatively — its bundler
        // does not read tsconfig paths — so `../../lib/constants` inside
        // convex/ is the required form, not a violation.
        .filter((f) => f.repoPath.startsWith("src/"))
        .filter((f) => /from\s+["']\.\.\/\.\.\//.test(f.text))
        .map((f) => `${f.repoPath} → climbs two or more levels; use @/ or @convex/`),
  },
  {
    id: "no-any",
    consequence: "`any` disables the only automated check this repo has on a file move",
    check: (files) => {
      const out: string[] = [];
      for (const f of files) {
        if (isTest(f)) continue;
        const code = stripNonCode(f.text);
        if (/:\s*any\b|\bas\s+any\b|<any>/.test(code)) out.push(`${f.repoPath} → uses any`);
      }
      return out;
    },
  },
  {
    id: "use-client-placement",
    consequence:
      'an import landing above "use client" silently converts a Client Component to a Server Component — next build is the only other check, and it is PR-only and path-filtered',
    check: (files) => {
      const out: string[] = [];
      for (const f of files) {
        if (!/["']use client["']/.test(f.text)) continue;
        let seenImport = false;
        for (const line of f.lines) {
          const t = line.trim();
          if (/^["']use client["']/.test(t)) {
            if (seenImport) out.push(`${f.repoPath} → "use client" appears after an import`);
            break;
          }
          // Comments and blank lines may legally precede the directive.
          if (!t || t.startsWith("//") || t.startsWith("/*") || t.startsWith("*")) continue;
          seenImport = true;
        }
      }
      return out;
    },
  },
];

/**
 * Conventions the codebase does NOT yet satisfy. Violations are pinned in a
 * checked-in baseline; the test fails when the set changes in EITHER direction,
 * so the debt can only shrink and the baseline can never go stale.
 */
export const DEBT_RULES: readonly Rule[] = [
  {
    id: "component-file-pascalcase",
    consequence: "component files that are not PascalCase make the tree unscannable",
    check: (files) =>
      files
        .filter((f) => f.name.endsWith(".tsx") && !isTest(f) && !isNextFrameworkFile(f))
        .filter((f) => !/^[A-Z]/.test(f.name))
        .map((f) => f.repoPath),
  },
  {
    id: "one-component-per-file",
    consequence: "several components in one file cannot be found by filename, which is how anyone looks",
    check: (files) =>
      files
        .filter((f) => f.name.endsWith(".tsx") && !isTest(f))
        .filter((f) => componentDeclarations(f.text).length > 1)
        .map((f) => f.repoPath),
  },
  {
    id: "component-file-length",
    consequence: "a component past ~200 lines is doing more than one job and cannot be reviewed as a unit",
    check: (files) =>
      files
        .filter((f) => f.name.endsWith(".tsx") && !isTest(f))
        .filter((f) => f.lines.length > 200)
        .map((f) => f.repoPath),
  },
  {
    id: "no-inline-svg",
    consequence:
      "an inline <svg> in a feature component is unthemeable and unreusable — import from lucide-react, or add it to src/shared/ui/icons/ if lucide lacks it",
    check: (files) =>
      files
        .filter((f) => f.name.endsWith(".tsx") && !f.repoPath.startsWith("src/shared/ui/icons/"))
        .filter((f) => /<svg[\s>]/.test(f.text))
        .map((f) => f.repoPath),
  },
  {
    id: "hooks-live-in-hooks-dir",
    consequence: "a hook colocated next to components is invisible to anyone browsing hooks/",
    check: (files) =>
      files
        .filter((f) => !isTest(f) && isHookName(f.name))
        .filter((f) => !f.repoPath.includes("/hooks/"))
        .map((f) => f.repoPath),
  },
  {
    id: "no-logic-modules-in-components-dir",
    consequence: "non-component modules under components/ belong in lib/ — components/ should hold components",
    check: (files) =>
      files
        .filter((f) => f.repoPath.includes("/components/") && f.name.endsWith(".ts") && !isTest(f))
        .filter((f) => f.name !== "index.ts")
        .map((f) => f.repoPath),
  },
];

/** `rule-id | path` lines for the debt baseline, sorted, newline-terminated. */
export function conventionDebtText(files: SourceFile[] = sourceFiles()): string {
  const rows = DEBT_RULES.flatMap((rule) =>
    rule.check(files).map((violation) => `${rule.id} | ${violation}`),
  );
  return rows.sort().join("\n") + "\n";
}
