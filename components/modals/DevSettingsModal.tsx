"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Settings,
  Volume2,
  Music,
  Sparkles,
  Smartphone,
  Zap,
  Check,
  Share,
  PlusSquare,
  HelpCircle,
  Lock,
} from "lucide-react";
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

  // Convene Experience skipping states
  const [skipMeteor, setSkipMeteor] = useState<boolean>(false);
  const [skip3Star, setSkip3Star] = useState<boolean>(false);
  const [skip4Star, setSkip4Star] = useState<boolean>(false);

  // Auto-Activate Sequences mode state (default: false / manual)
  const [autoActivate, setAutoActivate] = useState<boolean>(false);

  // PWA Add to Home Screen states
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSkipMeteor(localStorage.getItem("wuwa_skip_meteor") === "true");

      const storedSkip3 = localStorage.getItem("wuwa_skip_3star");
      const storedSkip4 = localStorage.getItem("wuwa_skip_4star");
      const legacyFast = localStorage.getItem("wuwa_fast_convene") === "true";

      setSkip3Star(storedSkip3 !== null ? storedSkip3 === "true" : legacyFast);
      setSkip4Star(storedSkip4 !== null ? storedSkip4 === "true" : legacyFast);
      setAutoActivate(localStorage.getItem("wuwa_auto_activate_sequences") === "true");

      const checkStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(Boolean(checkStandalone));

      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };
      window.addEventListener("beforeinstallprompt", handleBeforeInstall);
      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      };
    }
  }, [isOpen]);

  const handleToggleSkipMeteor = (val: boolean) => {
    soundEngine.playClick();
    setSkipMeteor(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("wuwa_skip_meteor", String(val));
      window.dispatchEvent(new Event("wuwa_convene_settings_changed"));
    }
  };

  const handleToggleSkip3Star = (val: boolean) => {
    soundEngine.playClick();
    setSkip3Star(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("wuwa_skip_3star", String(val));
      window.dispatchEvent(new Event("wuwa_convene_settings_changed"));
    }
  };

  const handleToggleSkip4Star = (val: boolean) => {
    soundEngine.playClick();
    setSkip4Star(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("wuwa_skip_4star", String(val));
      window.dispatchEvent(new Event("wuwa_convene_settings_changed"));
    }
  };

  const handleToggleAutoActivate = (val: boolean) => {
    soundEngine.playClick();
    setAutoActivate(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("wuwa_auto_activate_sequences", String(val));
      window.dispatchEvent(new Event("wuwa_auto_activate_changed"));
    }
  };

  const handleInstallClick = async () => {
    soundEngine.playClick();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === "accepted") {
        setDeferredPrompt(null);
        setIsStandalone(true);
      }
    } else {
      setShowIOSGuide((prev) => !prev);
    }
  };

  const isMuted = masterVol === 0;
  const prevMasterVolRef = useRef<number>(masterVol > 0 ? masterVol : 80);

  useEffect(() => {
    if (isOpen) {
      const currentMaster = Math.round(soundEngine.getMasterVolume() * 100);
      setMasterVol(currentMaster);
      if (currentMaster > 0) {
        prevMasterVolRef.current = currentMaster;
      }
      setMusicVol(Math.round(soundEngine.getMusicVolume() * 100));
      setSummonVol(Math.round(soundEngine.getSummonVolume() * 100));
    }
  }, [isOpen]);

  const handleMasterChange = (val: number) => {
    if (val > 0) {
      prevMasterVolRef.current = val;
    }
    setMasterVol(val);
    soundEngine.setMasterVolume(val / 100);
  };

  const handleToggleMuteAll = () => {
    soundEngine.playClick();
    if (isMuted) {
      const restore = prevMasterVolRef.current > 0 ? prevMasterVolRef.current : 80;
      handleMasterChange(restore);
    } else {
      prevMasterVolRef.current = masterVol > 0 ? masterVol : 80;
      handleMasterChange(0);
    }
  };

  const handleMusicChange = (val: number) => {
    setMusicVol(val);
    soundEngine.setMusicVolume(val / 100);
  };

  const handleSummonChange = (val: number) => {
    setSummonVol(val);
    soundEngine.setSummonVolume(val / 100);
  };
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/95 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-[#0e1119] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85dvh] sm:max-h-[90dvh]"
        >
          {/* Header: Just Settings */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02] flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/30">
                <Settings className="w-5 h-5 text-yellow-400" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-wider text-white font-display">
                Settings
              </h2>
            </div>

            <button
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

          {/* Body */}
          <div className="p-6 space-y-6 overflow-y-auto">
            {/* ========================================================================= */}
            {/* 1. VOLUME SECTION (AT THE VERY TOP) */}
            {/* ========================================================================= */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center space-x-2">
                  <Volume2 className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-yellow-400">
                    Audio & Volume
                  </span>
                </div>

                {/* Mute All small toggle at the very right of Audio & Volume */}
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
                    Mute All
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleMuteAll}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isMuted ? "bg-rose-500" : "bg-white/15"
                    }`}
                    title={isMuted ? "Unmute Audio" : "Mute All Audio"}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isMuted ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
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
                  onInput={(e) => handleMasterChange(Number((e.target as HTMLInputElement).value))}
                  className="w-full h-2 bg-white/15 rounded-lg appearance-none cursor-pointer accent-yellow-400 hover:accent-yellow-300 touch-none"
                />
              </div>

              {/* Music Volume (Anime Adventures Theme BGM) */}
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
                  Background Music (Anime Adventures Theme)
                </p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={musicVol}
                  onChange={(e) => handleMusicChange(Number(e.target.value))}
                  onInput={(e) => handleMusicChange(Number((e.target as HTMLInputElement).value))}
                  className="w-full h-2 bg-white/15 rounded-lg appearance-none cursor-pointer accent-yellow-400 hover:accent-yellow-300 touch-none"
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
                  onInput={(e) => handleSummonChange(Number((e.target as HTMLInputElement).value))}
                  className="w-full h-2 bg-white/15 rounded-lg appearance-none cursor-pointer accent-yellow-400 hover:accent-yellow-300 touch-none"
                />
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 2. GACHA CONVENE SETTINGS */}
            {/* ========================================================================= */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-white/10 pb-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-yellow-400">
                  Convene Experience
                </span>
              </div>

              {/* Skip Summoning Animation (the meteor only) */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2 text-white text-xs font-bold uppercase tracking-wide">
                      <Zap className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Skip Summoning Animation (the meteor only)</span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono">
                      Bypasses the initial meteor cutscene.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleSkipMeteor(!skipMeteor)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      skipMeteor ? "bg-yellow-400" : "bg-white/15"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                        skipMeteor ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Skip 3 Stars */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2 text-white text-xs font-bold uppercase tracking-wide">
                      <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                      <span>Skip 3 Stars</span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono">
                      Instantly bypass 3★ weapon reveal cards.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleSkip3Star(!skip3Star)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      skip3Star ? "bg-yellow-400" : "bg-white/15"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                        skip3Star ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Skip 4 Stars */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2 text-white text-xs font-bold uppercase tracking-wide">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Skip 4 Stars</span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono">
                      Instantly bypass 4★ weapon reveals and character cutscenes.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleSkip4Star(!skip4Star)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      skip4Star ? "bg-yellow-400" : "bg-white/15"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                        skip4Star ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* 5-Star Unskippable Notice */}
              <div className="p-2.5 rounded-lg bg-yellow-400/5 border border-yellow-400/20 text-[11px] font-mono text-yellow-300/90 flex items-center space-x-2">
                <Lock className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <span>5★ convene cutscenes and character animations are strictly unskippable.</span>
              </div>

              {/* Auto-Activate Sequences Toggle */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2 text-white text-xs font-bold uppercase tracking-wide">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Auto-Activate Sequences</span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono">
                      Automatically activates Resonance Chain nodes when pulling duplicate 5★ resonators.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleAutoActivate(!autoActivate)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      autoActivate ? "bg-yellow-400" : "bg-white/15"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow-lg ring-0 transition duration-200 ease-in-out ${
                        autoActivate ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 3. APP & DEVICE (PWA ADD TO HOME SCREEN) */}
            {/* ========================================================================= */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-white/10 pb-2">
                <Smartphone className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-yellow-400">
                  App & Device
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold uppercase text-white tracking-wide">
                      Standalone App Mode
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono">
                      Play full-screen without browser address bars or navigation.
                    </p>
                  </div>

                  {isStandalone ? (
                    <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                      <Check className="w-3.5 h-3.5" />
                      <span>App Installed</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleInstallClick}
                      className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(250,204,21,0.3)] active:scale-95 cursor-pointer"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Add to Home Screen</span>
                    </button>
                  )}
                </div>

                {/* iOS / Safari Manual Instructions Dropdown */}
                {showIOSGuide && !isStandalone && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-yellow-400/10 border border-yellow-400/30 space-y-2 text-left"
                  >
                    <div className="flex items-center space-x-1.5 text-yellow-400 text-xs font-bold">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>How to Install on iPhone / iPad / Safari:</span>
                    </div>
                    <ol className="text-[11px] text-gray-300 font-mono space-y-1.5 list-decimal list-inside leading-relaxed">
                      <li>
                        Tap the <strong className="text-white inline-flex items-center px-1 py-0.5 rounded bg-white/10"><Share className="w-3 h-3 inline mr-1 text-yellow-400" /> Share</strong> button in Safari's bottom toolbar.
                      </li>
                      <li>
                        Scroll down and tap <strong className="text-white inline-flex items-center px-1 py-0.5 rounded bg-white/10"><PlusSquare className="w-3 h-3 inline mr-1 text-yellow-400" /> Add to Home Screen</strong>.
                      </li>
                      <li>
                        Tap <strong className="text-yellow-400">Add</strong> in the top-right corner to launch directly from your home screen.
                      </li>
                    </ol>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
