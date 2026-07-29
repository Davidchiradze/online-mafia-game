"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { lobbyGames } from "@convex/refs/lobby";
import { gameSessions } from "@convex/refs/game";
import { createLivekitRoom } from "@/lib/liveKit/actions";
import { GAME_TYPES } from "@/lib/constants/game";
import { Globe, Loader2, Lock } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useErrorMessage } from "@/lib/i18n/errorMessage";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isFinishing, setIsFinishing] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  const createGame = useMutation(lobbyGames.create);
  const updateGame = useMutation(lobbyGames.update);
  const finishGameMutation = useMutation(gameSessions.finishGame);
  const getErrorMessage = useErrorMessage();
  const t = useTranslations("lobby");
  const tc = useTranslations("common");
  const tg = useTranslations("game");

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setName(props.initialValues.name);
      setType(props.initialValues.gameType);
      setIsPrivate(props.initialValues.isPrivate);
    } else {
      setName("");
      setType("japanese_mafia");
      setIsPrivate(false);
    }
    setError(null);
    setShowFinishConfirm(false);
  }, [open, isEdit, props]);

  const canSubmit = useMemo(() => name.trim().length > 0, [name]);

  const hasChanges = useMemo(() => {
    if (!isEdit) return true;
    const init = (props as EditModeProps).initialValues;
    return name.trim() !== init.name || isPrivate !== init.isPrivate;
  }, [isEdit, name, isPrivate, props]);

  const handleCreate = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    try {
      const gameId = await createGame({
        name: name.trim(),
        gameType: type,
        isPrivate,
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
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as (typeof GAME_TYPES)[number])
              }
              className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white font-sans text-sm focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition appearance-none cursor-pointer"
            >
              {GAME_TYPES.filter(
                // sports_mafia is hidden for now (pre-deploy) — not offered as a
                // creatable option. city_mafia stays hidden until it has a
                // ruleset. See docs/sports-mafia.md.
                (gt) => gt !== "city_mafia",
              ).map((gt) => (
                <option key={gt} value={gt} className="bg-[#0f0f1a]">
                  {tg(`gameTypes.${gt}` as Parameters<typeof tg>[0])}
                </option>
              ))}
            </select>
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
      </div>
    </Modal>
  );
}
