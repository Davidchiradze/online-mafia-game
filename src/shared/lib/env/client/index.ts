"use client";
import { z } from "zod";

const clientEnvSchema = z.object({
    NEXT_PUBLIC_ENVIRONMENT: z.string().min(1, "ENVIRONMENT is required"),
});

const getClientEnv = () => {
    const clientEnv = {
        NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT,
    };

    const parsedResult = clientEnvSchema.safeParse(clientEnv);
    if (!parsedResult.success) {
        throw new Error(`Invalid environment variables: ${parsedResult.error.message}`);
    }

    return clientEnv;

}

export default getClientEnv();

