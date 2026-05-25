import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  INTERNAL_API_KEY: z.string().min(1, "INTERNAL_API_KEY is required"),
  CONVEX_JWT_KID: z.string().min(1, "CONVEX_JWT_KID is required"),
  CONVEX_JWT_PRIVATE_KEY_B64: z
    .string()
    .min(1, "CONVEX_JWT_PRIVATE_KEY_B64 is required"),
  CONVEX_JWT_PUBLIC_JWK: z.string().min(1, "CONVEX_JWT_PUBLIC_JWK is required"),
});

const parsedServerEnv = serverEnvSchema.parse(process.env);

export const serverEnv = {
  internalApiKey: parsedServerEnv.INTERNAL_API_KEY,
  jwtKid: parsedServerEnv.CONVEX_JWT_KID,
  jwtPrivateKeyB64: parsedServerEnv.CONVEX_JWT_PRIVATE_KEY_B64,
  jwtPublicJwk: parsedServerEnv.CONVEX_JWT_PUBLIC_JWK,
} as const;
