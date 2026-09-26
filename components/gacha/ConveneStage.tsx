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
  toggleClientSandbox,
  setClientSelectedChar,
  get5050Stats,
  WinRateStats,
  grantClientCurrency,
  applyCloudProfileToClientState,
  getTotalPullsCount,
  setClientSimContext,
  resetClientSimState,
} from "@/lib/gacha/clientSim";
import {
  AstriteIcon,
  ElementBadge,
  RarityStars,
} from "@/components/ui/GameIcons";
import { preloadSummoningVideos } from "@/lib/video/videoPreloader";
import { ConveneVideoPlayer } from "@/components/gacha/ConveneVideoPlayer";
import { CharacterRailItem } from "@/components/gacha/CharacterRailItem";
import { ResonatorInfoModal } from "@/components/modals/ResonatorInfoModal";
import { DetailsModal } from "@/components/modals/DetailsModal";
import { DevSettingsModal } from "@/components/modals/DevSettingsModal";
import { LoginGateway } from "@/components/auth/LoginGateway";
import { InventoryModal } from "@/components/modals/InventoryModal";
import { PvPArenaModal } from "@/components/battle/PvPArenaModal";
import { PvpDisconnectNoticeModal } from "@/components/battle/PvpDisconnectNoticeModal";
import { PendingPvpNotice, getPendingPvpNotice, clearPendingPvpNotice } from "@/lib/battle/pvpService";
import { ProfileModal } from "@/components/modals/ProfileModal";
import { PlayerProfileModal } from "@/components/modals/PlayerProfileModal";
import { UpdateLogModal } from "@/components/modals/UpdateLogModal";
import { HowToPlayModal } from "@/components/modals/HowToPlayModal";
import { ExternalRedirectModal } from "@/components/modals/ExternalRedirectModal";
import { SlowDownModal } from "@/components/modals/SlowDownModal";
import { SessionDisplacedModal } from "@/components/modals/SessionDisplacedModal";
import { JinzhouPlaza } from "@/components/plaza/JinzhouPlaza";
import { useSessionDisplacement } from "@/lib/auth/sessionDisplacement";
import {
  getHourlyRotatedCharacters,
  getTimeUntilNextRotation,
  getCurrentGmt8HourIndex,
} from "@/lib/gacha/bannerRotation";
import {
  getTacetFieldStatus,
  claimTacetField,
  syncTacetCloudTimestamp,
  TacetFieldStatus,
} from "@/lib/gacha/tacetField";
import { processLoginStreak, getStoredLoginStreak } from "@/lib/gacha/loginStreak";
import { getAuthUser, signOut, getStoredAvatarId, PlayerPublicProfile, searchPlayerProfile } from "@/lib/supabase/auth";
import { fetchUserProfile, updateUserProfile, flushPendingProfileSync, UserProfile } from "@/lib/supabase/profile";
import { getPortraitFileName } from "@/lib/data/portraits";
import { getStoredUserTitle } from "@/lib/data/titles";
import { getCharacterFocalPoint } from "@/lib/data/focalPoints";
import { fetchUserInventory, saveFeaturedResonatorPull, UserInventoryItem } from "@/lib/supabase/inventory";
import { User as SupabaseUser } from "@supabase/supabase-js";
import {
  Sparkles,
  AlertCircle,
  Clock,
  SlidersHorizontal,
  Settings,
  HelpCircle,
  Briefcase,
  LogOut,
  User,
  ChevronDown,
  Shield,
  Infinity as InfinityIcon,
  Crown,
  Swords,
  Gamepad2,
  Trophy,
  Radio,
  Search,
  ChevronRight,
  X,
  Compass,
} from "lucide-react";

export type BannerMode = "character_limited";

export interface ConveneStageProps {
  onReturnToPlaza?: () => void;
}

const DEFAULT_WIN_RATE: WinRateStats = {
  total5050: 0,
  wins5050: 0,
  losses5050: 0,
  winRate: null,
  winRateFormatted: "N/A",
  total5Stars: 0,
  avgPity5Star: 0,
};

export function formatAstriteCount(num: number): string {
  if (num >= 1_000_000) {
    const val = (num / 1_000_000).toFixed(1);
    return (val.endsWith(".0") ? val.slice(0, -2) : val) + "M";
  }
  if (num >= 1_000) {
    const val = (num / 1_000).toFixed(1);
    return (val.endsWith(".0") ? val.slice(0, -2) : val) + "k";
  }
  return num.toLocaleString();
}

export const ConveneStage: React.FC<ConveneStageProps> = ({ onReturnToPlaza }) => {
  // Active states
  const [activeView, setActiveView] = useState<"plaza" | "convene">("convene");
  const bannerMode: BannerMode = "character_limited";
  const [activeHourlyCharacters, setActiveHourlyCharacters] = useState<string[]>(() =>
    getHourlyRotatedCharacters()
  );
  const [selectedCharId, setSelectedCharId] = useState<string>(() => {
    const initial = getHourlyRotatedCharacters();
    return initial[0] || "shorekeeper";
  });
  const [userState, setUserState] = useState<any>(null);
  const [pityMap, setPityMap] = useState<Record<string, any>>({});
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [conveneResult, setConveneResult] = useState<ConveneResponse | null>(null);

  // Modals & Client-side Mount Flag
  const [mounted, setMounted] = useState<boolean>(false);
  const [isResonatorInfoOpen, setIsResonatorInfoOpen] = useState<boolean>(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [isDevOpen, setIsDevOpen] = useState<boolean>(false);
  const [isUpdateLogOpen, setIsUpdateLogOpen] = useState<boolean>(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState<boolean>(false);
  const [winRateStats, setWinRateStats] = useState<WinRateStats>(DEFAULT_WIN_RATE);
  const [isSwitchingBanner, setIsSwitchingBanner] = useState<boolean>(false);
  const [switchingCharName, setSwitchingCharName] = useState<string>("");
  const [switchingBannerTitle, setSwitchingBannerTitle] = useState<string>("");
  const switchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1s Entrance Cooldown for Game Modes / Arena (identical to banner switch)
  const [isEnteringGameMode, setIsEnteringGameMode] = useState<boolean>(false);
  const [enteringGameModeTitle, setEnteringGameModeTitle] = useState<string>("");
  const enteringGameModeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isPullingRef = useRef<boolean>(false);
  const pendingCashBackRef = useRef<number>(0);
  const [comingSoonNotice, setComingSoonNotice] = useState<boolean>(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState<boolean>(false);
  const [insufficientAstriteData, setInsufficientAstriteData] = useState<{
    needed: number;
    current: number;
  }>({ needed: 160, current: 0 });

  // Sandbox Mode (Guest Test Mode)
  const [isSandboxGuest, setIsSandboxGuest] = useState<boolean>(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Guard against Plaza view while in Sandbox mode
  useEffect(() => {
    if (isSandboxGuest && activeView === "plaza") {
      setActiveView("convene");
    }
  }, [isSandboxGuest, activeView]);

  // Hourly Banner Rotation & Free Astrites Idle Accumulator (GMT+8)
  const [rotationTimerText, setRotationTimerText] = useState<string>(
    () => getTimeUntilNextRotation().formattedText
  );
  const [rotationMinutes, setRotationMinutes] = useState<number>(
    () => getTimeUntilNextRotation().minutes
  );
  const [tacetStatus, setTacetStatus] = useState<TacetFieldStatus>(() =>
    getTacetFieldStatus()
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const lastHourIndexRef = useRef<number>(getCurrentGmt8HourIndex());

  // Cloud Auth & Inventory State (Supabase)
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [inventoryList, setInventoryList] = useState<UserInventoryItem[]>([]);
  const [isInventoryOpen, setIsInventoryOpen] = useState<boolean>(false);
  const [isInventoryLoading, setIsInventoryLoading] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState<boolean>(false);
  const [isPlayerProfileOpen, setIsPlayerProfileOpen] = useState<boolean>(false);
  const [isPvpArenaOpen, setIsPvpArenaOpen] = useState<boolean>(false);
  const [isGamesMenuOpen, setIsGamesMenuOpen] = useState<boolean>(false);
  const [pvpInitialTab, setPvpInitialTab] = useState<"gym" | "tower" | "live" | "search">("gym");
  const [pvpOpponentUsername, setPvpOpponentUsername] = useState<string | undefined>(undefined);
  const [pvpRoomCode, setPvpRoomCode] = useState<string | undefined>(undefined);
  const [pvpBet, setPvpBet] = useState<number | undefined>(undefined);
  const [pvpIsHost, setPvpIsHost] = useState<boolean | undefined>(undefined);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [isAccountNavigatedFromProfile, setIsAccountNavigatedFromProfile] = useState<boolean>(false);
  const [isInventoryNavigatedFromProfile, setIsInventoryNavigatedFromProfile] = useState<boolean>(false);
  const [visitedPlayerProfile, setVisitedPlayerProfile] = useState<PlayerPublicProfile | null>(null);
  const [inspectedInventory, setInspectedInventory] = useState<{
    items: UserInventoryItem[];
    username: string;
    isReadOnly: boolean;
  } | null>(null);
  const [currentAvatarId, setCurrentAvatarId] = useState<string>("shorekeeper");
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Pending PvP disconnect / forfeit notice
  const [pendingPvpNotice, setPendingPvpNotice] = useState<PendingPvpNotice | null>(null);

  useEffect(() => {
    const uid = isSandboxGuest ? "guest" : currentUser?.id;
    const notice = getPendingPvpNotice(uid);
    if (notice) {
      setPendingPvpNotice(notice);
    }
  }, [currentUser?.id, isSandboxGuest]);

  const handleAcknowledgePvpNotice = () => {
    const uid = isSandboxGuest ? "guest" : currentUser?.id;
    clearPendingPvpNotice(uid);
    setPendingPvpNotice(null);
  };

  // Cross-tab and Cross-device session authority ("Account logged in elsewhere")
  const activeSessionUserId = isSandboxGuest ? null : currentUser?.id;
  const { isDisplaced, preferThisSession } = useSessionDisplacement(activeSessionUserId);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileDropdownOpen(false);
      }
    };

    if (isProfileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileDropdownOpen]);

  // Fetch initial user, pity and winrate state from client-side simulator
  const fetchState = useCallback(() => {
    try {
      const isSandbox = isSandboxGuest;
      const targetUserId = isSandbox ? null : currentUser?.id;
      const data = getClientStateData(targetUserId, isSandbox);
      if (data.user) {
        setUserState(data.user);
        if (data.user.selectedLimitedChar) {
          const char = data.user.selectedLimitedChar;
          const activeRotation = getHourlyRotatedCharacters();
          if (isSandbox || activeRotation.includes(char)) {
            setSelectedCharId(char);
          } else if (activeRotation[0]) {
            setSelectedCharId(activeRotation[0]);
            setClientSelectedChar(activeRotation[0], targetUserId, isSandbox);
          }
        }
      }
      if (data.pity) {
        setPityMap(data.pity as any);
      }
      setWinRateStats(get5050Stats(targetUserId, isSandbox));
    } catch (e) {
      console.error("Failed to load client state:", e);
    }
  }, [isSandboxGuest, currentUser?.id]);


  useEffect(() => {
    setMounted(true);
    soundEngine.startBGM();

    getAuthUser()
      .then(async (user) => {
        if (user) {
          setIsSandboxGuest(false);
          setCurrentUser(user);
          setClientSimContext(user.id, false);
          flushPendingProfileSync(user.id).catch(() => {});
          const prof = await fetchUserProfile(
            user.id,
            user.user_metadata?.username || user.email?.split("@")[0] || "Player"
          );
          setUserProfile(prof);
          const avatar = user.user_metadata?.avatar_id || getStoredAvatarId(user.id);
          setCurrentAvatarId(avatar);
          if (prof) {
            applyCloudProfileToClientState(prof, user.id);
            if (prof.last_tacet_claim) {
              syncTacetCloudTimestamp(user.id, prof.last_tacet_claim);
            }
            const activeRotation = getHourlyRotatedCharacters();
            const validChar = activeRotation.includes(prof.selected_char_id)
              ? prof.selected_char_id
              : activeRotation[0] || "shorekeeper";
            setSelectedCharId(validChar);
            if (prof.selected_char_id !== validChar) {
              updateUserProfile(user.id, { selected_char_id: validChar }).catch(() => {});
            }

            // Process Daily Login Streak (00:00 GMT+8 reset)
            const streakData = processLoginStreak(
              user.id,
              prof.login_streak,
              prof.max_login_streak,
              prof.last_login_date
            );
            if (streakData.isNewDay) {
              prof.login_streak = streakData.streak;
              prof.max_login_streak = streakData.maxStreak;
              prof.last_login_date = streakData.lastLoginDate;
              updateUserProfile(user.id, {
                login_streak: streakData.streak,
                max_login_streak: streakData.maxStreak,
                last_login_date: streakData.lastLoginDate,
              }).catch(() => {});
              setToastMessage(`🔥 Day ${streakData.streak} Login Streak! Check-in recorded.`);
              setTimeout(() => setToastMessage(null), 5000);
            }
          }
          setTacetStatus(getTacetFieldStatus(user.id, false, Date.now(), prof?.is_vip, prof?.max_login_streak));
          fetchState();
          const inv = await fetchUserInventory(user.id);
          setInventoryList(inv);

          // Auto-open Guide for new accounts on first entrance
          if (typeof window !== "undefined") {
            const pendingKey = `wuwa_newbie_guide_pending_${user.id}`;
            const guideShownKey = `wuwa_guide_shown_${user.id}`;
            if (localStorage.getItem(pendingKey) === "true" && !localStorage.getItem(guideShownKey)) {
              localStorage.setItem(guideShownKey, "true");
              localStorage.removeItem(pendingKey);
              setTimeout(() => {
                setIsHowToPlayOpen(true);
              }, 1200);
            }
          }
        } else {
          setIsSandboxGuest(true);
          setClientSimContext(null, true);
          setCurrentUser(null);
          fetchState();
        }
        setAuthChecking(false);
      })
      .catch((e) => {
        console.error("Auth check failed:", e);
        setIsSandboxGuest(true);
        setClientSimContext(null, true);
        setCurrentUser(null);
        setAuthChecking(false);
        fetchState();
      });

    const handleOnline = () => {
      getAuthUser().then((u) => {
        if (u) flushPendingProfileSync(u.id).catch(() => {});
      });
    };
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [fetchState]);

  // In Sandbox (Guest) mode, all banners are open! Otherwise, restricted to the 3 hourly featured resonators.
  const displayedCharacters = useMemo(() => {
    if (isSandboxGuest) {
      return LIMITED_CHARACTERS_LIST;
    }
    return activeHourlyCharacters;
  }, [isSandboxGuest, activeHourlyCharacters]);

  const handleExitSandbox = useCallback(async () => {
    soundEngine.playClick();
    if (currentUser) {
      setIsSandboxGuest(false);
      setClientSimContext(currentUser.id, false);
      toggleClientSandbox(false);
      const prof = await fetchUserProfile(
        currentUser.id,
        currentUser.user_metadata?.username || currentUser.email?.split("@")[0] || "Player"
      );
      setUserProfile(prof);
      if (prof) {
        applyCloudProfileToClientState(prof, currentUser.id);
      }
      fetchState();
      fetchUserInventory(currentUser.id).then(setInventoryList).catch(() => {});
      setToastMessage("Returned to your cloud account.");
      setTimeout(() => setToastMessage(null), 3500);
    } else {
      setIsLoginModalOpen(true);
    }
  }, [currentUser, fetchState]);

  const handleEnterSandbox = useCallback(() => {
    soundEngine.playClick();
    setIsSandboxGuest(true);
    setClientSimContext(null, true);
    toggleClientSandbox(true);
    const data = getClientStateData(null, true);
    if (data.user) setUserState(data.user);
    if (data.pity) setPityMap(data.pity as any);
    setWinRateStats(get5050Stats(null, true));
    if (data.user?.selectedLimitedChar) {
      setSelectedCharId(data.user.selectedLimitedChar);
    }
    setToastMessage("Entered Sandbox Mode! Unlimited Astrites & all banners unlocked.");
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  const handleResetSandbox = useCallback(() => {
    soundEngine.playClick();
    resetClientSimState(null, true);
    setPityMap({});
    fetchState();
    setToastMessage("Sandbox history, pity, and stats have been reset!");
    setTimeout(() => setToastMessage(null), 3000);
  }, [fetchState]);

  // Live ticker for hourly rotation countdown & Free Astrite accumulator
  useEffect(() => {
    const interval = setInterval(() => {
      const { minutes, formattedText } = getTimeUntilNextRotation();
      setRotationTimerText(formattedText);
      setRotationMinutes(minutes);

      // Check for hourly rotation switch (only in normal mode; banners don't reset in sandbox)
      const currentHour = getCurrentGmt8HourIndex();
      if (!isSandboxGuest && currentHour !== lastHourIndexRef.current) {
        lastHourIndexRef.current = currentHour;
        const newRotation = getHourlyRotatedCharacters();
        setActiveHourlyCharacters(newRotation);
        if (!newRotation.includes(selectedCharId)) {
          setSelectedCharId(newRotation[0]);
          setClientSelectedChar(newRotation[0]);
        }
        setToastMessage("Featured Resonators have rotated!");
        setTimeout(() => setToastMessage(null), 6000);


      }

      setTacetStatus(
        getTacetFieldStatus(
          currentUser?.id,
          isSandboxGuest,
          Date.now(),
          userProfile?.is_vip,
          userProfile?.max_login_streak
        )
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedCharId, isSandboxGuest, currentUser?.id, userProfile?.is_vip, userProfile?.max_login_streak]);

  // Re-sync Tacet status immediately when user or sandbox status changes
  useEffect(() => {
    setTacetStatus(
      getTacetFieldStatus(
        currentUser?.id,
        isSandboxGuest,
        Date.now(),
        userProfile?.is_vip,
        userProfile?.max_login_streak
      )
    );
  }, [currentUser?.id, isSandboxGuest, userProfile?.is_vip, userProfile?.max_login_streak]);

  // Claim accumulated Astrite from Free Astrites bank
  const handleClaimTacetField = useCallback(() => {
    soundEngine.playClick();
    const claimed = claimTacetField(
      currentUser?.id,
      isSandboxGuest,
      Date.now(),
      userProfile?.is_vip,
      userProfile?.max_login_streak
    );
    if (claimed > 0) {
      const updatedState = grantClientCurrency(claimed, currentUser?.id, isSandboxGuest);
      if (currentUser && !isSandboxGuest) {
        updateUserProfile(currentUser.id, {
          astrite: updatedState.astrite,
          last_tacet_claim: new Date().toISOString(),
        });
      }
      fetchState();
      setTacetStatus(
        getTacetFieldStatus(
          currentUser?.id,
          isSandboxGuest,
          Date.now(),
          userProfile?.is_vip,
          userProfile?.max_login_streak
        )
      );
      if (activeView !== "plaza") {
        setToastMessage(`+${claimed.toLocaleString()} Free Astrite Claimed!`);
        setTimeout(() => setToastMessage(null), 4000);
      }
    }
  }, [currentUser, isSandboxGuest, userProfile?.is_vip, userProfile?.max_login_streak, fetchState, activeView]);

  const handleUpdateAstrites = useCallback((delta: number) => {
    const isSandbox = isSandboxGuest;
    const targetUserId = isSandbox ? null : currentUser?.id;
    const updatedState = grantClientCurrency(delta, targetUserId, isSandbox);
    setUserState(updatedState);
    if (currentUser && !isSandbox) {
      updateUserProfile(currentUser.id, {
        astrite: updatedState.astrite,
      }).catch(() => {});
    }
    return updatedState.astrite;
  }, [currentUser, isSandboxGuest]);

  const handleLoginSuccess = useCallback((user: SupabaseUser, profile: UserProfile | null, isNewAccount: boolean = false) => {
    setIsLoggingIn(true);
    setIsSandboxGuest(false);
    toggleClientSandbox(false);
    setCurrentUser(user);
    setClientSimContext(user.id, false);
    setUserProfile(profile);
    const avatar = user.user_metadata?.avatar_id || getStoredAvatarId(user.id);
    setCurrentAvatarId(avatar);
    if (profile) {
      applyCloudProfileToClientState(profile, user.id);
      if (profile.last_tacet_claim) {
        syncTacetCloudTimestamp(user.id, profile.last_tacet_claim);
      }
      const activeRotation = getHourlyRotatedCharacters();
      const validChar = activeRotation.includes(profile.selected_char_id)
        ? profile.selected_char_id
        : activeRotation[0] || "shorekeeper";
      setSelectedCharId(validChar);
      if (profile.selected_char_id !== validChar) {
        updateUserProfile(user.id, { selected_char_id: validChar }).catch(() => {});
      }

      // Process Daily Login Streak (00:00 GMT+8 reset)
      const streakData = processLoginStreak(
        user.id,
        profile.login_streak,
        profile.max_login_streak,
        profile.last_login_date
      );
      if (streakData.isNewDay) {
        profile.login_streak = streakData.streak;
        profile.max_login_streak = streakData.maxStreak;
        profile.last_login_date = streakData.lastLoginDate;
        updateUserProfile(user.id, {
          login_streak: streakData.streak,
          max_login_streak: streakData.maxStreak,
          last_login_date: streakData.lastLoginDate,
        }).catch(() => {});
        setToastMessage(`🔥 Day ${streakData.streak} Login Streak! Check-in recorded.`);
        setTimeout(() => setToastMessage(null), 5000);
      }

      setTacetStatus(getTacetFieldStatus(user.id, false, Date.now(), profile.is_vip, profile.max_login_streak));
      fetchState();
    }
    fetchUserInventory(user.id).then(setInventoryList);

    // Auto-open Guide for new accounts on first entrance (strictly one time)
    if (typeof window !== "undefined") {
      const pendingKey = `wuwa_newbie_guide_pending_${user.id}`;
      const guideShownKey = `wuwa_guide_shown_${user.id}`;
      if ((isNewAccount || localStorage.getItem(pendingKey) === "true") && !localStorage.getItem(guideShownKey)) {
        localStorage.setItem(guideShownKey, "true");
        localStorage.removeItem(pendingKey);
        setTimeout(() => {
          setIsHowToPlayOpen(true);
        }, 1400);
      }
    }

    setTimeout(() => {
      setIsLoggingIn(false);
    }, 1200);
  }, [fetchState]);

  const handleOpenInventory = useCallback(async () => {
    soundEngine.playClick();
    setIsInventoryNavigatedFromProfile(false);
    setInspectedInventory(null);
    setIsInventoryOpen(true);
    setIsInventoryLoading(true);
    if (currentUser) {
      try {
        const fresh = await fetchUserInventory(currentUser.id);
        setInventoryList(fresh);
      } catch (err) {
        console.error("Failed to refresh inventory:", err);
      }
    }
    setTimeout(() => {
      setIsInventoryLoading(false);
    }, 650);
  }, [currentUser]);

  const handleSignOut = useCallback(async () => {
    soundEngine.playClick();
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    }
    setClientSimContext(null, false);
    resetClientSimState(null, false);
    // Purge any lingering cross-account keys so the next logged in account starts completely isolated
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("wuwa_active_title");
        localStorage.removeItem("wuwa_active_avatar");
        localStorage.removeItem("wuwa_convene_client_sim_v1");
        localStorage.removeItem("wuwa_tacet_field_state_v1");
      } catch {}
    }
    setCurrentUser(null);
    setUserProfile(null);
    setUserState(null);
    setPityMap({});
    setWinRateStats(DEFAULT_WIN_RATE);
    setInventoryList([]);
    setCurrentAvatarId("shorekeeper");
    setIsSandboxGuest(true);
    setClientSimContext(null, true);
    toggleClientSandbox(true);
    const data = getClientStateData(null, true);
    if (data.user) setUserState(data.user);
    if (data.pity) setPityMap(data.pity as any);
    setWinRateStats(get5050Stats(null, true));
    setTimeout(() => {
      setIsLoggingOut(false);
    }, 600);
  }, []);

  // Preload queue: 3 critical summoning videos FIRST upon entering website, then deferred images
  useEffect(() => {
    // 1. HIGHEST PRIORITY: Preload the 3 summoning animation videos immediately upon website entry
    preloadSummoningVideos();

    // 2. Preload active limited character art and standard fallbacks
    const activeChar = RESONATORS[selectedCharId];
    if (activeChar) {
      [activeChar.splashUrl, activeChar.portraitUrl].forEach((url) => {
        if (url) {
          const img = new Image();
          img.src = url;
        }
      });
    }
  }, [selectedCharId]);

  useEffect(() => {
    return () => {
      if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
      if (enteringGameModeTimerRef.current) clearTimeout(enteringGameModeTimerRef.current);
    };
  }, []);

  // Current banner character & weapon presets (memoized to avoid re-computations on unrelated state updates)
  const currentChar = useMemo(
    () => RESONATORS[selectedCharId] || RESONATORS[activeHourlyCharacters[0]] || RESONATORS["shorekeeper"],
    [selectedCharId, activeHourlyCharacters]
  );
  const currentPreset = useMemo(
    () => LIMITED_BANNER_PRESETS[selectedCharId] || LIMITED_BANNER_PRESETS[activeHourlyCharacters[0]] || LIMITED_BANNER_PRESETS["shorekeeper"],
    [selectedCharId, activeHourlyCharacters]
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

  const charFocal = useMemo(
    () => getCharacterFocalPoint(selectedCharId || currentChar?.id),
    [selectedCharId, currentChar?.id]
  );

  // Handle selecting a limited character from the rail
  const handleSelectCharacter = useCallback((charId: string) => {
    if (charId === selectedCharId) return;
    soundEngine.playClick();

    const charName = RESONATORS[charId]?.name || "Resonator";
    const bannerTitle = LIMITED_BANNER_PRESETS[charId]?.title || "Featured Convene";
    setSwitchingCharName(charName);
    setSwitchingBannerTitle(bannerTitle);
    setIsSwitchingBanner(true);

    setSelectedCharId(charId);
    const isSandbox = isSandboxGuest || Boolean(userState?.isSandbox);
    const targetUserId = isSandbox ? null : currentUser?.id;
    setClientSelectedChar(charId, targetUserId, isSandbox);

    if (switchTimerRef.current) {
      clearTimeout(switchTimerRef.current);
    }
    switchTimerRef.current = setTimeout(() => {
      setIsSwitchingBanner(false);
    }, 1500);

    if (currentUser && !isSandbox) {
      updateUserProfile(currentUser.id, { selected_char_id: charId });
    }
  }, [selectedCharId, currentUser, isSandboxGuest, userState?.isSandbox]);

  // Handle launching a game mode with a 1s entrance cooldown ("Loading...")
  const handleLaunchGameMode = useCallback(
    (tab: "gym" | "tower" | "live" | "search", title: string, opponentUsername?: string) => {
      soundEngine.playClick();
      setIsGamesMenuOpen(false);
      setPvpInitialTab(tab);
      setPvpOpponentUsername(opponentUsername || undefined);
      setPvpRoomCode(undefined);
      setPvpBet(undefined);
      setPvpIsHost(undefined);
      setEnteringGameModeTitle(title);
      setIsEnteringGameMode(true);

      if (enteringGameModeTimerRef.current) {
        clearTimeout(enteringGameModeTimerRef.current);
      }
      enteringGameModeTimerRef.current = setTimeout(() => {
        setIsEnteringGameMode(false);
        setIsPvpArenaOpen(true);
      }, 1000);
    },
    []
  );

  // Perform Convene Pull (1 or 10) with cloud sync for won 5-stars
  const handlePull = useCallback(async (count: 1 | 10) => {
    if (isPulling || isPullingRef.current) return;

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
    const isSandbox = isSandboxGuest || Boolean(userState?.isSandbox);
    const targetUserId = isSandbox ? null : currentUser?.id;

    if (!isSandbox && currentAstrite < neededAstrite) {
      soundEngine.playClick();
      setInsufficientAstriteData({ needed: neededAstrite, current: currentAstrite });
      setShowInsufficientModal(true);
      return;
    }

    isPullingRef.current = true;
    setIsPulling(true);

    try {
      const data = executeClientConvene(bannerMode, count, selectedCharId, targetUserId, isSandbox);
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
      setWinRateStats(get5050Stats(targetUserId, isSandbox));

      // Group won 5-stars by character_id so multiple 5-stars in a 10-pull are counted accurately
      const wonCounts: Record<string, { name: string; count: number }> = {};
      let totalFeatured5Stars = 0;
      for (const resItem of data.results) {
        if (resItem.rarity === 5 && resItem.isFeaturedWon) {
          const id = resItem.item.id;
          if (!wonCounts[id]) {
            wonCounts[id] = { name: resItem.item.name, count: 0 };
          }
          wonCounts[id].count += 1;
          totalFeatured5Stars += 1;
        }
      }

      // 5★ Cash Back: each FEATURED 5 star copy grants 5 pulls (800 Astrite)
      let rebateAstrite = 0;
      if (totalFeatured5Stars > 0) {
        rebateAstrite = totalFeatured5Stars * 800; // 5 Convenes per copy
        grantClientCurrency(rebateAstrite, targetUserId, isSandbox);
        data.userState.astrite += rebateAstrite;
        setUserState((prev: any) => ({
          ...prev,
          astrite: (prev?.astrite || 0) + rebateAstrite,
        }));
        pendingCashBackRef.current = rebateAstrite;
      } else {
        pendingCashBackRef.current = 0;
      }

      // Cloud Persistence to Supabase (ONLY for logged in user and NOT in sandbox)
      if (currentUser && !isSandbox) {
        const entries = Object.entries(wonCounts);
        if (entries.length > 0) {
          for (const [charId, info] of entries) {
            await saveFeaturedResonatorPull(
              currentUser.id,
              charId,
              info.name,
              info.count
            );
          }
          const updatedInv = await fetchUserInventory(currentUser.id);
          setInventoryList(updatedInv);
        }

        // 2. Sync updated Astrite balance, Pity, and True 50/50 Stats to Supabase profile (1 row per user)
        const currentStats = get5050Stats(currentUser.id, false);
        updateUserProfile(currentUser.id, {
          astrite: data.userState.astrite,
          pity_5star: data.newPity5,
          pity_4star: data.newPity4,
          guaranteed_limited: data.guaranteedLimited,
          selected_char_id: selectedCharId,
          total_pulls: getTotalPullsCount(currentUser.id, false),
          wins_5050: currentStats.wins5050,
          total_5050: currentStats.total5050,
        });
      }
    } catch (err: any) {
      isPullingRef.current = false;
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
  }, [isPulling, bannerMode, currentChar, currentPreset, userState, selectedCharId, currentUser, isSandboxGuest]);

  // Upfront Auth Screen: Require Account
  if (authChecking) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090e] text-white select-none">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 flex items-center justify-center shadow-[0_0_25px_rgba(250,204,21,0.2)]">
            <Sparkles className="w-6 h-6 animate-spin" />
          </div>
          <span className="font-mono text-xs text-gray-400 tracking-wider uppercase">Loading...</span>
        </div>
      </div>
    );
  }

  if (isLoggingOut) {
    return (
      <div className="fixed inset-0 z-[150] bg-[#07090e] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="flex flex-col items-center space-y-5 max-w-sm">
          <div className="relative flex items-center justify-center w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-yellow-400/20 animate-ping pointer-events-none" />
            <div className="relative p-5 rounded-2xl bg-[#10141d] border border-yellow-400/50 text-yellow-400 shadow-[0_0_35px_rgba(250,204,21,0.3)]">
              <Sparkles className="w-8 h-8 animate-spin" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg sm:text-xl font-black uppercase tracking-widest text-white font-display">
              LOGGING OUT
            </h3>
            <p className="text-xs font-mono text-yellow-400/80 tracking-wider">
              Disconnecting Resonance Terminal...
            </p>
          </div>

          <div className="w-44 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
              className="w-1/2 h-full bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 rounded-full shadow-[0_0_12px_rgba(250,204,21,0.8)]"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="relative w-screen h-[100dvh] overflow-hidden bg-[#06080e] text-white flex flex-col justify-between font-sans select-none">
      {/* Logout Loading Transition Overlay */}
      <AnimatePresence>
        {isLoggingOut && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="fixed inset-0 z-[150] bg-[#07090e] flex flex-col items-center justify-center p-6 text-center select-none"
          >
            <div className="flex flex-col items-center space-y-5 max-w-sm">
              <div className="relative flex items-center justify-center w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-yellow-400/20 animate-ping pointer-events-none" />
                <div className="relative p-5 rounded-2xl bg-[#10141d] border border-yellow-400/50 text-yellow-400 shadow-[0_0_35px_rgba(250,204,21,0.3)]">
                  <Sparkles className="w-8 h-8 animate-spin" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg sm:text-xl font-black uppercase tracking-widest text-white font-display">
                  LOGGING OUT
                </h3>
                <p className="text-xs font-mono text-yellow-400/80 tracking-wider">
                  Disconnecting Resonance Terminal...
                </p>
              </div>

              <div className="w-44 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut" }}
                  className="w-1/2 h-full bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 rounded-full shadow-[0_0_12px_rgba(250,204,21,0.8)]"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Loading Transition Overlay */}
      <AnimatePresence>
        {isLoggingIn && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="fixed inset-0 z-[120] bg-[#07090e] flex flex-col items-center justify-center p-6 text-center select-none"
          >
            <div className="flex flex-col items-center space-y-5 max-w-sm">
              <div className="relative flex items-center justify-center w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-yellow-400/20 animate-ping pointer-events-none" />
                <div className="relative p-5 rounded-2xl bg-[#10141d] border border-yellow-400/50 text-yellow-400 shadow-[0_0_35px_rgba(250,204,21,0.3)]">
                  <Sparkles className="w-8 h-8 animate-spin" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg sm:text-xl font-black uppercase tracking-widest text-white font-display">
                  Synchronizing Resonance System
                </h3>
                <p className="text-xs font-mono text-yellow-400/80 tracking-wider">
                  Entering Solaris-3 Convene Stage...
                </p>
              </div>

              <div className="w-44 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                  className="w-1/2 h-full bg-gradient-to-r from-transparent via-yellow-400 to-transparent"
                />
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

      {/* ========================================================================= */}
      {/* 0C. ENTERING GAME MODE / ARENA TRANSITION OVERLAY */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isEnteringGameMode && (
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
              {/* Animated Combat Reticle */}
              <div className="relative flex items-center justify-center w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-rose-500/15 animate-ping pointer-events-none" />
                <div className="relative p-4 rounded-2xl bg-[#10141d] border border-rose-500/40 text-rose-400 shadow-[0_0_35px_rgba(244,63,94,0.25)] flex items-center justify-center">
                  <Swords className="w-9 h-9 animate-pulse" />
                </div>
              </div>

              {/* Title & Subtext */}
              <div className="space-y-1.5">
                <span className="text-xs sm:text-sm font-mono tracking-widest text-rose-400 font-bold uppercase drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                  {enteringGameModeTitle || "Combat Arena"}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white drop-shadow-[0_2px_15px_rgba(255,255,255,0.2)]">
                  Loading...
                </h2>
                <p className="text-xs sm:text-sm font-mono tracking-wider text-gray-400">
                  Initializing Combat Matrix
                </p>
              </div>

              {/* Sleek Animated Tech Progress Beam */}
              <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden relative shadow-inner">
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ repeat: Infinity, duration: 0.75, ease: "easeInOut" }}
                  className="w-1/2 h-full bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500 rounded-full shadow-[0_0_12px_rgba(244,63,94,0.8)]"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* JINZHOU PLAZA (2D RETRO MMO LANDING HUB) */}
      {/* ========================================================================= */}
      <JinzhouPlaza
        currentUser={currentUser}
        userProfile={userProfile}
        currentAvatarId={currentAvatarId}
        userState={userState}
        isSandboxGuest={isSandboxGuest}
        isVisible={activeView === "plaza" && !isSandboxGuest}
        onNavigate={(view) => {
            if (view === "convene") {
              soundEngine.playClick();
              setActiveView("convene");
            } else if (view === "arena") {
              soundEngine.playClick();
              setPvpOpponentUsername(undefined);
              setPvpRoomCode(undefined);
              setPvpBet(undefined);
              setPvpIsHost(undefined);
              setPvpInitialTab("gym");
              setIsGamesMenuOpen(true);
            }
          }}
          onOpenInventory={handleOpenInventory}
          onOpenProfile={(targetUsername) => {
            soundEngine.playClick();
            if (targetUsername && targetUsername !== (userProfile?.username || currentUser?.user_metadata?.username)) {
              searchPlayerProfile(targetUsername).then((res) => {
                if (res.profile) {
                  setVisitedPlayerProfile(res.profile);
                } else {
                  setVisitedPlayerProfile({
                    id: `view_${targetUsername}`,
                    username: targetUsername,
                    avatar_id: "shorekeeper",
                    custom_title: undefined,
                    astrite: 0,
                    pity_5star: 0,
                    total_pulls: 0,
                    is_vip: false,
                    login_streak: 1,
                    max_login_streak: 1,
                    showcase_ids: [],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  } as any);
                }
                setIsPlayerProfileOpen(true);
              });
            } else {
              setVisitedPlayerProfile(null);
              setIsPlayerProfileOpen(true);
            }
          }}
          onLaunchPvPChallenge={(roomCode, bet, opponentUsername, isHost) => {
            setPvpRoomCode(roomCode);
            setPvpBet(bet);
            setPvpIsHost(isHost);
            setPvpOpponentUsername(opponentUsername);
            setIsPvpArenaOpen(true);
          }}
          onOpenAccount={() => {
            soundEngine.playClick();
            setIsAccountNavigatedFromProfile(false);
            setIsAccountModalOpen(true);
          }}
          onOpenSettings={() => {
            soundEngine.playClick();
            setIsDevOpen(true);
          }}
          onSignOut={handleSignOut}
          onExitSandbox={handleExitSandbox}
          onClaimTacetField={handleClaimTacetField}
          tacetStatus={tacetStatus}
          onUpdateAstrites={handleUpdateAstrites}
          onBirthdayChanged={(newBirthday, newLastChanged) => {
            setUserProfile((prev: any) =>
              prev
                ? {
                    ...prev,
                    birthday: newBirthday,
                    birthday_last_changed_at: newLastChanged,
                  }
                : prev
            );
          }}
        />

      {/* ========================================================================= */}
      {/* CONVENE STAGE & BANNER ROTATION */}
      {/* ========================================================================= */}
      {activeView === "convene" && (
        <>
          {/* Dynamic Element Atmospheric Glow Background */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute inset-0 transition-opacity duration-1000"
              style={{
                background: `radial-gradient(ellipse at 70% 45%, ${currentPreset.accentColor}24 0%, #06080e 72%)`,
              }}
            />
            {/* Subtle Tech Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-60" />
          </div>

      {/* ========================================================================= */}
      {/* 1. TOP HEADER HUD */}
      {/* ========================================================================= */}
      <header className="relative z-20 flex items-center justify-between px-2.5 sm:px-6 py-2 sm:py-3 border-b border-white/10 bg-black/50 backdrop-blur-md gap-1.5 sm:gap-3">
        {/* Top Left: Title "you a gacha addict" & Update Logs */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <h1 className="font-black tracking-wider text-xs sm:text-base md:text-lg uppercase text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)] whitespace-nowrap hidden portrait:hidden landscape:min-[640px]:inline">
            you a gacha addict
          </h1>

          {/* Return to Plaza Hub Button (Hidden in Sandbox) */}
          {!isSandboxGuest && (
            <button
              onClick={() => {
                soundEngine.playClick();
                if (onReturnToPlaza) {
                  onReturnToPlaza();
                } else {
                  setActiveView("plaza");
                }
              }}
              className="flex h-[38px] sm:h-[40px] px-2.5 sm:px-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/40 text-amber-300 hover:text-white text-[11px] sm:text-xs font-mono font-bold tracking-wider items-center space-x-1.5 transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
              title="Return to Jinzhou Plaza Hub"
            >
              <Compass className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-amber-300" />
              <span className="hidden sm:inline">Plaza Hub</span>
            </button>
          )}

          {/* Update Log Button */}
          <button
            onClick={() => {
              soundEngine.playClick();
              setIsUpdateLogOpen(true);
            }}
            className="h-[38px] sm:h-[40px] px-2.5 sm:px-3.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/35 border border-purple-400/40 text-purple-300 hover:text-white text-[11px] sm:text-xs font-mono font-bold tracking-wider flex items-center space-x-1.5 transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
            title="View Updates & Submit Suggestions"
          >
            <Sparkles className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-purple-300" />
            <span className="hidden sm:inline">Updates</span>
          </button>

          {/* How to Play / Guide Button */}
          <button
            onClick={() => {
              soundEngine.playClick();
              setIsHowToPlayOpen(true);
            }}
            className="h-[38px] sm:h-[40px] px-2.5 sm:px-3.5 rounded-xl bg-yellow-500/20 hover:bg-yellow-500/35 border border-yellow-400/40 text-yellow-300 hover:text-white text-[11px] sm:text-xs font-mono font-bold tracking-wider flex items-center space-x-1.5 transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
            title="Game Guide & Rules"
          >
            <HelpCircle className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-yellow-400" />
            <span className="hidden sm:inline">Guide</span>
          </button>
        </div>

        {/* Top Right: Free Astrites Idle Accumulator, Astrite Counter & Settings */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {/* Free Astrite Idle Accumulator (Hidden in Sandbox Mode) */}
          {!isSandboxGuest && !userState?.isSandbox && (
            <button
              onClick={handleClaimTacetField}
              disabled={tacetStatus.accumulated === 0}
              className={`h-[38px] sm:h-[40px] px-2 sm:px-3 rounded-xl border backdrop-blur-sm shadow-inner transition-all flex items-center space-x-1.5 group ${
                tacetStatus.isMaxed
                  ? "bg-gradient-to-r from-yellow-500/30 via-amber-500/25 to-yellow-500/30 border-yellow-400 text-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.45)] animate-pulse cursor-pointer hover:scale-105 active:scale-95"
                  : tacetStatus.accumulated > 0
                  ? "bg-white/5 hover:bg-white/10 border-yellow-400/40 text-yellow-300 cursor-pointer hover:scale-105 active:scale-95"
                  : "bg-white/5 border-white/10 text-gray-500 cursor-not-allowed opacity-70"
              }`}
              title={
                tacetStatus.isMaxed
                  ? `Free Astrite MAX (${tacetStatus.maxCap.toLocaleString()} Astrite / ${tacetStatus.batteryHours}h) - Click to claim!`
                  : `Free Astrite: ${tacetStatus.accumulated.toLocaleString()} / ${tacetStatus.maxCap.toLocaleString()} (${tacetStatus.batteryHours}h Cap, 160 every 6m)`
              }
            >
              <Sparkles
                className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${
                  tacetStatus.isMaxed ? "text-yellow-300 animate-spin" : "text-yellow-400"
                }`}
              />
              <span className="text-[11px] sm:text-xs font-mono font-bold hidden landscape:md:inline">
                <span>Free Astrite: </span>
                <strong className="text-white">{tacetStatus.accumulated.toLocaleString()}</strong>
                <span className="hidden lg:inline">/{tacetStatus.maxCap.toLocaleString()}</span>
              </span>
              {tacetStatus.accumulated > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 text-[9px] font-mono font-black uppercase tracking-wider group-hover:bg-yellow-400 group-hover:text-black transition-colors">
                  Claim
                </span>
              )}
            </button>
          )}

          {/* Astrite Counter (Unlimited Replenish removed) */}
          <div
            className="h-[38px] sm:h-[40px] px-2.5 sm:px-3.5 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm shadow-inner flex items-center space-x-1.5 cursor-default select-none"
            title={
              mounted && userState?.astrite !== undefined
                ? isSandboxGuest
                  ? "Infinite Astrite (Sandbox Mode)"
                  : `${userState.astrite.toLocaleString()} Astrite`
                : "0 Astrite"
            }
          >
            <AstriteIcon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            <span className="font-mono text-xs sm:text-sm font-bold text-gray-100" suppressHydrationWarning>
              {mounted && userState?.astrite !== undefined
                ? isSandboxGuest
                  ? "∞"
                  : formatAstriteCount(userState.astrite)
                : "0"}
            </span>
          </div>

          {/* Inventory Button (Suitcase Icon - regular accounts only) */}
          {!isSandboxGuest && (
            <button
              onClick={handleOpenInventory}
              className="hidden md:flex h-[38px] sm:h-[40px] w-[38px] sm:w-[40px] items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-yellow-400/40 text-gray-300 hover:text-yellow-400 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Inventory"
            >
              <Briefcase className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </button>
          )}

          {/* PvP Arena Button (Hidden in Sandbox) */}
          {!isSandboxGuest && (
            <button
              onClick={() => {
                handleLaunchGameMode("gym", "Combat Arena");
              }}
              className="hidden sm:flex h-[38px] sm:h-[40px] w-[38px] sm:w-[40px] items-center justify-center rounded-xl bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 hover:text-white transition-all shadow-[0_0_12px_rgba(244,63,94,0.2)] hover:scale-105 active:scale-95 cursor-pointer"
              title="PvP Battle Arena"
            >
              <Swords className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-rose-400" />
            </button>
          )}

          {/* Sandbox Guest Mode Controls or User Account Dropdown */}
          {isSandboxGuest ? (
            <div className="flex items-center space-x-1.5 sm:space-x-2 pl-1.5 sm:pl-2 border-l border-white/15">
              <div className="flex items-center space-x-1.5 h-[38px] sm:h-[40px] px-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[11px] sm:text-xs font-mono font-bold">
                <InfinityIcon className="w-4 h-4" />
                <span className="hidden sm:inline">SANDBOX</span>
              </div>
              <button
                type="button"
                onClick={handleExitSandbox}
                className="flex items-center space-x-1.5 h-[38px] sm:h-[40px] px-2.5 sm:px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-rose-300 hover:text-white text-[11px] sm:text-xs font-mono font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="Exit Sandbox Mode"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Exit</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setIsLoginModalOpen(true);
                }}
                className="flex items-center space-x-1.5 h-[38px] sm:h-[40px] px-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase text-[11px] sm:text-xs font-mono tracking-wider transition-all shadow-[0_0_15px_rgba(250,204,21,0.3)] hover:scale-105 active:scale-95 cursor-pointer"
                title="Sign In or Create Account"
              >
                <User className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            </div>
          ) : (
            /* User Account Dropdown (Profile & Sign Out) */
            <div className="relative pl-1.5 sm:pl-2 border-l border-white/15" ref={profileDropdownRef}>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setIsProfileDropdownOpen((prev) => !prev);
              }}
              className={`h-[38px] sm:h-[40px] px-2 sm:px-2.5 rounded-xl border text-xs sm:text-sm font-mono transition-all duration-150 flex items-center space-x-1.5 hover:scale-105 active:scale-95 ${
                isProfileDropdownOpen
                  ? "bg-yellow-400/15 border-yellow-400/60 text-white shadow-[0_0_15px_rgba(250,204,21,0.3)]"
                  : "bg-white/5 hover:bg-white/10 border-white/10 hover:border-yellow-400/40 text-gray-200 hover:text-white"
              }`}
              title="Account Menu"
            >
              <div className="w-6 h-6 rounded-full overflow-hidden border border-yellow-400/60 shadow-[0_0_8px_rgba(250,204,21,0.3)] flex-shrink-0 bg-black/60">
                <img
                  src={`/assets/inventory_portraits/${getPortraitFileName(currentAvatarId)}`}
                  alt="Avatar"
                  className="w-full h-full object-cover object-top"
                  onError={(e) => {
                    const t = e.currentTarget as HTMLImageElement;
                    if (t.src.endsWith(".jpeg")) {
                      t.src = `/assets/inventory_portraits/${currentAvatarId}.jpg`;
                    }
                  }}
                />
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                  isProfileDropdownOpen ? "rotate-180 text-yellow-400" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isProfileDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 mt-2 w-48 rounded-xl bg-[#0c1017]/95 border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.85)] backdrop-blur-md overflow-hidden z-50 py-1"
                >
                  {/* Account Header with Avatar */}
                  <div className="flex items-center space-x-2.5 px-3.5 py-2.5 border-b border-white/10 bg-white/[0.02]">
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-yellow-400/50 shadow-sm flex-shrink-0 bg-black/60">
                      <img
                        src={`/assets/inventory_portraits/${getPortraitFileName(currentAvatarId)}`}
                        alt="Avatar"
                        className="w-full h-full object-cover object-top"
                        onError={(e) => {
                          const t = e.currentTarget as HTMLImageElement;
                          if (t.src.endsWith(".jpeg")) {
                            t.src = `/assets/inventory_portraits/${currentAvatarId}.jpg`;
                          }
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                        Account
                      </p>
                      <p className="text-xs font-bold font-mono text-yellow-400 truncate">
                        @{userProfile?.username || currentUser?.user_metadata?.username || "Player"}
                      </p>
                    </div>
                  </div>

                  {/* Profile Option (Anime Vanguards Player Profile) */}
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setIsProfileDropdownOpen(false);
                      setIsPlayerProfileOpen(true);
                    }}
                    className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-mono font-bold text-gray-200 hover:text-white hover:bg-yellow-400/10 transition-all text-left"
                  >
                    <User className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Profile</span>
                  </button>

                  {/* Account Option (Roblox-style Username, Password & Avatar Settings) */}
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setIsAccountNavigatedFromProfile(false);
                      setIsProfileDropdownOpen(false);
                      setIsAccountModalOpen(true);
                    }}
                    className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-mono font-bold text-gray-200 hover:text-white hover:bg-yellow-400/10 transition-all text-left border-t border-white/5 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Account</span>
                  </button>

                  {/* Settings Option (Audio, Graphics, Auto-activation, etc.) */}
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setIsProfileDropdownOpen(false);
                      setIsDevOpen(true);
                    }}
                    className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-mono font-bold text-gray-200 hover:text-white hover:bg-yellow-400/10 transition-all text-left border-t border-white/5 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Settings</span>
                  </button>

                  {/* Sign Out Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      handleSignOut();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-mono font-bold text-rose-300 hover:text-rose-200 hover:bg-rose-500/15 transition-all text-left border-t border-white/5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Sign Out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

          {/* Settings Trigger for Sandbox Guests only */}
          {isSandboxGuest && (
            <button
              onClick={() => {
                soundEngine.playClick();
                setIsDevOpen(true);
              }}
              className="h-[38px] sm:h-[40px] w-[38px] sm:w-[40px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all hover:scale-105 active:scale-95 cursor-pointer ml-1.5"
              title="Settings"
            >
              <Settings className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </button>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN CONVENE STAGE & DIRECT CHARACTER RAIL */}
      {/* ========================================================================= */}
      <div className="relative z-10 flex-1 flex flex-col landscape:flex-row overflow-hidden min-h-0">
        {/* CHARACTER RAIL: TOP TAB STRIP ON PORTRAIT, LEFT SIDEBAR ON LANDSCAPE */}
        <aside className="w-full landscape:w-36 landscape:sm:w-48 landscape:md:w-56 landscape:lg:w-64 flex flex-row landscape:flex-col z-20 border-b landscape:border-b-0 landscape:border-r border-white/10 bg-[#07090ec9] backdrop-blur-lg flex-shrink-0">
          {/* Rail Header (Landscape only) */}
          <div className="px-3 py-2 border-b border-white/5 text-[10px] font-mono uppercase tracking-widest text-yellow-400 font-bold hidden landscape:flex items-center justify-between">
            <span>{isSandboxGuest ? "All Banners" : "Active Rotation"}</span>
            <span
              className="text-[9px] text-gray-400 font-normal"
              title={isSandboxGuest ? "Sandbox Mode - All Banners Active" : rotationTimerText}
              suppressHydrationWarning
            >
              {isSandboxGuest ? "Sandbox" : `${rotationMinutes}m`}
            </span>
          </div>

          {/* 1. Portrait Mode: Top Banner Choices, Sized Equally Left-to-Right, Icon-Only */}
          <div className="flex landscape:hidden w-full min-w-0 overflow-hidden px-2.5 py-2 bg-[#07090ec9] border-b border-white/10 backdrop-blur-md">
            {isSandboxGuest ? (
              /* Sandbox Mode: Scrollable equal icon buttons (left to right) */
              <div
                className="flex w-full min-w-0 flex-nowrap overflow-x-auto gap-2 py-0.5 scrollbar-thin scrollbar-thumb-white/20 touch-pan-x select-none overscroll-x-contain"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {displayedCharacters.map((charId) => {
                  const char = RESONATORS[charId];
                  const preset = LIMITED_BANNER_PRESETS[charId];
                  if (!char || !preset) return null;
                  const isSelected = bannerMode === "character_limited" && selectedCharId === charId;
                  const portraitUrl =
                    char.portraitUrl ||
                    char.stillUrl ||
                    char.drawUrl ||
                    "/assets/characters/changli_portrait.png";

                  return (
                    <button
                      key={charId}
                      type="button"
                      onClick={() => handleSelectCharacter(charId)}
                      className={`relative flex-shrink-0 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-12 rounded-xl border transition-all duration-150 active:scale-95 ${
                        isSelected
                          ? "bg-gradient-to-b from-yellow-500/30 to-yellow-500/10 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.35)]"
                          : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10"
                      }`}
                      title={`${char.name} • ${preset.title}`}
                    >
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden border ${
                          isSelected
                            ? "border-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.5)]"
                            : "border-white/15 opacity-80"
                        }`}
                      >
                        <img
                          src={portraitUrl}
                          alt={char.name}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      {isSelected && (
                        <div className="absolute bottom-0 inset-x-2 h-0.5 bg-yellow-400 rounded-full shadow-[0_0_8px_#ffd15c]" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Account Mode: 3 Hourly Featured Banners Divided Exactly Equally Left-to-Right */
              <div className="grid grid-cols-3 w-full gap-2">
                {displayedCharacters.slice(0, 3).map((charId) => {
                  const char = RESONATORS[charId];
                  const preset = LIMITED_BANNER_PRESETS[charId];
                  if (!char || !preset) return null;
                  const isSelected = bannerMode === "character_limited" && selectedCharId === charId;
                  const element = char.element || preset.element;
                  const portraitUrl =
                    char.portraitUrl ||
                    char.stillUrl ||
                    char.drawUrl ||
                    "/assets/characters/changli_portrait.png";

                  return (
                    <button
                      key={charId}
                      type="button"
                      onClick={() => handleSelectCharacter(charId)}
                      className={`relative flex items-center justify-center py-2 sm:py-2.5 rounded-xl border transition-all duration-150 active:scale-95 ${
                        isSelected
                          ? "bg-gradient-to-b from-yellow-500/30 via-yellow-500/15 to-transparent border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.35)]"
                          : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 hover:border-white/20"
                      }`}
                      title={`${char.name} • ${preset.title}`}
                    >
                      {/* Character Icon */}
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden border transition-all ${
                          isSelected
                            ? "border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)] scale-105"
                            : "border-white/15 opacity-75 group-hover:opacity-100"
                        }`}
                      >
                        <img
                          src={portraitUrl}
                          alt={char.name}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>

                      {/* Element Badge (Top Right) */}
                      {element && (
                        <div className="absolute top-1 right-1 z-10">
                          <ElementBadge element={element} size={15} className="w-4 h-4" />
                        </div>
                      )}

                      {/* Bottom Active Indicator Line */}
                      {isSelected && (
                        <div className="absolute bottom-0 inset-x-3 h-0.5 bg-yellow-400 rounded-full shadow-[0_0_8px_#ffd15c]" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Landscape Mode (Side Rail) */}
          {isSandboxGuest ? (
            /* SANDBOX MODE: Full Scrollable Resonator List */
            <div className="hidden landscape:flex flex-1 flex-col overflow-y-auto px-2 py-2 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
              {displayedCharacters.map((charId) => {
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
                    element={char.element || preset.element}
                    isSelected={isSelected}
                    isUnavailable={preset.isUnavailable}
                    isComingSoon={preset.isComingSoon}
                    onSelect={handleSelectCharacter}
                  />
                );
              })}
            </div>
          ) : (
            /* ACCOUNT MODE: 3 Tall Cards with Full Splash Art, Small Element Type at Top-Left, and Active Badge at Top-Right */
            <div className="hidden landscape:flex flex-1 flex-col gap-2 p-2 min-h-0 justify-start sm:justify-between overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
              {displayedCharacters.slice(0, 3).map((charId) => {
                const char = RESONATORS[charId];
                const preset = LIMITED_BANNER_PRESETS[charId];
                if (!char || !preset) return null;

                const isSelected = bannerMode === "character_limited" && selectedCharId === charId;
                const portraitFile = getPortraitFileName(charId);
                const element = char.element || preset.element;

                return (
                  <button
                    key={charId}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      handleSelectCharacter(charId);
                    }}
                    className={`group relative flex-1 min-h-[90px] w-full rounded-xl overflow-hidden text-left transition-all duration-300 border flex flex-col justify-end p-2 sm:p-2.5 cursor-pointer select-none ${
                      isSelected
                        ? "border-yellow-400 ring-2 ring-yellow-400/40 shadow-[0_0_20px_rgba(250,204,21,0.35)] scale-[1.02] z-10"
                        : "border-white/10 hover:border-white/30 opacity-70 hover:opacity-100 hover:scale-[1.01]"
                    }`}
                  >
                    {/* Splash Art Used in Inventory */}
                    <img
                      src={`/assets/inventory_portraits/${portraitFile}`}
                      alt={char.name}
                      className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Gradient Overlay for Readability */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10 transition-opacity ${
                        isSelected ? "opacity-90" : "opacity-80 group-hover:opacity-70"
                      }`}
                    />

                    {/* Small Element Type (Top Left) */}
                    {element && (
                      <div className="absolute top-2 left-2 z-10">
                        <ElementBadge element={element} size={20} className="w-5 h-5 sm:w-5.5 sm:h-5.5 shadow-md" />
                      </div>
                    )}

                    {/* Active / Status Tag (Top Right) */}
                    <div className="absolute top-2 right-2 z-10">
                      {isSelected ? (
                        <span className="px-2 py-0.5 rounded-full bg-yellow-400 text-black text-[9px] font-black uppercase font-mono tracking-wider shadow-[0_0_10px_rgba(250,204,21,0.8)]">
                          ACTIVE
                        </span>
                      ) : preset.isComingSoon ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/80 text-white text-[9px] font-mono font-bold uppercase">
                          SOON
                        </span>
                      ) : preset.isUnavailable ? (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/80 text-white text-[9px] font-mono font-bold uppercase">
                          N/A
                        </span>
                      ) : null}
                    </div>

                    {/* Character Name & Banner Info (Bottom) */}
                    <div className="relative z-10 flex flex-col min-w-0">
                      <span className="text-[10px] font-mono text-yellow-400/90 font-semibold truncate uppercase tracking-wider drop-shadow-sm">
                        {preset.title}
                      </span>
                      <span className="text-xs sm:text-sm font-black text-white tracking-wide truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                        {char.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* Center Stage: Framed Banner Presentation (Matches reference mockup box) */}
        <section className="relative flex-1 m-2 sm:m-3 md:m-3.5 rounded-2xl border border-white/10 bg-[#07090e] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col justify-between p-3.5 sm:p-6 md:p-8 min-h-0">
          {/* Top-Right Info Button (Resonator Info: Guide-style Question Mark Icon) */}
          <div className="absolute top-3 right-3 sm:top-5 sm:right-5 z-30 pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setIsResonatorInfoOpen(true);
              }}
              className="group p-1.5 sm:p-2 rounded-full bg-[#120e04]/90 hover:bg-[#1a1406] border-2 border-yellow-500/85 hover:border-yellow-400 text-yellow-400 hover:text-yellow-300 transition-all hover:scale-110 active:scale-95 shadow-[0_0_15px_rgba(234,179,8,0.3)] hover:shadow-[0_0_22px_rgba(250,204,21,0.5)] backdrop-blur-md cursor-pointer flex items-center justify-center"
              title={`Resonator Info - ${currentChar?.name || "Resonator"}`}
            >
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 group-hover:text-yellow-300 transition-colors" />
            </button>
          </div>

          {/* Banner Meta Info (Top Left of Stage) */}
          <div className="relative z-20 max-w-xl space-y-2 sm:space-y-3 pointer-events-auto">
            <AnimatePresence initial={false}>
              <motion.div
                key={`${bannerMode}-${selectedCharId}`}
                initial={{ opacity: 0.3 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
                className="space-y-1.5 sm:space-y-2.5"
              >
                {/* 1. Header category */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs sm:text-base md:text-xl font-bold text-[#fef08a] tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
                    Featured Resonator Convene
                  </span>
                </div>

                {/* 2. Main Banner Title */}
                <h2 className="text-xl sm:text-3xl md:text-5xl lg:text-6xl font-black tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
                  {currentPreset?.isUnavailable
                    ? (currentPreset.unavailableBannerTitle || "Unavailable for Now")
                    : currentPreset?.isComingSoon
                    ? "Coming Soon"
                    : currentPreset.title}
                </h2>

                {/* 3. Time Remaining with Clock Icon */}
                <div className="flex items-center space-x-1.5 sm:space-x-2 text-[11px] sm:text-sm md:text-base font-bold text-[#fef08a] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                  <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-[#fef08a] shrink-0" />
                  <span>{isSandboxGuest ? "Sandbox: All Banners Open" : rotationTimerText}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Hero Splash Canvas - Fits exactly into the reference box */}
          <div className={`splash-art-container absolute inset-0 w-full h-full pointer-events-none overflow-hidden flex items-center ${
            isV2 ? "justify-start" : "justify-end pr-0 md:pr-12"
          }`}>
            <AnimatePresence initial={false}>
              <motion.div
                key={`art-${selectedCharId}`}
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                className={`relative w-full h-full flex items-center ${
                  isV2 ? "justify-start" : "justify-end"
                }`}
              >
                <img
                  src={
                    currentChar.splashUrl ||
                    currentChar.stillUrl ||
                    currentChar.drawUrl ||
                    currentChar.portraitUrl ||
                    "/assets/characters/changli_splash_v2.jpeg"
                  }
                  alt={currentChar.name}
                  decoding="async"
                  style={
                    charFocal
                      ? ({
                          "--char-focal": `${charFocal.x}% ${charFocal.y}%`,
                        } as React.CSSProperties)
                      : undefined
                  }
                  className={`splash-art-img h-full w-full select-none pointer-events-none ${
                    isV2
                      ? "object-cover object-center drop-shadow-[0_15px_35px_rgba(0,0,0,0.85)]"
                      : "object-contain object-right pr-4 md:pr-12 drop-shadow-[0_20px_45px_rgba(0,0,0,0.95)]"
                  }`}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Pity Status Widget (Bottom-Left of Banner Stage) */}
          <div className="relative z-20 flex items-center space-x-2 sm:space-x-4 bg-black/75 border border-white/15 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl backdrop-blur-md w-fit shadow-lg">
            <div className="flex flex-col">
              <span className="text-[9px] sm:text-[10px] uppercase font-mono text-gray-400">5-Star Pity</span>
              <div className="flex items-baseline space-x-1">
                <span
                  className={`text-sm sm:text-base font-bold font-mono ${
                    currentPity.pity5Star >= 66 ? "text-amber-300 animate-pulse" : "text-yellow-400"
                  }`}
                >
                  {currentPity.pity5Star}
                </span>
                <span className="text-[10px] sm:text-xs font-mono text-gray-500">/ 80</span>
              </div>
            </div>

            <div className="h-5 sm:h-6 w-px bg-white/15" />

            <div className="flex flex-col">
              <span className="text-[9px] sm:text-[10px] uppercase font-mono text-gray-400">4-Star Pity</span>
              <div className="flex items-baseline space-x-1">
                <span className="text-sm sm:text-base font-bold font-mono text-purple-300">
                  {currentPity.pity4Star}
                </span>
                <span className="text-[10px] sm:text-xs font-mono text-gray-500">/ 10</span>
              </div>
            </div>

            <div className="h-5 sm:h-6 w-px bg-white/15" />

            <div className="flex flex-col">
              <span className="text-[9px] sm:text-[10px] uppercase font-mono text-gray-400">Rate Status</span>
              <span
                className={`text-[11px] sm:text-xs font-bold font-mono ${
                  currentPity.guaranteedLimited
                    ? "text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.85)] animate-pulse"
                    : "text-emerald-400"
                }`}
              >
                {currentPity.guaranteedLimited
                  ? "★ 100% Guaranteed"
                  : "50/50 Chance"}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* 3. BOTTOM FOOTER HUD (DETAILS, HISTORY & DUAL CONVENE BUTTONS) */}
      {/* ========================================================================= */}
      <footer className="relative z-20 flex flex-row items-center justify-between px-2.5 sm:px-6 md:px-8 py-2 sm:py-3 border-t border-white/10 bg-black/75 backdrop-blur-md gap-2 sm:gap-4 flex-shrink-0">
        {/* Left: Notice, Inventory & Games Buttons */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
          <button
            onClick={() => {
              soundEngine.playClick();
              setIsDetailsOpen(true);
            }}
            className="h-[38px] sm:h-[40px] px-2.5 sm:px-3.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 text-[11px] sm:text-xs font-display font-bold uppercase tracking-wider text-gray-300 hover:text-white transition-all hover:scale-105 active:scale-95 whitespace-nowrap flex items-center space-x-1.5 cursor-pointer"
            title="Disclaimer"
          >
            <Shield className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-yellow-400" />
            <span className="hidden sm:inline">Disclaimer</span>
          </button>

          <button
            onClick={handleOpenInventory}
            className="h-[38px] sm:h-[40px] px-2.5 sm:px-3.5 rounded-xl bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/40 text-[11px] sm:text-xs font-display font-bold uppercase tracking-wider text-yellow-400 hover:text-yellow-300 transition-all hover:scale-105 active:scale-95 whitespace-nowrap cursor-pointer flex items-center space-x-1.5"
            title="Open Inventory"
          >
            <Briefcase className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-yellow-400" />
            <span className="hidden sm:inline">Inventory</span>
          </button>

          {!isSandboxGuest && (
            <button
              onClick={() => {
                soundEngine.playClick();
                setIsGamesMenuOpen(true);
              }}
              className="h-[38px] sm:h-[40px] px-2.5 sm:px-3.5 rounded-xl bg-gradient-to-r from-purple-600/20 to-rose-500/20 hover:from-purple-600/30 hover:to-rose-500/30 border border-purple-400/40 text-[11px] sm:text-xs font-display font-bold uppercase tracking-wider text-purple-200 hover:text-white transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(168,85,247,0.25)] whitespace-nowrap cursor-pointer flex items-center space-x-1.5"
              title="Game Modes & Battle"
            >
              <Gamepad2 className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-purple-400" />
              <span className="hidden sm:inline">Games</span>
            </button>
          )}
        </div>

        {/* Right: Exact Dual Pill-shaped Convene Buttons with Astrite */}
        <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
          {/* Convene 1 */}
          <button
            disabled={isPulling}
            onClick={() => handlePull(1)}
            className="group relative flex flex-col items-center justify-center px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-[#171d2b] hover:bg-[#202738] border border-white/25 hover:border-yellow-400/60 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none min-w-[64px] sm:min-w-[130px] shadow-md"
          >
            <span className="font-display text-xs sm:text-xs font-black uppercase tracking-wider text-white group-hover:text-yellow-400 transition-colors whitespace-nowrap">
              {currentPreset?.isUnavailable ? (
                "Unavailable"
              ) : currentPreset?.isComingSoon ? (
                "Soon"
              ) : (
                <>
                  <span className="portrait:inline landscape:sm:hidden">1X</span>
                  <span className="hidden landscape:sm:inline">Convene 1</span>
                </>
              )}
            </span>
            <div className="hidden landscape:flex items-center space-x-1 sm:space-x-1.5 mt-0.5">
              <AstriteIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="font-mono text-[10px] sm:text-xs font-bold text-gray-200">160</span>
            </div>
          </button>

          {/* Convene 10 */}
          <button
            disabled={isPulling}
            onClick={() => handlePull(10)}
            className="group relative flex flex-col items-center justify-center px-4.5 sm:px-8 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:via-amber-300 hover:to-yellow-400 text-black border border-yellow-300 shadow-[0_0_22px_rgba(250,204,21,0.55)] font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none min-w-[72px] sm:min-w-[160px]"
          >
            <span className="font-display text-xs sm:text-xs font-black uppercase tracking-wider text-black whitespace-nowrap">
              {currentPreset?.isUnavailable ? (
                "Unavailable"
              ) : currentPreset?.isComingSoon ? (
                "Soon"
              ) : (
                <>
                  <span className="portrait:inline landscape:sm:hidden">10X</span>
                  <span className="hidden landscape:sm:inline">Convene 10</span>
                </>
              )}
            </span>
            <div className="hidden landscape:flex items-center space-x-1 sm:space-x-1.5 mt-0.5">
              <AstriteIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="font-mono text-[10px] sm:text-xs font-black text-black">1,600</span>
            </div>
          </button>
        </div>
      </footer>
    </>
  )}

      {/* ========================================================================= */}
      {/* 4. ACTIVE CONVENE VIDEO & REVEAL OVERLAY */}
      {/* ========================================================================= */}
      {isPulling && conveneResult && (
        <ConveneVideoPlayer
          results={conveneResult.results}
          highestRarity={conveneResult.highestRarity}
          goldIndices={conveneResult.goldIndices}
          purpleIndices={conveneResult.purpleIndices}
          bannerType="character_limited"
          onFinish={() => {
            isPullingRef.current = false;
            setIsPulling(false);
            setConveneResult(null);

            // Show Cash Back notification AFTER the summary is closed!
            if (pendingCashBackRef.current > 0) {
              const refunded = pendingCashBackRef.current;
              pendingCashBackRef.current = 0;
              setToastMessage(
                `✨ 5★ Cash Back: +${refunded.toLocaleString()} Astrite (${refunded / 160} Convenes) Refunded!`
              );
              setTimeout(() => setToastMessage(null), 5000);
            }
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 5. POPUP MODALS */}
      {/* ========================================================================= */}
      {/* Resonator Intel & Kit Modal */}
      {isResonatorInfoOpen && (
        <ResonatorInfoModal
          isOpen={isResonatorInfoOpen}
          onClose={() => setIsResonatorInfoOpen(false)}
          resonator={currentChar}
          preset={currentPreset}
        />
      )}

      <DetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />

      <DevSettingsModal
        isOpen={isDevOpen}
        onClose={() => setIsDevOpen(false)}
        isSandbox={isSandboxGuest}
        onExitSandbox={handleExitSandbox}
        onResetSandbox={handleResetSandbox}
        onEnterSandbox={handleEnterSandbox}
      />

      <InventoryModal
        isOpen={isInventoryOpen}
        onClose={() => {
          setIsInventoryOpen(false);
          setInspectedInventory(null);
          setIsInventoryNavigatedFromProfile(false);
        }}
        onBack={
          isInventoryNavigatedFromProfile
            ? () => {
                setIsInventoryOpen(false);
                setInspectedInventory(null);
                setIsInventoryNavigatedFromProfile(false);
                setIsPlayerProfileOpen(true);
              }
            : undefined
        }
        inventory={inspectedInventory ? inspectedInventory.items : inventoryList}
        username={
          inspectedInventory
            ? inspectedInventory.username
            : userProfile?.username || currentUser?.user_metadata?.username || "Player"
        }
        currentUserId={inspectedInventory?.isReadOnly ? undefined : currentUser?.id}
        isLoading={isInventoryLoading}
        isReadOnly={inspectedInventory ? inspectedInventory.isReadOnly : false}
      />

      <PlayerProfileModal
        isOpen={isPlayerProfileOpen}
        onClose={() => {
          setIsPlayerProfileOpen(false);
          setVisitedPlayerProfile(null);
        }}
        currentUserId={currentUser?.id}
        currentUsername={userProfile?.username || currentUser?.user_metadata?.username || "Player"}
        currentAvatarId={currentAvatarId}
        onAvatarChanged={(newAvatarId) => {
          setCurrentAvatarId(newAvatarId);
          setUserProfile((prev: any) => (prev ? { ...prev, avatar_id: newAvatarId } : prev));
        }}
        initialShowcaseIds={userProfile?.showcase_ids}
        initialCustomTitle={userProfile?.custom_title || currentUser?.user_metadata?.custom_title || getStoredUserTitle(currentUser?.id)}
        astrite={userState?.astrite ?? userProfile?.astrite ?? 0}
        pity5Star={pityMap[bannerMode]?.pity5Star ?? userProfile?.pity_5star ?? 0}
        inventory={inventoryList}
        winRateFormatted={winRateStats.winRateFormatted}
        totalPulls={userProfile?.total_pulls ?? getTotalPullsCount()}
        isVip={userProfile?.is_vip}
        loginStreak={userProfile?.login_streak ?? getStoredLoginStreak(currentUser?.id).streak}
        maxLoginStreak={userProfile?.max_login_streak ?? getStoredLoginStreak(currentUser?.id).maxStreak}
        visitedProfile={visitedPlayerProfile}
        onVisitedProfileChange={setVisitedPlayerProfile}
        onAstriteClaimed={(rewardAmount) => {
          grantClientCurrency(rewardAmount, currentUser?.id, isSandboxGuest);
          setUserState((prev: any) => ({
            ...prev,
            astrite: (prev?.astrite || 0) + rewardAmount,
          }));
          fetchState();
          setToastMessage(`✨ Claimed Title Reward: +${rewardAmount.toLocaleString()} Astrite!`);
          setTimeout(() => setToastMessage(null), 4000);
        }}
        onInspectInventory={(targetInventory, targetUsername, isReadOnly) => {
          setInspectedInventory({
            items: targetInventory,
            username: targetUsername,
            isReadOnly,
          });
          setIsInventoryNavigatedFromProfile(true);
          setIsPlayerProfileOpen(false);
          setIsInventoryOpen(true);
        }}
        onOpenAccountModal={() => {
          setIsPlayerProfileOpen(false);
          setIsAccountNavigatedFromProfile(true);
          setIsAccountModalOpen(true);
        }}
        onOpenPvpArena={(targetUsername) => {
          setIsPlayerProfileOpen(false);
          handleLaunchGameMode("search", "Player Challenge", targetUsername);
        }}
        onSendGift={(giftAmount) => {
          const updated = grantClientCurrency(-giftAmount, currentUser?.id, isSandboxGuest);
          if (currentUser && !isSandboxGuest) {
            updateUserProfile(currentUser.id, {
              astrite: updated.astrite,
            }).catch(() => {});
          }
          setUserState((prev: any) => ({
            ...prev,
            astrite: updated.astrite,
          }));
          fetchState();
        }}
      />

      <PvPArenaModal
        isOpen={isPvpArenaOpen}
        onClose={() => {
          setIsPvpArenaOpen(false);
          setPvpOpponentUsername(undefined);
          setPvpRoomCode(undefined);
          setPvpBet(undefined);
          setPvpIsHost(undefined);
        }}
        onBackToGames={() => {
          setIsPvpArenaOpen(false);
          setPvpOpponentUsername(undefined);
          setPvpRoomCode(undefined);
          setPvpBet(undefined);
          setPvpIsHost(undefined);
          setIsGamesMenuOpen(true);
        }}
        currentUserId={isSandboxGuest ? undefined : currentUser?.id}
        currentUsername={userProfile?.username || currentUser?.user_metadata?.username || "Player"}
        currentAvatarId={currentAvatarId}
        inventory={inventoryList}
        showcaseIds={userProfile?.showcase_ids}
        initialOpponentUsername={pvpOpponentUsername}
        initialTab={pvpInitialTab}
        initialRoomCode={pvpRoomCode}
        initialBet={pvpBet}
        initialIsHost={pvpIsHost}
        userAstrite={userState?.astrite ?? 0}
        isSessionDisplaced={isDisplaced}
        onAstriteReward={(reward) => {
          const updated = grantClientCurrency(reward, currentUser?.id, isSandboxGuest);
          if (currentUser && !isSandboxGuest) {
            updateUserProfile(currentUser.id, {
              astrite: updated.astrite,
            }).catch(() => {});
          }
          setUserState((prev: any) => ({
            ...prev,
            astrite: updated.astrite,
          }));
          fetchState();
          setToastMessage(`✨ Victory Reward: +${reward} Astrite!`);
          setTimeout(() => setToastMessage(null), 4000);
        }}
        onAstriteChange={(delta) => {
          const updated = grantClientCurrency(delta, currentUser?.id, isSandboxGuest);
          if (currentUser && !isSandboxGuest) {
            updateUserProfile(currentUser.id, {
              astrite: updated.astrite,
            }).catch(() => {});
          }
          setUserState((prev: any) => ({
            ...prev,
            astrite: updated.astrite,
          }));
          fetchState();
          if (delta < 0) {
            setToastMessage(`⚔️ Match Bet Placed: ${Math.abs(delta)} Astrite`);
          } else if (delta > 0) {
            setToastMessage(`🏆 Victory Pot Claimed: +${delta} Astrite!`);
          }
          setTimeout(() => setToastMessage(null), 4000);
        }}
      />

      <PvpDisconnectNoticeModal
        notice={pendingPvpNotice}
        onAcknowledge={handleAcknowledgePvpNotice}
      />

      {/* Game Mode Selection Popup Modal */}
      <AnimatePresence>
        {isGamesMenuOpen && (
          <div
            className="fixed inset-0 z-[110] flex flex-col items-center justify-center p-2 sm:p-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-black/95 backdrop-blur-md select-none overflow-y-auto"
            onClick={() => {
              soundEngine.playClick();
              setIsGamesMenuOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative max-w-2xl w-full max-h-[85dvh] sm:max-h-[88dvh] bg-[#0c1017] border border-purple-500/40 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.9),0_0_30px_rgba(168,85,247,0.25)] flex flex-col overflow-hidden text-gray-200 my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Pinned Sticky Header - Always 100% visible on all mobile & desktop viewports */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-white/10 bg-[#0a0d17]/95 sticky top-0 z-30 flex-shrink-0">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                    <Gamepad2 className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white font-display flex items-center space-x-2">
                      <span>Combat &amp; Game Modes</span>
                    </h3>
                    <p className="text-[11px] sm:text-xs font-mono text-gray-400">
                      Choose a game mode to deploy your Resonator team
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setIsGamesMenuOpen(false);
                  }}
                  className="group p-2 sm:p-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/35 text-purple-200 hover:text-white transition-all border border-purple-400/40 hover:border-purple-400/70 active:scale-95 cursor-pointer flex-shrink-0 min-w-[38px] min-h-[38px] flex items-center justify-center shadow-[0_0_12px_rgba(168,85,247,0.25)]"
                  title="Close Games Menu"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] text-purple-200 group-hover:text-white group-hover:rotate-90 transition-transform duration-200" />
                </button>
              </div>

              {/* Scrollable Game Modes Body */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 scrollbar-thin scrollbar-thumb-white/15">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 1. Gym Trials */}
                  <button
                    type="button"
                    onClick={() => {
                      handleLaunchGameMode("gym", "Gym Trials");
                    }}
                    className="p-3.5 sm:p-4 rounded-xl border border-yellow-500/30 bg-gradient-to-br from-yellow-950/20 via-black/40 to-black/60 hover:border-yellow-400/70 hover:bg-yellow-950/30 transition-all text-left group shadow-sm flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-xl bg-yellow-400/15 border border-yellow-400/30 text-yellow-400 group-hover:scale-105 transition-transform">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-yellow-400/15 text-yellow-300 border border-yellow-400/30 text-[9px] font-mono font-bold">
                        DAILY BOUNTY
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white group-hover:text-yellow-300 transition-colors flex items-center space-x-1.5">
                        <span>Gym Trials</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h4>
                      <p className="text-xs text-gray-300 leading-relaxed font-mono">
                        Battle every playable Resonator as a boss across 5 difficulty stages (Lv. 40–100). Earn daily Astrite bounties and Combat EXP!
                      </p>
                    </div>
                  </button>

                  {/* 2. Tower of Adversity */}
                  <button
                    type="button"
                    onClick={() => {
                      handleLaunchGameMode("tower", "Tower of Adversity");
                    }}
                    className="p-3.5 sm:p-4 rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-950/20 via-black/40 to-black/60 hover:border-purple-400/70 hover:bg-purple-950/30 transition-all text-left group shadow-sm flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-400/30 text-purple-400 group-hover:scale-105 transition-transform">
                        <Crown className="w-5 h-5 text-purple-400" />
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[9px] font-mono font-bold">
                        ROGUE-LITE
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors flex items-center space-x-1.5">
                        <span>Tower of Adversity</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h4>
                      <p className="text-xs text-gray-300 leading-relaxed font-mono">
                        Ascend infinite perilous floors with locked squad and persistent HP. Draft 3 blessings after each floor and see how far you can last!
                      </p>
                    </div>
                  </button>

                  {/* 3. Live 1v1 Arena */}
                  <button
                    type="button"
                    onClick={() => {
                      handleLaunchGameMode("live", "Live 1v1 Arena");
                    }}
                    className="p-3.5 sm:p-4 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-black/40 to-black/60 hover:border-emerald-400/70 hover:bg-emerald-950/30 transition-all text-left group shadow-sm flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 group-hover:scale-105 transition-transform">
                        <Radio className="w-5 h-5" />
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono font-bold">
                        MULTIPLAYER
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center space-x-1.5">
                        <span>Live 1v1 Arena</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h4>
                      <p className="text-xs text-gray-300 leading-relaxed font-mono">
                        Real-time peer battles with custom room codes, 60s team prep phase, fixed Lv. 100 normalization, and optional Astrite betting pots.
                      </p>
                    </div>
                  </button>

                  {/* 4. Player Challenge */}
                  <button
                    type="button"
                    onClick={() => {
                      handleLaunchGameMode("search", "Player Challenge");
                    }}
                    className="p-3.5 sm:p-4 rounded-xl border border-rose-500/30 bg-gradient-to-br from-rose-950/20 via-black/40 to-black/60 hover:border-rose-400/70 hover:bg-rose-950/30 transition-all text-left group shadow-sm flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 group-hover:scale-105 transition-transform">
                        <Search className="w-5 h-5" />
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[9px] font-mono font-bold">
                        ASYNC PVP
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors flex items-center space-x-1.5">
                        <span>Player Challenge</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h4>
                      <p className="text-xs text-gray-300 leading-relaxed font-mono">
                        Search for any player by username and battle against their showcase team in tournament standard Lv. 100 combat.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ProfileModal
        isOpen={isAccountModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          setIsAccountNavigatedFromProfile(false);
        }}
        onBack={
          isAccountNavigatedFromProfile
            ? () => {
                setIsAccountModalOpen(false);
                setIsAccountNavigatedFromProfile(false);
                setIsPlayerProfileOpen(true);
              }
            : undefined
        }
        userId={currentUser?.id || ""}
        currentUsername={userProfile?.username || currentUser?.user_metadata?.username || "Player"}
        currentAvatarId={currentAvatarId}
        createdAt={currentUser?.created_at}
        currentBirthday={userProfile?.birthday}
        birthdayLastChangedAt={userProfile?.birthday_last_changed_at}
        onBirthdayChanged={(newBirthday, newLastChanged) => {
          setUserProfile((prev: any) =>
            prev
              ? {
                  ...prev,
                  birthday: newBirthday,
                  birthday_last_changed_at: newLastChanged,
                }
              : prev
          );
        }}
        onUsernameChanged={(newUsername) => {
          if (userProfile) {
            setUserProfile((prev) => (prev ? { ...prev, username: newUsername } : null));
          }
          if (currentUser) {
            setCurrentUser((prev) =>
              prev
                ? {
                    ...prev,
                    user_metadata: { ...prev.user_metadata, username: newUsername },
                  }
                : null
            );
          }
        }}
        onAvatarChanged={(newAvatarId) => {
          setCurrentAvatarId(newAvatarId);
          setUserProfile((prev: any) => (prev ? { ...prev, avatar_id: newAvatarId } : prev));
        }}
      />

      {/* Update Log & Suggestion Modal */}
      <UpdateLogModal
        isOpen={isUpdateLogOpen}
        onClose={() => setIsUpdateLogOpen(false)}
        currentUsername={userProfile?.username || currentUser?.user_metadata?.username || "Player"}
      />

      {/* How to Play Guide Modal */}
      <HowToPlayModal
        isOpen={isHowToPlayOpen}
        onClose={() => setIsHowToPlayOpen(false)}
      />

      {/* Global External Link Redirect Confirmation Modal */}
      <ExternalRedirectModal />

      {/* Global Rate Limit Warning Modal */}
      <SlowDownModal />

      {/* Account Logged In Elsewhere (Session Displacement) Modal */}
      <SessionDisplacedModal
        isOpen={isDisplaced}
        onPreferThisSession={preferThisSession}
        username={userProfile?.username || currentUser?.user_metadata?.username || "Player"}
      />

      {/* Coming Soon Notice Modal */}
      <AnimatePresence>
        {comingSoonNotice && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 select-none"
            style={{ backgroundColor: "#000000f2" }}
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
                      Coming Soon
                    </h3>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      <strong className="text-yellow-400 font-bold">{currentChar.name}</strong> hasn&apos;t been released yet. Stay tuned for upcoming banners!
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 select-none"
            style={{ backgroundColor: "#000000f2" }}
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

              {/* Choice to Claim Free Astrite or Exit */}
              <div className="flex flex-col gap-2 pt-1">
                {tacetStatus.accumulated > 0 ? (
                  <button
                    onClick={() => {
                      handleClaimTacetField();
                      setShowInsufficientModal(false);
                    }}
                    className="flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:via-amber-300 hover:to-yellow-400 text-black font-black uppercase text-xs tracking-wider transition-all shadow-[0_0_20px_rgba(250,204,21,0.4)] hover:scale-102 active:scale-95"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Claim Free Astrite (+{tacetStatus.accumulated.toLocaleString()})</span>
                  </button>
                ) : (
                  <p className="text-[11px] font-mono text-gray-400 text-center px-2 py-1 bg-white/[0.03] border border-white/5 rounded-lg">
                    Earn 160 Free Astrite every 6 mins (top right) or +800 Astrites via 5★ Cash Back!
                  </p>
                )}

                {/* Exit Button */}
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setShowInsufficientModal(false);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 text-gray-300 hover:text-white font-bold uppercase text-xs tracking-wider transition-all active:scale-95"
                >
                  {tacetStatus.accumulated > 0 ? "Cancel" : "Understood"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification (Free Astrites / Milestone Rebate) */}
      <AnimatePresence>
        {toastMessage && activeView !== "plaza" && (
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -25, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl bg-[#0a0e17] border border-yellow-400/50 shadow-[0_0_30px_rgba(250,204,21,0.35)] flex items-center space-x-2.5 text-xs font-mono font-bold text-yellow-300 pointer-events-none"
          >
            <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse flex-shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login & Cloud Sync Modal */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160]"
          >
            <LoginGateway
              onLoginSuccess={(user, prof, isNew) => {
                handleLoginSuccess(user, prof, isNew);
                setIsLoginModalOpen(false);
              }}
              onEnterSandbox={() => {
                soundEngine.playClick();
                setIsSandboxGuest(true);
                setIsLoginModalOpen(false);
                setClientSimContext(null, true);
                toggleClientSandbox(true);
                const data = getClientStateData(null, true);
                if (data.user) setUserState(data.user);
                if (data.pity) setPityMap(data.pity as any);
                setWinRateStats(get5050Stats(null, true));
                if (data.user?.selectedLimitedChar) {
                  setSelectedCharId(data.user.selectedLimitedChar);
                }
              }}
              onClose={() => setIsLoginModalOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};
