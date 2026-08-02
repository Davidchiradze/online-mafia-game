---
name: code-structure
description: Where a new file goes in this repo and what to call it - components, hooks, utils, context, icons, tests. Use before creating ANY file, when deciding whether to split a component, when adding an icon or SVG, or when a conventions test fails. Answers "where does this go".
---

# Where code goes

Decide the **kind** of thing first, then the table gives you the directory, the
filename, and the export style. When two answers seem possible, pick the one
that keeps a feature's internals inside that feature.

## The decision table

| Making… | Path | Filename | Export |
| --- | --- | --- | --- |
| A component used by one feature | `src/features/<feature>/components/` | `PascalCase.tsx` | `export default function` |
| …one of many in a feature (>~8) | `src/features/<feature>/components/<group>/` | `PascalCase.tsx` | `export default function` |
| A component used by 2+ features | `src/shared/ui/` | `PascalCase.tsx` | `export default function` |
| A hook for one feature | `src/features/<feature>/hooks/` | `useCamelCase.ts` | named `export function useX` |
| A hook used by 2+ features | `src/shared/hooks/` | `useCamelCase.ts` | named |
| Pure helper for one feature | `src/features/<feature>/lib/` | `camelCase.ts` | named |
| Pure helper used by 2+ | `src/shared/lib/<area>/` | `camelCase.ts` | named |
| A React context | `src/features/<feature>/context/` | `camelCaseContext.tsx` | named provider + hook |
| Constants | `src/shared/lib/constants/` | `camelCase.ts` | `UPPER_SNAKE` values |
| An icon | see **Icons** below | | |
| A Convex function | `convex/<area>/camelCase.ts` | `camelCase.ts` | named `query`/`mutation` |
| Variant-specific game rules | `convex/games/<variant>/` (backend) or `src/features/game-room/variants/<variant>/` (UI) | `camelCase.ts` | named |
| A test | `tests/<tier>/` | `camelCase.test.ts` | — |

Directories are **kebab-case**, always. Feature folders too (`game-room`, not
`gameRoom`).

## Rules that get broken most

**One component per file.** If you are writing a second `function Foo()` in a
file, it belongs in its own file next to the first. The reason is retrieval: a
component that is not the filename cannot be found by anyone looking for it.
(Variant `phaseControls.tsx` files are the one exemption — they colocate a
phase's tiny controls with the map that registers them.)

**Split past ~200 lines.** Not a style preference: a file over 200 lines
reliably contains a hook, a helper, or three components that were never pulled
out. Extract the hook to `hooks/`, the helper to `lib/`, the sub-components to
their own files.

**No helper functions inside a component body.** Event handlers (`handleClick`)
stay inside — everything else, especially formatters, goes to `lib/`. A
formatter defined in a component body is re-created every render and cannot be
tested or reused.

**Hooks live in `hooks/`.** Not next to the component that happens to use them
today.

**`components/` holds components.** A `.ts` file in there (other than
`index.ts`) is a helper that belongs in `lib/`.

## Icons — the ladder

Follow it in order and stop at the first that works:

1. **`lucide-react`.** Already a dependency, used in 65+ files, and set as the
   icon library in `components.json`. `import { Crown, Skull } from "lucide-react"`.
2. **`src/shared/ui/icons/`**, only if lucide genuinely lacks it. Use the
   `IconProps = React.SVGProps<SVGSVGElement>` contract from
   `FullscreenEnter.tsx` — props spread through, so the icon is styleable — and
   export it from `icons/index.ts`.
3. **Never inline `<svg>` in a feature component.** It cannot be themed, cannot
   be reused, and in practice arrives with hardcoded hex colours that bypass
   Tailwind entirely.

Decorative artwork is not an icon. It is a component under the feature's
`assets/`, using theme colours.

> Live example of what this prevents: `TableStage.tsx` inlines lucide's `Crown`
> and `Skull` verbatim — and `Skull`'s paths already exist *both* in lucide
> *and* in `src/shared/ui/icons/Skull.tsx`. Three copies of one icon.

## Imports

- `@/` for `src`, `@convex/` for `convex`. Never `../../` — it breaks on the
  next move.
- **`convex/` may never import from `src/`.** One-way boundary; lint errors.
- Inside `convex/`, imports are **relative** (`../../lib/constants`). Convex's
  bundler does not read tsconfig paths, so the aliases are a `src/` convention.
- Call Convex from the client through `convex/refs/*`, not `api.*`.

## Before you finish

`npm run lint` flags most of this in the editor as you type. The gate is
`npm test` → `tests/structure/conventions.test.ts`:

- Six conventions are at **zero** and hard-fail on any new violation: kebab
  directories, hook naming, Convex module naming, no `../../`, no `any`,
  `"use client"` before the first import.
- The rest ratchet against `tests/structure/__snapshots__/conventionDebt.txt`.
  It fails in **both** directions — a new violation fails, and fixing one
  without regenerating also fails. Never hand-edit that file; fix the code and
  run `npx vitest run tests/structure -u`.

A failure names the file and the rule. If you disagree with a rule, change the
rule in `tests/support/sourceTree.ts` and say why — do not add a baseline line.
