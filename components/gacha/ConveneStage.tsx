"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { soundEngine } from "@/lib/audio/soundEngine";
import {
  RESONATORS,
  WEAPONS,
  LIMITED_BANNER_PRESETS,
  LIMITED_CHARACTERS_LIST,
  ItemData,
} from "@/lib/data/items";
import { RollResultItem, ConveneResponse } from "@/lib/gacha/engine";
import {
  executeClientConvene,
  getClientStateData,
  updateClientCurrency,
  grantClientCurrency,
  toggleClientSandbox,
  setClientSelectedChar,
  resetClientSimState,
} from "@/lib/gacha/clientSim";
import {
  AstriteIcon,
  RarityStars,
} from "@/components/ui/GameIcons";
import { ConveneVideoPlayer } from "@/components/gacha/ConveneVideoPlayer";
import { HistoryModal } from "@/components/modals/HistoryModal";
import { DetailsModal } from "@/components/modals/DetailsModal";
import { DevSettingsModal } from "@/components/modals/DevSettingsModal";
import { ReplenishModal } from "@/components/modals/ReplenishModal";
import {
  Sparkles,
  AlertCircle,
  Clock,
  SlidersHorizontal,
  History as HistoryIcon,
  HelpCircle,
  Volume2,
  VolumeX,
  Plus,
  Sword,
  Globe,
} from "lucide-react";

export type BannerMode = "character_limited" | "weapon_limited" | "character_standard";

export const ConveneStage: React.FC = () => {
  // Active states
  const [bannerMode, setBannerMode] = useState<BannerMode>("character_limited");
  const [selectedCharId, setSelectedCharId] = useState<string>("jiyan");
  const [userState, setUserState] = useState<any>(null);
  const [pityMap, setPityMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [conveneResult, setConveneResult] = useState<ConveneResponse | null>(null);

  // Modals
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [isDevOpen, setIsDevOpen] = useState<boolean>(false);
  const [isReplenishOpen, setIsReplenishOpen] = useState<boolean>(false);
  const [replenishTarget, setReplenishTarget] = useState<any>("astrite");
  const [isMuted, setIsMuted] = useState<boolean>(soundEngine.getIsMuted());
  const [showOrientationScreen, setShowOrientationScreen] = useState<boolean>(true);
  const [comingSoonNotice, setComingSoonNotice] = useState<boolean>(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState<boolean>(false);
  const [insufficientAstriteData, setInsufficientAstriteData] = useState<{
    needed: number;
    current: number;
  }>({ needed: 160, current: 0 });

  // Fetch initial user and pity state from client-side simulator
  const fetchState = useCallback(() => {
    try {
      const data = getClientStateData();
      if (data.user) {
        setUserState(data.user);
        if (data.user.selectedLimitedChar) {
          setSelectedCharId(data.user.selectedLimitedChar);
        }
      }
      if (data.pity) {
        setPityMap(data.pity as any);
      }
    } catch (e) {
      console.error("Failed to load client state:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Handle selecting a limited character from the rail
  const handleSelectCharacter = (charId: string) => {
    setSelectedCharId(charId);
    setBannerMode("character_limited");
    setClientSelectedChar(charId);
    soundEngine.playClick();
  };

  // Perform Convene Pull (1 or 10) completely client-side
  const handlePull = async (count: 1 | 10) => {
    if (isPulling) return;

    if (
      bannerMode === "character_limited" &&
      (currentChar?.isComingSoon || currentPreset?.isComingSoon || currentChar?.isUnavailable || currentPreset?.isUnavailable)
    ) {
      soundEngine.playClick();
      setComingSoonNotice(true);
      return;
    }

    const neededAstrite = count * 160;
    const currentAstrite = userState?.astrite ?? 0;
    const isSandbox = Boolean(userState?.isSandbox);

    if (!isSandbox && currentAstrite < neededAstrite) {
      soundEngine.playClick();
      setInsufficientAstriteData({ needed: neededAstrite, current: currentAstrite });
      setShowInsufficientModal(true);
      return;
    }

    setIsPulling(true);

    try {
      const data = executeClientConvene(bannerMode, count, selectedCharId);
      setConveneResult(data as any);

      // Update local balances and pity
      if (data.userState) {
        setUserState((prev: any) => ({ ...prev, ...data.userState }));
      }
      setPityMap((prev) => ({
        ...prev,
        [bannerMode]: {
          pity5Star: data.newPity5,
          pity4Star: data.newPity4,
          guaranteedLimited: data.guaranteedLimited,
        },
      }));
    } catch (err: any) {
      const errStr = (err.message || "").toLowerCase();
      if (errStr.includes("astrite") || errStr.includes("insufficient")) {
        setInsufficientAstriteData({ needed: neededAstrite, current: currentAstrite });
        setShowInsufficientModal(true);
      } else {
        alert(err.message || "Convene failed.");
      }
      setIsPulling(false);
      return;
    }
  };

  // Currency updates from ReplenishModal (Client-Side)
  const handleUpdateCurrency = async (currencyCol: string, amount: number) => {
    updateClientCurrency(currencyCol, amount);
    fetchState();
  };

  const handleGrantCurrency = async (astrite: number, _tides?: number) => {
    grantClientCurrency(astrite);
    fetchState();
  };

  const handleToggleSandbox = async (enabled: boolean) => {
    toggleClientSandbox(enabled);
    fetchState();
  };

  const handleResetState = async () => {
    resetClientSimState();
    fetchState();
  };

  // Current banner character & weapon presets
  const currentChar = RESONATORS[selectedCharId] || RESONATORS["changli"];
  const currentPreset = LIMITED_BANNER_PRESETS[selectedCharId] || LIMITED_BANNER_PRESETS["changli"];
  const currentPity = pityMap[bannerMode] || { pity5Star: 0, pity4Star: 0, guaranteedLimited: false };

  const isV2 = Boolean(
    currentChar?.splashUrl?.includes("_v2") ||
    currentChar?.drawUrl?.includes("_v2") ||
    currentChar?.stillUrl?.includes("_v2")
  );

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#06080e] text-white flex flex-col justify-between font-sans select-none">
      {/* ========================================================================= */}
      {/* 0. OPENING ORIENTATION NOTICE OVERLAY ("Be on landscape mode...") */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showOrientationScreen && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            onClick={() => {
              soundEngine.playClick();
              setShowOrientationScreen(false);
            }}
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer backdrop-blur-md"
          >
            <div className="flex flex-col items-center space-y-6 max-w-lg">
              {/* Animated Phone Rotate Icon */}
              <div className="relative flex items-center justify-center w-24 h-24">
                <div className="absolute inset-0 rounded-full bg-yellow-400/15 animate-ping pointer-events-none" />
                <div className="relative p-5 rounded-2xl bg-[#10141d] border border-yellow-400/40 text-yellow-400 shadow-[0_0_35px_rgba(250,204,21,0.25)]">
                  <svg
                    className="w-12 h-12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                    <path d="M19 12c1.5 0 2.5-1 2.5-2.5S20.5 7 19 7" stroke="#facc15" strokeDasharray="2 2" />
                    <path d="M21 7l-2-2-2 2" stroke="#facc15" />
                  </svg>
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
                  Be on landscape mode for full experience
                </h2>
              </div>

              <div className="pt-4">
                <span className="inline-block px-8 py-3 rounded-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-black font-black uppercase tracking-widest text-xs sm:text-sm shadow-[0_0_25px_rgba(250,204,21,0.6)] animate-pulse">
                  Tap Anywhere to Continue
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Element Atmospheric Glow Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 transition-opacity duration-1000"
          style={{
            background:
              bannerMode === "character_limited"
                ? `radial-gradient(ellipse at 70% 45%, ${currentPreset.accentColor}24 0%, #06080e 72%)`
                : bannerMode === "weapon_limited"
                ? "radial-gradient(ellipse at 70% 45%, rgba(56,189,248,0.22) 0%, #06080e 72%)"
                : "radial-gradient(ellipse at 70% 45%, rgba(192,132,252,0.2) 0%, #06080e 72%)",
          }}
        />
        {/* Subtle Tech Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-60" />
      </div>

      {/* ========================================================================= */}
      {/* 1. TOP HEADER HUD */}
      {/* ========================================================================= */}
      <header className="relative z-20 flex items-center justify-between px-6 py-3 border-b border-white/10 bg-black/40 backdrop-blur-md">
        {/* Top Left: Title "you a gacha addict" (ESC removed) */}
        <div className="flex items-center space-x-3">
          <h1 className="font-black tracking-wider text-base md:text-lg uppercase text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
            you a gacha addict
          </h1>

          {userState?.isSandbox && (
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-mono text-[11px] font-bold uppercase">
              Sandbox Mode
            </span>
          )}
        </div>

        {/* Top Right: Clean Astrite Counter with "+" to Replenish, Mute & Settings */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Astrite Counter */}
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm shadow-inner">
            <AstriteIcon className="w-5 h-5" />
            <span className="font-mono text-xs md:text-sm font-bold text-gray-100">
              {userState?.astrite?.toLocaleString() || "0"}
            </span>
            <button
              onClick={() => {
                setReplenishTarget("astrite");
                setIsReplenishOpen(true);
              }}
              className="p-0.5 rounded hover:bg-yellow-400/20 text-yellow-400 transition-colors"
              title="Replenish Astrite"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Mute Toggle */}
          <button
            onClick={() => {
              const next = !isMuted;
              setIsMuted(next);
              soundEngine.setMuted(next);
            }}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all"
            title={isMuted ? "Unmute Summon Audio" : "Mute Summon Audio"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Dev Modal Trigger */}
          <button
            onClick={() => setIsDevOpen(true)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all"
            title="Sandbox & Pity Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN CONVENE STAGE & DIRECT CHARACTER LEFT RAIL */}
      {/* ========================================================================= */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
        {/* LEFT BANNER RAIL = DIRECT SCROLLABLE CHARACTER LIST (Patches 1.0 - 3.7) */}
        <aside className="w-20 md:w-60 flex flex-col z-20 border-r border-white/10 bg-[#07090ec9] backdrop-blur-lg">
          {/* Rail Header */}
          <div className="px-3 py-2 border-b border-white/5 text-[10px] font-mono uppercase tracking-widest text-gray-400 font-bold hidden md:block">
            Featured Resonators
          </div>

          {/* Scrollable Resonator List */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
            {LIMITED_CHARACTERS_LIST.map((charId) => {
              const char = RESONATORS[charId];
              const preset = LIMITED_BANNER_PRESETS[charId];
              if (!char || !preset) return null;

              const isSelected = bannerMode === "character_limited" && selectedCharId === charId;

              return (
                <button
                  key={charId}
                  onClick={() => handleSelectCharacter(charId)}
                  className={`group relative w-full flex items-center space-x-2.5 p-1.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "bg-gradient-to-r from-yellow-500/20 to-yellow-500/5 border-yellow-400/80 shadow-[0_0_15px_rgba(250,204,21,0.25)]"
                      : "bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.05]"
                  }`}
                >
                  {/* Active Indicator Bar */}
                  {isSelected && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-yellow-400 rounded-r shadow-[0_0_8px_#ffd15c]" />
                  )}

                  {/* Character Avatar Thumbnail */}
                  <div className="relative w-9 h-9 md:w-11 md:h-11 rounded-md overflow-hidden bg-black/40 border border-white/10 flex-shrink-0 flex items-center justify-center">
                    <img
                      src={
                        char.portraitUrl ||
                        char.stillUrl ||
                        char.drawUrl ||
                        "/assets/characters/changli_portrait.png"
                      }
                      alt={char.name}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>

                  {/* Name details (Desktop) */}
                  <div className="hidden md:flex flex-col flex-1 min-w-0">
                    <span
                      className={`text-xs font-bold truncate ${
                        isSelected ? "text-yellow-300 font-display" : "text-gray-200 group-hover:text-white"
                      }`}
                    >
                      {char.name}
                    </span>
                    <span
                      className={`text-[10px] font-mono truncate ${
                        preset?.isUnavailable
                          ? "text-rose-400 font-bold"
                          : preset?.isComingSoon
                          ? "text-amber-400 font-bold"
                          : "text-gray-400"
                      }`}
                    >
                      {preset?.isUnavailable ? "Unavailable" : preset?.isComingSoon ? "Coming Soon" : preset?.title}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center Stage: Framed Banner Presentation (Matches reference mockup box) */}
        <section className="relative flex-1 m-2 sm:m-3 md:m-3.5 rounded-2xl border border-white/10 bg-[#07090e] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col justify-between p-6 md:p-8">
          {/* Banner Meta Info (Top Left of Stage) */}
          <div className="relative z-20 max-w-xl space-y-3 pointer-events-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${bannerMode}-${selectedCharId}`}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.3 }}
                className="space-y-2.5"
              >
                {/* 1. Header category (Featured Resonator Convene / Featured Weapon Convene) */}
                <div className="flex items-center space-x-2">
                  <span className="text-base sm:text-lg md:text-xl font-bold text-[#fef08a] tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                    {bannerMode === "character_limited"
                      ? "Featured Resonator Convene"
                      : bannerMode === "weapon_limited"
                      ? "Featured Weapon Convene"
                      : "Standard Resonator Convene"}
                  </span>
                </div>

                {/* 2. Main Banner Title */}
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
                  {bannerMode === "character_limited"
                    ? (currentPreset?.isUnavailable
                        ? (currentPreset.unavailableBannerTitle || "Unavailable for Now")
                        : currentPreset?.isComingSoon
                        ? "Coming Soon"
                        : currentPreset.title)
                    : bannerMode === "weapon_limited"
                    ? currentPreset.signatureWeaponName
                    : "Tidal Cadence"}
                </h2>

                {/* 3. Time Remaining with Clock Icon */}
                <div className="flex items-center space-x-2 text-sm sm:text-base font-bold text-[#fef08a] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#fef08a] shrink-0" />
                  <span>Remaining: 67d 67h</span>
                </div>

                {/* 4. Guarantee rules matching TEXTS reference */}
                <div className="pt-0.5 space-y-0.5 text-xs sm:text-sm md:text-base text-white/95 font-medium leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                  <p>
                    Every <span className="text-[#fef08a] font-bold">10</span> Convenes guarantees a 4-Star or above item.
                  </p>
                  <p>
                    {bannerMode === "weapon_limited" ? (
                      <>A 5-Star Weapon is guaranteed within <span className="text-[#fef08a] font-bold">80</span> Convenes.</>
                    ) : (
                      <>A 5-Star Character is guaranteed within <span className="text-[#fef08a] font-bold">80</span> Convenes.</>
                    )}
                  </p>
                </div>

                {/* Rate-up 4-Stars Display (Historically paired rate-ups) */}
                {bannerMode === "character_limited" && (
                  <div className="pt-3 flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                    <span className="text-xs font-mono uppercase text-gray-400 font-bold drop-shadow-md">
                      Rate-Up 4★ Resonators:
                    </span>
                    <div className="flex items-center space-x-2">
                      {currentPreset.featured4StarIds.map((fId) => {
                        const fRes = RESONATORS[fId];
                        return (
                          <div
                            key={fId}
                            className="flex items-center space-x-2 px-2.5 py-1 rounded-md bg-purple-950/50 border border-purple-500/40 text-purple-200 text-xs font-mono shadow-sm backdrop-blur-sm"
                          >
                            <img
                              src={fRes?.portraitUrl || `/assets/characters/${fId}_portrait.png`}
                              alt={fRes?.name || fId}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                            <span className="font-bold">{fRes ? fRes.name : fId}</span>
                            <span className="text-purple-400 text-[10px] font-bold">4★</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Hero Splash Canvas - Fits exactly into the reference box */}
          <div className={`splash-art-container absolute inset-0 w-full h-full pointer-events-none overflow-hidden flex items-center ${
            isV2 ? "justify-start" : "justify-end pr-0 md:pr-12"
          }`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={`art-${bannerMode}-${selectedCharId}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className={`relative w-full h-full flex items-center ${
                  isV2 ? "justify-start" : "justify-end"
                }`}
              >
                {bannerMode === "character_limited" ? (
                  <img
                    src={
                      currentChar.splashUrl ||
                      currentChar.stillUrl ||
                      currentChar.drawUrl ||
                      currentChar.portraitUrl ||
                      "/assets/characters/changli_splash.png"
                    }
                    alt={currentChar.name}
                    className={`splash-art-img h-full w-full select-none pointer-events-none transition-all duration-300 ${
                      isV2
                        ? "object-cover object-center drop-shadow-[0_15px_35px_rgba(0,0,0,0.85)]"
                        : "object-contain object-right pr-4 md:pr-12 drop-shadow-[0_20px_45px_rgba(0,0,0,0.95)]"
                    }`}
                  />
                ) : bannerMode === "weapon_limited" ? (
                  <div className="flex flex-col items-center justify-center p-6 md:p-8 bg-black/60 border border-white/15 rounded-2xl backdrop-blur-md mx-auto md:mr-20">
                    <Sword className="w-36 h-36 md:w-48 md:h-48 text-sky-400 drop-shadow-[0_0_35px_rgba(56,189,248,0.5)] animate-pulse" />
                    <span className="mt-4 text-xl md:text-2xl font-black uppercase text-white font-display text-center">
                      {currentPreset.signatureWeaponName}
                    </span>
                    <RarityStars rarity={5} size={20} className="mt-2" />
                  </div>
                ) : (
                  <img
                    src="/assets/characters/verina_splash.png"
                    alt="Tidal Cadence"
                    className="splash-art-img h-full w-full object-contain object-right pr-4 md:pr-12 opacity-90 drop-shadow-[0_20px_45px_rgba(0,0,0,0.95)] select-none pointer-events-none transition-all duration-300"
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Pity Status Widget (Bottom-Left of Banner Stage) */}
          <div className="relative z-20 flex items-center space-x-4 bg-black/75 border border-white/15 px-4 py-2.5 rounded-xl backdrop-blur-md w-fit shadow-lg">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-mono text-gray-400">5-Star Pity</span>
              <div className="flex items-baseline space-x-1">
                <span
                  className={`text-base font-bold font-mono ${
                    currentPity.pity5Star >= 66 ? "text-amber-300 animate-pulse" : "text-yellow-400"
                  }`}
                >
                  {currentPity.pity5Star}
                </span>
                <span className="text-xs font-mono text-gray-500">/ 80</span>
              </div>
            </div>

            <div className="h-6 w-px bg-white/15" />

            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-mono text-gray-400">4-Star Pity</span>
              <div className="flex items-baseline space-x-1">
                <span className="text-base font-bold font-mono text-purple-300">
                  {currentPity.pity4Star}
                </span>
                <span className="text-xs font-mono text-gray-500">/ 10</span>
              </div>
            </div>

            <div className="h-6 w-px bg-white/15" />

            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-mono text-gray-400">Rate Status</span>
              <span className="text-xs font-bold font-mono text-emerald-400">
                {currentPity.guaranteedLimited
                  ? "100% Guaranteed"
                  : bannerMode === "weapon_limited"
                  ? "100% Signature"
                  : "50/50 Chance"}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* 3. BOTTOM FOOTER HUD (DETAILS, HISTORY & DUAL CONVENE BUTTONS) */}
      {/* ========================================================================= */}
      <footer className="relative z-20 flex flex-col sm:flex-row items-center justify-between px-8 py-4 border-t border-white/10 bg-black/60 backdrop-blur-md gap-4">
        {/* Left: schmuckey, Details & History Buttons */}
        <div className="flex items-center space-x-3">
          <a
            href="https://portfolio-ni-schmuckey.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 px-4 py-2 rounded bg-white/5 hover:bg-white/15 border border-white/15 text-xs font-display font-bold tracking-wider text-gray-300 hover:text-white transition-all hover:scale-105"
          >
            <Globe className="w-4 h-4 text-yellow-400" />
            <span>schmuckey</span>
          </a>

          <button
            onClick={() => setIsDetailsOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded bg-white/5 hover:bg-white/15 border border-white/15 text-xs font-display font-bold uppercase tracking-wider text-gray-300 hover:text-white transition-all hover:scale-105"
          >
            <HelpCircle className="w-4 h-4 text-yellow-400" />
            <span>Notice</span>
          </button>

          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded bg-white/5 hover:bg-white/15 border border-white/15 text-xs font-display font-bold uppercase tracking-wider text-gray-300 hover:text-white transition-all hover:scale-105"
          >
            <HistoryIcon className="w-4 h-4 text-yellow-400" />
            <span>History</span>
          </button>
        </div>

        {/* Right: Exact Dual Pill-shaped Convene Buttons with Astrite */}
        <div className="flex items-center space-x-4">
          {/* Convene 1 */}
          <button
            disabled={isPulling}
            onClick={() => handlePull(1)}
            className="group relative flex flex-col items-center justify-center px-7 py-2.5 rounded-full bg-[#171d2b] hover:bg-[#202738] border border-white/25 hover:border-yellow-400/60 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none min-w-[150px] shadow-md"
          >
            <span className="font-display text-xs font-black uppercase tracking-widest text-white group-hover:text-yellow-400 transition-colors">
              {currentPreset?.isUnavailable ? "Unavailable" : currentPreset?.isComingSoon ? "Coming Soon" : "Convene 1"}
            </span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <AstriteIcon className="w-4 h-4" />
              <span className="font-mono text-xs font-bold text-gray-200">160</span>
            </div>
          </button>

          {/* Convene 10 */}
          <button
            disabled={isPulling}
            onClick={() => handlePull(10)}
            className="group relative flex flex-col items-center justify-center px-9 py-2.5 rounded-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:via-amber-300 hover:to-yellow-400 text-black border border-yellow-300 font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_22px_rgba(250,204,21,0.55)] disabled:opacity-50 disabled:pointer-events-none min-w-[175px]"
          >
            <span className="font-display text-xs font-black uppercase tracking-widest text-black">
              {currentPreset?.isUnavailable ? "Unavailable" : currentPreset?.isComingSoon ? "Coming Soon" : "Convene 10"}
            </span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <AstriteIcon className="w-4 h-4" />
              <span className="font-mono text-xs font-black text-black">1,600</span>
            </div>
          </button>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 4. ACTIVE CONVENE VIDEO & REVEAL OVERLAY */}
      {/* ========================================================================= */}
      {isPulling && conveneResult && (
        <ConveneVideoPlayer
          results={conveneResult.results}
          highestRarity={conveneResult.highestRarity}
          goldIndices={conveneResult.goldIndices}
          purpleIndices={conveneResult.purpleIndices}
          bannerType={bannerMode}
          onFinish={() => {
            setIsPulling(false);
            setConveneResult(null);
          }}
          onConveneAgain={(count) => {
            setIsPulling(false);
            setConveneResult(null);
            setTimeout(() => handlePull(count), 150);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 5. POPUP MODALS */}
      {/* ========================================================================= */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        currentBannerType={bannerMode}
      />

      <DetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        bannerType={bannerMode}
      />

      <DevSettingsModal
        isOpen={isDevOpen}
        onClose={() => setIsDevOpen(false)}
        isSandbox={Boolean(userState?.isSandbox)}
        onToggleSandbox={handleToggleSandbox}
        onGrantCurrency={handleGrantCurrency}
        onResetState={handleResetState}
      />

      <ReplenishModal
        isOpen={isReplenishOpen}
        onClose={() => setIsReplenishOpen(false)}
        currencyType="astrite"
        currentBalances={{
          astrite: userState?.astrite || 0,
        }}
        onUpdateCurrency={handleUpdateCurrency}
        onAddCurrency={handleGrantCurrency}
      />

      {/* Coming Soon Notice Modal */}
      <AnimatePresence>
        {comingSoonNotice && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none"
            onClick={() => setComingSoonNotice(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className={`relative max-w-sm w-full bg-[#0d111a] border rounded-2xl p-6 text-center space-y-4 ${
                currentChar?.isUnavailable
                  ? "border-rose-500/40 shadow-[0_0_50px_rgba(244,63,94,0.25)]"
                  : "border-yellow-400/40 shadow-[0_0_50px_rgba(250,204,21,0.25)]"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {currentChar?.isUnavailable ? (
                <>
                  <div className="mx-auto w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                    <AlertCircle className="w-7 h-7 animate-pulse" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-black uppercase tracking-wider text-white">
                      {currentChar.unavailableNoticeTitle || "Banner Currently Unavailable"}
                    </h3>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {currentChar.unavailableNoticeText || (
                        <>
                          <strong className="text-rose-400 font-bold">{currentChar.name}</strong>&apos;s banner is currently unavailable for convenes. Stay tuned for future banner updates!
                        </>
                      )}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setComingSoonNotice(false);
                    }}
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-black font-black uppercase text-xs tracking-widest transition-all shadow-[0_0_15px_rgba(244,63,94,0.4)] hover:scale-102 active:scale-98"
                  >
                    Understood
                  </button>
                </>
              ) : (
                <>
                  <div className="mx-auto w-14 h-14 rounded-full bg-yellow-400/10 border border-yellow-400/40 flex items-center justify-center text-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                    <Sparkles className="w-7 h-7 animate-pulse" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-black uppercase tracking-wider text-white">
                      This Character Is Yet To Come
                    </h3>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      <strong className="text-yellow-400 font-bold">{currentChar.name}</strong> is currently unreleased and will arrive in an upcoming banner. Summoning is not yet available for this resonator.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      soundEngine.playClick();
                      setComingSoonNotice(false);
                    }}
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-black font-black uppercase text-xs tracking-widest transition-all shadow-[0_0_15px_rgba(250,204,21,0.4)] hover:scale-102 active:scale-98"
                  >
                    Understood
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Insufficient Astrite Pop Out Modal (Choice to + or Exit) */}
      <AnimatePresence>
        {showInsufficientModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none"
            onClick={() => setShowInsufficientModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="relative max-w-sm w-full bg-[#0d111a] border border-amber-400/40 rounded-2xl p-6 text-center shadow-[0_0_60px_rgba(245,158,11,0.3)] space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Glowing Astrite Icon */}
              <div className="relative mx-auto w-16 h-16 rounded-full bg-amber-500/10 border border-amber-400/40 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.25)]">
                <AstriteIcon className="w-9 h-9 animate-pulse" />
              </div>

              {/* Title & Message */}
              <div className="space-y-1.5">
                <h3 className="text-xl font-black uppercase tracking-wider text-white">
                  Insufficient Astrite
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  You need more Astrite to perform this Convene.
                </p>
              </div>

              {/* Balance Breakdown Card */}
              <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between text-xs font-mono">
                <div className="flex flex-col items-start space-y-1">
                  <span className="text-[11px] text-gray-400">Current Balance:</span>
                  <div className="flex items-center space-x-1.5 font-bold text-white">
                    <AstriteIcon className="w-4 h-4" />
                    <span>{insufficientAstriteData.current.toLocaleString()}</span>
                  </div>
                </div>

                <div className="h-7 w-[1px] bg-white/15" />

                <div className="flex flex-col items-end space-y-1">
                  <span className="text-[11px] text-gray-400">Required:</span>
                  <div className="flex items-center space-x-1.5 font-bold text-amber-300">
                    <AstriteIcon className="w-4 h-4" />
                    <span>{insufficientAstriteData.needed.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Choice to + or Exit */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Exit Button */}
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setShowInsufficientModal(false);
                  }}
                  className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 text-gray-300 hover:text-white font-bold uppercase text-xs tracking-wider transition-all active:scale-95"
                >
                  Exit
                </button>

                {/* + Button (Replenish) */}
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setShowInsufficientModal(false);
                    setIsReplenishOpen(true);
                  }}
                  className="flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:via-amber-300 hover:to-yellow-400 text-black font-black uppercase text-xs tracking-wider transition-all shadow-[0_0_20px_rgba(250,204,21,0.4)] hover:scale-102 active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Replenish</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
};
