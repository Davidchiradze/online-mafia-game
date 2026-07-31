import { importPKCS8, type JWK, type CryptoKey } from "jose";
import { serverEnv } from "@/shared/lib/env/server";

let cachedPrivateKey: CryptoKey | null = null;
let cachedPublicJwks: { keys: JWK[] } | null = null;

/**
 * Decodes the base64-encoded PEM from env and imports it as an RS256
 * signing key. Cached for the lifetime of the Node process so we don't
 * re-import on every request.
 */
export async function getPrivateKey(): Promise<CryptoKey> {
  if (cachedPrivateKey) return cachedPrivateKey;
  const pem = Buffer.from(serverEnv.jwtPrivateKeyB64, "base64").toString("utf8");
  cachedPrivateKey = await importPKCS8(pem, "RS256");
  return cachedPrivateKey;
}

/**
 * Builds the JWKS document served at /.well-known/jwks.json so Convex
 * can verify signatures. Strips any private-key material defensively
 * even though the env var is supposed to hold only the public JWK.
 */
export function getPublicJwks(): { keys: JWK[] } {
  if (cachedPublicJwks) return cachedPublicJwks;

  const parsed = JSON.parse(serverEnv.jwtPublicJwk) as JWK;
  const sanitized: JWK = {
    kty: parsed.kty,
    n: parsed.n,
    e: parsed.e,
    alg: parsed.alg ?? "RS256",
    use: parsed.use ?? "sig",
    kid: parsed.kid ?? serverEnv.jwtKid,
  };

  cachedPublicJwks = { keys: [sanitized] };
  return cachedPublicJwks;
}
