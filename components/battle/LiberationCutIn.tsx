import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BattleResonator, BattleMove } from "@/lib/battle/types";
import { RESONATOR_CANONICAL_QUOTES } from "@/lib/data/resonatorQuotes";

interface LiberationCutInProps {
  resonator: BattleResonator;
  move: BattleMove;
  isPlayer: boolean;
  onComplete: () => void;
}

const ELEMENT_THEMES: Record<
  string,
  {
    bgGradient: string;
    speedlineColor: string;
    borderAccent: string;
    textGlow: string;
    flareColor: string;
    badgeBg: string;
    auraGlow: string;
  }
> = {
  Spectro: {
    bgGradient: "from-amber-950/95 via-yellow-950/85 to-black/95",
    speedlineColor: "rgba(251, 191, 36, 0.35)",
    borderAccent: "border-amber-400",
    textGlow: "drop-shadow-[0_0_18px_rgba(251,191,36,0.85)]",
    flareColor: "rgba(254, 240, 138, 0.95)",
    badgeBg: "bg-amber-400 text-black",
    auraGlow: "rgba(251, 191, 36, 0.45)",
  },
  Havoc: {
    bgGradient: "from-purple-950/95 via-fuchsia-950/85 to-black/95",
    speedlineColor: "rgba(168, 85, 247, 0.35)",
    borderAccent: "border-purple-400",
    textGlow: "drop-shadow-[0_0_18px_rgba(168,85,247,0.85)]",
    flareColor: "rgba(232, 121, 249, 0.95)",
    badgeBg: "bg-purple-600 text-white",
    auraGlow: "rgba(168, 85, 247, 0.45)",
  },
  Fusion: {
    bgGradient: "from-rose-950/95 via-orange-950/85 to-black/95",
    speedlineColor: "rgba(244, 63, 94, 0.35)",
    borderAccent: "border-rose-400",
    textGlow: "drop-shadow-[0_0_18px_rgba(244,63,94,0.85)]",
    flareColor: "rgba(253, 164, 175, 0.95)",
    badgeBg: "bg-rose-500 text-white",
    auraGlow: "rgba(244, 63, 94, 0.45)",
  },
  Glacio: {
    bgGradient: "from-cyan-950/95 via-sky-950/85 to-black/95",
    speedlineColor: "rgba(34, 211, 238, 0.35)",
    borderAccent: "border-cyan-400",
    textGlow: "drop-shadow-[0_0_18px_rgba(34,211,238,0.85)]",
    flareColor: "rgba(165, 243, 252, 0.95)",
    badgeBg: "bg-cyan-400 text-black",
    auraGlow: "rgba(34, 211, 238, 0.45)",
  },
  Electro: {
    bgGradient: "from-violet-950/95 via-indigo-950/85 to-black/95",
    speedlineColor: "rgba(139, 92, 246, 0.35)",
    borderAccent: "border-violet-400",
    textGlow: "drop-shadow-[0_0_18px_rgba(139,92,246,0.85)]",
    flareColor: "rgba(196, 181, 253, 0.95)",
    badgeBg: "bg-violet-500 text-white",
    auraGlow: "rgba(139, 92, 246, 0.45)",
  },
  Aero: {
    bgGradient: "from-emerald-950/95 via-teal-950/85 to-black/95",
    speedlineColor: "rgba(52, 211, 153, 0.35)",
    borderAccent: "border-emerald-400",
    textGlow: "drop-shadow-[0_0_18px_rgba(52,211,153,0.85)]",
    flareColor: "rgba(167, 243, 208, 0.95)",
    badgeBg: "bg-emerald-400 text-black",
    auraGlow: "rgba(52, 211, 153, 0.45)",
  },
};

export const LiberationCutIn: React.FC<LiberationCutInProps> = ({
  resonator,
  move,
  isPlayer,
  onComplete,
}) => {
  const normalizedId = (resonator.id || "").toLowerCase();
  const [imageSrc, setImageSrc] = useState<string>(
    resonator.spriteUrl || `/assets/sprites/${normalizedId}_transparent.png`
  );

  const theme = ELEMENT_THEMES[resonator.element] || ELEMENT_THEMES.Spectro;
  const quote =
    RESONATOR_CANONICAL_QUOTES[normalizedId] ||
    RESONATOR_CANONICAL_QUOTES[resonator.id] ||
    "Resonance frequencies aligning... Supreme strike unleashed!";

  // Fast & snappy 800ms auto-dismiss
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const handleImageError = () => {
    if (imageSrc !== `/assets/sprites/${normalizedId}_transparent.png`) {
      setImageSrc(`/assets/sprites/${normalizedId}_transparent.png`);
    } else {
      setImageSrc(resonator.portraitUrl || `/assets/characters/${normalizedId}_portrait.png`);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key={`cutin_${resonator.id}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        className="absolute inset-0 z-40 pointer-events-none overflow-hidden select-none flex items-center justify-center rounded-2xl transform-gpu"
      >
        {/* Darkened backdrop with dynamic radial elemental aura (no expensive backdrop-blur) */}
        <div
          className={`absolute inset-0 bg-[#060a14]/95 bg-gradient-to-r ${theme.bgGradient}`}
        />

        {/* High-performance CSS Diagonal Speedline Streaks */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none mix-blend-screen"
          style={{
            backgroundImage: `repeating-linear-gradient(-35deg, transparent, transparent 16px, ${theme.speedlineColor} 17px, transparent 22px)`,
          }}
        />

        {/* Kanji Resonance Watermark in Background */}
        <div
          className="absolute inset-0 flex items-center justify-center text-[22vw] sm:text-[16vw] font-black text-white/15 pointer-events-none tracking-tighter select-none"
          style={{ fontFamily: "serif" }}
        >
          共鳴解放
        </div>

        {/* Rotating Elemental Energy Ring (CSS animation on GPU compositor) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-52 h-52 sm:w-64 sm:h-64 rounded-full border border-dashed animate-[spin_12s_linear_infinite] transform-gpu"
            style={{ borderColor: theme.flareColor }}
          />
          <div
            className="absolute w-40 h-40 sm:w-52 sm:h-52 rounded-full blur-xl opacity-60"
            style={{ background: theme.auraGlow }}
          />
        </div>

        {/* Eye Lens Flare Sweep Animation */}
        <motion.div
          initial={{ x: "-100%", opacity: 0 }}
          animate={{ x: "200%", opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.45, delay: 0.1, ease: "easeInOut" }}
          className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-1.5 pointer-events-none z-30 transform-gpu"
          style={{
            background: `linear-gradient(90deg, transparent, ${theme.flareColor}, #ffffff, ${theme.flareColor}, transparent)`,
            boxShadow: `0 0 25px 8px ${theme.flareColor}`,
          }}
        />

        {/* Center Content: Top Badge, Pixel Art Sprite, and Name/Quote */}
        <div className="relative z-20 w-full h-full p-4 sm:p-5 flex flex-col justify-between items-center text-center">
          {/* Top Bar: Resonance Liberation Header + Element Badge */}
          <motion.div
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05, duration: 0.2 }}
            className="flex items-center justify-between w-full max-w-lg px-2"
          >
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-black/70 border border-white/20 shadow-lg">
              <span className="text-yellow-400 text-xs font-black animate-pulse">✦</span>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] text-white">
                Resonance Liberation
              </span>
              <span className="text-yellow-400 text-xs font-black animate-pulse">✦</span>
            </div>

            <div
              className={`px-3 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${theme.badgeBg} shadow-lg`}
            >
              {resonator.element}
            </div>
          </motion.div>

          {/* Center Pixel Art Resonator Sprite */}
          <motion.div
            initial={{
              scale: 0.5,
              x: isPlayer ? -60 : 60,
              opacity: 0,
            }}
            animate={{
              scale: [0.5, 1.2, 1.05],
              x: 0,
              opacity: 1,
            }}
            transition={{
              type: "spring",
              damping: 15,
              stiffness: 220,
              duration: 0.4,
            }}
            className="relative flex items-center justify-center my-auto transform-gpu"
          >
            {/* Ground Shadow & Floor Glow */}
            <div
              className="absolute -bottom-2 w-24 sm:w-32 h-5 rounded-full blur-md"
              style={{ background: theme.auraGlow }}
            />

            {/* Pixel Art Sprite with crisp pixelated rendering */}
            <img
              src={imageSrc}
              alt={resonator.name}
              onError={handleImageError}
              className="w-32 h-32 sm:w-36 sm:h-36 md:w-44 md:h-44 object-contain filter drop-shadow-[0_0_20px_rgba(255,255,255,0.7)]"
              style={{ imageRendering: "pixelated" }}
            />
          </motion.div>

          {/* Bottom Bar: Resonator Name, Move Name, Lore Quote */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.25 }}
            className="space-y-1 w-full max-w-xl px-2"
          >
            {/* Resonator Name */}
            <h1
              className={`text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-wider text-white font-display ${theme.textGlow}`}
            >
              {resonator.name}
            </h1>

            {/* Move Name */}
            <div className="flex items-center justify-center space-x-2">
              <span className="text-amber-400 text-xs sm:text-sm">⚔️</span>
              <span className="text-sm sm:text-xl font-bold tracking-wide text-amber-300 drop-shadow-md">
                {move.name}
              </span>
            </div>

            {/* Lore Quote */}
            <p className="text-[11px] sm:text-xs text-gray-200/90 italic font-serif max-w-md mx-auto line-clamp-2 drop-shadow">
              "{quote}"
            </p>
          </motion.div>
        </div>

        {/* Transient Flash on Entry */}
        <motion.div
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 bg-white pointer-events-none"
        />
      </motion.div>
    </AnimatePresence>
  );
};
