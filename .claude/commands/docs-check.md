---
description: Audit the docs for stale paths, broken section citations, and drift from the generated spec
disable-model-invocation: true
---

Human-initiated documentation maintenance. **Report and propose — do not edit
anything unless asked.**

Run:

```
npm run docs:check
npx vitest run tests/structure/docLinks.test.ts tests/structure/variantDocs.test.ts
```

Then look for the things the automated guards deliberately cannot catch:

1. **Anchors that resolve but point at the wrong section.** The guard checks
   that a cited `§N` heading *exists*, not that it is the right one. Spot-check
   citations in `convex/games/**` against what the section actually says. There
   is precedent: `sports/winConditions.ts` cited `§6` (Best Move) for win
   conditions, which are `§7`.

2. **Prose that restates generated data.** Anything in `docs/variants/**` or
   `docs/engine/**` listing roles, deck counts, phase order, or win outcomes
   should be a pointer into `docs/generated/game-spec.md` instead. Duplication
   is how the last round of drift happened.

3. **Status lines that have gone stale.** Headers claiming something is
   "planned", "not yet built", or "in progress". Check them against the code.

4. **Japanese assumptions in shared docs.** The firewall covers `docs/engine/`
   only. The cross-cutting docs at `docs/` root — `backend.md`, `realtime.md`,
   `decisions.md`, `admin-dashboard.md`, `ranking-system.md` — can still quietly
   assume 12 players, three factions, or a doctor.

5. **Orphans.** Docs nothing links to and nothing cites.

Output a table: file, line, what is wrong, proposed fix. Rank by how likely it
is to mislead someone acting on it. Then stop and wait.
