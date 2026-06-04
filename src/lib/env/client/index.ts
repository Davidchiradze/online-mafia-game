"use client";
import { z } from "zod";

const clientEnvSchema = z.object({
    ENVIRONMENT: z.string().min(1, "ENVIRONMENT is required"),
});

const parsedClientEnv = clientEnvSchema.parse(process.env);

export const clientEnv = {
    environment: parsedClientEnv.ENVIRONMENT,
} as const;
