"use client";

import RoleCard from "./RoleCard";

export interface DeckCardModel {
  cardId: string;
  /** Role for the face side; `null` keeps the face hidden until reveal. */
  role: string | null;
  /** Whether the card currently shows its face (post-flip). */
  isFlipped: boolean;
  /** Whether the card has been picked already (renders greyed-out). */
  claimed: boolean;
}

interface DeckGridProps {
  cards: DeckCardModel[];
  onPick?: (cardId: string) => void;
}

/**
 * DeckGrid - 12-slot responsive grid (3/4/6 columns at sm/md/lg breakpoints).
 *
 * The slot count is fixed at 12 to keep card positions stable across picks,
 * which makes the in-place flip + Step 7 fly-to-center motion deterministic.
 * Claimed cards are rendered greyed out instead of being removed.
 */
export default function DeckGrid({ cards, onPick }: DeckGridProps) {
  return (
    <div className="grid w-full grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6 lg:gap-6">
      {cards.map((card) => (
        <RoleCard
          key={card.cardId}
          cardId={card.cardId}
          role={card.role}
          isFlipped={card.isFlipped}
          claimed={card.claimed}
          onPick={onPick}
        />
      ))}
    </div>
  );
}
