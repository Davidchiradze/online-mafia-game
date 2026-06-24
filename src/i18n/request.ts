import { getRequestConfig } from "next-intl/server";

/**
 * Temporarily forces Georgian for every visitor, ignoring the NEXT_LOCALE
 * cookie — so returning users who saved "en" also get Georgian. To restore
 * per-user language selection, read the cookie again (see git history).
 */
export default getRequestConfig(async () => {
  // const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  // const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  const locale = "ka";

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
