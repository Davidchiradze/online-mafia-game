#!/usr/bin/env node
/**
 * PostToolUse hook: block an i18n edit that breaks en/ka key parity.
 *
 * WHY A HOOK AND NOT A TEST: `ka` is the DEFAULT locale, so an English-only key
 * is a visible hole for most users — and it is invisible to tsc, vitest and
 * next build alike. A test would catch it at push time; this catches it at the
 * moment it is written, which is when it is free to fix.
 *
 * WHY NOT AN ALWAYS-INJECT HOOK: hooks are for deterministic verification the
 * model cannot do by reading. Static guidance belongs in AGENTS.md, which is
 * prompt-cached and paid once — injecting it per prompt pays for it every turn
 * and pushes the actual request further from the end of the context.
 *
 * Exits 0 immediately for any file that is not a locale file, so the cost on an
 * unrelated edit is a few milliseconds.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const LOCALES = ["en", "ka"];

function flatten(value, prefix = "") {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key));
}

let raw = "";
for await (const chunk of process.stdin) raw += chunk;

let payload;
try {
  payload = JSON.parse(raw || "{}");
} catch {
  process.exit(0); // Not our business to fail on an unparseable payload.
}

const filePath = payload?.tool_input?.file_path ?? "";
// Matchers match tool NAMES, not paths, so the path filter has to live here.
if (!/messages\/(en|ka)\.json$/.test(filePath)) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

let keys;
try {
  keys = Object.fromEntries(
    LOCALES.map((locale) => [
      locale,
      new Set(flatten(JSON.parse(readFileSync(join(root, "messages", `${locale}.json`), "utf8")))),
    ]),
  );
} catch (error) {
  console.error(`i18n parity: could not read/parse a locale file — ${error.message}`);
  process.exit(2);
}

const missing = LOCALES.flatMap((locale) => {
  const others = LOCALES.filter((l) => l !== locale);
  return others.flatMap((other) =>
    [...keys[other]].filter((key) => !keys[locale].has(key)).map((key) => `  ${locale}.json is missing: ${key}`),
  );
});

if (missing.length > 0) {
  console.error(
    [
      `i18n parity broken (${missing.length} key${missing.length === 1 ? "" : "s"}).`,
      "`ka` is the DEFAULT locale, so a missing key is a visible hole, not a fallback.",
      "",
      ...missing.slice(0, 25),
      missing.length > 25 ? `  …and ${missing.length - 25} more` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  process.exit(2);
}
