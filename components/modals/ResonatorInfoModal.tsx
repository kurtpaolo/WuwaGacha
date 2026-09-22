"use client";

import React, { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { soundEngine } from "@/lib/audio/soundEngine";
import { X, Swords, Zap } from "lucide-react";
import { ItemData, LimitedBannerPreset } from "@/lib/data/items";
import { ElementBadge } from "@/components/ui/GameIcons";
import { getPortraitFileName } from "@/lib/data/portraits";
import { getResonatorQuote } from "@/lib/data/resonatorQuotes";
import { createBattleResonator } from "@/lib/battle/resonatorMoves";
import { ELEMENT_COLORS } from "@/lib/battle/typeChart";
import { ResonatorElement } from "@/lib/battle/types";

interface ResonatorInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  resonator: ItemData | null;
  preset?: LimitedBannerPreset | null;
}

export const ResonatorInfoModal: React.FC<ResonatorInfoModalProps> = ({
  isOpen,
  onClose,
  resonator,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        soundEngine.playClick();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const charId = resonator?.id || "";

  // Instantiate tournament standard combat data for this resonator
  const battleRes = useMemo(() => {
    if (!charId) return null;
    try {
      return createBattleResonator(charId, 100, 0);
    } catch {
      return null;
    }
  }, [charId]);

  const roleTag = useMemo(() => {
    if (!battleRes) return "DPS";
    if (battleRes.archetype === "dps") return "DPS";
    if (battleRes.archetype === "support") return "Support";
    return "Sub-DPS";
  }, [battleRes]);

  const portraitFile = useMemo(() => getPortraitFileName(charId), [charId]);
  const canonicalQuote = useMemo(() => getResonatorQuote(charId, resonator?.quote), [charId, resonator?.quote]);
  const teamSync = useMemo(() => {
    return battleRes?.moves.find((m) => m.teamSync)?.teamSync || null;
  }, [battleRes]);

  if (!isOpen || !resonator) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[80] flex flex-col items-center justify-center p-3 sm:p-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-black/80 backdrop-blur-md select-none overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl max-h-[82dvh] sm:max-h-[88dvh] bg-[#0a0d16] border border-yellow-500/30 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col text-gray-200 my-auto"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-[#06080e]/95 sticky top-0 z-40 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-yellow-500/15 border border-yellow-400/60 flex items-center justify-center text-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.25)]">
                <span className="font-serif italic font-black text-sm">i</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white font-display tracking-wider">
                <span>Resonator Info ({roleTag})</span>
              </h3>
            </div>

            {/* Standard Animated Rotating Exit Button */}
            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="group p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/10 hover:border-white/20 active:scale-95 cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
            </button>
          </div>

          {/* Scrollable Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 scrollbar-thin scrollbar-thumb-white/15">
            {/* Identity Card: Wide Banner Image + Big Name + Element + 5 Stars */}
            <div className="relative rounded-2xl border border-white/15 bg-gradient-to-r from-purple-950/30 via-[#0e1322] to-black/60 p-3.5 sm:p-4 flex items-center space-x-4 overflow-hidden">
              {/* Wide Banner Image (Similar height, but wider) */}
              <div className="relative w-36 sm:w-48 h-20 sm:h-24 rounded-xl overflow-hidden border border-white/20 shadow-lg shrink-0 bg-black/80">
                <img
                  src={`/assets/inventory_portraits/${portraitFile}`}
                  alt={resonator.name}
                  className="w-full h-full object-cover object-center"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      resonator.splashUrl || resonator.portraitUrl || "/assets/characters/changli_portrait.png";
                  }}
                />
              </div>

              {/* Identity Details: Name, Element, 5 Stars */}
              <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1.5">
                <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide truncate font-display">
                    {resonator.name}
                  </h3>
                  {resonator.element && (
                    <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-mono font-bold text-yellow-300">
                      <ElementBadge element={resonator.element} size={15} className="w-3.5 h-3.5" />
                      <span>{resonator.element}</span>
                    </div>
                  )}
                </div>

                {/* 5-Star Rating */}
                <div className="flex items-center space-x-1 text-yellow-400 text-sm sm:text-base tracking-widest">
                  {"★".repeat(resonator.rarity || 5)}
                </div>
              </div>
            </div>

            {/* Authentic Canonical Quote Banner */}
            {canonicalQuote && (
              <div className="px-4 py-3 rounded-xl bg-white/[0.03] border-l-2 border-yellow-400/80 text-xs sm:text-sm italic text-gray-300 font-serif leading-relaxed">
                &ldquo;{canonicalQuote}&rdquo;
              </div>
            )}

            {/* Kit Breakdown - Exact Combat Skills from Battle Engine */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Swords className="w-3.5 h-3.5 text-purple-400" />
                <span>Kit Breakdown</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(battleRes?.moves || []).map((move) => {
                  const elemColor = ELEMENT_COLORS[move.element as ResonatorElement] || {
                    bg: "bg-white/10",
                    text: "text-white",
                    border: "border-white/20",
                  };
                  const isLiberation = move.category === "liberation";

                  return (
                    <div
                      key={move.id}
                      className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between space-y-2 hover:border-white/25 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-bold text-white font-mono flex items-center space-x-1.5">
                          <span>{move.name}</span>
                        </span>
                        <span
                          className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${elemColor.bg} ${elemColor.text} ${elemColor.border}`}
                        >
                          {move.element}
                        </span>
                      </div>

                      <p className="text-xs text-gray-300 leading-relaxed font-sans">
                        {move.description}
                      </p>

                      <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                        <div className="flex items-center space-x-2.5">
                          <span>
                            PWR: <strong className="text-white">{move.power}</strong>
                          </span>
                          <span>
                            ACC: <strong className="text-white">{move.accuracy}%</strong>
                          </span>
                          {move.cooldown ? (
                            <span className="text-rose-400 font-bold">{move.cooldown}T CD</span>
                          ) : null}
                        </div>
                        <div>
                          {isLiberation ? (
                            <span className="text-yellow-400 font-bold">Requires 100 Energy</span>
                          ) : (
                            <span className="text-cyan-400 font-bold">+{move.energyGain} Energy</span>
                          )}
                        </div>
                      </div>

                      {move.statusEffect && (
                        <div className="text-[9px] font-mono text-yellow-300 flex items-center space-x-1 pt-0.5 border-t border-white/5">
                          <Zap className="w-3 h-3 text-yellow-400" />
                          <span className="capitalize">
                            {move.statusEffect.type} ({Math.round(move.statusEffect.chance * 100)}% chance, {move.statusEffect.duration}T)
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Team Sync Section */}
            {teamSync && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Team Sync (Synchronized Coordinated Assist)</span>
                </h4>
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/30 to-[#0e1726] border border-cyan-500/30 flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white font-mono">
                      {teamSync.title}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-400/20 text-cyan-300 border border-cyan-400/40">
                      100% CRIT ASSIST
                    </span>
                  </div>
                  <p className="text-xs text-cyan-100/90 leading-relaxed font-sans">
                    {teamSync.description}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-4 sm:px-6 py-3 border-t border-white/10 bg-[#06080e]/95 flex items-center justify-end flex-shrink-0">
            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="w-auto px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Got It
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
