import { NextResponse } from "next/server";
import { getPublicJwks } from "@/lib/auth/jwks";

export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * GET /.well-known/jwks.json
 *
 * Publishes the RSA public key Convex needs to verify the JWTs minted
 * by /api/auth/bridge. Cached aggressively because the keypair only
 * changes on rotation.
 */
export async function GET() {
  return NextResponse.json(getPublicJwks(), {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Content-Type": "application/jwk-set+json",
    },
  });
}
