import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {};

// Picks up the i18n request config at src/i18n/request.ts (cookie-based, no URL routing).
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
