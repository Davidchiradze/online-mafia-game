"use client";

import AnimatedModal from "@/components/ui/AnimatedModal";
import FlipCard from "@/components/ui/FlipCard";
import { getRoleDisplayConfig } from "@/lib/utils/roleDisplay";
import { JAPANESE_MAFIA_ROLE_LABEL } from "@/lib/constants/game";

interface RoleRevealModalProps {
  /** Controls modal visibility */
  isOpen: boolean;
  /** Role identifier (e.g., "MAFIA", "DETECTIVE") */
  role: string;
  /** Optional role description */
  description?: string;
  /** Callback when modal closes */
  onClose: () => void;
}

/**
 * RoleRevealModal - Dramatic role reveal with flip card animation
 *
 * Features:
 * - Centered modal with dark backdrop
 * - 3D flip card animation
 * - Role-specific theming (colors, gradients)
 * - Prominent role display with icon
 * - Optional description text
 * - Mobile-friendly sizing
 */
export default function RoleRevealModal({
  isOpen,
  role,
  description,
  onClose,
}: RoleRevealModalProps) {
  const roleConfig = getRoleDisplayConfig(role);
  const roleLabel =
    JAPANESE_MAFIA_ROLE_LABEL[
      role.toUpperCase() as keyof typeof JAPANESE_MAFIA_ROLE_LABEL
    ] ?? role;

  return (
    <AnimatedModal isOpen={isOpen} onClose={onClose}>
      <FlipCard
        isFlipped={isOpen}
        flipDelay={400}
        flipDuration={800}
        width="min(320px, 85vw)"
        height="min(440px, 70vh)"
        front={<CardFront />}
        back={
          <CardBack
            roleLabel={roleLabel}
            emoji={roleConfig.emoji}
            color={roleConfig.color}
            bgGradient={roleConfig.bgGradient}
            borderColor={roleConfig.borderColor}
            description={description}
          />
        }
      />

      {/* Close hint */}
      <p className="mt-6 text-center text-sm text-white/50 animate-pulse">
        Click anywhere to close
      </p>
    </AnimatedModal>
  );
}

/** Front face of the card - "Your Role" */
function CardFront() {
  return (
    <div
      className="
        w-full h-full flex flex-col items-center justify-center
        bg-gradient-to-br from-gray-900 via-gray-800 to-black
        border border-white/10
        shadow-2xl
      "
    >
      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              rgba(255,255,255,0.03) 10px,
              rgba(255,255,255,0.03) 20px
            )`,
          }}
        />
      </div>

      {/* Card content */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Mystery icon */}
        <div className="text-6xl animate-bounce">🎭</div>

        {/* Text */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white/90 tracking-wider uppercase">
            Your Role
          </h2>
          <p className="mt-2 text-sm text-white/50">Click to reveal...</p>
        </div>

        {/* Decorative line */}
        <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      </div>

      {/* Corner decorations */}
      <CornerDecorations color="white/20" />
    </div>
  );
}

/** Back face of the card - Role reveal */
interface CardBackProps {
  roleLabel: string;
  emoji: string;
  color: string;
  bgGradient: string;
  borderColor: string;
  description?: string;
}

function CardBack({
  roleLabel,
  emoji,
  color,
  bgGradient,
  borderColor,
  description,
}: CardBackProps) {
  return (
    <div
      className={`
        w-full h-full flex flex-col items-center justify-center
        bg-gradient-to-br ${bgGradient}
        border ${borderColor}
        shadow-2xl relative overflow-hidden
      `}
    >
      {/* Glow effect */}
      <div
        className={`
          absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-64 h-64 rounded-full blur-3xl opacity-20
          bg-current ${color}
        `}
      />

      {/* Card content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-6">
        {/* Role emoji */}
        <div className="text-7xl drop-shadow-lg">{emoji}</div>

        {/* Role name */}
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-2">
            You are
          </p>
          <h2
            className={`
              text-3xl sm:text-4xl font-black tracking-wide uppercase
              ${color}
              drop-shadow-lg
            `}
          >
            {roleLabel}
          </h2>
        </div>

        {/* Decorative line */}
        <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        {/* Description */}
        {description && (
          <p className="text-sm text-white/70 text-center max-w-[240px] leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Corner decorations */}
      <CornerDecorations color="white/10" />

      {/* Subtle particles effect */}
      <ParticleEffect />
    </div>
  );
}

/** Corner decorations for cards */
function CornerDecorations({ color }: { color: string }) {
  return (
    <>
      {/* Top left */}
      <div
        className={`absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-${color}`}
      />
      {/* Top right */}
      <div
        className={`absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-${color}`}
      />
      {/* Bottom left */}
      <div
        className={`absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-${color}`}
      />
      {/* Bottom right */}
      <div
        className={`absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-${color}`}
      />
    </>
  );
}

/** Subtle floating particles effect */
function ParticleEffect() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
          style={{
            left: `${15 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
            animationDelay: `${i * 0.3}s`,
            animationDuration: `${2 + (i % 2)}s`,
          }}
        />
      ))}
    </div>
  );
}

