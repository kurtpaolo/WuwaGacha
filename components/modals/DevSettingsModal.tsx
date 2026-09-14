"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, Infinity, RotateCcw, Volume2, Music, Sparkles } from "lucide-react";
import { soundEngine } from "@/lib/audio/soundEngine";

interface DevSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSandbox: boolean;
  onToggleSandbox: (enabled: boolean) => void;
  onResetState: () => void;
}

export const DevSettingsModal: React.FC<DevSettingsModalProps> = ({
  isOpen,
  onClose,
  isSandbox,
  onToggleSandbox,
  onResetState,
}) => {
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/85 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-[#0e1119]/95 border border-white/15 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[90vh]"
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

            {/* ========================================================================= */}
            {/* 2. DEVELOPER SECTION */}
            {/* ========================================================================= */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-2 border-b border-white/10 pb-2">
                <Infinity className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
                  Developer
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="space-y-1 pr-4">
                  <span className="font-bold text-white uppercase text-xs tracking-wider">
                    Infinite Currency (Sandbox Mode)
                  </span>
                  <p className="text-xs text-gray-400">
                    When enabled, pulls do not deduct Astrites or Tides.
                  </p>
                </div>

                <button
                  onClick={() => onToggleSandbox(!isSandbox)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                    isSandbox ? "bg-emerald-500" : "bg-white/20"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isSandbox ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 3. RESET BUTTON SECTION */}
            {/* ========================================================================= */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-2 border-b border-white/10 pb-2">
                <RotateCcw className="w-4 h-4 text-red-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-red-400">
                  System Reset
                </span>
              </div>

              {confirmReset ? (
                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 space-y-3">
                  <p className="text-xs text-red-300 leading-relaxed">
                    Are you sure? This will wipe all summon history, reset all pity counters to 0, and restore default wallet balances.
                  </p>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        onResetState();
                        setConfirmReset(false);
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-md"
                    >
                      Confirm Reset
                    </button>
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="px-3 py-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-mono text-red-400 hover:text-red-300 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset All Pity, History & Balances</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
