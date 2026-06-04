#!/usr/bin/env node
/**
 * One-time setup: generate an RS256 keypair for the Convex custom JWT.
 *
 * Outputs three env values:
 *   - CONVEX_JWT_PRIVATE_KEY_B64  (base64-encoded PEM)
 *   - CONVEX_JWT_PUBLIC_JWK       (single-line JSON)
 *   - CONVEX_JWT_KID              (opaque key id)
 *
 * Copy them into .env.local and your production env. Re-run only when
 * rotating the key (and update CUSTOM_JWT_JWKS_URL consumers after).
 */
import { generateKeyPair, exportJWK, exportPKCS8 } from "jose";
import { randomUUID } from "node:crypto";

const { publicKey, privateKey } = await generateKeyPair("RS256", {
  modulusLength: 2048,
  extractable: true,
});

const kid = randomUUID();

const publicJwk = await exportJWK(publicKey);
publicJwk.kid = kid;
publicJwk.alg = "RS256";
publicJwk.use = "sig";

const privatePem = await exportPKCS8(privateKey);
const privateB64 = Buffer.from(privatePem, "utf8").toString("base64");

console.log("# --- Convex custom JWT keypair ---");
console.log(`CONVEX_JWT_KID="${kid}"`);
console.log(`CONVEX_JWT_PRIVATE_KEY_B64="${privateB64}"`);
console.log(`CONVEX_JWT_PUBLIC_JWK='${JSON.stringify(publicJwk)}'`);
console.log("");
console.log("# Paste the three lines above into .env.local (and prod env).");
console.log(
  "# Then set Convex env: npx convex env set CUSTOM_JWT_JWKS_URL <issuer>/.well-known/jwks.json",
);
