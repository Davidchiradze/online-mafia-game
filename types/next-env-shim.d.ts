// Committed stand-in for the ambient type references Next.js writes into
// `next-env.d.ts`.
//
// `next-env.d.ts` is gitignored and only (re)generated when `next dev`/`next build`
// runs, so it is ABSENT in CI, where we run `npm ci` + `tsc --noEmit` without a
// build. Without these references, `tsc` cannot resolve static asset imports
// (e.g. `import card from "@/assets/images/cards/don.png"`) and fails with
// TS2307. This file makes the typecheck pass identically locally and in CI.
//
// Safe to have alongside the generated `next-env.d.ts`: both point at the same
// declaration files in `node_modules/next`, which TypeScript loads only once.
/// <reference types="next" />
/// <reference types="next/image-types/global" />
