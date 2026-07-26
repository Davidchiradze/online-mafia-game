"use client";

import { normalizeAvatarUrl } from "@/lib/auth/avatar";

interface CameraOffCoverProps {
  /** Player's profile picture URL. Falls back to a gradient + initial. */
  avatar?: string;
  /** Player's display name (used for the initial fallback + alt text). */
  name?: string;
}

/**
 * CameraOffCover — shown in a player's tile when they are connected but have
 * turned their camera off. Renders their profile picture as a centered circular
 * avatar on a dark background (Zoom/Meet style), scaling with the tile so it
 * stays legible on small/short screens.
 */
export default function CameraOffCover({ avatar, name }: CameraOffCoverProps) {
  const src = normalizeAvatarUrl(avatar ?? null);
  const initial = name?.trim()?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-zinc-900 to-black">
      <div className="flex aspect-square w-[38%] min-w-[2.25rem] max-w-[7rem] items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-red-600 shadow-lg ring-1 ring-white/10">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={name ?? ""}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-sans text-xl tsm:text-3xl tlg:text-4xl font-semibold leading-none text-white/90">
            {initial}
          </span>
        )}
      </div>
    </div>
  );
}
