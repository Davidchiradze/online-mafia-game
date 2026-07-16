"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { useCardPicking } from "@/hooks/game";
import { CARD_PICK, GAME_PHASES } from "@/lib/constants/game";
import { useServerTime } from "@/lib/time/serverTime";
import type { Id } from "@convex/_generated/dataModel";
import RoleCard from "./RoleCard";

/**
 * CardPickingBoard
 *
 * Full-screen overlay shown to the picker during the `picking_roles` phase.
 *
 * Visibility rules:
 *   - Renders nothing for non-pickers (their PlayerCircle stays visible).
 *   - Once the user picks a card the server flips `isMyTurn` to false, but
 *     we keep the board mounted while the reveal animation is on screen by
 *     also tracking a local `pickedCardId`.
 *
 * Animation:
 *   - Each grid card is wrapped in `motion.div` with a stable `layoutId`.
 *   - On pick, the grid slot is replaced with a sized placeholder, and the
 *     centered overlay mounts a `motion.div` with the same `layoutId`. Motion
 *     animates the layout transition (grid -> center) automatically.
 *   - Concurrently, RoleCard's internal `FlipCard` flips face-up once the
 *     server-side role becomes visible to the claimer (Convex reactivity).
 *
 * Dismissal:
 *   - Click anywhere on the backdrop (or the centered card itself) to close
 *     the reveal. The board then unmounts naturally because `isMyTurn` is
 *     false on the server side.
 */
export default function CardPickingBoard() {
  const t = useTranslations("game");
  const { gameId, gameSessionState, gameData } = useGameRoom();
  const { state, pickCard } = useCardPicking(gameId as Id<"games">);

  // Sports Mafia has a fixed 10-card deck that we lay out as 5 top / 5 bottom
  // and size to fill the viewport. Other variants keep the compact,
  // scrollable grid (they can carry up to 12 cards).
  const isSports = gameData?.gameType === "sports_mafia";

  const [pickedCardId, setPickedCardId] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);

  const handlePick = useCallback(
    async (cardId: string) => {
      if (isPicking || pickedCardId) return;
      setIsPicking(true);
      try {
        await pickCard(cardId);
        setPickedCardId(cardId);
      } catch (err) {
        console.error("pickCard failed", err);
      } finally {
        setIsPicking(false);
      }
    },
    [isPicking, pickCard, pickedCardId],
  );

  const handleDismiss = useCallback(() => {
    setPickedCardId(null);
  }, []);

  const isPickingPhase = gameSessionState?.gamePhase === GAME_PHASES[1]; // "picking_roles"
  const shouldRender =
    Boolean(state) &&
    isPickingPhase &&
    (state?.isMyTurn || pickedCardId !== null);

  // Countdown is shown only while it's our turn and we haven't picked yet.
  // It is purely informational — the real enforcement happens server-side via
  // `ctx.scheduler.runAfter(... expireTurnInternal ...)`. If this hits 0 the
  // server will auto-pick a random card for us.
  const showCountdown =
    state?.isMyTurn === true && pickedCardId === null && shouldRender;

  if (!shouldRender || !state) return null;

  const revealedCard = pickedCardId
    ? (state.cards.find((c) => c.cardId === pickedCardId) ?? null)
    : null;
  const revealedRole = revealedCard?.role ?? null;
  const isRoleReady = revealedRole !== null;

  return (
    <AnimatePresence>
      <motion.div
        key="card-picking-board"
        className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-black/85 px-4 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={pickedCardId ? handleDismiss : undefined}
      >
        <Header
          remaining={state.pickOrder.length - state.currentPickIndex}
          isRevealing={pickedCardId !== null}
          t={t}
        />

        {showCountdown && state.currentTurnStartedAt && (
          <Countdown turnStartedAt={state.currentTurnStartedAt} />
        )}

        <div
          className={
            isSports
              ? "mt-6 grid w-full max-w-[1280px] grid-cols-5 place-items-center gap-3 overflow-y-auto px-2 sm:gap-5 sm:px-4"
              : "mt-6 grid w-full max-w-6xl grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6 lg:gap-6 overflow-y-auto p-4"
          }
        >
          {state.cards.map((card) => {
            if (card.cardId === pickedCardId) {
              return <Placeholder key={card.cardId} />;
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
                  claimed={card.claimed}
                  onPick={isPicking || pickedCardId ? undefined : handlePick}
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
              isFlipped={isRoleReady}
              claimed={false}
            />
          </motion.div>
        )}

        {pickedCardId && (
          <motion.p
            key="dismiss-hint"
            className="pointer-events-none fixed inset-x-0 bottom-8 z-10 text-center text-sm text-white/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: isRoleReady ? 1 : 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            {t("clickToContinue")}
          </motion.p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

const LAYOUT_TRANSITION = {
  type: "spring",
  stiffness: 220,
  damping: 26,
} as const;

function Placeholder() {
  return <div className="aspect-[2/3] w-full" aria-hidden="true" />;
}

function Header({
  remaining,
  isRevealing,
  t,
}: {
  remaining: number;
  isRevealing: boolean;
  t: ReturnType<typeof useTranslations<"game">>;
}) {
  return (
    <div className="text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-white/40">
        {t("pickingRolesHeading")}
      </p>
      <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
        {isRevealing ? t("yourRole") : t("pickYourCard")}
      </h2>
      {!isRevealing && (
        <p className="mt-1 text-sm text-white/50">
          {t("cardsLeftInDeck", { count: remaining })}
        </p>
      )}
    </div>
  );
}

/**
 * Display-only countdown for the active picker.
 *
 * Pure UX affordance: tells the picker "you have N seconds left". The
 * actual enforcement is server-side (`expireTurnInternal` scheduled via
 * `ctx.scheduler.runAfter`). If this ticks to 0 and the server hasn't fired
 * yet, the next reactive `getState` update will land within milliseconds.
 *
 * Uses `useServerTime()` so timer math is immune to the user's OS clock skew
 * (per `docs/server-time.md`).
 */
function Countdown({ turnStartedAt }: { turnStartedAt: string }) {
  const t = useTranslations("game");
  const getServerTime = useServerTime();
  const [secondsLeft, setSecondsLeft] = useState<number>(
    CARD_PICK.TIMEOUT_SECONDS,
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const startedAtMs = new Date(turnStartedAt).getTime();
    if (Number.isNaN(startedAtMs)) return;

    const tick = () => {
      const remainingMs = startedAtMs + CARD_PICK.TIMEOUT_MS - getServerTime();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsLeft(remainingSec);
    };

    tick();
    intervalRef.current = setInterval(tick, 200);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [turnStartedAt, getServerTime]);

  const isUrgent = secondsLeft <= 5;

  return (
    <div
      className={[
        "mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
        isUrgent
          ? "bg-red-500/20 text-red-200"
          : "bg-white/10 text-white/80",
      ].join(" ")}
      aria-live="polite"
    >
      <span className="h-2 w-2 rounded-full bg-current opacity-80" />
      <span>
        {secondsLeft}s {t("secondsLeft", { count: secondsLeft })}
      </span>
    </div>
  );
}
