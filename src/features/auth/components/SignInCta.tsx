"use client";

import { usePathname } from "next/navigation";
import { LogIn } from "lucide-react";
import { phpLoginUrl } from "@/features/auth/lib/phpLogin";

type SignInCtaProps = {
  /** Already-translated label — callers pass `t("signInToPlay")` etc. */
  label: string;
  /** Defaults to the current path so mafia.ge returns here after login. */
  returnTo?: string;
  className?: string;
};

const DEFAULT_CLASS =
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2.5 rounded-[11px] bg-gradient-to-r from-red-500 to-red-700 px-6 py-3 font-orbitron text-[0.82rem] font-bold tracking-[0.04em] text-white shadow-[0_0_22px_rgba(220,38,38,0.38),inset_0_1px_0_rgba(255,255,255,0.2)] transition hover:-translate-y-px hover:shadow-[0_0_38px_rgba(220,38,38,0.66),inset_0_1px_0_rgba(255,255,255,0.24)]";

/**
 * Inline "sign in to do X" link for a control whose label can just swap out
 * in place (e.g. Create Room -> Sign in to play). Styled to match the
 * primary CTA it replaces, so the slot reads as an ordinary action, not a
 * locked one — a guest isn't blocked, they just need one more step.
 */
export function SignInCta({ label, returnTo, className }: SignInCtaProps) {
  const pathname = usePathname();
  return (
    <a href={phpLoginUrl(returnTo ?? pathname)} className={className ?? DEFAULT_CLASS}>
      <LogIn className="h-4 w-4" strokeWidth={2.6} />
      {label}
    </a>
  );
}
