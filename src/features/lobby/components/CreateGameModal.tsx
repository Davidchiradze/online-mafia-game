"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { lobbyGames } from "@convex/refs/lobby";
import { ROOM_PIN } from "@convex/lib/constants";
import { gameSessions } from "@convex/refs/game";
import { createLivekitRoom } from "@/shared/lib/livekit/actions";
import { GAME_TYPES } from "@/shared/lib/constants/game";
import { Globe, Loader2, Lock } from "lucide-react";
import Modal from "@/shared/ui/Modal";
import VariantCardGroup from "@/shared/ui/variants-selector/VariantCardGroup";
import { useGameVariantOptions } from "@/shared/hooks/useGameVariantOptions";
import { useErrorMessage } from "@/shared/lib/i18n/errorMessage";
import type { Id } from "@convex/_generated/dataModel";

type CreateModeProps = {
  mode?: "create";
  open: boolean;
  onClose: () => void;
  onCreated?: (gameId: string) => void;
};

type EditModeProps = {
  mode: "edit";
  open: boolean;
  onClose: () => void;
  gameId: string;
  initialValues: {
    name: string;
    gameType: (typeof GAME_TYPES)[number];
    isPrivate: boolean;
  };
  canFinishGame?: boolean;
};

type Props = CreateModeProps | EditModeProps;

export default function CreateGameModal(props: Props) {
  const { open, onClose } = props;
  const isEdit = props.mode === "edit";

  const [name, setName] = useState("");
  const [type, setType] =
    useState<(typeof GAME_TYPES)[number]>("japanese_mafia");
  const [isPrivate, setIsPrivate] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isFinishing, setIsFinishing] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  // Host-only read of the stored PIN, so editing a private room prefills the
  // current one instead of silently asking the host to invent a new one.
  const storedPin = useQuery(
    lobbyGames.getPin,
    isEdit && open && props.initialValues.isPrivate
      ? { gameId: props.gameId as Id<"games"> }
      : "skip",
  );

  const createGame = useMutation(lobbyGames.create);
  const updateGame = useMutation(lobbyGames.update);
  const finishGameMutation = useMutation(gameSessions.finishGame);
  const getErrorMessage = useErrorMessage();
  const t = useTranslations("lobby");
  const tc = useTranslations("common");
  const variantOptions = useGameVariantOptions();

  // Depend on the initial VALUES, not on `props`: the parent rebuilds that
  // object literal on every render, and in a game room a reactive update lands
  // often enough to wipe whatever the host is halfway through typing.
  const initialName = isEdit ? props.initialValues.name : "";
  const initialType = isEdit ? props.initialValues.gameType : "japanese_mafia";
  const initialPrivate = isEdit ? props.initialValues.isPrivate : false;

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setType(initialType);
    setIsPrivate(initialPrivate);
    setPin("");
    setError(null);
    setShowFinishConfirm(false);
  }, [open, initialName, initialType, initialPrivate]);

  // `getPin` resolves after the reset above, so the prefill is its own effect.
  // `open` is a dependency so reopening the modal prefills again — `storedPin`
  // alone is unchanged on a second open, and the effect would never re-run.
  useEffect(() => {
    if (open && storedPin) setPin(storedPin);
  }, [open, storedPin]);

  const canSubmit = useMemo(
    () => name.trim().length > 0 && (!isPrivate || ROOM_PIN.PATTERN.test(pin)),
    [name, isPrivate, pin],
  );

  const hasChanges = useMemo(() => {
    if (!isEdit) return true;
    const init = (props as EditModeProps).initialValues;
    return (
      name.trim() !== init.name ||
      isPrivate !== init.isPrivate ||
      (isPrivate && pin !== (storedPin ?? ""))
    );
  }, [isEdit, name, isPrivate, pin, storedPin, props]);

  const handleCreate = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    try {
      const gameId = await createGame({
        name: name.trim(),
        gameType: type,
        isPrivate,
        pin: isPrivate ? pin : undefined,
      });
      await createLivekitRoom(gameId);
      (props as CreateModeProps).onCreated?.(gameId);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!canSubmit || loading || !hasChanges) return;
    setLoading(true);
    setError(null);
    try {
      const editProps = props as EditModeProps;
      await updateGame({
        gameId: editProps.gameId as Id<"games">,
        name: name.trim(),
        isPrivate,
        pin: isPrivate ? pin : undefined,
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleFinishGame = async () => {
    if (isFinishing) return;
    setIsFinishing(true);
    try {
      const editProps = props as EditModeProps;
      await finishGameMutation({ gameId: editProps.gameId as Id<"games"> });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsFinishing(false);
      setShowFinishConfirm(false);
    }
  };

  const handleSubmit = isEdit ? handleUpdate : handleCreate;

  const submitLabel = isEdit
    ? loading
      ? t("saving")
      : t("saveChanges")
    : loading
      ? t("creating")
      : t("createRoom");

  const canFinish = isEdit && (props as EditModeProps).canFinishGame;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t("roomSettingsTitle") : t("createRoomTitle")}
      variant="dark"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:border-white/20 font-sans text-sm font-medium transition cursor-pointer"
          >
            {tc("cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading || (isEdit && !hasChanges)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-sans text-sm font-semibold shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitLabel}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3">
            <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            <p className="text-sm text-red-400 font-sans">{error}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-400 font-sans">
            {t("roomName")}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={t("roomNamePlaceholder")}
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-gray-600 font-sans text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition"
          />
        </div>

        {!isEdit && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-400 font-sans">
              {t("gameMode")}
            </label>
            {/* Row density, not a dropdown: seats and rated-ness are what
                actually decide the mode, and a <select> could show neither.
                `city_mafia` needs no filter here any more — the options come
                from variants that have a definition, which is the same test
                `create` applies server-side. */}
            <VariantCardGroup
              options={variantOptions}
              value={type}
              onChange={setType}
              density="row"
              label={t("gameMode")}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-400 font-sans">
            {t("roomVisibility")}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsPrivate(false)}
              className={`flex flex-col items-center gap-2 px-4 py-4 rounded-xl border transition cursor-pointer ${
                !isPrivate
                  ? "border-red-500/50 bg-red-500/[0.08] shadow-[0_0_16px_rgba(220,38,38,0.15)]"
                  : "border-white/[0.08] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]"
              }`}
            >
              <Globe
                className={`w-5 h-5 transition-colors ${!isPrivate ? "text-red-400" : "text-gray-600"}`}
              />
              <div className="text-center">
                <p
                  className={`font-sans text-sm font-semibold transition-colors ${!isPrivate ? "text-white" : "text-gray-500"}`}
                >
                  {t("public")}
                </p>
                <p
                  className={`font-sans text-[0.7rem] mt-0.5 transition-colors ${!isPrivate ? "text-gray-400" : "text-gray-600"}`}
                >
                  {t("publicDesc")}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsPrivate(true)}
              className={`flex flex-col items-center gap-2 px-4 py-4 rounded-xl border transition cursor-pointer ${
                isPrivate
                  ? "border-red-500/50 bg-red-500/[0.08] shadow-[0_0_16px_rgba(220,38,38,0.15)]"
                  : "border-white/[0.08] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]"
              }`}
            >
              <Lock
                className={`w-5 h-5 transition-colors ${isPrivate ? "text-red-400" : "text-gray-600"}`}
              />
              <div className="text-center">
                <p
                  className={`font-sans text-sm font-semibold transition-colors ${isPrivate ? "text-white" : "text-gray-500"}`}
                >
                  {t("private")}
                </p>
                <p
                  className={`font-sans text-[0.7rem] mt-0.5 transition-colors ${isPrivate ? "text-gray-400" : "text-gray-600"}`}
                >
                  {t("privateDesc")}
                </p>
              </div>
            </button>
          </div>
        </div>

        {isPrivate && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-400 font-sans">
              {t("accessPin")}
            </label>
            <input
              value={pin}
              onChange={(e) =>
                setPin(
                  e.target.value.replace(/\D/g, "").slice(0, ROOM_PIN.LENGTH),
                )
              }
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder={t("accessPinPlaceholder")}
              inputMode="numeric"
              autoComplete="off"
              maxLength={ROOM_PIN.LENGTH}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-gray-600 font-orbitron text-lg tracking-[0.4em] focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition"
            />
            <p className="text-[0.7rem] text-gray-500 font-sans">
              {t("accessPinHint")}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
