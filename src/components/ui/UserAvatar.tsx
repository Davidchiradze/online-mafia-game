"use client";

type Props = {
  src?: string | null;
  name?: string | null;
  /** Pixel size of the (square) avatar. Defaults to 28. */
  size?: number;
  className?: string;
};

/**
 * Round user avatar with a gradient fallback. When no image is available it
 * shows the first initial of the name. Mirrors the avatar styling used in the
 * dashboard header and match roster.
 */
export default function UserAvatar({
  src,
  name,
  size = 28,
  className = "",
}: Props) {
  const initial = name?.trim()?.[0]?.toUpperCase() ?? "?";

  return (
    <div
      className={`shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-red-600 shadow flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name ?? "Avatar"}
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
  );
}
