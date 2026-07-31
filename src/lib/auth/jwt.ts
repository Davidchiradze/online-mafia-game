import { SignJWT } from "jose";
import {
  CONVEX_JWT_AUDIENCE,
  CONVEX_JWT_ISSUER,
  CONVEX_JWT_TTL_SECONDS,
} from "@/lib/auth/constants";
import { serverEnv } from "@/shared/lib/env/server";
import { getPrivateKey } from "./jwks";



export interface PhpUser {
  id: string;
  email: string | null;
  username: string | null;
  name: string | null;
  avatar: string | null;
  role: string;
  roleId: number;
  status: number | null;
  amount: number | null;
  subscription?: {
    packageId: number;
    from: string | null;
    to: string | null;
    active: boolean;
  };
}

export interface ConvexJwtClaims {
  sub: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

/**
 * Mints an identity-only RS256 JWT that Convex validates via JWKS at
 * `/.well-known/jwks.json`. Contains only standard claims (sub/iss/aud/iat/exp).
 * All volatile profile data (email, avatar, role, amount, etc.) is synced
 * separately via `POST /api/auth/sync-profile` so it stays fresh regardless
 * of JWT TTL.
 */
export async function signConvexJwt(user: Pick<PhpUser, "id">): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const key = await getPrivateKey();

  return await new SignJWT({
    sub: user.id,
    iss: CONVEX_JWT_ISSUER,
    aud: CONVEX_JWT_AUDIENCE,
    iat: now,
    exp: now + CONVEX_JWT_TTL_SECONDS,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT", kid: serverEnv.jwtKid })
    .sign(key);
}

export function jwtMaxAgeSeconds(): number {
  return CONVEX_JWT_TTL_SECONDS;
}
