"use client";

import { ArrowRight } from "lucide-react";

export type PromoBannerProps = {
  /** External or internal URL the banner navigates to. */
  href: string;
  /** Image shown on the right side of the banner. */
  imageUrl: string;
  /** Small accent line above the title (e.g. a date or category). */
  eyebrow?: string;
  title: string;
  description?: string;
  ctaLabel: string;
  /** Open the link in a new tab (defaults to true for external links). */
  external?: boolean;
  className?: string;
};

export default function PromoBanner({
  href,
  imageUrl,
  eyebrow,
  title,
  description,
  ctaLabel,
  external = true,
  className = "",
}: PromoBannerProps) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={`group relative block overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm transition-all hover:border-red-500/40 hover:shadow-[0_0_40px_rgba(220,38,38,0.18)] ${className}`}
    >
      {/* Ambient red glow that intensifies on hover */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60 transition-opacity group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(120% 120% at 100% 50%, rgba(220,38,38,0.10) 0%, transparent 55%)",
        }}
      />

      <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
        {/* Text content */}
        <div className="flex-1 order-2 sm:order-1">
          {eyebrow && (
            <span className="font-orbitron text-xs font-semibold uppercase tracking-widest text-red-500">
              {eyebrow}
            </span>
          )}
          <h3
            className="mt-2 bg-gradient-to-r from-white via-red-100 to-white bg-clip-text font-orbitron text-transparent"
            style={{ fontSize: "clamp(1.25rem, 2.4vw, 1.75rem)", fontWeight: 700 }}
          >
            {title}
          </h3>
          {description && (
            <p className="mt-3 max-w-md font-sans text-sm leading-relaxed text-gray-400">
              {description}
            </p>
          )}
          <span className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-5 py-2.5 font-sans text-sm font-semibold text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all group-hover:from-red-500 group-hover:to-red-600 group-hover:shadow-[0_0_30px_rgba(220,38,38,0.5)]">
            {ctaLabel}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>

        {/* Image */}
        <div className="order-1 shrink-0 overflow-hidden rounded-xl border border-white/[0.06] sm:order-2 sm:w-[40%] lg:w-[38%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={title}
            className="aspect-[16/7] h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        </div>
      </div>
    </a>
  );
}
