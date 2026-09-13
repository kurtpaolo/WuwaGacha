"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RESONATORS, LIMITED_BANNER_PRESETS } from "@/lib/data/items";
import { ElementBadge, RarityStars } from "@/components/ui/GameIcons";
import { soundEngine } from "@/lib/audio/soundEngine";
import { X, Check, Sparkles } from "lucide-react";

interface BannerSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCharId: string;
  onSelectCharacter: (charId: string) => void;
}

export const BannerSelectorModal: React.FC<BannerSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedCharId,
  onSelectCharacter,
}) => {
  if (!isOpen) return null;

  const characters = Object.keys(LIMITED_BANNER_PRESETS).map((key) => ({
    id: key,
    data: RESONATORS[key] || RESONATORS["shorekeeper"],
    preset: LIMITED_BANNER_PRESETS[key],
  }));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl bg-[#0e1118]/95 border border-white/15 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/30">
                <Sparkles className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider text-white">
                  Configure Limited Convene
                </h2>
                <p className="text-xs text-gray-400 tracking-wider font-mono">
                  Select any historical or featured limited resonator to dynamically tune the banner frequency
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body: Grid of Characters */}
          <div className="p-6 md:p-8 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {characters.map(({ id, data, preset }) => {
              const isSelected = selectedCharId === id;

              return (
                <motion.div
                  key={id}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    soundEngine.playClick();
                    onSelectCharacter(id);
                  }}
                  className={`relative cursor-pointer rounded-xl border p-4 flex flex-col items-center justify-between transition-all overflow-hidden ${
                    isSelected
                      ? "bg-gradient-to-b from-yellow-500/20 via-yellow-500/5 to-black/60 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.35)]"
                      : "bg-[#131722]/80 border-white/10 hover:border-white/30 hover:bg-[#181e2c]"
                  }`}
                >
                  {/* Selected Indicator Badge */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-yellow-400 text-black p-1 rounded-full shadow-md z-10">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}

                  {/* Character Draw Image */}
                  <div className="relative w-full h-40 flex items-center justify-center my-2">
                    <img
                      src={data.drawUrl || data.splashUrl || "/assets/characters/changli_draw.png"}
                      alt={data.name}
                      className="max-h-full w-auto object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
                    />
                  </div>

                  {/* Name & Title */}
                  <div className="w-full text-center space-y-1">
                    <div className="flex items-center justify-center space-x-1.5">
                      {data.element && <ElementBadge element={data.element} size={18} />}
                      <span className="font-display font-bold text-sm text-white tracking-wide uppercase">
                        {data.name}
                      </span>
                    </div>

                    <p className="text-[11px] text-yellow-400/90 font-mono italic truncate" title={preset.title}>
                      &ldquo;{preset.title}&rdquo;
                    </p>

                    <RarityStars rarity={5} size={11} className="justify-center pt-0.5" />

                    {/* Historical Featured 4-stars preview */}
                    <div className="pt-2 border-t border-white/10 flex items-center justify-center space-x-1">
                      <span className="text-[10px] text-gray-400 font-mono uppercase">4★:</span>
                      {preset.featured4StarIds.map((fId) => {
                        const fRes = RESONATORS[fId];
                        return (
                          <span
                            key={fId}
                            className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-gray-300 capitalize"
                          >
                            {fRes ? fRes.name : fId}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-white/10 bg-white/[0.01] flex items-center justify-between">
            <span className="text-xs text-gray-400 font-mono">
              Currently Active: <strong className="text-yellow-400 uppercase">{RESONATORS[selectedCharId]?.name || "The Shorekeeper"}</strong>
            </span>

            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="px-6 py-2 rounded-sm bg-yellow-400 hover:bg-yellow-300 text-black font-display text-xs font-bold uppercase tracking-wider transition-all"
            >
              Apply Selection
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
