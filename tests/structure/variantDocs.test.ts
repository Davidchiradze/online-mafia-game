/**
 * Variant-documentation guards.
 *
 * SILENT FAILURE MODE: this project shipped with one variant, so its docs were
 * written as if Japanese Mafia were simply "the game". When `sports_mafia`
 * landed, nothing anywhere noticed that `game-end-conditions.md` — a generic
 * title, cited from shared-engine files — described three factions, a SHOGUN,
 * and a DOCTOR that Sports does not have. There was no failing test, because
 * there is no such thing as a type error in prose.
 *
 * Two guards, so that adding the third variant is additive instead of an
 * archaeology exercise:
 *
 *   COVERAGE — every registered variant has a doc. Registering `city_mafia`
 *   fails the build until `docs/variants/city.md` exists. Documentation becomes
 *   a step you cannot forget rather than one you are trusted to remember.
 *
 *   VOCABULARY FIREWALL — nothing under `docs/engine/` may name a role or phase
 *   that only some variants have. The banned lists are DERIVED from the
 *   registry, not hardcoded, so they stay correct as variants come and go: a
 *   role is variant-specific precisely when at least one registered variant
 *   lacks it. This is the guard that makes "shared doc quietly became
 *   Japanese-only" a build failure.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { getGameDefinition } from "@convex/games/registry";
import { GAME_TYPES, GamePhase } from "@/shared/lib/constants/game";

const REPO_ROOT = new URL("../../", import.meta.url).pathname;
const p = (rel: string) => join(REPO_ROOT, rel);

/**
 * A variant counts as REGISTERED when the registry can resolve it. `GAME_TYPES`
 * is the wider set — it carries `city_mafia`, which is reserved in the union
 * but has no definition — and asking for docs on an unbuilt variant would be
 * noise. Probing the real function means this needs no parsing and no second
 * list to keep in sync.
 */
const registered = GAME_TYPES.flatMap((id) => {
  try {
    return [{ id, def: getGameDefinition(id) }];
  } catch {
    return [];
  }
});

/** `japanese_mafia` → `japanese`. A variant not named `*_mafia` keeps its id. */
const docSlug = (id: string) => id.replace(/_mafia$/, "");

/**
 * Variant docs that may sit under `docs/variants/` with NO definition
 * registered — a variant designed but not yet built.
 *
 * The coverage check's mirror image normally forbids this, because a doc for an
 * uncreatable variant is a reader trap. The exemption exists because the
 * alternative is worse: parking a designed variant under `docs/proposals/`
 * splits one variant's documentation away from its siblings, and the folder it
 * eventually belongs in is the folder people look in.
 *
 * The listing does NOT grant the exemption on its own — the doc has to declare
 * itself unbuilt in its opening banner (checked below), exactly as
 * `docs/archive/*` earns its path-check exemption in
 * tests/structure/docLinks.test.ts by carrying a frozen banner. Without that,
 * dropping a file in here would be a way to dodge the guard rather than a way
 * to stage a design.
 *
 * TO ADD: a variant with a written design and no definition yet.
 * TO REMOVE: the moment it registers — enforced as a stale entry below.
 */
const UNREGISTERED_VARIANT_DOCS = new Map<string, string>([
  [
    "serial_killer",
    "designed 2026-08-18; win formula deliberately TBD, and it is the first variant to ADD a faction, which is schema work before anything can be registered",
  ],
]);

/** The banner that earns a slot in the map above. */
const UNBUILT_BANNER = /\bnot built\b/i;

// ---------------------------------------------------------------------------
// Coverage
// ---------------------------------------------------------------------------

describe("variant documentation coverage", () => {
  it("registers at least two variants", () => {
    // Guards the guards: if the probe above silently resolved nothing, every
    // check in this file would vacuously pass.
    expect(
      registered.map((v) => v.id).sort(),
      "the registry probe found no variants — the firewall below would be vacuous",
    ).toEqual(["japanese_mafia", "sports_mafia"]);
  });

  it("documents every registered variant", () => {
    const missing = registered
      .filter(({ id }) => {
        const slug = docSlug(id);
        return !existsSync(p(`docs/variants/${slug}.md`)) && !existsSync(p(`docs/variants/${slug}`));
      })
      .map(({ id }) => `${id} → expected docs/variants/${docSlug(id)}.md or .../${docSlug(id)}/`);

    expect(
      missing,
      "a variant is registered but undocumented — add its doc before shipping it",
    ).toEqual([]);
  });

  it("has no variant docs for unregistered variants", () => {
    // The reverse direction. A doc for a variant nobody registered is a reader
    // trap: it describes a game that cannot be created. Designed-but-unbuilt
    // variants are exempt, and pay for it with a banner (next test).
    const slugs = new Set(registered.map(({ id }) => docSlug(id)));
    const orphans = readdirSync(p("docs/variants"), { withFileTypes: true })
      .map((e) => e.name.replace(/\.md$/, ""))
      .filter((name) => !slugs.has(name) && !UNREGISTERED_VARIANT_DOCS.has(name))
      .map((name) => `docs/variants/${name} → no registered variant resolves to this`);

    expect(orphans, "these variant docs describe a variant the registry does not know").toEqual([]);
  });

  it("makes every unregistered variant doc announce that it is not built", () => {
    // The banner IS the exemption. A reader who lands on one of these files
    // must learn in the first paragraph that none of it ships — otherwise it
    // reads exactly like its registered siblings, which is the trap the
    // coverage mirror exists to prevent.
    const unmarked: string[] = [];
    for (const slug of UNREGISTERED_VARIANT_DOCS.keys()) {
      const dir = p(`docs/variants/${slug}`);
      const files = existsSync(dir)
        ? readdirSync(dir)
            .filter((f) => f.endsWith(".md"))
            .map((f) => `docs/variants/${slug}/${f}`)
        : [`docs/variants/${slug}.md`];
      for (const repoPath of files) {
        if (!existsSync(p(repoPath))) continue; // reported as stale below
        const text = readFileSync(p(repoPath), "utf8");
        if (!UNBUILT_BANNER.test(text.slice(0, 600))) unmarked.push(repoPath);
      }
    }
    expect(
      unmarked,
      'an unregistered variant doc does not say "not built" up front — it reads as a shipped variant',
    ).toEqual([]);
  });

  it("has no stale unregistered-variant exemptions", () => {
    const registeredSlugs = new Set(registered.map(({ id }) => docSlug(id)));
    const stale = [
      ...[...UNREGISTERED_VARIANT_DOCS.keys()]
        .filter((slug) => registeredSlugs.has(slug))
        .map((slug) => `${slug} — now REGISTERED, delete this entry and drop the "not built" banners`),
      ...[...UNREGISTERED_VARIANT_DOCS.keys()]
        .filter(
          (slug) => !existsSync(p(`docs/variants/${slug}`)) && !existsSync(p(`docs/variants/${slug}.md`)),
        )
        .map((slug) => `${slug} — no such doc, delete this entry`),
    ];
    expect(stale, "exempted but no longer needed — delete these").toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Vocabulary firewall
// ---------------------------------------------------------------------------

/** Present in at least one registered variant, absent from at least one other. */
function variantSpecific(pick: (def: ReturnType<typeof getGameDefinition>) => readonly string[]) {
  const sets = registered.map(({ def }) => new Set(pick(def)));
  const all = new Set(sets.flatMap((s) => [...s]));
  return [...all].filter((term) => sets.some((s) => !s.has(term))).sort();
}

const VARIANT_ROLES = variantSpecific((def) => def.roles);
const VARIANT_PHASES = variantSpecific((def) => def.phases);

/**
 * Terms the derivation flags but that are genuinely shared in practice.
 * TO ADD: only with a reason that survives reading the code.
 */
const FIREWALL_TERM_EXEMPT = new Map<string, string>([
  [
    GamePhase.PHASE_TRANSITION,
    // Known, test-pinned drift: the backend GAME_PHASES predates the buffer, so
    // JAPANESE_DEFINITION.phases omits a phase its own UI flow routes through
    // (8 of its 14 host-advance edges). Shared mechanism, not a Sports feature.
    "shared sleep buffer; absent from the Japanese phase list only because of the drift pinned in tests/game/phases.test.ts",
  ],
]);

/**
 * Files under docs/engine/ exempt from the firewall, with the reason.
 * TO ADD: essentially never — an engine doc that must name variant vocabulary
 * is usually a variant doc that landed in the wrong folder.
 */
const FIREWALL_FILE_EXEMPT = new Map<string, string>([
  [
    "docs/engine/variant-architecture.md",
    "this doc's SUBJECT is how variants differ — a comparison table naming SHOGUN or best_move is the content, not a leak",
  ],
]);

const bannedRoles = VARIANT_ROLES.filter((r) => !FIREWALL_TERM_EXEMPT.has(r));
const bannedPhases = VARIANT_PHASES.filter((ph) => !FIREWALL_TERM_EXEMPT.has(ph));

function engineDocs(): { repoPath: string; text: string }[] {
  const dir = p("docs/engine");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({
      repoPath: `docs/engine/${f}`,
      text: readFileSync(join(dir, f), "utf8"),
    }));
}

describe("engine docs stay variant-agnostic", () => {
  it("derives the banned vocabulary from the registry", () => {
    // Pinned so the firewall cannot quietly become a no-op. If a variant gains
    // or loses a role, this is where you find out.
    expect(VARIANT_ROLES).toEqual(["DOCTOR", "SHOGUN", "YAKUZA"]);
    expect(bannedPhases.length, "no variant-specific phases derived — firewall would be toothless")
      .toBeGreaterThan(0);
  });

  it("names no variant-specific role", () => {
    const leaks: string[] = [];
    for (const { repoPath, text } of engineDocs()) {
      if (FIREWALL_FILE_EXEMPT.has(repoPath)) continue;
      for (const role of bannedRoles) {
        // Case-sensitive whole word: the uppercase token is the role. The
        // lowercase faction names in the `winner` schema union are shared.
        if (new RegExp(`\\b${role}\\b`).test(text)) leaks.push(`${repoPath} → ${role}`);
      }
    }
    expect(
      leaks,
      "an engine doc names a role that not every variant has — move that rule into the variant's doc",
    ).toEqual([]);
  });

  it("names no variant-specific phase", () => {
    const leaks: string[] = [];
    for (const { repoPath, text } of engineDocs()) {
      if (FIREWALL_FILE_EXEMPT.has(repoPath)) continue;
      for (const phase of bannedPhases) {
        if (new RegExp(`\\b${phase}\\b`).test(text)) leaks.push(`${repoPath} → ${phase}`);
      }
    }
    expect(
      leaks,
      "an engine doc names a phase that not every variant has — move that rule into the variant's doc",
    ).toEqual([]);
  });

  it("states no literal seat count", () => {
    const counts = [...new Set(registered.map(({ def }) => def.seatCount))];
    const leaks: string[] = [];
    for (const { repoPath, text } of engineDocs()) {
      if (FIREWALL_FILE_EXEMPT.has(repoPath)) continue;
      for (const n of counts) {
        if (new RegExp(`\\b${n}[\\s-](players?|seats?)\\b`, "i").test(text)) {
          leaks.push(`${repoPath} → "${n} players/seats"`);
        }
      }
    }
    expect(
      leaks,
      "an engine doc hardcodes one variant's seat count — read it from the definition instead",
    ).toEqual([]);
  });

  it("has no stale firewall exemptions", () => {
    const stale = [
      ...[...FIREWALL_FILE_EXEMPT.keys()]
        .filter((f) => !existsSync(p(f)))
        .map((f) => `${f} — exempted file no longer exists`),
      ...[...FIREWALL_TERM_EXEMPT.keys()]
        .filter((t) => !VARIANT_ROLES.includes(t) && !VARIANT_PHASES.includes(t))
        .map((t) => `${t} — no longer derived as variant-specific, exemption is dead`),
    ];
    expect(stale, "exempted but no longer needed — delete these").toEqual([]);
  });
});
