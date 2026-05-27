export const PHP_API_BASE_URL = "https://mafia.ge";
// export const PHP_API_BASE_URL = "http://localhost:8000";
export const PHP_LOGIN_REDIRECT_URL = "https://mafia.ge";

export const PHP_SESSION_COOKIE_NAME = "PHPSESSID";
export const CONVEX_AUTH_COOKIE_NAME = "cnvx-auth";
export const BRIDGE_ATTEMPT_COOKIE_NAME = "bridge_attempted";

export const BRIDGE_ATTEMPT_TTL_SECONDS = 20;
export const CONVEX_JWT_TTL_SECONDS = 3600;

export const CONVEX_JWT_ISSUER = "https://staging.online.mafia.ge";
export const CONVEX_JWT_AUDIENCE = "convex";

export const AUTH_TOKEN_ENDPOINT = "/api/auth/token";
export const IS_PROD = process.env.NODE_ENV === "production";
