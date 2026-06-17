import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "./config";

/**
 * Resolves the active locale from the NEXT_LOCALE cookie (no URL routing).
 * A missing or invalid cookie falls back to the default locale, so a bad
 * cookie value can never crash rendering.
 */
export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
