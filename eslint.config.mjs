import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

/**
 * Lint config for online-mafia.
 *
 * DIVISION OF LABOUR — read this before changing a severity.
 *
 * ESLint is the *fast* signal: it squiggles in the editor while a file is being
 * written, which is the only moment a misplaced component is cheap to fix.
 * `tests/structure/conventions.test.ts` is the *hard* signal: it runs in CI and
 * pre-push against a checked-in baseline and cannot be bypassed.
 *
 * So severity here encodes debt, not importance:
 *
 *   error — the codebase satisfies this today. Breaking it is a regression
 *           introduced right now, and CI should refuse it.
 *   warn  — a pre-existing backlog exists (86 violations across 6 rules when
 *           this was written). Erroring would either fail CI on day one or
 *           require ~86 eslint-disable comments, and neither buys anything the
 *           conventions test does not already guarantee. That test owns the
 *           ratchet; these warnings tell you, in the editor, not to add more.
 *
 * Promote a warn to error once its baseline reaches zero.
 * Never silence one by weakening the rule — fix the file.
 */
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  {
    ignores: [".next/**", "node_modules/**", "convex/_generated/**", "next-env.d.ts"],
  },

  {
    rules: {
      // --- error: satisfied today, so any hit is new ------------------------

      // The one-way boundary. `convex/` is the authoritative layer and is
      // bundled by Convex, which does not read tsconfig paths — an import from
      // src/ is both an architecture violation and a deploy-time failure.
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./convex",
              from: "./src",
              message:
                "convex/ must not import from src/. The boundary is one-way: src/ imports convex via @convex/*.",
            },
          ],
        },
      ],

      // --- warn: pre-existing debt, tracked by the conventions test ---------

      // 29 files. Several components in one file cannot be found by filename,
      // which is how anyone actually looks for them.
      "react/no-multi-comp": ["warn", { ignoreStateless: false }],

      // 20 files. Deep JSX is the reliable tell that a component is really
      // several components that have not been separated yet.
      "react/jsx-max-depth": ["warn", { max: 10 }],

      // 14 files. An inline <svg> cannot be themed or reused. Order of
      // preference: lucide-react → src/shared/ui/icons/ (only if lucide lacks
      // it) → never inline in a feature component.
      "no-restricted-syntax": [
        "warn",
        {
          selector: 'JSXOpeningElement[name.name="svg"]',
          message:
            "No inline <svg>. Import from lucide-react; if lucide lacks the icon, add a component under src/shared/ui/icons/ and export it from the barrel.",
        },
      ],
    },
  },

  {
    // 22 files. A component past ~200 lines is doing more than one job.
    // Counted excluding blanks and comments, so documentation is never the
    // reason to split a file.
    files: ["src/**/*.tsx"],
    rules: {
      "max-lines": ["warn", { max: 200, skipBlankLines: true, skipComments: true }],
    },
  },

  {
    // This directory IS the inline-SVG convention — every file here is one icon.
    files: ["src/shared/ui/icons/**/*.tsx"],
    rules: { "no-restricted-syntax": "off" },
  },

  {
    // Variant ruleset modules intentionally colocate a phase's small control
    // components with the map that registers them (docs/game-types.md §2.2).
    files: ["src/features/game-room/variants/**/*.tsx"],
    rules: { "react/no-multi-comp": "off" },
  },

  {
    // Tests assert on shapes that are deliberately malformed, and structure
    // tests read source as data rather than importing it.
    files: ["tests/**/*.ts", "convex/tests/**/*.ts"],
    rules: {
      "no-restricted-syntax": "off",
      "max-lines": "off",
    },
  },
];

export default eslintConfig;
