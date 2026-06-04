export const PHP_API_BASE_URL = "https://mafia.ge";
// export const PHP_API_BASE_URL = "http://localhost:8000";
export const IS_PROD = process.env.ENVIRONMENT === "production";

const ONLINE_MAFIA_ORIGIN = IS_PROD
    ? "https://online.mafia.ge"
    : "https://staging.online.mafia.ge";

export const PHP_LOGIN_REDIRECT_URL = `https://www.mafia.ge/ka/accounts/login/?from=${ONLINE_MAFIA_ORIGIN}`;

export const PHP_SESSION_COOKIE_NAME = "PHPSESSID";
export const CONVEX_AUTH_COOKIE_NAME = "cnvx-auth";
export const BRIDGE_ATTEMPT_COOKIE_NAME = "bridge_attempted";

export const BRIDGE_ATTEMPT_TTL_SECONDS = 20;
export const CONVEX_JWT_TTL_SECONDS = 10000;

export const CONVEX_JWT_ISSUER = ONLINE_MAFIA_ORIGIN;
export const CONVEX_JWT_AUDIENCE = "convex";

export const AUTH_TOKEN_ENDPOINT = "/api/auth/token";
export const AUTH_TOKEN_REFRESH_ENDPOINT = "/api/auth/token/refresh";
