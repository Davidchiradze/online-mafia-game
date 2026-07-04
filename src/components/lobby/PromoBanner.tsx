"use client";

import { Trophy } from "lucide-react";

export type PromoBannerProps = {
  /** External or internal URL the banner navigates to. */
  href: string;
  /** Full-bleed background image (desktop). */
  bannerImageUrl: string;
  /** Full-bleed background image (mobile). Falls back to the desktop image. */
  bannerImageMobileUrl?: string;
  /** Foreground trophy/cup image shown on the right. */
  cupImageUrl?: string;
  /** Section label shown above the banner (e.g. "Tournament"). */
  eyebrow?: string;
  title: string;
  /** Trailing part of the title rendered on its own line (e.g. the season). */
  highlight?: string;
  /** Status pill label (e.g. "Active"). */
  status?: string;
  /** Open the link in a new tab (defaults to true for external links). */
  external?: boolean;
  className?: string;
};

export default function PromoBanner({
  href,
  bannerImageUrl,
  bannerImageMobileUrl,
  cupImageUrl,
  eyebrow,
  title,
  highlight,
  status,
  external = true,
  className = "",
}: PromoBannerProps) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={`group block ${className}`}
    >
      {/* Section label above the artwork */}
      {eyebrow && (
        <span className="mb-3 inline-flex items-center gap-2 font-orbitron text-sm font-semibold text-white">
          <Trophy className="h-4 w-4 text-red-500" />
          {eyebrow}
        </span>
      )}

      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0a0a] transition group-hover:border-red-500/40 group-hover:shadow-[0_0_40px_rgba(220,38,38,0.18)]">
        {/* Full-bleed banner background (desktop + mobile variants) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bannerImageUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 hidden h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] sm:block"
          loading="lazy"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bannerImageMobileUrl ?? bannerImageUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] sm:hidden"
          loading="lazy"
        />

        {/* Left-to-right scrim so the text stays legible over the artwork */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0d0a0a] via-[#0d0a0a]/70 to-transparent" />

        <div className="relative flex items-center gap-4 p-6 sm:p-10">
          {/* Text content */}
          <div className="flex-1">
            <h3
              className="font-orbitron font-bold leading-tight text-white"
              style={{ fontSize: "clamp(1.5rem, 3.2vw, 2.5rem)" }}
            >
              <span className="block">{title}</span>
              {highlight && <span className="block">{highlight}</span>}
            </h3>

            {status && (
              <span className="mt-5 inline-flex items-center rounded-full bg-red-600 px-4 py-1.5 font-sans text-sm font-semibold text-white">
                {status}
              </span>
            )}
          </div>

          {/* Cup / trophy */}
          {cupImageUrl && (
            <div className="hidden shrink-0 sm:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cupImageUrl}
                alt={title}
                className="h-40 w-auto object-contain drop-shadow-[0_0_25px_rgba(220,38,38,0.35)] transition-transform duration-500 group-hover:scale-[1.05] lg:h-52"
                loading="lazy"
              />
            </div>
          )}
        </div>
      </div>
    </a>
  );
}
