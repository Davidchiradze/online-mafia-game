"use client";

import { useTranslations } from "next-intl";

type Props = {
  src?: string | null;
  name?: string | null;
  /** Pixel size of the (square) avatar. Defaults to 28. */
  size?: number;
  /** When set, renders a presence dot in the corner (green online / gray off). */
  online?: boolean;
  className?: string;
};

/**
 * Round user avatar with a gradient fallback. When no image is available it
 * shows the first initial of the name. Mirrors the avatar styling used in the
 * dashboard header and match roster.
 *
 * Pass `online` to overlay a presence status dot (sized to the avatar); the dot
 * sits outside the clipped image, so it's never cut off.
 */
export default function UserAvatar({
  src,
  name,
  size = 28,
  online,
  className = "",
}: Props) {
  const t = useTranslations("common");
  const initial = name?.trim()?.[0]?.toUpperCase() ?? "?";
  const dotSize = Math.max(8, Math.round(size * 0.3));

  return (
    <div
      className={`relative inline-flex shrink-0 align-middle ${className}`}
      style={{ width: size, height: size }}
    >
      <div className="h-full w-full overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-red-600 shadow flex items-center justify-center">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={name ?? t("avatar")}
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            className="font-sans font-semibold text-white/90 leading-none"
            style={{ fontSize: size * 0.45 }}
          >
            {initial}
          </span>
        )}
      </div>
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-[#0a0a12] ${online ? "bg-green-500" : "bg-zinc-500"}`}
          style={{ width: dotSize, height: dotSize }}
        />
      )}
    </div>
  );
}
