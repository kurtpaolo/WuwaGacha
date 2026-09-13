"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { soundEngine } from "@/lib/audio/soundEngine";
import { ItemRarity, ItemData } from "@/lib/data/items";
import { RollResultItem } from "@/lib/gacha/engine";
import {
  ElementBadge,
  RarityStars,
  AstriteIcon,
  RadiantTideIcon,
  ForgingTideIcon,
  LustrousTideIcon,
  AfterglowCoralIcon,
  OscillatedCoralIcon,
} from "@/components/ui/GameIcons";
import { FastForward, RotateCcw, Check, Sparkles, Volume2, VolumeX } from "lucide-react";

interface ConveneVideoPlayerProps {
  results: RollResultItem[];
  highestRarity: ItemRarity;
  goldIndices: number[];
  purpleIndices: number[];
  bannerType: string;
  onFinish: () => void;
  onConveneAgain?: (count: 1 | 10) => void;
}

type Phase = "video" | "reveal_step" | "cutscene_5star" | "cutscene_4star" | "summary";

export const ConveneVideoPlayer: React.FC<ConveneVideoPlayerProps> = ({
  results,
  highestRarity,
  goldIndices,
  purpleIndices,
  bannerType,
  onFinish,
  onConveneAgain,
}) => {
  const [phase, setPhase] = useState<Phase>("video");
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(soundEngine.getIsMuted());

  // 5-Star Character Cutscene state
  const [availableCutscenes, setAvailableCutscenes] = useState<Record<string, string>>({});
  const [cutsceneUrl, setCutsceneUrl] = useState<string | null>(null);
  const [playedCutsceneIndices, setPlayedCutsceneIndices] = useState<Set<number>>(new Set());

  const currentIndexRef = useRef<number>(0);
  const isSkippingRef = useRef<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cutsceneVideoRef = useRef<HTMLVideoElement | null>(null);

  // Fetch available cutscenes on mount
  useEffect(() => {
    fetch("/api/cutscenes")
      .then((r) => r.json())
      .then((d) => {
        if (d.available) {
          setAvailableCutscenes(d.available);
        }
      })
      .catch((e) => console.error("Error loading cutscenes index:", e));
  }, []);

  // Determine initial meteor cutscene video
  const videoSrc =
    highestRarity === 5
      ? "/api/video?path=assets/videos/gacha_gold_5star.mp4"
      : "/api/video?path=assets/videos/gacha_purple_4star.webm";

  const isBlueRarity = highestRarity === 3;

  // Cat weapon detection helpers
  const isCat3 = (res: RollResultItem) => res.rarity === 3;
  const isCat4Weapon = (res: RollResultItem) => res.rarity === 4 && res.item.type === "weapon";

  const getItemName = (res: RollResultItem) => {
    if (isCat3(res)) return "Hapi Cat";
    if (isCat4Weapon(res)) return "Sleepy Cat";
    return res.item.name;
  };

  const getItemIllustration = (res: RollResultItem) => {
    if (isCat3(res)) return "/assets/3starcat.png";
    if (isCat4Weapon(res)) return "/assets/4starcat.png";
    return (
      res.item.splashUrl ||
      res.item.stillUrl ||
      res.item.portraitUrl ||
      res.item.drawUrl ||
      "/assets/characters/changli_splash.png"
    );
  };

  const getItemThumbnail = (res: RollResultItem) => {
    if (isCat3(res)) return "/assets/3starcat.png";
    if (isCat4Weapon(res)) return "/assets/4starcat.png";
    return (
      res.item.portraitUrl ||
      res.item.stillUrl ||
      res.item.drawUrl ||
      "/assets/characters/changli_portrait.png"
    );
  };

  // Helper to query cutscene for a character (5-star or 4-star resonator)
  const getCutsceneUrlForItem = useCallback(
    (res: RollResultItem): string | null => {
      if (res.item.type !== "resonator") return null;
      const charId = res.item.id;
      if (!charId) return null;

      const normalized = charId.toLowerCase().replace(/[\s_-]+/g, "");
      const exact = charId.toLowerCase();

      if (availableCutscenes[normalized]) return availableCutscenes[normalized];
      if (availableCutscenes[exact]) return availableCutscenes[exact];

      return null;
    },
    [availableCutscenes]
  );

  // Trigger audio stinger chord for card reveal
  const playItemSound = useCallback((item: RollResultItem) => {
    soundEngine.playCardReveal(item.rarity);
  }, []);

  // Reveal handler: plays cutscene if available for 5-star, otherwise shows card
  const startRevealForIndex = useCallback(
    (targetIdx: number) => {
      if (targetIdx >= results.length) {
        setPhase("summary");
        return;
      }

      currentIndexRef.current = targetIdx;
      setCurrentIndex(targetIdx);

      const item = results[targetIdx];
      const cutscene = getCutsceneUrlForItem(item);

      if (cutscene && !playedCutsceneIndices.has(targetIdx)) {
        setCutsceneUrl(cutscene);
        setPlayedCutsceneIndices((prev) => new Set(prev).add(targetIdx));
        if (item.rarity === 5) {
          // Unskippable 5-Star Character Cutscene
          setPhase("cutscene_5star");
        } else {
          // Skippable 4-Star Character Cutscene
          setPhase("cutscene_4star");
        }
      } else {
        // Regular card reveal (3★ weapons, 4★ weapons/resonators, or fallback)
        setPhase("reveal_step");
        playItemSound(item);
      }
    },
    [results, getCutsceneUrlForItem, playedCutsceneIndices, playItemSound]
  );

  // When character cutscene ends or is skipped:
  // USER REQUIREMENT: No splashcard after the cutscene!
  // Immediately move to the next weapon / character pulled.
  // If it's another character with a cutscene, it will play their cutscene.
  // If at the end of the pulls, move directly to summary!
  const handleCutsceneEnded = useCallback(() => {
    setCutsceneUrl(null);
    const currIdx = currentIndexRef.current;

    if (isSkippingRef.current) {
      // When fast-skipping, only unskippable 5-STAR cutscenes intercept
      let nextFiveStarIdx = -1;
      for (let i = currIdx + 1; i < results.length; i++) {
        if (
          !playedCutsceneIndices.has(i) &&
          results[i].rarity === 5 &&
          getCutsceneUrlForItem(results[i])
        ) {
          nextFiveStarIdx = i;
          break;
        }
      }

      if (nextFiveStarIdx !== -1) {
        startRevealForIndex(nextFiveStarIdx);
      } else {
        isSkippingRef.current = false;
        setPhase("summary");
      }
      return;
    }

    const nextIdx = currIdx + 1;
    if (nextIdx < results.length) {
      startRevealForIndex(nextIdx);
    } else {
      setPhase("summary");
    }
  }, [results, playedCutsceneIndices, getCutsceneUrlForItem, startRevealForIndex]);

  // Skip the current 4-star cutscene to the next pull
  const handleSkip4StarCutscene = useCallback(() => {
    handleCutsceneEnded();
  }, [handleCutsceneEnded]);

  // Skip straight to summary (stopping ONLY if an unplayed 5-star cutscene is ahead)
  const handleSkipToSummary = useCallback(() => {
    setCutsceneUrl(null);
    isSkippingRef.current = true;
    const currIdx = currentIndexRef.current;
    let nextFiveStarIdx = -1;
    for (let i = currIdx + 1; i < results.length; i++) {
      if (
        !playedCutsceneIndices.has(i) &&
        results[i].rarity === 5 &&
        getCutsceneUrlForItem(results[i])
      ) {
        nextFiveStarIdx = i;
        break;
      }
    }

    if (nextFiveStarIdx !== -1) {
      startRevealForIndex(nextFiveStarIdx);
    } else {
      isSkippingRef.current = false;
      setPhase("summary");
    }
  }, [results, playedCutsceneIndices, getCutsceneUrlForItem, startRevealForIndex]);

  // Initial meteor video ended
  const handleInitialVideoEnded = () => {
    startRevealForIndex(0);
  };

  // Skip logic
  const handleSkip = useCallback(() => {
    if (phase === "video") {
      startRevealForIndex(0);
      return;
    }

    if (phase === "cutscene_5star") {
      // 5-Star Character Cutscene is strictly unskippable per user requirement
      return;
    }

    if (phase === "cutscene_4star") {
      // Skippable 4-star cutscene: skip to summary (or next 5-star if present)
      handleSkipToSummary();
      return;
    }

    if (phase === "reveal_step") {
      handleSkipToSummary();
      return;
    }
  }, [
    phase,
    startRevealForIndex,
    handleSkipToSummary,
  ]);

  // Step-through advance
  const handleAdvance = useCallback(() => {
    if (phase === "video") {
      startRevealForIndex(0);
      return;
    }

    if (phase === "cutscene_5star") {
      // Unskippable! Screen click/space does not skip 5-star cutscene
      return;
    }

    if (phase === "cutscene_4star") {
      // Screen click / space advances past 4-star cutscene to next item!
      handleSkip4StarCutscene();
      return;
    }

    if (phase === "reveal_step") {
      isSkippingRef.current = false;
      const nextIdx = currentIndexRef.current + 1;
      if (nextIdx < results.length) {
        startRevealForIndex(nextIdx);
      } else {
        setPhase("summary");
      }
    }
  }, [phase, results.length, startRevealForIndex, handleSkip4StarCutscene]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase === "cutscene_5star") {
        // Completely ignore keyboard during 5-star cutscene (strictly unskippable)
        return;
      }

      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        handleAdvance();
      } else if (e.code === "Escape") {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, handleAdvance, handleSkip]);

  const currentResult = results[currentIndex] || results[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black select-none overflow-hidden"
      onClick={handleAdvance}
    >
      {/* ========================================================================= */}
      {/* 1. INITIAL METEOR CUTSCENE (GOLD / PURPLE / BLUE) */}
      {/* ========================================================================= */}
      {phase === "video" && (
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            playsInline
            muted={isMuted}
            onEnded={handleInitialVideoEnded}
            onError={handleInitialVideoEnded}
            className={`w-full h-full object-cover transition-all duration-300 ${
              isBlueRarity ? "hue-rotate-[65deg] saturate-150 brightness-110" : ""
            }`}
          />

          {/* Top-Right In-Game Skip Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSkip();
            }}
            className="absolute top-6 right-8 z-50 flex items-center space-x-2 px-4 py-2 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-xs font-display font-black tracking-widest text-white uppercase backdrop-blur-md transition-all hover:scale-105 shadow-[0_0_15px_rgba(0,0,0,0.8)]"
          >
            <span>Skip</span>
            <FastForward className="w-4 h-4 text-yellow-400" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2A. UNSKIPPABLE 5-STAR CHARACTER INTRO CUTSCENE */}
      {/* ========================================================================= */}
      {phase === "cutscene_5star" && cutsceneUrl && (
        <div
          className="relative w-full h-full flex items-center justify-center bg-black"
          onClick={(e) => e.stopPropagation()}
        >
          <video
            key={cutsceneUrl}
            ref={cutsceneVideoRef}
            src={cutsceneUrl}
            autoPlay
            playsInline
            muted={isMuted}
            onEnded={handleCutsceneEnded}
            onError={handleCutsceneEnded}
            className="w-full h-full object-cover"
          />
          {/* Note: Skip button is explicitly HIDDEN during 5-star cutscene */}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2B. SKIPPABLE 4-STAR CHARACTER INTRO CUTSCENE */}
      {/* ========================================================================= */}
      {phase === "cutscene_4star" && cutsceneUrl && (
        <div
          className="relative w-full h-full flex items-center justify-center bg-black cursor-pointer"
          onClick={handleSkip4StarCutscene}
        >
          <video
            key={cutsceneUrl}
            ref={cutsceneVideoRef}
            src={cutsceneUrl}
            autoPlay
            playsInline
            muted={isMuted}
            onEnded={handleCutsceneEnded}
            onError={handleCutsceneEnded}
            className="w-full h-full object-cover"
          />

          {/* Top HUD for 4-Star: Item Counter & Skip Buttons */}
          <div className="absolute top-6 left-8 right-8 z-50 flex items-center justify-between pointer-events-auto">
            <div className="px-3.5 py-1.5 rounded-full bg-black/60 border border-white/10 text-xs font-mono text-gray-300 backdrop-blur-md">
              <span className="text-purple-400 font-bold">{currentIndex + 1}</span> / {results.length}
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkip4StarCutscene();
                }}
                className="flex items-center space-x-2 px-4 py-2 rounded-full bg-black/60 hover:bg-black/80 border border-purple-500/30 text-xs font-display font-black tracking-widest text-white uppercase backdrop-blur-md transition-all hover:scale-105 shadow-[0_0_15px_rgba(0,0,0,0.8)]"
              >
                <span>Skip</span>
                <FastForward className="w-4 h-4 text-purple-300" />
              </button>

              {results.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSkipToSummary();
                  }}
                  className="flex items-center space-x-2 px-4 py-2 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-xs font-display font-black tracking-widest text-white uppercase backdrop-blur-md transition-all hover:scale-105 shadow-[0_0_15px_rgba(0,0,0,0.8)]"
                >
                  <span>Skip to Summary</span>
                  <FastForward className="w-4 h-4 text-yellow-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CARD DROP REVEAL SEQUENCE (STEP-THROUGH) */}
      {/* ========================================================================= */}
      {phase === "reveal_step" && currentResult && (
        <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-[#06080e]">
          {/* Background Aura Burst */}
          <div
            className="absolute inset-0 pointer-events-none transition-all duration-700"
            style={{
              background:
                currentResult.rarity === 5
                  ? "radial-gradient(ellipse at center, rgba(250, 204, 21, 0.28) 0%, rgba(245, 158, 11, 0.12) 45%, #05070d 80%)"
                  : currentResult.rarity === 4
                  ? "radial-gradient(ellipse at center, rgba(168, 85, 247, 0.25) 0%, rgba(126, 34, 206, 0.1) 45%, #05070d 80%)"
                  : "radial-gradient(ellipse at center, rgba(56, 189, 248, 0.18) 0%, rgba(14, 165, 233, 0.08) 45%, #05070d 80%)",
            }}
          />

          {/* Top HUD: Item Counter & Skip to Summary Button */}
          <div className="absolute top-6 left-8 right-8 z-40 flex items-center justify-between pointer-events-auto">
            <div className="px-3.5 py-1.5 rounded-full bg-black/50 border border-white/10 text-xs font-mono text-gray-300 backdrop-blur-md">
              <span className="text-yellow-400 font-bold">{currentIndex + 1}</span> / {results.length}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSkip();
              }}
              className="flex items-center space-x-2 px-4 py-2 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-xs font-display font-black tracking-widest text-white uppercase backdrop-blur-md transition-all hover:scale-105 shadow-[0_0_15px_rgba(0,0,0,0.8)]"
            >
              <span>Skip to Summary</span>
              <FastForward className="w-4 h-4 text-yellow-400" />
            </button>
          </div>

          {/* Center Card Presentation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`card-${currentIndex}`}
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1, y: -20 }}
              transition={{ duration: 0.38, ease: "easeOut" }}
              className="relative z-30 flex flex-col items-center justify-center max-w-4xl w-full text-center"
            >
              {/* Item Illustration Canvas */}
              <div className="relative w-72 h-96 sm:w-96 sm:h-[480px] flex items-center justify-center">
                {/* Rarity Ring / Glow Backdrop */}
                <div
                  className={`absolute inset-4 rounded-3xl blur-2xl opacity-70 animate-pulse pointer-events-none ${
                    currentResult.rarity === 5
                      ? "bg-yellow-500/40"
                      : currentResult.rarity === 4
                      ? "bg-purple-500/40"
                      : "bg-sky-500/25"
                  }`}
                />

                {/* Main Art */}
                <img
                  src={getItemIllustration(currentResult)}
                  alt={getItemName(currentResult)}
                  className="max-w-full max-h-full object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.95)] z-10"
                />

                {/* 5-Star Sparkle Burst */}
                {currentResult.rarity === 5 && (
                  <motion.div
                    initial={{ rotate: 0, scale: 0 }}
                    animate={{ rotate: 180, scale: 1.3 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="absolute inset-0 border-2 border-yellow-400/40 rounded-full pointer-events-none"
                  />
                )}
              </div>

              {/* Character / Weapon Details Banner */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                className="mt-6 flex flex-col items-center space-y-2.5 z-20"
              >
                {/* Element & Weapon Badges */}
                <div className="flex items-center space-x-2.5">
                  {!isCat3(currentResult) &&
                    !isCat4Weapon(currentResult) &&
                    currentResult.item.element && (
                      <ElementBadge element={currentResult.item.element} size={28} />
                    )}
                  <span
                    className={`font-mono text-xs uppercase px-2.5 py-0.5 rounded border font-bold ${
                      currentResult.rarity === 5
                        ? "bg-yellow-400/15 border-yellow-400/40 text-yellow-300"
                        : currentResult.rarity === 4
                        ? "bg-purple-400/15 border-purple-400/40 text-purple-300"
                        : "bg-sky-400/15 border-sky-400/40 text-sky-300"
                    }`}
                  >
                    {isCat3(currentResult) || isCat4Weapon(currentResult)
                      ? "CUTE"
                      : currentResult.item.type === "resonator"
                      ? "Resonator"
                      : `Weapon • ${currentResult.item.weaponType}`}
                  </span>

                  {currentResult.isNew && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-mono text-[11px] font-black uppercase">
                      NEW!
                    </span>
                  )}
                </div>

                {/* Name */}
                <h3 className="text-3xl sm:text-5xl font-black uppercase tracking-wider text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
                  {getItemName(currentResult)}
                </h3>

                {/* Rarity Stars */}
                <RarityStars rarity={currentResult.rarity} size={24} />

                {/* 5-Star Character Quote Voice Line Inscription */}
                {currentResult.rarity === 5 && currentResult.item.quote && (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.28, duration: 0.4 }}
                    className="max-w-xl text-xs sm:text-sm font-serif italic text-amber-200/90 drop-shadow-md px-4 mt-1"
                  >
                    "{currentResult.item.quote}"
                  </motion.p>
                )}
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* Bottom Tap to Continue Hint */}
          <div className="absolute bottom-6 z-40 text-[11px] font-mono tracking-widest text-gray-400 uppercase animate-pulse">
            Click anywhere or press Space to continue
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ICONIC 10-ITEM SUMMARY GRID */}
      {/* ========================================================================= */}
      {phase === "summary" && (
        <div
          className="relative w-full h-full flex flex-col justify-between p-6 md:p-10 bg-[#07090e]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Title */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-2.5 h-6 bg-yellow-400 rounded-xs shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-widest text-white font-display">
                Convene Summary
              </h2>
            </div>

            <div className="flex items-center space-x-4 text-xs font-mono text-gray-400">
              <span>
                Total Pulled: <strong className="text-white">{results.length}</strong>
              </span>
              {goldIndices.length > 0 && (
                <span className="text-yellow-400 font-bold">5★: {goldIndices.length}</span>
              )}
              {purpleIndices.length > 0 && (
                <span className="text-purple-300 font-bold">4★: {purpleIndices.length}</span>
              )}
            </div>
          </div>

          {/* 10-Item Grid Showcase */}
          <div className="flex-1 flex items-center justify-center my-4 overflow-y-auto">
            <div
              className={`grid gap-3 sm:gap-4 w-full max-w-6xl justify-center items-center ${
                results.length === 1
                  ? "grid-cols-1 max-w-xs"
                  : results.length <= 5
                  ? "grid-cols-2 sm:grid-cols-5"
                  : "grid-cols-2 sm:grid-cols-5"
              }`}
            >
              {results.map((res, idx) => {
                const isGold = res.rarity === 5;
                const isPurple = res.rarity === 4;

                return (
                  <motion.div
                    key={`summary-item-${idx}`}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: idx * 0.04, duration: 0.25 }}
                    className={`group relative flex flex-col items-center rounded-xl p-2.5 border transition-all duration-200 hover:scale-105 ${
                      isGold
                        ? "bg-gradient-to-b from-yellow-500/25 via-yellow-950/20 to-black/80 border-yellow-400/80 shadow-[0_0_20px_rgba(250,204,21,0.35)]"
                        : isPurple
                        ? "bg-gradient-to-b from-purple-500/25 via-purple-950/20 to-black/80 border-purple-400/70 shadow-[0_0_15px_rgba(168,85,247,0.25)]"
                        : "bg-gradient-to-b from-sky-500/15 via-[#0b1329]/40 to-black/80 border-sky-400/40"
                    }`}
                  >
                    {/* Top Badges */}
                    <div className="w-full flex items-center justify-between mb-1 z-10">
                      {!isCat3(res) && !isCat4Weapon(res) && res.item.element ? (
                        <ElementBadge element={res.item.element} size={20} />
                      ) : (
                        <div className="w-5 h-5" />
                      )}

                      {res.isNew && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 text-[9px] font-mono font-black uppercase border border-emerald-400/40">
                          NEW
                        </span>
                      )}
                    </div>

                    {/* Thumbnail Art */}
                    <div className="relative w-20 h-24 sm:w-24 sm:h-28 flex items-center justify-center overflow-hidden my-1">
                      <img
                        src={getItemThumbnail(res)}
                        alt={getItemName(res)}
                        className="max-w-full max-h-full object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>

                    {/* Rarity Stars */}
                    <RarityStars rarity={res.rarity} size={14} className="my-1" />

                    {/* Item Name */}
                    <span
                      className={`text-xs font-bold font-sans tracking-wide truncate w-full text-center ${
                        isGold ? "text-yellow-300" : isPurple ? "text-purple-200" : "text-gray-200"
                      }`}
                    >
                      {getItemName(res)}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-white/10 gap-3">
            <button
              onClick={onFinish}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-sm bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-display font-bold uppercase tracking-wider text-white transition-all hover:scale-105"
            >
              <Check className="w-4 h-4 text-yellow-400" />
              <span>Confirm & Return</span>
            </button>

            {onConveneAgain && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => onConveneAgain(1)}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-sm bg-[#1a2130] hover:bg-[#252f45] border border-white/20 text-xs font-display font-black uppercase tracking-wider text-white transition-all hover:scale-105"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Convene 1 Again</span>
                </button>

                <button
                  onClick={() => onConveneAgain(10)}
                  className="flex items-center space-x-2 px-7 py-2.5 rounded-sm bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-black border border-yellow-300 text-xs font-display font-black uppercase tracking-wider transition-all hover:scale-105 shadow-[0_0_15px_rgba(250,204,21,0.5)]"
                >
                  <Sparkles className="w-4 h-4 text-black" />
                  <span>Convene 10 Again</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
