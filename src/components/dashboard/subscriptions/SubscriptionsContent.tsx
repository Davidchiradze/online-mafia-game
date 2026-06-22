"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { PHP_API_BASE_URL } from "@/lib/auth/constants";
import { SUBSCRIPTIONS_CONFIG } from "@/lib/constants/subscriptions";

/** "2026-06-29T10:42:00" -> "29.06.2026 10:42" (timezone-agnostic). */
function formatExpiry(value: string): string {
  const [date, time = ""] = value.split("T");
  const [year, month, day] = date.split("-");
  const [hours, minutes] = time.split(":");
  const base = `${day}.${month}.${year}`;
  return hours ? `${base} ${hours}:${minutes}` : base;
}

export default function SubscriptionsContent() {
  const t = useTranslations("subscriptions");
  const { banner, packages, purchasePath, playPath, activeSubscription } =
    SUBSCRIPTIONS_CONFIG;

  const activePackage = activeSubscription
    ? packages.find((pkg) => pkg.id === activeSubscription.packageId)
    : undefined;

  const handlePurchase = () => {
    window.location.href = `${PHP_API_BASE_URL}${purchasePath}`;
  };

  return (
    <div className="flex min-h-full w-full flex-col items-center pb-16 pt-8">
      <div className="flex w-full max-w-7xl flex-col gap-8 px-4 sm:px-6">
        {/* Top banner */}
        {activeSubscription && activePackage ? (
          <div className="flex flex-col gap-4 rounded-xl border border-[#00ff66]/20 border-l-4 border-l-[#00ff66] bg-[#0d1812] p-5 shadow-lg sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium tracking-wide text-[#00ff66]/70 sm:text-sm">
                {t(banner.labelKey)}
              </span>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                <h2 className="text-lg font-bold tracking-wide text-white sm:text-xl">
                  {t(activePackage.titleKey)}
                </h2>
                <span className="text-sm font-medium text-[#00ff66]">
                  {t("banner.activeStatus", {
                    date: formatExpiry(activeSubscription.expiresAt),
                  })}
                </span>
              </div>
            </div>
            <Link
              href={playPath}
              className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-red-500"
            >
              {t("banner.playNow")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 rounded-xl border border-white/5 bg-[#1c1c1e] p-5 shadow-lg sm:p-6">
            <span className="text-xs font-medium tracking-wide text-zinc-400 sm:text-sm">
              {t(banner.labelKey)}
            </span>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-4">
              <h2 className="text-lg font-bold tracking-wide text-white sm:text-xl">
                {t(banner.inactiveTitleKey)}
              </h2>
              <span className="text-sm text-zinc-400">
                {t(banner.inactiveSubtitleKey)}
              </span>
            </div>
          </div>
        )}

        {/* Pricing cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {packages.map((pkg) => {
            const isActive = pkg.id === activeSubscription?.packageId;

            return (
              <div
                key={pkg.id}
                className={cn(
                  "flex flex-col rounded-2xl border bg-[#13131a] p-6 shadow-xl sm:p-8",
                  isActive
                    ? "border-[#00ff66]/40 shadow-[0_0_30px_rgba(0,255,102,0.08)]"
                    : "border-white/5",
                )}
              >
                {/* Label & badge */}
                {isActive ? (
                  <div className="mb-1 flex items-center justify-center rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                    {t("yourPackage")}
                  </div>
                ) : (
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={cn(
                        "text-sm font-bold tracking-wide",
                        pkg.labelColor,
                      )}
                    >
                      {t(pkg.labelKey)}
                    </span>
                    <div
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-white",
                        pkg.badgeColor,
                      )}
                    >
                      {t(pkg.badgeKey)}
                    </div>
                  </div>
                )}

                {/* Title */}
                <h3 className="mb-6 text-xl font-bold tracking-wide text-white sm:text-2xl">
                  {t(pkg.titleKey)}
                </h3>

                {/* Price */}
                <div className="mb-8 flex h-12 items-end gap-2">
                  <span className="mb-1 text-sm font-medium text-zinc-500 line-through sm:text-base">
                    {pkg.oldPrice}
                  </span>
                  <div className="flex items-baseline leading-none">
                    <span className="text-4xl font-bold text-white sm:text-5xl">
                      {pkg.price}
                    </span>
                    <span className="ml-1 text-lg font-bold text-red-500 sm:text-xl">
                      ₾
                    </span>
                    <span className="mb-1 ml-2 text-sm text-zinc-400">
                      {t(pkg.periodKey)}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <div className="mb-8 flex flex-1 flex-col gap-3.5">
                  {pkg.featureKeys.map((featureKey, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-3">
                      <Check className="h-5 w-5 shrink-0 text-white" />
                      <span className="text-sm font-medium text-zinc-300">
                        {t(featureKey)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Action */}
                {isActive ? (
                  <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#00ff66]/30 bg-[#00ff66]/10 py-4 text-sm font-semibold text-[#00ff66]">
                    <Check className="h-4 w-4" />
                    {t("owned")}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={pkg.disabled ? undefined : handlePurchase}
                    disabled={pkg.disabled}
                    className={cn(
                      "w-full rounded-xl py-4 text-sm font-semibold transition-all duration-200",
                      pkg.disabled
                        ? "cursor-not-allowed bg-[#202024] text-zinc-500"
                        : "bg-[#2a2a32] text-white shadow-sm hover:bg-[#32323c] hover:shadow-md",
                    )}
                  >
                    {t(pkg.buttonKey)}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
