---
description: Run the full pre-push gate (lint, typecheck, tests) and interpret any failures
allowed-tools: Bash(npm run lint), Bash(npm run typecheck), Bash(npm test), Bash(npm run docs:check), Bash(node -e *)
---

Run the real gate, in this order, and report results:

```
npm run lint
npm run typecheck
npm test
```

This is exactly what CI and `.githooks/pre-push` run. `npx tsc` alone is **not**
the gate — the structural guards live in `npm test`.

Then interpret, rather than just pasting output:

| Failure | What it means | Next step |
| --- | --- | --- |
| lint **error** | a rule the codebase satisfies today was broken | fix the code; do not weaken the rule |
| lint **warning** | pre-existing convention backlog | ignore unless you added it |
| `conventions.test.ts` | a file is misnamed or misplaced, or a new decomposition violation appeared | see the `code-structure` skill |
| `docLinks.test.ts` | a doc names a file that does not exist, or a code comment cites a `§N` that was renumbered | fix the doc or restore the heading |
| `variantDocs.test.ts` | a variant has no doc, or variant vocabulary leaked into `docs/engine/` | move the rule to the variant doc |
| `gameSpec.test.ts` | the game rules changed and the generated spec is stale | `npm run docs:generate`, then **read the diff** |
| `apiIntegrity.test.ts` | a Convex module moved and raw ref strings broke | see the `convex-backend` skill |
| `routes.txt` snapshot | the public URL surface moved | almost always a bug |
| any characterization test in `tests/game/` | an assertion changed | that is a behaviour change, not a refactor — confirm it is intended |

Before updating **any** snapshot with `-u`, read the diff and say what changed
and why. See the `game-testing` skill for what each baseline means.

Report concisely: what passed, what failed, and the single next action. If
everything passes, say so in one line.
