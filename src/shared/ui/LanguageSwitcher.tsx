"use client";

import { useState, useTransition } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Check, Globe } from "lucide-react";
import { locales, localeLabels, type Locale } from "@/i18n/config";
import { setUserLocale } from "@/i18n/locale";

type LanguageSwitcherProps = {
  className?: string;
};

/**
 * Locale picker. Writes the choice to the NEXT_LOCALE cookie (the source of
 * truth) and refreshes to re-render server components with the new locale.
 */
// Temporarily hidden while the UI is forced to Georgian. To restore the
// picker, return <LanguageSwitcherInner {...props} /> instead of null.
export default function LanguageSwitcher() {
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- parked while the language picker is hidden
function LanguageSwitcherInner({ className = "" }: LanguageSwitcherProps) {
  const activeLocale = useLocale() as Locale;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const select = (locale: Locale) => {
    setOpen(false);
    if (locale === activeLocale) return;
    startTransition(async () => {
      await setUserLocale(locale);
      router.refresh();
    });
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={isPending}
          aria-label="Change language"
          className={`inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-gray-200 transition-colors hover:border-white/20 hover:text-white disabled:opacity-60 ${className}`}
        >
          <Globe className="size-4 shrink-0" aria-hidden />
          <span className="leading-none">{localeLabels[activeLocale]}</span>
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="end"
          sideOffset={8}
          collisionPadding={8}
          className="z-50 min-w-[160px] overflow-hidden rounded-xl p-1 text-sm text-white animate-in fade-in-0 zoom-in-95"
          style={{
            background:
              "linear-gradient(135deg, rgba(20,20,30,0.97) 0%, rgba(10,10,18,0.97) 100%)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow:
              "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07), 0 0 0 1px rgba(220,38,38,0.15)",
          }}
        >
          {locales.map((locale) => (
            <button
              key={locale}
              type="button"
              onClick={() => select(locale)}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/10"
            >
              <span>{localeLabels[locale]}</span>
              {locale === activeLocale ? (
                <Check className="size-4 shrink-0 text-emerald-400" aria-hidden />
              ) : null}
            </button>
          ))}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
