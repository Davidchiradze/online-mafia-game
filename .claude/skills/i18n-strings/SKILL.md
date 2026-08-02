---
name: i18n-strings
description: Every user-facing string is a next-intl key that must exist in BOTH messages/en.json and messages/ka.json - Georgian is the DEFAULT locale, so an English-only key ships a visible hole. Use whenever adding or renaming any label, button, toast, error, or empty state.
---

# i18n

Georgian (`ka`) is the **default locale**, not the fallback. A key added to
`en.json` only does not degrade gracefully — it ships a hole to the majority of
users, and nothing in `tsc`, `vitest`, or `next build` notices.

Current state: **684 keys, exact parity** between the two files. Keep it there.

## Rules

- Every user-facing string is a key. No literals in JSX.
- Add to **both** `messages/en.json` and `messages/ka.json`, in the same place
  in the tree.
- **A rename is two deletes and two adds.** Renaming in one file only is the
  most common way parity breaks.
- Client components: `useTranslations("namespace")`. Server: `getTranslations`.
- Server errors: throw `ConvexError({ code, message })` and add `errors.<CODE>`
  to both files. The client maps the code through
  `src/shared/lib/i18n/errorMessage.ts`.

## Namespaces

`admin`, `common`, `auth`, `notVerified`, `landing`, `lobby`, `nav`,
`subscriptions`, `headquarters`, `communityChat`, `matchHistory`,
`leaderboard`, `game`, `errors`.

Put a new key in the namespace of the feature that renders it; `common` is for
strings genuinely shared across features, not a dumping ground.

## Watch for strings hiding outside JSX

The leak that parity checking does not catch: user-facing text living in a
constants file instead of `messages/`. `GAME_TYPE_LABEL` and
`GAME_STATUS_LABEL` in `src/shared/lib/constants/game.ts` are hardcoded English
today (`"Sports Mafia"`, `"Not started"`) and render to Georgian users as-is.
Do not add more; prefer a key.

Accessible names count too — an untranslated `title` or `aria-label` is an
untranslated string.

## Verification

A `PostToolUse` hook diffs the two key sets whenever either file is edited and
blocks with the missing keys listed, so a mismatch is caught at the moment you
make it. To check by hand:

```bash
node -e '
const f=(o,p="")=>Object.entries(o).flatMap(([k,v])=>typeof v==="object"&&v?f(v,p+k+"."):[p+k]);
const en=new Set(f(require("./messages/en.json"))), ka=new Set(f(require("./messages/ka.json")));
console.log("en-only:",[...en].filter(k=>!ka.has(k)));
console.log("ka-only:",[...ka].filter(k=>!en.has(k)));'
```
