"use client";

import { useTranslations } from "next-intl";

type ConvexErrorData =
  | string
  | {
      code?: string;
      message?: string;
      params?: Record<string, string | number>;
    };

type Extracted = {
  code?: string;
  message?: string;
  params?: Record<string, string | number>;
};

/**
 * Pulls the structured payload out of a thrown error. Convex preserves
 * `ConvexError.data` to the client (plain `Error` messages are redacted in
 * production), so we read `.data` first — it is either a bare string message
 * or a `{ code, message, params }` object.
 */
function extract(err: unknown): Extracted {
  const data = (err as { data?: ConvexErrorData })?.data;
  if (typeof data === "string") return { message: data };
  if (data && typeof data === "object") {
    return { code: data.code, message: data.message, params: data.params };
  }
  if (err instanceof Error && err.message) return { message: err.message };
  return {};
}

/**
 * Returns a translator that maps a caught error to a user-facing string:
 * a translated `errors.<CODE>` when the code is known, otherwise the English
 * fallback carried on the error, otherwise the generic `errors._fallback`.
 */
export function useErrorMessage() {
  const t = useTranslations("errors");
  return (err: unknown): string => {
    const { code, message, params } = extract(err);
    if (code && t.has(code)) return t(code, params);
    return message ?? t("_fallback");
  };
}
