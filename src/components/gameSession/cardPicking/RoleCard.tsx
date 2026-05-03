"use client";

import Image, { type StaticImageData } from "next/image";
import FlipCard from "@/components/ui/FlipCard";
import { CARD_BACK_IMAGE, getRoleImage } from "./cardImages";

export interface RoleCardProps {
  /** Stable id (e.g. "card_1".."card_12") used for picks and motion layoutId. */
  cardId: string;
  /** Role to show on the face side. `null` keeps the face hidden. */
  role: string | null;
  /** When true, the card is rotated to show its face. */
  isFlipped: boolean;
  /** Greys out the card and disables interaction. */
  claimed: boolean;
  /** Click handler. Omit to render a non-interactive card. */
  onPick?: (cardId: string) => void;
}

/**
 * RoleCard - presentational, layout-agnostic card.
 *
 * Owns the 3D flip via `FlipCard` but does not own its viewport position;
 * the picking-roles fly-to-center animation is orchestrated by the parent
 * board via `motion`'s shared `layoutId` in Step 7.
 */
export default function RoleCard({
  cardId,
  role,
  isFlipped,
  claimed,
  onPick,
}: RoleCardProps) {
  const isInteractive = !claimed && onPick !== undefined;

  const className = [
    "group relative aspect-[2/3] w-full focus:outline-none",
    isInteractive
      ? "cursor-pointer transition-transform duration-200 ease-out hover:-translate-y-1 hover:scale-[1.03]"
      : "cursor-default",
    claimed ? "opacity-30 saturate-50" : "",
  ].join(" ");

  const content = (
    <FlipCard
      isFlipped={isFlipped}
      flipDelay={0}
      flipDuration={700}
      width="100%"
      height="100%"
      front={<CardFace image={CARD_BACK_IMAGE} alt="Card back" />}
      back={
        <CardFace
          image={getRoleImage(role)}
          alt={role ? `${role} card` : "Hidden role"}
        />
      }
    />
  );

  // When there's no onPick handler we render a plain div instead of a disabled
  // <button>. A disabled <button> swallows click events without bubbling them,
  // which would block parent-level dismiss handlers (e.g. the picking board's
  // backdrop / centered reveal click-to-dismiss).
  if (!isInteractive) {
    return (
      <div
        className={className}
        aria-label={isFlipped && role ? `Card revealed: ${role}` : "Hidden card"}
        data-card-id={cardId}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onPick?.(cardId)}
      aria-label={isFlipped && role ? `Card revealed: ${role}` : "Hidden card"}
      data-card-id={cardId}
      className={className}
    >
      {content}
    </button>
  );
}

function CardFace({ image, alt }: { image: StaticImageData; alt: string }) {
  return (
    <div className="relative h-full w-full bg-gradient-to-br from-slate-900 to-slate-800">
      <Image
        src={image}
        alt={alt}
        fill
        sizes="(max-width: 640px) 30vw, (max-width: 1024px) 18vw, 12vw"
        className="object-cover"
      />
    </div>
  );
}
