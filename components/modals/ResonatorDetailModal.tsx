"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  Lock,
  Check,
  ArrowLeft,
  Award,
  Palette,
} from "lucide-react";
import { soundEngine } from "@/lib/audio/soundEngine";
import { UserInventoryItem } from "@/lib/supabase/inventory";
import { RESONATORS, ElementType, getResonatorArtist } from "@/lib/data/items";
import { RarityStars } from "@/components/ui/GameIcons";
import { requestExternalRedirect } from "@/components/modals/ExternalRedirectModal";

interface ResonatorDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: UserInventoryItem | null;
  onBack?: () => void;
}

// Coordinate positions matching the S-curve constellation formation (Bottom-to-Top: S1 at bottom, S6 at top)
// With strictly uniform vertical spacing (delta-y = 17.6% per step)
const NODE_POSITIONS = [
  { rank: 1, x: 52, y: 94.0 },
  { rank: 2, x: 72, y: 76.4 },
  { rank: 3, x: 80, y: 58.8 },
  { rank: 4, x: 54, y: 41.2 },
  { rank: 5, x: 32, y: 23.6 },
  { rank: 6, x: 60, y: 6.0 },
];

// Progressive 110% compounding scale (S1=1.0x, S2=1.1x, S3=1.21x, S4=1.331x, S5=1.464x, S6=1.61x)
const NODE_SCALE_MULTIPLIER: Record<number, number> = {
  1: 1.0,
  2: 1.10,
  3: 1.21,
  4: 1.331,
  5: 1.464,
  6: 1.6105,
};

const ELEMENT_COLORS: Record<string, { badge: string; text: string; glow: string; border: string }> = {
  Spectro: {
    badge: "bg-yellow-400/20",
    text: "text-yellow-400",
    glow: "rgba(250, 204, 21, 0.4)",
    border: "border-yellow-400/40",
  },
  Havoc: {
    badge: "bg-purple-500/20",
    text: "text-purple-400",
    glow: "rgba(168, 85, 247, 0.4)",
    border: "border-purple-400/40",
  },
  Fusion: {
    badge: "bg-red-500/20",
    text: "text-red-400",
    glow: "rgba(239, 68, 68, 0.4)",
    border: "border-red-400/40",
  },
  Aero: {
    badge: "bg-teal-400/20",
    text: "text-teal-400",
    glow: "rgba(45, 212, 191, 0.4)",
    border: "border-teal-400/40",
  },
  Electro: {
    badge: "bg-violet-400/20",
    text: "text-violet-400",
    glow: "rgba(139, 92, 246, 0.4)",
    border: "border-violet-400/40",
  },
  Glacio: {
    badge: "bg-sky-400/20",
    text: "text-sky-400",
    glow: "rgba(56, 189, 248, 0.4)",
    border: "border-sky-400/40",
  },
};

export const ResonatorDetailModal: React.FC<ResonatorDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  onBack,
}) => {
  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number>(1);
  const [activatedLevel, setActivatedLevel] = useState<number>(0);

  // Character Data & Capabilities
  const res = item ? RESONATORS[item.character_id] || RESONATORS[item.character_id.toLowerCase()] : null;
  const displayName = res?.name || item?.character_name || "Resonator";
  const element = (res?.element || "Spectro") as ElementType;
  const totalCount = item?.count || 1;
  const maxAvailableSequence = Math.max(0, Math.min(6, totalCount - 1));

  const charKey = item ? item.character_id.toLowerCase() : "";
  const artistInfo = item ? getResonatorArtist(item.character_id) : null;
  const artistName = artistInfo?.name || "Kuro Games";
  const resoImageSrc = item ? `/assets/resonance/${charKey}.jpg` : "";

  const elemStyle = ELEMENT_COLORS[element] || ELEMENT_COLORS.Spectro;

  // Initialize and synchronize activation level
  useEffect(() => {
    if (!item || !isOpen) return;

    const checkAuto = typeof window !== "undefined" && localStorage.getItem("wuwa_auto_activate_sequences") === "true";
    if (checkAuto) {
      setActivatedLevel(maxAvailableSequence);
      setSelectedNodeIndex(maxAvailableSequence > 0 ? maxAvailableSequence : 1);
      return;
    }

    // Manual mode (default)
    const storageKey = `wuwa_seq_activated_${item.character_id}`;
    const saved = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
    let current = 0;
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      current = Math.min(maxAvailableSequence, Math.max(0, isNaN(parsed) ? 0 : parsed));
    }
    setActivatedLevel(current);
    if (current < maxAvailableSequence) {
      setSelectedNodeIndex(current + 1);
    } else {
      setSelectedNodeIndex(current > 0 ? current : 1);
    }
  }, [item, isOpen, maxAvailableSequence]);

  // Listen for settings change
  useEffect(() => {
    const handleSettingsChanged = () => {
      if (!item) return;
      const checkAuto = typeof window !== "undefined" && localStorage.getItem("wuwa_auto_activate_sequences") === "true";
      if (checkAuto) {
        setActivatedLevel(maxAvailableSequence);
      }
    };
    window.addEventListener("wuwa_auto_activate_changed", handleSettingsChanged);
    return () => window.removeEventListener("wuwa_auto_activate_changed", handleSettingsChanged);
  }, [item, maxAvailableSequence]);

  // Keyboard escape handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  // Action: Manually activate sequence up to selected node
  const handleActivateSelected = () => {
    if (selectedNodeIndex > maxAvailableSequence || selectedNodeIndex <= activatedLevel) return;
    const newLevel = selectedNodeIndex;
    setActivatedLevel(newLevel);
    if (typeof window !== "undefined") {
      const storageKey = `wuwa_seq_activated_${item.character_id}`;
      localStorage.setItem(storageKey, String(newLevel));
      window.dispatchEvent(new CustomEvent("wuwa_sequence_activated", {
        detail: { characterId: item.character_id, level: newLevel },
      }));
    }
  };

  const isSelectedActivated = selectedNodeIndex <= activatedLevel;
  const isSelectedCanActivate = selectedNodeIndex <= maxAvailableSequence && selectedNodeIndex > activatedLevel;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md select-none overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-5xl h-[90dvh] sm:h-[650px] max-h-[720px] bg-[#07090f] border border-yellow-400/40 rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col justify-between"
        >
          {/* ========================================================================= */}
          {/* TOP BAR NAVIGATION (Solid Opaque Color - Zero Blur)                       */}
          {/* ========================================================================= */}
          <div className="relative z-20 px-4 sm:px-6 py-3 border-b border-white/10 bg-[#07090f] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-2 sm:space-x-3">
              {onBack && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onBack();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-mono font-bold flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}
              {/* Main Title: Resonance Chain Upgrade (no resonator name) */}
              <div className="flex items-center space-x-2">
                <span className="text-xs sm:text-sm font-mono font-black uppercase tracking-widest text-yellow-400 flex items-center space-x-1.5 drop-shadow-md">
                  <Award className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <span>Resonance Chain Upgrade</span>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="relative p-2 rounded-xl bg-gradient-to-br from-rose-500/25 to-pink-600/30 hover:from-rose-500/40 hover:to-pink-600/50 border border-rose-500/50 text-rose-300 hover:text-white transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] active:scale-95 group flex-shrink-0 cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
            </button>
          </div>

          {/* ========================================================================= */}
          {/* MAIN STAGE (Starts EXACTLY below the header's bottom border line)         */}
          {/* Reference origin for all resonator artworks and constellation positioning  */}
          {/* ========================================================================= */}
          <div className="relative z-10 flex-1 w-full overflow-hidden flex flex-col justify-between">
            {/* FULL BACKGROUND SPLASH ARTWORK (Referenced to start right below header line) */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
              <img
                key={item.character_id}
                src={resoImageSrc}
                alt={displayName}
                className="w-full h-full object-cover object-top sm:object-center"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  const splashFallback =
                    res?.splashUrl ||
                    `/assets/characters/${charKey}_splash_v2.jpeg`;
                  const portraitFallback =
                    res?.portraitUrl ||
                    `/assets/characters/${charKey}_portrait.png`;
                  if (target.src.endsWith(`${charKey}.jpg`)) {
                    target.src = splashFallback;
                  } else if (target.src !== portraitFallback) {
                    target.src = portraitFallback;
                  }
                }}
              />
            </div>

            {/* ARTIST CREDIT BUTTON (Very Top-Left of the Image Stage) */}
            {/* Default: Just icon visible | Hover: Expands to show Kuro Games / Artist Name | Click: Prompts confirmation */}
            <div className="absolute top-3 left-4 sm:top-4 sm:left-6 z-20 pointer-events-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  soundEngine.playClick();
                  if (artistInfo?.url) {
                    requestExternalRedirect(artistInfo.url, artistName);
                  }
                }}
                className="group flex items-center h-8 px-2 rounded-full bg-black/70 hover:bg-black/85 border border-white/15 hover:border-yellow-400/60 backdrop-blur-md text-gray-300 hover:text-white transition-all duration-300 shadow-lg active:scale-95 cursor-pointer overflow-hidden"
                title={artistName}
              >
                <Palette className="w-4 h-4 text-yellow-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className="max-w-0 opacity-0 group-hover:max-w-[220px] group-hover:opacity-100 group-hover:ml-1.5 transition-all duration-300 ease-out text-[11px] font-mono font-bold tracking-wide whitespace-nowrap overflow-hidden">
                  {artistName}
                </span>
              </button>
            </div>

            {/* MIDDLE SECTION: Constellation at the Very Right, Centered Vertically */}
            <div className="relative z-10 flex-1 w-full flex items-center justify-end pr-2 sm:pr-4 md:pr-6 pl-2 py-2 overflow-hidden pointer-events-none">
            <div className="relative w-36 sm:w-44 md:w-48 h-[320px] sm:h-[380px] md:h-[400px] flex items-center justify-center pointer-events-auto [--base-node-size:42px] sm:[--base-node-size:48px] md:[--base-node-size:52px]">
              {NODE_POSITIONS.map((pos) => {
                const isNodeActivated = pos.rank <= activatedLevel;
                const isNodeReady = pos.rank <= maxAvailableSequence && !isNodeActivated;
                const isSelected = pos.rank === selectedNodeIndex;
                const isS6 = pos.rank === 6;
                const scale = NODE_SCALE_MULTIPLIER[pos.rank] || 1.0;

                return (
                  <div
                    key={pos.rank}
                    style={{
                      position: "absolute",
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className="z-10"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setSelectedNodeIndex(pos.rank);
                      }}
                      className={`group relative flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 ${
                        isSelected
                          ? "scale-110"
                          : "hover:scale-108"
                      }`}
                      title={`Sequence Node ${pos.rank} (${
                        isNodeActivated ? "Activated" : isNodeReady ? "Ready to Activate" : "Locked"
                      })`}
                    >
                      {/* 4-Pointed Flared Star Node (S1=1.0x, S2=1.1x, S3=1.21x... S6=1.61x) */}
                      <div
                        style={{
                          width: `calc(var(--base-node-size) * ${scale})`,
                          height: `calc(var(--base-node-size) * ${scale})`,
                        }}
                        className={`relative flex items-center justify-center transition-all duration-200 ${
                          isNodeActivated
                            ? isS6
                              ? "drop-shadow-[0_0_28px_rgba(250,204,21,1)]"
                              : "drop-shadow-[0_0_14px_rgba(250,204,21,0.9)]"
                            : isNodeReady
                            ? isS6
                              ? "drop-shadow-[0_0_28px_rgba(251,191,36,0.95)]"
                              : "drop-shadow-[0_0_14px_rgba(251,191,36,0.85)]"
                            : isS6
                            ? "drop-shadow-[0_0_16px_rgba(250,204,21,0.75)]"
                            : "drop-shadow-[0_0_9px_rgba(250,204,21,0.55)]"
                        }`}
                      >
                        <svg
                          viewBox="0 0 100 100"
                          className="w-full h-full overflow-visible"
                        >
                          {/* S6 Grand Crowned Celestial Halo Ring */}
                          {isS6 && (
                            <circle
                              cx="50"
                              cy="50"
                              r="44"
                              fill="none"
                              stroke="#facc15"
                              strokeWidth="1.3"
                              strokeDasharray="4 3"
                              opacity={isNodeActivated ? 0.9 : 0.6}
                              className={isNodeActivated || isNodeReady ? "animate-spin-slow" : ""}
                            />
                          )}
                          {/* Flared 4-pointed diamond star: DEFAULT YELLOW BORDER */}
                          <path
                            d="M 50 2 Q 50 35 15 50 Q 50 65 50 98 Q 50 65 85 50 Q 50 35 50 2 Z"
                            fill={
                              isNodeActivated
                                ? isSelected
                                  ? "#fef08a"
                                  : "#facc15"
                                : isNodeReady
                                ? isSelected
                                  ? "rgba(251,191,36,0.45)"
                                  : "rgba(251,191,36,0.25)"
                                : isSelected
                                ? "rgba(250,204,21,0.22)"
                                : "rgba(10,12,18,0.7)"
                            }
                            stroke="#facc15"
                            strokeWidth={isSelected || isNodeReady ? "2.2" : "1.75"}
                          />

                          {/* Circular outer rim */}
                          <circle
                            cx="50"
                            cy="50"
                            r="32"
                            fill="none"
                            stroke="#facc15"
                            strokeWidth="1.5"
                            opacity={isNodeActivated ? 1 : 0.7}
                          />

                          {/* Center circular emblem disc with Golden Border */}
                          <circle
                            cx="50"
                            cy="50"
                            r="20"
                            fill={isNodeActivated ? "#1c1404" : isNodeReady ? "#241804" : "#0d1017"}
                            stroke="#facc15"
                            strokeWidth="1.6"
                          />

                          {/* In-game Style Inner Star Emblem / Lock */}
                          {isNodeActivated ? (
                            <path
                              d="M 50 36 L 53 47 L 64 50 L 53 53 L 50 64 L 47 53 L 36 50 L 47 47 Z"
                              fill="#fef08a"
                            />
                          ) : isNodeReady ? (
                            <path
                              d="M 50 36 L 53 47 L 64 50 L 53 53 L 50 64 L 47 53 L 36 50 L 47 47 Z"
                              fill="#fbbf24"
                              opacity="0.9"
                            />
                          ) : (
                            /* Locked icon in center matching the screenshot */
                            <g transform="translate(42, 41) scale(0.65)">
                              <path
                                d="M 7 11 V 7 A 5 5 0 0 1 17 7 V 11 M 5 11 H 19 V 21 H 5 Z"
                                fill="none"
                                stroke="#facc15"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </g>
                          )}
                        </svg>

                        {/* Ready notification exclamation dot (matching the red dot in screenshot) */}
                        {isNodeReady && (
                          <div className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-amber-400 text-black font-mono font-black text-[9px] flex items-center justify-center shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-pulse">
                            !
                          </div>
                        )}
                      </div>

                      {/* Pulsing halo when ready to activate or active & selected */}
                      {isNodeReady && (
                        <div className="absolute -inset-1.5 rounded-full border border-amber-400/80 animate-ping pointer-events-none opacity-50" />
                      )}
                      {isNodeActivated && isSelected && (
                        <div className="absolute -inset-1.5 rounded-full border border-yellow-400/60 animate-ping pointer-events-none opacity-40" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BOTTOM CONTROLS: Left: Element/Stars/Name | Right: Sequence Node Box       */}
          {/* ========================================================================= */}
          <div className="relative z-20 px-4 sm:px-8 pb-4 sm:pb-5 w-full flex flex-col sm:flex-row sm:items-end justify-between gap-3 pointer-events-none flex-shrink-0">
            {/* Bottom-Left: Element Badge, 5 Stars, Resonator Name */}
            <div className="pointer-events-auto flex flex-col items-start space-y-1 sm:space-y-1.5">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                {/* Element Badge */}
                <div
                  className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full ${elemStyle.badge} border ${elemStyle.border} flex items-center space-x-1 sm:space-x-1.5 backdrop-blur-md shadow-md bg-black/60`}
                >
                  <img
                    src={`/assets/elements/${element.toLowerCase()}.png`}
                    alt={element}
                    className="w-3 sm:w-3.5 h-3 sm:h-3.5 object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                  <span className={`text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider ${elemStyle.text}`}>
                    {element}
                  </span>
                </div>

                {/* 5 Stars */}
                <div className="px-2 py-0.5 sm:py-1 rounded-full bg-black/60 border border-white/15 flex items-center backdrop-blur-md shadow-md">
                  <RarityStars rarity={5} size={11} />
                </div>
              </div>

              {/* Character Name */}
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black font-sans tracking-wide text-white drop-shadow-[0_2px_15px_rgba(0,0,0,0.95)] leading-tight">
                {displayName}
              </h1>
            </div>

            {/* Bottom-Right: Sequence Node Control Bar */}
            <div className="w-full sm:w-auto min-w-[270px] sm:min-w-[300px] md:w-[330px] p-2.5 sm:p-3 rounded-2xl bg-black/75 backdrop-blur-md border border-white/15 flex items-center justify-between gap-2 pointer-events-auto shadow-2xl flex-shrink-0">
              <div className="flex items-center space-x-2 sm:space-x-2.5 flex-shrink-0">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-mono font-black text-xs sm:text-sm flex-shrink-0 ${
                    isSelectedActivated
                      ? "bg-yellow-400 text-black shadow-[0_0_10px_rgba(250,204,21,0.5)]"
                      : isSelectedCanActivate
                      ? "bg-amber-500/30 text-amber-300 border border-amber-400/50 animate-pulse"
                      : "bg-white/10 text-gray-400 border border-white/10"
                  }`}
                >
                  S{selectedNodeIndex}
                </div>
                <h3 className="text-xs sm:text-sm font-mono font-black uppercase tracking-wide text-white whitespace-nowrap">
                  Sequence Node {selectedNodeIndex}
                </h3>
              </div>

              {/* Right side status / Activate button */}
              <div className="flex-shrink-0">
                {isSelectedActivated ? (
                  <div className="px-2.5 sm:px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] sm:text-[11px] font-mono font-black uppercase flex items-center space-x-1 sm:space-x-1.5 shadow-sm whitespace-nowrap">
                    <Check className="w-3.5 h-3.5 stroke-[3] flex-shrink-0" />
                    <span>Activated</span>
                  </div>
                ) : isSelectedCanActivate ? (
                  <button
                    type="button"
                    onClick={handleActivateSelected}
                    className="px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 hover:from-yellow-300 hover:to-yellow-200 text-black font-mono font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(250,204,21,0.6)] animate-pulse flex items-center space-x-1.5 active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5 fill-black flex-shrink-0" />
                    <span>Activate</span>
                  </button>
                ) : (
                  <div className="px-2.5 sm:px-3 py-1 rounded-full bg-white/5 border border-white/15 text-gray-400 text-[10px] sm:text-[11px] font-mono font-bold uppercase flex items-center space-x-1 sm:space-x-1.5 whitespace-nowrap">
                    <Lock className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    <span>Locked</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  </AnimatePresence>
  );
};
