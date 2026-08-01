"use client";

import { Play } from "lucide-react";

export type FeatureBannerProps = {
  /** YouTube video id used for the embedded player. */
  videoId: string;
  /** Full watch URL for the CTA link (defaults to the standard watch URL). */
  watchUrl?: string;
  /** Small pill label on the left (e.g. "Tournament"). */
  badge: string;
  /** Muted source label next to the badge (e.g. "YouTube"). */
  source?: string;
  title: string;
  blurb: string;
  ctaLabel: string;
  className?: string;
};

/**
 * Featured YouTube banner shown at the top of the lobby. Left cell embeds the
 * tournament video (16:9), right cell carries the copy + a "watch on YouTube"
 * CTA. Collapses to video-over-copy on narrow viewports via `auto-fit` tracks.
 */
export default function FeatureBanner({
  videoId,
  watchUrl,
  badge,
  source = "YouTube",
  title,
  blurb,
  ctaLabel,
  className = "",
}: FeatureBannerProps) {
  const href = watchUrl ?? `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <div
      className={`relative box-border grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] overflow-hidden rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] ${className}`}
      style={{
        background:
          "linear-gradient(120deg,rgba(255,120,120,0.07) 0%,rgba(255,255,255,0.03) 45%,rgba(255,255,255,0.014) 100%)",
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute inset-x-0 top-0 h-0.5"
        style={{
          background: "linear-gradient(90deg,#ef4444,rgba(239,68,68,0.05))",
        }}
      />

      {/* Video */}
      <div
        className="flex min-w-0 items-center justify-center p-3.5"
        style={{
          background:
            "linear-gradient(120deg,rgba(0,0,0,0.35),rgba(0,0,0,0.15))",
        }}
      >
        <div className="relative aspect-video w-full max-w-[360px] overflow-hidden rounded-[10px] bg-black shadow-[0_6px_22px_rgba(0,0,0,0.55)]">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?rel=0`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className="absolute inset-0 block h-full w-full border-0"
          />
        </div>
      </div>

      {/* Copy */}
      <div className="flex min-w-0 flex-col justify-center gap-2.5 px-6 py-[18px]">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/[0.34] bg-red-500/[0.16] px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
            <span className="font-orbitron text-[0.55rem] font-bold uppercase tracking-[0.2em] text-red-300">
              {badge}
            </span>
          </span>
          {source && (
            <span className="font-orbitron text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-gray-500">
              {source}
            </span>
          )}
        </div>

        <h2
          className="m-0 font-orbitron font-bold leading-snug text-white text-pretty"
          style={{ fontSize: "clamp(0.98rem, 1.4vw, 1.2rem)" }}
        >
          {title}
        </h2>

        <p className="m-0 max-w-[52ch] font-sans text-sm leading-relaxed text-gray-500 text-pretty">
          {blurb}
        </p>

        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 inline-flex items-center gap-2 self-start rounded-[9px] border border-white/[0.14] bg-black/35 px-4 py-2.5 font-orbitron text-[0.68rem] font-bold tracking-[0.08em] text-gray-200 transition hover:border-red-500/50 hover:text-white hover:shadow-[0_0_20px_rgba(220,38,38,0.22)]"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          {ctaLabel}
        </a>
      </div>
    </div>
  );
}
