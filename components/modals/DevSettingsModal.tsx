"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, Volume2, Music, Sparkles } from "lucide-react";
import { soundEngine } from "@/lib/audio/soundEngine";

interface DevSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSandbox?: boolean;
  onToggleSandbox?: (enabled: boolean) => void;
}

export const DevSettingsModal: React.FC<DevSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [masterVol, setMasterVol] = useState<number>(() => Math.round(soundEngine.getMasterVolume() * 100));
  const [musicVol, setMusicVol] = useState<number>(() => Math.round(soundEngine.getMusicVolume() * 100));
  const [summonVol, setSummonVol] = useState<number>(() => Math.round(soundEngine.getSummonVolume() * 100));

  useEffect(() => {
    if (isOpen) {
      setMasterVol(Math.round(soundEngine.getMasterVolume() * 100));
      setMusicVol(Math.round(soundEngine.getMusicVolume() * 100));
      setSummonVol(Math.round(soundEngine.getSummonVolume() * 100));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMasterChange = (val: number) => {
    setMasterVol(val);
    soundEngine.setMasterVolume(val / 100);
  };

  const handleMusicChange = (val: number) => {
    setMusicVol(val);
    soundEngine.setMusicVolume(val / 100);
  };

  const handleSummonChange = (val: number) => {
    setSummonVol(val);
    soundEngine.setSummonVolume(val / 100);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/95 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-[#0e1119] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header: Just Settings */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/30">
                <Settings className="w-5 h-5 text-yellow-400" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-wider text-white font-display">
                Settings
              </h2>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 overflow-y-auto">
            {/* ========================================================================= */}
            {/* 1. VOLUME SECTION (AT THE VERY TOP) */}
            {/* ========================================================================= */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-white/10 pb-2">
                <Volume2 className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-yellow-400">
                  Audio & Volume
                </span>
              </div>

              {/* Master Volume */}
              <div className="space-y-2 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-white text-xs font-bold uppercase tracking-wide">
                    <Volume2 className="w-4 h-4 text-gray-300" />
                    <span>Master Volume</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-yellow-400 min-w-[40px] text-right">
                    {masterVol}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={masterVol}
                  onChange={(e) => handleMasterChange(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-yellow-400 hover:accent-yellow-300"
                />
              </div>

              {/* Music Volume (wuwamenu BGM) */}
              <div className="space-y-2 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-white text-xs font-bold uppercase tracking-wide">
                    <Music className="w-4 h-4 text-gray-300" />
                    <span>Music Volume</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-yellow-400 min-w-[40px] text-right">
                    {musicVol}%
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 font-mono">
                  Background Music
                </p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={musicVol}
                  onChange={(e) => handleMusicChange(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-yellow-400 hover:accent-yellow-300"
                />
              </div>

              {/* Summon Volume (all cutscenes & reveal stingers) */}
              <div className="space-y-2 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-white text-xs font-bold uppercase tracking-wide">
                    <Sparkles className="w-4 h-4 text-gray-300" />
                    <span>Summon Volume</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-yellow-400 min-w-[40px] text-right">
                    {summonVol}%
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 font-mono">
                  Summons and character cutscenes
                </p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={summonVol}
                  onChange={(e) => handleSummonChange(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-yellow-400 hover:accent-yellow-300"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
