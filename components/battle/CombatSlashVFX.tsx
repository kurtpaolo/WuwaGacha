"use client";

import React from "react";
import { motion } from "framer-motion";
import { ResonatorElement, MoveCategory } from "@/lib/battle/types";

export interface CombatSlashVFXProps {
  element: ResonatorElement;
  category?: MoveCategory;
  isCrit?: boolean;
  isSuper?: boolean;
}

interface ElementConfig {
  stroke1: string;
  stroke2: string;
  glow: string;
  particleColor: string;
  sparkleSymbol: string;
}

const ELEMENT_VFX_CONFIG: Record<ResonatorElement, ElementConfig> = {
  Fusion: {
    stroke1: "#f97316", // orange-500
    stroke2: "#ef4444", // rose-500
    glow: "rgba(249, 115, 22, 0.95)",
    particleColor: "#fde047", // yellow-300
    sparkleSymbol: "🔥",
  },
  Glacio: {
    stroke1: "#38bdf8", // sky-400
    stroke2: "#e0f2fe", // cyan-100
    glow: "rgba(56, 189, 248, 0.95)",
    particleColor: "#bae6fd", // sky-200
    sparkleSymbol: "❄️",
  },
  Electro: {
    stroke1: "#c084fc", // purple-400
    stroke2: "#a855f7", // purple-500
    glow: "rgba(192, 132, 252, 0.95)",
    particleColor: "#e879f9", // fuchsia-400
    sparkleSymbol: "⚡",
  },
  Aero: {
    stroke1: "#34d399", // emerald-400
    stroke2: "#2dd4bf", // teal-400
    glow: "rgba(52, 211, 153, 0.95)",
    particleColor: "#a7f3d0", // emerald-200
    sparkleSymbol: "🌪️",
  },
  Spectro: {
    stroke1: "#facc15", // yellow-400
    stroke2: "#fef08a", // yellow-200
    glow: "rgba(250, 204, 21, 0.95)",
    particleColor: "#ffffff",
    sparkleSymbol: "✨",
  },
  Havoc: {
    stroke1: "#f43f5e", // rose-500
    stroke2: "#a855f7", // purple-500
    glow: "rgba(244, 63, 94, 0.95)",
    particleColor: "#c084fc",
    sparkleSymbol: "💥",
  },
};

export const CombatSlashVFX: React.FC<CombatSlashVFXProps> = ({
  element,
  category = "basic",
  isCrit = false,
  isSuper = false,
}) => {
  const config = ELEMENT_VFX_CONFIG[element] || ELEMENT_VFX_CONFIG.Spectro;
  const isMultiHit = category === "forte" || isCrit;

  return (
    <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center overflow-visible">
      {/* Central Elemental Flash / Impact Ring */}
      <motion.div
        initial={{ scale: 0.2, opacity: 0.95 }}
        animate={{ scale: isMultiHit ? 1.6 : 1.3, opacity: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="absolute w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 border-white pointer-events-none"
        style={{
          boxShadow: `0 0 24px ${config.glow}, inset 0 0 16px ${config.glow}`,
          borderColor: config.stroke2,
        }}
      />

      {/* SVG Blade Slash Arcs */}
      <svg
        viewBox="0 0 120 120"
        className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 overflow-visible pointer-events-none filter drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]"
      >
        <defs>
          <linearGradient id={`slashGrad1_${element}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="50%" stopColor={config.stroke1} stopOpacity="0.9" />
            <stop offset="100%" stopColor={config.stroke2} stopOpacity="0" />
          </linearGradient>

          <linearGradient id={`slashGrad2_${element}`} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="50%" stopColor={config.stroke2} stopOpacity="0.9" />
            <stop offset="100%" stopColor={config.stroke1} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Primary Diagonal Slash Arc (Top-Left to Bottom-Right) */}
        <motion.path
          d="M 12 18 Q 60 55 108 102"
          fill="none"
          stroke={`url(#slashGrad1_${element})`}
          strokeWidth={isCrit ? "6" : "4.5"}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{
            pathLength: [0, 1, 1],
            opacity: [0, 1, 0],
          }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        />

        {/* Secondary Cross-Slash Arc (Top-Right to Bottom-Left) for Skills, Forte, Crits, Liberation */}
        {(category !== "basic" || isCrit || isSuper) && (
          <motion.path
            d="M 108 18 Q 60 55 12 102"
            fill="none"
            stroke={`url(#slashGrad2_${element})`}
            strokeWidth={isCrit ? "6" : "4.5"}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: [0, 1, 1],
              opacity: [0, 1, 0],
            }}
            transition={{ duration: 0.3, delay: 0.05, ease: "easeOut" }}
          />
        )}

        {/* Third Piercing Vertical Slash for Forte Multi-Strike */}
        {isMultiHit && (
          <motion.path
            d="M 60 8 L 60 112"
            fill="none"
            stroke="#ffffff"
            strokeWidth="5"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: [0, 1, 1],
              opacity: [0, 1, 0],
            }}
            transition={{ duration: 0.26, delay: 0.1, ease: "easeOut" }}
          />
        )}
      </svg>

      {/* Burst Particles / Sparks Flying Outward */}
      {[
        { x: -35, y: -25, delay: 0.04 },
        { x: 38, y: -20, delay: 0.06 },
        { x: -30, y: 30, delay: 0.08 },
        { x: 35, y: 28, delay: 0.05 },
        { x: 0, y: -40, delay: 0.07 },
        { x: 0, y: 40, delay: 0.09 },
      ].map((p, idx) => (
        <motion.div
          key={`spark_${idx}`}
          initial={{ x: 0, y: 0, scale: 0.5, opacity: 1 }}
          animate={{ x: p.x * (isCrit ? 1.4 : 1.0), y: p.y * (isCrit ? 1.4 : 1.0), scale: 0, opacity: 0 }}
          transition={{ duration: 0.32, delay: p.delay, ease: "easeOut" }}
          className="absolute w-2 h-2 rounded-full pointer-events-none"
          style={{
            backgroundColor: config.particleColor,
            boxShadow: `0 0 10px ${config.glow}`,
          }}
        />
      ))}
    </div>
  );
};
