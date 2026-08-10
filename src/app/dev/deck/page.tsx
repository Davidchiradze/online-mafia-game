"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import RoleCard from "@/features/game-room/components/card-picking/RoleCard";

/**
 * Dev-only preview for the card-picking board.
 *
 * Mirrors the real in-game layout exactly for each variant:
 *   - Sports: 10-card deck, 5-top / 5-bottom grid, capped width so cards stay
 *     large on big screens and shrink cleanly on small ones.
 *   - Japanese: 12-card deck, the 3/4/6-column scrollable grid.
 * Both share the full-screen overlay and the fly-to-center reveal (shared
 * `motion` `layoutId`). Backed by local state instead of Convex.
 *
 * Visit /dev/deck. Use the top toggle to switch variants. Click a card to pick
 * + reveal it; click the backdrop (or the revealed card) to dismiss.
 */

type Variant = "sports_mafia" | "japanese_mafia";

type DeckCard = { cardId: string; role: string };

// Sports Mafia deck: DON + MAFIA×2 + DETECTIVE + CITIZEN×6 = 10 cards.
const SPORTS_DECK: DeckCard[] = [
  { cardId: "card_1", role: "DON" },
  { cardId: "card_2", role: "MAFIA" },
  { cardId: "card_3", role: "MAFIA" },
  { cardId: "card_4", role: "DETECTIVE" },
  { cardId: "card_5", role: "CITIZEN" },
  { cardId: "card_6", role: "CITIZEN" },
  { cardId: "card_7", role: "CITIZEN" },
  { cardId: "card_8", role: "CITIZEN" },
  { cardId: "card_9", role: "CITIZEN" },
  { cardId: "card_10", role: "CITIZEN" },
];

// Japanese Mafia deck: DON + MAFIA×2 + SHOGUN + YAKUZA + DETECTIVE + DOCTOR
// + CITIZEN×5 = 12 cards.
const JAPANESE_DECK: DeckCard[] = [
  { cardId: "card_1", role: "DON" },
  { cardId: "card_2", role: "MAFIA" },
  { cardId: "card_3", role: "MAFIA" },
  { cardId: "card_4", role: "SHOGUN" },
  { cardId: "card_5", role: "YAKUZA" },
  { cardId: "card_6", role: "DETECTIVE" },
  { cardId: "card_7", role: "DOCTOR" },
  { cardId: "card_8", role: "CITIZEN" },
  { cardId: "card_9", role: "CITIZEN" },
  { cardId: "card_10", role: "CITIZEN" },
  { cardId: "card_11", role: "CITIZEN" },
  { cardId: "card_12", role: "CITIZEN" },
];

const DECKS: Record<Variant, DeckCard[]> = {
  sports_mafia: SPORTS_DECK,
  japanese_mafia: JAPANESE_DECK,
};

const LAYOUT_TRANSITION = {
  type: "spring",
  stiffness: 220,
  damping: 26,
} as const;

export default function DeckPreviewPage() {
  const t = useTranslations("game");
  const [variant, setVariant] = useState<Variant>("sports_mafia");
  const [pickedCardId, setPickedCardId] = useState<string | null>(null);

  const isSports = variant === "sports_mafia";
  const deck = DECKS[variant];

  const handlePick = useCallback((cardId: string) => {
    setPickedCardId(cardId);
  }, []);

  const handleDismiss = useCallback(() => {
    setPickedCardId(null);
  }, []);

  const switchVariant = useCallback((next: Variant) => {
    setPickedCardId(null);
    setVariant(next);
  }, []);

  const revealedRole =
    deck.find((c) => c.cardId === pickedCardId)?.role ?? null;
  const remaining = deck.length - (pickedCardId ? 1 : 0);

  return (
    <AnimatePresence>
      <motion.div
        key="card-picking-board"
        className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-black/85 px-4 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        onClick={pickedCardId ? handleDismiss : undefined}
      >
        {/* Dev-only variant switcher (not part of the real board). */}
        <div
          className="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 gap-1 rounded-full bg-white/10 p-1 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          {(["sports_mafia", "japanese_mafia"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => switchVariant(v)}
              className={[
                "rounded-full px-3 py-1 font-medium transition-colors",
                variant === v
                  ? "bg-white text-black"
                  : "text-white/70 hover:text-white",
              ].join(" ")}
            >
              {v === "sports_mafia" ? "Sports (10)" : "Japanese (12)"}
            </button>
          ))}
        </div>

        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            {t("pickingRolesHeading")}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            {pickedCardId ? t("yourRole") : t("pickYourCard")}
          </h2>
          {!pickedCardId && (
            <p className="mt-1 text-sm text-white/50">
              {t("cardsLeftInDeck", { count: remaining })}
            </p>
          )}
        </div>

        <div
          className={
            isSports
              ? "mt-6 grid w-full max-w-[1280px] grid-cols-5 place-items-center gap-3 overflow-y-auto px-2 sm:gap-5 sm:px-4"
              : "mt-6 grid w-full max-w-6xl grid-cols-3 gap-3 overflow-y-auto p-4 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6 lg:gap-6"
          }
        >
          {deck.map((card) => {
            if (card.cardId === pickedCardId) {
              return (
                <div
                  key={card.cardId}
                  className="aspect-[2/3] w-full"
                  aria-hidden="true"
                />
              );
            }
            return (
              <motion.div
                key={card.cardId}
                layoutId={`pick-card-${card.cardId}`}
                className="aspect-[2/3] w-full"
                transition={LAYOUT_TRANSITION}
              >
                <RoleCard
                  cardId={card.cardId}
                  role={card.role}
                  isFlipped={false}
                  claimed={false}
                  onPick={pickedCardId ? undefined : handlePick}
                />
              </motion.div>
            );
          })}
        </div>

        {pickedCardId && (
          <motion.div
            key={`reveal-${pickedCardId}`}
            layoutId={`pick-card-${pickedCardId}`}
            className="fixed left-1/2 top-1/2 aspect-[2/3] w-[clamp(240px,40vw,420px)] -translate-x-1/2 -translate-y-1/2 cursor-pointer"
            transition={LAYOUT_TRANSITION}
            onClick={handleDismiss}
          >
            <RoleCard
              cardId={pickedCardId}
              role={revealedRole}
              isFlipped={true}
              claimed={false}
            />
          </motion.div>
        )}

        {pickedCardId && (
          <motion.p
            key="dismiss-hint"
            className="pointer-events-none fixed inset-x-0 bottom-8 z-10 text-center text-sm text-white/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            {t("clickToContinue")}
          </motion.p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
