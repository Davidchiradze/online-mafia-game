/**
 * "Magic path" guards — filesystem locations that carry meaning to a framework
 * rather than to the module graph. Every one of these fails SILENTLY when moved:
 * no type error, no build error, and in some cases no visible symptom until a
 * user hits it.
 *
 * These are the paths the folder migration must not disturb. Each assertion
 * names the mechanism and the failure mode, because the failure modes are not
 * guessable from the code.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = new URL("../../", import.meta.url).pathname;
const p = (rel: string) => join(REPO_ROOT, rel);

describe("magic paths", () => {
  it("keeps next-intl's request config at an auto-discovered location", () => {
    // next-intl auto-discovers ONLY `./i18n/request.{ts,tsx,js}` or
    // `./src/i18n/request.*`. Move it anywhere else and there is no error —
    // messages simply stop loading, which outside of dev/build surfaces as
    // untranslated keys in production.
    const candidates = [
      "src/i18n/request.ts",
      "src/i18n/request.tsx",
      "src/i18n/request.js",
      "i18n/request.ts",
      "i18n/request.tsx",
      "i18n/request.js",
    ];
    const found = candidates.filter((c) => existsSync(p(c)));
    expect(
      found,
      "next-intl only auto-discovers (src/)i18n/request.* — a moved file loads no messages",
    ).not.toEqual([]);
  });

  it("resolves the dynamic `../../messages/${locale}.json` template import", () => {
    // request.ts builds this specifier with a template literal, so it is
    // invisible to tsc AND to bundler resolution analysis. It is depth-coupled:
    // `src/i18n/request.ts` → `../../messages/` → `<root>/messages/`.
    const requestPath = p("src/i18n/request.ts");
    const source = readFileSync(requestPath, "utf8");

    const match = source.match(/import\(`(.+?)`\)/);
    expect(match, "expected a template-literal dynamic import in i18n/request.ts").not.toBeNull();

    const template = match![1]; // e.g. ../../messages/${locale}.json
    const dirDepth = "src/i18n".split("/").length;
    const prefix = template.replace(/\$\{.*?\}.*$/, ""); // ../../messages/
    const upCount = (prefix.match(/\.\.\//g) || []).length;
    expect(
      upCount,
      `the import climbs ${upCount} level(s) but request.ts sits ${dirDepth} deep — ` +
        `moving the file breaks message loading with no error`,
    ).toBe(dirDepth);

    // And every locale the app can select must actually have a file.
    const messagesDir = prefix.replace(/^(\.\.\/)+/, "");
    const locales = readdirSync(p(messagesDir)).filter((f) => f.endsWith(".json"));
    expect(locales.length, `no locale JSON found in ${messagesDir}/`).toBeGreaterThan(0);

    // The hardcoded locale in request.ts must be one of them.
    const localeMatch = source.match(/const locale = "([a-z-]+)"/);
    if (localeMatch) {
      expect(locales).toContain(`${localeMatch[1]}.json`);
    }
  });

  it("resolves the next/font/local src path out of app/layout.tsx", () => {
    // This `src` escapes the project into node_modules, so its correctness
    // depends on layout.tsx's exact depth. A wrong path is a BUILD error in
    // some Next versions and a missing-font fallback in others — and the
    // Georgian UI is unreadable in a Latin fallback.
    const layout = p("src/app/layout.tsx");
    const source = readFileSync(layout, "utf8");

    const srcMatches = [...source.matchAll(/localFont\(\{[\s\S]*?src:\s*"(.+?)"/g)];
    expect(srcMatches.length, "expected a localFont({ src }) in app/layout.tsx").toBeGreaterThan(0);

    for (const m of srcMatches) {
      const rel = m[1];
      const resolved = join(p("src/app"), rel);
      expect(existsSync(resolved), `next/font/local src does not resolve: ${rel}`).toBe(true);
    }
  });

  it("keeps middleware.ts at a Next-recognized location with a default export", () => {
    // ⚠️ HIGHEST-SEVERITY magic path. Middleware is only picked up at
    // `src/middleware.ts` or `middleware.ts` (project root). Moving it does not
    // break the build — it silently DISABLES ALL MIDDLEWARE, which here means
    // every auth gate stops running. That is an auth bypass, not a broken page.
    const candidates = ["src/middleware.ts", "middleware.ts"];
    const found = candidates.filter((c) => existsSync(p(c)));
    expect(found.length, "middleware.ts must sit at src/ or repo root").toBe(1);

    const source = readFileSync(p(found[0]), "utf8");
    expect(
      /export default (async )?function|export default \w+/.test(source),
      "middleware.ts needs a default export to run",
    ).toBe(true);
    expect(
      /export const config/.test(source),
      "middleware.ts lost its `config` matcher — its route coverage changed",
    ).toBe(true);
  });

  it("keeps the Convex HTTP router at convex/http.ts with a default export", () => {
    // Convex discovers the HTTP router at exactly `convex/http.ts` and nowhere
    // else. Rename the file, or drop the DEFAULT export, and every route it
    // declares stops existing — `convex deploy` succeeds, `tsc` is silent, and
    // the only symptom is mafia.ge's stats integration getting a 404 body it
    // will most likely log and ignore.
    const routerPath = p("convex/http.ts");
    expect(existsSync(routerPath), "the Convex HTTP router must sit at convex/http.ts").toBe(
      true,
    );

    const source = readFileSync(routerPath, "utf8");
    expect(
      /export default \w+/.test(source),
      "convex/http.ts must default-export the router — a named export registers no routes",
    ).toBe(true);

    // Each route's handler must be a real export of the module it comes from.
    // `httpRouter().route({ handler })` takes any value; a typo'd or deleted
    // handler import is the other way these routes vanish quietly.
    const handlers = [...source.matchAll(/handler:\s*(\w+)\s*,?\s*\}/g)].map((m) => m[1]);
    expect(handlers.length, "expected at least one routed handler").toBeGreaterThan(0);

    for (const handler of handlers) {
      const importMatch = source.match(
        new RegExp(`import\\s*\\{[^}]*\\b${handler}\\b[^}]*\\}\\s*from\\s*"(\\.[^"]+)"`),
      );
      expect(importMatch, `convex/http.ts routes ${handler} but does not import it`).not.toBeNull();

      const modulePath = join(p("convex"), `${importMatch![1]}.ts`);
      expect(existsSync(modulePath), `${handler} imported from a file that does not exist`).toBe(
        true,
      );
      expect(
        new RegExp(`export const ${handler}\\b`).test(readFileSync(modulePath, "utf8")),
        `${modulePath} no longer exports ${handler} — its route is dead`,
      ).toBe(true);
    }
  });

  it("resolves every public/ string URL referenced from src", () => {
    // These are runtime string URLs (audio playback, images). Nothing typechecks
    // them; a wrong path is a silent no-op sound or a broken image.
    const srcFiles: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(e.name)) srcFiles.push(full);
      }
    };
    walk(p("src"));

    const assetRe = /"(\/(?:audio|images|fonts)\/[^"]+|\/[\w-]+\.(?:svg|png|jpg|jpeg|webp|ico|mp3|m4a))"/g;
    const missing: string[] = [];
    for (const file of srcFiles) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(assetRe)) {
        const url = m[1];
        if (!existsSync(join(p("public"), url))) {
          missing.push(`${file.replace(REPO_ROOT, "")} → public${url}`);
        }
      }
    }
    expect(missing, "these public/ assets are referenced but do not exist").toEqual([]);
  });

  it("keeps the wildcard CSS module declaration honest", () => {
    // `css.d.ts` is `declare module "*.css"`, so ANY css import path
    // typechecks — including a wrong one, which silently drops the styles.
    // Verify every relative CSS import in src/ actually resolves.
    const srcFiles: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(e.name)) srcFiles.push(full);
      }
    };
    walk(p("src"));

    const missing: string[] = [];
    for (const file of srcFiles) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/import\s+"(\.[^"]+\.css)"/g)) {
        const resolved = join(file, "..", m[1]);
        if (!existsSync(resolved)) missing.push(`${file.replace(REPO_ROOT, "")} → ${m[1]}`);
      }
      // `@/`-aliased CSS imports resolve through tsconfig paths → src/
      for (const m of text.matchAll(/import\s+"@\/([^"]+\.css)"/g)) {
        if (!existsSync(p(join("src", m[1])))) {
          missing.push(`${file.replace(REPO_ROOT, "")} → @/${m[1]}`);
        }
      }
    }
    expect(missing, "these CSS imports do not resolve — styles silently dropped").toEqual([]);
  });
});
