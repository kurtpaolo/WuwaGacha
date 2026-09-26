"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { soundEngine } from "@/lib/audio/soundEngine";
import {
  PlazaPlayer,
  PlazaNpc,
  PlazaChatMessage,
  PlazaPortal,
  DEFAULT_PLAZA_LOBBIES,
  PLAZA_MAX_PLAYERS_PER_LOBBY,
} from "@/lib/plaza/plazaTypes";
import {
  BINAN_WORLD_WIDTH,
  BINAN_WORLD_HEIGHT,
  BINAN_GRID_COLS,
  BINAN_GRID_ROWS,
  BINAN_STEP_X_PCT,
  BINAN_STEP_Y_PCT,
  BINAN_GUIDE_NPCS,
  BINAN_PORTALS,
  DEFAULT_SPAWN_PCT,
  isRoadWalkablePercent,
  isTileWalkable,
  percentToTile,
  tileToPercent,
  getNearestWalkablePercent,
  isWaterPercent,
} from "@/lib/plaza/binanMapData";
import { BinanOverworldCanvas, BinanOverworldCanvasHandle } from "./BinanOverworldCanvas";
import { PlazaRealtimeManager } from "@/lib/plaza/plazaRealtime";
import { PlazaChatOverlay } from "./PlazaChatOverlay";
import { PlazaMiniMapModal } from "./PlazaMiniMapModal";
import { PlazaJoystick } from "./PlazaJoystick";
import { SPRITE_MAP } from "@/lib/battle/resonatorMoves";
import { getPortraitFileName, DEFAULT_AVATAR_ID } from "@/lib/data/portraits";
import { getStoredUserTitle } from "@/lib/data/titles";
import { formatAstriteCount } from "@/components/gacha/ConveneStage";
import { AstriteIcon } from "@/components/ui/GameIcons";
import {
  Sparkles,
  Swords,
  Crown,
  Briefcase,
  Compass,
  Volume2,
  VolumeX,
  User,
  Zap,
  ChevronRight,
  Shield,
  HelpCircle,
  ChevronDown,
  Map as MapIcon,
  Minus,
  Plus,
  Navigation,
  X,
  SlidersHorizontal,
  Gauge,
  Settings,
  LogOut,
  Infinity as InfinityIcon,
  Coins,
  Cake,
  Calendar,
  ShieldAlert,
  AlertTriangle,
  Smartphone,
} from "lucide-react";
import { PlazaMinigamesModal, MinigameId } from "./minigames/PlazaMinigamesModal";
import { calculateAge, updateUserBirthday } from "@/lib/supabase/auth";

interface JinzhouPlazaProps {
  currentUser: any;
  userProfile: any;
  currentAvatarId?: string;
  userState: any;
  isSandboxGuest: boolean;
  isVisible?: boolean;
  onNavigate: (view: "plaza" | "convene" | "arena") => void;
  onOpenInventory: () => void;
  onOpenProfile: (targetUsername?: string) => void;
  onLaunchPvPChallenge?: (roomCode: string, bet: number, opponentUsername: string, isHost: boolean) => void;
  onOpenAccount?: () => void;
  onOpenSettings?: () => void;
  onSignOut?: () => void;
  onExitSandbox?: () => void;
  onClaimTacetField: () => void;
  tacetStatus: {
    accumulated: number;
    maxCap: number;
    isMaxed: boolean;
  };
  onUpdateAstrites?: (delta: number) => number;
  onBirthdayChanged?: (newBirthday: string, newChangedAt: string) => void;
}

// Biñan Portals & NPCs stationed at historic and civic landmarks
const DISTRICT_PORTALS = BINAN_PORTALS;
const STATIC_GUIDE_NPCS = BINAN_GUIDE_NPCS;

export const JinzhouPlaza: React.FC<JinzhouPlazaProps> = ({
  currentUser,
  userProfile,
  currentAvatarId,
  userState,
  isSandboxGuest,
  isVisible = true,
  onNavigate,
  onOpenInventory,
  onOpenProfile,
  onLaunchPvPChallenge,
  onOpenAccount,
  onOpenSettings,
  onSignOut,
  onExitSandbox,
  onClaimTacetField,
  tacetStatus,
  onUpdateAstrites,
  onBirthdayChanged,
}) => {
  const plazaRef = useRef<HTMLDivElement | null>(null);
  const realtimeRef = useRef<PlazaRealtimeManager | null>(null);
  const canvasRef = useRef<BinanOverworldCanvasHandle | null>(null);

  // Local Player Setup
  const myPlayerId = useMemo(() => {
    if (userProfile?.id) return userProfile.id;
    if (currentUser?.id) return currentUser.id;
    if (typeof window !== "undefined") {
      let guestId = sessionStorage.getItem("wuwa_plaza_guest_id");
      if (!guestId) {
        guestId = `guest_${Math.random().toString(36).slice(2, 8)}`;
        sessionStorage.setItem("wuwa_plaza_guest_id", guestId);
      }
      return guestId;
    }
    return "guest_rover";
  }, [userProfile?.id, currentUser?.id]);

  const myUsername = useMemo(() => {
    return userProfile?.username || currentUser?.user_metadata?.username || (isSandboxGuest ? "Guest Rover" : "Rover");
  }, [userProfile?.username, currentUser?.user_metadata?.username, isSandboxGuest]);

  const myAvatarId = useMemo(() => {
    return currentAvatarId || userProfile?.avatar_id || "shorekeeper";
  }, [currentAvatarId, userProfile?.avatar_id]);

  const myTitle = useMemo(() => {
    return userProfile?.title || getStoredUserTitle() || undefined;
  }, [userProfile?.title]);

  // Read saved position from localStorage so refreshing preserves location
  const getInitialPlazaPosition = () => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("wuwa_plaza_last_pos");
        if (saved) {
          const parsed = JSON.parse(saved);
          // If stored position is near old Yangyang spawn (50.2, 50.8), migrate to new red box spawn
          const isOldSpawn = Math.hypot(parsed.x - 50.2, parsed.y - 50.8) < 1.5;
          if (
            !isOldSpawn &&
            typeof parsed.x === "number" &&
            typeof parsed.y === "number" &&
            isRoadWalkablePercent(parsed.x, parsed.y)
          ) {
            return {
              x: Math.round(parsed.x * 10) / 10,
              y: Math.round(parsed.y * 10) / 10,
              facing: (parsed.facing === "left" ? "left" : "right") as "left" | "right",
            };
          }
        }
      } catch (e) {
        // ignore
      }
    }
    return {
      x: DEFAULT_SPAWN_PCT.x,
      y: DEFAULT_SPAWN_PCT.y,
      facing: "right" as "left" | "right",
    };
  };

  // Local state - Spawn at saved position or Plaza Rizal in Poblacion
  const [localPlayer, setLocalPlayer] = useState<PlazaPlayer>(() => {
    const initPos = getInitialPlazaPosition();
    return {
      id: myPlayerId,
      username: myUsername,
      avatarId: myAvatarId,
      title: myTitle,
      x: initPos.x,
      y: initPos.y,
      targetX: initPos.x,
      targetY: initPos.y,
      facing: initPos.facing,
      isMoving: false,
      isSleeping: false,
      lastActive: Date.now(),
    };
  });

  // Sync avatar, username, and title in real-time when profile updates
  useEffect(() => {
    setLocalPlayer((prev) => {
      if (prev.avatarId === myAvatarId && prev.username === myUsername && prev.title === myTitle) {
        return prev;
      }
      return {
        ...prev,
        avatarId: myAvatarId,
        username: myUsername,
        title: myTitle,
      };
    });
    realtimeRef.current?.updatePlayerProfile(myAvatarId, myUsername, myTitle);
  }, [myAvatarId, myUsername, myTitle]);

  const [peerPlayers, setPeerPlayers] = useState<Map<string, PlazaPlayer>>(new Map());
  const peerPlayersRef = useRef<Map<string, PlazaPlayer>>(new Map());
  const peerGraceRemovalRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    peerPlayersRef.current = peerPlayers;
  }, [peerPlayers]);

  const [npcs] = useState<PlazaNpc[]>(BINAN_GUIDE_NPCS);
  const [chatMessages, setChatMessages] = useState<PlazaChatMessage[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [isSleeping, setIsSleeping] = useState<boolean>(false);
  const [activePortalHover, setActivePortalHover] = useState<PlazaPortal | null>(null);
  const [selectedNpc, setSelectedNpc] = useState<PlazaNpc | null>(null);
  const [showMiniMap, setShowMiniMap] = useState<boolean>(false);

  // Proximity check for nearby NPC (expanded to ~5.2% / ~12-14 tiles)
  const NPC_PROXIMITY_RADIUS = 5.2;

  const nearbyNpc = useMemo(() => {
    return (
      BINAN_GUIDE_NPCS.find((npc) => {
        return Math.hypot(npc.x - localPlayer.x, npc.y - localPlayer.y) < NPC_PROXIMITY_RADIUS;
      }) || null
    );
  }, [localPlayer.x, localPlayer.y]);

  // Centered Map Viewport (Expanded 1260px x 900px, 7:5 aspect ratio)
  const MAP_VIEWPORT_WIDTH = 1260;
  const MAP_VIEWPORT_HEIGHT = 900;

  const mapBoxRef = useRef<HTMLDivElement | null>(null);
  const mapWorldRef = useRef<HTMLDivElement | null>(null);
  const localPlayerDivRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState({
    width: MAP_VIEWPORT_WIDTH,
    height: MAP_VIEWPORT_HEIGHT,
  });

  const worldWidth = BINAN_WORLD_WIDTH;
  const worldHeight = BINAN_WORLD_HEIGHT;

  const worldSizeRef = useRef({
    worldWidth,
    worldHeight,
    viewportWidth: MAP_VIEWPORT_WIDTH,
    viewportHeight: MAP_VIEWPORT_HEIGHT,
  });

  const joystickVectorRef = useRef<{ x: number; y: number; intensity: number } | null>(null);

  // Dynamically track rendered viewport size for perfect camera centering across screen sizes
  useEffect(() => {
    const el = mapBoxRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          const w = Math.round(width);
          const h = Math.round(height);
          setViewportSize({ width: w, height: h });
          worldSizeRef.current.viewportWidth = w;
          worldSizeRef.current.viewportHeight = h;
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Channel / Lobby state (10 players max per lobby)
  const [currentLobbyId, setCurrentLobbyId] = useState<number>(1);
  const [showTopChannelDropdown, setShowTopChannelDropdown] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dynamic channels: only have Channel 2 visible IF Channel 1 is full or user is in Channel 2
  const visibleLobbies = useMemo(() => {
    return DEFAULT_PLAZA_LOBBIES.filter((lobby) => {
      if (lobby.id === 1) return true;
      if (lobby.id === 2) return (currentLobbyId === 1 && onlineCount >= 10) || currentLobbyId >= 2;
      return currentLobbyId >= lobby.id;
    });
  }, [currentLobbyId, onlineCount]);

  // Camera POV is kept standard (fixed 1.25x scale: 0.25 * 1.25 = 0.3125)
  const CAMERA_POV_ZOOM = 0.25 * 1.25;

  // Player Movement Speed Controls: Presets: 0.5x, 1x, 1.5x, 2x
  const SPEED_PRESETS = [0.5, 1, 1.5, 2] as const;
  const [moveSpeed, setMoveSpeed] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("wuwa_plaza_speed");
      if (saved) {
        const val = parseFloat(saved);
        if (SPEED_PRESETS.some((s) => Math.abs(s - val) < 0.01)) return val;
      }
    }
    return 1;
  });
  const moveSpeedRef = useRef<number>(moveSpeed);

  // Phone Portrait Detection & Orientation Lock Notice
  const [isPhonePortrait, setIsPhonePortrait] = useState<boolean>(false);
  const [dismissPortraitNotice, setDismissPortraitNotice] = useState<boolean>(false);

  useEffect(() => {
    const handleCheckOrientation = () => {
      if (typeof window === "undefined") return;
      const isPortrait = window.innerHeight > window.innerWidth;
      const isPhone = window.innerWidth < 768;
      setIsPhonePortrait(isPortrait && isPhone);
    };
    handleCheckOrientation();
    window.addEventListener("resize", handleCheckOrientation);
    window.addEventListener("orientationchange", handleCheckOrientation);
    return () => {
      window.removeEventListener("resize", handleCheckOrientation);
      window.removeEventListener("orientationchange", handleCheckOrientation);
    };
  }, []);

  const handleCycleSpeed = useCallback(() => {
    soundEngine.playClick();
    setMoveSpeed((prev) => {
      const idx = SPEED_PRESETS.findIndex((s) => Math.abs(s - prev) < 0.01);
      const next = idx >= 0 && idx < SPEED_PRESETS.length - 1 ? SPEED_PRESETS[idx + 1] : SPEED_PRESETS[0];
      moveSpeedRef.current = next;
      if (typeof window !== "undefined") {
        localStorage.setItem("wuwa_plaza_speed", String(next));
      }
      return next;
    });
  }, []);

  const handleSpeedDown = useCallback(() => {
    soundEngine.playClick();
    setMoveSpeed((prev) => {
      const idx = SPEED_PRESETS.findIndex((s) => Math.abs(s - prev) < 0.01);
      const next = idx > 0 ? SPEED_PRESETS[idx - 1] : prev;
      moveSpeedRef.current = next;
      if (typeof window !== "undefined") {
        localStorage.setItem("wuwa_plaza_speed", String(next));
      }
      return next;
    });
  }, []);

  const handleSpeedUp = useCallback(() => {
    soundEngine.playClick();
    setMoveSpeed((prev) => {
      const idx = SPEED_PRESETS.findIndex((s) => Math.abs(s - prev) < 0.01);
      const next = idx >= 0 && idx < SPEED_PRESETS.length - 1 ? SPEED_PRESETS[idx + 1] : prev;
      moveSpeedRef.current = next;
      if (typeof window !== "undefined") {
        localStorage.setItem("wuwa_plaza_speed", String(next));
      }
      return next;
    });
  }, []);

  // Minimap NPC Waypoint Tracking
  const [trackedNpc, setTrackedNpc] = useState<PlazaNpc | null>(null);
  const trackedNpcRef = useRef<PlazaNpc | null>(null);
  const navArrowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    trackedNpcRef.current = trackedNpc;
  }, [trackedNpc]);

  useEffect(() => {
    if (!trackedNpc) return;
    const dist = Math.hypot(trackedNpc.x - localPlayer.x, trackedNpc.y - localPlayer.y);
    if (dist < NPC_PROXIMITY_RADIUS) {
      setTrackedNpc(null);
      trackedNpcRef.current = null;
      setToastMessage(`Arrived at ${trackedNpc.name}!`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  }, [trackedNpc, localPlayer.x, localPlayer.y]);

  // Account / Profile dropdown in top navigation
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState<boolean>(false);
  const profileDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Characters visual scaling (1.5x larger player size)
  const CHARACTER_SCALE = 9; // 9x internal scale = 1.5x visual size on screen

  // Player-to-Player Proximity & Real-time 1v1 Challenge
  const PLAYER_INTERACTION_RADIUS = 15.6; // ~3x NPC proximity (5.2 * 3)
  const [selectedPeer, setSelectedPeer] = useState<PlazaPlayer | null>(null);
  const [peerInteractionStep, setPeerInteractionStep] = useState<"menu" | "bet" | "waiting">("menu");
  const [selectedBet, setSelectedBet] = useState<number>(0);
  const [customBetInput, setCustomBetInput] = useState<string>("");
  const [outgoingChallenge, setOutgoingChallenge] = useState<{
    targetId: string;
    targetUsername: string;
    bet: number;
    roomCode: string;
  } | null>(null);
  const [incomingChallenge, setIncomingChallenge] = useState<{
    challengerId: string;
    challengerUsername: string;
    challengerAvatarId: string;
    bet: number;
    roomCode: string;
  } | null>(null);

  // 30s timeout for outgoing challenge
  useEffect(() => {
    if (!outgoingChallenge) return;
    const timer = setTimeout(() => {
      realtimeRef.current?.cancelChallenge(outgoingChallenge.targetId, outgoingChallenge.roomCode);
      setOutgoingChallenge(null);
      setPeerInteractionStep("menu");
      setSelectedPeer(null);
      setToastMessage("Challenge timed out (no response).");
      setTimeout(() => setToastMessage(null), 3500);
    }, 30000);
    return () => clearTimeout(timer);
  }, [outgoingChallenge]);

  // 30s timeout for incoming challenge
  useEffect(() => {
    if (!incomingChallenge) return;
    const timer = setTimeout(() => {
      realtimeRef.current?.respondChallenge(
        incomingChallenge.challengerId,
        false,
        incomingChallenge.roomCode,
        incomingChallenge.bet,
        "Challenge timed out"
      );
      setIncomingChallenge(null);
    }, 30000);
    return () => clearTimeout(timer);
  }, [incomingChallenge]);

  // Handle beforeunload to cancel or decline pending challenges when exiting website
  useEffect(() => {
    const handleUnload = () => {
      if (outgoingChallenge) {
        realtimeRef.current?.cancelChallenge(outgoingChallenge.targetId, outgoingChallenge.roomCode);
      }
      if (incomingChallenge) {
        realtimeRef.current?.respondChallenge(
          incomingChallenge.challengerId,
          false,
          incomingChallenge.roomCode,
          incomingChallenge.bet,
          "Player exited the website"
        );
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [outgoingChallenge, incomingChallenge]);

  const handlePeerClick = useCallback((peer: PlazaPlayer) => {
    const dist = Math.hypot(peer.x - localPlayer.x, peer.y - localPlayer.y);
    if (dist <= PLAYER_INTERACTION_RADIUS) {
      soundEngine.playClick();
      setSelectedPeer(peer);
      setPeerInteractionStep("menu");
      setSelectedBet(0);
      setCustomBetInput("");
    } else {
      soundEngine.playClick();
      setToastMessage(`@${peer.username} is too far away (${Math.round(dist)}m). Get closer to interact!`);
      setTimeout(() => setToastMessage(null), 3000);
    }
  }, [localPlayer.x, localPlayer.y]);

  // Continuous Smooth Movement Refs
  const heldKeysRef = useRef<Set<string>>(new Set());
  const lastFrameTimeRef = useRef<number>(Date.now());
  const lastBroadcastTimeRef = useRef<number>(0);
  const wasMovingRef = useRef<boolean>(false);
  const playerPosRef = useRef({
    x: localPlayer.x,
    y: localPlayer.y,
    targetX: localPlayer.x,
    targetY: localPlayer.y,
    facing: localPlayer.facing,
  });

  // Sound Mute Toggle
  const [isMuted, setIsMuted] = useState(false);

  // Plaza Minigames Modal State (Slots, Blackjack, Coinflip, Dice, Wheel, Scratch)
  const [minigamesModalState, setMinigamesModalState] = useState<{
    isOpen: boolean;
    initialGame: MinigameId;
  }>({ isOpen: false, initialGame: "coinflip" });

  // 18+ Age Gate & Missing Birthday Verification Modal State
  const [pendingMinigame, setPendingMinigame] = useState<MinigameId | null>(null);
  const [isAgeVerificationModalOpen, setIsAgeVerificationModalOpen] = useState(false);
  const [isAgeRestrictedModalOpen, setIsAgeRestrictedModalOpen] = useState(false);
  const [verificationBirthdayInput, setVerificationBirthdayInput] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(false);

  // Active Full-Screen Modal Ref (freezes background 60fps tick loop to eliminate lag)
  const isModalActiveRef = useRef(false);
  useEffect(() => {
    isModalActiveRef.current =
      minigamesModalState.isOpen ||
      isAgeVerificationModalOpen ||
      isAgeRestrictedModalOpen;
  }, [minigamesModalState.isOpen, isAgeVerificationModalOpen, isAgeRestrictedModalOpen]);

  const handleCloseMinigames = useCallback(() => {
    isModalActiveRef.current = false;
    setMinigamesModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleUpdateMinigameAstrites = useCallback(
    (delta: number) => {
      if (onUpdateAstrites) {
        return onUpdateAstrites(delta);
      }
      return userState?.astrite ?? 0;
    },
    [onUpdateAstrites, userState?.astrite]
  );

  // Checks age before opening any gambling minigame
  const launchMinigameWithAgeGate = useCallback(
    (gameId: MinigameId) => {
      const userBirthday =
        userProfile?.birthday ||
        (typeof window !== "undefined"
          ? localStorage.getItem(`wuwa_birthday_${currentUser?.id || "guest"}`)
          : null);

      if (!userBirthday) {
        // Missing birthday -> prompt user to set it
        setPendingMinigame(gameId);
        setVerificationBirthdayInput("");
        setVerificationError(null);
        setIsAgeVerificationModalOpen(true);
        return;
      }

      const age = calculateAge(userBirthday);
      if (age < 18) {
        // Underage -> blocked from gambling minigames
        setIsAgeRestrictedModalOpen(true);
        return;
      }

      // 18+ verified -> proceed to game
      isModalActiveRef.current = true;
      setMinigamesModalState({ isOpen: true, initialGame: gameId });
    },
    [userProfile?.birthday, currentUser?.id]
  );

  // Submit birthday from Age Verification prompt
  const handleVerifyAgeAndPlay = async (e: React.FormEvent) => {
    e.preventDefault();
    soundEngine.playClick();
    setVerificationError(null);

    const cleanDate = verificationBirthdayInput.trim();
    if (!cleanDate) {
      setVerificationError("Please select your date of birth.");
      return;
    }

    const age = calculateAge(cleanDate);
    setVerificationLoading(true);

    try {
      const nowIso = new Date().toISOString();
      if (currentUser?.id) {
        await updateUserBirthday(currentUser.id, cleanDate);
      }
      if (typeof window !== "undefined") {
        localStorage.setItem(`wuwa_birthday_${currentUser?.id || "guest"}`, cleanDate);
      }
      if (onBirthdayChanged) {
        onBirthdayChanged(cleanDate, nowIso);
      }

      setIsAgeVerificationModalOpen(false);

      if (age < 18) {
        setIsAgeRestrictedModalOpen(true);
      } else {
        if (pendingMinigame) {
          isModalActiveRef.current = true;
          setMinigamesModalState({ isOpen: true, initialGame: pendingMinigame });
        }
      }
    } catch (err: any) {
      setVerificationError(err.message || "Failed to save date of birth.");
    } finally {
      setVerificationLoading(false);
    }
  };

  // NPC Dialogue Action Trigger
  const handleNpcAction = useCallback(
    (actionId: string) => {
      soundEngine.playClick();
      setSelectedNpc(null);
      switch (actionId) {
        case "convene":
          onNavigate("convene");
          break;
        case "arena":
          onNavigate("arena");
          break;
        case "inventory":
          onOpenInventory();
          break;
        case "profile":
          onOpenProfile();
          break;
        case "minigame_coinflip":
          launchMinigameWithAgeGate("coinflip");
          break;
        case "minigame_slots":
          launchMinigameWithAgeGate("slots");
          break;
        case "minigame_blackjack":
          launchMinigameWithAgeGate("blackjack");
          break;
        case "minigame_dice":
        case "minigame_roulette":
          launchMinigameWithAgeGate("roulette");
          break;
        case "minigame_wheel":
          launchMinigameWithAgeGate("wheel");
          break;
        case "minigame_scratch":
          launchMinigameWithAgeGate("scratch");
          break;
        case "tacet": {
          const currentAcc = tacetStatus.accumulated;
          onClaimTacetField();
          if (currentAcc > 0) {
            setToastMessage(`+${currentAcc.toLocaleString()} Free Astrites Claimed!`);
            setTimeout(() => setToastMessage(null), 3500);
          } else {
            setToastMessage("Bank is empty (0 Free Astrites).");
            setTimeout(() => setToastMessage(null), 2500);
          }
          break;
        }
      }
    },
    [onNavigate, onOpenInventory, onOpenProfile, onClaimTacetField, tacetStatus, launchMinigameWithAgeGate]
  );

  // Loading transition state when confirming an NPC interaction
  const [npcLoadingTransition, setNpcLoadingTransition] = useState<{
    title: string;
    subtitle: string;
    actionId: string;
  } | null>(null);

  const handleConfirmNpc = useCallback((npc: PlazaNpc) => {
    soundEngine.playClick();
    setSelectedNpc(null);

    const primaryAction = npc.actions?.[0];
    if (!primaryAction) return;

    // Minigame actions: open immediately without loading screen
    if (primaryAction.actionId.startsWith("minigame_")) {
      handleNpcAction(primaryAction.actionId);
      return;
    }

    // Zhezhi / Free Astrites: Claim immediately without loading transition
    if (primaryAction.actionId === "tacet" || npc.id === "npc_zhezhi" || npc.name.toLowerCase() === "zhezhi") {
      handleNpcAction(primaryAction.actionId);
      return;
    }

    // Changli / Inventory: Open immediately without loading transition
    if (primaryAction.actionId === "inventory" || npc.id === "npc_changli" || npc.name.toLowerCase() === "changli") {
      handleNpcAction(primaryAction.actionId);
      return;
    }

    let title = "Loading...";
    let subtitle = "Synchronizing Resonance Terminal...";

    switch (primaryAction.actionId) {
      case "convene":
        title = "Convene Stage";
        subtitle = "Transferring to Resonance Convene Banners...";
        break;
      case "arena":
        title = "Combat & Game Modes";
        subtitle = "Preparing Tactical Deployment...";
        break;
      case "profile":
        title = "Pioneer Profile";
        subtitle = "Retrieving Rover Records...";
        break;
      default:
        title = npc.name;
        subtitle = "Connecting...";
        break;
    }

    setNpcLoadingTransition({
      title,
      subtitle,
      actionId: primaryAction.actionId,
    });
  }, [handleNpcAction]);

  useEffect(() => {
    if (!npcLoadingTransition) return;
    const timer = setTimeout(() => {
      const actionId = npcLoadingTransition.actionId;
      setNpcLoadingTransition(null);
      handleNpcAction(actionId);
    }, 750);
    return () => clearTimeout(timer);
  }, [npcLoadingTransition, handleNpcAction]);

  // Switch Lobby / Channel
  const handleSwitchLobby = useCallback((newLobbyId: number) => {
    if (newLobbyId === currentLobbyId) return;
    soundEngine.playClick();
    setCurrentLobbyId(newLobbyId);
    setPeerPlayers(new Map());
    setChatMessages((prev) => [
      ...prev.slice(-30),
      {
        id: `sys_${Date.now()}`,
        senderId: "system",
        senderName: "System",
        senderAvatarId: "system",
        text: `Transferred to Channel ${newLobbyId}.`,
        timestamp: Date.now(),
      },
    ]);
    realtimeRef.current?.switchLobby(newLobbyId);
    setToastMessage(`Switched to Channel ${newLobbyId}`);
    setTimeout(() => setToastMessage(null), 3000);
  }, [currentLobbyId]);

  // 1. Initialize Realtime Manager
  useEffect(() => {
    const manager = new PlazaRealtimeManager({
      onPlayerWaypoint: (senderId, targetX, targetY, facing, isStop, timestamp) => {
        setPeerPlayers((prev) => {
          const next = new Map(prev);
          const existing = next.get(senderId);
          if (existing) {
            // Drop out-of-order stale packets
            if (timestamp && existing.lastActive && timestamp < existing.lastActive - 1500) {
              return prev;
            }
            const dist = Math.hypot(targetX - existing.x, targetY - existing.y);
            // Only snap on huge jumps (> 40% map warp); otherwise let 60fps tick loop glide smoothly
            const shouldSnap = dist > 40.0;
            next.set(senderId, {
              ...existing,
              x: shouldSnap ? targetX : existing.x,
              y: shouldSnap ? targetY : existing.y,
              targetX,
              targetY,
              facing,
              isMoving: !isStop && dist > 0.05,
              isSleeping: false,
              lastActive: timestamp || Date.now(),
            });
          }
          return next;
        });
      },
      onPlayerHello: (payload) => {
        if (payload.senderId === myPlayerId || payload.senderId === localPlayer.id) return;

        setPeerPlayers((prev) => {
          const next = new Map(prev);
          const existing = next.get(payload.senderId);
          next.set(payload.senderId, {
            id: payload.senderId,
            username: payload.username,
            avatarId: payload.avatarId,
            title: payload.title,
            x: payload.x,
            y: payload.y,
            targetX: payload.x,
            targetY: payload.y,
            facing: payload.facing || "right",
            isMoving: false,
            isSleeping: false,
            lastActive: Date.now(),
            speechBubbles: existing?.speechBubbles,
            activeSpeechBubble: existing?.activeSpeechBubble,
            currentEmote: existing?.currentEmote,
          });
          return next;
        });

        // Greet newcomer by broadcasting our own coordinates immediately so they see us where we are
        realtimeRef.current?.broadcastWaypoint(
          playerPosRef.current.x,
          playerPosRef.current.y,
          playerPosRef.current.facing,
          true
        );
      },
      onChatMessage: (msg) => {
        const isMe =
          msg.senderId === myPlayerId ||
          msg.senderId === localPlayer.id ||
          (msg.senderName && msg.senderName === myUsername);

        // Local player's message and bubble are already added synchronously in handleSendMessage
        if (isMe) {
          return;
        }

        setChatMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev.slice(-35), msg];
        });

        const newBubble = { id: msg.id, text: msg.text, expiresAt: Date.now() + 12000 };

        setPeerPlayers((prev) => {
          const next = new Map(prev);
          const p = next.get(msg.senderId);
          if (p) {
            const active = (p.speechBubbles || []).filter((b) => b.expiresAt > Date.now());
            next.set(msg.senderId, {
              ...p,
              activeSpeechBubble: newBubble,
              speechBubbles: [...active, newBubble].slice(-5),
            });
          }
          return next;
        });
      },
      onPlayerEmote: (senderId, emoji) => {
        if (senderId === myPlayerId) {
          setLocalPlayer((prev) => ({
            ...prev,
            currentEmote: { emoji, expiresAt: Date.now() + 4000 },
          }));
        } else {
          setPeerPlayers((prev) => {
            const next = new Map(prev);
            const p = next.get(senderId);
            if (p) {
              next.set(senderId, {
                ...p,
                currentEmote: { emoji, expiresAt: Date.now() + 4000 },
              });
            }
            return next;
          });
        }
      },
      onPresenceSync: (onlineMap) => {
        setOnlineCount(onlineMap.size || 1);
        const now = Date.now();
        setPeerPlayers((prev) => {
          const next = new Map(prev);
          // 1. Instantly prune dropped peers from the map (0 ghost players!)
          for (const key of Array.from(next.keys())) {
            if (!onlineMap.has(key)) {
              next.delete(key);
              peerGraceRemovalRef.current.delete(key);
            }
          }
          // 2. Add newly joined peers or update metadata (without overriding moving coordinates!)
          for (const [id, meta] of Array.from(onlineMap.entries())) {
            peerGraceRemovalRef.current.delete(id);
            if (id !== myPlayerId && id !== localPlayer.id && meta.username !== myUsername) {
              const existing = next.get(id);
              const posX = typeof meta.x === "number" ? meta.x : DEFAULT_SPAWN_PCT.x;
              const posY = typeof meta.y === "number" ? meta.y : DEFAULT_SPAWN_PCT.y;
              if (!existing) {
                next.set(id, {
                  id,
                  username: meta.username,
                  avatarId: meta.avatarId,
                  title: meta.title,
                  x: posX,
                  y: posY,
                  targetX: posX,
                  targetY: posY,
                  facing: meta.facing || "right",
                  isMoving: false,
                  isSleeping: false,
                  lastActive: now,
                });
              } else {
                // Profile metadata updates only; only sync position on major teleport (> 40%)
                const dist = Math.hypot(existing.x - posX, existing.y - posY);
                const shouldWarp = dist > 40.0 && typeof meta.x === "number";
                next.set(id, {
                  ...existing,
                  username: meta.username || existing.username,
                  avatarId: meta.avatarId || existing.avatarId,
                  title: meta.title || existing.title,
                  x: shouldWarp ? posX : existing.x,
                  y: shouldWarp ? posY : existing.y,
                  targetX: shouldWarp ? posX : existing.targetX,
                  targetY: shouldWarp ? posY : existing.targetY,
                  facing: meta.facing || existing.facing,
                });
              }
            }
          }
          return next;
        });
      },
      onSleepStateChange: (sleeping) => {
        setIsSleeping(sleeping);
        setLocalPlayer((prev) => ({ ...prev, isSleeping: sleeping }));
      },
      onChallengeRequest: (payload) => {
        setIncomingChallenge((prev) => {
          if (prev && prev.roomCode === payload.roomCode) {
            return prev; // Ignore duplicate retry pings for same active challenge
          }
          soundEngine.playClick();
          return payload;
        });
      },
      onChallengeResponse: (payload) => {
        if (payload.challengerId === myPlayerId || payload.challengerId === localPlayer.id) {
          realtimeRef.current?.stopChallengePulse();
          if (payload.accepted) {
            soundEngine.playClick();
            setToastMessage(`@${payload.targetUsername} accepted your challenge! Entering Arena...`);
            setTimeout(() => setToastMessage(null), 3500);
            onLaunchPvPChallenge?.(payload.roomCode, payload.bet, payload.targetUsername, true);
            setSelectedPeer(null);
            setOutgoingChallenge(null);
            setPeerInteractionStep("menu");
          } else {
            soundEngine.playClick();
            setToastMessage(`@${payload.targetUsername} declined the challenge.`);
            setTimeout(() => setToastMessage(null), 3500);
            setSelectedPeer(null);
            setOutgoingChallenge(null);
            setPeerInteractionStep("menu");
          }
        }
      },
      onChallengeCancel: (payload) => {
        realtimeRef.current?.stopChallengePulse();
        setIncomingChallenge((prev) => {
          if (prev && prev.roomCode === payload.roomCode) {
            setToastMessage(`@${prev.challengerUsername} cancelled the challenge.`);
            setTimeout(() => setToastMessage(null), 3500);
            return null;
          }
          return prev;
        });
      },
    });

    manager.init(localPlayer, currentLobbyId);
    realtimeRef.current = manager;

    return () => {
      manager.destroy();
    };
  }, [myPlayerId, myUsername]);

  // 1.5 Resync on tab focus / visibility change (recovers from Alt-Tab backgrounding)
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        realtimeRef.current?.resyncOnFocus();
        if (playerPosRef.current) {
          realtimeRef.current?.broadcastWaypoint(
            playerPosRef.current.x,
            playerPosRef.current.y,
            playerPosRef.current.facing,
            true
          );
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, []);

  // 2. Keyboard Navigation (WASD / Arrow Keys) & Interaction (Space / Enter / Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in chat or another input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        heldKeysRef.current.clear();
        return;
      }

      let dir: "UP" | "DOWN" | "LEFT" | "RIGHT" | null = null;
      const key = e.key.toLowerCase();
      if (e.code === "KeyW" || e.code === "ArrowUp" || key === "w" || key === "arrowup") {
        dir = "UP";
      } else if (e.code === "KeyS" || e.code === "ArrowDown" || key === "s" || key === "arrowdown") {
        dir = "DOWN";
      } else if (e.code === "KeyA" || e.code === "ArrowLeft" || key === "a" || key === "arrowleft") {
        dir = "LEFT";
      } else if (e.code === "KeyD" || e.code === "ArrowRight" || key === "d" || key === "arrowright") {
        dir = "RIGHT";
      }

      if (dir) {
        e.preventDefault();
        heldKeysRef.current.add(dir);
      }

      // Enter or Space confirms dialogue when selectedNpc is open
      if (selectedNpc && (e.code === "Enter" || e.code === "Space")) {
        e.preventDefault();
        handleConfirmNpc(selectedNpc);
        return;
      }

      // E or Space to talk to closest NPC (Talk [E])
      if (e.code === "KeyE" || e.code === "Space" || key === "e") {
        if (!selectedNpc && !showMiniMap) {
          e.preventDefault();
          const nearby = BINAN_GUIDE_NPCS.find((npc) => {
            const dist = Math.hypot(npc.x - playerPosRef.current.x, npc.y - playerPosRef.current.y);
            return dist < NPC_PROXIMITY_RADIUS;
          });
          if (nearby) {
            soundEngine.playClick();
            setSelectedNpc(nearby);
          }
        }
      }

      // KeyM toggles Tactical Mini-Map
      if (e.code === "KeyM" || key === "m") {
        e.preventDefault();
        soundEngine.playClick();
        setShowMiniMap((prev) => !prev);
      }

      // KeyT toggles Plaza text chat history
      if ((e.code === "KeyT" || key === "t") && !selectedNpc && !showMiniMap) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("wuwa_toggle_plaza_chat_history"));
      }

      // Enter focuses Plaza chat input
      if ((e.code === "Enter" || key === "enter") && !selectedNpc && !showMiniMap) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("wuwa_focus_plaza_chat_input"));
      }

      // Escape closes dialogue or mini-map
      if (e.code === "Escape") {
        if (showMiniMap) {
          setShowMiniMap(false);
        } else if (selectedNpc) {
          setSelectedNpc(null);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (e.code === "KeyW" || e.code === "ArrowUp" || key === "w" || key === "arrowup") {
        heldKeysRef.current.delete("UP");
      }
      if (e.code === "KeyS" || e.code === "ArrowDown" || key === "s" || key === "arrowdown") {
        heldKeysRef.current.delete("DOWN");
      }
      if (e.code === "KeyA" || e.code === "ArrowLeft" || key === "a" || key === "arrowleft") {
        heldKeysRef.current.delete("LEFT");
      }
      if (e.code === "KeyD" || e.code === "ArrowRight" || key === "d" || key === "arrowright") {
        heldKeysRef.current.delete("RIGHT");
      }
    };

    const handleBlur = () => {
      heldKeysRef.current.clear();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [selectedNpc, showMiniMap]);

  // 3. Continuous 60fps Game Loop (Pokémon Deluge Grid Step Cadence & Delay)
  useEffect(() => {
    let animId: number;

    const tick = () => {
      const now = Date.now();
      if (isModalActiveRef.current) {
        lastFrameTimeRef.current = now;
        animId = requestAnimationFrame(tick);
        return;
      }
      const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameTimeRef.current) / 1000));
      lastFrameTimeRef.current = now;

      // Safe unstuck check: if player position ever becomes unwalkable, snap to nearest walkable tile
      if (!isRoadWalkablePercent(playerPosRef.current.x, playerPosRef.current.y)) {
        const safe = getNearestWalkablePercent(playerPosRef.current.x, playerPosRef.current.y);
        playerPosRef.current.x = safe.x;
        playerPosRef.current.y = safe.y;
        playerPosRef.current.targetX = safe.x;
        playerPosRef.current.targetY = safe.y;
        setLocalPlayer((prev) => ({ ...prev, x: safe.x, y: safe.y, targetX: safe.x, targetY: safe.y }));
      }

      // Smooth continuous movement speed scaled by speed multiplier (0.5x, 1x, 1.5x, 2x)
      const MOVE_SPEED_TILES_PER_SEC = 20 * moveSpeedRef.current;
      const speedX = (MOVE_SPEED_TILES_PER_SEC / BINAN_GRID_COLS) * 100; // ~5% per sec
      const speedY = (MOVE_SPEED_TILES_PER_SEC / BINAN_GRID_ROWS) * 100; // ~7% per sec

      const held = heldKeysRef.current;
      let moveX = 0;
      let moveY = 0;
      if (held.has("UP")) moveY -= 1;
      if (held.has("DOWN")) moveY += 1;
      if (held.has("LEFT")) moveX -= 1;
      if (held.has("RIGHT")) moveX += 1;

      // 1. Direct keyboard/joystick input takes highest priority
      if (moveX !== 0 || moveY !== 0) {
        // Diagonal speed normalization
        if (moveX !== 0 && moveY !== 0) {
          moveX *= Math.SQRT1_2;
          moveY *= Math.SQRT1_2;
        }
      } else if (joystickVectorRef.current && joystickVectorRef.current.intensity > 0.05) {
        moveX = joystickVectorRef.current.x;
        moveY = joystickVectorRef.current.y;
      }

      if (moveX !== 0 || moveY !== 0) {

        const deltaX = moveX * speedX * dt;
        const deltaY = moveY * speedY * dt;

        const currX = playerPosRef.current.x;
        const currY = playerPosRef.current.y;
        let nextX = currX + deltaX;
        let nextY = currY + deltaY;

        let nextFacing = playerPosRef.current.facing;
        if (moveX < -0.01) nextFacing = "left";
        else if (moveX > 0.01) nextFacing = "right";

        // Collision check with wall sliding
        if (isRoadWalkablePercent(nextX, nextY)) {
          // Both axes walkable
        } else if (isRoadWalkablePercent(nextX, currY)) {
          // Slide along X
          nextY = currY;
        } else if (isRoadWalkablePercent(currX, nextY)) {
          // Slide along Y
          nextX = currX;
        } else {
          // Blocked
          nextX = currX;
          nextY = currY;
        }

        // NPC collision check
        const { col: nextCol, row: nextRow } = percentToTile(nextX, nextY);
        let collidesNpc = false;
        for (const npc of BINAN_GUIDE_NPCS) {
          const npcTile = percentToTile(npc.x, npc.y);
          if (nextCol === npcTile.col && nextRow === npcTile.row) {
            collidesNpc = true;
            break;
          }
        }
        if (collidesNpc) {
          nextX = currX;
          nextY = currY;
        }

        nextX = Math.max(0.01, Math.min(99.99, nextX));
        nextY = Math.max(0.01, Math.min(99.99, nextY));

        const isActuallyMoving = nextX !== currX || nextY !== currY;
        if (isActuallyMoving) {
          wasMovingRef.current = true;
        } else if (wasMovingRef.current) {
          wasMovingRef.current = false;
          realtimeRef.current?.broadcastWaypoint(nextX, nextY, nextFacing, true);
          realtimeRef.current?.updatePosition(nextX, nextY, nextFacing);
          try {
            localStorage.setItem(
              "wuwa_plaza_last_pos",
              JSON.stringify({ x: nextX, y: nextY, facing: nextFacing })
            );
          } catch (e) {}
        }

        playerPosRef.current.x = nextX;
        playerPosRef.current.y = nextY;
        playerPosRef.current.targetX = nextX;
        playerPosRef.current.targetY = nextY;
        playerPosRef.current.facing = nextFacing;

        // Throttled broadcast
        if (now - lastBroadcastTimeRef.current >= 80) {
          lastBroadcastTimeRef.current = now;
          realtimeRef.current?.broadcastWaypoint(nextX, nextY, nextFacing);
          try {
            localStorage.setItem(
              "wuwa_plaza_last_pos",
              JSON.stringify({ x: nextX, y: nextY, facing: nextFacing })
            );
          } catch (e) {}
        }

        setLocalPlayer((prev) => {
          const validBubbles = (prev.speechBubbles || []).filter((b) => b.expiresAt > now);
          return {
            ...prev,
            x: nextX,
            y: nextY,
            targetX: nextX,
            targetY: nextY,
            facing: nextFacing,
            isMoving: isActuallyMoving,
            isSleeping: false,
            lastActive: now,
            speechBubbles: validBubbles.length > 0 ? validBubbles : undefined,
            activeSpeechBubble:
              prev.activeSpeechBubble && prev.activeSpeechBubble.expiresAt > now
                ? prev.activeSpeechBubble
                : undefined,
            currentEmote:
              prev.currentEmote && prev.currentEmote.expiresAt > now
                ? prev.currentEmote
                : undefined,
          };
        });
      } else {
        // 2. Click-to-move waypoint following
        const dx = playerPosRef.current.targetX - playerPosRef.current.x;
        const dy = playerPosRef.current.targetY - playerPosRef.current.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 0.1) {
          wasMovingRef.current = true;
          const stepDist = Math.hypot(speedX, speedY) * dt;
          const step = Math.min(dist, stepDist);

          const nextX = playerPosRef.current.x + (dx / dist) * step;
          const nextY = playerPosRef.current.y + (dy / dist) * step;
          const nextFacing = dx < -0.05 ? "left" : dx > 0.05 ? "right" : playerPosRef.current.facing;

          if (isRoadWalkablePercent(nextX, nextY)) {
            playerPosRef.current.x = nextX;
            playerPosRef.current.y = nextY;
            playerPosRef.current.facing = nextFacing;

            if (now - lastBroadcastTimeRef.current >= 80) {
              lastBroadcastTimeRef.current = now;
              realtimeRef.current?.broadcastWaypoint(nextX, nextY, nextFacing);
              try {
                localStorage.setItem(
                  "wuwa_plaza_last_pos",
                  JSON.stringify({ x: nextX, y: nextY, facing: nextFacing })
                );
              } catch (e) {}
            }

            setLocalPlayer((prev) => {
              const validBubbles = (prev.speechBubbles || []).filter((b) => b.expiresAt > now);
              return {
                ...prev,
                x: nextX,
                y: nextY,
                facing: nextFacing,
                isMoving: true,
                isSleeping: false,
                lastActive: now,
                speechBubbles: validBubbles.length > 0 ? validBubbles : undefined,
                activeSpeechBubble:
                  prev.activeSpeechBubble && prev.activeSpeechBubble.expiresAt > now
                    ? prev.activeSpeechBubble
                    : undefined,
                currentEmote:
                  prev.currentEmote && prev.currentEmote.expiresAt > now
                    ? prev.currentEmote
                    : undefined,
              };
            });
          } else {
            // Blocked, cancel waypoint
            playerPosRef.current.targetX = playerPosRef.current.x;
            playerPosRef.current.targetY = playerPosRef.current.y;
            if (wasMovingRef.current) {
              wasMovingRef.current = false;
              realtimeRef.current?.broadcastWaypoint(playerPosRef.current.x, playerPosRef.current.y, playerPosRef.current.facing, true);
              realtimeRef.current?.updatePosition(playerPosRef.current.x, playerPosRef.current.y, playerPosRef.current.facing);
              try {
                localStorage.setItem(
                  "wuwa_plaza_last_pos",
                  JSON.stringify({
                    x: playerPosRef.current.x,
                    y: playerPosRef.current.y,
                    facing: playerPosRef.current.facing,
                  })
                );
              } catch (e) {}
            }
            setLocalPlayer((prev) => ({ ...prev, isMoving: false }));
          }
        } else {
          // Standing still / Idle
          if (wasMovingRef.current) {
            wasMovingRef.current = false;
            realtimeRef.current?.broadcastWaypoint(playerPosRef.current.x, playerPosRef.current.y, playerPosRef.current.facing, true);
            realtimeRef.current?.updatePosition(playerPosRef.current.x, playerPosRef.current.y, playerPosRef.current.facing);
            try {
              localStorage.setItem(
                "wuwa_plaza_last_pos",
                JSON.stringify({
                  x: playerPosRef.current.x,
                  y: playerPosRef.current.y,
                  facing: playerPosRef.current.facing,
                })
              );
            } catch (e) {}
          }
          setLocalPlayer((prev) => {
            const validBubbles = (prev.speechBubbles || []).filter((b) => b.expiresAt > now);
            const prevCount = prev.speechBubbles ? prev.speechBubbles.length : 0;
            const hasExpiredActive = prev.activeSpeechBubble && prev.activeSpeechBubble.expiresAt <= now;
            const hasExpiredEmote = prev.currentEmote && prev.currentEmote.expiresAt <= now;

            if (!prev.isMoving && prevCount === validBubbles.length && !hasExpiredActive && !hasExpiredEmote) {
              return prev;
            }

            return {
              ...prev,
              isMoving: false,
              speechBubbles: validBubbles.length > 0 ? validBubbles : undefined,
              activeSpeechBubble: hasExpiredActive ? undefined : prev.activeSpeechBubble,
              currentEmote: hasExpiredEmote ? undefined : prev.currentEmote,
            };
          });
        }
      }

      // 3. Smooth Peer Players movement
      setPeerPlayers((prev) => {
        let changed = false;
        const next = new Map(prev);

        for (const [id, p] of Array.from(next.entries())) {
          // Heartbeat reaper: prune abandoned ghost peers inactive for > 20s
          if (p.lastActive && now - p.lastActive > 20000) {
            next.delete(id);
            changed = true;
            continue;
          }

          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          const dist = Math.hypot(dx, dy);

          const validBubbles = (p.speechBubbles || []).filter((b) => b.expiresAt > now);
          const hasExpiredBubble = (p.speechBubbles && p.speechBubbles.length !== validBubbles.length) || (p.activeSpeechBubble && p.activeSpeechBubble.expiresAt <= now);
          const hasExpiredEmote = p.currentEmote && p.currentEmote.expiresAt <= now;

          if (dist >= 0.08) {
            changed = true;
            const stepDist = Math.hypot(speedX, speedY) * dt;
            const step = Math.min(dist, stepDist);
            next.set(id, {
              ...p,
              x: p.x + (dx / dist) * step,
              y: p.y + (dy / dist) * step,
              facing: dx < -0.05 ? "left" : dx > 0.05 ? "right" : p.facing,
              isMoving: true,
              speechBubbles: validBubbles.length > 0 ? validBubbles : undefined,
              activeSpeechBubble: hasExpiredBubble ? undefined : p.activeSpeechBubble,
              currentEmote: hasExpiredEmote ? undefined : p.currentEmote,
            });
          } else if (p.isMoving || hasExpiredBubble || hasExpiredEmote) {
            changed = true;
            next.set(id, {
              ...p,
              x: p.targetX,
              y: p.targetY,
              isMoving: false,
              speechBubbles: validBubbles.length > 0 ? validBubbles : undefined,
              activeSpeechBubble: hasExpiredBubble ? undefined : p.activeSpeechBubble,
              currentEmote: hasExpiredEmote ? undefined : p.currentEmote,
            });
          }
        }

        return changed ? next : prev;
      });

      // 4. Update Camera Viewport Tracking (Player-Centered Zoom Tracking)
      if (mapWorldRef.current) {
        const { worldWidth: wW, worldHeight: wH, viewportWidth: vW, viewportHeight: vH } = worldSizeRef.current;
        const z = CAMERA_POV_ZOOM;

        // Centered on player with zoom!
        const playerPxX = (playerPosRef.current.x / 100) * wW;
        const playerPxY = (playerPosRef.current.y / 100) * wH;

        // Ideal camera position to center player in viewport
        const idealCamX = (vW / (2 * z)) - playerPxX;
        const idealCamY = (vH / (2 * z)) - playerPxY;

        // Clamp camera so it doesn't show beyond map boundaries
        const minCamX = (vW / z) - wW;
        const maxCamX = 0;
        const activeCamX = Math.min(maxCamX, Math.max(minCamX, idealCamX));

        const minCamY = (vH / z) - wH;
        const maxCamY = 0;
        const activeCamY = Math.min(maxCamY, Math.max(minCamY, idealCamY));

        mapWorldRef.current.style.transformOrigin = "0 0";
        mapWorldRef.current.style.transform = `scale(${z}) translate3d(${activeCamX}px, ${activeCamY}px, 0)`;
        canvasRef.current?.render(activeCamX, activeCamY, z);
      }

      // Synchronously update local player DOM position with camera for frame-perfect lockstep
      if (localPlayerDivRef.current) {
        localPlayerDivRef.current.style.left = `${playerPosRef.current.x}%`;
        localPlayerDivRef.current.style.top = `${playerPosRef.current.y}%`;
      }

      // Synchronously update directional arrow pointing to tracked NPC at 60fps
      if (navArrowRef.current && trackedNpcRef.current) {
        const dxPx = (trackedNpcRef.current.x - playerPosRef.current.x) * BINAN_WORLD_WIDTH;
        const dyPx = (trackedNpcRef.current.y - playerPosRef.current.y) * BINAN_WORLD_HEIGHT;
        const angleDeg = Math.atan2(dyPx, dxPx) * (180 / Math.PI);
        navArrowRef.current.style.left = `${playerPosRef.current.x}%`;
        navArrowRef.current.style.top = `${playerPosRef.current.y}%`;
        navArrowRef.current.style.transform = `translate(-50%, -50%) rotate(${angleDeg}deg) translate(160px, 0)`;
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  // 4. Chat & Emote handlers
  const handleSendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return false;

    const now = Date.now();
    const msgId = `chat_${now}_${Math.random().toString(36).slice(2, 6)}`;
    const newBubble = { id: msgId, text: trimmed, expiresAt: now + 12000 };

    // 1. Instantly display speech bubble on local player's head (stacking up to 5 bubbles)
    setLocalPlayer((prev) => {
      const active = (prev.speechBubbles || []).filter((b) => b.expiresAt > now);
      return {
        ...prev,
        activeSpeechBubble: newBubble,
        speechBubbles: [...active, newBubble].slice(-5),
      };
    });

    // 2. Instantly add message to local chat history in overlay
    setChatMessages((prev) => [
      ...prev.slice(-35),
      {
        id: msgId,
        senderId: myPlayerId,
        senderName: myUsername,
        senderAvatarId: myAvatarId,
        senderTitle: myTitle,
        text: trimmed,
        timestamp: now,
      },
    ]);

    // 3. Broadcast to peers via Supabase Realtime
    realtimeRef.current?.broadcastChat(trimmed);

    return true;
  };

  const handleSendEmote = (emoji: string) => {
    realtimeRef.current?.broadcastEmote(emoji);
  };

  return (
    <>
      <div
        ref={plazaRef}
        className={`relative w-screen h-screen overflow-hidden bg-[#07090e] select-none cursor-default font-sans ${isVisible === false ? "hidden pointer-events-none" : ""}`}
      >
        {/* Phone Portrait Orientation Barrier */}
        {isPhonePortrait && !dismissPortraitNotice && (
          <div className="fixed inset-0 z-50 bg-[#07090e]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center select-none pointer-events-auto">
            <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center mb-4 text-yellow-400">
              <Smartphone className="w-8 h-8 rotate-90 animate-pulse text-yellow-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white font-display tracking-wider uppercase mb-2">
              Landscape Mode Required
            </h3>
            <p className="text-xs text-gray-300 font-mono max-w-xs mb-6 leading-relaxed">
              Jinzhou Plaza is an MMO overworld designed for Landscape mode or Desktop browsers. Please rotate your device sideways.
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onNavigate("convene");
                }}
                className="w-full py-3 px-4 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-mono font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(250,204,21,0.4)] transition-all cursor-pointer active:scale-95"
              >
                Return to Convene
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setDismissPortraitNotice(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Continue in Portrait
              </button>
            </div>
          </div>
        )}
      {/* ========================================================================= */}
      {/* 1. ATMOSPHERIC TOWN CANVAS / BACKGROUND */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Night Sky Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#05070d] via-[#090e18] to-[#04060a]" />

        {/* Ambient Blossom Floating Particle Effect */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffd15c15_1px,transparent_1px)] bg-[size:40px_40px] opacity-40 animate-pulse-slow" />
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP HUD NAVIGATION & STATUS BAR */}
      {/* ========================================================================= */}
      <header
        onClick={(e) => e.stopPropagation()}
        className="absolute top-0 inset-x-0 z-40 flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 border-b border-white/10 bg-black/60 backdrop-blur-md gap-2"
      >
        {/* Left: Plaza Title */}
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-yellow-400/15 border border-yellow-400/30 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.25)]">
            <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
              Plaza
            </h1>
          </div>
        </div>

        {/* Right: Quick Portals, Astrite, Profile */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5">
          {/* Quick Teleport: Convene */}
          <button
            type="button"
            onClick={() => onNavigate("convene")}
            className="h-[38px] sm:h-[40px] px-2.5 sm:px-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/40 text-amber-300 hover:text-white text-xs font-mono font-bold tracking-wider flex items-center space-x-1.5 transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
            title="Teleport to Convene Banners"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span className="hidden md:inline">Convene</span>
          </button>

          {/* Quick Teleport: Combat Arena */}
          <button
            type="button"
            onClick={() => onNavigate("arena")}
            className="h-[38px] sm:h-[40px] px-2.5 sm:px-3.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/40 text-rose-300 hover:text-white text-xs font-mono font-bold tracking-wider flex items-center space-x-1.5 transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
            title="Teleport to Combat Arena"
          >
            <Swords className="w-4 h-4 text-rose-300" />
            <span className="hidden md:inline">Arena</span>
          </button>


          {/* Channel / Lobby Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                soundEngine.playClick();
                setShowTopChannelDropdown((prev) => !prev);
              }}
              className="h-[38px] sm:h-[40px] px-2.5 sm:px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-yellow-400/40 text-gray-200 hover:text-yellow-300 text-xs font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Switch Plaza Channel (10 Players Max)"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Ch. {currentLobbyId}</span>
              <span className="text-[10px] text-gray-400 hidden sm:inline">({onlineCount}/10)</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showTopChannelDropdown ? "rotate-180" : ""}`} />
            </button>

            {showTopChannelDropdown && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 mt-2 w-48 rounded-xl bg-[#0c1017]/95 border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.85)] backdrop-blur-md overflow-hidden z-50 py-1 font-mono text-xs"
              >
                <div className="px-3 py-1.5 border-b border-white/10 text-[9px] text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Channels (10 max)</span>
                  <span className="text-yellow-400 font-bold">Ch. {currentLobbyId}</span>
                </div>
                {visibleLobbies.map((lobby) => {
                  const isCurrent = lobby.id === currentLobbyId;
                  return (
                    <button
                      key={lobby.id}
                      type="button"
                      onClick={() => {
                        handleSwitchLobby(lobby.id);
                        setShowTopChannelDropdown(false);
                      }}
                      className={`w-full px-3 py-2 flex items-center justify-between text-left transition-colors ${
                        isCurrent
                          ? "bg-yellow-400/20 text-yellow-300 font-bold"
                          : "hover:bg-white/10 text-gray-300 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${isCurrent ? "bg-yellow-400 animate-pulse" : "bg-emerald-400"}`} />
                        <span>{lobby.name}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {isCurrent ? `${onlineCount}/10` : "Join"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Astrite Counter Pill */}
          <div
            className="h-[38px] sm:h-[40px] px-2.5 sm:px-3.5 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm shadow-inner flex items-center space-x-1.5 cursor-default"
            title={`${(userState?.astrite || 0).toLocaleString()} Astrite`}
          >
            <AstriteIcon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            <span className="font-mono text-xs sm:text-sm font-bold text-gray-100">
              {isSandboxGuest ? "∞" : formatAstriteCount(userState?.astrite || 0)}
            </span>
          </div>

          {/* Sandbox Guest Mode Controls or User Account Dropdown */}
          {isSandboxGuest ? (
            <div className="flex items-center space-x-1.5 sm:space-x-2 pl-1.5 sm:pl-2 border-l border-white/15">
              <div className="flex items-center space-x-1.5 h-[38px] sm:h-[40px] px-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[11px] sm:text-xs font-mono font-bold">
                <InfinityIcon className="w-4 h-4" />
                <span className="hidden sm:inline">SANDBOX</span>
              </div>
              <button
                type="button"
                onClick={onExitSandbox}
                className="flex items-center space-x-1.5 h-[38px] sm:h-[40px] px-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase text-[11px] sm:text-xs font-mono tracking-wider transition-all shadow-[0_0_15px_rgba(250,204,21,0.3)] hover:scale-105 active:scale-95 cursor-pointer"
                title="Exit Sandbox Mode and return to Login"
              >
                <LogOut className="w-4 h-4" />
                <span>Exit</span>
              </button>
            </div>
          ) : (
            /* User Account Dropdown (Profile, Account, Settings, Sign Out) */
            <div className="relative pl-1.5 sm:pl-2 border-l border-white/15" ref={profileDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setIsProfileDropdownOpen((prev) => !prev);
                }}
                className={`h-[38px] sm:h-[40px] px-2 sm:px-2.5 rounded-xl border text-xs sm:text-sm font-mono transition-all duration-150 flex items-center space-x-1.5 hover:scale-105 active:scale-95 cursor-pointer ${
                  isProfileDropdownOpen
                    ? "bg-yellow-400/15 border-yellow-400/60 text-white shadow-[0_0_15px_rgba(250,204,21,0.3)]"
                    : "bg-white/5 hover:bg-white/10 border-white/10 hover:border-yellow-400/40 text-gray-200 hover:text-white"
                }`}
                title="Account Menu"
              >
                <div className="w-6 h-6 rounded-full overflow-hidden border border-yellow-400/60 shadow-[0_0_8px_rgba(250,204,21,0.3)] flex-shrink-0 bg-black/60">
                  <img
                    src={`/assets/inventory_portraits/${getPortraitFileName(myAvatarId)}`}
                    alt="Avatar"
                    className="w-full h-full object-cover object-top"
                    onError={(e) => {
                      const t = e.currentTarget as HTMLImageElement;
                      if (t.src.endsWith(".jpeg")) {
                        t.src = `/assets/inventory_portraits/${myAvatarId}.jpg`;
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
              {isProfileDropdownOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 mt-2 w-48 rounded-xl bg-[#0c1017]/95 border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.85)] backdrop-blur-md overflow-hidden z-50 py-1"
                >
                  {/* Account Header with Avatar */}
                  <div className="flex items-center space-x-2.5 px-3.5 py-2.5 border-b border-white/10 bg-white/[0.02]">
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-yellow-400/50 shadow-sm flex-shrink-0 bg-black/60">
                      <img
                        src={`/assets/inventory_portraits/${getPortraitFileName(myAvatarId)}`}
                        alt="Avatar"
                        className="w-full h-full object-cover object-top"
                        onError={(e) => {
                          const t = e.currentTarget as HTMLImageElement;
                          if (t.src.endsWith(".jpeg")) {
                            t.src = `/assets/inventory_portraits/${myAvatarId}.jpg`;
                          }
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                        Account
                      </p>
                      <p className="text-xs font-bold font-mono text-yellow-400 truncate">
                        @{myUsername}
                      </p>
                    </div>
                  </div>

                  {/* Profile Option */}
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setIsProfileDropdownOpen(false);
                      onOpenProfile?.();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-mono font-bold text-gray-200 hover:text-white hover:bg-yellow-400/10 transition-all text-left cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Profile</span>
                  </button>

                  {/* Account Option */}
                  {onOpenAccount && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setIsProfileDropdownOpen(false);
                        onOpenAccount();
                      }}
                      className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-mono font-bold text-gray-200 hover:text-white hover:bg-yellow-400/10 transition-all text-left border-t border-white/5 cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Account</span>
                    </button>
                  )}

                  {/* Settings Option */}
                  {onOpenSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setIsProfileDropdownOpen(false);
                        onOpenSettings();
                      }}
                      className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-mono font-bold text-gray-200 hover:text-white hover:bg-yellow-400/10 transition-all text-left border-t border-white/5 cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Settings</span>
                    </button>
                  )}

                  {/* Sign Out Option */}
                  {onSignOut && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        onSignOut();
                      }}
                      className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-xs font-mono font-bold text-rose-300 hover:text-rose-200 hover:bg-rose-500/15 transition-all text-left border-t border-white/5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-400" />
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. CENTERED DELUGE-STYLE MAP FRAME (840px x 600px - Seamless Open World) */}
      {/* ========================================================================= */}
      <main className="relative z-10 w-full h-full flex flex-col pt-16 sm:pt-[70px] pb-2 sm:pb-3 px-2 sm:px-3 pointer-events-none">
        {/* The Framed Map Box - Fills available screen inside red box */}
        <div
          ref={mapBoxRef}
          className="relative w-full h-full rounded-2xl border-2 border-white/20 hover:border-yellow-400/40 shadow-[0_16px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(0,0,0,0.5)] overflow-hidden bg-[#07090e] pointer-events-auto transition-colors"
        >
          {/* Tactical Mini-Map & Zoom Controls (Inside Map, Top-Left) */}
          <div className="absolute top-3 left-3 z-30 flex items-center space-x-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setShowMiniMap(true);
              }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-black/75 hover:bg-yellow-400/20 border border-yellow-400/50 hover:border-yellow-400 text-yellow-400 hover:text-white shadow-[0_4px_16px_rgba(0,0,0,0.8)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
              title="Tactical Mini-Map (Press M)"
            >
              <MapIcon className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
            </button>



            {/* Player Movement Speed Controls: 0.5x, 1x, 1.5x, 2x */}
            <div className="flex items-center space-x-1 bg-black/75 backdrop-blur-md border border-white/20 rounded-xl p-1 shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
              <button
                type="button"
                onClick={handleSpeedDown}
                disabled={moveSpeed <= SPEED_PRESETS[0]}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
                title="Decrease Speed"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCycleSpeed}
                className="px-2 sm:px-2.5 py-0.5 text-xs font-mono font-bold text-yellow-300 hover:text-yellow-200 transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95"
                title="Movement Speed (Click to cycle: 0.5x, 1x, 1.5x, 2x)"
              >
                <Gauge className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <span>{moveSpeed}x</span>
              </button>
              <button
                type="button"
                onClick={handleSpeedUp}
                disabled={moveSpeed >= SPEED_PRESETS[SPEED_PRESETS.length - 1]}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
                title="Increase Speed"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Floating Waypoint Navigation HUD (When Tracking NPC) */}
          {trackedNpc && (() => {
            const dx = trackedNpc.x - localPlayer.x;
            const dy = trackedNpc.y - localPlayer.y;
            const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
            const distM = Math.round(Math.hypot(dx, dy));

            return (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full bg-[#0c1017]/90 border border-yellow-400/60 backdrop-blur-md shadow-[0_0_20px_rgba(250,204,21,0.35)] pointer-events-auto animate-fade-in">
                <div
                  style={{ transform: `rotate(${angleDeg - 45}deg)` }}
                  className="w-5 h-5 flex items-center justify-center text-yellow-400 transition-transform duration-100"
                >
                  <Navigation className="w-4 h-4 fill-yellow-400" />
                </div>
                <div className="flex items-center space-x-1.5 text-xs font-mono">
                  <span className="text-gray-300">Target:</span>
                  <span className="font-bold text-yellow-300">{trackedNpc.name}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-yellow-400 font-bold">{distM}m</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTrackedNpc(null)}
                  className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors ml-1"
                  title="Cancel Tracking"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })()}

          {/* Biñan, Laguna Pixel Art Overworld Viewport Canvas (60fps hardware accelerated) */}
          <BinanOverworldCanvas
            ref={canvasRef}
            viewportWidth={viewportSize.width}
            viewportHeight={viewportSize.height}
          />

        <div
          ref={mapWorldRef}
          style={{
            width: `${worldWidth}px`,
            height: `${worldHeight}px`,
            willChange: "transform",
          }}
          onClick={(e) => {
            if (!mapWorldRef.current) return;
            const rect = mapWorldRef.current.getBoundingClientRect();
            const clickPxX = e.clientX - rect.left;
            const clickPxY = e.clientY - rect.top;
            const z = CAMERA_POV_ZOOM;
            const pctX = (clickPxX / (BINAN_WORLD_WIDTH * z)) * 100;
            const pctY = (clickPxY / (BINAN_WORLD_HEIGHT * z)) * 100;

            if (isRoadWalkablePercent(pctX, pctY)) {
              playerPosRef.current.targetX = pctX;
              playerPosRef.current.targetY = pctY;
            }
          }}
          className="relative pointer-events-auto origin-top-left cursor-pointer"
        >
          {/* Static Guide NPCs */}
          {STATIC_GUIDE_NPCS.map((npc) => {
            const spriteUrl = SPRITE_MAP[npc.spriteId] || `/assets/inventory_portraits/${getPortraitFileName(npc.spriteId)}`;

            return (
              <div
                key={npc.id}
                style={{
                  left: `${npc.x}%`,
                  top: `${npc.y}%`,
                  transform: `translate(-50%, -50%) scale(${CHARACTER_SCALE})`,
                  transformOrigin: "center center",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  const dist = Math.hypot(npc.x - playerPosRef.current.x, npc.y - playerPosRef.current.y);
                  if (dist > NPC_PROXIMITY_RADIUS) return;
                  soundEngine.playClick();
                  setSelectedNpc(npc);
                }}
                className="absolute flex flex-col items-center pointer-events-auto cursor-pointer group z-10"
              >
                {/* Floating Overlays above NPC (absolute so container height never shifts) */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 flex flex-col items-center pointer-events-none z-30">
                  {nearbyNpc?.id === npc.id && (
                    <div className="mb-0.5 px-1.5 py-0.2 rounded-full bg-yellow-400 text-black text-[8px] font-mono font-black tracking-wider uppercase shadow-[0_0_10px_rgba(250,204,21,0.8)] animate-bounce flex items-center space-x-0.5 whitespace-nowrap">
                      <span>💬 Talk [E]</span>
                    </div>
                  )}
                </div>

                {/* NPC Name Tag: Yellow Name at Top, Service at Bottom */}
                <div className="mb-0.5 px-2 py-0.5 rounded bg-black/85 border border-white/15 group-hover:border-yellow-400/80 text-center whitespace-nowrap shadow-sm transition-colors flex flex-col items-center leading-tight">
                  <span className="font-bold text-[8.5px] text-yellow-300 leading-tight">{npc.name}</span>
                  <span className="text-[7.5px] font-mono text-gray-300 leading-tight">{npc.service || npc.title}</span>
                </div>

                {/* NPC Sprite */}
                <div
                  style={{ transform: `scaleX(${npc.facing === "left" ? -1 : 1})` }}
                  className="w-7 h-7 sm:w-[30px] sm:h-[30px] flex items-center justify-center group-hover:scale-115 transition-transform"
                >
                  <img
                    src={spriteUrl}
                    alt={npc.name}
                    className="w-full h-full object-contain filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] [image-rendering:pixelated]"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.onerror = null;
                      target.src = `/assets/inventory_portraits/${DEFAULT_AVATAR_ID}.jpeg`;
                    }}
                  />
                </div>
              </div>
            );
          })}

          {/* Peer Players */}
          {Array.from(peerPlayers.values()).map((peer) => {
            const spriteUrl = SPRITE_MAP[peer.avatarId] || `/assets/inventory_portraits/${getPortraitFileName(peer.avatarId)}`;
            const rawBubbles = (peer.speechBubbles && peer.speechBubbles.length > 0)
              ? peer.speechBubbles
              : (peer.activeSpeechBubble ? [{ id: 'active', text: peer.activeSpeechBubble.text, expiresAt: peer.activeSpeechBubble.expiresAt }] : []);
            const bubbles = rawBubbles.filter((b) => b.expiresAt > Date.now());
            const hasBubbles = bubbles.length > 0;

            return (
              <div
                key={peer.id}
                style={{
                  left: `${peer.x}%`,
                  top: `${peer.y}%`,
                  transform: `translate(-50%, -50%) scale(${CHARACTER_SCALE})`,
                  transformOrigin: "center center",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePeerClick(peer);
                }}
                className={`absolute flex flex-col items-center pointer-events-auto cursor-pointer group ${
                  hasBubbles ? "z-[60]" : "z-10"
                }`}
              >
                {/* Floating Overlays above Peer (absolute so height never shifts, z-[100] above all map layers) */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 flex flex-col items-center space-y-1 pointer-events-none z-[100]">
                  {/* Stacked Speech Bubbles (up to 5 bubbles, latest at bottom above head) */}
                  {bubbles.length > 0 && (
                    <div className="flex flex-col items-center space-y-0.5 mb-0.5">
                      {bubbles.map((bubble, i) => (
                        <div
                          key={bubble.id || `peer_b_${i}`}
                          className="w-max min-w-[20px] max-w-[110px] px-1.5 py-0.5 rounded-full bg-yellow-400 text-black text-[8px] font-mono font-bold shadow-sm text-center leading-tight break-normal [overflow-wrap:anywhere] border border-yellow-300 pointer-events-none"
                        >
                          {bubble.text}
                        </div>
                      ))}
                    </div>
                  )}

                  {peer.currentEmote && (
                    <div className="mb-0.5 text-lg">
                      {peer.currentEmote.emoji}
                    </div>
                  )}
                </div>

                {/* Peer Name Tag */}
                <div className="mb-0.5 px-1.5 py-0.2 rounded bg-black/80 border border-white/15 group-hover:border-yellow-400/80 text-[8px] font-mono text-white flex items-center whitespace-nowrap shadow-sm transition-colors">
                  <span className="font-bold text-gray-200 group-hover:text-yellow-300">{peer.username}</span>
                </div>

                {/* Peer Sprite (Submerged in water clipping) */}
                <div
                  style={{
                    transform: `scaleX(${peer.facing === "left" ? -1 : 1})`,
                    clipPath: isWaterPercent(peer.x, peer.y) ? "inset(0 0 40% 0)" : undefined,
                  }}
                  className="w-7 h-7 sm:w-[30px] sm:h-[30px] flex items-center justify-center group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(250,204,21,0.7)] transition-all"
                >
                  <img
                    src={spriteUrl}
                    alt={peer.username}
                    className="w-full h-full object-contain filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] [image-rendering:pixelated]"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.onerror = null;
                      target.src = `/assets/inventory_portraits/${DEFAULT_AVATAR_ID}.jpeg`;
                    }}
                  />
                </div>
              </div>
            );
          })}

          {/* Local Player (You) */}
          {(() => {
            const rawBubbles = (localPlayer.speechBubbles && localPlayer.speechBubbles.length > 0)
              ? localPlayer.speechBubbles
              : (localPlayer.activeSpeechBubble ? [{ id: 'active', text: localPlayer.activeSpeechBubble.text, expiresAt: localPlayer.activeSpeechBubble.expiresAt }] : []);
            const bubbles = rawBubbles.filter((b) => b.expiresAt > Date.now());
            const hasBubbles = bubbles.length > 0;

            return (
              <div
                ref={localPlayerDivRef}
                style={{
                  left: `${localPlayer.x}%`,
                  top: `${localPlayer.y}%`,
                  transform: `translate(-50%, -50%) scale(${CHARACTER_SCALE})`,
                  transformOrigin: "center center",
                }}
                className={`absolute flex flex-col items-center pointer-events-none ${
                  hasBubbles ? "z-[70]" : "z-20"
                }`}
              >
                {/* Floating Overlays above Local Player (absolute so height never shifts, z-[100] above all map layers) */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 flex flex-col items-center space-y-1 pointer-events-none z-[100]">
                  {/* Stacked Speech Bubbles (up to 5 bubbles, latest at bottom above head) */}
                  {bubbles.length > 0 && (
                    <div className="flex flex-col items-center space-y-0.5 mb-0.5">
                      {bubbles.map((bubble, i) => (
                        <div
                          key={bubble.id || `local_b_${i}`}
                          className="w-max min-w-[20px] max-w-[110px] px-1.5 py-0.5 rounded-full bg-yellow-400 text-black text-[8px] font-mono font-bold shadow-sm text-center leading-tight break-normal [overflow-wrap:anywhere] border border-yellow-300 pointer-events-none"
                        >
                          {bubble.text}
                        </div>
                      ))}
                    </div>
                  )}

                  {localPlayer.currentEmote && (
                    <div className="mb-0.5 text-lg">
                      {localPlayer.currentEmote.emoji}
                    </div>
                  )}

                  {isSleeping && (
                    <div className="mb-0.5 text-[8px] font-mono font-bold text-cyan-300 bg-black/80 px-1.5 py-0.2 rounded-full border border-cyan-400/40 animate-pulse whitespace-nowrap">
                      💤 Zzz
                    </div>
                  )}
                </div>

                {/* Local Name Tag */}
                <div className="mb-0.5 px-2 py-0.2 rounded-full bg-gradient-to-r from-yellow-500/30 via-black/85 to-yellow-500/30 border border-yellow-400/80 text-[8px] font-mono text-white flex items-center space-x-1 whitespace-nowrap shadow-[0_0_8px_rgba(250,204,21,0.3)]">
                  <span className="w-1 h-1 rounded-full bg-yellow-400" />
                  <span className="font-black text-yellow-300">You</span>
                </div>

                {/* Local Player Sprite (Submerged in water clipping) */}
                <div
                  style={{
                    transform: `scaleX(${localPlayer.facing === "left" ? -1 : 1})`,
                    clipPath: isWaterPercent(localPlayer.x, localPlayer.y) ? "inset(0 0 40% 0)" : undefined,
                  }}
                  className="w-7 h-7 sm:w-[30px] sm:h-[30px] flex items-center justify-center transition-[clip-path] duration-200"
                >
                  <img
                    src={
                      SPRITE_MAP[localPlayer.avatarId] ||
                      `/assets/inventory_portraits/${getPortraitFileName(localPlayer.avatarId)}`
                    }
                    alt={localPlayer.username}
                    className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(250,204,21,0.35)] [image-rendering:pixelated]"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.onerror = null;
                      target.src = `/assets/inventory_portraits/${DEFAULT_AVATAR_ID}.jpeg`;
                    }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Minimap Tracked NPC Directional Arrow Next to Player */}
          {trackedNpc && (
            <div
              ref={navArrowRef}
              style={{
                left: `${localPlayer.x}%`,
                top: `${localPlayer.y}%`,
                transform: `translate(-50%, -50%) rotate(${Math.atan2(
                  (trackedNpc.y - localPlayer.y) * BINAN_WORLD_HEIGHT,
                  (trackedNpc.x - localPlayer.x) * BINAN_WORLD_WIDTH
                ) * (180 / Math.PI)}deg) translate(160px, 0)`,
                transformOrigin: "center center",
              }}
              className="absolute pointer-events-none z-35 flex items-center justify-center"
            >
              <div className="relative flex items-center justify-center filter drop-shadow-[0_0_16px_rgba(34,211,238,0.9)] drop-shadow-[0_0_6px_rgba(255,255,255,0.9)] animate-pulse">
                <svg
                  width="100"
                  height="40"
                  viewBox="0 0 100 40"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="overflow-visible"
                >
                  <defs>
                    <linearGradient id="navArrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
                      <stop offset="40%" stopColor="#22d3ee" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="1" />
                    </linearGradient>
                  </defs>
                  {/* Arrow shaft */}
                  <path
                    d="M 12 20 L 78 20"
                    stroke="url(#navArrowGrad)"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                  {/* Arrow head */}
                  <path
                    d="M 56 8 L 84 20 L 56 32"
                    stroke="#38bdf8"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* White core accent */}
                  <path
                    d="M 26 20 L 74 20"
                    stroke="#ffffff"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 60 13 L 76 20 L 60 27"
                    stroke="#ffffff"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* On-Screen Joystick / D-Pad Positioned at Bottom-Right of Map */}
        <div className="absolute bottom-3 right-3 z-30 pointer-events-auto">
          <PlazaJoystick
            onMove={(vec) => {
              joystickVectorRef.current = vec;
            }}
            onStop={() => {
              joystickVectorRef.current = null;
            }}
            avatarUrl={
              SPRITE_MAP[localPlayer.avatarId] ||
              `/assets/inventory_portraits/${getPortraitFileName(localPlayer.avatarId)}`
            }
          />
        </div>

        {/* Talk Button - ONLY VISIBLE when next to an NPC */}
        {nearbyNpc && (
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setSelectedNpc(nearbyNpc);
            }}
            className="absolute top-3 right-3 z-30 px-3.5 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-black font-mono font-black text-xs shadow-[0_0_20px_rgba(250,204,21,0.7)] flex items-center space-x-1.5 active:scale-95 transition-all animate-bounce pointer-events-auto cursor-pointer"
            title={`Talk to ${nearbyNpc.name}`}
          >
            <span>💬 TALK [E]</span>
          </button>
        )}
      </div>
    </main>

      {/* Centered Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed top-16 sm:top-20 inset-x-0 z-50 flex justify-center pointer-events-none px-4">
          <div
            onClick={() => setToastMessage(null)}
            className="pointer-events-auto px-5 py-2.5 rounded-2xl bg-[#0d1322]/95 backdrop-blur-md border border-yellow-400/60 shadow-[0_4px_25px_rgba(250,204,21,0.35)] text-yellow-300 font-mono text-xs sm:text-sm font-bold flex items-center space-x-2.5 cursor-pointer hover:border-yellow-300 transition-all hover:scale-[1.02] active:scale-95"
            title="Click to dismiss"
          >
            <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. REALTIME CHAT & EMOTE OVERLAY */}
      {/* ========================================================================= */}
      <PlazaChatOverlay
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        onSendEmote={handleSendEmote}
        onlineCount={onlineCount}
        currentLobbyId={currentLobbyId}
        onSwitchLobby={handleSwitchLobby}
      />

      {/* ========================================================================= */}
      {/* 6. NPC DIALOGUE MODAL (RETRO RPG INTERACTION CARD) */}
      {/* ========================================================================= */}
      {selectedNpc && (
        <div
          onClick={() => setSelectedNpc(null)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex items-end justify-center p-4 sm:p-6 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl bg-[#0c1017]/95 border-2 border-yellow-400/60 shadow-[0_10px_40px_rgba(0,0,0,0.9),0_0_20px_rgba(250,204,21,0.2)] p-4 sm:p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4 animate-scale-up"
          >
            {/* NPC Portrait */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-yellow-400/80 shadow-[0_0_15px_rgba(250,204,21,0.35)] flex-shrink-0 bg-black/60 relative">
              <img
                src={`/assets/inventory_portraits/${getPortraitFileName(selectedNpc.spriteId)}`}
                alt={selectedNpc.name}
                className="w-full h-full object-cover object-top"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.onerror = null;
                  target.src = `/assets/inventory_portraits/${DEFAULT_AVATAR_ID}.jpeg`;
                }}
              />
            </div>

            {/* NPC Dialogue & Actions */}
            <div className="flex-1 flex flex-col justify-between min-w-0 text-center sm:text-left">
              <div>
                {/* Header: Name Only */}
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1.5">
                  <h3 className="text-sm sm:text-base font-black font-display text-white tracking-wider">
                    {selectedNpc.name}
                  </h3>
                </div>

                {/* Greeting Dialogue */}
                <p className="text-xs sm:text-sm font-mono text-gray-200 leading-relaxed mb-4">
                  "{(() => {
                    if (selectedNpc.id === "npc_zhezhi" || selectedNpc.name.toLowerCase() === "zhezhi") {
                      if (tacetStatus.isMaxed) {
                        return `Hello, Rover! The bank is at maximum capacity with ${tacetStatus.accumulated.toLocaleString()} Free Astrites (${tacetStatus.accumulated.toLocaleString()} / ${tacetStatus.maxCap.toLocaleString()}). Would you like to collect them now?`;
                      }
                      if (tacetStatus.accumulated > 0) {
                        return `Hello, Rover! There are currently ${tacetStatus.accumulated.toLocaleString()} Free Astrites in the bank (${tacetStatus.accumulated.toLocaleString()} / ${tacetStatus.maxCap.toLocaleString()}). Would you like to collect them?`;
                      }
                      return `Hello, Rover! You currently have 0 Free Astrites in the bank (accumulating 160 every 6m, cap: ${tacetStatus.maxCap.toLocaleString()}). Would you like to collect anyway?`;
                    }
                    return selectedNpc.greeting;
                  })()}"
                </p>
              </div>

              {/* Action Buttons: Just YES and NO, moved to the right */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => handleConfirmNpc(selectedNpc)}
                  className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-mono font-black tracking-wider uppercase shadow-[0_0_15px_rgba(250,204,21,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  YES
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setSelectedNpc(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-gray-300 hover:text-white text-xs font-mono font-bold tracking-wider uppercase transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  NO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6B. NPC ACTION LOADING TRANSITION OVERLAY */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {npcLoadingTransition && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[120] bg-black flex flex-col items-center justify-center p-6 text-center select-none pointer-events-auto"
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
                <span className="text-xs sm:text-sm font-mono tracking-widest text-yellow-400 font-bold drop-shadow-[0_0_10px_rgba(250,204,21,0.3)] uppercase">
                  {npcLoadingTransition.title}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white drop-shadow-[0_2px_15px_rgba(255,255,255,0.2)]">
                  Loading
                </h2>
                <p className="text-xs sm:text-sm font-mono tracking-wider text-gray-400">
                  {npcLoadingTransition.subtitle}
                </p>
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
      {/* 6. PEER PLAYER INTERACTION & CHALLENGE MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedPeer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (peerInteractionStep !== "waiting") {
                setSelectedPeer(null);
                setPeerInteractionStep("menu");
              }
            }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto select-none"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-[#0c1017]/98 border border-yellow-400/50 shadow-[0_15px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(250,204,21,0.15)] overflow-hidden flex flex-col font-mono"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)] bg-black/80 flex-shrink-0">
                    <img
                      src={
                        SPRITE_MAP[selectedPeer.avatarId] ||
                        `/assets/inventory_portraits/${getPortraitFileName(selectedPeer.avatarId)}`
                      }
                      alt={selectedPeer.username}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.onerror = null;
                        target.src = `/assets/inventory_portraits/${DEFAULT_AVATAR_ID}.jpeg`;
                      }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-white font-bold text-base">@{selectedPeer.username}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        Online
                      </span>
                    </div>
                    {selectedPeer.title && (
                      <p className="text-xs text-yellow-300 font-medium">{selectedPeer.title}</p>
                    )}
                  </div>
                </div>

                {peerInteractionStep !== "waiting" && (
                  <button
                    type="button"
                    onClick={() => setSelectedPeer(null)}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Step: Menu Options */}
              {peerInteractionStep === "menu" && (
                <div className="p-5 space-y-3">
                  <p className="text-xs text-gray-400">
                    Interact with Rover <span className="text-white font-bold">@{selectedPeer.username}</span> in the Plaza:
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        const peerName = selectedPeer.username;
                        setSelectedPeer(null);
                        onOpenProfile(peerName);
                      }}
                      className="flex flex-col items-center justify-center p-4 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-yellow-400/40 text-gray-200 hover:text-white transition-all cursor-pointer group active:scale-95"
                    >
                      <User className="w-6 h-6 text-yellow-400 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold uppercase tracking-wider">View Profile</span>
                      <span className="text-[10px] text-gray-400 mt-1">Showcase & Records</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setPeerInteractionStep("bet");
                      }}
                      className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-b from-rose-500/20 to-red-500/10 hover:from-rose-500/30 hover:to-red-500/20 border border-rose-400/50 hover:border-rose-400 text-rose-200 hover:text-white transition-all cursor-pointer group active:scale-95 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                    >
                      <Swords className="w-6 h-6 text-rose-400 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold uppercase tracking-wider text-rose-300">Challenge</span>
                      <span className="text-[10px] text-gray-400 mt-1">Live 1v1 PvP Duel</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Step: Bet Selection */}
              {peerInteractionStep === "bet" && (
                <div className="p-5 space-y-4">
                  <div>
                    <h4 className="text-xs text-yellow-400 uppercase tracking-wider font-bold">Select Challenge Stakes</h4>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Choose the Astrite amount to wager on this 1v1 match. Winner takes all!
                    </p>
                  </div>

                  {/* Preset Bet Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { amount: 0, label: "Casual (0 ✦)" },
                      { amount: 160, label: "1 Pull (160 ✦)" },
                      { amount: 320, label: "2 Pulls (320 ✦)" },
                      { amount: 800, label: "5 Pulls (800 ✦)" },
                      { amount: 1600, label: "10 Pulls (1.6k ✦)" },
                    ].map((preset) => {
                      const isSelected = selectedBet === preset.amount && !customBetInput;
                      const hasEnough = isSandboxGuest || (userState?.astrite ?? 0) >= preset.amount;
                      return (
                        <button
                          key={preset.amount}
                          type="button"
                          disabled={!hasEnough}
                          onClick={() => {
                            soundEngine.playClick();
                            setSelectedBet(preset.amount);
                            setCustomBetInput("");
                          }}
                          className={`px-2.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 flex flex-col items-center ${
                            isSelected
                              ? "bg-yellow-400 text-black border-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.5)]"
                              : hasEnough
                              ? "bg-white/5 hover:bg-white/10 border-white/10 text-gray-200"
                              : "bg-white/2 border-white/5 text-gray-600 cursor-not-allowed opacity-40"
                          }`}
                        >
                          <span>{preset.label}</span>
                        </button>
                      );
                    })}

                    {/* Custom Bet Button */}
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        setCustomBetInput("0");
                      }}
                      className={`px-2.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 flex flex-col items-center ${
                        customBetInput
                          ? "bg-yellow-400 text-black border-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.5)]"
                          : "bg-white/5 hover:bg-white/10 border-white/10 text-gray-200"
                      }`}
                    >
                      <span>Custom</span>
                    </button>
                  </div>

                  {/* Custom Bet Input Field */}
                  {customBetInput !== "" && (
                    <div className="flex items-center space-x-2 bg-black/60 p-2 rounded-xl border border-white/15">
                      <AstriteIcon className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      <input
                        type="number"
                        min="0"
                        max={Math.min(250000, isSandboxGuest ? 250000 : (userState?.astrite ?? 0))}
                        value={customBetInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomBetInput(val);
                          const parsed = parseInt(val, 10);
                          if (!isNaN(parsed) && parsed >= 0) {
                            setSelectedBet(Math.min(parsed, 250000));
                          }
                        }}
                        onBlur={() => {
                          const parsed = parseInt(customBetInput, 10);
                          if (!isNaN(parsed) && parsed > 250000) {
                            setSelectedBet(250000);
                            setCustomBetInput("250000");
                          }
                        }}
                        placeholder="Enter Astrite amount (Max 250k)..."
                        className="w-full bg-transparent text-white text-xs font-mono outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const max = Math.min(250000, isSandboxGuest ? 250000 : (userState?.astrite ?? 0));
                          setSelectedBet(max);
                          setCustomBetInput(String(max));
                        }}
                        className="px-2 py-0.5 rounded bg-yellow-400/20 text-yellow-300 text-[10px] font-bold hover:bg-yellow-400/30 cursor-pointer"
                        title="Max Bet (up to 250,000 Astrites)"
                      >
                        MAX
                      </button>
                    </div>
                  )}

                  {/* Balance Display */}
                  <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-white/10">
                    <span>Your Balance:</span>
                    <span className="text-yellow-400 font-bold flex items-center space-x-1">
                      <AstriteIcon className="w-3.5 h-3.5" />
                      <span>{isSandboxGuest ? "∞" : (userState?.astrite ?? 0).toLocaleString()} ✦</span>
                    </span>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setPeerInteractionStep("menu")}
                      className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={!isSandboxGuest && (userState?.astrite ?? 0) < selectedBet}
                      onClick={() => {
                        soundEngine.playClick();
                        const roomCode = `pvp_${Math.random().toString(36).substring(2, 9)}`;
                        realtimeRef.current?.sendChallenge(selectedPeer.id, selectedBet, roomCode);
                        setOutgoingChallenge({
                          targetId: selectedPeer.id,
                          targetUsername: selectedPeer.username,
                          bet: selectedBet,
                          roomCode,
                        });
                        setPeerInteractionStep("waiting");
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(250,204,21,0.3)] active:scale-95"
                    >
                      Send Challenge ({selectedBet} ✦)
                    </button>
                  </div>
                </div>
              )}

              {/* Step: Waiting for Response */}
              {peerInteractionStep === "waiting" && (
                <div className="p-6 text-center space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400">
                    <Swords className="w-6 h-6 animate-pulse" />
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Challenge Sent!</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Waiting for <span className="text-yellow-300 font-bold">@{selectedPeer.username}</span> to accept...
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Stakes: {selectedBet > 0 ? `${selectedBet} ✦ Astrite` : "Casual (0 ✦)"}
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick();
                        if (outgoingChallenge) {
                          realtimeRef.current?.cancelChallenge(outgoingChallenge.targetId, outgoingChallenge.roomCode);
                        }
                        setOutgoingChallenge(null);
                        setPeerInteractionStep("menu");
                        setSelectedPeer(null);
                        setToastMessage("Challenge cancelled.");
                        setTimeout(() => setToastMessage(null), 2500);
                      }}
                      className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      Cancel Challenge
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 7. PLAZA MINI-MAP & RADAR MODAL */}
      {/* ========================================================================= */}
      <PlazaMiniMapModal
        isOpen={showMiniMap}
        onClose={() => setShowMiniMap(false)}
        localPlayer={localPlayer}
        peerPlayers={peerPlayers}
        npcs={npcs}
        currentLobbyId={currentLobbyId}
        onlineCount={onlineCount}
        trackedNpcId={trackedNpc?.id}
        onTrackNpc={(npc) => {
          soundEngine.playClick();
          setTrackedNpc(npc);
          trackedNpcRef.current = npc;
        }}
        onSelectNpc={(npc) => {
          soundEngine.playClick();
          setSelectedNpc(npc);
        }}
      />

      {/* ========================================================================= */}
      {/* 8. PLAZA CASINO & ARCADE MINIGAMES MODAL (Slots, Blackjack, Coinflip, etc.) */}
      {/* ========================================================================= */}
      <PlazaMinigamesModal
        isOpen={minigamesModalState.isOpen}
        onClose={handleCloseMinigames}
        initialGame={minigamesModalState.initialGame}
        lockedGame={minigamesModalState.initialGame}
        astriteBalance={userState?.astrite ?? 0}
        onUpdateAstrites={handleUpdateMinigameAstrites}
      />

      {/* ========================================================================= */}
      {/* 8B. AGE VERIFICATION MODAL (For existing users who haven't set birthday) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isAgeVerificationModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/90 flex items-center justify-center p-4 pointer-events-auto select-none"
            onClick={() => setIsAgeVerificationModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              style={{ willChange: "transform, opacity" }}
              className="w-full max-w-md rounded-2xl bg-[#0c1017]/98 border-2 border-yellow-400/50 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(250,204,21,0.2)] p-6 text-left font-mono space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-yellow-400/15 border border-yellow-400/30 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                  <Cake className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                    Age Verification Required
                  </h3>
                  <p className="text-xs text-yellow-400/80 font-mono">
                    Jinzhou Entertainment District
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">
                Greetings, Rover! Before entering the Jinzhou entertainment minigames, the Magistracy requires age verification. Please provide your Date of Birth to proceed.
              </p>

              <form onSubmit={handleVerifyAgeAndPlay} className="space-y-3.5 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-yellow-400 font-bold flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Select Date of Birth</span>
                  </label>
                  <input
                    type="date"
                    required
                    autoFocus
                    max={new Date().toISOString().split("T")[0]}
                    value={verificationBirthdayInput}
                    onChange={(e) => setVerificationBirthdayInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/15 focus:border-yellow-400 rounded-xl text-sm font-mono text-white placeholder-gray-600 focus:outline-none transition-all [color-scheme:dark]"
                  />
                  <p className="text-[10px] text-gray-400">
                    Your birthday is also used for account recovery. 18+ required to play.
                  </p>
                </div>

                {verificationError && (
                  <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs font-mono text-red-300">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
                    <span>{verificationError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    disabled={verificationLoading}
                    onClick={() => {
                      soundEngine.playClick();
                      setIsAgeVerificationModalOpen(false);
                      setPendingMinigame(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white text-xs font-bold transition-all cursor-pointer active:scale-95"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={verificationLoading}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-black text-xs font-black tracking-wider uppercase shadow-[0_0_20px_rgba(250,204,21,0.4)] transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {verificationLoading ? "Verifying..." : "Verify & Play"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 8C. AGE RESTRICTED NOTICE MODAL (< 18 Rover Restriction) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isAgeRestrictedModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/90 flex items-center justify-center p-4 pointer-events-auto select-none"
            onClick={() => setIsAgeRestrictedModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              style={{ willChange: "transform, opacity" }}
              className="w-full max-w-md rounded-2xl bg-[#0c1017]/98 border-2 border-rose-500/60 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(244,63,94,0.3)] p-6 text-center font-mono space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/15 border-2 border-rose-500/40 flex items-center justify-center text-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.4)]">
                <ShieldAlert className="w-8 h-8 animate-pulse" />
              </div>

              <div>
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30">
                  18+ Rover Entertainment Only
                </span>
                <h3 className="text-lg font-black text-white mt-2 uppercase tracking-wide">
                  Age Restriction Notice
                </h3>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed px-2">
                Sorry, Rover! You must be at least 18 years old to access the Jinzhou entertainment games. Please enjoy exploring the city and other historic landmarks!
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setIsAgeRestrictedModalOpen(false);
                    setPendingMinigame(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 hover:text-white text-xs font-bold transition-all cursor-pointer active:scale-95 uppercase tracking-wider"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    {/* ========================================================================= */}
    {/* 6.5 INCOMING CHALLENGE MODAL (Hoisted so it displays across Convene & Plaza) */}
    {/* ========================================================================= */}
    <AnimatePresence>
      {incomingChallenge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto select-none"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 15 }}
            className="w-full max-w-md rounded-2xl bg-[#0c1017]/98 border-2 border-rose-400/70 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(244,63,94,0.3)] p-5 text-center font-mono space-y-4"
          >
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/15 border-2 border-rose-400 flex items-center justify-center text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.4)]">
              <Swords className="w-7 h-7 animate-bounce" />
            </div>

            <div>
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest px-2 py-0.5 rounded bg-rose-500/10 border border-rose-400/30">
                Incoming 1v1 Challenge
              </span>
              <h3 className="text-lg font-black text-white mt-2">
                @{incomingChallenge.challengerUsername} has challenged you!
              </h3>
              <p className="text-xs text-gray-300 mt-1">
                Wager:{" "}
                <span className="text-yellow-400 font-bold">
                  {incomingChallenge.bet > 0 ? `${incomingChallenge.bet} ✦ Astrite` : "Casual (0 ✦)"}
                </span>
              </p>
            </div>

            {/* Balance Warning if Recipient is short on Astrite */}
            {!isSandboxGuest && (userState?.astrite ?? 0) < incomingChallenge.bet && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs">
                ⚠️ You need at least {incomingChallenge.bet} Astrite to accept this wager.
              </div>
            )}

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  realtimeRef.current?.respondChallenge(
                    incomingChallenge.challengerId,
                    false,
                    incomingChallenge.roomCode,
                    incomingChallenge.bet,
                    "declined"
                  );
                  setIncomingChallenge(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold transition-all cursor-pointer active:scale-95 uppercase tracking-wider"
              >
                Decline
              </button>

              <button
                type="button"
                disabled={!isSandboxGuest && (userState?.astrite ?? 0) < incomingChallenge.bet}
                onClick={() => {
                  soundEngine.playClick();
                  const req = incomingChallenge;
                  realtimeRef.current?.respondChallenge(
                    req.challengerId,
                    true,
                    req.roomCode,
                    req.bet
                  );
                  setIncomingChallenge(null);
                  onLaunchPvPChallenge?.(req.roomCode, req.bet, req.challengerUsername, false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-400 hover:to-red-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.4)] active:scale-95 uppercase tracking-wider"
              >
                Accept Duel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </>
  );
};
