import { SignJWT } from "jose";
import {
  CONVEX_JWT_AUDIENCE,
  CONVEX_JWT_ISSUER,
  CONVEX_JWT_TTL_SECONDS,
} from "@/lib/auth/constants";
import { serverEnv } from "@/lib/env/server";
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
}

export interface ConvexJwtClaims {
  sub: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  email?: string;
  username?: string;
  name?: string;
  avatar?: string;
  role?: string;
}

/**
 * Mints an RS256 JWT that Convex will validate against the JWKS at
 * `/.well-known/jwks.json`. The `sub` claim is the PHP `accounts.id`
 * (stringified) and is what `ctx.auth.getUserIdentity().subject` returns
 * inside Convex functions.
 */
export async function signConvexJwt(user: PhpUser): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + CONVEX_JWT_TTL_SECONDS;

  const payload: Record<string, unknown> = {
    sub: user.id,
    iss: CONVEX_JWT_ISSUER,
    aud: CONVEX_JWT_AUDIENCE,
    iat: now,
    exp,
  };
  if (user.email) payload.email = user.email;
  if (user.username) payload.username = user.username;
  if (user.name) payload.name = user.name;
  if (user.avatar) payload.avatar = user.avatar;
  if (user.role) payload.role = user.role;
  if (user.amount) payload.amount = user.amount;

  const key = await getPrivateKey();

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", typ: "JWT", kid: serverEnv.jwtKid })
    .sign(key);
}

export function jwtMaxAgeSeconds(): number {
  return CONVEX_JWT_TTL_SECONDS;
}
