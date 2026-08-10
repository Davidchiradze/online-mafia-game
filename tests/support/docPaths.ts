/**
 * Documentation-integrity derivation.
 *
 * Markdown is not compiled, linted, or executed. A doc can name a file that was
 * deleted three refactors ago, cite a `§section` that no longer exists, or link
 * to a moved sibling — and nothing anywhere fails. `tsc` sees nothing, `vitest`
 * sees nothing, `next build` sees nothing. The only consumer that notices is an
 * AI agent, which then confidently edits a path that is not there.
 *
 * Derivation lives here rather than in the test so the doc-index snapshot and
 * the individual checks compute the same candidate set, and so a future
 * maintenance command can reuse it without depending on the test having run.
 *
 * Consumers: tests/structure/docLinks.test.ts.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";

export const REPO_ROOT = new URL("../../", import.meta.url).pathname;
export const p = (rel: string) => join(REPO_ROOT, rel);

/** Repo-relative path with no leading slash, for stable failure messages. */
const rel = (abs: string) => relative(REPO_ROOT, abs);

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

export type TextFile = { repoPath: string; text: string };

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** Every markdown doc: `docs/**` plus the repo-root agent instruction files. */
export function docFiles(): TextFile[] {
  const roots = walk(p("docs")).filter((f) => f.endsWith(".md"));
  for (const extra of ["AGENTS.md", "CLAUDE.md"]) {
    if (existsSync(p(extra))) roots.push(p(extra));
  }
  return roots
    .map((abs) => ({ repoPath: rel(abs), text: readFileSync(abs, "utf8") }))
    .sort((a, b) => a.repoPath.localeCompare(b.repoPath));
}

const SOURCE_ROOTS = ["convex", "src", "tests"] as const;

/** Every TypeScript source file, excluding generated output. */
export function sourceFiles(): TextFile[] {
  return SOURCE_ROOTS.flatMap((root) => walk(p(root)))
    .filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes("/_generated/"))
    .map((abs) => ({ repoPath: rel(abs), text: readFileSync(abs, "utf8") }))
    .sort((a, b) => a.repoPath.localeCompare(b.repoPath));
}

// ---------------------------------------------------------------------------
// Repo-path candidates inside prose
// ---------------------------------------------------------------------------

/**
 * A backticked literal is only treated as a repo path when its FIRST segment is
 * a real repo root. That scopes by construction: bare `Modal.tsx`, package
 * subpaths like `convex/react`, and absolute host paths like
 * `/etc/prometheus/prometheus.yml` fall out structurally, with no allowlist.
 */
const PATH_ROOTS = new Set([
  "convex",
  "src",
  "tests",
  "scripts",
  "docs",
  "messages",
  "public",
  ".github",
  ".githooks",
  ".claude",
]);

/** Extensions we probe when a specifier omits one (`convex/_generated/dataModel`). */
const IMPLICIT_SUFFIXES = ["", ".ts", ".tsx", ".d.ts", ".js", ".mjs", ".json", "/index.ts"];

/** Recursively expand `{a,b}` alternations, innermost group first. */
export function expandBraces(spec: string): string[] {
  const match = spec.match(/\{([^{}]*)\}/);
  if (!match) return [spec];
  const [group, inner] = match;
  return inner.split(",").flatMap((option) => expandBraces(spec.replace(group, option)));
}

/** Longest literal directory prefix of a glob exists and is non-empty. */
function globHasMatch(spec: string): boolean {
  const star = spec.search(/[*?]/);
  if (star === -1) return false;
  const literal = spec.slice(0, star);
  const dir = literal.endsWith("/") ? literal.slice(0, -1) : dirname(literal);
  const abs = p(dir);
  if (!existsSync(abs) || !statSync(abs).isDirectory()) return false;
  return readdirSync(abs).length > 0;
}

function resolvesConcrete(spec: string): boolean {
  const trimmed = spec.endsWith("/") ? spec.slice(0, -1) : spec;
  return IMPLICIT_SUFFIXES.some((suffix) => existsSync(p(trimmed + suffix)));
}

/** Does a repo-relative specifier point at something that exists? */
export function resolvesRepoPath(spec: string): boolean {
  return expandBraces(spec).some((variant) =>
    variant.includes("*") || variant.includes("?")
      ? globHasMatch(variant)
      : resolvesConcrete(variant),
  );
}

/**
 * Normalize a backticked literal into a repo-relative candidate, or null when
 * it is structurally not a repo path.
 */
export function normalizeCandidate(raw: string): string | null {
  // Template literals, alternations, and `<placeholder>` prose are not paths.
  if (/[\s${}|<>()]/.test(raw) && !/\{[^{}]*\}/.test(raw)) return null;
  if (/[\s$|<>()]/.test(raw)) return null;

  let spec = raw.trim();
  spec = spec.replace(/^\.\//, "").replace(/^\//, "");
  // Convex function references are `module/path:exportName`.
  spec = spec.replace(/:[A-Za-z_]\w*$/, "");
  spec = spec.replace(/[.,;:]+$/, "");
  if (!spec) return null;

  const first = spec.split("/")[0];
  if (!PATH_ROOTS.has(first)) return null;
  // A bare root directory name is not a claim about a file.
  if (!spec.includes("/")) return null;
  return spec;
}

/** Every backticked literal in a document that looks like a repo path. */
export function backtickedCandidates(text: string): string[] {
  const out = new Set<string>();
  for (const match of text.matchAll(/`([^`\n]+)`/g)) {
    const candidate = normalizeCandidate(match[1]);
    if (candidate) out.add(candidate);
  }
  return [...out].sort();
}

// ---------------------------------------------------------------------------
// Links, citations, headings
// ---------------------------------------------------------------------------

/** Relative markdown links from one doc to another file in the repo. */
export function markdownLinks(text: string): string[] {
  const out = new Set<string>();
  for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (!target) continue; // pure anchor, e.g. (#section)
    if (/^[a-z]+:/i.test(target)) continue; // http:, mailto:
    out.add(target);
  }
  return [...out].sort();
}

export type DocCitation = { doc: string; sections: string[] };

/**
 * `docs/engine/variant-architecture.md §2.1` and chained forms like `docs/engine/variant-architecture.md §1; §8`.
 * Only sections attached directly to a filename are attributed to it — a bare
 * `§3` further along a sentence is ambiguous and deliberately ignored.
 */
export function docCitations(text: string, knownDocs: Set<string>): DocCitation[] {
  const out: DocCitation[] = [];
  const re = /(?:docs\/)?([A-Za-z0-9._-]+\.md)((?:\s*[;,]?\s*§\d+(?:\.\d+)*)*)/g;
  for (const match of text.matchAll(re)) {
    const doc = match[1];
    if (!knownDocs.has(doc)) continue;
    const sections = [...(match[2] ?? "").matchAll(/§(\d+(?:\.\d+)*)/g)].map((m) => m[1]);
    out.push({ doc, sections });
  }
  return out;
}

/** Numbered section ids declared by a doc: `## 7. Title` → "7". */
export function numberedHeadings(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of text.split("\n")) {
    const match = line.match(/^#{2,4}\s+(\d+(?:\.\d+)*)[.)]?\s+(.*)$/);
    if (match) out.set(match[1], match[2].trim());
  }
  return out;
}

function firstHeading(text: string): string {
  const match = text.match(/^#\s+(.*)$/m);
  return match ? match[1].trim() : "(no h1)";
}

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

/**
 * `path | h1 | §n Title; …` — structure only, no counts. Line counts and
 * citation counts churn on every edit and would bury the signal; what this
 * pins is that moving a doc, or renumbering/deleting a section, shows up as a
 * reviewed diff even when nothing cites it yet.
 */
export function docIndexText(): string {
  return (
    docFiles()
      .map(({ repoPath, text }) => {
        const sections = [...numberedHeadings(text)]
          .map(([id, title]) => `§${id} ${title}`)
          .join("; ");
        return `${repoPath} | ${firstHeading(text)} | ${sections}`;
      })
      .sort()
      .join("\n") + "\n"
  );
}
