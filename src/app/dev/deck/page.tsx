"use client";

import { useState } from "react";
import DeckGrid, {
  type DeckCardModel,
} from "@/components/gameSession/cardPicking/DeckGrid";

const SEED: DeckCardModel[] = [
  { cardId: "card_1", role: "DON", isFlipped: false, claimed: false },
  { cardId: "card_2", role: "MAFIA", isFlipped: false, claimed: false },
  { cardId: "card_3", role: "MAFIA", isFlipped: false, claimed: false },
  { cardId: "card_4", role: "SHOGUN", isFlipped: false, claimed: false },
  { cardId: "card_5", role: "YAKUZA", isFlipped: false, claimed: false },
  { cardId: "card_6", role: "DETECTIVE", isFlipped: false, claimed: false },
  { cardId: "card_7", role: "DOCTOR", isFlipped: false, claimed: false },
  { cardId: "card_8", role: "CITIZEN", isFlipped: false, claimed: false },
  { cardId: "card_9", role: "CITIZEN", isFlipped: false, claimed: false },
  { cardId: "card_10", role: "CITIZEN", isFlipped: false, claimed: false },
  { cardId: "card_11", role: "CITIZEN", isFlipped: false, claimed: false },
  { cardId: "card_12", role: "CITIZEN", isFlipped: false, claimed: false },
];

/**
 * Dev-only preview for the card-picking UI primitives.
 * Visit /dev/deck. Click a card to flip + mark it claimed; press Reset to
 * restore the deck.
 */
export default function DeckPreviewPage() {
  const [cards, setCards] = useState<DeckCardModel[]>(SEED);

  const handlePick = (cardId: string) => {
    setCards((prev) =>
      prev.map((c) =>
        c.cardId === cardId ? { ...c, isFlipped: true, claimed: true } : c,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Card deck preview
            </h1>
            <p className="text-sm text-slate-400">
              Step 6 - pure UI components (no Convex, no animation).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCards(SEED)}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm text-white transition hover:bg-slate-700"
          >
            Reset
          </button>
        </header>

        <DeckGrid cards={cards} onPick={handlePick} />
      </div>
    </div>
  );
}
