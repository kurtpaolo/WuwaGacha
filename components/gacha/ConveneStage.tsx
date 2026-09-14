"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { soundEngine } from "@/lib/audio/soundEngine";
import {
  RESONATORS,
  LIMITED_BANNER_PRESETS,
  LIMITED_CHARACTERS_LIST,
} from "@/lib/data/items";
import {
  ConveneResponse,
  executeClientConvene,
  getClientStateData,
  updateClientCurrency,
  toggleClientSandbox,
  setClientSelectedChar,
  resetClientSimState,
  get5050Stats,
  WinRateStats,
} from "@/lib/gacha/clientSim";
import {
  AstriteIcon,
  RarityStars,
} from "@/components/ui/GameIcons";
import { preloadSummoningVideos } from "@/lib/video/videoPreloader";
import { ConveneVideoPlayer } from "@/components/gacha/ConveneVideoPlayer";
import { CharacterRailItem } from "@/components/gacha/CharacterRailItem";
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
  Plus,
  Sword,
  Globe,
} from "lucide-react";

export type BannerMode = "character_limited" | "weapon_limited" | "character_standard";

const DEFAULT_WIN_RATE: WinRateStats = {
  total5050: 0,
  wins5050: 0,
  losses5050: 0,
  winRate: null,
  winRateFormatted: "N/A",
  total5Stars: 0,
  avgPity5Star: 0,
};

export const ConveneStage: React.FC = () => {
  // Active states
  const [bannerMode, setBannerMode] = useState<BannerMode>("character_limited");
  const [selectedCharId, setSelectedCharId] = useState<string>("shorekeeper");
  const [userState, setUserState] = useState<any>(null);
  const [pityMap, setPityMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [conveneResult, setConveneResult] = useState<ConveneResponse | null>(null);

  // Modals & Client-side Mount Flag
  const [mounted, setMounted] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [isDevOpen, setIsDevOpen] = useState<boolean>(false);
  const [isReplenishOpen, setIsReplenishOpen] = useState<boolean>(false);
  const [winRateStats, setWinRateStats] = useState<WinRateStats>(DEFAULT_WIN_RATE);
  const [showOrientationScreen, setShowOrientationScreen] = useState<boolean>(true);
  const [isSwitchingBanner, setIsSwitchingBanner] = useState<boolean>(false);
  const [switchingCharName, setSwitchingCharName] = useState<string>("");
  const [switchingBannerTitle, setSwitchingBannerTitle] = useState<string>("");
  const switchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [comingSoonNotice, setComingSoonNotice] = useState<boolean>(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState<boolean>(false);
  const [insufficientAstriteData, setInsufficientAstriteData] = useState<{
    needed: number;
    current: number;
  }>({ needed: 160, current: 0 });

  // Fetch initial user, pity and winrate state from client-side simulator
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
      setWinRateStats(get5050Stats());
    } catch (e) {
      console.error("Failed to load client state:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchState();
    soundEngine.startBGM();
  }, [fetchState]);

  // Preload queue: 3 critical summoning videos FIRST upon entering website, then deferred images
  useEffect(() => {
    // 1. HIGHEST PRIORITY: Preload the 3 summoning animation videos immediately upon website entry
    preloadSummoningVideos();

    // 2. Preload active limited character art and standard fallbacks
    const activeChar = RESONATORS[selectedCharId];
    if (activeChar) {
      [activeChar.splashUrl, activeChar.drawUrl, activeChar.stillUrl, activeChar.portraitUrl].forEach((url) => {
        if (url) {
          const img = new Image();
          img.src = url;
        }
      });
    }
    const verinaImg = new Image();
    verinaImg.src = "/assets/characters/verina_splash.png";
    const changliImg = new Image();
    changliImg.src = "/assets/characters/changli_splash.png";

    // 3. Defer secondary resonator images to idle time so video preloading has unobstructed network priority
    const timer = setTimeout(() => {
      LIMITED_CHARACTERS_LIST.forEach((charId) => {
        if (charId === selectedCharId) return;
        const char = RESONATORS[charId];
        if (!char) return;
        [char.splashUrl, char.drawUrl, char.stillUrl, char.portraitUrl].forEach((url) => {
          if (url) {
            const img = new Image();
            img.src = url;
          }
        });
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [selectedCharId]);

  useEffect(() => {
    return () => {
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
    };
  }, []);

  // Current banner character & weapon presets (memoized to avoid re-computations on unrelated state updates)
  const currentChar = useMemo(
    () => RESONATORS[selectedCharId] || RESONATORS["shorekeeper"],
    [selectedCharId]
  );
  const currentPreset = useMemo(
    () => LIMITED_BANNER_PRESETS[selectedCharId] || LIMITED_BANNER_PRESETS["shorekeeper"],
    [selectedCharId]
  );
  const currentPity = useMemo(
    () => pityMap[bannerMode] || { pity5Star: 0, pity4Star: 0, guaranteedLimited: false },
    [pityMap, bannerMode]
  );

  const isV2 = useMemo(
    () => Boolean(
      currentChar?.splashUrl?.includes("_v2") ||
      currentChar?.drawUrl?.includes("_v2") ||
      currentChar?.stillUrl?.includes("_v2")
    ),
    [currentChar]
  );

  // Handle selecting a limited character from the rail
  const handleSelectCharacter = useCallback((charId: string) => {
    if (charId === selectedCharId && bannerMode === "character_limited") return;
    soundEngine.playClick();

    const charName = RESONATORS[charId]?.name || "Resonator";
    const bannerTitle = LIMITED_BANNER_PRESETS[charId]?.title || "Featured Convene";
    setSwitchingCharName(charName);
    setSwitchingBannerTitle(bannerTitle);
    setIsSwitchingBanner(true);

    setSelectedCharId(charId);
    setBannerMode("character_limited");
    setClientSelectedChar(charId);

    if (switchTimerRef.current) {
      clearTimeout(switchTimerRef.current);
    }
    switchTimerRef.current = setTimeout(() => {
      setIsSwitchingBanner(false);
    }, 1500);
  }, [selectedCharId, bannerMode]);

  // Perform Convene Pull (1 or 10) completely client-side
  const handlePull = useCallback(async (count: 1 | 10) => {
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
      setWinRateStats(get5050Stats());
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
  }, [isPulling, bannerMode, currentChar, currentPreset, userState, selectedCharId]);

  // Currency updates from ReplenishModal (Client-Side)
  const handleUpdateCurrency = useCallback(async (currencyCol: string, amount: number) => {
    updateClientCurrency(currencyCol, amount);
    fetchState();
  }, [fetchState]);

  const handleToggleSandbox = useCallback(async (enabled: boolean) => {
    toggleClientSandbox(enabled);
    fetchState();
  }, [fetchState]);

  const handleResetState = useCallback(async () => {
    resetClientSimState();
    fetchState();
    setWinRateStats(get5050Stats());
  }, [fetchState]);

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
              soundEngine.startBGM();
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
                  Switch to landscape mode for full experience
                </h2>
                <p>Click Anywhere to Continue</p>
              </div>

              <div className="pt-4">
                <span className="inline-block px-8 py-3 rounded-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-black font-black uppercase tracking-widest text-xs sm:text-sm shadow-[0_0_25px_rgba(250,204,21,0.6)] animate-pulse">
                  This project is still in beta so expect some bugs, and delays along the way
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 0B. SWITCHING BANNER TRANSITION OVERLAY */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isSwitchingBanner && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 text-center select-none pointer-events-auto"
            style={{ backgroundColor: "#000000" }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.02, opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col items-center space-y-5 max-w-md"
            >
              {/* Animated Resonance Reticle */}
              <div className="relative flex items-center justify-center w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-yellow-400/15 animate-ping pointer-events-none" />
                <div className="relative p-4 rounded-2xl bg-[#10141d] border border-yellow-400/40 text-yellow-400 shadow-[0_0_35px_rgba(250,204,21,0.25)] flex items-center justify-center">
                  <Sparkles className="w-9 h-9 animate-spin [animation-duration:3s]" />
                </div>
              </div>

              {/* Title & Subtext */}
              <div className="space-y-1.5">
                <span className="text-xs sm:text-sm font-mono tracking-widest text-yellow-400 font-bold drop-shadow-[0_0_10px_rgba(250,204,21,0.3)]">
                  {switchingBannerTitle || "Featured Convene"}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white drop-shadow-[0_2px_15px_rgba(255,255,255,0.2)]">
                  Switching Banner
                </h2>
                {switchingCharName && (
                  <p className="text-xs sm:text-sm font-mono tracking-wider text-yellow-400 font-bold uppercase">
                    {switchingCharName}
                  </p>
                )}
              </div>

              {/* Sleek Animated Tech Progress Beam */}
              <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden relative shadow-inner">
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ repeat: Infinity, duration: 0.75, ease: "easeInOut" }}
                  className="w-1/2 h-full bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 rounded-full shadow-[0_0_12px_rgba(250,204,21,0.8)]"
                />
              </div>
            </motion.div>
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
      <header className="relative z-20 flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 border-b border-white/10 bg-black/40 backdrop-blur-md">
        {/* Top Left: Title "you a gacha addict" (ESC removed) */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <h1 className="font-black tracking-wider text-sm sm:text-base md:text-lg uppercase text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
            you a gacha addict
          </h1>

          {userState?.isSandbox && (
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-mono text-[10px] sm:text-[11px] font-bold uppercase">
              Sandbox Mode
            </span>
          )}
        </div>

        {/* Top Right: 50/50 Win Rate Badge, Clean Astrite Counter & Settings */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* 50/50 Win Rate Badge (wuwatracker.com style) */}
          <button
            onClick={() => {
              soundEngine.playClick();
              setIsHistoryOpen(true);
            }}
            className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-yellow-400/40 rounded-lg backdrop-blur-sm shadow-inner transition-all group"
            title="View 50/50 History & Convenes"
          >
            <span className="text-[10px] sm:text-xs font-mono uppercase text-gray-400 group-hover:text-gray-300 font-bold">
              50/50:
            </span>
            <span
              suppressHydrationWarning
              className={`font-mono text-xs sm:text-sm font-bold ${
                mounted && winRateStats.winRate !== null
                  ? winRateStats.winRate >= 50
                    ? "text-emerald-400"
                    : "text-amber-400"
                  : "text-gray-400"
              }`}
            >
              {mounted ? winRateStats.winRateFormatted : "N/A"}
            </span>
            {mounted && winRateStats.total5050 > 0 && (
              <span className="text-[10px] font-mono text-gray-400 hidden sm:inline" suppressHydrationWarning>
                ({winRateStats.wins5050}/{winRateStats.total5050})
              </span>
            )}
          </button>

          {/* Astrite Counter */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm shadow-inner">
            <AstriteIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="font-mono text-xs md:text-sm font-bold text-gray-100" suppressHydrationWarning>
              {mounted && userState?.astrite !== undefined ? userState.astrite.toLocaleString() : "0"}
            </span>
            <button
              onClick={() => {
                setIsReplenishOpen(true);
              }}
              className="p-0.5 rounded hover:bg-yellow-400/20 text-yellow-400 transition-colors"
              title="Replenish Astrite"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Settings Trigger */}
          <button
            onClick={() => {
              soundEngine.playClick();
              setIsDevOpen(true);
            }}
            className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all"
            title="Settings"
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
                <CharacterRailItem
                  key={charId}
                  charId={charId}
                  name={char.name}
                  portraitUrl={
                    char.portraitUrl ||
                    char.stillUrl ||
                    char.drawUrl ||
                    "/assets/characters/changli_portrait.png"
                  }
                  title={preset.title}
                  isSelected={isSelected}
                  isUnavailable={preset.isUnavailable}
                  isComingSoon={preset.isComingSoon}
                  onSelect={handleSelectCharacter}
                />
              );
            })}
          </div>
        </aside>

        {/* Center Stage: Framed Banner Presentation (Matches reference mockup box) */}
        <section className="relative flex-1 m-2 sm:m-3 md:m-3.5 rounded-2xl border border-white/10 bg-[#07090e] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col justify-between p-6 md:p-8">
          {/* Banner Meta Info (Top Left of Stage) */}
          <div className="relative z-20 max-w-xl space-y-3 pointer-events-auto">
            <AnimatePresence initial={false}>
              <motion.div
                key={`${bannerMode}-${selectedCharId}`}
                initial={{ opacity: 0.3 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
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
            <AnimatePresence initial={false}>
              <motion.div
                key={`art-${bannerMode}-${selectedCharId}`}
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
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
                    decoding="async"
                    className={`splash-art-img h-full w-full select-none pointer-events-none ${
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
                    decoding="async"
                    className="splash-art-img h-full w-full object-contain object-right pr-4 md:pr-12 opacity-90 drop-shadow-[0_20px_45px_rgba(0,0,0,0.95)] select-none pointer-events-none"
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
      <footer className="relative z-20 flex flex-col sm:flex-row items-center justify-between px-3 sm:px-8 py-2.5 sm:py-4 border-t border-white/10 bg-black/60 backdrop-blur-md gap-3 sm:gap-4">
        {/* Left: schmuckey, Details & History Buttons */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <a
            href="https://portfolio-ni-schmuckey.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-white/5 hover:bg-white/15 border border-white/15 text-xs font-display font-bold tracking-wider text-gray-300 hover:text-white transition-all hover:scale-105"
          >
            <Globe className="w-4 h-4 text-yellow-400" />
            <span>schmuckey</span>
          </a>

          <button
            onClick={() => setIsDetailsOpen(true)}
            className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-white/5 hover:bg-white/15 border border-white/15 text-xs font-display font-bold uppercase tracking-wider text-gray-300 hover:text-white transition-all hover:scale-105"
          >
            <HelpCircle className="w-4 h-4 text-yellow-400" />
            <span>Notice</span>
          </button>

          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded bg-white/5 hover:bg-white/15 border border-white/15 text-xs font-display font-bold uppercase tracking-wider text-gray-300 hover:text-white transition-all hover:scale-105"
          >
            <HistoryIcon className="w-4 h-4 text-yellow-400" />
            <span>History</span>
          </button>
        </div>

        {/* Right: Exact Dual Pill-shaped Convene Buttons with Astrite */}
        <div className="flex items-center space-x-2.5 sm:space-x-4">
          {/* Convene 1 */}
          <button
            disabled={isPulling}
            onClick={() => handlePull(1)}
            className="group relative flex flex-col items-center justify-center px-4 sm:px-7 py-2 sm:py-2.5 rounded-full bg-[#171d2b] hover:bg-[#202738] border border-white/25 hover:border-yellow-400/60 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none min-w-[125px] sm:min-w-[150px] shadow-md"
          >
            <span className="font-display text-[11px] sm:text-xs font-black uppercase tracking-widest text-white group-hover:text-yellow-400 transition-colors">
              {currentPreset?.isUnavailable ? "Unavailable" : currentPreset?.isComingSoon ? "Coming Soon" : "Convene 1"}
            </span>
            <div className="flex items-center space-x-1 sm:space-x-1.5 mt-0.5">
              <AstriteIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="font-mono text-[11px] sm:text-xs font-bold text-gray-200">160</span>
            </div>
          </button>

          {/* Convene 10 */}
          <button
            disabled={isPulling}
            onClick={() => handlePull(10)}
            className="group relative flex flex-col items-center justify-center px-5 sm:px-9 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:via-amber-300 hover:to-yellow-400 text-black border border-yellow-300 font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_22px_rgba(250,204,21,0.55)] disabled:opacity-50 disabled:pointer-events-none min-w-[145px] sm:min-w-[175px]"
          >
            <span className="font-display text-[11px] sm:text-xs font-black uppercase tracking-widest text-black">
              {currentPreset?.isUnavailable ? "Unavailable" : currentPreset?.isComingSoon ? "Coming Soon" : "Convene 10"}
            </span>
            <div className="flex items-center space-x-1 sm:space-x-1.5 mt-0.5">
              <AstriteIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="font-mono text-[11px] sm:text-xs font-black text-black">1,600</span>
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
      />

      <DetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />

      <DevSettingsModal
        isOpen={isDevOpen}
        onClose={() => setIsDevOpen(false)}
        isSandbox={Boolean(userState?.isSandbox)}
        onToggleSandbox={handleToggleSandbox}
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
