"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { soundEngine } from "@/lib/audio/soundEngine";
import { ItemRarity } from "@/lib/data/items";
import { RollResultItem } from "@/lib/gacha/clientSim";
import { FastForward, Shield, Check, AlertTriangle } from "lucide-react";
import {
  getPreloadedVideoUrl,
  preloadSingleVideo,
  getCutsceneUrlForResonator,
  getCachedCutscenesManifest,
  fetchCutscenesManifest,
} from "@/lib/video/videoPreloader";
import {
  getSummoningVideoUrl,
  getLocalSummoningVideoFallback,
} from "@/lib/video/cutscenesConfig";
import { getVideoFocalPoint } from "@/lib/data/focalPoints";
import { RarityStars, ElementBadge, AstriteIcon } from "@/components/ui/GameIcons";

interface ConveneVideoPlayerProps {
  results: RollResultItem[];
  highestRarity: ItemRarity;
  goldIndices: number[];
  purpleIndices: number[];
  bannerType?: string;
  onFinish: () => void;
}

type Phase = "video" | "reveal_step" | "cutscene_5star" | "cutscene_4star" | "summary";

export const ConveneVideoPlayer: React.FC<ConveneVideoPlayerProps> = ({
  results,
  highestRarity,
  goldIndices,
  purpleIndices,
  bannerType = "character_limited",
  onFinish,
}) => {
  const isOnePull = results.length === 1;

  // Initialize availableCutscenes from preloader cache if available
  const [availableCutscenes, setAvailableCutscenes] = useState<Record<string, string>>(
    () => getCachedCutscenesManifest()
  );

  // Helper to query cutscene for a character (5-star or 4-star resonator)
  const getCutsceneUrlForItem = useCallback(
    (res: RollResultItem): string | null => {
      if (res.item.type !== "resonator" || !res.item.id) return null;
      return getCutsceneUrlForResonator(res.item.id, availableCutscenes);
    },
    [availableCutscenes]
  );

  // User Convene Experience Settings
  const [conveneSettings, setConveneSettings] = useState(() => {
    if (typeof window === "undefined") {
      return { skipMeteor: false, skip3Star: false, skip4Star: false };
    }
    const skipMeteor = localStorage.getItem("wuwa_skip_meteor") === "true";
    const storedSkip3 = localStorage.getItem("wuwa_skip_3star");
    const storedSkip4 = localStorage.getItem("wuwa_skip_4star");
    const legacyFast = localStorage.getItem("wuwa_fast_convene") === "true";

    return {
      skipMeteor,
      skip3Star: storedSkip3 !== null ? storedSkip3 === "true" : legacyFast,
      skip4Star: storedSkip4 !== null ? storedSkip4 === "true" : legacyFast,
    };
  });

  // Listen for settings change
  useEffect(() => {
    const handleSettingsChange = () => {
      const skipMeteor = localStorage.getItem("wuwa_skip_meteor") === "true";
      const storedSkip3 = localStorage.getItem("wuwa_skip_3star");
      const storedSkip4 = localStorage.getItem("wuwa_skip_4star");
      const legacyFast = localStorage.getItem("wuwa_fast_convene") === "true";
      setConveneSettings({
        skipMeteor,
        skip3Star: storedSkip3 !== null ? storedSkip3 === "true" : legacyFast,
        skip4Star: storedSkip4 !== null ? storedSkip4 === "true" : legacyFast,
      });
    };
    window.addEventListener("wuwa_convene_settings_changed", handleSettingsChange);
    return () => window.removeEventListener("wuwa_convene_settings_changed", handleSettingsChange);
  }, []);

  // Helper to find the next item index that is NOT skipped by user settings
  // Note: 5-stars are NEVER skippable under any setting!
  const getNextRevealIndex = useCallback(
    (fromIdx: number): number => {
      for (let i = fromIdx; i < results.length; i++) {
        const item = results[i];
        if (item.rarity === 5) return i; // 5-star is NEVER skippable
        if (item.rarity === 3 && conveneSettings.skip3Star) continue;
        if (item.rarity === 4 && conveneSettings.skip4Star) continue;
        return i;
      }
      return -1;
    },
    [results, conveneSettings.skip3Star, conveneSettings.skip4Star]
  );

  // Initial phase determination:
  const [initialSetup] = useState(() => {
    const skipMeteor =
      typeof window !== "undefined" &&
      localStorage.getItem("wuwa_skip_meteor") === "true";
    const storedSkip3 = typeof window !== "undefined" ? localStorage.getItem("wuwa_skip_3star") : null;
    const storedSkip4 = typeof window !== "undefined" ? localStorage.getItem("wuwa_skip_4star") : null;
    const legacyFast = typeof window !== "undefined" && localStorage.getItem("wuwa_fast_convene") === "true";
    const skip3 = storedSkip3 !== null ? storedSkip3 === "true" : legacyFast;
    const skip4 = storedSkip4 !== null ? storedSkip4 === "true" : legacyFast;

    if (isOnePull) {
      const single = results[0];
      if (!single || single.rarity === 3) {
        return { phase: "summary" as Phase, cutscene: null as string | null, initialIndex: 0 };
      }
      if (single.rarity === 4 && skip4) {
        return { phase: "summary" as Phase, cutscene: null as string | null, initialIndex: 0 };
      }
      if (single.item.type === "resonator") {
        const cutscene = getCutsceneUrlForResonator(single.item.id, getCachedCutscenesManifest());
        if (cutscene) {
          return {
            phase: (single.rarity === 5 ? "cutscene_5star" : "cutscene_4star") as Phase,
            cutscene,
            initialIndex: 0,
          };
        }
      }
      return { phase: "reveal_step" as Phase, cutscene: null as string | null, initialIndex: 0 };
    }

    // 10-pull: if skipMeteor is enabled, bypass initial meteor video immediately
    if (skipMeteor) {
      let firstIdx = -1;
      for (let i = 0; i < results.length; i++) {
        const r = results[i].rarity;
        if (r === 5) {
          firstIdx = i;
          break;
        }
        if (r === 3 && skip3) continue;
        if (r === 4 && skip4) continue;
        firstIdx = i;
        break;
      }

      if (firstIdx === -1) {
        return { phase: "summary" as Phase, cutscene: null as string | null, initialIndex: 0 };
      }

      const item = results[firstIdx];
      if (item.item.type === "resonator") {
        const cutscene = getCutsceneUrlForResonator(item.item.id, getCachedCutscenesManifest());
        if (cutscene) {
          return {
            phase: (item.rarity === 5 ? "cutscene_5star" : "cutscene_4star") as Phase,
            cutscene,
            initialIndex: firstIdx,
          };
        }
      }
      return { phase: "reveal_step" as Phase, cutscene: null as string | null, initialIndex: firstIdx };
    }

    return { phase: "video" as Phase, cutscene: null as string | null, initialIndex: 0 };
  });

  const [phase, setPhase] = useState<Phase>(initialSetup.phase);
  const [currentIndex, setCurrentIndex] = useState<number>(initialSetup.initialIndex);

  // Character Cutscene state
  const [cutsceneUrl, setCutsceneUrl] = useState<string | null>(initialSetup.cutscene);
  const [playedCutsceneIndices, setPlayedCutsceneIndices] = useState<Set<number>>(() => {
    return initialSetup.cutscene ? new Set([initialSetup.initialIndex]) : new Set();
  });

  const currentIndexRef = useRef<number>(initialSetup.initialIndex);
  const isSkippingRef = useRef<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cutsceneVideoRef = useRef<HTMLVideoElement | null>(null);

  // Cutscene Freeze Watchdog: monitors playhead progress (currentTime)
  // If video is supposed to play but currentTime remains unchanged for 10 straight seconds, trigger recovery
  const [isCutsceneFrozen, setIsCutsceneFrozen] = useState<boolean>(false);
  const lastPlayheadTimeRef = useRef<number>(-1);
  const lastPlayheadWallClockRef = useRef<number>(Date.now());

  useEffect(() => {
    if (phase !== "cutscene_5star" && phase !== "cutscene_4star") {
      setIsCutsceneFrozen(false);
      return;
    }

    lastPlayheadTimeRef.current = -1;
    lastPlayheadWallClockRef.current = Date.now();
    setIsCutsceneFrozen(false);

    const interval = setInterval(() => {
      const vid = cutsceneVideoRef.current;
      if (!vid) return;

      const currentT = vid.currentTime;
      if (currentT > 0 && currentT !== lastPlayheadTimeRef.current) {
        // Video is progressing normally! Reset stall clock
        lastPlayheadTimeRef.current = currentT;
        lastPlayheadWallClockRef.current = Date.now();
        setIsCutsceneFrozen(false);
      } else {
        const stalledSeconds = (Date.now() - lastPlayheadWallClockRef.current) / 1000;
        // If stalled for > 3.5s and paused, attempt kickstart play
        if (stalledSeconds >= 3.5 && vid.paused) {
          vid.play().catch(() => {});
        }
        // If frozen for 10 seconds on the exact same frame
        if (stalledSeconds >= 10) {
          setIsCutsceneFrozen(true);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [phase, cutsceneUrl]);

  // Sync background music state with summon phase
  useEffect(() => {
    if (phase === "video" || phase === "cutscene_5star" || phase === "cutscene_4star") {
      soundEngine.pauseBGM();
    } else {
      soundEngine.resumeBGM();
    }
    return () => {
      soundEngine.resumeBGM();
    };
  }, [phase]);

  const [effectiveSummonVol, setEffectiveSummonVol] = useState<number>(() =>
    soundEngine.getEffectiveSummonVolume()
  );

  useEffect(() => {
    return soundEngine.subscribe((settings) => {
      setEffectiveSummonVol(settings.masterVolume * settings.summonVolume);
    });
  }, []);

  useEffect(() => {
    const isZero = effectiveSummonVol <= 0.001;
    if (videoRef.current) {
      videoRef.current.volume = effectiveSummonVol;
      videoRef.current.muted = isZero;
    }
  }, [effectiveSummonVol, phase]);

  useEffect(() => {
    const isZero = effectiveSummonVol <= 0.001;
    if (cutsceneVideoRef.current) {
      cutsceneVideoRef.current.volume = effectiveSummonVol;
      cutsceneVideoRef.current.muted = isZero;
    }
  }, [effectiveSummonVol, cutsceneUrl]);

  // Fetch available cutscenes on mount if not already cached
  useEffect(() => {
    if (Object.keys(availableCutscenes).length === 0) {
      fetchCutscenesManifest().then((manifest) => {
        setAvailableCutscenes(manifest);
      });
    }
  }, [availableCutscenes]);

  // Determine initial meteor cutscene video (R2 endpoint with automatic fallback)
  const [meteorVideoUrl, setMeteorVideoUrl] = useState<string>(() =>
    getSummoningVideoUrl(highestRarity)
  );

  useEffect(() => {
    setMeteorVideoUrl(getSummoningVideoUrl(highestRarity));
  }, [highestRarity]);

  const videoSrc = useMemo(
    () => getPreloadedVideoUrl(meteorVideoUrl),
    [meteorVideoUrl]
  );

  const activeCutsceneSrc = useMemo(
    () => (cutsceneUrl ? getPreloadedVideoUrl(cutsceneUrl) : null),
    [cutsceneUrl]
  );

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
      "/assets/characters/changli_splash_v2.jpeg"
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

  // Preload any upcoming character cutscenes in results so they buffer in background and cache permanently
  const preloadedCutscenesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!results || results.length === 0) return;
    const uniqueUrls = new Set<string>();
    results.forEach((res) => {
      const url = getCutsceneUrlForItem(res);
      if (url && !preloadedCutscenesRef.current.has(url)) {
        uniqueUrls.add(url);
        preloadedCutscenesRef.current.add(url);
      }
    });

    uniqueUrls.forEach((url) => {
      preloadSingleVideo(url);
    });
  }, [results, getCutsceneUrlForItem]);

  // Trigger audio stinger chord for card reveal
  const playItemSound = useCallback((item: RollResultItem) => {
    soundEngine.playCardReveal(item.rarity);
  }, []);

  // For 1-pulls starting directly in card reveal (e.g. 4-star/5-star weapon)
  useEffect(() => {
    if (isOnePull && initialSetup.phase === "reveal_step" && results[0]) {
      playItemSound(results[0]);
    }
  }, [isOnePull, initialSetup.phase, playItemSound, results]);

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

  // When character cutscene ends:
  // USER REQUIREMENT: No splashcard after the cutscene!
  // Immediately move to the next weapon / character pulled.
  // If it's another character with a cutscene, it will play their cutscene.
  // If at the end of the pulls, move directly to summary!
  const handleCutsceneEnded = useCallback(() => {
    setIsCutsceneFrozen(false);
    setCutsceneUrl(null);
    const currIdx = currentIndexRef.current;

    if (isSkippingRef.current) {
      // When fast-skipping, only unskippable 5-STAR cutscenes/items intercept
      let nextFiveStarIdx = -1;
      for (let i = currIdx + 1; i < results.length; i++) {
        if (!playedCutsceneIndices.has(i) && results[i].rarity === 5) {
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

    const nextIdx = getNextRevealIndex(currIdx + 1);
    if (nextIdx !== -1) {
      startRevealForIndex(nextIdx);
    } else {
      setPhase("summary");
    }
  }, [results, playedCutsceneIndices, getNextRevealIndex, startRevealForIndex]);

  // Skip the current 4-star cutscene to the next pull
  const handleSkip4StarCutscene = useCallback(() => {
    handleCutsceneEnded();
  }, [handleCutsceneEnded]);

  // Handle cutscene playback errors (e.g. DNS or CORS issues with external CDN)
  // Automatically falls back to the local video file before advancing
  const handleCutsceneError = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      const mediaErr = (e.target as HTMLVideoElement)?.error;
      console.warn("Cutscene playback failed for:", cutsceneUrl, {
        code: mediaErr?.code,
        message: mediaErr?.message,
      });

      if (
        cutsceneUrl &&
        (cutsceneUrl.startsWith("http://") || cutsceneUrl.startsWith("https://"))
      ) {
        const lastPart = cutsceneUrl.split("/").pop();
        if (lastPart) {
          const localUrl = `/api/video?path=${encodeURIComponent(`cutscenes/${lastPart}`)}`;
          if (cutsceneUrl !== localUrl) {
            console.info("Switching to local cutscene fallback:", localUrl);
            setCutsceneUrl(localUrl);
            return;
          }
        }
      }

      handleCutsceneEnded();
    },
    [cutsceneUrl, handleCutsceneEnded]
  );

  // Skip straight to summary (stopping ONLY if an unplayed 5-star is ahead)
  const handleSkipToSummary = useCallback(() => {
    setCutsceneUrl(null);
    isSkippingRef.current = true;
    const currIdx = currentIndexRef.current;
    let nextFiveStarIdx = -1;
    for (let i = currIdx + 1; i < results.length; i++) {
      if (!playedCutsceneIndices.has(i) && results[i].rarity === 5) {
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
  }, [results, playedCutsceneIndices, startRevealForIndex]);

  // Fast Convene / Meteor advance helper
  const advanceAfterMeteor = useCallback(() => {
    const firstIdx = getNextRevealIndex(0);
    if (firstIdx !== -1) {
      startRevealForIndex(firstIdx);
    } else {
      setPhase("summary");
    }
  }, [getNextRevealIndex, startRevealForIndex]);

  // Initial meteor video ended
  const handleInitialVideoEnded = () => {
    advanceAfterMeteor();
  };

  // Fallback to local meteor video if CDN load fails
  const handleInitialVideoError = useCallback(() => {
    console.warn("Initial meteor animation video failed to load:", meteorVideoUrl);
    if (meteorVideoUrl.startsWith("http://") || meteorVideoUrl.startsWith("https://")) {
      const localFallback = getLocalSummoningVideoFallback(highestRarity);
      if (meteorVideoUrl !== localFallback) {
        console.info("Switching to local meteor video fallback:", localFallback);
        setMeteorVideoUrl(localFallback);
        return;
      }
    }
    advanceAfterMeteor();
  }, [meteorVideoUrl, highestRarity, advanceAfterMeteor]);

  // Skip logic
  const handleSkip = useCallback(() => {
    if (phase === "video") {
      advanceAfterMeteor();
      return;
    }

    if (phase === "cutscene_5star") {
      // 5-Star Character Cutscene is strictly unskippable per user requirement
      return;
    }

    if (phase === "cutscene_4star") {
      // Skippable 4-star cutscene: advance past it to next item or summary
      handleSkip4StarCutscene();
      return;
    }

    if (phase === "reveal_step") {
      const current = results[currentIndexRef.current];
      if (current && current.rarity === 5) {
        // 5-star card cannot be skipped to summary
        return;
      }
      handleSkipToSummary();
      return;
    }

    if (phase === "summary") {
      soundEngine.playClick();
      onFinish();
      return;
    }
  }, [
    phase,
    results,
    advanceAfterMeteor,
    handleSkipToSummary,
    handleSkip4StarCutscene,
    onFinish,
  ]);

  // Step-through advance
  const handleAdvance = useCallback(() => {
    if (phase === "video") {
      advanceAfterMeteor();
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
      const nextIdx = getNextRevealIndex(currentIndexRef.current + 1);
      if (nextIdx !== -1) {
        startRevealForIndex(nextIdx);
      } else {
        setPhase("summary");
      }
      return;
    }

    if (phase === "summary") {
      soundEngine.playClick();
      onFinish();
      return;
    }
  }, [phase, getNextRevealIndex, startRevealForIndex, handleSkip4StarCutscene, advanceAfterMeteor, onFinish]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase === "cutscene_5star") {
        // Completely ignore keyboard during strictly unskippable 5-star cutscene
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
  const cutsceneFocalX = useMemo(() => {
    return getVideoFocalPoint(currentResult?.item?.id, cutsceneUrl || undefined);
  }, [currentResult?.item?.id, cutsceneUrl]);

  // Dynamic focal point timing:
  // For the first 2.25 seconds, the intro waveform is shifted 3% to the left (53% 50%) for perfect framing.
  // Exactly at >= 2.25s when the character reveals, it shifts to the calibrated character focal axis.
  const INTRO_CUTSCENE_FOCAL = "53% 50%";

  useEffect(() => {
    if (phase !== "cutscene_5star" && phase !== "cutscene_4star") return;

    let animId: number;
    const checkTime = () => {
      const vid = cutsceneVideoRef.current;
      if (vid) {
        if (vid.currentTime >= 2.25) {
          vid.style.setProperty("--cutscene-focal", `${cutsceneFocalX}% 50%`);
        } else {
          vid.style.setProperty("--cutscene-focal", INTRO_CUTSCENE_FOCAL);
        }
      }
      animId = requestAnimationFrame(checkTime);
    };

    animId = requestAnimationFrame(checkTime);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [phase, cutsceneFocalX, cutsceneUrl]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black select-none overflow-hidden"
      onClick={handleAdvance}
    >
      {/* ========================================================================= */}
      {/* 1. INITIAL METEOR CUTSCENE (GOLD / PURPLE / BLUE) */}
      {/* ========================================================================= */}
      {phase === "video" && (
        <div
          className="relative w-full h-full flex items-center justify-center bg-black cursor-pointer"
          onClick={handleAdvance}
        >
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            playsInline
            preload="auto"
            muted={effectiveSummonVol === 0}
            onEnded={handleInitialVideoEnded}
            onError={handleInitialVideoError}
            style={{ transform: "translateZ(0)", willChange: "transform", backfaceVisibility: "hidden" }}
            className={`w-full h-full object-cover ${
              isBlueRarity ? "hue-rotate-[65deg] saturate-150 brightness-110" : ""
            }`}
          />

          {/* Top-Right In-Game Skip Button for Meteor */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSkip();
            }}
            className="absolute top-6 right-8 z-50 flex items-center space-x-2 px-4 py-2 rounded-full bg-[#0a0e17]/90 hover:bg-[#121826] border border-white/20 text-xs font-display font-black tracking-widest text-white uppercase transition-all hover:scale-105 shadow-[0_0_15px_rgba(0,0,0,0.8)]"
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
            src={activeCutsceneSrc || cutsceneUrl}
            autoPlay
            playsInline
            preload="auto"
            muted={effectiveSummonVol === 0}
            onEnded={() => {
              setIsCutsceneFrozen(false);
              handleCutsceneEnded();
            }}
            onError={handleCutsceneError}
            onPlaying={() => {
              lastPlayheadWallClockRef.current = Date.now();
              if (isCutsceneFrozen) setIsCutsceneFrozen(false);
            }}
            onTimeUpdate={(e) => {
              const vid = e.currentTarget;
              // Near-end completion watchdog: eliminates audio/video stream duration mismatch hang
              if (vid.duration > 0 && vid.currentTime >= vid.duration - 0.2) {
                setIsCutsceneFrozen(false);
                handleCutsceneEnded();
                return;
              }
              lastPlayheadTimeRef.current = vid.currentTime;
              lastPlayheadWallClockRef.current = Date.now();
              if (isCutsceneFrozen) setIsCutsceneFrozen(false);

              if (vid.currentTime >= 2.25) {
                vid.style.setProperty("--cutscene-focal", `${cutsceneFocalX}% 50%`);
              } else {
                vid.style.setProperty("--cutscene-focal", INTRO_CUTSCENE_FOCAL);
              }
            }}
            style={{
              transform: "translateZ(0)",
              willChange: "transform",
              backfaceVisibility: "hidden",
              ["--cutscene-focal" as any]: INTRO_CUTSCENE_FOCAL,
            }}
            className="cutscene-video w-full h-full object-cover"
          />
          {/* Note: Skip button is explicitly HIDDEN during 5-star cutscene */}
        </div>
      )}

      {/* 2C. 10-SECOND CUTSCENE FREEZE RECOVERY MODAL (FAIL-SAFE) */}
      {isCutsceneFrozen && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-w-md w-full bg-[#0c1017] border-2 border-amber-400/60 rounded-2xl p-6 shadow-[0_0_50px_rgba(251,191,36,0.3)] flex flex-col items-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.3)]">
              <Shield className="w-7 h-7 text-amber-400" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center space-x-1.5 text-emerald-400 text-xs font-mono font-bold">
                <Check className="w-4 h-4" />
                <span>Resonator Data 100% Secured</span>
              </div>
              <h3 className="text-lg font-black font-display uppercase tracking-wider text-white">
                Cutscene Playback Stalled
              </h3>
              <p className="text-xs font-mono text-gray-300 leading-relaxed">
                The cutscene video encountered a network buffering stall, but your convene pull has already been safely saved to your account.
              </p>
            </div>

            {/* Obtained Resonator Card */}
            <div className="w-full p-3 rounded-xl bg-white/5 border border-white/10 flex items-center space-x-3 text-left">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-yellow-400/60 bg-black/60 flex-shrink-0">
                <img
                  src={getItemThumbnail(currentResult)}
                  alt={getItemName(currentResult)}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono text-yellow-400 font-bold uppercase">
                  You Obtained
                </span>
                <h4 className="text-sm font-bold text-white truncate font-display">
                  {getItemName(currentResult)}
                </h4>
                <RarityStars rarity={currentResult.rarity} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsCutsceneFrozen(false);
                handleCutsceneEnded();
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-black font-black uppercase text-xs font-mono tracking-wider shadow-[0_0_20px_rgba(250,204,21,0.4)] transition-all hover:scale-102 active:scale-95 cursor-pointer"
            >
              Continue to Convene
            </button>
          </div>
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
            src={activeCutsceneSrc || cutsceneUrl}
            autoPlay
            playsInline
            preload="auto"
            muted={effectiveSummonVol === 0}
            onEnded={handleCutsceneEnded}
            onError={handleCutsceneError}
            onTimeUpdate={(e) => {
              const vid = e.currentTarget;
              if (vid.currentTime >= 2.25) {
                vid.style.setProperty("--cutscene-focal", `${cutsceneFocalX}% 50%`);
              } else {
                vid.style.setProperty("--cutscene-focal", INTRO_CUTSCENE_FOCAL);
              }
            }}
            style={{
              transform: "translateZ(0)",
              willChange: "transform",
              backfaceVisibility: "hidden",
              ["--cutscene-focal" as any]: INTRO_CUTSCENE_FOCAL,
            }}
            className="cutscene-video w-full h-full object-cover"
          />

          {/* Top HUD for 4-Star: Item Counter & Skip Buttons */}
          <div className="absolute top-6 left-8 right-8 z-50 flex items-center justify-between pointer-events-auto">
            <div className="px-3.5 py-1.5 rounded-full bg-[#0a0e17]/90 border border-white/10 text-xs font-mono text-gray-300">
              <span className="text-purple-400 font-bold">{currentIndex + 1}</span> / {results.length}
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkip4StarCutscene();
                }}
                className="flex items-center space-x-2 px-4 py-2 rounded-full bg-[#0a0e17]/90 hover:bg-[#121826] border border-purple-500/30 text-xs font-display font-black tracking-widest text-white uppercase transition-all hover:scale-105 shadow-[0_0_15px_rgba(0,0,0,0.8)]"
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
                  className="flex items-center space-x-2 px-4 py-2 rounded-full bg-[#0a0e17]/90 hover:bg-[#121826] border border-white/20 text-xs font-display font-black tracking-widest text-white uppercase transition-all hover:scale-105 shadow-[0_0_15px_rgba(0,0,0,0.8)]"
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
            <div className="px-3.5 py-1.5 rounded-full bg-[#0a0e17]/90 border border-white/10 text-xs font-mono text-gray-300">
              <span className="text-yellow-400 font-bold">{currentIndex + 1}</span> / {results.length}
            </div>

            {currentResult.rarity !== 5 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkip();
                }}
                className="flex items-center space-x-2 px-4 py-2 rounded-full bg-[#0a0e17]/90 hover:bg-[#121826] border border-white/20 text-xs font-display font-black tracking-widest text-white uppercase transition-all hover:scale-105 shadow-[0_0_15px_rgba(0,0,0,0.8)]"
              >
                <span>Skip to Summary</span>
                <FastForward className="w-4 h-4 text-yellow-400" />
              </button>
            )}
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
                  decoding="async"
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
          className="relative w-full h-full flex flex-col justify-between p-6 md:p-10 bg-[#07090e] cursor-pointer select-none"
          onClick={() => {
            soundEngine.playClick();
            onFinish();
          }}
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
                const isLost5050 = isGold && (res.is5050Lost === true || (!res.isFeaturedWon && bannerType !== "standard"));

                return (
                  <motion.div
                    key={`summary-item-${idx}`}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: idx * 0.04, duration: 0.25 }}
                    style={{ willChange: "transform, opacity" }}
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

                      <div className="flex items-center space-x-1">
                        {isLost5050 && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-300 text-[9px] font-mono font-black uppercase border border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.35)]">
                            LOST
                          </span>
                        )}
                        {res.isNew && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 text-[9px] font-mono font-black uppercase border border-emerald-400/40">
                            NEW
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Thumbnail Art */}
                    <div className="relative w-20 h-24 sm:w-24 sm:h-28 flex items-center justify-center overflow-hidden my-1">
                      <img
                        src={getItemThumbnail(res)}
                        alt={getItemName(res)}
                        width={96}
                        height={112}
                        loading="lazy"
                        decoding="async"
                        draggable={false}
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

                    {/* Cash Back badge for featured 5-star */}
                    {isGold && res.isFeaturedWon && (
                      <div className="mt-1.5 px-2 py-0.5 rounded-full bg-yellow-400/20 border border-yellow-400/40 flex items-center space-x-1 shadow-[0_0_10px_rgba(250,204,21,0.2)]">
                        <AstriteIcon className="w-3 h-3" />
                        <span className="text-[10px] font-mono font-black text-yellow-300">
                          +800 Astrites
                        </span>
                      </div>
                    )}

                    {/* LOST badge for lost 50/50 5-star */}
                    {isLost5050 && (
                      <div className="mt-1.5 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center space-x-1 shadow-[0_0_10px_rgba(244,63,94,0.25)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                        <span className="text-[10px] font-mono font-black text-rose-300 uppercase tracking-wider">
                          LOST 50/50
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Bottom Tap Anywhere to Close Footer */}
          <div className="flex items-center justify-center pt-4 pb-1 border-t border-white/10">
            <span className="text-xs sm:text-sm font-mono tracking-widest text-gray-400 uppercase animate-pulse select-none">
              Tap Anywhere to Close
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
