/**
 * Documentation integrity guards.
 *
 * SILENT FAILURE MODE: markdown is not compiled, linted, or executed. A doc can
 * name a file that was deleted three refactors ago, cite a `§section` that no
 * longer exists, or link to a moved sibling — and nothing anywhere fails. `tsc`
 * exits 0, `vitest` exits 0, `next build` exits 0. The only consumer that
 * notices is an AI agent, which follows the pointer, does not find the file,
 * and then either edits the wrong place or greps the whole repo to recover —
 * costing more than if the doc had said nothing at all.
 *
 * The `§section` check is the one that repays this file. 89 source comments
 * cite a numbered doc section; deleting or renumbering a heading breaks them
 * with no compiler help whatsoever.
 *
 * Every check collects `"where → what"` strings and asserts the list is empty,
 * so one run reports everything at once instead of failing on the first
 * offender. Derivation lives in tests/support/docPaths.ts.
 */

import { describe, expect, it } from "vitest";
import { existsSync, lstatSync, readlinkSync } from "node:fs";
import { join } from "node:path";

import {
  REPO_ROOT,
  backtickedCandidates,
  docCitations,
  docFiles,
  docIndexText,
  markdownLinks,
  normalizeCandidate,
  numberedHeadings,
  p,
  resolvesRepoPath,
  sourceFiles,
} from "../support/docPaths";

// ---------------------------------------------------------------------------
// Allowlists
// ---------------------------------------------------------------------------

/**
 * Literals shaped like repo paths that are not repo paths.
 * TO ADD: only when the string is genuinely not a file in this repo — a package
 * subpath, or prose that happens to contain a slash.
 */
const NOT_A_REPO_PATH = new Set<string>([
  "convex/react", // the `convex` npm package's React entry point, not a repo dir
]);

/**
 * Paths a doc names that do not exist.
 *
 * TARGET: empty. Pre-populated with the backlog that existed when this guard
 * was written (52 distinct paths, 74 mentions) so the check could land green
 * and be validated against real data before any file moved. Drained by the
 * repointing commit; the archived migration narratives drop out earlier, when
 * `docs/archive/` makes them path-exempt.
 *
 * TO ADD: essentially never. A new entry means a doc was written against a file
 * that was never created — fix the doc instead.
 */
const KNOWN_ABSENT: { path: string; why: string }[] = [];

/**
 * Old paths a doc names ON PURPOSE, because naming them IS the content: an ADR
 * recording what moved where, or a migration mapping written as `old → new`.
 * Repointing these would destroy the sentence.
 *
 * Scoped to a specific doc, not global — `convex/lib/winConditions.ts` is
 * legitimate history in testing.md's move mapping and was simultaneously a
 * WRONG live claim in three other docs. A global allowlist would have excused
 * all four.
 *
 * `supersededBy` must resolve, and is asserted below. That is what stops this
 * list from becoming a place to hide rot: an entry has to prove the move it
 * claims actually happened.
 *
 * TO ADD: only when the doc is describing the move itself, in the past tense.
 */
const HISTORICAL_PATHS: { doc: string; path: string; supersededBy: string }[] = [
  {
    doc: "docs/decisions.md",
    path: "convex/game/",
    supersededBy: "convex/games/core/",
  },
  {
    doc: "docs/decisions.md",
    path: "src/game/",
    supersededBy: "src/features/game-room/variants/",
  },
  {
    doc: "docs/decisions.md",
    path: "src/lib/utils.ts",
    supersededBy: "src/shared/lib/cn.ts",
  },
  {
    doc: "docs/testing.md",
    path: "convex/lib/winConditions.ts",
    supersededBy: "convex/games/japanese/winConditions.ts",
  },
];

const isHistorical = (doc: string, path: string) =>
  HISTORICAL_PATHS.some((entry) => entry.doc === doc && entry.path === path);

/**
 * Under docs/archive/, backticked paths are FROZEN historical references — the
 * entire point of the folder is that its claims were true on the date in the
 * filename. They are not path-checked. Doc→doc LINKS still are: a dangling link
 * is navigation rot regardless of the file's age.
 */
const PATH_CHECK_EXEMPT_DIRS = ["docs/archive/"] as const;

const isPathCheckExempt = (repoPath: string) =>
  PATH_CHECK_EXEMPT_DIRS.some((dir) => repoPath.startsWith(dir));

const knownAbsentPaths = new Set(KNOWN_ABSENT.map((entry) => entry.path));

// ---------------------------------------------------------------------------

const docs = docFiles();
const sources = sourceFiles();
const docBasenames = new Set(docs.map((d) => d.repoPath.split("/").pop()!));
const headingsByBasename = new Map(
  docs.map((d) => [d.repoPath.split("/").pop()!, numberedHeadings(d.text)] as const),
);

describe("docs", () => {
  it("resolves every relative link between docs", () => {
    // 0 broken today. This is the regression guard for the restructure: moving
    // a doc without updating its referrers shows up here immediately.
    const broken: string[] = [];
    for (const { repoPath, text } of docs) {
      const dir = join(REPO_ROOT, repoPath, "..");
      for (const target of markdownLinks(text)) {
        const abs = target.startsWith("/") ? p(target.slice(1)) : join(dir, target);
        if (!existsSync(abs)) broken.push(`${repoPath} → ${target}`);
      }
    }
    expect(
      broken,
      "these doc links point at files that do not exist — navigation dead-ends",
    ).toEqual([]);
  });

  it("resolves every backticked repo path", () => {
    const missing: string[] = [];
    for (const { repoPath, text } of docs) {
      if (isPathCheckExempt(repoPath)) continue;
      for (const candidate of backtickedCandidates(text)) {
        if (NOT_A_REPO_PATH.has(candidate)) continue;
        if (knownAbsentPaths.has(candidate)) continue;
        if (isHistorical(repoPath, candidate)) continue;
        if (!resolvesRepoPath(candidate)) missing.push(`${repoPath} → ${candidate}`);
      }
    }
    expect(
      missing,
      "these docs name files that do not exist — an agent following one edits a path that was deleted",
    ).toEqual([]);
  });

  it("resolves every docs/*.md cited from source", () => {
    const missing: string[] = [];
    for (const { repoPath, text } of sources) {
      for (const { doc } of docCitations(text, docBasenames)) {
        const candidates = docs.filter((d) => d.repoPath.endsWith(`/${doc}`) || d.repoPath === doc);
        if (candidates.length === 0) missing.push(`${repoPath} → ${doc}`);
      }
    }
    expect(
      missing,
      "these code comments cite a doc that no longer exists at that name",
    ).toEqual([]);
  });

  it("resolves every §section cited from source", () => {
    // The highest-value check here. Gutting a doc body is safe; deleting or
    // renumbering its heading is not, and nothing else in the toolchain knows.
    const broken: string[] = [];
    for (const { repoPath, text } of sources) {
      for (const { doc, sections } of docCitations(text, docBasenames)) {
        const headings = headingsByBasename.get(doc);
        if (!headings) continue;
        for (const section of sections) {
          if (!headings.has(section)) broken.push(`${repoPath} → ${doc} §${section}`);
        }
      }
    }
    expect(
      broken,
      "these code comments cite a doc section that no longer exists — the doc was renumbered or gutted without repointing them",
    ).toEqual([]);
  });

  it("keeps CLAUDE.md pointing at AGENTS.md", () => {
    // AGENTS.md holds the bytes (the cross-tool convention); CLAUDE.md is the
    // filename Claude Code actually auto-loads. If a tool write-through-breaks
    // the symlink, the two silently diverge and the agent reads a stale copy —
    // with no error anywhere.
    const claude = p("CLAUDE.md");
    expect(existsSync(claude), "CLAUDE.md is missing — nothing is auto-loaded").toBe(true);
    expect(
      lstatSync(claude).isSymbolicLink(),
      "CLAUDE.md is a real file, not a symlink to AGENTS.md — they will drift",
    ).toBe(true);
    expect(readlinkSync(claude), "CLAUDE.md should link to AGENTS.md").toBe("AGENTS.md");
    expect(existsSync(p("AGENTS.md")), "the symlink target does not exist").toBe(true);
  });

  it("keeps docs/generated/* marked DO NOT EDIT", () => {
    const generated = docs.filter((d) => d.repoPath.startsWith("docs/generated/"));
    const unmarked = generated
      .filter((d) => !/DO NOT EDIT/i.test(d.text.slice(0, 600)))
      .map((d) => d.repoPath);
    expect(
      unmarked,
      "generated docs must announce themselves — an unmarked one invites a hand-edit that the next regenerate silently discards",
    ).toEqual([]);
  });

  it("keeps every docs/archive/* file marked as frozen", () => {
    // Archived docs are exempt from path-checking, so the banner is what earns
    // the exemption. Without this, dropping a file into archive/ is a way to
    // dodge the guard rather than a way to retire a document.
    const archived = docs.filter((d) => d.repoPath.startsWith("docs/archive/"));
    const unmarked = archived
      .filter((d) => !/ARCHIVED/i.test(d.text.slice(0, 600)))
      .map((d) => d.repoPath);
    expect(
      unmarked,
      "archived docs must carry a frozen banner — they are exempt from path checks and must say why",
    ).toEqual([]);
  });

  it("keeps every historical path's replacement real", () => {
    // The entire justification for HISTORICAL_PATHS is that the doc is
    // describing a move. If the destination does not exist, it was not a move —
    // it is rot wearing a costume.
    const broken = HISTORICAL_PATHS.filter(
      (entry) => !resolvesRepoPath(entry.supersededBy),
    ).map((entry) => `${entry.doc}: ${entry.path} → ${entry.supersededBy} (destination missing)`);
    expect(
      broken,
      "a historical mapping points at a destination that does not exist — so it is not history, it is a broken path",
    ).toEqual([]);
  });

  it("has no stale allowlist entries", () => {
    const candidatesByDoc = new Map<string, Set<string>>();
    const allCandidates = new Set<string>();
    for (const { repoPath, text } of docs) {
      if (isPathCheckExempt(repoPath)) continue;
      const found = new Set(backtickedCandidates(text));
      candidatesByDoc.set(repoPath, found);
      for (const candidate of found) allCandidates.add(candidate);
    }

    const stale = [
      ...[...NOT_A_REPO_PATH]
        .filter((entry) => !allCandidates.has(entry))
        .map((entry) => `${entry} — no longer referenced by any doc`),
      ...KNOWN_ABSENT.filter((entry) => resolvesRepoPath(entry.path)).map(
        (entry) => `${entry.path} — now EXISTS, delete this entry`,
      ),
      ...KNOWN_ABSENT.filter((entry) => !allCandidates.has(entry.path)).map(
        (entry) => `${entry.path} — no longer referenced by any doc`,
      ),
      ...HISTORICAL_PATHS.filter(
        (entry) => !candidatesByDoc.get(entry.doc)?.has(entry.path),
      ).map((entry) => `${entry.doc}: ${entry.path} — that doc no longer names it`),
      ...HISTORICAL_PATHS.filter((entry) => resolvesRepoPath(entry.path)).map(
        (entry) => `${entry.doc}: ${entry.path} — now EXISTS, delete this entry`,
      ),
    ];
    expect(
      stale,
      "allowlisted but no longer needed — delete these so the list keeps meaning something",
    ).toEqual([]);
  });

  it("keeps the stale-path backlog at zero", () => {
    // Drained during the repointing commit and kept there. A non-empty backlog
    // means a doc names a file that does not exist and nobody fixed it — repoint
    // the doc rather than adding an entry here. Deliberately-historical paths go
    // in HISTORICAL_PATHS, which has to prove its replacements are real.
    expect(
      KNOWN_ABSENT.map((entry) => entry.path),
      "the stale-path backlog is no longer empty — repoint the doc instead of allowlisting it",
    ).toEqual([]);
  });

  it("matches the doc index snapshot", async () => {
    await expect(docIndexText()).toMatchFileSnapshot("./__snapshots__/docIndex.txt");
  });
});

// ---------------------------------------------------------------------------

describe("doc path candidate extraction", () => {
  // The checker is only as good as its scoping. These pin the two behaviours
  // that decide whether a real breakage is reported or silently skipped.
  it("scopes candidates to real repo roots", () => {
    expect(normalizeCandidate("convex/games/registry.ts")).toBe("convex/games/registry.ts");
    expect(normalizeCandidate("./src/shared/lib/cn.ts")).toBe("src/shared/lib/cn.ts");
    expect(normalizeCandidate("convex/refs/game:getGame")).toBe("convex/refs/game");
    expect(normalizeCandidate("Modal.tsx")).toBeNull();
    expect(normalizeCandidate("/etc/prometheus/prometheus.yml")).toBeNull();
    expect(normalizeCandidate("useQuery(api.x.y)")).toBeNull();
    expect(normalizeCandidate("convex")).toBeNull();
  });

  it("resolves braces, globs, and extensionless specifiers", () => {
    expect(resolvesRepoPath("convex/games/{japanese,sports}/definition.ts")).toBe(true);
    expect(resolvesRepoPath("convex/games/**")).toBe(true);
    expect(resolvesRepoPath("convex/_generated/dataModel")).toBe(true);
    expect(resolvesRepoPath("convex/games/atlantean/definition.ts")).toBe(false);
  });
});
