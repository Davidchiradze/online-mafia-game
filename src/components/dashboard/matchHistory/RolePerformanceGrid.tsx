"use client";

import { useRef } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useTransform,
  wrap,
} from "motion/react";
import { UserCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { JAPANESE_MAFIA_ROLES } from "@/lib/constants/game";
import {
  roleToFaction,
  factionIcon,
  factionBadgeClass,
} from "@/lib/game/roleDisplay";
import { useRoleLabel } from "@/lib/game/useRoleLabel";
import type { PlayerStats, RoleStat } from "@convex/refs/history";

interface Props {
  stats: PlayerStats | undefined;
}

// Page background (see HeadquartersWrapper) — used so the cards dissolve into
// the page at both edges of the marquee instead of hard-cutting.
const PAGE_BG = "#0a0a12";

// Slow idle drift, in % of one card-set per second (the track holds two copies,
// so 50% == one full set). Dragging overrides it; on release a fling carries on.
const BASE_VELOCITY = 1.8;

// How quickly a release-fling decays back toward the idle drift, per ~16ms frame.
const FLING_DECAY = 0.92;

// Cap on fling speed (%/s) so a hard flick can't whip the row uncontrollably.
const MAX_FLING = 220;

export default function RolePerformanceGrid({ stats }: Props) {
  const t = useTranslations("matchHistory");
  const roleLabel = useRoleLabel();

  if (stats === undefined) {
    return (
      <div className="mb-10 flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[104px] w-44 shrink-0 animate-pulse rounded-xl border border-white/5 bg-[#13131a]/40"
          />
        ))}
      </div>
    );
  }

  // Nothing to show until the player has finished at least one game.
  if (stats.totalMatches === 0) return null;

  // Show every role — fill roles the player hasn't held with zeros — then float
  // the most-played roles to the front (stable: unplayed stay in canonical order).
  const played = new Map<string, RoleStat>(
    stats.roleStats.map((r) => [r.role, r]),
  );
  const allRoles: RoleStat[] = JAPANESE_MAFIA_ROLES.map(
    (role) =>
      played.get(role) ?? { role, matches: 0, wins: 0, losses: 0, winRate: 0 },
  ).sort((a, b) => b.matches - a.matches);

  return (
    <div className="mb-10">
      <h3 className="mb-4 flex items-center gap-2 font-inter text-xs font-bold uppercase tracking-widest text-zinc-500">
        <UserCircle className="h-4 w-4" /> {t("rolePerformance")}
      </h3>
      <RolePerformanceMarquee roles={allRoles} />
    </div>
  );
}

function RolePerformanceMarquee({ roles }: { roles: RoleStat[] }) {
  const reduceMotion = useReducedMotion();

  // Static, native-scrollable fallback for reduced-motion users.
  if (reduceMotion) {
    return (
      <div className="-mx-6 flex gap-3 overflow-x-auto px-6 pb-2 sm:-mx-8 sm:px-8">
        {roles.map((stat) => (
          <RoleCard key={stat.role} stat={stat} />
        ))}
      </div>
    );
  }

  return <AnimatedMarquee roles={roles} />;
}

function AnimatedMarquee({ roles }: { roles: RoleStat[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const baseX = useMotionValue(0);

  // Render two copies of the set; wrap over [-50%, 0%] for a seamless loop.
  const x = useTransform(baseX, (v) => `${wrap(-50, 0, v)}%`);

  // Drag bookkeeping (refs so the animation loop reads them without re-renders).
  const dragging = useRef(false);
  const startClientX = useRef(0);
  const startBaseX = useRef(0);
  const prevX = useRef(0); // baseX last frame — used to measure drag velocity
  const velocity = useRef(0); // %/s while dragging; seeds the release fling
  const fling = useRef(0); // %/s momentum after release, decays to idle drift

  useAnimationFrame((_, delta) => {
    const dt = Math.max(delta, 1) / 1000;
    const cur = baseX.get();

    if (dragging.current) {
      // Pointer sets the position directly; just sample its speed for the fling.
      velocity.current = (cur - prevX.current) / dt;
    } else if (Math.abs(fling.current) > BASE_VELOCITY) {
      baseX.set(cur + fling.current * dt);
      fling.current *= Math.pow(FLING_DECAY, delta / 16.67);
    } else {
      // Idle: slow drift right→left.
      baseX.set(cur - BASE_VELOCITY * dt);
    }
    prevX.current = baseX.get();
  });

  // Convert a pixel delta to track-percent (track width == two card sets).
  const pxToPercent = (px: number) => {
    const width = trackRef.current?.offsetWidth ?? 1;
    return (px / width) * 100;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    fling.current = 0;
    velocity.current = 0;
    startClientX.current = e.clientX;
    startBaseX.current = baseX.get();
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const delta = pxToPercent(e.clientX - startClientX.current);
    baseX.set(startBaseX.current + delta);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    fling.current = Math.max(-MAX_FLING, Math.min(MAX_FLING, velocity.current));
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div className="relative overflow-hidden">
      <motion.div
        ref={trackRef}
        style={{ x }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="flex w-max cursor-grab touch-pan-y select-none gap-3 will-change-transform active:cursor-grabbing"
      >
        {roles.map((stat) => (
          <RoleCard key={`a-${stat.role}`} stat={stat} />
        ))}
        {roles.map((stat) => (
          <RoleCard key={`b-${stat.role}`} stat={stat} aria-hidden />
        ))}
      </motion.div>

      {/* Edge fades — cards dissolve into the page background at both ends. */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-16"
        style={{
          background: `linear-gradient(90deg, ${PAGE_BG}, transparent)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-16"
        style={{
          background: `linear-gradient(270deg, ${PAGE_BG}, transparent)`,
        }}
      />
    </div>
  );
}

function RoleCard({
  stat,
  ...rest
}: { stat: RoleStat } & React.HTMLAttributes<HTMLDivElement>) {
  const t = useTranslations("matchHistory");
  const roleLabel = useRoleLabel();
  const faction = roleToFaction(stat.role);
  const Icon = factionIcon(faction);
  return (
    <div
      {...rest}
      className="relative flex w-44 shrink-0 flex-col overflow-hidden rounded-xl border border-white/5 bg-[#13131a]/60 p-4 backdrop-blur-md transition-colors hover:bg-[#1a1a24]"
    >
      <div className="mb-3 flex items-center gap-2">
        <div
          className={cn("rounded-md border p-1.5", factionBadgeClass(faction))}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="truncate text-sm font-bold text-white">
          {roleLabel(stat.role)}
        </span>
      </div>
      <div className="mt-auto flex items-end justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            {t("plays")}
          </span>
          <span className="font-orbitron text-lg font-bold text-zinc-300">
            {stat.matches}
          </span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            {t("winRate")}
          </span>
          <span
            className={cn(
              "font-orbitron text-lg font-bold",
              stat.winRate >= 50
                ? "text-[#00ff66]"
                : stat.winRate === 0 && stat.wins + stat.losses > 0
                  ? "text-[#ff2a2a]"
                  : "text-zinc-300",
            )}
          >
            {stat.winRate}%
          </span>
        </div>
      </div>
    </div>
  );
}
