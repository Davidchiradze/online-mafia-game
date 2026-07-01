export const IS_PROD = process.env.NEXT_PUBLIC_ENVIRONMENT === "production";
const IS_LOCAL = process.env.NEXT_PUBLIC_ENVIRONMENT === "development";

export const PHP_API_BASE_URL = IS_LOCAL
  ? "http://localhost:8000"
  : "https://mafia.ge";

const ONLINE_MAFIA_ORIGIN = process.env.NEXT_PUBLIC_ONLINE_MAFIA_ORIGIN;

const PHP_LOGIN_PATH = `/ka/accounts/login/?from=${ONLINE_MAFIA_ORIGIN}`;
export const PHP_LOGIN_REDIRECT_URL = `${PHP_API_BASE_URL}${PHP_LOGIN_PATH}`;
export const PHP_LOGOUT_REDIRECT_URL = `${PHP_API_BASE_URL}/ka/accounts/logout`;
export const LOGOUT_ENDPOINT = "/api/auth/logout";

export const PHP_SESSION_COOKIE_NAME = "PHPSESSID";
export const CONVEX_AUTH_COOKIE_NAME = "cnvx-auth";
export const BRIDGE_ATTEMPT_COOKIE_NAME = "bridge_attempted";

export const BRIDGE_ATTEMPT_TTL_SECONDS = 20;
export const CONVEX_JWT_TTL_SECONDS = 10000;

export const CONVEX_JWT_ISSUER = process.env.CONVEX_JWT_ISSUER;
export const CONVEX_JWT_AUDIENCE = "convex";

export const AUTH_TOKEN_ENDPOINT = "/api/auth/token";
export const AUTH_TOKEN_REFRESH_ENDPOINT = "/api/auth/token/refresh";
