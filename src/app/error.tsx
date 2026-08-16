"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * App Router segment boundary, sitting below the root layout so
 * `NextIntlClientProvider` is mounted and `useTranslations` works here.
 *
 * Before this existed, nothing in `src/` caught a render-time throw — a guest
 * hitting a query that still requires auth (a gate we missed) unmounted the
 * whole tree to a blank page. This is the safety net for that case.
 */
export default function AppError({ error, reset }: AppErrorProps) {
  const t = useTranslations("errorBoundary");

  useEffect(() => {
    console.error("[boundary]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a12] px-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/60 p-8 text-center">
        <AlertTriangle className="mx-auto mb-5 h-10 w-10 text-red-400" />
        <h1 className="mb-2 font-orbitron text-2xl font-bold">{t("title")}</h1>
        <p className="mb-7 font-sans text-sm text-gray-400">{t("body")}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="cursor-pointer rounded-xl bg-gradient-to-r from-red-500 to-red-700 px-6 py-2.5 font-orbitron text-[0.82rem] font-bold tracking-[0.04em] text-white shadow-[0_0_22px_rgba(220,38,38,0.38)] transition hover:-translate-y-px"
          >
            {t("retry")}
          </button>
          <Link
            href="/lobby"
            className="rounded-xl border border-white/20 bg-white/10 px-6 py-2.5 font-orbitron text-[0.82rem] font-bold tracking-[0.04em] text-white transition hover:bg-white/15"
          >
            {t("home")}
          </Link>
        </div>
      </div>
    </main>
  );
}
