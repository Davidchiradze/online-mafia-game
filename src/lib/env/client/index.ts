"use client";
import { z } from "zod";

const clientEnvSchema = z.object({
    NEXT_PUBLIC_ENVIRONMENT: z.string().min(1, "ENVIRONMENT is required"),
});

const parsedClientEnv = clientEnvSchema.parse(process.env);

export const clientEnv = {
    environment: parsedClientEnv.NEXT_PUBLIC_ENVIRONMENT,
} as const;
