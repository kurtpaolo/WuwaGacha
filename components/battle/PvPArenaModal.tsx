"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords,
  Shield,
  Zap,
  Sparkles,
  X,
  Trophy,
  Search,
  Users,
  RotateCcw,
  ArrowRightLeft,
  Crown,
  Flame,
  Snowflake,
  ChevronRight,
  ChevronLeft,
  Briefcase,
  AlertTriangle,
  Radio,
  Copy,
  Check,
  Clock,
  Wifi,
  Layers,
  ArrowLeft,
  Lock,
  Skull,
  Plus,
  Info,
  HelpCircle,
} from "lucide-react";
import { soundEngine } from "@/lib/audio/soundEngine";
import { LiberationCutIn } from "./LiberationCutIn";
import { CombatSlashVFX } from "./CombatSlashVFX";
import {
  BattleMove,
  BattleResonator,
  BattleTrainer,
  BattleLogEntry,
  ResonatorElement,
  TimelineEntry,
  TargetScope,
  MoveCategory,
} from "@/lib/battle/types";
import { ELEMENT_COLORS, getTypeMatchup } from "@/lib/battle/typeChart";
import {
  executeMoveDamage,
  chooseAiAction,
  processTurnStartStatus,
  chooseAiFaintReplacement,
  createActionTimeline,
  advanceTimeline,
  insertUltimateInterrupt,
  removeUnitFromTimeline,
  addUnitToTimeline,
  execute3v3Action,
  deployReserveResonator,
  isTeamWiped,
} from "@/lib/battle/battleEngine";
import {
  getAllGymBosses,
  createGymBossTrainer,
  GymBoss,
  GYM_STAGES,
  GymStageLevel,
  isGymBossClaimedToday,
  recordGymBossClaim,
  getTimeUntilGmt8Reset,
  getResonatorLevel,
  setResonatorLevel,
  getCombatExp,
  addCombatExp,
  spendCombatExp,
  getUpgradeExpCost,
  getUpgradeAstriteCost,
  searchPlayerTrainer,
  searchPvpPlayers,
  PlayerSearchResult,
  getStoredPvpStats,
  recordBattleResult,
  PvpStats,
  getDailyPvpCasualWins,
  recordDailyPvpCasualWin,
  MAX_DAILY_PVP_CASUAL_WINS,
  savePendingPvpNotice,
  clearPendingPvpNotice,
  PendingPvpNotice,
} from "@/lib/battle/pvpService";
import {
  TowerFloorInfo,
  TowerBlessing,
  TowerRunState,
  TOWER_FLOORS,
  getTowerRunState,
  saveTowerRunState,
  resetTowerRunState,
  generateBlessingDraft,
  createTowerFloorTrainer,
  getTowerFloorsForPage,
  getTowerFloorInfo,
  getTowerFloorLevel,
} from "@/lib/battle/towerService";
import { createBattleResonator, SPRITE_MAP } from "@/lib/battle/resonatorMoves";
import { getPortraitFileName } from "@/lib/data/portraits";
import { UserInventoryItem } from "@/lib/supabase/inventory";
import { AstriteIcon } from "@/components/ui/GameIcons";
import {
  PvpRealtimeManager,
  RealtimeBattleAction,
  generateRoomCode,
} from "@/lib/battle/pvpRealtime";
import charactersData from "@/characters.json";

const LIMITED_RESONATOR_IDS = new Set<string>(
  ((charactersData as any)?.limitedResonators || []).map((c: any) => c.id)
);

interface StatusEffectDetail {
  name: string;
  icon: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  summary: string;
}

const STATUS_EFFECT_INFO: Record<string, StatusEffectDetail> = {
  burn: {
    name: "Burn",
    icon: "🔥",
    badgeBg: "bg-red-500/20",
    badgeText: "text-red-300",
    badgeBorder: "border-red-500/40",
    summary: "Takes 6% Max HP Fusion damage at the start of each turn.",
  },
  freeze: {
    name: "Freeze",
    icon: "❄️",
    badgeBg: "bg-cyan-500/20",
    badgeText: "text-cyan-300",
    badgeBorder: "border-cyan-500/40",
    summary: "Frozen solid in Glacio ice! Completely skips turn and cannot attack.",
  },
  shock: {
    name: "Shock",
    icon: "⚡",
    badgeBg: "bg-violet-500/20",
    badgeText: "text-violet-300",
    badgeBorder: "border-violet-500/40",
    summary: "Electrified voltage. Takes lightning DoT and cannot gain Energy.",
  },
  stagnation: {
    name: "Stagnation",
    icon: "⏳",
    badgeBg: "bg-yellow-500/20",
    badgeText: "text-yellow-300",
    badgeBorder: "border-yellow-500/40",
    summary: "Time-dilated field. -20% accuracy and delayed action pacing.",
  },
  erosion: {
    name: "Erosion",
    icon: "💀",
    badgeBg: "bg-rose-500/20",
    badgeText: "text-rose-300",
    badgeBorder: "border-rose-500/40",
    summary: "Corrosive decay. DEF reduced by 25%, amplifying incoming damage.",
  },
  dizzy: {
    name: "Dizzy",
    icon: "💫",
    badgeBg: "bg-emerald-500/20",
    badgeText: "text-emerald-300",
    badgeBorder: "border-emerald-500/40",
    summary: "Disoriented by gales. -30% accuracy with high chance to miss.",
  },
  buff_atk: {
    name: "ATK Boost",
    icon: "⚔️",
    badgeBg: "bg-orange-500/20",
    badgeText: "text-orange-300",
    badgeBorder: "border-orange-500/40",
    summary: "Combat posture amplified. Deals +25% bonus attack damage.",
  },
  buff_def: {
    name: "DEF Boost",
    icon: "🛡️",
    badgeBg: "bg-blue-500/20",
    badgeText: "text-blue-300",
    badgeBorder: "border-blue-500/40",
    summary: "Hardened defense. Reduces incoming damage by 25%.",
  },
  debuff_atk: {
    name: "ATK Down",
    icon: "📉",
    badgeBg: "bg-red-500/20",
    badgeText: "text-red-300",
    badgeBorder: "border-red-500/40",
    summary: "Weakened offensive stance. Deals 25% less damage.",
  },
  debuff_def: {
    name: "DEF Down",
    icon: "💔",
    badgeBg: "bg-red-500/20",
    badgeText: "text-red-300",
    badgeBorder: "border-red-500/40",
    summary: "Armor fractured. DEF reduced by 25%, taking more damage.",
  },
  guard: {
    name: "Guard",
    icon: "🛡️",
    badgeBg: "bg-cyan-500/20",
    badgeText: "text-cyan-300",
    badgeBorder: "border-cyan-500/40",
    summary: "Takes 50% reduced damage, immune to status effects, and blocks Knockdown / 1 More.",
  },
  overdrive: {
    name: "Overdrive",
    icon: "🔥",
    badgeBg: "bg-red-600/30",
    badgeText: "text-amber-300",
    badgeBorder: "border-red-500/50",
    summary: "Boss Enraged! +30% attack power, increased crit chance, and immune to Knockdown.",
  },
  down: {
    name: "Downed",
    icon: "💥",
    badgeBg: "bg-rose-600/30",
    badgeText: "text-rose-300",
    badgeBorder: "border-rose-500/50",
    summary: "Vulnerable! Takes +25% bonus damage and skips next turn.",
  },
  barrier: {
    name: "Energy Barrier",
    icon: "🛡️",
    badgeBg: "bg-amber-500/20",
    badgeText: "text-amber-300",
    badgeBorder: "border-amber-500/40",
    summary: "Absorbs incoming direct damage before Resonator HP is reduced.",
  },
  stun: {
    name: "Stun",
    icon: "💫",
    badgeBg: "bg-amber-500/20",
    badgeText: "text-amber-300",
    badgeBorder: "border-amber-500/40",
    summary: "Stunned! Skips turn completely and cannot act.",
  },
  vulnerable: {
    name: "Vulnerable",
    icon: "🎯",
    badgeBg: "bg-rose-500/20",
    badgeText: "text-rose-300",
    badgeBorder: "border-rose-500/40",
    summary: "Exposed defense! Takes +25% increased damage from attacks.",
  },
  buff_crit: {
    name: "Crit Boost",
    icon: "✨",
    badgeBg: "bg-yellow-500/20",
    badgeText: "text-yellow-300",
    badgeBorder: "border-yellow-500/40",
    summary: "Sharpened focus! +25% Critical Strike chance.",
  },
  buff_next_attack: {
    name: "Charged",
    icon: "⚡",
    badgeBg: "bg-orange-500/20",
    badgeText: "text-orange-300",
    badgeBorder: "border-orange-500/40",
    summary: "Charged strike! Next attack deals +50% bonus damage.",
  },
  buff_dodge: {
    name: "Dodge Boost",
    icon: "💨",
    badgeBg: "bg-teal-500/20",
    badgeText: "text-teal-300",
    badgeBorder: "border-teal-500/40",
    summary: "Elusive footwork! +30% evasion against incoming attacks.",
  },
  debuff_spd: {
    name: "Slow",
    icon: "🧊",
    badgeBg: "bg-blue-500/20",
    badgeText: "text-blue-300",
    badgeBorder: "border-blue-500/40",
    summary: "Hindered movement! -15% accuracy and delayed pacing.",
  },
};

const StatusBadgeWithTooltip: React.FC<{
  type: string;
  duration?: number;
  customLabel?: string;
  position?: "top" | "bottom";
  align?: "left" | "right" | "center";
}> = ({ type, duration, customLabel, position = "top", align = "left" }) => {
  const info = STATUS_EFFECT_INFO[type] || {
    name: type.toUpperCase(),
    icon: "✨",
    badgeBg: "bg-white/10",
    badgeText: "text-yellow-300",
    badgeBorder: "border-white/20",
    summary: "Combat status effect currently active on this resonator.",
  };

  const getPositionClasses = () => {
    const vertical = position === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5";
    let horizontal = "left-0";
    if (align === "right") {
      horizontal = "right-0";
    } else if (align === "center") {
      horizontal = "left-1/2 -translate-x-1/2";
    }
    return `${vertical} ${horizontal}`;
  };

  return (
    <div className="relative group/badge inline-flex items-center">
      <span
        className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold uppercase flex items-center space-x-0.5 border cursor-help transition-transform hover:scale-105 ${info.badgeBg} ${info.badgeText} ${info.badgeBorder}`}
      >
        <span>{info.icon}</span>
        <span>{customLabel || info.name}</span>
        {duration !== undefined && <span>({duration}T)</span>}
      </span>

      {/* Floating Tooltip */}
      <div
        className={`pointer-events-none absolute z-50 hidden group-hover/badge:flex flex-col w-48 sm:w-52 p-2 rounded-lg bg-[#0b101c] border border-white/20 shadow-2xl text-left ${getPositionClasses()}`}
      >
        <div className="flex items-center space-x-1.5 border-b border-white/10 pb-1 mb-1">
          <span className="text-xs">{info.icon}</span>
          <span className="text-[11px] font-bold text-white font-mono">{info.name}</span>
          {duration !== undefined && (
            <span className="text-[9px] font-mono text-cyan-300 ml-auto">{duration} turn(s) left</span>
          )}
        </div>
        <p className="text-[9px] text-gray-300 font-sans leading-snug">
          {info.summary}
        </p>
      </div>
    </div>
  );
};

interface PvPArenaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToGames?: () => void;
  currentUserId?: string;
  currentUsername?: string;
  currentAvatarId?: string;
  inventory?: UserInventoryItem[];
  showcaseIds?: string[];
  initialOpponentUsername?: string;
  initialTab?: "gym" | "tower" | "live" | "search";
  initialRoomCode?: string;
  initialBet?: number;
  initialIsHost?: boolean;
  userAstrite?: number;
  onAstriteReward?: (amount: number) => void;
  onAstriteChange?: (delta: number) => void;
  isSessionDisplaced?: boolean;
}
 
const getClientDeviceId = (): string => {
  if (typeof window === "undefined") return "server_device";
  let deviceId: string | null = null;
  try {
    deviceId = sessionStorage.getItem("wuwa_pvp_client_device_id");
  } catch {}
  if (!deviceId) {
    deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    try {
      sessionStorage.setItem("wuwa_pvp_client_device_id", deviceId);
    } catch {}
  }
  return deviceId;
};

export const PvPArenaModal: React.FC<PvPArenaModalProps> = ({
  isOpen,
  onClose,
  onBackToGames,
  currentUserId,
  currentUsername,
  currentAvatarId,
  inventory,
  showcaseIds,
  initialOpponentUsername,
  initialTab,
  initialRoomCode,
  initialBet,
  initialIsHost,
  userAstrite = 0,
  onAstriteReward,
  onAstriteChange,
  isSessionDisplaced = false,
}) => {
  const isGuestPlayer = !currentUserId || currentUserId.startsWith("guest");
  // Arena screen state: 'lobby' | 'room_prep' | 'battle' | 'result'
  const [screen, setScreen] = useState<"lobby" | "room_prep" | "battle" | "result">("lobby");
  const [pvpStats, setPvpStats] = useState<PvpStats>(() => getStoredPvpStats(currentUserId));
  const [battlePointsDelta, setBattlePointsDelta] = useState<{ delta: number; isUnderdog: boolean } | null>(null);
  const [battleTurnCount, setBattleTurnCount] = useState<number>(0);
  const battleTurnCountRef = useRef<number>(0);
  const [isEarlyForfeitMatch, setIsEarlyForfeitMatch] = useState<boolean>(false);

  // Betting Stakes (0 = Casual, 160 = 1 Pull, 800 = 5 Pulls, 1600 = 10 Pulls)
  const [selectedBet, setSelectedBet] = useState<number>(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Party Configuration (6 members)
  const [selectedPartyIds, setSelectedPartyIds] = useState<string[]>([]);
  const [isPartyPickerOpen, setIsPartyPickerOpen] = useState(false);
  const [isPvPGuideOpen, setIsPvPGuideOpen] = useState(false);
  const [guideTab, setGuideTab] = useState<"basics" | "elements" | "mechanics" | "stakes">("basics");

  // Switch Cooldown (2-turn lock to prevent switch abuse)
  const [playerSwitchCooldown, setPlayerSwitchCooldown] = useState<number>(0);

  // Matchmaking / Opponent Selection & Challenge
  const [lobbyTab, setLobbyTab] = useState<"gym" | "tower" | "live" | "search">(initialTab || "gym");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchedOpponent, setSearchedOpponent] = useState<BattleTrainer | null>(null);
  const [playerSearchResults, setPlayerSearchResults] = useState<PlayerSearchResult[]>([]);
  const [hasSearchedPlayers, setHasSearchedPlayers] = useState(false);
  const [selectedChallengeOpponent, setSelectedChallengeOpponent] = useState<BattleTrainer | null>(null);
  const [isPlayerChallengePrepOpen, setIsPlayerChallengePrepOpen] = useState(false);
  const [selectedNpcId, setSelectedNpcId] = useState("npc_rover");

  // Tower of Adversity State (10-floor rogue-lite with persistent HP & draftable blessings)
  const [towerRunState, setTowerRunState] = useState<TowerRunState>(() => getTowerRunState(currentUserId));
  const [currentTowerFloor, setCurrentTowerFloor] = useState<TowerFloorInfo | null>(null);
  const [selectedTowerFloor, setSelectedTowerFloor] = useState<TowerFloorInfo | null>(null);
  const [isTowerPrepOpen, setIsTowerPrepOpen] = useState(false);
  const [isDraftingBlessing, setIsDraftingBlessing] = useState(false);
  const [draftOptions, setDraftOptions] = useState<TowerBlessing[]>([]);
  const [isRevivePickerOpen, setIsRevivePickerOpen] = useState(false);
  const [selectedReviveBlessing, setSelectedReviveBlessing] = useState<TowerBlessing | null>(null);
  const [towerToast, setTowerToast] = useState<string | null>(null);
  const [towerPageBlock, setTowerPageBlock] = useState<number>(() => {
    return Math.floor(((towerRunState?.currentFloor || 1) - 1) / 5);
  });

  useEffect(() => {
    setTowerPageBlock(Math.floor(((towerRunState?.currentFloor || 1) - 1) / 5));
  }, [towerRunState?.currentFloor]);

  // Automatically reset Tower run if squad is wiped out
  useEffect(() => {
    if (lobbyTab === "tower" && towerRunState) {
      const lockedIds = towerRunState.lockedPartyIds || [];
      const isWiped =
        towerRunState.isWipedOut ||
        (lockedIds.length > 0 && lockedIds.every((id) => (towerRunState.partyHpMap[id] ?? 0) <= 0));
      if (isWiped) {
        const fresh = resetTowerRunState(currentUserId);
        setTowerRunState(fresh);
        setTowerPageBlock(0);
        setTowerToast("Squad wiped out! Tower run has been automatically reset to Floor 1.");
        setTimeout(() => setTowerToast(null), 3500);
      }
    }
  }, [lobbyTab, towerRunState?.isWipedOut, currentUserId]);

  const paginatedTowerFloors = useMemo(() => {
    return getTowerFloorsForPage(towerPageBlock, 5);
  }, [towerPageBlock]);

  // Gym Bosses, Stages & Daily 00:00 GMT+8 Cooldown
  const allGymBosses = useMemo(() => getAllGymBosses(), []);
  const [selectedGymBoss, setSelectedGymBoss] = useState<GymBoss | null>(null);
  const [selectedGymStageLevel, setSelectedGymStageLevel] = useState<number>(60);
  const [isGymPrepOpen, setIsGymPrepOpen] = useState(false);
  const [gymElementFilter, setGymElementFilter] = useState<string>("all");
  const [combatExp, setCombatExp] = useState<number>(() => getCombatExp(currentUserId));
  const [timeUntilReset, setTimeUntilReset] = useState<string>(() => getTimeUntilGmt8Reset().formatted);
  const [currentGymChallenge, setCurrentGymChallenge] = useState<{ boss: GymBoss; stageLevel: number } | null>(null);
  const [, setLevelUpdateTrigger] = useState<number>(0);

  // Memoized Gym Bosses by element filter to avoid recalculating on every render
  const filteredGymBosses = useMemo(() => {
    if (gymElementFilter === "all") return allGymBosses;
    return allGymBosses.filter(
      (boss) => boss.element.toLowerCase() === gymElementFilter.toLowerCase()
    );
  }, [allGymBosses, gymElementFilter]);

  // Clean sub-modal reset helper to avoid multiple overlapping layers
  const closeAllSubModals = () => {
    setIsGymPrepOpen(false);
    setIsTowerPrepOpen(false);
    setIsPlayerChallengePrepOpen(false);
    setIsPartyPickerOpen(false);
    setIsPvPGuideOpen(false);
    setShowExitConfirm(false);
    setIsFaintPickerOpen(false);
    setIsTeamSyncPickerOpen(false);
    setIsRevivePickerOpen(false);
    setSelectedReviveBlessing(null);
  };

  // Clear player search state when navigating away from player search
  const clearPlayerSearch = () => {
    setSearchQuery("");
    setPlayerSearchResults([]);
    setHasSearchedPlayers(false);
    setSearchError(null);
    setSearchedOpponent(null);
  };

  // Only run the 1-second countdown when Gym mode is actually active and visible
  useEffect(() => {
    if (!isOpen || (lobbyTab !== "gym" && !isGymPrepOpen)) return;
    const timer = setInterval(() => {
      setTimeUntilReset(getTimeUntilGmt8Reset().formatted);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, lobbyTab, isGymPrepOpen]);

  // Clean up any active PvP realtime room when arena modal unmounts
  useEffect(() => {
    return () => {
      realtimeManagerRef.current?.leaveRoom();
    };
  }, []);

  // Resync on tab focus / visibility change (recovers from Alt-Tab backgrounding)
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        realtimeManagerRef.current?.resyncOnFocus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, []);

  // Real-time 1v1 Room State
  const [isRealtimeMatch, setIsRealtimeMatch] = useState(false);
  const [roomCode, setRoomCode] = useState<string>("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [isWaitingForChallenger, setIsWaitingForChallenger] = useState(false);
  const [isConnectingRoom, setIsConnectingRoom] = useState(false);
  const [isHosting, setIsHosting] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [isMyReady, setIsMyReady] = useState(false);
  const [isOpponentReady, setIsOpponentReady] = useState(false);
  const [isOpponentReconnecting, setIsOpponentReconnecting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const realtimeManagerRef = useRef<PvpRealtimeManager | null>(null);
  const playerTrainerRef = useRef<BattleTrainer | null>(null);
  const opponentTrainerRef = useRef<BattleTrainer | null>(null);

  // Full roster of playable resonators for party picker - STRICTLY OWNED ONLY
  const allRosterCharacters = useMemo(() => {
    const list: Array<{ id: string; name: string; element: string; rarity: number }> = [];
    const seen = new Set<string>();

    const allJson = [
      ...((charactersData as any)?.limitedResonators || []),
    ];

    const charMap = new Map<string, any>();
    for (const c of allJson) {
      if (c && c.id && !charMap.has(c.id)) {
        charMap.set(c.id, c);
      }
    }

    // ONLY limited 5-star resonators in the user's inventory
    if (inventory && inventory.length > 0) {
      for (const item of inventory) {
        if (!item?.character_id) continue;
        if (!charMap.has(item.character_id)) continue;
        if (!seen.has(item.character_id)) {
          seen.add(item.character_id);
          const meta = charMap.get(item.character_id);
          list.push({
            id: item.character_id,
            name: meta?.name || item.character_name || item.character_id.replace(/_/g, " "),
            element: meta?.element || "Spectro",
            rarity: 5,
          });
        }
      }
    }

    return list;
  }, [inventory]);

  // Active Battle State
  const [playerTrainer, setPlayerTrainer] = useState<BattleTrainer | null>(null);
  const [opponentTrainer, setOpponentTrainer] = useState<BattleTrainer | null>(null);
  const [battleLogs, setBattleLogs] = useState<BattleLogEntry[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [isSwitchMenuOpen, setIsSwitchMenuOpen] = useState(false);
  const [battleWinner, setBattleWinner] = useState<"player" | "opponent" | null>(null);
  const [oneMoreBanner, setOneMoreBanner] = useState<"player" | "opponent" | null>(null);
  const [isOneMoreActive, setIsOneMoreActive] = useState(false);

  // 3v3 HSR Action Timeline & Multi-Target State
  const [actionTimeline, setActionTimeline] = useState<TimelineEntry[]>([]);
  const [selectedEnemySlot, setSelectedEnemySlot] = useState<number>(0);
  const [selectedAllySlot, setSelectedAllySlot] = useState<number>(0);
  const [activeTargetType, setActiveTargetType] = useState<"enemy" | "ally">("enemy");
  const [isFaintReplaceModalOpen, setIsFaintReplaceModalOpen] = useState(false);
  const [faintedSlotIndex, setFaintedSlotIndex] = useState<number | null>(null);

  // Faint Replacement & Team Sync Pickers
  const [isFaintPickerOpen, setIsFaintPickerOpen] = useState(false);
  const [pendingFaintTurnDecision, setPendingFaintTurnDecision] = useState<"player" | "opponent">("player");
  const [isTeamSyncPickerOpen, setIsTeamSyncPickerOpen] = useState(false);
  const [pendingTeamSyncMove, setPendingTeamSyncMove] = useState<BattleMove | null>(null);

  // Visual Battle FX
  const [playerAnim, setPlayerAnim] = useState<"idle" | "attack" | "hit" | "faint">("idle");
  const [opponentAnim, setOpponentAnim] = useState<"idle" | "attack" | "hit" | "faint">("idle");
  const [floatingText, setFloatingText] = useState<{
    target: "player" | "opponent";
    slotIdx?: number;
    text: string;
    isCrit?: boolean;
  } | null>(null);

  // Liberation Cut-In & Battlefield Screen Shake
  const [liberationCutIn, setLiberationCutIn] = useState<{
    resonator: BattleResonator;
    move: BattleMove;
    isPlayer: boolean;
  } | null>(null);
  const [isScreenShaking, setIsScreenShaking] = useState<boolean>(false);
  const triggerScreenShake = (durationMs: number = 300) => {
    setIsScreenShaking(true);
    setTimeout(() => setIsScreenShaking(false), durationMs);
  };

  // Physical Attack Dash & Elemental Slash State
  const [activeAttack, setActiveAttack] = useState<{
    attacker: "player" | "opponent";
    attackerSlot: number;
    targetSlot: number;
    delta: { x: number; y: number };
    move: BattleMove;
    phase: "approach" | "strike" | "return";
  } | null>(null);

  // Active Slash VFX on Target Slot(s)
  const [activeSlash, setActiveSlash] = useState<{
    target: "player" | "opponent";
    slotIndices: number[];
    element: ResonatorElement;
    category?: MoveCategory;
    isCrit?: boolean;
    isSuper?: boolean;
  } | null>(null);

  // In-Arena Stage Victory/Defeat Banner
  const [stageEndBanner, setStageEndBanner] = useState<"VICTORY" | "DEFEAT" | null>(null);

  // Floating Healing Green + Signs State
  const [healingPops, setHealingPops] = useState<{
    id: string;
    target: "player" | "opponent";
    slotIdx: number;
    amount: number;
  }[]>([]);

  const triggerHealingPop = (target: "player" | "opponent", slotIdx: number, amount: number) => {
    const id = `heal_${Date.now()}_${Math.random()}`;
    setHealingPops((prev) => [...prev, { id, target, slotIdx, amount }]);
    setTimeout(() => {
      setHealingPops((prev) => prev.filter((p) => p.id !== id));
    }, 1200);
  };

  // Dynamic Dash Offset Calculator
  const getDashDelta = (isPlayer: boolean, attackerSlot: number, targetSlot: number) => {
    if (typeof document !== "undefined") {
      const attackerId = isPlayer ? `p_stage_${attackerSlot}` : `opp_stage_${attackerSlot}`;
      const targetId = isPlayer ? `opp_stage_${targetSlot}` : `p_stage_${targetSlot}`;
      const attackerEl = document.getElementById(attackerId);
      const targetEl = document.getElementById(targetId);
      if (attackerEl && targetEl) {
        const aRect = attackerEl.getBoundingClientRect();
        const tRect = targetEl.getBoundingClientRect();
        return {
          x: tRect.left - aRect.left + (isPlayer ? -40 : 40),
          y: tRect.top - aRect.top + (isPlayer ? 20 : -20),
        };
      }
    }
    const sign = isPlayer ? 1 : -1;
    return {
      x: sign * (140 + (targetSlot - attackerSlot) * 35),
      y: sign * -100,
    };
  };

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Keep refs synchronized with state
  useEffect(() => {
    playerTrainerRef.current = playerTrainer;
  }, [playerTrainer]);

  useEffect(() => {
    opponentTrainerRef.current = opponentTrainer;
  }, [opponentTrainer]);

  // Initialize player team on open
  useEffect(() => {
    if (!isOpen) {
      setScreen("lobby");
      closeAllSubModals();
      clearPlayerSearch();
      return;
    }

    closeAllSubModals();
    setPvpStats(getStoredPvpStats(currentUserId));
    setTowerRunState(getTowerRunState(currentUserId));

    if (initialRoomCode) {
      setLobbyTab("live");
      if (typeof initialBet === "number") {
        setSelectedBet(initialBet);
      }
      setIsRealtimeMatch(true);
      setTimeout(() => {
        if (initialIsHost) {
          handleHostRoom(initialRoomCode);
        } else {
          handleJoinRoom(initialRoomCode);
        }
      }, 150);
    } else if (initialTab) {
      setLobbyTab(initialTab);
      if (initialTab !== "live") {
        setSelectedBet(0);
        setIsRealtimeMatch(false);
        realtimeManagerRef.current?.leaveRoom();
      }
    }

    // Determine initial 6-member team: STRICTLY OWNED LIMITED 5-STAR RESONATORS ONLY
    const ownedSet = new Set((inventory || []).map((i) => i.character_id).filter((id) => LIMITED_RESONATOR_IDS.has(id)));
    const initialIds: string[] = [];

    // 1. If user has showcase resonators and owns them, use them first
    if (showcaseIds && showcaseIds.length > 0) {
      for (const sId of showcaseIds) {
        if (ownedSet.has(sId) && !initialIds.includes(sId) && initialIds.length < 6) {
          initialIds.push(sId);
        }
      }
    }

    // 2. Backfill with other owned resonators from inventory up to 6
    if (inventory && inventory.length > 0) {
      for (const item of inventory) {
        if (initialIds.length >= 6) break;
        if (item.character_id && ownedSet.has(item.character_id) && !initialIds.includes(item.character_id)) {
          initialIds.push(item.character_id);
        }
      }
    }

    setSelectedPartyIds((prev) => {
      const validPrev = prev.filter((id) => ownedSet.has(id));
      if (validPrev.length > 0) {
        return validPrev;
      }
      return initialIds;
    });

    // If navigated with initialOpponentUsername (e.g. from visiting profile without a room code)
    if (!initialRoomCode && initialOpponentUsername && initialOpponentUsername !== currentUsername) {
      setLobbyTab("search");
      setSelectedBet(0);
      setIsRealtimeMatch(false);
      realtimeManagerRef.current?.leaveRoom();
      setSearchQuery(initialOpponentUsername);
      executeSearch(initialOpponentUsername);
    } else if (!initialRoomCode) {
      clearPlayerSearch();
    }
  }, [isOpen, currentUserId, currentUsername, showcaseIds, inventory, initialOpponentUsername, initialTab, initialRoomCode, initialBet, initialIsHost]);

  // If session is displaced by another tab, safely exit active room and return to lobby
  useEffect(() => {
    if (isSessionDisplaced) {
      if (isRealtimeMatch || screen === "room_prep" || isWaitingForChallenger) {
        realtimeManagerRef.current?.leaveRoom();
        setIsRealtimeMatch(false);
        setIsWaitingForChallenger(false);
        setIsMyReady(false);
        setIsOpponentReady(false);
        setSelectedBet(0);
        setScreen("lobby");
        closeAllSubModals();
      }
    }
  }, [isSessionDisplaced, isRealtimeMatch, screen, isWaitingForChallenger]);

  // Scroll battle logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [battleLogs]);

  // Search players list handler (similar to profile search)
  const executeSearch = async (queryToSearch: string) => {
    const clean = queryToSearch.trim();
    if (!clean) return;
    setIsSearching(true);
    setSearchError(null);
    setHasSearchedPlayers(true);

    try {
      const players = await searchPvpPlayers(clean);
      setPlayerSearchResults(players);
      if (players.length === 0) {
        setSearchError(`No players found matching "${clean}".`);
      }
    } catch (err: any) {
      setSearchError(err.message || "Failed to search players.");
      setPlayerSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Open Challenge Prep for a selected player
  const handleChallengePlayer = async (player: PlayerSearchResult) => {
    setIsSearching(true);
    setSearchError(null);
    const oppTrainer = await searchPlayerTrainer(player.username);
    setIsSearching(false);

    if (!oppTrainer) {
      setSearchError(`Could not load showcase team for @${player.username}.`);
      return;
    }

    setSelectedChallengeOpponent(oppTrainer);
    setIsPlayerChallengePrepOpen(true);
  };

  // Start Challenge against selected player
  const handleStartPlayerChallenge = () => {
    if (!selectedChallengeOpponent) return;
    closeAllSubModals();
    handleStartBattle(selectedChallengeOpponent);
  };

  // Helper to preload resonator sprites into browser memory to eliminate switch lag
  const preloadSprites = (trainers: (BattleTrainer | null | undefined)[]) => {
    if (typeof window === "undefined") return;
    trainers.forEach((t) => {
      t?.team.forEach((r) => {
        if (r.spriteUrl) {
          const img = new Image();
          img.src = r.spriteUrl;
        }
      });
    });
  };

  // Level up resonator for Gym progression (+10 Levels: dynamic EXP or Astrite cost)
  const handleUpgradeResonator = (charId: string) => {
    const currentLvl = getResonatorLevel(charId, currentUserId);
    if (currentLvl >= 100) return;
    const expCost = getUpgradeExpCost(currentLvl);
    const astriteCost = getUpgradeAstriteCost(currentLvl);
    const nextLvl = Math.min(100, currentLvl + 10);

    if (combatExp >= expCost) {
      spendCombatExp(expCost, currentUserId);
      setCombatExp((prev) => prev - expCost);
      setResonatorLevel(charId, nextLvl, currentUserId);
      setLevelUpdateTrigger((v) => v + 1);
    } else if (userAstrite >= astriteCost) {
      if (onAstriteChange) onAstriteChange(-astriteCost);
      setResonatorLevel(charId, nextLvl, currentUserId);
      setLevelUpdateTrigger((v) => v + 1);
    }
  };

  // Reset Tower of Adversity Run
  const handleResetTowerRun = () => {
    soundEngine.playClick();
    const fresh = resetTowerRunState(currentUserId);
    setTowerRunState(fresh);
    setTowerPageBlock(0);
    setSelectedTowerFloor(null);
    setIsTowerPrepOpen(false);
    setTowerToast("Tower Run Reset: Party HP fully restored. Starting fresh from Floor 1!");
    setTimeout(() => setTowerToast(null), 3500);
  };

  // Launch Tower of Adversity Floor Battle
  const handleStartTowerFloor = (floor: TowerFloorInfo) => {
    closeAllSubModals();
    const ownedSet = new Set((inventory || []).map((i) => i.character_id).filter((id) => LIMITED_RESONATOR_IDS.has(id)));

    // Squad Lock: If not locked yet, lock in current selected valid resonators
    let lockedIds = towerRunState.lockedPartyIds;
    if (!lockedIds || lockedIds.length === 0) {
      const validSelected = selectedPartyIds.filter((id) => ownedSet.has(id));
      if (validSelected.length === 0) return;
      lockedIds = validSelected;
      const initialHpMap = { ...towerRunState.partyHpMap };
      lockedIds.forEach((id) => {
        if (initialHpMap[id] === undefined) {
          const lvl = getResonatorLevel(id, currentUserId);
          initialHpMap[id] = 1000 + lvl * 35;
        }
      });
      const lockedState: TowerRunState = {
        ...towerRunState,
        lockedPartyIds: lockedIds,
        partyHpMap: initialHpMap,
        isWipedOut: false,
      };
      saveTowerRunState(lockedState, currentUserId);
      setTowerRunState(lockedState);
    }

    // Build player team with persistent Tower HP and active blessings
    const playerTeam = lockedIds.map((id) => {
      const invItem = (inventory || []).find((i) => i.character_id === id);
      const seq = Math.max(0, Math.min(6, (invItem?.count || 1) - 1));
      const lvl = getResonatorLevel(id, currentUserId);
      const res = createBattleResonator(id, lvl, seq);

      // Persistent HP check
      const savedHp = towerRunState.partyHpMap[id];
      if (savedHp !== undefined) {
        res.hp = Math.max(0, Math.min(res.maxHp, savedHp));
        if (res.hp === 0) {
          res.isFainted = true;
        }
      }

      // Speed blessings -> boost speed
      const speedPct = towerRunState.activeBlessings
        .filter((b: TowerBlessing) => b.effectType === "speed")
        .reduce((sum: number, b: TowerBlessing) => sum + (b.value || 0), 0);
      if (speedPct > 0) {
        res.spd = Math.round(res.spd * (1 + speedPct / 100));
      }

      // Barrier blessings -> start with barrier
      const barrierPct = towerRunState.activeBlessings
        .filter((b: TowerBlessing) => b.effectType === "barrier" || b.id === "blessing_spectro_aegis")
        .reduce((sum: number, b: TowerBlessing) => sum + (b.value || 0), 0);
      if (barrierPct > 0 && !res.isFainted) {
        res.barrierHp = Math.max(1, Math.floor(res.maxHp * (barrierPct / 100)));
      }

      return res;
    });

    const firstAliveIdx = playerTeam.findIndex((r) => !r.isFainted && r.hp > 0);
    if (firstAliveIdx === -1) {
      const wipedState: TowerRunState = { ...towerRunState, isWipedOut: true };
      saveTowerRunState(wipedState, currentUserId);
      setTowerRunState(wipedState);
      return;
    }

    // Auto-promote living bench units so frontline slots (up to 3) are never empty if reserves exist
    const livingPlayerIndices = playerTeam
      .map((r, idx) => ({ r, idx }))
      .filter(({ r }) => !r.isFainted && r.hp > 0)
      .map(({ idx }) => idx);
    const frontlineIndices = livingPlayerIndices.slice(0, 3);

    const pTrainer: BattleTrainer = {
      id: currentUserId || "guest_player",
      username: currentUsername || "Player",
      avatarId: currentAvatarId || "shorekeeper",
      team: playerTeam,
      activeIdx: frontlineIndices[0] ?? firstAliveIdx,
      activeIndices: frontlineIndices.length > 0 ? frontlineIndices : [firstAliveIdx],
      isAi: false,
    };

    const oppTrainer = createTowerFloorTrainer(floor.floor);
    const livingOppIndices = oppTrainer.team
      .map((r, idx) => ({ r, idx }))
      .filter(({ r }) => !r.isFainted && r.hp > 0)
      .map(({ idx }) => idx);
    oppTrainer.activeIndices = livingOppIndices.slice(0, 3);
    oppTrainer.activeIdx = oppTrainer.activeIndices[0] ?? 0;

    setCurrentTowerFloor(floor);
    setCurrentGymChallenge(null);
    setPlayerSwitchCooldown(0);

    preloadSprites([pTrainer, oppTrainer]);

    const timeline = createActionTimeline(pTrainer, oppTrainer);
    setActionTimeline(timeline);
    setSelectedEnemySlot(0);
    setSelectedAllySlot(0);
    setActiveTargetType("enemy");

    setPlayerAnim("idle");
    setOpponentAnim("idle");
    setFloatingText(null);
    setBattleWinner(null);
    setIsRealtimeMatch(false);
    setSelectedBet(0);
    setBattleTurnCount(0);
    battleTurnCountRef.current = 0;
    setIsEarlyForfeitMatch(false);
    realtimeManagerRef.current?.leaveRoom();
    setScreen("battle");

    const firstTurnIsPlayer = timeline.length > 0 ? timeline[0].isPlayer : true;
    const firstActiveIdx = timeline.length > 0 ? timeline[0].teamIndex : (frontlineIndices[0] ?? firstAliveIdx);
    if (firstTurnIsPlayer) {
      pTrainer.activeIdx = firstActiveIdx;
      oppTrainer.activeIdx = oppTrainer.activeIndices[0] ?? 0;
      setIsPlayerTurn(true);
      setIsBusy(false);
    } else {
      oppTrainer.activeIdx = firstActiveIdx;
      pTrainer.activeIdx = frontlineIndices[0] ?? firstAliveIdx;
      setIsPlayerTurn(false);
      setIsBusy(true);
    }

    setPlayerTrainer({ ...pTrainer });
    setOpponentTrainer({ ...oppTrainer });
    playerTrainerRef.current = { ...pTrainer };
    opponentTrainerRef.current = { ...oppTrainer };

    if (!firstTurnIsPlayer) {
      setTimeout(() => triggerAiTurn(false, timeline), 600);
    }

    setBattleLogs([
      {
        id: "start_1",
        text: `🗼 Tower of Adversity - ${floor.name} (Lv. ${floor.recommendedLevel})!`,
        type: "info",
      },
      {
        id: "start_2",
        text: `Enemies: ${floor.enemyTeamIds.length} Resonators. Persistent Party HP & Rogue-lite Blessings active!`,
        type: "info",
      },
      {
        id: "start_3",
        text: firstTurnIsPlayer
          ? `Go! ${playerTeam[firstActiveIdx]?.name || playerTeam[firstAliveIdx].name}!`
          : `⚡ Foe ${oppTrainer.team[firstActiveIdx]?.name || "Enemy"} seizes turn 1 speed initiative!`,
        type: "info",
      },
    ]);
  };

  // Select Drafted Blessing in Tower of Adversity
  const handleSelectBlessing = (blessing: TowerBlessing) => {
    const partyToAffect = (towerRunState.lockedPartyIds && towerRunState.lockedPartyIds.length > 0)
      ? towerRunState.lockedPartyIds
      : selectedPartyIds;

    // If the blessing is Revive, open the revive picker to let player choose which fainted resonator to revive
    if (blessing.effectType === "revive" || blessing.id === "bless_revive_mythic" || blessing.id === "bless_revive") {
      const faintedIds = partyToAffect.filter((id) => (towerRunState.partyHpMap[id] ?? 1) <= 0);
      if (faintedIds.length > 0) {
        setSelectedReviveBlessing(blessing);
        setIsRevivePickerOpen(true);
        return;
      }
    }

    const updatedBlessings = [...towerRunState.activeBlessings, blessing];
    const updatedHpMap = { ...towerRunState.partyHpMap };

    // Healing blessing: restore % HP to alive party members
    if (blessing.effectType === "heal") {
      const healPercent = blessing.value || 1;
      partyToAffect.forEach((id) => {
        const lvl = getResonatorLevel(id, currentUserId);
        const maxHp = 1000 + lvl * 35;
        const currentHp = updatedHpMap[id] ?? maxHp;
        if (currentHp > 0) {
          const healAmt = Math.max(1, Math.floor(maxHp * (healPercent / 100)));
          updatedHpMap[id] = Math.min(maxHp, currentHp + healAmt);
        }
      });
    } else if (blessing.id === "blessing_celestial_heal" || blessing.id === "bless_heal_floor") {
      partyToAffect.forEach((id) => {
        const lvl = getResonatorLevel(id, currentUserId);
        const maxHp = 1000 + lvl * 35;
        const currentHp = updatedHpMap[id] ?? maxHp;
        if (currentHp > 0) {
          updatedHpMap[id] = Math.min(maxHp, currentHp + Math.floor(maxHp * 0.4));
        }
      });
    }

    const anyAlive = partyToAffect.some((id) => (updatedHpMap[id] ?? 0) > 0);

    const updatedState: TowerRunState = {
      ...towerRunState,
      activeBlessings: updatedBlessings,
      partyHpMap: updatedHpMap,
      isWipedOut: !anyAlive,
    };
    saveTowerRunState(updatedState, currentUserId);
    setTowerRunState(updatedState);
    setIsDraftingBlessing(false);
    setDraftOptions([]);
    setIsRevivePickerOpen(false);
    setSelectedReviveBlessing(null);
  };

  // Confirm Revive a specific fainted resonator with 70% Max HP
  const handleConfirmReviveResonator = (resonatorId: string) => {
    const blessing: TowerBlessing = selectedReviveBlessing || {
      id: "bless_revive_mythic",
      name: "Revive",
      description: "Revive 1 fallen ally with 70% Max HP.",
      rarity: "mythic",
      effectType: "revive",
      value: 70,
    };

    const updatedBlessings = [...towerRunState.activeBlessings, blessing];
    const updatedHpMap = { ...towerRunState.partyHpMap };
    const lvl = getResonatorLevel(resonatorId, currentUserId);
    const maxHp = 1000 + lvl * 35;
    const revivePercent = blessing.value || 70;
    const revivedHp = Math.max(1, Math.round(maxHp * (revivePercent / 100)));
    updatedHpMap[resonatorId] = revivedHp;

    const partyToAffect = (towerRunState.lockedPartyIds && towerRunState.lockedPartyIds.length > 0)
      ? towerRunState.lockedPartyIds
      : selectedPartyIds;
    const anyAlive = partyToAffect.some((id) => (updatedHpMap[id] ?? 0) > 0);

    const updatedState: TowerRunState = {
      ...towerRunState,
      activeBlessings: updatedBlessings,
      partyHpMap: updatedHpMap,
      isWipedOut: !anyAlive,
    };

    saveTowerRunState(updatedState, currentUserId);
    setTowerRunState(updatedState);
    soundEngine.playHealChime();
    setIsRevivePickerOpen(false);
    setSelectedReviveBlessing(null);
    setIsDraftingBlessing(false);
    setDraftOptions([]);
  };

  // Launch Gym Boss Battle at selected difficulty stage
  const handleStartGymBattle = (boss: GymBoss, stageLevel: number) => {
    const ownedSet = new Set((inventory || []).map((i) => i.character_id).filter((id) => LIMITED_RESONATOR_IDS.has(id)));
    const validIds = selectedPartyIds.filter((id) => ownedSet.has(id));
    if (validIds.length === 0) return;

    closeAllSubModals();

    // Build player team using player's Gym resonator levels and Sequence counts
    const playerTeam = validIds.map((id) => {
      const invItem = (inventory || []).find((i) => i.character_id === id);
      const seq = Math.max(0, Math.min(6, (invItem?.count || 1) - 1));
      const lvl = getResonatorLevel(id, currentUserId);
      return createBattleResonator(id, lvl, seq);
    });

    const pTrainer: BattleTrainer = {
      id: currentUserId || "guest_player",
      username: currentUsername || "Player",
      avatarId: currentAvatarId || "shorekeeper",
      team: playerTeam,
      activeIdx: 0,
      activeIndices: [0, 1, 2].slice(0, playerTeam.length),
      isAi: false,
    };

    // Build Gym Boss trainer at the selected stage level
    const oppTrainer = createGymBossTrainer(boss, stageLevel);
    oppTrainer.activeIndices = [0, 1, 2].slice(0, oppTrainer.team.length);
    setCurrentGymChallenge({ boss, stageLevel });
    setCurrentTowerFloor(null);
    setPlayerSwitchCooldown(0);

    preloadSprites([pTrainer, oppTrainer]);

    setPlayerTrainer(pTrainer);
    setOpponentTrainer(oppTrainer);
    playerTrainerRef.current = pTrainer;
    opponentTrainerRef.current = oppTrainer;

    const timeline = createActionTimeline(pTrainer, oppTrainer);
    setActionTimeline(timeline);
    setSelectedEnemySlot(0);
    setSelectedAllySlot(0);
    setActiveTargetType("enemy");

    setPlayerAnim("idle");
    setOpponentAnim("idle");
    setFloatingText(null);
    setBattleWinner(null);
    setIsRealtimeMatch(false);
    setSelectedBet(0);
    setBattleTurnCount(0);
    battleTurnCountRef.current = 0;
    setIsEarlyForfeitMatch(false);
    realtimeManagerRef.current?.leaveRoom();
    setScreen("battle");

    const firstTurnIsPlayer = timeline.length > 0 ? timeline[0].isPlayer : true;
    const firstActiveIdx = timeline.length > 0 ? timeline[0].teamIndex : 0;
    if (firstTurnIsPlayer) {
      pTrainer.activeIdx = firstActiveIdx;
      setIsPlayerTurn(true);
      setIsBusy(false);
    } else {
      oppTrainer.activeIdx = firstActiveIdx;
      setIsPlayerTurn(false);
      setIsBusy(true);
      setTimeout(() => triggerAiTurn(false, timeline), 600);
    }

    const isClaimed = isGymBossClaimedToday(boss.charId, currentUserId);
    const stageInfo = GYM_STAGES.find((s) => s.level === stageLevel) || GYM_STAGES[0];

    setBattleLogs([
      {
        id: "start_1",
        text: `⚔️ Gym Trial started vs ${boss.name} (Lv. ${stageLevel} ${stageInfo.title})!`,
        type: "info",
      },
      {
        id: "start_2",
        text: isClaimed
          ? `🛡️ Practice Mode (Daily reward already claimed; resets at 00:00 GMT+8)`
          : `✨ Daily Bounty Available: +${stageInfo.bounty} Astrite & +${stageInfo.exp} EXP on victory!`,
        type: "info",
      },
      {
        id: "start_3",
        text: `Go! ${playerTeam[0].name}!`,
        type: "info",
      },
    ]);
  };

  // Start Battle (for offline Searched Players)
  const handleStartBattle = (oppTrainer: BattleTrainer) => {
    closeAllSubModals();
    const ownedSet = new Set((inventory || []).map((i) => i.character_id).filter((id) => LIMITED_RESONATOR_IDS.has(id)));
    const validIds = selectedPartyIds.filter((id) => ownedSet.has(id));
    if (validIds.length === 0) return;

    setCurrentGymChallenge(null);
    setCurrentTowerFloor(null);
    setPlayerSwitchCooldown(0);
    setIsRealtimeMatch(false);
    setSelectedBet(0);
    setBattleTurnCount(0);
    battleTurnCountRef.current = 0;
    setIsEarlyForfeitMatch(false);
    realtimeManagerRef.current?.leaveRoom();

    const playerTeam = validIds.map((id) => {
      const invItem = (inventory || []).find((i) => i.character_id === id);
      const seq = Math.max(0, Math.min(6, (invItem?.count || 1) - 1));
      return createBattleResonator(id, 100, seq);
    });

    const pTrainer: BattleTrainer = {
      id: currentUserId || "guest_player",
      username: currentUsername || "Player",
      avatarId: currentAvatarId || "shorekeeper",
      team: playerTeam,
      activeIdx: 0,
      activeIndices: [0, 1, 2].slice(0, playerTeam.length),
      isAi: false,
    };

    // Re-create the opponent team completely fresh so all fainted resonators are revived with full HP
    const freshOppTeam = oppTrainer.team.map((r) =>
      createBattleResonator(r.id, r.level || 100, r.sequence || 0)
    );

    const freshOppTrainer: BattleTrainer = {
      ...oppTrainer,
      team: freshOppTeam,
      activeIdx: 0,
      activeIndices: [0, 1, 2].slice(0, freshOppTeam.length),
    };

    if (selectedChallengeOpponent && selectedChallengeOpponent.id === freshOppTrainer.id) {
      setSelectedChallengeOpponent(freshOppTrainer);
    }

    preloadSprites([pTrainer, freshOppTrainer]);

    setPlayerTrainer(pTrainer);
    setOpponentTrainer(freshOppTrainer);
    playerTrainerRef.current = pTrainer;
    opponentTrainerRef.current = freshOppTrainer;

    const timeline = createActionTimeline(pTrainer, freshOppTrainer);
    setActionTimeline(timeline);
    setSelectedEnemySlot(0);
    setSelectedAllySlot(0);
    setActiveTargetType("enemy");

    setPlayerAnim("idle");
    setOpponentAnim("idle");
    setFloatingText(null);
    setBattleWinner(null);
    setIsRealtimeMatch(false);
    setScreen("battle");

    const firstTurnIsPlayer = timeline.length > 0 ? timeline[0].isPlayer : true;
    const firstActiveIdx = timeline.length > 0 ? timeline[0].teamIndex : 0;
    if (firstTurnIsPlayer) {
      pTrainer.activeIdx = firstActiveIdx;
      setIsPlayerTurn(true);
      setIsBusy(false);
    } else {
      freshOppTrainer.activeIdx = firstActiveIdx;
      setIsPlayerTurn(false);
      setIsBusy(true);
      setTimeout(() => triggerAiTurn(false, timeline), 600);
    }

    setBattleLogs([
      {
        id: "start_1",
        text: `⚔️ Battle started against ${oppTrainer.username}!`,
        type: "info",
      },
      {
        id: "start_2",
        text: `Go! ${playerTeam[0].name}!`,
        type: "info",
      },
      {
        id: "start_3",
        text: `${oppTrainer.username} sent out ${oppTrainer.team[0].name}!`,
        type: "info",
      },
    ]);
  };

  // Helper to safely resolve a valid party of up to 6 resonators (never empty)
  const resolvePlayerPartyIds = (): string[] => {
    const ownedSet = new Set((inventory || []).map((i) => i.character_id).filter((id) => LIMITED_RESONATOR_IDS.has(id)));
    let validIds = selectedPartyIds.filter((id) => ownedSet.has(id));
    if (validIds.length === 0 && showcaseIds && showcaseIds.length > 0) {
      validIds = showcaseIds.filter((id) => ownedSet.has(id));
    }
    if (validIds.length === 0 && inventory && inventory.length > 0) {
      validIds = inventory
        .map((i) => i.character_id)
        .filter((id): id is string => Boolean(id) && ownedSet.has(id))
        .slice(0, 6);
    }
    if (validIds.length === 0) {
      validIds = ["shorekeeper"];
    }
    return validIds;
  };

  // Realtime 1v1: Host Room
  const handleHostRoom = (customCode?: string | React.MouseEvent, customBet?: number) => {
    const validIds = resolvePlayerPartyIds();
    const newCode = typeof customCode === "string" ? customCode : generateRoomCode();
    const effectiveBet = customBet !== undefined ? customBet : selectedBet;
    if (customBet !== undefined) setSelectedBet(customBet);
    setRoomCode(newCode);
    setIsWaitingForChallenger(true);
    setIsHosting(true);
    setRoomError(null);
    setIsOpponentReconnecting(false);
    setCurrentGymChallenge(null);

    const playerTeam = validIds.map((id) => {
      const invItem = (inventory || []).find((i) => i.character_id === id);
      const seq = Math.max(0, Math.min(6, (invItem?.count || 1) - 1));
      return createBattleResonator(id, 100, seq);
    });

    const pTrainer: BattleTrainer = {
      id: currentUserId || `host_${Date.now()}`,
      username: currentUsername || "Player",
      avatarId: currentAvatarId || "shorekeeper",
      team: playerTeam,
      activeIdx: 0,
      isAi: false,
    };
    setPlayerTrainer(pTrainer);
    playerTrainerRef.current = pTrainer;

    const manager = new PvpRealtimeManager({
      onOpponentJoined: (oppTrainer) => {
        // Challenger arrived! Move to Room Prep phase!
        setIsWaitingForChallenger(false);
        setIsRealtimeMatch(true);
        setIsOpponentReconnecting(false);
        setOpponentTrainer(oppTrainer);
        opponentTrainerRef.current = oppTrainer;
        setScreen("room_prep");
        setIsMyReady(false);
        setIsOpponentReady(false);
      },
      onOpponentTeamUpdate: (updatedTrainer) => {
        setOpponentTrainer(updatedTrainer);
        opponentTrainerRef.current = updatedTrainer;
      },
      onOpponentReadyToggle: (isReady) => {
        setIsOpponentReady(isReady);
      },
      onBattleStart: (firstTurnUserId, bet) => {
        if (opponentTrainerRef.current) {
          const currentP = playerTrainerRef.current || pTrainer;
          const isFirst = firstTurnUserId === currentP.id;
          if (bet !== undefined) setSelectedBet(bet);
          handleStartRealtimeBattle(currentP, opponentTrainerRef.current, isFirst, bet);
        }
      },
      onOpponentAction: (action) => handleOpponentRealtimeAction(action),
      onOpponentDisconnected: () => {
        setIsOpponentReconnecting(false);
        handleOpponentDisconnect();
      },
      onOpponentReconnecting: (reconnecting) => setIsOpponentReconnecting(reconnecting),
      onRequestSync: () => handleRequestSync(),
      onSyncState: (action) => handleSyncState(action),
      onError: (err) => setRoomError(err),
    });

    realtimeManagerRef.current = manager;
    manager.joinRoom(newCode, pTrainer, effectiveBet, true, {
      userId: currentUserId,
      clientSessionId: getClientDeviceId(),
      isGuest: isGuestPlayer,
    });
  };

  // Realtime 1v1: Join Room
  const handleJoinRoom = (customCode?: string | React.MouseEvent, customBet?: number) => {
    const validIds = resolvePlayerPartyIds();
    const targetCode = (typeof customCode === "string" ? customCode : joinCodeInput).trim();
    if (!targetCode) return;
    const effectiveBet = customBet !== undefined ? customBet : selectedBet;
    if (customBet !== undefined) setSelectedBet(customBet);
    setIsConnectingRoom(true);
    setIsHosting(false);
    setRoomError(null);
    setIsOpponentReconnecting(false);
    setCurrentGymChallenge(null);

    const playerTeam = validIds.map((id) => {
      const invItem = (inventory || []).find((i) => i.character_id === id);
      const seq = Math.max(0, Math.min(6, (invItem?.count || 1) - 1));
      return createBattleResonator(id, 100, seq);
    });

    const pTrainer: BattleTrainer = {
      id: currentUserId || `joiner_${Date.now()}`,
      username: currentUsername || "Player",
      avatarId: currentAvatarId || "shorekeeper",
      team: playerTeam,
      activeIdx: 0,
      isAi: false,
    };
    setPlayerTrainer(pTrainer);
    playerTrainerRef.current = pTrainer;

    const manager = new PvpRealtimeManager({
      onOpponentWelcome: (hostTrainer, bet) => {
        // Connected to Host! Move to Room Prep phase!
        setIsConnectingRoom(false);
        setIsRealtimeMatch(true);
        setIsOpponentReconnecting(false);
        setOpponentTrainer(hostTrainer);
        opponentTrainerRef.current = hostTrainer;
        if (bet !== undefined) setSelectedBet(bet);
        setScreen("room_prep");
        setIsMyReady(false);
        setIsOpponentReady(false);
      },
      onOpponentTeamUpdate: (updatedTrainer) => {
        setOpponentTrainer(updatedTrainer);
        opponentTrainerRef.current = updatedTrainer;
      },
      onOpponentReadyToggle: (isReady) => {
        setIsOpponentReady(isReady);
      },
      onBattleStart: (firstTurnUserId, bet) => {
        if (opponentTrainerRef.current) {
          const currentP = playerTrainerRef.current || pTrainer;
          const isFirst = firstTurnUserId === currentP.id;
          if (bet !== undefined) setSelectedBet(bet);
          handleStartRealtimeBattle(currentP, opponentTrainerRef.current, isFirst, bet);
        }
      },
      onOpponentAction: (action) => handleOpponentRealtimeAction(action),
      onOpponentDisconnected: () => {
        setIsOpponentReconnecting(false);
        handleOpponentDisconnect();
      },
      onOpponentReconnecting: (reconnecting) => setIsOpponentReconnecting(reconnecting),
      onRequestSync: () => handleRequestSync(),
      onSyncState: (action) => handleSyncState(action),
      onError: (err) => {
        setIsConnectingRoom(false);
        setRoomError(err);
      },
    });

    realtimeManagerRef.current = manager;
    manager.joinRoom(targetCode, pTrainer, effectiveBet, false, {
      userId: currentUserId,
      clientSessionId: getClientDeviceId(),
      isGuest: isGuestPlayer,
    });
  };

  // Realtime 1v1: Auto-connect when launched from Plaza challenge
  useEffect(() => {
    if (isOpen && initialRoomCode) {
      if (initialBet !== undefined) {
        setSelectedBet(initialBet);
      }
      if (initialIsHost) {
        handleHostRoom(initialRoomCode, initialBet);
      } else {
        handleJoinRoom(initialRoomCode, initialBet);
      }
    }
  }, [isOpen, initialRoomCode, initialIsHost, initialBet]);

  // Realtime 1v1: Start Battle
  const handleStartRealtimeBattle = (
    pTrainer: BattleTrainer,
    oppTrainer: BattleTrainer,
    isFirst: boolean,
    matchBet?: number
  ) => {
    closeAllSubModals();
    setBattleTurnCount(0);
    battleTurnCountRef.current = 0;
    setIsEarlyForfeitMatch(false);
    const effectiveBet = matchBet !== undefined ? matchBet : selectedBet;
    if (matchBet !== undefined) {
      setSelectedBet(matchBet);
    }
    if (effectiveBet > 0 && onAstriteChange) {
      onAstriteChange(-effectiveBet);
    }
    const cleanPTeam = pTrainer.team.map((r) => ({
      ...r,
      hp: r.maxHp,
      energy: 0,
      isFainted: false,
      isGuarding: false,
      isDowned: false,
      downImmunityTurns: 0,
      statusEffects: [],
      skillCooldown: 0,
      moveCooldowns: {},
      ccImmunityTurns: 0,
    }));
    const cleanOTeam = oppTrainer.team.map((r) => ({
      ...r,
      hp: r.maxHp,
      energy: 0,
      isFainted: false,
      isGuarding: false,
      isDowned: false,
      downImmunityTurns: 0,
      statusEffects: [],
      skillCooldown: 0,
      moveCooldowns: {},
      ccImmunityTurns: 0,
    }));
    const freshP: BattleTrainer = {
      ...pTrainer,
      team: cleanPTeam,
      activeIdx: 0,
      activeIndices: [0, 1, 2].slice(0, cleanPTeam.length),
    };
    const freshO: BattleTrainer = {
      ...oppTrainer,
      team: cleanOTeam,
      activeIdx: 0,
      activeIndices: [0, 1, 2].slice(0, cleanOTeam.length),
    };

    preloadSprites([freshP, freshO]);

    setPlayerTrainer(freshP);
    setOpponentTrainer(freshO);
    playerTrainerRef.current = freshP;
    opponentTrainerRef.current = freshO;

    const timeline = createActionTimeline(freshP, freshO);
    setActionTimeline(timeline);
    setSelectedEnemySlot(0);
    setSelectedAllySlot(0);
    setActiveTargetType("enemy");

    setBattleWinner(null);
    setPlayerSwitchCooldown(0);
    setScreen("battle");
    setIsPlayerTurn(isFirst);
    setIsBusy(false);

    const pLead = cleanPTeam[0];
    const oLead = cleanOTeam[0];
    const firstResName = isFirst ? pLead?.name : oLead?.name;
    const firstTrainerName = isFirst ? freshP.username : freshO.username;
    const speedVal = isFirst ? pLead?.spd : oLead?.spd;

    setBattleLogs([
      {
        id: "start_speed",
        text: `⚡ Turn Initiative: ${firstTrainerName}'s ${firstResName} seized the first move with ${speedVal || 100} SPD!`,
        type: "info",
      },
      {
        id: "start_1",
        text: `⚔️ Live 1v1 Battle started vs ${oppTrainer.username}!`,
        type: "info",
      },
      {
        id: "start_2",
        text: `Stakes: ${selectedBet > 0 ? `${selectedBet * 2} Astrite Pot (${selectedBet} Bet)` : "Casual Match"}`,
        type: "info",
      },
      {
        id: "start_3",
        text: isFirst ? "You move first! Choose your action." : `${oppTrainer.username} moves first. Waiting...`,
        type: "info",
      },
    ]);
  };

  // Toggle Ready in Pre-Battle Room
  const handleToggleReady = () => {
    if (selectedBet > 0 && userAstrite < selectedBet) {
      setRoomError(`You need at least ${selectedBet} Astrite to participate in this match.`);
      return;
    }
    const currentP = playerTrainerRef.current || playerTrainer;
    if (!currentP || currentP.team.length === 0) {
      setRoomError("You must have at least 1 Resonator in your party to battle.");
      return;
    }
    setRoomError(null);
    const next = !isMyReady;
    setIsMyReady(next);
    realtimeManagerRef.current?.sendAction({
      type: "ready_toggle",
      isReady: next,
      senderId: currentP.id,
    });
  };

  // Party Picker Handlers
  const handleTogglePartyResonator = (charId: string) => {
    // Safety check: ensure character is owned in inventory
    const isOwned = (inventory || []).some((i) => i.character_id === charId);
    if (!isOwned) return;

    setSelectedPartyIds((prev) => {
      if (prev.includes(charId)) {
        return prev.filter((id) => id !== charId);
      }
      if (prev.length >= 6) {
        return prev;
      }
      return [...prev, charId];
    });
  };

  const handleRemoveFromParty = (charId: string) => {
    setSelectedPartyIds((prev) => prev.filter((id) => id !== charId));
  };

  const handleSaveParty = () => {
    const ownedSet = new Set((inventory || []).map((i) => i.character_id).filter((id) => LIMITED_RESONATOR_IDS.has(id)));
    const validIds = selectedPartyIds.filter((id) => ownedSet.has(id));
    const updatedTeam = validIds.map((id) => {
      const inv = (inventory || []).find((i) => i.character_id === id);
      const seq = Math.max(0, Math.min(6, (inv?.count || 1) - 1));
      const lvl = isRealtimeMatch ? 100 : getResonatorLevel(id, currentUserId);
      return createBattleResonator(id, lvl, seq);
    });
    const currentP = playerTrainerRef.current || playerTrainer;
    const updatedTrainer: BattleTrainer = {
      ...currentP,
      id: currentUserId || currentP?.id || "guest_player",
      username: currentUsername || currentP?.username || "Player",
      avatarId: currentAvatarId || currentP?.avatarId || "shorekeeper",
      team: updatedTeam,
      activeIdx: 0,
      isAi: false,
    };
    setPlayerTrainer(updatedTrainer);
    playerTrainerRef.current = updatedTrainer;
    if (isRealtimeMatch && screen === "room_prep") {
      setIsMyReady(false);
      realtimeManagerRef.current?.updateMyTrainer(updatedTrainer);
      realtimeManagerRef.current?.sendAction({
        type: "ready_toggle",
        isReady: false,
        senderId: updatedTrainer.id,
      });
    }
  };

  // Leave Room Prep cleanly without forfeit or defeat
  const handleLeaveRoomPrep = () => {
    if (isRealtimeMatch) {
      const p = playerTrainerRef.current || playerTrainer;
      realtimeManagerRef.current?.sendAction({
        type: "leave_room",
        senderId: p?.id || "",
      });
      realtimeManagerRef.current?.leaveRoom();
    }
    setScreen("lobby");
    setIsRealtimeMatch(false);
    setSelectedBet(0);
    setIsMyReady(false);
    setIsOpponentReady(false);
    setRoomCode("");
    setOpponentTrainer(null);
    opponentTrainerRef.current = null;
  };

  // When both players are ready in room_prep -> Host triggers battle start with Speed initiative
  useEffect(() => {
    if (screen === "room_prep" && isMyReady && isOpponentReady && isHosting) {
      const p = playerTrainerRef.current || playerTrainer;
      const o = opponentTrainerRef.current || opponentTrainer;
      if (p && o) {
        const pActive = p.team[p.activeIdx];
        const oActive = o.team[o.activeIdx];
        const pSpeed = pActive?.spd || 100;
        const oSpeed = oActive?.spd || 100;
        const hostGoesFirst = pSpeed > oSpeed ? true : pSpeed < oSpeed ? false : Math.random() < 0.5;
        const firstTurnId = hostGoesFirst ? p.id : o.id;

        realtimeManagerRef.current?.sendAction({
          type: "start_battle",
          firstTurnUserId: firstTurnId,
          bet: selectedBet,
          senderId: p.id,
        });
        handleStartRealtimeBattle(p, o, hostGoesFirst, selectedBet);
      }
    }
  }, [screen, isMyReady, isOpponentReady, isHosting, playerTrainer, opponentTrainer, selectedBet]);

  // Realtime 1v1: Respond to opponent's sync request with authoritative state
  const handleRequestSync = () => {
    const currentP = playerTrainerRef.current || playerTrainer;
    const currentO = opponentTrainerRef.current || opponentTrainer;
    if (!currentP) return;

    realtimeManagerRef.current?.sendAction({
      type: "sync_state",
      senderId: currentP.id,
      screen: screen as "room_prep" | "battle",
      senderTrainer: currentP,
      receiverTrainer: currentO || undefined,
      isSenderReady: isMyReady,
      bet: selectedBet,
      timeline: actionTimeline,
      isSenderTurn: isPlayerTurn,
      turnCount: battleTurnCountRef.current,
      latestLogs: battleLogs.slice(-8),
    });
  };

  // Realtime 1v1: Apply synchronized state received from opponent (e.g. after alt-tab)
  const handleSyncState = (action: Extract<RealtimeBattleAction, { type: "sync_state" }>) => {
    if (action.bet !== undefined && action.bet !== selectedBet) {
      setSelectedBet(action.bet);
    }

    if (action.screen === "room_prep") {
      setScreen("room_prep");
      setIsRealtimeMatch(true);
      if (action.senderTrainer) {
        setOpponentTrainer(action.senderTrainer);
        opponentTrainerRef.current = action.senderTrainer;
      }
      if (action.isSenderReady !== undefined) {
        setIsOpponentReady(action.isSenderReady);
      }
    } else if (action.screen === "battle") {
      setScreen("battle");
      setIsRealtimeMatch(true);
      closeAllSubModals();

      if (action.senderTrainer) {
        setOpponentTrainer(action.senderTrainer);
        opponentTrainerRef.current = action.senderTrainer;
      }
      if (action.receiverTrainer) {
        setPlayerTrainer(action.receiverTrainer);
        playerTrainerRef.current = action.receiverTrainer;
      }
      if (action.timeline && action.timeline.length > 0) {
        setActionTimeline(action.timeline);
      }
      if (action.turnCount !== undefined) {
        setBattleTurnCount(action.turnCount);
        battleTurnCountRef.current = action.turnCount;
      }
      if (action.isSenderTurn !== undefined) {
        const myTurn = !action.isSenderTurn;
        setIsPlayerTurn(myTurn);
        setIsBusy(!myTurn);
      }
      if (action.latestLogs && action.latestLogs.length > 0) {
        setBattleLogs((prev) => {
          const existingIds = new Set(prev.map((l) => l.id));
          const newLogs = action.latestLogs!.filter((l) => !existingIds.has(l.id));
          return newLogs.length > 0 ? [...prev, ...newLogs] : prev;
        });
      }
    }
  };

  // Realtime 1v1: Opponent Disconnect / Leave
  const handleOpponentDisconnect = () => {
    if (battleWinner) return;
    if (screen === "battle" && isRealtimeMatch && !currentTowerFloor && !currentGymChallenge) {
      setBattleLogs((prev) => [
        ...prev,
        {
          id: `dc_${Date.now()}`,
          text: `⚡ Opponent disconnected from the match! You win by forfeit!`,
          type: "info",
        },
      ]);
      handleBattleEnd("player");
    } else if (screen === "room_prep" || screen === "lobby") {
      setRoomError("Opponent left the match room.");
      setScreen("lobby");
      setIsRealtimeMatch(false);
      setIsMyReady(false);
      setIsOpponentReady(false);
      setSelectedBet(0);
      setOpponentTrainer(null);
      opponentTrainerRef.current = null;
      realtimeManagerRef.current?.leaveRoom();
    }
  };

  // Realtime 1v1: Opponent Action Received
  const handleOpponentRealtimeAction = async (action: RealtimeBattleAction) => {
    const currentP = playerTrainerRef.current;
    const currentO = opponentTrainerRef.current;
    if (!currentP || !currentO) return;

    const oActive = currentO.team[currentO.activeIdx];
    const pActive = currentP.team[currentP.activeIdx];

    if (action.type === "ready_toggle") {
      setIsOpponentReady(action.isReady);
    } else if (action.type === "team_update") {
      setOpponentTrainer(action.trainer);
      opponentTrainerRef.current = action.trainer;
    } else if (action.type === "start_battle") {
      if (action.bet !== undefined) setSelectedBet(action.bet);
      handleStartRealtimeBattle(currentP, currentO, false, action.bet);
    } else if (action.type === "bench_substitute") {
      if (action.senderTrainer) {
        setOpponentTrainer(action.senderTrainer);
        opponentTrainerRef.current = action.senderTrainer;
      }
      if (action.timeline) {
        setActionTimeline(action.timeline);
      }
      const unitName = action.senderTrainer?.team[action.benchIndex]?.name || "Resonator";
      setBattleLogs((prev) => [
        ...prev,
        {
          id: `deploy_opp_${Date.now()}`,
          text: `🔄 Reinforcements! ${currentO.username} deployed ${unitName} to Frontline Slot ${action.slotIndex + 1}!`,
          type: "switch",
        },
      ]);
    } else if (action.type === "ultimate_interrupt") {
      if (action.senderTrainer) {
        setOpponentTrainer(action.senderTrainer);
        opponentTrainerRef.current = action.senderTrainer;
      }
      if (action.timeline) {
        setActionTimeline(action.timeline);
      }
      const unitName = action.senderTrainer?.team[action.teamIndex]?.name || "Resonator";
      setBattleLogs((prev) => [
        ...prev,
        {
          id: `burst_opp_${Date.now()}`,
          text: `⚡ ULTIMATE INTERRUPT! ${currentO.username}'s ${unitName} seized immediate turn order to cast Liberation!`,
          type: "liberation",
        },
      ]);
      setIsPlayerTurn(false);
      setIsBusy(true);
    } else if (action.type === "switch") {
      // Opponent switched resonator
      const targetIdx = action.targetResonatorIdx;
      if (currentO.team[targetIdx] && !currentO.team[targetIdx].isFainted) {
        currentO.activeIdx = targetIdx;
        setOpponentTrainer({ ...currentO });
        opponentTrainerRef.current = { ...currentO };
        setBattleLogs((prev) => [
          ...prev,
          {
            id: `switch_opp_${Date.now()}`,
            text: `${currentO.username} withdrew their resonator and sent out ${currentO.team[targetIdx].name}!`,
            type: "switch",
          },
        ]);
      }
      if (action.nextTurnUserId) {
        if (action.nextTurnUserId === currentP.id) {
          startPlayerTurn();
        } else {
          setIsPlayerTurn(false);
          setIsBusy(false);
        }
      } else {
        startPlayerTurn();
      }
    } else if (action.type === "guard") {
      if (oActive) {
        oActive.isGuarding = true;
        setOpponentTrainer({ ...currentO });
        opponentTrainerRef.current = { ...currentO };
        setBattleLogs((prev) => [
          ...prev,
          {
            id: `guard_opp_${Date.now()}`,
            text: `🛡️ ${currentO.username}'s ${oActive.name} assumed a defensive Guard stance!`,
            type: "guard",
          },
        ]);
      }
      if (action.nextTurnUserId) {
        if (action.nextTurnUserId === currentP.id) {
          startPlayerTurn();
        } else {
          setIsPlayerTurn(false);
          setIsBusy(false);
        }
      } else {
        startPlayerTurn();
      }
    } else if (action.type === "faint_switch") {
      currentO.activeIdx = action.targetResonatorIdx;
      setOpponentTrainer({ ...currentO });
      opponentTrainerRef.current = { ...currentO };
      const newOActive = currentO.team[action.targetResonatorIdx];
      setBattleLogs((prev) => [
        ...prev,
        {
          id: `ai_faint_switch_${Date.now()}`,
          text: `Go! ${currentO.username}'s ${newOActive.name}!`,
          type: "switch",
        },
      ]);
      // Note: Do NOT call startPlayerTurn() here. Turn handoff was already decided by the move that caused the faint.
    } else if (action.type === "battle_end") {
      const isWinner = action.winnerId === currentP.id;
      setIsBusy(true);
      setStageEndBanner(isWinner ? "VICTORY" : "DEFEAT");
      if (isWinner) soundEngine.playOneMoreStinger();
      setTimeout(() => {
        setStageEndBanner(null);
        handleBattleEnd(isWinner ? "player" : "opponent");
      }, 1800);
      return;
    } else if (action.type === "forfeit") {
      if (screen === "battle" && isRealtimeMatch && !currentTowerFloor && !currentGymChallenge) {
        setBattleLogs((prev) => [
          ...prev,
          {
            id: `ai_forfeit_${Date.now()}`,
            text: `🏳️ ${currentO.username} has forfeited the match!`,
            type: "info",
          },
        ]);
        handleBattleEnd("player");
      } else {
        setRoomError(`${currentO.username} left the match room.`);
        setScreen("lobby");
        setIsRealtimeMatch(false);
        setIsMyReady(false);
        setIsOpponentReady(false);
        setSelectedBet(0);
        setOpponentTrainer(null);
        opponentTrainerRef.current = null;
        realtimeManagerRef.current?.leaveRoom();
      }
    } else if (action.type === "move") {
      if (!oActive || !pActive) return;
      setBattleTurnCount((prev) => prev + 1);
      battleTurnCountRef.current += 1;

      // 0. Trigger Liberation Cut-In if opponent casted liberation
      if (action.move.category === "liberation") {
        soundEngine.playLiberationActivation(action.move.element);
        setLiberationCutIn({
          resonator: oActive,
          move: action.move,
          isPlayer: false,
        });
        await new Promise((r) => setTimeout(r, 1050));
        setLiberationCutIn(null);
      }

      // 1. Play opponent attack approach / slash VFX
      const moveText = action.syncTeammateName
        ? `⚔️ TEAM SYNC! ${currentO.username}'s ${action.syncTeammateName} executed a Synchronized Critical Strike!`
        : `${currentO.username}'s ${oActive.name} used ${action.move.name}!`;
      setBattleLogs((prev) => [
        ...prev,
        {
          id: `move_o_${Date.now()}`,
          text: moveText,
          type: action.syncTeammateName ? "crit" : (action.move.category === "liberation" ? "liberation" : "info"),
        },
      ]);

      const oppScope = action.move.targetScope || "single";
      const oppIsOffensive = !oppScope.startsWith("ally") && oppScope !== "self";
      const oppAttackerSlot = currentO.activeIndices?.indexOf(currentO.activeIdx) ?? 0;
      const oppTargetSlot = (action as any).targetSlot ?? (currentP.activeIndices?.indexOf(currentP.activeIdx) ?? 0);

      if (oppIsOffensive) {
        const delta = getDashDelta(false, oppAttackerSlot, oppTargetSlot);
        setActiveAttack({
          attacker: "opponent",
          attackerSlot: oppAttackerSlot,
          targetSlot: oppTargetSlot,
          delta,
          move: action.move,
          phase: "approach",
        });
        soundEngine.playSlashWhoosh(action.move.element);
        await new Promise((r) => setTimeout(r, 190));

        setActiveAttack({
          attacker: "opponent",
          attackerSlot: oppAttackerSlot,
          targetSlot: oppTargetSlot,
          delta,
          move: action.move,
          phase: "strike",
        });
        const affectedSlots =
          oppScope === "single"
            ? [oppTargetSlot]
            : oppScope === "blast"
            ? [oppTargetSlot, oppTargetSlot - 1, oppTargetSlot + 1].filter((s) => s >= 0 && s <= 2)
            : [0, 1, 2];
        setActiveSlash({
          target: "player",
          slotIndices: affectedSlots,
          element: action.move.element,
          category: action.move.category,
        });
        await new Promise((r) => setTimeout(r, 240));

        setActiveAttack({
          attacker: "opponent",
          attackerSlot: oppAttackerSlot,
          targetSlot: oppTargetSlot,
          delta,
          move: action.move,
          phase: "return",
        });
        setActiveSlash(null);
        await new Promise((r) => setTimeout(r, 180));
        setActiveAttack(null);
      } else {
        setOpponentAnim("attack");
        await new Promise((r) => setTimeout(r, 240));
        setOpponentAnim("idle");
      }

      // 2. Synchronize exact HP, Energy, and Status from authoritative action
      if (action.senderTrainer) {
        setOpponentTrainer(action.senderTrainer);
        opponentTrainerRef.current = action.senderTrainer;
      } else {
        oActive.hp = action.attackerHp;
        oActive.energy = action.attackerEnergy;
        if (action.attackerBarrierHp !== undefined) {
          oActive.barrierHp = action.attackerBarrierHp;
        }
        if (action.attackerStatusEffects) {
          oActive.statusEffects = action.attackerStatusEffects;
        }
      }

      if (action.receiverTrainer) {
        setPlayerTrainer(action.receiverTrainer);
        playerTrainerRef.current = action.receiverTrainer;
      } else {
        pActive.hp = action.defenderHp;
        if (action.defenderBarrierHp !== undefined) {
          pActive.barrierHp = action.defenderBarrierHp;
        }
        pActive.isFainted = action.defenderFainted;

        if (action.knockedDown) {
          pActive.isDowned = true;
          pActive.downImmunityTurns = 2;
        }
        if (action.statusApplied) {
          pActive.statusEffects = pActive.statusEffects || [];
          const existingIdx = pActive.statusEffects.findIndex((s) => s.type === action.statusApplied);
          if (existingIdx !== -1) {
            pActive.statusEffects[existingIdx].duration = 2;
          } else {
            pActive.statusEffects.push({
              type: action.statusApplied as any,
              duration: 2,
            });
          }
        }
      }

      if (action.timeline && action.timeline.length > 0) {
        setActionTimeline(action.timeline);
      }
      if (action.turnCount !== undefined) {
        setBattleTurnCount(action.turnCount);
        battleTurnCountRef.current = action.turnCount;
      }

      // Trigger immutable React re-renders so HP bars update immediately
      setPlayerTrainer({ ...(action.receiverTrainer || currentP) });
      setOpponentTrainer({ ...(action.senderTrainer || currentO) });

      // Visual feedback: Hit/Faint, damage numbers, effectiveness & synthesized audio punches
      if (action.missed) {
        setFloatingText({
          target: "player",
          text: "MISS!",
        });
        setBattleLogs((prev) => [
          ...prev,
          { id: `miss_${Date.now()}`, text: `${oActive.name}'s attack missed!`, type: "info" },
        ]);
      } else if (action.damage > 0) {
        setPlayerAnim(action.defenderFainted ? "faint" : "hit");
        setTimeout(() => setPlayerAnim("idle"), 400);

        setFloatingText({
          target: "player",
          text: `-${action.damage}${action.isCrit ? " CRIT!" : ""}`,
          isCrit: action.isCrit,
        });

        const isLiberation = action.move.category === "liberation" || !!action.syncTeammateName;
        soundEngine.playHitPunch({ isCrit: action.isCrit, isHeavy: isLiberation });
        soundEngine.playElementalHit(action.move.element, action.typeEffectiveness === "super");
        triggerScreenShake(isLiberation ? 420 : action.isCrit ? 300 : 180);

        setBattleLogs((prev) => [
          ...prev,
          {
            id: `dmg_o_${Date.now()}`,
            text: `${currentO.username}'s ${oActive.name} dealt ${action.damage} damage!${action.isCrit ? " 💥 Critical Hit!" : ""}`,
            type: "damage",
          },
        ]);

        if (action.typeEffectiveness === "super") {
          setBattleLogs((prev) => [
            ...prev,
            { id: `eff_${Date.now()}`, text: "🎯 It's super effective!", type: "effective" },
          ]);
        }
      }

      if (action.triggeredOneMore) {
        soundEngine.playOneMoreStinger();
      }

      if (action.knockedDown) {
        setBattleLogs((prev) => [
          ...prev,
          {
            id: `p_down_${Date.now()}`,
            text: `💫 ${pActive.name} was KNOCKED DOWN! (-20% Accuracy next turn)`,
            type: "down",
          },
        ]);
      }

      if (action.defenderFainted) {
        setBattleLogs((prev) => [
          ...prev,
          {
            id: `faint_p_${Date.now()}`,
            text: `💀 Your ${pActive.name} has fallen!`,
            type: "info",
          },
        ]);

        const hasAlive = currentP.team.some((r) => !r.isFainted);
        if (!hasAlive) {
          if (isRealtimeMatch) {
            realtimeManagerRef.current?.sendAction({
              type: "battle_end",
              winnerId: currentO.id,
              senderId: currentP.id,
            });
          }
          handleBattleEnd("opponent");
          return;
        } else {
          // Open interactive faint replacement picker for player to choose their next resonator
          const followingTurn: "player" | "opponent" = action.triggeredOneMore
            ? "opponent"
            : action.nextTurnUserId
            ? (action.nextTurnUserId === currentP.id ? "player" : "opponent")
            : "player";
          setPendingFaintTurnDecision(followingTurn);
          setIsFaintPickerOpen(true);
          setIsBusy(false);
          setIsPlayerTurn(false);
          return;
        }
      }

      // If opponent triggered 1 MORE
      if (action.triggeredOneMore) {
        setOneMoreBanner("opponent");
        setBattleLogs((prev) => [
          ...prev,
          {
            id: `ai_onemore_${Date.now()}`,
            text: `1 MORE! ${currentO.username}'s ${oActive.name} earned an extra action!`,
            type: "one_more",
          },
        ]);
        await new Promise((r) => setTimeout(r, 1000));
        setOneMoreBanner(null);
        setIsPlayerTurn(false);
        setIsBusy(false);
        return;
      }

      // Turn transition: pass turn to Player or honor authoritative nextTurnUserId
      if (action.nextTurnUserId) {
        if (action.nextTurnUserId === currentP.id) {
          startPlayerTurn();
        } else {
          setIsPlayerTurn(false);
          setIsBusy(false);
        }
      } else {
        startPlayerTurn();
      }
    }
  };

  // Auto-forfeit if user leaves or refreshes during active battle ONLY
  useEffect(() => {
    if (screen === "battle" && isRealtimeMatch && !battleWinner) {
      const handleBeforeUnload = () => {
        const p = playerTrainerRef.current || playerTrainer;
        const o = opponentTrainerRef.current || opponentTrainer;
        realtimeManagerRef.current?.sendAction({
          type: "forfeit",
          senderId: p?.id || "",
        });
        realtimeManagerRef.current?.leaveRoom();
        recordBattleResult(false, currentUserId);
        savePendingPvpNotice(
          {
            winner: "opponent",
            opponentUsername: o?.username || "Opponent",
            opponentAvatarId: o?.avatarId,
            bet: selectedBet,
            isForfeit: true,
            isEarlyForfeit: battleTurnCountRef.current < 3,
            timestamp: Date.now(),
          },
          currentUserId
        );
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }
  }, [screen, isRealtimeMatch, battleWinner, currentUserId, playerTrainer, opponentTrainer, selectedBet]);

  // Continuously refresh realtime manager callbacks so stale closures can never occur
  useEffect(() => {
    if (realtimeManagerRef.current) {
      realtimeManagerRef.current.updateCallbacks({
        onOpponentJoined: (oppTrainer) => {
          setIsWaitingForChallenger(false);
          setIsRealtimeMatch(true);
          setIsOpponentReconnecting(false);
          setOpponentTrainer(oppTrainer);
          opponentTrainerRef.current = oppTrainer;
          setScreen("room_prep");
          setIsMyReady(false);
          setIsOpponentReady(false);
        },
        onOpponentWelcome: (hostTrainer, bet) => {
          setIsConnectingRoom(false);
          setIsRealtimeMatch(true);
          setIsOpponentReconnecting(false);
          setOpponentTrainer(hostTrainer);
          opponentTrainerRef.current = hostTrainer;
          if (bet !== undefined) setSelectedBet(bet);
          setScreen("room_prep");
          setIsMyReady(false);
          setIsOpponentReady(false);
        },
        onOpponentTeamUpdate: (updatedTrainer) => {
          setOpponentTrainer(updatedTrainer);
          opponentTrainerRef.current = updatedTrainer;
        },
        onOpponentReadyToggle: (isReady) => {
          setIsOpponentReady(isReady);
        },
        onBattleStart: (firstTurnUserId, bet) => {
          const currentP = playerTrainerRef.current;
          const currentO = opponentTrainerRef.current;
          if (currentP && currentO) {
            const isFirst = firstTurnUserId === currentP.id;
            if (bet !== undefined) setSelectedBet(bet);
            handleStartRealtimeBattle(currentP, currentO, isFirst, bet);
          }
        },
        onOpponentAction: (action) => handleOpponentRealtimeAction(action),
        onOpponentDisconnected: () => {
          setIsOpponentReconnecting(false);
          handleOpponentDisconnect();
        },
        onOpponentReconnecting: (reconnecting) => setIsOpponentReconnecting(reconnecting),
        onRequestSync: () => handleRequestSync(),
        onSyncState: (action) => handleSyncState(action),
        onError: (err) => {
          setIsConnectingRoom(false);
          setRoomError(err);
        },
      });
    }
  });

  // Faint Replacement Selection Handler
  const handleSelectFaintReplacement = (chosenIdx: number) => {
    const currentP = playerTrainerRef.current;
    if (!currentP) return;
    const chosenRes = currentP.team[chosenIdx];
    if (!chosenRes || chosenRes.isFainted) return;

    currentP.activeIdx = chosenIdx;
    setPlayerTrainer({ ...currentP });
    playerTrainerRef.current = { ...currentP };
    setPlayerSwitchCooldown(0); // Faint replacements never suffer switch cooldown
    setIsFaintPickerOpen(false);

    setBattleLogs((prev) => [
      ...prev,
      {
        id: `p_send_${Date.now()}`,
        text: `Go! ${chosenRes.name}!`,
        type: "switch",
      },
    ]);

    if (isRealtimeMatch) {
      realtimeManagerRef.current?.sendAction({
        type: "faint_switch",
        targetResonatorIdx: chosenIdx,
        senderId: currentP.id,
      });
    }

    // Turn continuation
    if (pendingFaintTurnDecision === "player") {
      startPlayerTurn();
    } else {
      setIsPlayerTurn(false);
      setIsBusy(false);
      if (!isRealtimeMatch) {
        triggerAiTurn(true);
      }
    }
  };

  // Resonator Team Sync: Synchronized Teammate Assist
  const handleExecuteTeamSync = async (teammateId: string) => {
    if (!playerTrainer || !opponentTrainer || !isPlayerTurn || isBusy) return;
    const pActive = playerTrainer.team[playerTrainer.activeIdx];
    const oActive = opponentTrainer.team[opponentTrainer.activeIdx];
    if (!pActive || !oActive || pActive.isFainted) return;

    const chosenTeammate = playerTrainer.team.find((r) => r.id === teammateId);
    if (!chosenTeammate || chosenTeammate.isFainted) return;

    setIsTeamSyncPickerOpen(false);
    setIsBusy(true);
    setBattleTurnCount((prev) => prev + 1);
    battleTurnCountRef.current += 1;

    const syncType = pendingTeamSyncMove?.teamSync?.type || "shorekeeper_crit_strike";

    // 0. Trigger Liberation Cinematic Cut-In and audio activation
    if (pendingTeamSyncMove) {
      soundEngine.playLiberationActivation(pendingTeamSyncMove.element || pActive.element);
      setLiberationCutIn({
        resonator: pActive,
        move: pendingTeamSyncMove,
        isPlayer: true,
      });
      await new Promise((r) => setTimeout(r, 1050));
      setLiberationCutIn(null);
    }

    // 1. Liberation cast: 100 energy consumed
    pActive.energy = 0;

    // 2. Resonator-specific Team Buffs & Effects
    if (syncType === "shorekeeper_crit_strike") {
      playerTrainer.team.forEach((r) => {
        if (!r.isFainted) {
          const heal = Math.round(r.maxHp * 0.2);
          r.hp = Math.min(r.maxHp, r.hp + heal);
          const barrier = Math.round(r.maxHp * 0.15);
          r.barrierHp = (r.barrierHp || 0) + barrier;
          if (r.statusEffects) {
            r.statusEffects = r.statusEffects.filter(
              (s) =>
                s.type === "buff_atk" ||
                s.type === "buff_def" ||
                s.type === "buff_crit" ||
                s.type === "buff_next_attack" ||
                s.type === "buff_dodge"
            );
          }
        }
      });
      (playerTrainer.activeIndices || [0, 1, 2]).forEach((teamIdx, slotIdx) => {
        const r = playerTrainer.team[teamIdx];
        if (r && !r.isFainted) {
          const heal = Math.round(r.maxHp * 0.2);
          triggerHealingPop("player", slotIdx, heal);
        }
      });
      soundEngine.playHealChime();
      setBattleLogs((prev) => [
        ...prev,
        {
          id: `sk_sync_lib_${Date.now()}`,
          text: `🌌 ${pActive.name} unleashed End of the Sea Turns Clear! Outer Stellarealm activated — Team healed by 20%, 15% Barrier granted, and debuffs cleansed!`,
          type: "liberation",
        },
      ]);
    } else if (syncType === "zhezhi_battery") {
      chosenTeammate.energy = Math.min(100, chosenTeammate.energy + 35);
      setBattleLogs((prev) => [
        ...prev,
        {
          id: `zh_sync_lib_${Date.now()}`,
          text: `🎨 ${pActive.name} summoned Living Ink Spirits! Granted +35 Energy to ${chosenTeammate.name}!`,
          type: "liberation",
        },
      ]);
    } else if (syncType === "changli_burn") {
      chosenTeammate.statusEffects = [
        ...(chosenTeammate.statusEffects || []),
        { type: "buff_next_attack", duration: 2 },
      ];
      setBattleLogs((prev) => [
        ...prev,
        {
          id: `cl_sync_lib_${Date.now()}`,
          text: `🔥 ${pActive.name} ignited Radiance of Feathers! Inflicted Burn on foe and granted ${chosenTeammate.name} +30% Skill Deepen!`,
          type: "liberation",
        },
      ]);
    } else if (syncType === "yinlin_zap") {
      setBattleLogs((prev) => [
        ...prev,
        {
          id: `yl_sync_lib_${Date.now()}`,
          text: `⚡ ${pActive.name} unleashed Thundering Wrath! Zapstring synchronizes with ${chosenTeammate.name}!`,
          type: "liberation",
        },
      ]);
    } else if (syncType === "jiyan_knockdown") {
      setBattleLogs((prev) => [
        ...prev,
        {
          id: `jy_sync_lib_${Date.now()}`,
          text: `🐉 ${pActive.name} summoned the Qingloong! Wind formation charges ${chosenTeammate.name}'s attack!`,
          type: "liberation",
        },
      ]);
    } else if (syncType === "camellya_lifesteal") {
      setBattleLogs((prev) => [
        ...prev,
        {
          id: `cm_sync_lib_${Date.now()}`,
          text: `🌺 ${pActive.name} wove Crimson Vines! Siphoning life essence for ${chosenTeammate.name}!`,
          type: "liberation",
        },
      ]);
    } else if (syncType === "carlotta_freeze") {
      setBattleLogs((prev) => [
        ...prev,
        {
          id: `cr_sync_lib_${Date.now()}`,
          text: `❄️ ${pActive.name} summoned Gilded Winter Rose! Glacial sub-zero blizzard chills the battlefield!`,
          type: "liberation",
        },
      ]);
    } else if (syncType === "xiangli_stun") {
      setBattleLogs((prev) => [
        ...prev,
        {
          id: `xl_sync_lib_${Date.now()}`,
          text: `💡 ${pActive.name} calculated Deductive Matrix Synchronization! Pinpointing enemy weak points!`,
          type: "liberation",
        },
      ]);
    }

    setPlayerTrainer({ ...playerTrainer });
    setOpponentTrainer({ ...opponentTrainer });

    setPlayerAnim("attack");
    await new Promise((r) => setTimeout(r, 600));
    setPlayerAnim("idle");

    // 3. Teammate Synchronized Assist Strike
    const assistMove: BattleMove = {
      id: `${chosenTeammate.id}_sync_strike`,
      name: `Synchronized Strike: ${chosenTeammate.name}`,
      category: "forte",
      element: chosenTeammate.element,
      power: 135,
      accuracy: 80, // 80% accuracy (20% miss chance for balance)
      critBonus: 1.0, // 100% Critical Strike guaranteed!
      energyGain: 15,
      statusEffect:
        syncType === "yinlin_zap"
          ? { type: "shock", chance: 1.0, duration: 3 }
          : syncType === "changli_burn"
          ? { type: "burn", chance: 1.0, duration: 3 }
          : syncType === "carlotta_freeze"
          ? { type: "freeze", chance: 1.0, duration: 1 }
          : syncType === "xiangli_stun"
          ? { type: "stun", chance: 0.5, duration: 1 }
          : syncType === "camellya_lifesteal"
          ? { type: "erosion", chance: 0.7, duration: 3 }
          : undefined,
      lifestealPercent: syncType === "camellya_lifesteal" ? 40 : undefined,
      defPiercePercent: syncType === "xiangli_stun" ? 35 : undefined,
      description: `${pendingTeamSyncMove?.teamSync?.title || "Team Sync"} assist: 100% Crit Rate, 80% Accuracy.`,
      animationType: "burst",
    };

    setBattleLogs((prev) => [
      ...prev,
      {
        id: `sync_assist_${Date.now()}`,
        text: `⚔️ TEAM SYNC! ${chosenTeammate.name} leaps into battle to deliver a Synchronized Critical Strike!`,
        type: "crit",
      },
    ]);

    const isBossFight = currentGymChallenge !== null || (currentTowerFloor !== null && currentTowerFloor.isBossFloor);
    const result = executeMoveDamage(chosenTeammate, oActive, assistMove, isOneMoreActive, {
      activeBlessings: currentTowerFloor ? towerRunState.activeBlessings : undefined,
      isBossFight,
    });

    if (result.logs && result.logs.length > 0) {
      setBattleLogs((prev) => [
        ...prev,
        ...result.logs!.map((l: string) => ({
          id: `log_${Date.now()}_${Math.random()}`,
          text: l,
          type: "info" as const,
        })),
      ]);
    }

    setPlayerTrainer({ ...playerTrainer });
    setOpponentTrainer({ ...opponentTrainer });

    const nextTurnId = result.triggeredOneMore ? playerTrainer.id : opponentTrainer.id;
    if (isRealtimeMatch) {
      realtimeManagerRef.current?.sendAction({
        type: "move",
        move: assistMove,
        damage: result.damage,
        isCrit: result.isCrit,
        missed: !!result.missed,
        typeMultiplier: result.typeMultiplier,
        typeEffectiveness: result.typeEffectiveness,
        knockedDown: result.knockedDown,
        triggeredOneMore: result.triggeredOneMore,
        statusApplied: result.statusApplied,
        healAmount: result.healAmount,
        attackerHp: pActive.hp,
        attackerEnergy: pActive.energy,
        attackerBarrierHp: pActive.barrierHp,
        attackerStatusEffects: pActive.statusEffects,
        defenderHp: oActive.hp,
        defenderBarrierHp: oActive.barrierHp,
        defenderFainted: oActive.isFainted,
        nextTurnUserId: nextTurnId,
        senderId: playerTrainer.id,
        syncTeammateId: chosenTeammate.id,
        syncTeammateName: chosenTeammate.name,
      });
    }

    if (result.missed) {
      setFloatingText({
        target: "opponent",
        text: result.dodged ? "DODGED!" : "MISS!",
      });
      setBattleLogs((prev) => [
        ...prev,
        {
          id: `miss_${Date.now()}`,
          text: result.dodged
            ? `💨 Foe ${oActive.name} agilely dodged ${chosenTeammate.name}'s synchronized strike!`
            : `${chosenTeammate.name}'s synchronized strike missed!`,
          type: "info",
        },
      ]);
    } else if (result.damage > 0) {
      setOpponentAnim("hit");
      setFloatingText({
        target: "opponent",
        text: `-${result.damage}${result.isCrit ? " CRIT!" : ""}`,
        isCrit: result.isCrit,
      });

      // Synthesized heavy crit punch & elemental hit + screen shake
      soundEngine.playHitPunch({ isCrit: true, isHeavy: true });
      soundEngine.playElementalHit(chosenTeammate.element, result.typeEffectiveness === "super");
      triggerScreenShake(380);

      setBattleLogs((prev) => [
        ...prev,
        {
          id: `sync_dmg_${Date.now()}`,
          text: `💥 ${chosenTeammate.name}'s Synchronized Critical Strike dealt ${result.damage} damage!`,
          type: "crit",
        },
      ]);

      if (result.typeEffectiveness === "super") {
        setBattleLogs((prev) => [
          ...prev,
          { id: `eff_${Date.now()}`, text: "🎯 It's super effective!", type: "effective" },
        ]);
      }
    }

    if (result.logs && result.logs.some((l: string) => l.includes("Resonator Grit"))) {
      soundEngine.playResonatorGrit();
    }

    await new Promise((r) => setTimeout(r, 600));
    setOpponentAnim("idle");
    setFloatingText(null);

    // Check if opponent fainted
    if (result.defenderFainted) {
      setOpponentAnim("faint");
      setBattleLogs((prev) => [
        ...prev,
        { id: `faint_${Date.now()}`, text: `${oActive.name} fainted!`, type: "faint" },
      ]);

      await new Promise((r) => setTimeout(r, 700));

      const nextOppIdx = chooseAiFaintReplacement(opponentTrainer, pActive);
      if (nextOppIdx === -1 || opponentTrainer.team.every((r) => r.isFainted)) {
        if (isRealtimeMatch) {
          realtimeManagerRef.current?.sendAction({
            type: "battle_end",
            winnerId: playerTrainer.id,
            senderId: playerTrainer.id,
          });
        }
        handleBattleEnd("player");
        return;
      }

      if (!isRealtimeMatch) {
        opponentTrainer.activeIdx = nextOppIdx;
        setOpponentTrainer({ ...opponentTrainer });
        opponentTrainerRef.current = { ...opponentTrainer };
        setOpponentAnim("idle");
        setBattleLogs((prev) => [
          ...prev,
          {
            id: `switch_o_${Date.now()}`,
            text: `${opponentTrainer.username} sent out ${opponentTrainer.team[nextOppIdx].name}!`,
            type: "switch",
          },
        ]);
        setIsBusy(false);
        if (result.triggeredOneMore) {
          setOneMoreBanner("player");
          setIsOneMoreActive(true);
          setIsPlayerTurn(true);
        } else {
          setIsOneMoreActive(false);
          setIsPlayerTurn(false);
          triggerAiTurn();
        }
      } else {
        if (result.triggeredOneMore) {
          setOneMoreBanner("player");
          setIsOneMoreActive(true);
          setIsPlayerTurn(true);
          setIsBusy(false);
        } else {
          setIsOneMoreActive(false);
          setIsPlayerTurn(false);
          setIsBusy(false);
        }
      }
      return;
    }

    // 1 MORE!
    if (result.triggeredOneMore) {
      setOneMoreBanner("player");
      setIsOneMoreActive(true);
      setBattleLogs((prev) => [
        ...prev,
        { id: `onemore_${Date.now()}`, text: `1 MORE! Extra action earned!`, type: "one_more" },
      ]);
      await new Promise((r) => setTimeout(r, 1000));
      setOneMoreBanner(null);
      setIsBusy(false);
      setIsPlayerTurn(true);
      return;
    }

    // Pass turn to Opponent
    setIsOneMoreActive(false);
    setIsPlayerTurn(false);
    setIsBusy(false);
    if (!isRealtimeMatch) {
      triggerAiTurn();
    }
  };

  // Helper to ensure downed opponent frontline slots are immediately filled by living bench reserves
  const autoDeployOpponentReserves = (
    currentOppTrainer: BattleTrainer,
    currentTimeline: TimelineEntry[]
  ): { updatedTrainer: BattleTrainer; updatedTimeline: TimelineEntry[]; deployedLogs: string[] } => {
    const oppIndices = [...(currentOppTrainer.activeIndices ?? [0, 1, 2].slice(0, currentOppTrainer.team.length))];
    let timelineList = [...currentTimeline];
    const deployedLogs: string[] = [];

    for (let slotIdx = 0; slotIdx < oppIndices.length; slotIdx++) {
      const currentTeamIdx = oppIndices[slotIdx];
      const unit = currentTeamIdx !== undefined ? currentOppTrainer.team[currentTeamIdx] : undefined;

      if (!unit || unit.isFainted || unit.hp <= 0) {
        let faintedAv: number | undefined;
        if (currentTeamIdx !== undefined) {
          const existingEntry = timelineList.find((e) => !e.isPlayer && e.teamIndex === currentTeamIdx);
          if (existingEntry) faintedAv = existingEntry.actionValue;
          timelineList = removeUnitFromTimeline(timelineList, false, currentTeamIdx);
        }

        const benchIdx = currentOppTrainer.team.findIndex(
          (u, idx) => !oppIndices.includes(idx) && !u.isFainted && u.hp > 0
        );

        if (benchIdx !== -1) {
          oppIndices[slotIdx] = benchIdx;
          deployReserveResonator(currentOppTrainer, slotIdx, benchIdx);
          timelineList = addUnitToTimeline(timelineList, currentOppTrainer, benchIdx, slotIdx, false, faintedAv);
          deployedLogs.push(`🔄 Foe sent out ${currentOppTrainer.team[benchIdx].name} to Frontline Slot ${slotIdx + 1}!`);
        }
      }
    }

    currentOppTrainer.activeIndices = oppIndices;

    // Ensure opponent activeIdx points to a living frontline resonator
    const currentActive = currentOppTrainer.team[currentOppTrainer.activeIdx];
    if (!currentActive || currentActive.isFainted || currentActive.hp <= 0) {
      const firstAlive = oppIndices.find(
        (idx) => !currentOppTrainer.team[idx]?.isFainted && (currentOppTrainer.team[idx]?.hp ?? 0) > 0
      );
      if (firstAlive !== undefined) {
        currentOppTrainer.activeIdx = firstAlive;
      }
    }
    opponentTrainerRef.current = { ...currentOppTrainer };

    // Purge any fainted units from timeline
    timelineList = timelineList.filter((entry) => {
      const tr = entry.isPlayer ? playerTrainer : currentOppTrainer;
      const u = tr?.team[entry.teamIndex];
      return u && !u.isFainted && u.hp > 0;
    });

    return {
      updatedTrainer: currentOppTrainer,
      updatedTimeline: timelineList,
      deployedLogs,
    };
  };

  // Execute Player Move (3v3 Simultaneous Combat)
  const handlePlayerMove = async (move: BattleMove) => {
    if (!isPlayerTurn || isBusy || !playerTrainer || !opponentTrainer) return;
    const pActive = playerTrainer.team[playerTrainer.activeIdx];
    if (!pActive || pActive.isFainted) return;

    if (move.category === "liberation" && pActive.energy < 100) return;
    const moveCd = pActive.moveCooldowns?.[move.id] || 0;
    if (moveCd > 0) return;

    // Check for Team Sync (e.g. Shorekeeper, Yinlin, Zhezhi, Changli, Jiyan, Xiangli Yao, Camellya, Carlotta)
    if (move.teamSync) {
      const aliveBench = playerTrainer.team.filter((r, idx) => idx !== playerTrainer.activeIdx && !r.isFainted);
      if (aliveBench.length > 0) {
        setPendingTeamSyncMove(move);
        setIsTeamSyncPickerOpen(true);
        return;
      }
    }

    setIsBusy(true);
    setBattleTurnCount((prev) => prev + 1);
    battleTurnCountRef.current += 1;

    // Trigger Liberation Cinematic Cut-In and audio activation
    if (move.category === "liberation") {
      soundEngine.playLiberationActivation(move.element);
      setLiberationCutIn({
        resonator: pActive,
        move,
        isPlayer: true,
      });
      await new Promise((r) => setTimeout(r, 800));
      setLiberationCutIn(null);
    }

    // 1. Announce Move
    setBattleLogs((prev) => [
      ...prev,
      {
        id: `move_${Date.now()}`,
        text: `${pActive.name} used ${move.name}!`,
        type: move.category === "liberation" ? "liberation" : "info",
      },
    ]);

    // 2. Determine target slot
    const scope = move.targetScope || "single";
    const attackerSlot = playerTrainer.activeIndices?.indexOf(playerTrainer.activeIdx) ?? 0;
    let targetSlot = selectedEnemySlot;

    if (scope === "ally_single") {
      targetSlot = selectedAllySlot;
    } else if (scope === "ally_team" || scope === "self") {
      targetSlot = attackerSlot;
    } else {
      // Offensive: ensure selected enemy is valid and alive
      const oppIndices = opponentTrainer.activeIndices ?? [0, 1, 2].slice(0, opponentTrainer.team.length);
      const targetTeamIdx = oppIndices[selectedEnemySlot];
      if (targetTeamIdx === undefined || opponentTrainer.team[targetTeamIdx]?.isFainted) {
        const firstAliveSlot = oppIndices.findIndex((idx) => !opponentTrainer.team[idx]?.isFainted && opponentTrainer.team[idx]?.hp > 0);
        if (firstAliveSlot !== -1) {
          targetSlot = firstAliveSlot;
          setSelectedEnemySlot(firstAliveSlot);
        }
      }
    }

    const isOffensive = !scope.startsWith("ally") && scope !== "self";

    // 3. Physical Approach (Dash-In) for offensive moves
    if (isOffensive) {
      const delta = getDashDelta(true, attackerSlot, targetSlot);
      setActiveAttack({
        attacker: "player",
        attackerSlot,
        targetSlot,
        delta,
        move,
        phase: "approach",
      });
      soundEngine.playSlashWhoosh(move.element);
      await new Promise((r) => setTimeout(r, 190));
    } else {
      // Friendly / Self support skill: Cast in place without dashing!
      setPlayerAnim("attack");
    }

    // 4. Execute Combat Calculation
    const isBossFight = currentGymChallenge !== null || (currentTowerFloor !== null && currentTowerFloor.isBossFloor);
    const multiResult = execute3v3Action(
      pActive,
      playerTrainer.activeIdx,
      attackerSlot,
      move,
      true,
      playerTrainer,
      opponentTrainer,
      targetSlot,
      {
        activeBlessings: currentTowerFloor ? towerRunState.activeBlessings : undefined,
        isBossFight,
        isOneMoreTurn: isOneMoreActive,
      }
    );

    // Apply logs from multiResult
    if (multiResult.logs && multiResult.logs.length > 0) {
      setBattleLogs((prev) => [
        ...prev,
        ...multiResult.logs.map((text) => ({
          id: `log_${Date.now()}_${Math.random()}`,
          text,
          type: "info" as const,
        })),
      ]);
    }

    // 5. Strike Impact & Elemental Slash VFX
    if (multiResult.results && multiResult.results.length > 0) {
      const primaryRes = multiResult.results[0];
      const isCrit = !!primaryRes.damageResult.isCrit;
      const isLiberation = move.category === "liberation";
      const isSuper = primaryRes.damageResult.typeEffectiveness === "super";

      if (isOffensive) {
        const delta = getDashDelta(true, attackerSlot, targetSlot);
        setActiveAttack({
          attacker: "player",
          attackerSlot,
          targetSlot,
          delta,
          move,
          phase: "strike",
        });

        // Determine affected defender slots for slash VFX
        const affectedSlots =
          scope === "single"
            ? [targetSlot]
            : scope === "blast"
            ? [targetSlot, targetSlot - 1, targetSlot + 1].filter((s) => s >= 0 && s <= 2)
            : [0, 1, 2];

        setActiveSlash({
          target: "opponent",
          slotIndices: affectedSlots,
          element: move.element,
          category: move.category,
          isCrit,
          isSuper,
        });
      }

      if (primaryRes.damageResult.damage > 0) {
        setOpponentAnim("hit");
        setFloatingText({
          target: "opponent",
          slotIdx: primaryRes.defenderSlot,
          text: `-${primaryRes.damageResult.damage}${isCrit ? " CRIT!" : ""}`,
          isCrit: isCrit,
        });

        soundEngine.playHitPunch({ isCrit, isHeavy: isLiberation });
        soundEngine.playElementalHit(move.element, isSuper);
        triggerScreenShake(isLiberation ? 360 : isCrit ? 250 : 150);
      } else if (primaryRes.damageResult.missed || primaryRes.damageResult.dodged) {
        const isDodge = primaryRes.damageResult.dodged;
        const targetDefender = opponentTrainer.team[primaryRes.defenderTeamIndex];
        setFloatingText({
          target: "opponent",
          slotIdx: primaryRes.defenderSlot,
          text: isDodge ? "DODGED!" : "MISSED!",
        });
        soundEngine.playMissWhoosh();
        setBattleLogs((prev) => [
          ...prev,
          {
            id: `miss_${Date.now()}`,
            text: isDodge
              ? `💨 Foe ${targetDefender?.name || "Target"} agilely dodged ${pActive.name}'s ${move.name}!`
              : `❌ ${pActive.name}'s ${move.name} missed Foe ${targetDefender?.name || "Target"}!`,
            type: "info",
          },
        ]);
      }

      // Allow strike and slash VFX to play out
      await new Promise((r) => setTimeout(r, 240));

      // 6. Dash-Back to formation slot
      if (isOffensive) {
        const delta = getDashDelta(true, attackerSlot, targetSlot);
        setActiveAttack({
          attacker: "player",
          attackerSlot,
          targetSlot,
          delta,
          move,
          phase: "return",
        });
        setActiveSlash(null);
        await new Promise((r) => setTimeout(r, 180));
        setActiveAttack(null);
      } else {
        setPlayerAnim("idle");
      }

      setTimeout(() => {
        setOpponentAnim("idle");
        setFloatingText(null);
      }, 500);
    }

    // 5B. Friendly / Support Ally Effects (Healing & Buffs)
    if (multiResult.allyEffects && multiResult.allyEffects.length > 0) {
      let anyHealed = false;
      for (const eff of multiResult.allyEffects) {
        if (eff.healAmount > 0) {
          anyHealed = true;
          triggerHealingPop("player", eff.allySlot, eff.healAmount);
        }
      }
      if (anyHealed) {
        soundEngine.playHealChime();
      }
      await new Promise((r) => setTimeout(r, 380));
      setPlayerAnim("idle");
    }

    // Check Resonator Grit audio stinger
    if (multiResult.logs && multiResult.logs.some((l) => l.includes("Resonator Grit"))) {
      soundEngine.playResonatorGrit();
    }

    // Update state immutably
    setPlayerTrainer({ ...playerTrainer });
    setOpponentTrainer({ ...opponentTrainer });

    let updatedTimeline = [...actionTimeline];

    // Check fainted enemies and announce defeats
    for (const r of multiResult.results) {
      if (r.damageResult.defenderFainted || opponentTrainer.team[r.defenderTeamIndex]?.isFainted) {
        const faintedUnit = opponentTrainer.team[r.defenderTeamIndex];
        setBattleLogs((prev) => [
          ...prev,
          {
            id: `faint_o_${Date.now()}_${r.defenderTeamIndex}`,
            text: `💀 Foe ${faintedUnit?.name || "Resonator"} was defeated!`,
            type: "faint",
          },
        ]);
      }
    }

    // Automatically reinforce any downed opponent frontline slots from bench!
    const deployRes = autoDeployOpponentReserves(opponentTrainer, updatedTimeline);
    updatedTimeline = deployRes.updatedTimeline;
    setOpponentTrainer({ ...deployRes.updatedTrainer });

    if (deployRes.deployedLogs.length > 0) {
      setBattleLogs((prev) => [
        ...prev,
        ...deployRes.deployedLogs.map((text) => ({
          id: `bench_o_${Date.now()}_${Math.random()}`,
          text,
          type: "switch" as const,
        })),
      ]);
    }

    // Auto-retarget selectedEnemySlot to the first living enemy slot
    const firstAliveOppSlot = deployRes.updatedTrainer.activeIndices?.findIndex(
      (idx) => !deployRes.updatedTrainer.team[idx]?.isFainted && deployRes.updatedTrainer.team[idx]?.hp > 0
    );
    if (firstAliveOppSlot !== undefined && firstAliveOppSlot !== -1) {
      setSelectedEnemySlot(firstAliveOppSlot);
    }

    // Check if entire opponent team is wiped
    if (isTeamWiped(deployRes.updatedTrainer)) {
      setActionTimeline([]);
      if (isRealtimeMatch) {
        realtimeManagerRef.current?.sendAction({
          type: "battle_end",
          winnerId: playerTrainer.id,
          senderId: playerTrainer.id,
        });
      }
      setIsBusy(true);
      setStageEndBanner("VICTORY");
      soundEngine.playOneMoreStinger();
      setTimeout(() => {
        setStageEndBanner(null);
        handleBattleEnd("player");
      }, 1800);
      return;
    }

    // 1 MORE! Check
    const triggeredOneMore = multiResult.results.some((r) => r.damageResult.triggeredOneMore);
    if (triggeredOneMore) {
      soundEngine.playOneMoreStinger();
      setOneMoreBanner("player");
      setIsOneMoreActive(true);
      setBattleLogs((prev) => [
        ...prev,
        { id: `onemore_${Date.now()}`, text: `1 MORE! ${pActive.name} earned an extra action!`, type: "one_more" },
      ]);
      await new Promise((r) => setTimeout(r, 800));
      setOneMoreBanner(null);
      setIsBusy(false);
      setIsPlayerTurn(true);

      if (isRealtimeMatch) {
        const primaryRes = multiResult.results?.[0];
        const targetDefender = opponentTrainer.team[primaryRes?.defenderTeamIndex ?? 0];
        realtimeManagerRef.current?.sendAction({
          type: "move",
          move,
          attackerSlot,
          targetSlot,
          damage: primaryRes?.damageResult?.damage ?? 0,
          isCrit: !!primaryRes?.damageResult?.isCrit,
          missed: !!(primaryRes?.damageResult?.missed || primaryRes?.damageResult?.dodged),
          typeMultiplier: primaryRes?.damageResult?.typeMultiplier ?? 1.0,
          typeEffectiveness: primaryRes?.damageResult?.typeEffectiveness ?? "neutral",
          knockedDown: !!primaryRes?.damageResult?.knockedDown,
          triggeredOneMore: true,
          statusApplied: primaryRes?.damageResult?.statusApplied,
          healAmount: primaryRes?.damageResult?.healAmount,
          attackerHp: pActive.hp,
          attackerEnergy: pActive.energy,
          attackerBarrierHp: pActive.barrierHp,
          attackerStatusEffects: pActive.statusEffects,
          defenderHp: targetDefender?.hp ?? 0,
          defenderBarrierHp: targetDefender?.barrierHp,
          defenderFainted: !!targetDefender?.isFainted,
          nextTurnUserId: playerTrainer.id,
          senderId: playerTrainer.id,
          senderTrainer: { ...playerTrainer },
          receiverTrainer: { ...deployRes.updatedTrainer },
          timeline: updatedTimeline,
          turnCount: battleTurnCountRef.current,
        });
      }
      return;
    }

    // Advance turn in timeline with tactical AV scaling (Basic attack recovers 15% faster)
    setIsOneMoreActive(false);
    const avMultiplier = move.category === "basic" ? 0.85 : 1.0;
    const adv = advanceTimeline(updatedTimeline, avMultiplier);
    if (!adv) {
      setIsBusy(false);
      return;
    }

    setActionTimeline(adv.updatedTimeline);
    const nextUnit = adv.updatedTimeline[0];

    playerTrainerRef.current = { ...playerTrainer };
    opponentTrainerRef.current = { ...opponentTrainer };

    if (nextUnit.isPlayer) {
      playerTrainer.activeIdx = nextUnit.teamIndex;
      playerTrainerRef.current.activeIdx = nextUnit.teamIndex;
      setPlayerTrainer({ ...playerTrainer });
      setIsPlayerTurn(true);
      setIsBusy(false);
    } else {
      opponentTrainer.activeIdx = nextUnit.teamIndex;
      opponentTrainerRef.current.activeIdx = nextUnit.teamIndex;
      setOpponentTrainer({ ...opponentTrainer });
      setIsPlayerTurn(false);
      setIsBusy(true);
      if (!isRealtimeMatch) {
        setTimeout(() => triggerAiTurn(false, adv.updatedTimeline), 260);
      }
    }

    if (isRealtimeMatch) {
      const primaryRes = multiResult.results?.[0];
      const targetDefender = opponentTrainer.team[primaryRes?.defenderTeamIndex ?? 0];
      const nextTurnUserId = nextUnit.isPlayer ? playerTrainer.id : opponentTrainer.id;

      realtimeManagerRef.current?.sendAction({
        type: "move",
        move,
        attackerSlot,
        targetSlot,
        damage: primaryRes?.damageResult?.damage ?? 0,
        isCrit: !!primaryRes?.damageResult?.isCrit,
        missed: !!(primaryRes?.damageResult?.missed || primaryRes?.damageResult?.dodged),
        typeMultiplier: primaryRes?.damageResult?.typeMultiplier ?? 1.0,
        typeEffectiveness: primaryRes?.damageResult?.typeEffectiveness ?? "neutral",
        knockedDown: !!primaryRes?.damageResult?.knockedDown,
        triggeredOneMore: false,
        statusApplied: primaryRes?.damageResult?.statusApplied,
        healAmount: primaryRes?.damageResult?.healAmount,
        attackerHp: pActive.hp,
        attackerEnergy: pActive.energy,
        attackerBarrierHp: pActive.barrierHp,
        attackerStatusEffects: pActive.statusEffects,
        defenderHp: targetDefender?.hp ?? 0,
        defenderBarrierHp: targetDefender?.barrierHp,
        defenderFainted: !!targetDefender?.isFainted,
        nextTurnUserId,
        senderId: playerTrainer.id,
        senderTrainer: { ...playerTrainer },
        receiverTrainer: { ...deployRes.updatedTrainer },
        timeline: adv.updatedTimeline,
        turnCount: battleTurnCountRef.current,
      });
    }
  };

  // Player Guard Action
  const handlePlayerGuard = async () => {
    if (!isPlayerTurn || isBusy || !playerTrainer || !opponentTrainer) return;
    const pActive = playerTrainer.team[playerTrainer.activeIdx];
    if (!pActive || pActive.isFainted) return;

    setIsBusy(true);
    pActive.isGuarding = true;
    pActive.energy = Math.min(100, (pActive.energy || 0) + 15);
    setPlayerTrainer({ ...playerTrainer });

    setBattleLogs((prev) => [
      ...prev,
      {
        id: `guard_p_${Date.now()}`,
        text: `🛡️ ${pActive.name} assumed a defensive Guard stance! (+15 Energy, halves damage, recovers 40% faster)`,
        type: "guard",
      },
    ]);

    await new Promise((r) => setTimeout(r, 200));
    setIsOneMoreActive(false);

    // Guard recovers 40% faster (0.6x AV delay)
    const adv = advanceTimeline(actionTimeline, 0.6);
    if (!adv) {
      setIsBusy(false);
      return;
    }

    setActionTimeline(adv.updatedTimeline);
    const nextUnit = adv.updatedTimeline[0];

    playerTrainerRef.current = { ...playerTrainer };
    opponentTrainerRef.current = { ...opponentTrainer };

    if (nextUnit.isPlayer) {
      playerTrainer.activeIdx = nextUnit.teamIndex;
      playerTrainerRef.current.activeIdx = nextUnit.teamIndex;
      setPlayerTrainer({ ...playerTrainer });
      setIsPlayerTurn(true);
      setIsBusy(false);
    } else {
      opponentTrainer.activeIdx = nextUnit.teamIndex;
      opponentTrainerRef.current.activeIdx = nextUnit.teamIndex;
      setOpponentTrainer({ ...opponentTrainer });
      setIsPlayerTurn(false);
      setIsBusy(true);
      if (!isRealtimeMatch) {
        setTimeout(() => triggerAiTurn(false, adv.updatedTimeline), 260);
      }
    }

    if (isRealtimeMatch) {
      realtimeManagerRef.current?.sendAction({
        type: "guard",
        nextTurnUserId: nextUnit.isPlayer ? playerTrainer.id : opponentTrainer.id,
        senderId: playerTrainer.id,
        senderTrainer: { ...playerTrainer },
        timeline: adv.updatedTimeline,
        turnCount: battleTurnCountRef.current,
      });
    }
  };

  // Trigger Ultimate Interrupt (Honkai: Star Rail Style)
  const handleTriggerUltimateInterrupt = (slotIndex: number) => {
    if (!playerTrainer || isBusy) return;
    const activeIndices = playerTrainer.activeIndices ?? [0, 1, 2].slice(0, playerTrainer.team.length);
    const teamIdx = activeIndices[slotIndex];
    if (teamIdx === undefined) return;
    const unit = playerTrainer.team[teamIdx];
    if (!unit || unit.isFainted || unit.energy < 100) return;

    soundEngine.playTabSwitch();
    const updated = insertUltimateInterrupt(actionTimeline, playerTrainer, teamIdx, slotIndex, true);
    setActionTimeline(updated);
    playerTrainer.activeIdx = teamIdx;
    setPlayerTrainer({ ...playerTrainer });
    setIsPlayerTurn(true);
    setIsBusy(false);

    setBattleLogs((prev) => [
      ...prev,
      {
        id: `burst_interrupt_${Date.now()}`,
        text: `⚡ ULTIMATE INTERRUPT! ${unit.name} seized immediate turn order to cast Liberation!`,
        type: "liberation",
      },
    ]);

    if (isRealtimeMatch) {
      realtimeManagerRef.current?.sendAction({
        type: "ultimate_interrupt",
        slotIndex,
        teamIndex: teamIdx,
        senderId: playerTrainer.id,
        senderTrainer: { ...playerTrainer },
        timeline: updated,
      });
    }
  };

  // Deploy Bench Unit to Downed Frontline Slot
  const handleSelectBenchSubstitute = (benchIdx: number) => {
    if (!playerTrainer || faintedSlotIndex === null) return;
    const unit = playerTrainer.team[benchIdx];
    if (!unit || unit.isFainted || unit.hp <= 0) return;

    soundEngine.playTabSwitch();

    // Preserve the downed unit's action value so player team doesn't lose turn pacing
    const faintedAv = actionTimeline.find(
      (e) => e.isPlayer && e.slotIndex === faintedSlotIndex
    )?.actionValue;

    deployReserveResonator(playerTrainer, faintedSlotIndex, benchIdx);
    const updated = addUnitToTimeline(actionTimeline, playerTrainer, benchIdx, faintedSlotIndex, true, faintedAv);
    setActionTimeline(updated);

    // Ensure playerTrainer.activeIdx is pointing to a living unit
    const pCurrentActive = playerTrainer.team[playerTrainer.activeIdx];
    if (!pCurrentActive || pCurrentActive.isFainted || pCurrentActive.hp <= 0) {
      playerTrainer.activeIdx = benchIdx;
    }
    playerTrainerRef.current = { ...playerTrainer };
    setPlayerTrainer({ ...playerTrainer });

    setBattleLogs((prev) => [
      ...prev,
      {
        id: `deploy_sub_${Date.now()}`,
        text: `🔄 Reinforcements! ${unit.name} deployed to Frontline Slot ${faintedSlotIndex + 1}!`,
        type: "switch",
      },
    ]);

    if (isRealtimeMatch) {
      realtimeManagerRef.current?.sendAction({
        type: "bench_substitute",
        slotIndex: faintedSlotIndex,
        benchIndex: benchIdx,
        senderId: playerTrainer.id,
        senderTrainer: { ...playerTrainer },
        timeline: updated,
      });
    }

    // Check if another active slot is still fainted and living bench units remain
    const nextFaintedSlot = (playerTrainer.activeIndices || []).findIndex(
      (idx) => playerTrainer.team[idx]?.isFainted || (playerTrainer.team[idx]?.hp ?? 0) <= 0
    );
    const hasMoreBench = playerTrainer.team.some(
      (u, idx) => !playerTrainer.activeIndices?.includes(idx) && !u.isFainted && u.hp > 0
    );

    if (nextFaintedSlot !== -1 && hasMoreBench) {
      // Prompt replacement for next fainted slot immediately
      setFaintedSlotIndex(nextFaintedSlot);
      setIsFaintReplaceModalOpen(true);
      return;
    }

    setIsFaintReplaceModalOpen(false);
    setFaintedSlotIndex(null);

    if (updated.length > 0) {
      const nextUnit = updated[0];
      if (nextUnit.isPlayer) {
        playerTrainer.activeIdx = nextUnit.teamIndex;
        playerTrainerRef.current.activeIdx = nextUnit.teamIndex;
        setPlayerTrainer({ ...playerTrainer });
        setIsPlayerTurn(true);
        setIsBusy(false);
      } else {
        if (opponentTrainer) {
          opponentTrainer.activeIdx = nextUnit.teamIndex;
          opponentTrainerRef.current = { ...opponentTrainer };
          opponentTrainerRef.current.activeIdx = nextUnit.teamIndex;
          setOpponentTrainer({ ...opponentTrainer });
        }
        setIsPlayerTurn(false);
        setIsBusy(true);
        if (!isRealtimeMatch) {
          setTimeout(() => triggerAiTurn(false, updated), 500);
        }
      }
    }
  };

  // AI Turn Execution (3v3 Simultaneous Combat)
  const triggerAiTurn = async (isAiOneMore: boolean = false, currentTimeline?: TimelineEntry[]) => {
    setIsBusy(true);
    await new Promise((r) => setTimeout(r, 400));

    const pTrainer = playerTrainerRef.current || playerTrainer;
    const oTrainer = opponentTrainerRef.current || opponentTrainer;
    if (!pTrainer || !oTrainer) {
      setIsBusy(false);
      return;
    }
    const timeline = currentTimeline || actionTimeline;
    if (!timeline.length) {
      setIsBusy(false);
      return;
    }

    // Auto-reinforce any downed opponent frontline slots before taking turn
    const preDeploy = autoDeployOpponentReserves(oTrainer, timeline);
    let activeTimeline = preDeploy.updatedTimeline;
    if (preDeploy.deployedLogs.length > 0) {
      setBattleLogs((prev) => [
        ...prev,
        ...preDeploy.deployedLogs.map((text) => ({
          id: `bench_ai_start_${Date.now()}_${Math.random()}`,
          text,
          type: "switch" as const,
        })),
      ]);
      setOpponentTrainer({ ...preDeploy.updatedTrainer });
      opponentTrainerRef.current = { ...preDeploy.updatedTrainer };
    }

    if (isTeamWiped(preDeploy.updatedTrainer)) {
      setIsBusy(true);
      setStageEndBanner("VICTORY");
      setTimeout(() => {
        setStageEndBanner(null);
        handleBattleEnd("player");
      }, 1800);
      return;
    }

    const currentOActive = oTrainer.team[oTrainer.activeIdx];
    if (!currentOActive || currentOActive.isFainted) {
      const firstAliveIdx = (oTrainer.activeIndices || [0, 1, 2]).find(
        (i) => !oTrainer.team[i]?.isFainted && (oTrainer.team[i]?.hp ?? 0) > 0
      );
      if (firstAliveIdx === undefined) {
        setIsBusy(true);
        setStageEndBanner("VICTORY");
        setTimeout(() => {
          setStageEndBanner(null);
          handleBattleEnd("player");
        }, 1800);
        return;
      }
      oTrainer.activeIdx = firstAliveIdx;
    }

    const oActive = oTrainer.team[oTrainer.activeIdx];
    if (!oActive || oActive.isFainted) {
      setIsBusy(false);
      return;
    }

    // Process AI Turn Start Statuses
    if (!isAiOneMore) {
      const statusRes = processTurnStartStatus(oActive);
      if (statusRes.logs.length > 0) {
        setBattleLogs((prev) => [
          ...prev,
          ...statusRes.logs.map((text) => ({
            id: `stat_o_${Date.now()}_${Math.random()}`,
            text,
            type: "status" as const,
          })),
        ]);
      }

      if (statusRes.fainted) {
        setOpponentAnim("faint");
        await new Promise((r) => setTimeout(r, 600));
        let updatedTimeline = removeUnitFromTimeline(activeTimeline, false, oTrainer.activeIdx);

        // Opponent bench replacement
        const faintDeploy = autoDeployOpponentReserves(oTrainer, updatedTimeline);
        updatedTimeline = faintDeploy.updatedTimeline;
        setOpponentTrainer({ ...faintDeploy.updatedTrainer });
        opponentTrainerRef.current = { ...faintDeploy.updatedTrainer };

        if (faintDeploy.deployedLogs.length > 0) {
          setBattleLogs((prev) => [
            ...prev,
            ...faintDeploy.deployedLogs.map((text) => ({
              id: `bench_ai_faint_${Date.now()}_${Math.random()}`,
              text,
              type: "switch" as const,
            })),
          ]);
        }

        if (isTeamWiped(faintDeploy.updatedTrainer)) {
          setIsBusy(true);
          setStageEndBanner("VICTORY");
          setTimeout(() => {
            setStageEndBanner(null);
            handleBattleEnd("player");
          }, 1800);
          return;
        }

        const adv = advanceTimeline(updatedTimeline);
        if (adv) {
          setActionTimeline(adv.updatedTimeline);
          if (adv.updatedTimeline[0]?.isPlayer) {
            pTrainer.activeIdx = adv.updatedTimeline[0].teamIndex;
            playerTrainerRef.current = { ...pTrainer };
            setPlayerTrainer({ ...pTrainer });
            setIsPlayerTurn(true);
            setIsBusy(false);
          } else {
            oTrainer.activeIdx = adv.updatedTimeline[0].teamIndex;
            opponentTrainerRef.current = { ...oTrainer };
            setOpponentTrainer({ ...oTrainer });
            setTimeout(() => triggerAiTurn(false, adv.updatedTimeline), 500);
          }
        }
        return;
      }

      if (statusRes.skipTurn) {
        await new Promise((r) => setTimeout(r, 400));
        const adv = advanceTimeline(timeline);
        if (adv) {
          setActionTimeline(adv.updatedTimeline);
          if (adv.updatedTimeline[0]?.isPlayer) {
            pTrainer.activeIdx = adv.updatedTimeline[0].teamIndex;
            playerTrainerRef.current = { ...pTrainer };
            setPlayerTrainer({ ...pTrainer });
            setIsPlayerTurn(true);
            setIsBusy(false);
          } else {
            oTrainer.activeIdx = adv.updatedTimeline[0].teamIndex;
            opponentTrainerRef.current = { ...oTrainer };
            setOpponentTrainer({ ...oTrainer });
            setTimeout(() => triggerAiTurn(false, adv.updatedTimeline), 500);
          }
        }
        return;
      }
    }

    // Choose AI move: Prefer Liberation if ready, else skill/forte/basic
    const availableMoves = oActive.moves.filter((m) => {
      if (m.category === "liberation") return oActive.energy >= 100;
      return (oActive.moveCooldowns?.[m.id] || 0) === 0;
    });
    const chosenMove = availableMoves.find((m) => m.category === "liberation") ||
      availableMoves.find((m) => m.category === "forte") ||
      availableMoves.find((m) => m.category === "skill") ||
      availableMoves[0] ||
      oActive.moves[0];

    // Choose target slot: Pick a living player frontline unit
    const pActiveIndices = pTrainer.activeIndices ?? [0, 1, 2].slice(0, pTrainer.team.length);
    const alivePlayerSlots = pActiveIndices
      .map((idx, slotIdx) => ({ idx, slotIdx }))
      .filter(({ idx }) => !pTrainer.team[idx]?.isFainted && (pTrainer.team[idx]?.hp ?? 0) > 0);

    if (alivePlayerSlots.length === 0) {
      setIsBusy(true);
      setStageEndBanner("DEFEAT");
      setTimeout(() => {
        setStageEndBanner(null);
        handleBattleEnd("opponent");
      }, 1800);
      return;
    }

    const targetSlotObj = alivePlayerSlots[Math.floor(Math.random() * alivePlayerSlots.length)];
    const targetSlot = targetSlotObj ? targetSlotObj.slotIdx : 0;
    const aiSlot = oTrainer.activeIndices?.indexOf(oTrainer.activeIdx) ?? 0;

    // Trigger Liberation Cinematic Cut-In and audio activation for AI
    if (chosenMove.category === "liberation") {
      soundEngine.playLiberationActivation(chosenMove.element);
      setLiberationCutIn({
        resonator: oActive,
        move: chosenMove,
        isPlayer: false,
      });
      await new Promise((r) => setTimeout(r, 800));
      setLiberationCutIn(null);
    }

    const scope = chosenMove.targetScope || "single";
    const isOffensive = !scope.startsWith("ally") && scope !== "self";

    // 1. Physical Approach (Dash-In) for AI offensive moves
    if (isOffensive) {
      const delta = getDashDelta(false, aiSlot, targetSlot);
      setActiveAttack({
        attacker: "opponent",
        attackerSlot: aiSlot,
        targetSlot,
        delta,
        move: chosenMove,
        phase: "approach",
      });
      soundEngine.playSlashWhoosh(chosenMove.element);
      await new Promise((r) => setTimeout(r, 190));
    } else {
      setOpponentAnim("attack");
    }

    setBattleLogs((prev) => [
      ...prev,
      {
        id: `ai_move_${Date.now()}`,
        text: `Foe ${oActive.name} used ${chosenMove.name}!`,
        type: chosenMove.category === "liberation" ? "liberation" : "info",
      },
    ]);

    const isBossFight = currentGymChallenge !== null || (currentTowerFloor !== null && currentTowerFloor.isBossFloor);
    const multiResult = execute3v3Action(
      oActive,
      oTrainer.activeIdx,
      aiSlot,
      chosenMove,
      false,
      pTrainer,
      oTrainer,
      targetSlot,
      {
        isBossFight,
        isOneMoreTurn: isAiOneMore,
      }
    );

    if (multiResult.logs && multiResult.logs.length > 0) {
      setBattleLogs((prev) => [
        ...prev,
        ...multiResult.logs.map((text) => ({
          id: `ai_log_${Date.now()}_${Math.random()}`,
          text,
          type: "info" as const,
        })),
      ]);
    }

    if (multiResult.results && multiResult.results.length > 0) {
      const primaryRes = multiResult.results[0];
      const isCrit = !!primaryRes.damageResult.isCrit;
      const isLiberation = chosenMove.category === "liberation";
      const isSuper = primaryRes.damageResult.typeEffectiveness === "super";

      if (isOffensive) {
        const delta = getDashDelta(false, aiSlot, targetSlot);
        setActiveAttack({
          attacker: "opponent",
          attackerSlot: aiSlot,
          targetSlot,
          delta,
          move: chosenMove,
          phase: "strike",
        });

        const affectedSlots =
          scope === "single"
            ? [targetSlot]
            : scope === "blast"
            ? [targetSlot, targetSlot - 1, targetSlot + 1].filter((s) => s >= 0 && s <= 2)
            : [0, 1, 2];

        setActiveSlash({
          target: "player",
          slotIndices: affectedSlots,
          element: chosenMove.element,
          category: chosenMove.category,
          isCrit,
          isSuper,
        });
      }

      if (primaryRes.damageResult.damage > 0) {
        setPlayerAnim("hit");
        setFloatingText({
          target: "player",
          slotIdx: primaryRes.defenderSlot,
          text: `-${primaryRes.damageResult.damage}${isCrit ? " CRIT!" : ""}`,
          isCrit: isCrit,
        });

        soundEngine.playHitPunch({ isCrit, isHeavy: isLiberation });
        soundEngine.playElementalHit(chosenMove.element, isSuper);
        triggerScreenShake(isLiberation ? 360 : isCrit ? 250 : 150);
      } else if (primaryRes.damageResult.missed || primaryRes.damageResult.dodged) {
        const isDodge = primaryRes.damageResult.dodged;
        const targetDefender = pTrainer.team[primaryRes.defenderTeamIndex];
        setPlayerAnim("idle");
        setFloatingText({
          target: "player",
          slotIdx: primaryRes.defenderSlot,
          text: isDodge ? "DODGED!" : "MISSED!",
        });
        soundEngine.playMissWhoosh();
        setBattleLogs((prev) => [
          ...prev,
          {
            id: `ai_miss_${Date.now()}`,
            text: isDodge
              ? `💨 Your ${targetDefender?.name || "Resonator"} agilely dodged Foe ${oActive.name}'s attack!`
              : `❌ Foe ${oActive.name}'s ${chosenMove.name} missed Your ${targetDefender?.name || "Resonator"}!`,
            type: "info",
          },
        ]);
      }

      // Allow strike and slash VFX to play out
      await new Promise((r) => setTimeout(r, 240));

      // Dash-Back to formation slot
      if (isOffensive) {
        const delta = getDashDelta(false, aiSlot, targetSlot);
        setActiveAttack({
          attacker: "opponent",
          attackerSlot: aiSlot,
          targetSlot,
          delta,
          move: chosenMove,
          phase: "return",
        });
        setActiveSlash(null);
        await new Promise((r) => setTimeout(r, 180));
        setActiveAttack(null);
      } else {
        setOpponentAnim("idle");
      }

      setTimeout(() => {
        setPlayerAnim("idle");
        setFloatingText(null);
      }, 500);
    }

    // 5B. AI Friendly / Support Ally Effects
    if (multiResult.allyEffects && multiResult.allyEffects.length > 0) {
      let anyHealed = false;
      for (const eff of multiResult.allyEffects) {
        if (eff.healAmount > 0) {
          anyHealed = true;
          triggerHealingPop("opponent", eff.allySlot, eff.healAmount);
        }
      }
      if (anyHealed) {
        soundEngine.playHealChime();
      }
      await new Promise((r) => setTimeout(r, 380));
      setOpponentAnim("idle");
    }

    // Check Resonator Grit audio stinger
    if (multiResult.logs && multiResult.logs.some((l) => l.includes("Resonator Grit"))) {
      soundEngine.playResonatorGrit();
    }

    playerTrainerRef.current = { ...pTrainer };
    setPlayerTrainer({ ...pTrainer });
    opponentTrainerRef.current = { ...oTrainer };
    setOpponentTrainer({ ...oTrainer });

    let updatedTimeline = [...timeline];
    let playerNeedsBenchReplace = false;
    let faintSlotToReplace: number | null = null;

    for (const r of multiResult.results) {
      if (r.damageResult.defenderFainted) {
        const faintedUnit = pTrainer.team[r.defenderTeamIndex];
        setBattleLogs((prev) => [
          ...prev,
          {
            id: `faint_p_${Date.now()}_${r.defenderTeamIndex}`,
            text: `💔 ${faintedUnit?.name || "Resonator"} fell in battle!`,
            type: "faint",
          },
        ]);

        updatedTimeline = removeUnitFromTimeline(updatedTimeline, true, r.defenderTeamIndex);

        // Check if player has bench units
        const hasAliveBench = pTrainer.team.some(
          (u, idx) => !pTrainer.activeIndices?.includes(idx) && !u.isFainted && u.hp > 0
        );
        if (hasAliveBench) {
          playerNeedsBenchReplace = true;
          faintSlotToReplace = r.defenderSlot;
        }
      }
    }

    if (isTeamWiped(pTrainer)) {
      setActionTimeline([]);
      setIsBusy(true);
      setStageEndBanner("DEFEAT");
      setTimeout(() => {
        setStageEndBanner(null);
        handleBattleEnd("opponent");
      }, 1800);
      return;
    }

    if (playerNeedsBenchReplace && faintSlotToReplace !== null) {
      // Advance timeline for the AI so its turn is consumed and placed in the queue
      const adv = advanceTimeline(updatedTimeline);
      const postTimeline = adv ? adv.updatedTimeline : updatedTimeline;
      setActionTimeline(postTimeline);

      setFaintedSlotIndex(faintSlotToReplace);
      setIsFaintReplaceModalOpen(true);
      setIsBusy(false);
      return;
    }

    // 1 MORE! Check
    const triggeredOneMore = multiResult.results.some((r) => r.damageResult.triggeredOneMore);
    if (triggeredOneMore) {
      soundEngine.playOneMoreStinger();
      setOneMoreBanner("opponent");
      setBattleLogs((prev) => [
        ...prev,
        {
          id: `ai_onemore_${Date.now()}`,
          text: `1 MORE! Foe ${oActive.name} earned an extra action!`,
          type: "one_more",
        },
      ]);
      await new Promise((r) => setTimeout(r, 800));
      setOneMoreBanner(null);
      triggerAiTurn(true, updatedTimeline);
      return;
    }

    // Advance timeline
    const adv = advanceTimeline(updatedTimeline);
    if (!adv) {
      setIsBusy(false);
      return;
    }

    setActionTimeline(adv.updatedTimeline);
    const nextUnit = adv.updatedTimeline[0];

    if (nextUnit.isPlayer) {
      pTrainer.activeIdx = nextUnit.teamIndex;
      playerTrainerRef.current = { ...pTrainer };
      setPlayerTrainer({ ...pTrainer });
      setIsPlayerTurn(true);
      setIsBusy(false);
    } else {
      oTrainer.activeIdx = nextUnit.teamIndex;
      opponentTrainerRef.current = { ...oTrainer };
      setOpponentTrainer({ ...oTrainer });
      setIsPlayerTurn(false);
      setTimeout(() => triggerAiTurn(false, adv.updatedTimeline), 260);
    }
  };

  // Start Player Turn (Processes DoTs, Recover from Down, Skip checks)
  const startPlayerTurn = () => {
    const currentP = playerTrainerRef.current;
    if (!currentP) return;

    // Decrement player switch cooldown on each of your active turns
    setPlayerSwitchCooldown((prev) => Math.max(0, prev - 1));

    // Ensure activeIdx points to a living frontline resonator
    const curUnit = currentP.team[currentP.activeIdx];
    if (!curUnit || curUnit.isFainted || curUnit.hp <= 0) {
      const livingIdx = (currentP.activeIndices || []).find(
        (idx) => !currentP.team[idx]?.isFainted && (currentP.team[idx]?.hp ?? 0) > 0
      );
      if (livingIdx !== undefined) {
        currentP.activeIdx = livingIdx;
      }
    }

    const pActive = currentP.team[currentP.activeIdx];
    if (pActive && !pActive.isFainted) {
      const statusRes = processTurnStartStatus(pActive);
      if (statusRes.logs.length > 0) {
        setBattleLogs((prev) => [
          ...prev,
          ...statusRes.logs.map((text) => ({ id: `stat_p_${Date.now()}_${Math.random()}`, text, type: "status" as const })),
        ]);
      }

      if (statusRes.fainted) {
        setPlayerSwitchCooldown(0);
        const hasAlive = currentP.team.some((r) => !r.isFainted);
        if (!hasAlive) {
          handleBattleEnd("opponent");
          return;
        }
        const slot = currentP.activeIndices?.indexOf(currentP.activeIdx) ?? 0;
        setFaintedSlotIndex(slot);
        setIsFaintReplaceModalOpen(true);
        setIsBusy(false);
        setIsPlayerTurn(false);
        return;
      } else if (statusRes.skipTurn) {
        const adv = advanceTimeline(actionTimeline);
        if (adv) {
          setActionTimeline(adv.updatedTimeline);
          if (adv.updatedTimeline[0]?.isPlayer) {
            if (playerTrainer) {
              playerTrainer.activeIdx = adv.updatedTimeline[0].teamIndex;
            }
            setIsPlayerTurn(true);
            setIsBusy(false);
          } else {
            if (opponentTrainer) {
              opponentTrainer.activeIdx = adv.updatedTimeline[0].teamIndex;
            }
            setIsPlayerTurn(false);
            setIsBusy(true);
            setTimeout(() => triggerAiTurn(false, adv.updatedTimeline), 500);
          }
        }
        return;
      }
    }

    setPlayerTrainer({ ...currentP });
    setIsBusy(false);
    setIsPlayerTurn(true);
  };

  // Player Manual Switch (Consumes Turn + 2-Turn Cooldown)
  const handlePlayerSwitch = async (targetIdx: number) => {
    if (!playerTrainer || !opponentTrainer || !isPlayerTurn || isBusy) return;
    if (targetIdx === playerTrainer.activeIdx) return;
    if (playerTrainer.team[targetIdx].isFainted) return;
    if (playerSwitchCooldown > 0) return;

    setIsSwitchMenuOpen(false);
    setIsBusy(true);

    const oldName = playerTrainer.team[playerTrainer.activeIdx].name;
    const targetRes = playerTrainer.team[targetIdx];
    setBattleLogs((prev) => [
      ...prev,
      {
        id: `switch_p_${Date.now()}`,
        text: `🔄 ${oldName} switched out! Go, ${targetRes.name}! (Turn consumed; switch locked for 2 turns)`,
        type: "switch",
      },
    ]);

    const activeSlot = playerTrainer.activeIndices?.indexOf(playerTrainer.activeIdx) ?? 0;
    deployReserveResonator(playerTrainer, activeSlot, targetIdx);
    playerTrainer.activeIdx = targetIdx;
    setPlayerTrainer({ ...playerTrainer });
    playerTrainerRef.current = { ...playerTrainer };
    setPlayerSwitchCooldown(2);

    let updatedTimeline = removeUnitFromTimeline(actionTimeline, true, playerTrainer.activeIdx);
    updatedTimeline = addUnitToTimeline(updatedTimeline, playerTrainer, targetIdx, activeSlot, true);

    await new Promise((r) => setTimeout(r, 100));

    setIsOneMoreActive(false);
    const adv = advanceTimeline(updatedTimeline);
    if (adv) {
      setActionTimeline(adv.updatedTimeline);
      if (adv.updatedTimeline[0]?.isPlayer) {
        playerTrainer.activeIdx = adv.updatedTimeline[0].teamIndex;
        setIsPlayerTurn(true);
        setIsBusy(false);
      } else {
        opponentTrainer.activeIdx = adv.updatedTimeline[0].teamIndex;
        setIsPlayerTurn(false);
        setIsBusy(true);
        if (!isRealtimeMatch) {
          setTimeout(() => triggerAiTurn(false, adv.updatedTimeline), 500);
        }
      }
    }
  };

  // Handle Battle End
  const handleBattleEnd = (winner: "player" | "opponent") => {
    if (battleWinner) return;
    clearPendingPvpNotice(currentUserId);
    setBattleWinner(winner);
    setScreen("result");
    const won = winner === "player";
    const isEarlyForfeit = isRealtimeMatch && won && battleTurnCountRef.current < 3;
    setIsEarlyForfeitMatch(isEarlyForfeit);

    if (isRealtimeMatch) {
      if (!isEarlyForfeit) {
        const p = playerTrainerRef.current || playerTrainer;
        const o = opponentTrainerRef.current || opponentTrainer;
        const updated = recordBattleResult(won, currentUserId, p?.team, o?.team);
        setPvpStats(updated);
        setBattlePointsDelta({ delta: updated.pointsDelta, isUnderdog: updated.isUnderdog });
      } else {
        setBattlePointsDelta({ delta: 0, isUnderdog: false });
        setBattleLogs((prev) => [
          ...prev,
          {
            id: `early_notice_${Date.now()}`,
            text: `⚠️ Match ended early (< 3 turns played). No BP or Win Streak awarded to prevent win-trading.`,
            type: "info",
          },
        ]);
      }
    } else if (!currentGymChallenge && !currentTowerFloor) {
      // Offline / async PvP search challenge against another player's team!
      const p = playerTrainerRef.current || playerTrainer;
      const o = opponentTrainerRef.current || opponentTrainer;
      const updated = recordBattleResult(won, currentUserId, p?.team, o?.team);
      setPvpStats(updated);
      setBattlePointsDelta({ delta: updated.pointsDelta, isUnderdog: updated.isUnderdog });
    } else {
      setBattlePointsDelta(null);
    }

    if (currentGymChallenge) {
      if (won) {
        const stageInfo =
          GYM_STAGES.find((s) => s.level === currentGymChallenge.stageLevel) ||
          GYM_STAGES[0];
        // Always award Combat EXP for gym wins (even in practice mode)
        addCombatExp(stageInfo.exp, currentUserId);
        setCombatExp(getCombatExp(currentUserId));

        // Check if claimed today (GMT+8)
        const alreadyClaimed = isGymBossClaimedToday(
          currentGymChallenge.boss.charId,
          currentUserId
        );
        if (!alreadyClaimed) {
          // Award Astrite bounty for this stage
          if (onAstriteReward) {
            onAstriteReward(stageInfo.bounty);
          } else if (onAstriteChange) {
            onAstriteChange(stageInfo.bounty);
          }
          // Record claim for today so any stage of this boss cannot yield bounty until 00:00 GMT+8
          recordGymBossClaim(currentGymChallenge.boss.charId, currentUserId);
        }
      }
      return;
    }

    if (currentTowerFloor) {
      if (won) {
        // Update persistent party HP from current battle
        const updatedHpMap = { ...towerRunState.partyHpMap };
        playerTrainer?.team.forEach((r) => {
          updatedHpMap[r.id] = r.hp;
        });

        // Award floor Astrite & Combat EXP
        if (onAstriteReward) {
          onAstriteReward(currentTowerFloor.astriteReward);
        } else if (onAstriteChange) {
          onAstriteChange(currentTowerFloor.astriteReward);
        }
        addCombatExp(currentTowerFloor.combatExpReward, currentUserId);
        setCombatExp(getCombatExp(currentUserId));

        const nextHighest = Math.max(towerRunState.highestFloorCleared, currentTowerFloor.floor);
        const bestAllTime = Math.max(towerRunState.allTimeRecordFloor || 0, nextHighest);
        const nextFloor = currentTowerFloor.floor + 1;
        const lockedIds = towerRunState.lockedPartyIds || playerTrainer?.team.map((r) => r.id) || [];
        const isWiped = lockedIds.length > 0 && lockedIds.every((id) => (updatedHpMap[id] ?? 0) <= 0);

        const updatedRun: TowerRunState = {
          ...towerRunState,
          highestFloorCleared: nextHighest,
          allTimeRecordFloor: bestAllTime,
          currentFloor: nextFloor,
          partyHpMap: updatedHpMap,
          isCompleted: false,
          isWipedOut: isWiped,
        };
        saveTowerRunState(updatedRun, currentUserId);
        setTowerRunState(updatedRun);

        // Advance tower page block if we reached the next 5-floor bracket
        const newPage = Math.floor((nextFloor - 1) / 5);
        setTowerPageBlock(newPage);

        // Generate 3 blessing drafts on every cleared floor
        const hasFainted = lockedIds.some((id) => (updatedHpMap[id] ?? 0) <= 0);
        const drafts = generateBlessingDraft(
          updatedRun.activeBlessings.map((b: TowerBlessing) => b.id),
          3,
          {
            clearedFloor: currentTowerFloor.floor,
            hasFaintedResonators: hasFainted,
          }
        );
        if (drafts.length > 0) {
          setDraftOptions(drafts);
          setIsDraftingBlessing(true);
        }
      } else {
        // Lost in tower: save current party HP and check wipeout
        const updatedHpMap = { ...towerRunState.partyHpMap };
        playerTrainer?.team.forEach((r) => {
          updatedHpMap[r.id] = r.hp;
        });
        const lockedIds = towerRunState.lockedPartyIds || playerTrainer?.team.map((r) => r.id) || [];
        const isWiped = lockedIds.length > 0 && lockedIds.every((id) => (updatedHpMap[id] ?? 0) <= 0);

        if (isWiped) {
          const fresh = resetTowerRunState(currentUserId);
          setTowerRunState(fresh);
          setTowerPageBlock(0);
          setTowerToast("Squad wiped out! Tower run has been automatically reset to Floor 1.");
          setTimeout(() => setTowerToast(null), 3500);
        } else {
          const updatedRun: TowerRunState = {
            ...towerRunState,
            partyHpMap: updatedHpMap,
            isWipedOut: false,
          };
          saveTowerRunState(updatedRun, currentUserId);
          setTowerRunState(updatedRun);
        }
      }
      return;
    }

    // Only real 1v1 matches with bets give bet pot (Tower, Gym & AI battles are bet-free)
    const isAiMatch = !isRealtimeMatch || opponentTrainer?.isAi;
    const effectiveBet = (isAiMatch || currentTowerFloor || currentGymChallenge) ? 0 : selectedBet;

    if (effectiveBet > 0 && isRealtimeMatch) {
      if (won) {
        if (isEarlyForfeit) {
          // Early forfeit refund: refund player's own upfront bet (Net gain = 0)
          if (onAstriteChange) {
            onAstriteChange(effectiveBet);
          } else if (onAstriteReward) {
            onAstriteReward(effectiveBet);
          }
          setBattleLogs((prev) => [
            ...prev,
            {
              id: `early_refund_${Date.now()}`,
              text: `⚠️ Early forfeit detected (< 3 turns played). Your ${effectiveBet} Astrite bet has been refunded. Exploit pot minting blocked.`,
              type: "info",
            },
          ]);
        } else {
          // Legitimate victory: Winner takes the full pot (2x bet)
          const pot = effectiveBet * 2;
          if (onAstriteChange) {
            onAstriteChange(pot);
          } else if (onAstriteReward) {
            onAstriteReward(pot);
          }
        }
      }
      // If lost, bet was already deducted upfront
    } else if (isRealtimeMatch && !isAiMatch) {
      // Casual match victory reward: +160 Astrite (1 Free Pull), unlimited matches!
      if (won) {
        if (isEarlyForfeit) {
          setBattleLogs((prev) => [
            ...prev,
            {
              id: `early_casual_${Date.now()}`,
              text: `⚠️ Match ended early (< 3 turns played). Casual Astrite victory reward withheld.`,
              type: "info",
            },
          ]);
        } else {
          recordDailyPvpCasualWin(currentUserId);
          if (onAstriteReward) {
            onAstriteReward(160);
          } else if (onAstriteChange) {
            onAstriteChange(160);
          }
        }
      }
    }
  };

  const handleAttemptClose = () => {
    if (screen === "battle") {
      setShowExitConfirm(true);
    } else if (screen === "room_prep") {
      handleLeaveRoomPrep();
    } else {
      setSelectedBet(0);
      setIsRealtimeMatch(false);
      realtimeManagerRef.current?.leaveRoom();
      closeAllSubModals();
      clearPlayerSearch();
      onClose();
    }
  };

  if (!isOpen) return null;

  const currentPActive = playerTrainer?.team[playerTrainer.activeIdx];
  const currentOActive = opponentTrainer?.team[opponentTrainer.activeIdx];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/95 select-none"
      style={{ backgroundColor: "#000000" }}
    >
      <div className="relative w-full max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[96dvh] bg-[#090d16] border-0 sm:border border-white/15 rounded-none sm:rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col">
        {/* Header HUD */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 border-b border-white/10 bg-[#06080e] sticky top-0 z-40 flex-shrink-0 pt-[max(0.625rem,env(safe-area-inset-top))] sm:pt-3">
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Top-Left Back Button to Games Menu or Previous Layer */}
            <button
              onClick={() => {
                if (isPartyPickerOpen) {
                  setIsPartyPickerOpen(false);
                } else if (isGymPrepOpen) {
                  setIsGymPrepOpen(false);
                } else if (isTowerPrepOpen) {
                  setIsTowerPrepOpen(false);
                } else if (isPlayerChallengePrepOpen) {
                  setIsPlayerChallengePrepOpen(false);
                } else if (isPvPGuideOpen) {
                  setIsPvPGuideOpen(false);
                } else if (screen === "room_prep") {
                  handleLeaveRoomPrep();
                } else if (screen === "battle") {
                  handleAttemptClose();
                } else if (onBackToGames) {
                  setSelectedBet(0);
                  setIsRealtimeMatch(false);
                  realtimeManagerRef.current?.leaveRoom();
                  closeAllSubModals();
                  clearPlayerSearch();
                  onBackToGames();
                } else {
                  setSelectedBet(0);
                  setIsRealtimeMatch(false);
                  realtimeManagerRef.current?.leaveRoom();
                  closeAllSubModals();
                  clearPlayerSearch();
                  handleAttemptClose();
                }
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all border border-white/10 hover:border-white/20 active:scale-95 cursor-pointer group"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 group-hover:-translate-x-0.5 transition-transform" />
            </button>

            <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

            <div className="p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
              {screen === "battle" ? (
                <Swords className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : lobbyTab === "gym" ? (
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
              ) : lobbyTab === "tower" ? (
                <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
              ) : lobbyTab === "live" ? (
                <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
              ) : (
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />
              )}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white font-display flex items-center space-x-2">
                <span>
                  {screen === "battle"
                    ? "Battle in Progress"
                    : screen === "room_prep"
                    ? "1v1 Match Preparation"
                    : screen === "result"
                    ? "Battle Results"
                    : lobbyTab === "gym"
                    ? "Gym Trials"
                    : lobbyTab === "tower"
                    ? "Tower of Adversity"
                    : lobbyTab === "live"
                    ? "Live 1v1 Arena"
                    : "Player Challenge"}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                soundEngine.playClick();
                setIsPvPGuideOpen(true);
              }}
              className="h-[38px] sm:h-[40px] px-3 sm:px-3.5 rounded-xl bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-300 hover:text-yellow-200 transition-all border border-yellow-400/30 flex items-center space-x-1.5 text-xs font-mono font-bold shadow-sm hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
              title="PvP Battle Guide"
            >
              <Sparkles className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-yellow-400" />
              <span className="hidden sm:inline">PvP Guide</span>
              <span className="sm:hidden">Guide</span>
            </button>

            <button
              onClick={handleAttemptClose}
              className="group h-[38px] sm:h-[40px] w-[38px] sm:w-[40px] rounded-xl bg-white/10 hover:bg-rose-500/25 text-gray-300 hover:text-white transition-all border border-white/15 hover:border-rose-400/50 hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center shadow-sm flex-shrink-0"
              title="Close Arena"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] text-gray-300 group-hover:text-white group-hover:rotate-90 transition-transform duration-200" />
            </button>
          </div>
        </div>

        {/* Opponent Reconnecting Banner (Grace Period Active) */}
        {isOpponentReconnecting && (
          <div className="w-full bg-amber-500/20 border-b border-amber-500/40 text-amber-300 px-4 py-2 text-xs sm:text-sm font-medium flex items-center justify-center space-x-2 animate-pulse">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Opponent is reconnecting (waiting for network / tab focus)... Match will not forfeit immediately.</span>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col min-h-0">
          {/* ========================================================================= */}
          {/* 1. ARENA LOBBY SCREEN */}
          {/* ========================================================================= */}
          {screen === "lobby" && (
            <div className="space-y-4">
              {/* Tab 1: Gym Leaders & Resonator Bosses */}
              {(lobbyTab === "gym" || (lobbyTab as any) === "npcs") && (
                  <div className="space-y-3">
                    {/* Gym Header Strip: Combat EXP & 00:00 GMT+8 Countdown */}
                    <div className="p-3 rounded-xl bg-[#0d1322] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-yellow-400/15 border border-yellow-400/30 text-yellow-300 text-xs font-mono font-bold">
                          <Zap className="w-3.5 h-3.5 text-yellow-400" />
                          <span>Combat EXP: {combatExp}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 text-xs font-mono">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          <span>00:00 GMT+8 Reset: {timeUntilReset}</span>
                        </div>
                      </div>

                      {/* Element Filter Chips */}
                      <div className="flex items-center space-x-1 overflow-x-auto max-w-full pb-0.5">
                        {["all", "Glacio", "Fusion", "Electro", "Aero", "Havoc", "Spectro"].map((elem) => (
                          <button
                            key={elem}
                            onClick={() => setGymElementFilter(elem)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase transition-all ${
                              gymElementFilter.toLowerCase() === elem.toLowerCase()
                                ? "bg-yellow-400 text-black shadow-sm"
                                : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 border border-white/5"
                            }`}
                          >
                            {elem}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Resonator Bosses Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[420px] overflow-y-auto overscroll-contain pr-1">
                      {filteredGymBosses.map((boss) => {
                        const isClaimed = isGymBossClaimedToday(boss.charId, currentUserId);
                        const elemColor = ELEMENT_COLORS[boss.element] || {
                          bg: "bg-gray-500/20",
                          text: "text-gray-300",
                          border: "border-gray-500/30",
                        };

                        return (
                          <div
                            key={boss.id}
                            className="p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex items-center justify-between group"
                          >
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/20 bg-black/50 flex-shrink-0 relative">
                                <img
                                  src={`/assets/inventory_portraits/${getPortraitFileName(boss.charId)}`}
                                  alt={boss.name}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src =
                                      SPRITE_MAP[boss.charId] ||
                                      `/assets/characters/${boss.charId}_portrait.png`;
                                  }}
                                />
                              </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                    <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                                      {boss.name}
                                    </h4>
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${elemColor.bg} ${elemColor.text} ${elemColor.border}`}
                                    >
                                      {boss.element}
                                    </span>
                                  </div>
                                  <p className="text-[10px] font-mono text-gray-400 mt-0.5 truncate">
                                    {boss.title}
                                  </p>
                                  <div className="mt-1">
                                    {isClaimed ? (
                                      <span className="inline-flex items-center space-x-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-gray-500/15 text-gray-300 border border-gray-500/30">
                                        <RotateCcw className="w-2.5 h-2.5" />
                                        <span>Practice Mode (Bounty Claimed)</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center space-x-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-400/15 text-yellow-300 border border-amber-400/40">
                                        <Sparkles className="w-2.5 h-2.5" />
                                        <span>Daily Bounty Ready (100 - 480 ✦)</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedGymBoss(boss);
                                  setIsGymPrepOpen(true);
                                }}
                                className="ml-2 px-3 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center space-x-1 flex-shrink-0"
                              >
                                <span>Challenge</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tab: Tower of Adversity */}
                {lobbyTab === "tower" && (
                  <div className="space-y-3">
                    {/* Tower Header: Progress & Reset Controls */}
                    <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-purple-950/40 via-[#0d1322] to-indigo-950/40 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Crown className="w-5 h-5 text-amber-400" />
                          <h3 className="text-sm sm:text-base font-bold text-white font-display">
                            Tower of Adversity
                          </h3>
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold">
                            Endless Gauntlet
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-gray-300">
                          Persistent Party HP carries between floors. Draft tactical blessings after each victory to conquer infinite floors!
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-auto flex-shrink-0 flex-wrap gap-y-1">
                        <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-purple-500/30 font-mono text-xs text-purple-300 font-bold flex items-center space-x-1.5">
                          <Swords className="w-3.5 h-3.5 text-purple-400" />
                          <span>Active Run: Floor {towerRunState.currentFloor || 1}</span>
                        </div>

                        {(towerRunState.allTimeRecordFloor || 0) > 0 && (
                          <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 font-mono text-xs text-amber-300 font-bold flex items-center space-x-1.5">
                            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                            <span>Record: Floor {towerRunState.allTimeRecordFloor}</span>
                          </div>
                        )}

                        <button
                          onClick={handleResetTowerRun}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 hover:text-rose-100 border border-rose-500/30 hover:border-rose-500/50 text-xs font-mono font-bold uppercase transition-all flex items-center space-x-1.5 shadow-sm"
                          title="Reset Run (Restart at Floor 1, restore full party HP, and unlock squad)"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Run</span>
                        </button>
                      </div>
                    </div>

                    {/* Tower Toast Alert */}
                    <AnimatePresence>
                      {towerToast && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.98 }}
                          className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 text-xs font-mono font-bold flex items-center justify-between shadow-lg"
                        >
                          <div className="flex items-center space-x-2">
                            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse flex-shrink-0" />
                            <span>{towerToast}</span>
                          </div>
                          <button
                            onClick={() => setTowerToast(null)}
                            className="text-emerald-400 hover:text-white ml-2"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Party Persistent HP Status Rack */}
                    <div className="p-3 rounded-xl bg-[#0b101c] border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-300 flex items-center space-x-1.5">
                          {towerRunState.lockedPartyIds && towerRunState.lockedPartyIds.length > 0 ? (
                            <>
                              <Lock className="w-3.5 h-3.5 text-purple-400" />
                              <span className="text-purple-300">Locked Squad ({towerRunState.lockedPartyIds.length}/6)</span>
                            </>
                          ) : (
                            <>
                              <Users className="w-3.5 h-3.5 text-yellow-400" />
                              <span>Tower Party Status (Persistent HP)</span>
                            </>
                          )}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400">
                          Fainted Resonators remain down unless revived
                        </span>
                      </div>

                      {towerRunState.isWipedOut && (
                        <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/50 flex items-center justify-between text-xs font-mono text-rose-300">
                          <div className="flex items-center space-x-2">
                            <Skull className="w-4 h-4 text-rose-400 flex-shrink-0" />
                            <span><strong>SQUAD WIPED OUT:</strong> All 6 Resonators have fainted. Reset run to climb again.</span>
                          </div>
                          <button
                            onClick={handleResetTowerRun}
                            className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] uppercase transition-all shadow"
                          >
                            Reset
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                        {((towerRunState.lockedPartyIds && towerRunState.lockedPartyIds.length > 0)
                          ? towerRunState.lockedPartyIds
                          : selectedPartyIds
                        ).map((charId) => {
                          const sprite = SPRITE_MAP[charId] || `/assets/characters/${charId}_portrait.png`;
                          const lvl = getResonatorLevel(charId, currentUserId);
                          const maxHp = 1000 + lvl * 35;
                          const currentHp = towerRunState.partyHpMap[charId] !== undefined ? towerRunState.partyHpMap[charId] : maxHp;
                          const isFainted = currentHp <= 0;
                          const hpPct = Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100)));

                          return (
                            <div
                              key={charId}
                              className={`p-2 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all ${
                                isFainted
                                  ? "bg-rose-950/20 border-rose-500/40 opacity-60"
                                  : "bg-black/40 border-white/10"
                              }`}
                            >
                              <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 relative">
                                <img
                                  src={sprite}
                                  alt={charId}
                                  className="w-full h-full object-contain"
                                  style={{ imageRendering: "pixelated" }}
                                />
                                {isFainted && (
                                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                    <Skull className="w-3.5 h-3.5 text-rose-400" />
                                  </div>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-gray-200 capitalize truncate max-w-full text-center">
                                {charId.replace(/_/g, " ")}
                              </span>
                              <div className="w-full space-y-0.5">
                                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                  <div
                                    style={{ width: `${hpPct}%` }}
                                    className={`h-full rounded-full transition-all ${
                                      hpPct > 50 ? "bg-emerald-400" : hpPct > 20 ? "bg-yellow-400" : "bg-rose-500"
                                    }`}
                                  />
                                </div>
                                <span className={`text-[8px] font-mono block text-center ${isFainted ? "text-rose-400 font-bold" : "text-gray-400"}`}>
                                  {isFainted ? "FAINTED" : `${currentHp}/${maxHp}`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {Array.from({
                          length: Math.max(
                            0,
                            6 -
                              ((towerRunState.lockedPartyIds && towerRunState.lockedPartyIds.length > 0)
                                ? towerRunState.lockedPartyIds
                                : selectedPartyIds
                              ).length
                          ),
                        }).map((_, idx) => {
                          const isLocked = Boolean(towerRunState.lockedPartyIds && towerRunState.lockedPartyIds.length > 0);
                          return (
                            <button
                              key={`lobby-empty-${idx}`}
                              type="button"
                              disabled={isLocked}
                              onClick={() => {
                                if (!isLocked) {
                                  setIsPartyPickerOpen(true);
                                }
                              }}
                              className={`p-2 rounded-xl border border-dashed flex flex-col items-center justify-center space-y-1.5 min-h-[90px] transition-all ${
                                isLocked
                                  ? "border-white/10 bg-white/[0.01] opacity-30 cursor-not-allowed"
                                  : "border-purple-500/30 bg-purple-500/5 hover:border-purple-400 hover:bg-purple-500/15 cursor-pointer active:scale-95 group"
                              }`}
                            >
                              <div className="w-8 h-8 rounded-lg border border-dashed border-white/20 flex items-center justify-center text-white/40 group-hover:text-purple-300 group-hover:border-purple-400/50 bg-black/20 transition-colors">
                                <Plus className="w-4 h-4" />
                              </div>
                              <span className="text-[10px] font-mono text-white/40 group-hover:text-purple-200 transition-colors">
                                + Add
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Active Blessings Rack */}
                    <div className="p-3 rounded-xl bg-[#0b101c] border border-purple-500/20 space-y-2">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-purple-200">
                          Drafted Tactical Blessings ({towerRunState.activeBlessings.length})
                        </span>
                      </div>

                      {towerRunState.activeBlessings.length === 0 ? (
                        <p className="text-[11px] font-mono text-gray-500 italic py-1">
                          No blessings collected yet. Defeat floors to draft 3 tactical buffs after each stage!
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {towerRunState.activeBlessings.map((bless: TowerBlessing, i: number) => (
                            <div
                              key={bless.id + i}
                              className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center space-x-1.5 ${
                                bless.rarity === "mythic"
                                  ? "bg-rose-600/20 border-rose-400/60 text-rose-300"
                                  : bless.rarity === "legendary"
                                  ? "bg-amber-500/15 border-amber-400/50 text-yellow-300"
                                  : bless.rarity === "epic"
                                  ? "bg-purple-500/15 border-purple-400/50 text-purple-300"
                                  : "bg-cyan-500/15 border-cyan-400/50 text-cyan-300"
                              }`}
                              title={bless.description}
                            >
                              <span className="font-bold">{bless.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 5-Floor Ladder Header & Pagination Controls */}
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center space-x-2">
                        <Layers className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-200">
                          Floors {towerPageBlock * 5 + 1} – {towerPageBlock * 5 + 5}
                        </span>
                        {towerRunState.highestFloorCleared > 0 && (
                          <span className="text-[10px] font-mono text-gray-400">
                            (Best Cleared: Floor {towerRunState.highestFloorCleared})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 font-mono text-xs">
                        <button
                          type="button"
                          disabled={towerPageBlock === 0}
                          onClick={() => setTowerPageBlock((prev) => Math.max(0, prev - 1))}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 text-gray-300 flex items-center space-x-1 transition-all cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Prev 5</span>
                        </button>
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[11px] font-bold border border-purple-500/30">
                          Page {towerPageBlock + 1}
                        </span>
                        <button
                          type="button"
                          disabled={
                            Math.max(
                              towerRunState.currentFloor || 1,
                              towerRunState.allTimeRecordFloor || 0
                            ) <= (towerPageBlock + 1) * 5
                          }
                          onClick={() => setTowerPageBlock((prev) => prev + 1)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 text-gray-300 flex items-center space-x-1 transition-all cursor-pointer"
                          title={
                            Math.max(
                              towerRunState.currentFloor || 1,
                              towerRunState.allTimeRecordFloor || 0
                            ) <= (towerPageBlock + 1) * 5
                              ? `Clear Floor ${(towerPageBlock + 1) * 5} to unlock next 5 floors`
                              : "View next 5 floors"
                          }
                        >
                          <span>Next 5</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* 5-Floor Ladder */}
                    <div className="space-y-2 pb-6">
                      {paginatedTowerFloors.map((floor) => {
                        const activeRunFloor = towerRunState.currentFloor || 1;
                        const isCleared = floor.floor < activeRunFloor;
                        const isCurrent = floor.floor === activeRunFloor;
                        const isUnlocked = floor.floor <= activeRunFloor;
                        const isApex = floor.isBossFloor;

                        return (
                          <div
                            key={floor.floor}
                            className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                              isCurrent
                                ? isApex
                                  ? "bg-amber-950/30 border-amber-400/60 shadow-[0_0_15px_rgba(251,191,36,0.2)] ring-1 ring-amber-400/50"
                                  : "bg-purple-950/30 border-purple-400/60 shadow-[0_0_15px_rgba(168,85,247,0.2)] ring-1 ring-purple-400/40"
                                : isCleared
                                ? "bg-emerald-950/15 border-emerald-500/30"
                                : "bg-black/30 border-white/5 opacity-40"
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/20 bg-black/60 flex-shrink-0 flex items-center justify-center relative">
                                <img
                                  src={`/assets/inventory_portraits/${getPortraitFileName(floor.bossCharId)}`}
                                  alt={floor.name}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src =
                                      SPRITE_MAP[floor.bossCharId] ||
                                      `/assets/characters/${floor.bossCharId}_portrait.png`;
                                  }}
                                />
                                {isApex && (
                                  <span className="absolute top-0 right-0 px-1 py-0.2 bg-red-600 text-[8px] font-mono font-bold text-white uppercase rounded-bl">
                                    BOSS
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center space-x-2 flex-wrap">
                                  <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                                    {floor.name}
                                  </h4>
                                  <span className="text-[10px] font-mono text-purple-300 font-bold">
                                    Lv. {floor.recommendedLevel}
                                  </span>
                                  {floor.dodgeRate && floor.dodgeRate > 0 ? (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[8px] font-mono font-bold">
                                      +{Math.round(floor.dodgeRate * 100)}% DODGE
                                    </span>
                                  ) : null}
                                  {isCurrent && (
                                    <span className="px-1.5 py-0.2 rounded bg-purple-500/25 text-purple-200 border border-purple-400/50 text-[8px] font-mono font-bold animate-pulse">
                                      ACTIVE CHALLENGE
                                    </span>
                                  )}
                                  {isCleared && (
                                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[8px] font-mono font-bold">
                                      CLEARED
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] font-mono text-gray-400 mt-0.5 truncate">
                                  {floor.subtitle} • {floor.enemyTeamIds.length} Enemies
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-3 self-end sm:self-auto flex-shrink-0">
                              <div className="text-right font-mono text-[10px]">
                                <div className="text-amber-300 font-bold flex items-center justify-end space-x-1">
                                  <AstriteIcon className="w-3 h-3 inline" />
                                  <span>+{floor.astriteReward}</span>
                                </div>
                                <div className="text-emerald-400">+{floor.combatExpReward} EXP</div>
                              </div>

                              <button
                                disabled={!isUnlocked}
                                onClick={() => {
                                  setSelectedTowerFloor(floor);
                                  setIsTowerPrepOpen(true);
                                }}
                                className={`px-4 py-2 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center space-x-1.5 ${
                                  !isUnlocked
                                    ? "bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed"
                                    : isCleared
                                    ? "bg-white/10 hover:bg-white/20 text-gray-200 border border-white/20"
                                    : isApex
                                    ? "bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                                    : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                                }`}
                              >
                                {isCleared ? (
                                  <>
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Replay</span>
                                  </>
                                ) : (
                                  <>
                                    <Swords className="w-3.5 h-3.5" />
                                    <span>Challenge</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tab 2: Live 1v1 Room Challenge */}
                {lobbyTab === "live" && (
                  <div className="space-y-4">
                    {/* Tournament Standard Banner */}
                    <div className="p-2.5 rounded-xl bg-gradient-to-r from-yellow-500/15 via-amber-500/10 to-yellow-500/15 border border-yellow-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 shadow-sm">
                      <div className="flex items-center space-x-2">
                        <Crown className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                        <span className="text-xs font-mono font-bold text-yellow-300">
                          TOURNAMENT STANDARD: ALL RESONATORS FIXED AT LEVEL 100
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400">
                        Sequence (S0–S6) bonuses active
                      </span>
                    </div>
                    {isWaitingForChallenger ? (
                      /* Waiting Screen for Host */
                      <div className="p-5 rounded-2xl bg-gradient-to-b from-emerald-950/30 to-black/60 border border-emerald-500/40 text-center space-y-4 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                        <div className="flex justify-center">
                          <div className="relative">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 animate-pulse">
                              <Radio className="w-8 h-8" />
                            </div>
                            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-sm font-black font-display uppercase tracking-wider text-white">
                            Room Active: Waiting for Challenger
                          </h4>
                          <p className="text-xs font-mono text-gray-400">
                            Share this code with your friend to start a real-time battle!
                          </p>
                        </div>

                        {/* Room Code Box */}
                        <div className="flex items-center justify-center space-x-2">
                          <div className="px-5 py-2.5 rounded-xl bg-black/70 border-2 border-emerald-400/80 font-mono text-2xl font-black text-emerald-300 tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                            {roomCode}
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(roomCode);
                              setCopiedCode(true);
                              setTimeout(() => setCopiedCode(false), 2000);
                            }}
                            className="p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-gray-300 hover:text-white transition-all flex items-center space-x-1 text-xs font-mono font-bold uppercase"
                            title="Copy Code"
                          >
                            {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            <span>{copiedCode ? "Copied" : "Copy"}</span>
                          </button>
                        </div>

                        {/* Match Stakes Info */}
                        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-xs font-mono text-yellow-300">
                          <AstriteIcon className="w-3.5 h-3.5" />
                          <span>
                            {selectedBet > 0
                              ? `Stakes: ${selectedBet} Bet (${selectedBet * 2} Pot)`
                              : "Casual Friendly Match"}
                          </span>
                        </div>

                        <div>
                          <button
                            onClick={() => {
                              realtimeManagerRef.current?.leaveRoom();
                              setIsWaitingForChallenger(false);
                            }}
                            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-rose-500/20 text-gray-400 hover:text-rose-300 font-mono text-xs uppercase font-bold transition-all border border-white/10"
                          >
                            Cancel Room
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Astrite Stakes / Bet Selector (Live 1v1 Only) */}
                        <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-amber-950/25 via-yellow-950/15 to-transparent border border-yellow-500/30">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <AstriteIcon className="w-4 h-4" />
                              <span className="text-xs sm:text-sm font-bold font-mono text-yellow-300 uppercase tracking-wider">
                                Live Match Stakes &amp; Bet (Winner Takes Pot)
                              </span>
                            </div>
                            <div className="flex items-center space-x-1.5 text-xs font-mono bg-black/40 px-2.5 py-1 rounded-lg border border-white/10">
                              <span className="text-gray-400">Balance:</span>
                              <span className="text-yellow-400 font-bold">{userAstrite.toLocaleString()}</span>
                              <AstriteIcon className="w-3.5 h-3.5 inline" />
                            </div>
                          </div>

                          {isGuestPlayer && (
                            <div className="flex items-center space-x-2 text-[11px] font-mono text-amber-300 bg-amber-950/40 border border-amber-500/30 px-3 py-2 rounded-xl mb-3">
                              <span className="text-sm">🔒</span>
                              <span>
                                Guest mode active. Astrite stakes require an authenticated account to prevent economy exploits. Guests can play Casual matches!
                              </span>
                            </div>
                          )}

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              {
                                amount: 0,
                                label: "Casual",
                                sub: "Free (Unlimited Matches)",
                                locked: false,
                              },
                              {
                                amount: 160,
                                label: "1 Pull",
                                sub: isGuestPlayer ? "Sign In to Bet" : "320 Pot (160 Bet)",
                                locked: isGuestPlayer,
                              },
                              {
                                amount: 800,
                                label: "5 Pulls",
                                sub: isGuestPlayer ? "Sign In to Bet" : "1,600 Pot (800 Bet)",
                                locked: isGuestPlayer,
                              },
                              {
                                amount: 1600,
                                label: "10 Pulls",
                                sub: isGuestPlayer ? "Sign In to Bet" : "3,200 Pot (1,600 Bet)",
                                locked: isGuestPlayer,
                              },
                            ].map((bet) => {
                              const isSelected = selectedBet === bet.amount;
                              const canAfford = !bet.locked && (bet.amount === 0 || userAstrite >= bet.amount);

                              return (
                                <button
                                  key={bet.amount}
                                  type="button"
                                  disabled={!canAfford}
                                  onClick={() => setSelectedBet(bet.amount)}
                                  className={`p-2.5 rounded-xl border text-left transition-all relative ${
                                    isSelected
                                      ? "bg-yellow-400/20 border-yellow-400 text-white ring-1 ring-yellow-400/50 shadow-[0_0_12px_rgba(250,204,21,0.2)]"
                                      : canAfford
                                      ? "bg-white/[0.03] border-white/10 hover:border-white/20 text-gray-300 hover:bg-white/[0.06]"
                                      : "bg-white/[0.01] border-white/5 text-gray-600 cursor-not-allowed opacity-50"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-mono font-bold flex items-center space-x-1">
                                      <span>{bet.label}</span>
                                      {bet.locked && <span className="text-[10px]">🔒</span>}
                                    </span>
                                    {bet.amount > 0 && <AstriteIcon className="w-3.5 h-3.5" />}
                                  </div>
                                  <div className="text-[10px] font-mono mt-0.5 text-gray-400">
                                    {bet.locked
                                      ? "Registered Only"
                                      : canAfford
                                      ? bet.sub
                                      : "Need More Astrite"}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Dual Host / Join Panels */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          {/* Panel 1: Host a Room */}
                          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col justify-between space-y-3">
                            <div className="space-y-1.5">
                              <div className="flex items-center space-x-2 text-emerald-400">
                                <Radio className="w-4 h-4" />
                                <span className="text-xs font-mono font-bold uppercase tracking-wider">
                                  Host a Match
                                </span>
                              </div>
                              <p className="text-xs font-mono text-gray-400">
                                Generate a room code and wait for an opponent to challenge your 6-resonator team.
                              </p>
                            </div>

                            <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-xs font-mono text-gray-300 space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Selected Stakes:</span>
                                <span className="text-yellow-400 font-bold">
                                  {selectedBet > 0 ? `${selectedBet} Bet (${selectedBet * 2} Pot)` : "Casual (Free)"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Battle Style:</span>
                                <span className="text-emerald-400 font-bold">Real-time (Deluge)</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleHostRoom}
                              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center space-x-1.5"
                            >
                              <Radio className="w-3.5 h-3.5" />
                              <span>Create Room Code</span>
                            </button>
                          </div>

                          {/* Panel 2: Join a Room */}
                          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex flex-col justify-between space-y-3">
                            <div className="space-y-1.5">
                              <div className="flex items-center space-x-2 text-rose-400">
                                <Swords className="w-4 h-4" />
                                <span className="text-xs font-mono font-bold uppercase tracking-wider">
                                  Join a Room
                                </span>
                              </div>
                              <p className="text-xs font-mono text-gray-400">
                                Enter a room code shared by a friend to jump straight into combat.
                              </p>
                            </div>

                            <div className="space-y-2">
                              <input
                                type="text"
                                value={joinCodeInput}
                                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                                placeholder="Enter Room Code (e.g. W-742)..."
                                maxLength={8}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-sm font-mono text-center font-bold tracking-widest text-emerald-300 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                              />

                              {roomError && (
                                <p className="text-[11px] font-mono text-rose-400 text-center">
                                  {roomError}
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={handleJoinRoom}
                              disabled={!joinCodeInput.trim() || isConnectingRoom}
                              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 disabled:opacity-40 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center space-x-1.5"
                            >
                              <Swords className="w-3.5 h-3.5" />
                              <span>{isConnectingRoom ? "Connecting..." : "Enter & Battle"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: Search Player & Challenge */}
                {lobbyTab === "search" && (
                  <div className="space-y-3">
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSearchQuery(val);
                            if (!val.trim()) {
                              setPlayerSearchResults([]);
                              setHasSearchedPlayers(false);
                              setSearchError(null);
                            }
                          }}
                          onKeyDown={(e) => e.key === "Enter" && executeSearch(searchQuery)}
                          placeholder="Search players by username (e.g. kurtpaolo)..."
                          className="w-full pl-10 pr-9 py-2 rounded-xl bg-black/50 border border-white/15 text-xs sm:text-sm font-mono text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={clearPlayerSearch}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white transition-colors"
                            title="Clear search"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => executeSearch(searchQuery)}
                        disabled={isSearching || !searchQuery.trim()}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-1.5"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>{isSearching ? "Searching..." : "Search"}</span>
                      </button>
                    </div>

                    {searchError && (
                      <p className="text-xs font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2">
                        {searchError}
                      </p>
                    )}

                    {/* Results List */}
                    {hasSearchedPlayers && playerSearchResults.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto overscroll-contain pr-1">
                        {playerSearchResults.map((player) => {
                          const isSelf = player.username.toLowerCase() === (currentUsername || "").toLowerCase();

                          return (
                            <div
                              key={player.id}
                              className="p-3 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex items-center justify-between group"
                            >
                              <div className="flex items-center space-x-3 min-w-0 flex-1">
                                <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/20 bg-black/50 flex-shrink-0">
                                  <img
                                    src={`/assets/inventory_portraits/${getPortraitFileName(player.avatar_id)}`}
                                    alt={player.username}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center space-x-1.5 flex-wrap">
                                    <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                                      @{player.username}
                                    </h4>
                                    {player.is_vip && (
                                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-yellow-300 text-[8px] font-mono font-bold border border-yellow-400/30">
                                        VIP
                                      </span>
                                    )}
                                    {isSelf && (
                                      <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[8px] font-mono font-bold">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] font-mono text-rose-300 truncate mt-0.5">
                                    {player.custom_title || "Resonator Champion"}
                                  </p>
                                </div>
                              </div>

                              <button
                                disabled={isSelf}
                                onClick={() => handleChallengePlayer(player)}
                                className="ml-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center space-x-1 flex-shrink-0"
                              >
                                <Swords className="w-3.5 h-3.5" />
                                <span>Challenge</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {!hasSearchedPlayers && (
                      <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                        <Search className="w-8 h-8 text-gray-500 mx-auto mb-2 opacity-60" />
                        <p className="text-xs font-mono text-gray-300">
                          Search for any registered player to challenge their showcase team!
                        </p>
                        <p className="text-[10px] font-mono text-gray-500 mt-1">
                          All player challenges are normalized to Tournament Standard Level 100.
                        </p>
                      </div>
                    )}
                  </div>
                )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 1.5 PRE-BATTLE MATCH ROOM (PREPARATION PHASE) */}
          {/* ========================================================================= */}
          {screen === "room_prep" && playerTrainer && opponentTrainer && (
            <div className="flex-1 flex flex-col justify-between space-y-4">
              {/* Room Prep Header */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0d1527] via-[#090d16] to-[#0d1527] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono uppercase tracking-wider text-gray-400 font-bold">Room Code:</span>
                      <span className="text-sm sm:text-base font-mono font-black text-emerald-300 tracking-widest bg-black/50 px-2 py-0.5 rounded border border-emerald-500/40">
                        {roomCode || joinCodeInput}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                      Match Preparation Phase. Customize your team and lock in when ready!
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-yellow-400/10 border border-yellow-400/25 text-xs font-mono text-yellow-300 font-bold">
                    <AstriteIcon className="w-3.5 h-3.5" />
                    <span>{selectedBet > 0 ? `${selectedBet * 2} Pot (${selectedBet} Bet)` : "Casual Match"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLeaveRoomPrep}
                    className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-mono text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                    title="Leave room and return to lobby"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Leave Room</span>
                  </button>
                </div>
              </div>

              {/* Dual Team Matchup Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
                {/* Left: Your Team */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/20 bg-black/40">
                        <img
                          src={`/assets/inventory_portraits/${getPortraitFileName(playerTrainer.avatarId)}`}
                          alt={playerTrainer.username}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-white flex items-center space-x-1.5">
                          <span>{playerTrainer.username} (You)</span>
                          {isHosting && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold">HOST</span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-gray-400">6-Resonator Party</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setIsPartyPickerOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-yellow-400/15 hover:bg-yellow-400/25 border border-yellow-400/40 text-yellow-300 text-[10px] sm:text-xs font-mono font-bold uppercase transition-all"
                      >
                        <span className="hidden sm:inline">Edit Team</span>
                        <span className="sm:hidden">Team</span>
                      </button>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-mono font-bold uppercase border ${
                        isMyReady
                          ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                          : "bg-amber-500/20 border-amber-400/40 text-amber-300"
                      }`}>
                        {isMyReady ? "READY" : "EDITING..."}
                      </span>
                    </div>
                  </div>

                  {/* 6-Resonator Slots */}
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    {playerTrainer.team.map((res, idx) => {
                      const sprite = SPRITE_MAP[res.id] || `/assets/characters/${res.id}_portrait.png`;
                      return (
                        <div
                          key={res.id + idx}
                          className="p-2 rounded-xl bg-black/40 border border-white/10 flex items-center space-x-2 relative overflow-hidden"
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/15 bg-black/60 flex-shrink-0">
                            <img
                              src={sprite}
                              alt={res.name}
                              className="w-full h-full object-contain"
                              style={{ imageRendering: "pixelated" }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white truncate">{res.name}</p>
                            <p className={`text-[9px] font-mono ${ELEMENT_COLORS[res.element]?.text || "text-gray-300"}`}>
                              {res.element}
                            </p>
                          </div>
                          <span className="absolute top-1 right-1.5 text-[8px] font-mono text-gray-500 font-bold">
                            #{idx + 1}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Ready Button */}
                  <button
                    disabled={!playerTrainer || playerTrainer.team.length === 0}
                    onClick={handleToggleReady}
                    className={`w-full py-3 rounded-xl font-mono font-bold text-xs sm:text-sm uppercase tracking-wider transition-all shadow-lg flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                      isMyReady
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
                        : "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black"
                    }`}
                  >
                    {isMyReady ? <Check className="w-4 h-4" /> : <Swords className="w-4 h-4" />}
                    <span>{isMyReady ? "LOCKED IN (READY)" : "CLICK TO READY UP"}</span>
                  </button>
                </div>

                {/* Right: Opponent Team */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl overflow-hidden border border-rose-500/30 bg-black/40">
                        <img
                          src={`/assets/inventory_portraits/${getPortraitFileName(opponentTrainer.avatarId)}`}
                          alt={opponentTrainer.username}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-white flex items-center space-x-1.5">
                          <span>{opponentTrainer.username}</span>
                          {!isHosting && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold">HOST</span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-gray-400">Opponent Party</span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-mono font-bold uppercase border ${
                      isOpponentReady
                        ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                        : "bg-amber-500/20 border-amber-400/40 text-amber-300 animate-pulse"
                    }`}>
                      {isOpponentReady ? "READY" : "EDITING..."}
                    </span>
                  </div>

                  {/* Opponent 6-Resonator Slots (Concealed Blind Pick) */}
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-black/40 border border-white/10 flex items-center space-x-2 relative overflow-hidden"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-emerald-500/30 bg-emerald-950/20 flex-shrink-0 flex items-center justify-center text-emerald-400 font-mono font-bold text-base shadow-inner">
                          ?
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-300 truncate">Classified Resonator</p>
                          <p className="text-[9px] font-mono text-emerald-400/80">
                            Pick Concealed
                          </p>
                        </div>
                        <span className="absolute top-1 right-1.5 text-[8px] font-mono text-gray-600 font-bold">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="py-3 px-4 rounded-xl bg-black/40 border border-white/10 text-center">
                    <p className="text-xs font-mono text-gray-400">
                      {isOpponentReady
                        ? "Opponent is ready! Combat begins when you lock in."
                        : "Waiting for opponent to finish editing team..."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. THE DELUGE RPG BATTLE STAGE */}
          {/* ========================================================================= */}
          {/* ========================================================================= */}
          {/* 2. THE HONKAI STAR RAIL + DELUGE 3v3 BATTLE STAGE */}
          {/* ========================================================================= */}
          {screen === "battle" && playerTrainer && opponentTrainer && (
            <div className="flex-1 flex flex-col justify-between space-y-2 sm:space-y-3 min-h-[500px]">
              {/* Battle Arena Visual Field (Honkai: Star Rail 2.5D Perspective Battlefield) */}
              <motion.div
                animate={
                  isScreenShaking
                    ? {
                        x: [0, -6, 6, -4, 4, -2, 0],
                        y: [0, 4, -4, 3, -2, 1, 0],
                        rotate: [0, -0.4, 0.4, -0.2, 0],
                      }
                    : { x: 0, y: 0, rotate: 0 }
                }
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="relative flex-1 rounded-2xl bg-gradient-to-b from-[#090e1c] via-[#050811] to-[#020306] border border-white/10 overflow-hidden flex flex-col justify-between p-2 sm:p-3 shadow-2xl min-h-[460px] sm:min-h-[540px]"
              >
                {/* 1. Atmospheric Lighting & Beams */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_70%_25%,rgba(99,102,241,0.15),transparent_70%)] pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_25%_75%,rgba(20,184,166,0.12),transparent_70%)] pointer-events-none" />

                {/* 2. 2.5D Perspective Arena Stage Floor Plane */}
                <div className="absolute inset-x-0 bottom-14 top-16 pointer-events-none overflow-hidden [perspective:900px]">
                  <div className="w-full h-full [transform:rotateX(30deg)_scale(1.15)] origin-bottom flex items-center justify-center">
                    {/* Concentric Neon Sci-Fi Rings */}
                    <div className="absolute w-[460px] sm:w-[680px] h-[300px] sm:h-[440px] rounded-full border border-cyan-500/20 shadow-[0_0_50px_rgba(6,182,212,0.15)] bg-gradient-to-b from-cyan-950/10 to-transparent" />
                    <div className="absolute w-[340px] sm:w-[500px] h-[220px] sm:h-[320px] rounded-full border border-dashed border-amber-400/25" />
                    <div className="absolute w-[200px] sm:w-[320px] h-[130px] sm:h-[200px] rounded-full border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.15)]" />
                    {/* Perspective Tech Grid */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:2.5rem_2.5rem]" />
                  </div>
                </div>

                {/* 3. Action Timeline Queue */}
                {/* A. Desktop/Tablet Vertical Action Queue (Anchored to Left Edge like Honkai: Star Rail) */}
                <div className="hidden sm:flex absolute left-2.5 top-2.5 bottom-24 z-30 w-16 bg-[#070c17]/85 border border-cyan-500/25 rounded-xl p-1 backdrop-blur-md shadow-2xl flex-col items-center space-y-1 overflow-y-auto scrollbar-none pointer-events-auto">
                  <div className="text-[8px] font-mono font-bold text-cyan-300 uppercase tracking-wider py-0.5 flex flex-col items-center">
                    <Clock className="w-3 h-3 text-cyan-400 mb-0.5" />
                    <span>ORDER</span>
                  </div>
                  <div className="w-full h-[1px] bg-white/10" />
                  {actionTimeline.slice(0, 8).map((entry, idx) => {
                    const isTop = idx === 0;
                    const trainer = entry.isPlayer ? playerTrainer : opponentTrainer;
                    const unit = trainer?.team[entry.teamIndex];
                    if (!unit) return null;

                    return (
                      <div
                        key={`v_time_${entry.id}_${idx}`}
                        className={`flex flex-col items-center p-1 rounded-lg border w-full transition-all relative ${
                          isTop
                            ? entry.isPlayer
                              ? "bg-amber-500/25 border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.6)] ring-1 ring-yellow-300 scale-105"
                              : "bg-rose-600/30 border-rose-400 shadow-[0_0_14px_rgba(244,63,94,0.7)] ring-1 ring-rose-400 scale-105"
                            : entry.isInterrupt
                            ? "bg-rose-500/25 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-pulse"
                            : entry.isPlayer
                            ? "bg-cyan-950/40 border-cyan-500/30 text-cyan-200"
                            : "bg-rose-950/40 border-rose-500/30 text-rose-200"
                        }`}
                        title={`${unit.name} | AV: ${entry.actionValue}`}
                      >
                        <img
                          src={unit.spriteUrl}
                          alt={unit.name}
                          className="w-7 h-7 object-contain"
                          style={{ imageRendering: "pixelated" }}
                        />
                        <span className="text-[8px] font-mono font-bold truncate max-w-[50px] mt-0.5 text-center leading-none text-white">
                          {unit.name.split(" ")[0]}
                        </span>
                        <span
                          className={`text-[7px] font-mono font-bold px-1 rounded mt-0.5 ${
                            isTop
                              ? entry.isPlayer
                                ? "bg-yellow-400 text-black font-black"
                                : "bg-rose-600 text-white font-black border border-rose-300"
                              : entry.isInterrupt
                              ? "bg-rose-500 text-white"
                              : "text-gray-300 bg-white/5"
                          }`}
                        >
                          {isTop ? "ACT" : entry.isInterrupt ? "ULT" : entry.actionValue}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* B. Mobile Top Horizontal Timeline Bar */}
                <div className="flex sm:hidden relative z-20 w-full bg-[#070c17]/90 border border-cyan-500/25 rounded-lg px-2 py-1 items-center space-x-1.5 overflow-x-auto scrollbar-none">
                  <div className="flex items-center space-x-1 text-[9px] font-mono font-bold text-cyan-300 uppercase tracking-wider flex-shrink-0">
                    <Clock className="w-3 h-3 text-cyan-400" />
                  </div>
                  {actionTimeline.slice(0, 7).map((entry, idx) => {
                    const isTop = idx === 0;
                    const trainer = entry.isPlayer ? playerTrainer : opponentTrainer;
                    const unit = trainer?.team[entry.teamIndex];
                    if (!unit) return null;

                    return (
                      <div
                        key={`m_time_${entry.id}_${idx}`}
                        className={`flex-shrink-0 flex items-center space-x-1 px-1.5 py-0.5 rounded border text-[8px] font-mono ${
                          isTop
                            ? entry.isPlayer
                              ? "bg-amber-500/25 border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)]"
                              : "bg-rose-600/30 border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.7)]"
                            : entry.isInterrupt
                            ? "bg-rose-500/25 border-rose-400"
                            : entry.isPlayer
                            ? "bg-cyan-950/40 border-cyan-500/30 text-cyan-200"
                            : "bg-rose-950/40 border-rose-500/30 text-rose-200"
                        }`}
                      >
                        <img src={unit.spriteUrl} alt={unit.name} className="w-4 h-4 object-contain" />
                        <span className="truncate max-w-[40px] text-white">{unit.name.split(" ")[0]}</span>
                        <span className={`font-bold ${isTop ? (entry.isPlayer ? "text-yellow-300 font-black" : "text-rose-400 font-black") : "text-gray-300"}`}>
                          {isTop ? "ACT" : entry.actionValue}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Tactical Blessings Strip (Tower Mode) */}
                {lobbyTab === "tower" && towerRunState.activeBlessings && towerRunState.activeBlessings.length > 0 && (
                  <div className="relative z-10 mt-1 flex items-center space-x-1.5 bg-[#0a0f1d]/90 border border-purple-500/30 rounded-lg px-2 py-0.5 backdrop-blur-md shadow-lg max-w-fit sm:ml-20">
                    <Sparkles className="w-3 h-3 text-purple-400 flex-shrink-0" />
                    <span className="text-[9px] font-mono font-bold text-purple-200 hidden sm:inline">Blessings:</span>
                    <div className="flex items-center space-x-1">
                      {towerRunState.activeBlessings.map((bless: TowerBlessing, i: number) => (
                        <span
                          key={bless.id + i}
                          className="px-1.5 py-0.2 rounded text-[8px] font-mono border bg-purple-500/20 border-purple-400/50 text-purple-300"
                          title={bless.description}
                        >
                          {bless.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 1 MORE! Overlay Banner */}
                <AnimatePresence>
                  {oneMoreBanner && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                      <motion.div
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: [1.08, 1], opacity: 1 }}
                        exit={{ scale: 0.85, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-white font-black font-display text-sm sm:text-base uppercase tracking-widest shadow-[0_0_20px_rgba(239,68,68,0.7)] border border-yellow-300/80 flex items-center justify-center"
                      >
                        <span>1 MORE!</span>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* 4. THE 3v3 DIAGONAL BATTLEFIELD (NO BOXES!) */}
                <div className="relative flex-1 w-full h-full min-h-[280px] sm:min-h-[340px] md:min-h-[380px] flex flex-col justify-between pointer-events-auto pl-0 sm:pl-16 mt-2">
                  
                  {/* Dramatic In-Arena VICTORY / DEFEAT Banner */}
                  <AnimatePresence>
                    {stageEndBanner && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.6, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.15 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none bg-black/45 backdrop-brightness-75"
                      >
                        <div
                          className={`px-8 py-3 rounded-2xl border-2 shadow-2xl flex flex-col items-center space-y-1 ${
                            stageEndBanner === "VICTORY"
                              ? "bg-gradient-to-r from-yellow-500/95 via-amber-400/95 to-yellow-600/95 border-yellow-200 text-black shadow-[0_0_50px_rgba(250,204,21,0.9)]"
                              : "bg-gradient-to-r from-rose-800/95 via-red-600/95 to-rose-950/95 border-rose-300 text-white shadow-[0_0_40px_rgba(244,63,94,0.9)]"
                          }`}
                        >
                          <span className="font-display font-black text-2xl sm:text-4xl tracking-widest uppercase flex items-center space-x-2">
                            {stageEndBanner === "VICTORY" ? "✦ VICTORY ✦" : "💀 DEFEAT 💀"}
                          </span>
                          <span className="font-mono text-[9px] sm:text-xs font-bold tracking-wider opacity-90">
                            {stageEndBanner === "VICTORY" ? "ALL FOES SUBDUED" : "YOUR TEAM WAS WIPED OUT"}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* OPPONENT SIDE (Upper-Right Background Arc) */}
                  <div className="relative w-full flex justify-end pr-1 sm:pr-8 pt-1 sm:pt-2 z-20">
                    <div className="flex items-end justify-end space-x-3 sm:space-x-8 md:space-x-12">
                      {[0, 1, 2].map((slotIdx) => {
                        const oppIndices = opponentTrainer.activeIndices ?? [0, 1, 2].slice(0, opponentTrainer.team.length);
                        const teamIdx = oppIndices[slotIdx];
                        const oppRes = teamIdx !== undefined ? opponentTrainer.team[teamIdx] : undefined;
                        if (!oppRes) return null;

                        const isOppActing = !isPlayerTurn && opponentTrainer.activeIdx === teamIdx;
                        const isPlayerTargeting = isPlayerTurn && activeTargetType === "enemy";
                        const isSelectedTarget = isPlayerTargeting && selectedEnemySlot === slotIdx;
                        const isFainted = oppRes.isFainted || oppRes.hp <= 0;
                        const isDarkened = !isOppActing && ((isPlayerTargeting && !isSelectedTarget) || (!isPlayerTurn && !isOppActing)) && !isFainted;
                        const isAdjacentToSelected = isPlayerTargeting && !isSelectedTarget && Math.abs(slotIdx - selectedEnemySlot) === 1;
                        const isOppAttackDashing = activeAttack?.attacker === "opponent" && activeAttack.attackerSlot === slotIdx;

                        // Visual depth & targeting spotlight:
                        const depthTransform = isOppAttackDashing
                          ? "z-50"
                          : isOppActing
                          ? "translate-y-[-4px] sm:translate-y-[-8px] scale-110 sm:scale-120 z-40 filter brightness-115 drop-shadow-[0_0_24px_rgba(244,63,94,0.9)]"
                          : isSelectedTarget
                          ? "scale-105 sm:scale-115 z-30 filter brightness-110 drop-shadow-[0_0_18px_rgba(244,63,94,0.7)]"
                          : isDarkened
                          ? "scale-90 opacity-40 filter brightness-60 contrast-90"
                          : isFainted
                          ? "opacity-25 cursor-not-allowed scale-90"
                          : slotIdx === 1
                          ? "translate-y-2 sm:translate-y-4 scale-100"
                          : "scale-95";

                        return (
                          <div
                            key={`opp_stage_${slotIdx}_${oppRes.id}`}
                            id={`opp_stage_${slotIdx}`}
                            onClick={() => {
                              if (!isFainted) {
                                soundEngine.playTabSwitch();
                                setSelectedEnemySlot(slotIdx);
                                setActiveTargetType("enemy");
                              }
                            }}
                            className={`relative flex flex-col items-center cursor-pointer transition-all duration-200 select-none ${depthTransform} ${
                              isOppAttackDashing ? "z-50" : ""
                            } ${
                              isFainted ? "opacity-35 cursor-not-allowed" : "hover:scale-105"
                            }`}
                          >
                            {/* Floating Overhead HSR Plate */}
                            <div className="flex flex-col items-center space-y-0.5 mb-1 pointer-events-none z-30">
                              {/* Opponent Acting Badge */}
                              {isOppActing && !isFainted && (
                                <div className="flex flex-col items-center animate-pulse mb-0.5">
                                  <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-700 via-red-600 to-rose-700 text-white font-mono font-black text-[8px] sm:text-[9px] uppercase tracking-wider flex items-center space-x-1 shadow-[0_0_16px_rgba(225,29,72,0.9)] border border-rose-300">
                                    <Zap className="w-2.5 h-2.5 fill-white text-white" />
                                    <span>ACTING</span>
                                  </span>
                                </div>
                              )}
                              {/* HSR Diamond Target Reticle (Player Turn Only) */}
                              {isSelectedTarget && !isFainted && isPlayerTurn && (
                                <div className="flex flex-col items-center animate-bounce mb-0.5">
                                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-mono font-black text-[8px] sm:text-[9px] uppercase tracking-wider shadow-[0_0_12px_rgba(225,29,72,0.8)] border border-rose-300">
                                    TARGET
                                  </span>
                                  <span className="text-rose-400 text-[10px] leading-none">▼</span>
                                </div>
                              )}
                              {!isSelectedTarget && isAdjacentToSelected && !isFainted && isPlayerTurn && (
                                <span className="px-1 py-0.2 rounded bg-amber-500/80 text-black font-mono text-[7px] sm:text-[8px] font-bold shadow-md">
                                  SPLASH
                                </span>
                              )}

                              {/* Enemy Info Header */}
                              <div className="flex items-center space-x-1 text-[8px] sm:text-[10px] font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                                <span className="truncate max-w-[65px] sm:max-w-[90px]">{oppRes.name}</span>
                                <span className="text-[7px] sm:text-[8px] font-mono text-gray-300">Lv.{oppRes.level}</span>
                                <span
                                  className={`px-1 py-0.2 rounded text-[6px] sm:text-[7px] font-mono font-bold uppercase border ${
                                    ELEMENT_COLORS[oppRes.element]?.bg || ""
                                  } ${ELEMENT_COLORS[oppRes.element]?.text || ""} ${
                                    ELEMENT_COLORS[oppRes.element]?.border || ""
                                  }`}
                                >
                                  {oppRes.element}
                                </span>
                              </div>

                              {/* Sleek Floating HSR HP Bar with Barrier */}
                              <div className="w-16 sm:w-24 md:w-28 space-y-0.5">
                                {oppRes.barrierHp !== undefined && oppRes.barrierHp > 0 && (
                                  <div className="w-full bg-black/60 rounded-full h-1 overflow-hidden border border-amber-400/40">
                                    <div
                                      className="h-full bg-gradient-to-r from-amber-400 to-yellow-300"
                                      style={{ width: `${Math.min(100, (oppRes.barrierHp / (oppRes.maxHp * 0.2)) * 100)}%` }}
                                    />
                                  </div>
                                )}
                                <div className="w-full bg-black/70 rounded-full h-1.5 sm:h-2 overflow-hidden border border-white/20 shadow-md">
                                  <motion.div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${Math.max(0, (oppRes.hp / oppRes.maxHp) * 100)}%`,
                                      backgroundColor:
                                        oppRes.hp / oppRes.maxHp > 0.5
                                          ? "#10b981"
                                          : oppRes.hp / oppRes.maxHp > 0.2
                                          ? "#f59e0b"
                                          : "#ef4444",
                                    }}
                                    transition={{ duration: 0.3 }}
                                  />
                                </div>
                                <div className="flex items-center justify-between text-[6px] sm:text-[8px] font-mono text-gray-300">
                                  <span>{oppRes.hp}/{oppRes.maxHp}</span>
                                  {oppRes.isGuarding && <span>🛡️</span>}
                                </div>
                              </div>
                            </div>

                            {/* ENEMY SPRITE (NO RECTANGULAR BOX!) */}
                            <div className="relative flex flex-col items-center">
                              <motion.div
                                animate={
                                  isOppAttackDashing
                                    ? activeAttack.phase === "approach"
                                      ? { x: activeAttack.delta.x, y: activeAttack.delta.y, scale: 1.0 }
                                      : activeAttack.phase === "strike"
                                      ? { x: [activeAttack.delta.x, activeAttack.delta.x - 8, activeAttack.delta.x], y: activeAttack.delta.y, scale: 1.0 }
                                      : { x: 0, y: 0, scale: 1.0 }
                                    : opponentAnim === "attack" && opponentTrainer.activeIdx === teamIdx
                                    ? { y: [0, 8, 0], scale: 1.0, x: 0 }
                                    : opponentAnim === "hit" && (floatingText?.target === "opponent" && (floatingText.slotIdx === undefined || floatingText.slotIdx === slotIdx))
                                    ? { x: [-6, 6, -3, 0], opacity: [0.5, 1], y: 0, scale: 1.0 }
                                    : isFainted
                                    ? { opacity: 0.25, y: 6, x: 0, scale: 1.0 }
                                    : { y: [0, -3, 0], x: 0, scale: 1.0 }
                                }
                                transition={
                                  isOppAttackDashing
                                    ? { duration: activeAttack.phase === "approach" ? 0.19 : activeAttack.phase === "strike" ? 0.24 : 0.18, ease: "easeInOut" }
                                    : { repeat: isFainted ? 0 : Infinity, duration: 2.2, ease: "easeInOut" }
                                }
                                className="relative w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center"
                              >
                                <img
                                  src={oppRes.spriteUrl}
                                  alt={oppRes.name}
                                  className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)]"
                                  style={{ imageRendering: "pixelated" }}
                                />
                              </motion.div>

                              {/* Elemental Slash VFX on Target Slot */}
                              {activeSlash && activeSlash.target === "opponent" && activeSlash.slotIndices.includes(slotIdx) && (
                                <CombatSlashVFX
                                  element={activeSlash.element}
                                  category={activeSlash.category}
                                  isCrit={activeSlash.isCrit}
                                  isSuper={activeSlash.isSuper}
                                />
                              )}

                              {/* Ground Shadow & Targeting Rings */}
                              <div className="relative flex items-center justify-center -mt-2">
                                <div className="w-12 sm:w-16 h-3 bg-black/60 rounded-full blur-[2px]" />
                                {isSelectedTarget && !isFainted && (
                                  <div className="absolute w-16 sm:w-22 h-4 sm:h-5 rounded-full border-2 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.9)] animate-pulse" />
                                )}
                                {!isSelectedTarget && isAdjacentToSelected && !isFainted && (
                                  <div className="absolute w-14 sm:w-20 h-4 rounded-full border border-dashed border-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
                                )}
                              </div>

                              {/* Floating Damage Text */}
                              {floatingText && floatingText.target === "opponent" && (floatingText.slotIdx === undefined ? isSelectedTarget : floatingText.slotIdx === slotIdx) && (
                                <motion.div
                                  initial={{ opacity: 1, y: 0, scale: 0.8 }}
                                  animate={{ opacity: 0, y: -30, scale: 1.3 }}
                                  transition={{ duration: 0.7 }}
                                  className={`absolute top-0 font-black font-display text-sm sm:text-xl drop-shadow-[0_2px_8px_rgba(0,0,0,1)] z-40 ${
                                    floatingText.text.includes("MISS") || floatingText.text.includes("DODGE")
                                      ? "text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.9)] animate-pulse"
                                      : floatingText.isCrit
                                      ? "text-yellow-300 drop-shadow-[0_0_15px_rgba(250,204,21,0.9)]"
                                      : "text-rose-400"
                                  }`}
                                >
                                  {floatingText.text}
                                </motion.div>
                              )}

                              {/* Healing Green + Signs Floating Burst */}
                              {healingPops
                                .filter((hp) => hp.target === "opponent" && hp.slotIdx === slotIdx)
                                .map((hp) => (
                                  <motion.div
                                    key={hp.id}
                                    initial={{ opacity: 1, y: 0, scale: 0.9 }}
                                    animate={{ opacity: 0, y: -42, scale: 1.15 }}
                                    transition={{ duration: 1.1, ease: "easeOut" }}
                                    className="absolute -top-3 z-40 flex flex-col items-center pointer-events-none select-none"
                                  >
                                    <span className="font-display font-black text-sm sm:text-base text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.95)] flex items-center space-x-0.5">
                                      <span>+{hp.amount}</span>
                                      <span className="text-emerald-400 text-[10px] sm:text-xs">HP</span>
                                    </span>
                                    <div className="relative w-16 h-8 flex items-center justify-center -mt-1 pointer-events-none">
                                      <motion.span
                                        initial={{ y: 0, x: -12, opacity: 1, scale: 0.8 }}
                                        animate={{ y: -22, x: -20, opacity: 0, scale: 1.3 }}
                                        transition={{ duration: 0.9, delay: 0.05, ease: "easeOut" }}
                                        className="absolute text-emerald-400 font-black text-base sm:text-lg drop-shadow-[0_0_8px_rgba(16,185,129,0.9)]"
                                      >
                                        +
                                      </motion.span>
                                      <motion.span
                                        initial={{ y: 0, x: 0, opacity: 1, scale: 1 }}
                                        animate={{ y: -30, x: 2, opacity: 0, scale: 1.4 }}
                                        transition={{ duration: 0.95, ease: "easeOut" }}
                                        className="absolute text-emerald-300 font-black text-lg sm:text-xl drop-shadow-[0_0_10px_rgba(52,211,153,1)]"
                                      >
                                        +
                                      </motion.span>
                                      <motion.span
                                        initial={{ y: 0, x: 12, opacity: 1, scale: 0.7 }}
                                        animate={{ y: -18, x: 18, opacity: 0, scale: 1.2 }}
                                        transition={{ duration: 0.85, delay: 0.1, ease: "easeOut" }}
                                        className="absolute text-emerald-400 font-black text-sm sm:text-base drop-shadow-[0_0_8px_rgba(16,185,129,0.9)]"
                                      >
                                        +
                                      </motion.span>
                                    </div>
                                  </motion.div>
                                ))}

                              {/* Downed Overlay */}
                              {isFainted && (
                                <motion.div
                                  initial={{ scale: 0.7, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ duration: 0.25 }}
                                  className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
                                >
                                  <span className="px-2 py-0.5 rounded-md bg-gradient-to-r from-black/90 via-rose-950/90 to-black/90 border border-rose-500 text-rose-400 font-mono text-[8px] sm:text-[9px] font-black uppercase tracking-widest flex items-center space-x-1 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse">
                                    <Skull className="w-3.5 h-3.5 text-rose-500" />
                                    <span>DOWNED</span>
                                  </span>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* PLAYER PARTY SIDE (Lower-Left Foreground Arc) */}
                  <div className="relative w-full flex justify-start pl-1 sm:pl-6 pb-1 sm:pb-3 z-20">
                    <div className="flex items-end justify-start space-x-3 sm:space-x-8 md:space-x-12">
                      {[0, 1, 2].map((slotIdx) => {
                        const pIndices = playerTrainer.activeIndices ?? [0, 1, 2].slice(0, playerTrainer.team.length);
                        const teamIdx = pIndices[slotIdx];
                        const pRes = teamIdx !== undefined ? playerTrainer.team[teamIdx] : undefined;
                        if (!pRes) return null;

                        const isActing = isPlayerTurn && playerTrainer.activeIdx === teamIdx;
                        const isFainted = pRes.isFainted || pRes.hp <= 0;
                        const isSelectedAlly = activeTargetType === "ally" && selectedAllySlot === slotIdx;
                        const isDarkened = isPlayerTurn && !isActing && !isSelectedAlly && !isFainted;
                        const isPlayerAttackDashing = activeAttack?.attacker === "player" && activeAttack.attackerSlot === slotIdx;

                        // Visual depth & acting spotlight:
                        const actingTransform = isActing
                          ? "translate-y-[-4px] sm:translate-y-[-8px] z-30 filter brightness-110 drop-shadow-[0_0_16px_rgba(250,204,21,0.6)]"
                          : isSelectedAlly
                          ? "filter brightness-110 drop-shadow-[0_0_14px_rgba(16,185,129,0.6)] z-20"
                          : isDarkened
                          ? "opacity-45 filter brightness-75 contrast-95"
                          : isFainted
                          ? "opacity-25 cursor-not-allowed"
                          : slotIdx === 1
                          ? "translate-y-1 sm:translate-y-2"
                          : "";

                        return (
                          <div
                            key={`p_stage_${slotIdx}_${pRes.id}`}
                            id={`p_stage_${slotIdx}`}
                            onClick={() => {
                              if (!isFainted) {
                                soundEngine.playTabSwitch();
                                setSelectedAllySlot(slotIdx);
                                setActiveTargetType("ally");
                              }
                            }}
                            className={`relative flex flex-col items-center cursor-pointer transition-all duration-200 select-none ${actingTransform} ${
                              isPlayerAttackDashing ? "z-50" : ""
                            } ${
                              isFainted ? "opacity-35 cursor-not-allowed" : "hover:brightness-110"
                            }`}
                          >
                            {/* Overhead Turn / Ally Target Indicator */}
                            <div className="flex flex-col items-center space-y-0.5 mb-1 pointer-events-none z-30">
                              {isActing && !isFainted && (
                                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-mono font-black text-[8px] sm:text-[9px] uppercase tracking-wider animate-pulse flex items-center space-x-0.5 shadow-[0_0_15px_rgba(250,204,21,0.8)] border border-yellow-200">
                                  <Zap className="w-2.5 h-2.5 fill-black" />
                                  <span>ACTING</span>
                                </span>
                              )}
                              {!isActing && isSelectedAlly && !isFainted && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-500/90 text-white font-mono text-[7px] sm:text-[8px] font-bold shadow-md">
                                  💚 ALLY
                                </span>
                              )}

                              {/* Name & Level */}
                              <div className="flex items-center space-x-1 text-[8px] sm:text-[10px] font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                                <span className="truncate max-w-[65px] sm:max-w-[90px]">{pRes.name}</span>
                                <span className="text-[7px] sm:text-[8px] font-mono text-gray-300">Lv.{pRes.level}</span>
                              </div>
                            </div>

                            {/* PLAYER SPRITE (NO RECTANGULAR BOX!) */}
                            <div className="relative flex flex-col items-center">
                              <motion.div
                                animate={
                                  isPlayerAttackDashing
                                    ? activeAttack.phase === "approach"
                                      ? { x: activeAttack.delta.x, y: activeAttack.delta.y, scale: 1.0 }
                                      : activeAttack.phase === "strike"
                                      ? { x: [activeAttack.delta.x, activeAttack.delta.x + 8, activeAttack.delta.x], y: activeAttack.delta.y, scale: 1.0 }
                                      : { x: 0, y: 0, scale: 1.0 }
                                    : playerAnim === "attack" && playerTrainer.activeIdx === teamIdx
                                    ? { y: [0, -10, 0], scale: 1.0, x: 0 }
                                    : playerAnim === "hit" && (floatingText?.target === "player" && (floatingText.slotIdx === undefined || floatingText.slotIdx === slotIdx))
                                    ? { x: [-6, 6, -3, 0], opacity: [0.5, 1], y: 0, scale: 1.0 }
                                    : isFainted
                                    ? { opacity: 0.25, y: 8, x: 0, scale: 1.0 }
                                    : { y: [0, -3, 0], x: 0, scale: 1.0 }
                                }
                                transition={
                                  isPlayerAttackDashing
                                    ? { duration: activeAttack.phase === "approach" ? 0.19 : activeAttack.phase === "strike" ? 0.24 : 0.18, ease: "easeInOut" }
                                    : { repeat: isFainted ? 0 : Infinity, duration: 2.2, ease: "easeInOut" }
                                }
                                className="relative w-16 h-16 sm:w-24 sm:h-24 md:w-28 md:h-28 flex items-center justify-center"
                              >
                                <img
                                  src={pRes.spriteUrl}
                                  alt={pRes.name}
                                  className="w-full h-full object-contain filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.9)]"
                                  style={{ imageRendering: "pixelated" }}
                                />
                              </motion.div>

                              {/* Elemental Slash VFX on Defender Slot */}
                              {activeSlash && activeSlash.target === "player" && activeSlash.slotIndices.includes(slotIdx) && (
                                <CombatSlashVFX
                                  element={activeSlash.element}
                                  category={activeSlash.category}
                                  isCrit={activeSlash.isCrit}
                                  isSuper={activeSlash.isSuper}
                                />
                              )}

                              {/* Ground Shadow & Acting Elemental Matrix Ring */}
                              <div className="relative flex items-center justify-center -mt-2">
                                <div className="w-14 sm:w-20 h-3.5 bg-black/70 rounded-full blur-[2px]" />
                                {isActing && !isFainted && (
                                  <div className="absolute w-20 sm:w-28 h-5 sm:h-6 rounded-full border-2 border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.9)] ring-2 ring-amber-300/60 animate-pulse" />
                                )}
                                {!isActing && isSelectedAlly && !isFainted && (
                                  <div className="absolute w-18 sm:w-24 h-5 rounded-full border-2 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8)] animate-pulse" />
                                )}
                              </div>

                              {/* Floating Damage Text */}
                              {floatingText && floatingText.target === "player" && (floatingText.slotIdx === undefined || floatingText.slotIdx === slotIdx) && (
                                <motion.div
                                  initial={{ opacity: 1, y: 0, scale: 0.8 }}
                                  animate={{ opacity: 0, y: -30, scale: 1.3 }}
                                  transition={{ duration: 0.7 }}
                                  className={`absolute top-0 font-black font-display text-sm sm:text-xl drop-shadow-[0_2px_8px_rgba(0,0,0,1)] z-40 ${
                                    floatingText.text.includes("MISS") || floatingText.text.includes("DODGE")
                                      ? "text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.9)] animate-pulse"
                                      : floatingText.isCrit
                                      ? "text-yellow-300 drop-shadow-[0_0_15px_rgba(250,204,21,0.9)]"
                                      : "text-rose-400"
                                  }`}
                                >
                                  {floatingText.text}
                                </motion.div>
                              )}

                              {/* Healing Green + Signs Floating Burst */}
                              {healingPops
                                .filter((hp) => hp.target === "player" && hp.slotIdx === slotIdx)
                                .map((hp) => (
                                  <motion.div
                                    key={hp.id}
                                    initial={{ opacity: 1, y: 0, scale: 0.9 }}
                                    animate={{ opacity: 0, y: -42, scale: 1.15 }}
                                    transition={{ duration: 1.1, ease: "easeOut" }}
                                    className="absolute -top-3 z-40 flex flex-col items-center pointer-events-none select-none"
                                  >
                                    <span className="font-display font-black text-sm sm:text-base text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.95)] flex items-center space-x-0.5">
                                      <span>+{hp.amount}</span>
                                      <span className="text-emerald-400 text-[10px] sm:text-xs">HP</span>
                                    </span>
                                    <div className="relative w-16 h-8 flex items-center justify-center -mt-1 pointer-events-none">
                                      <motion.span
                                        initial={{ y: 0, x: -12, opacity: 1, scale: 0.8 }}
                                        animate={{ y: -22, x: -20, opacity: 0, scale: 1.3 }}
                                        transition={{ duration: 0.9, delay: 0.05, ease: "easeOut" }}
                                        className="absolute text-emerald-400 font-black text-base sm:text-lg drop-shadow-[0_0_8px_rgba(16,185,129,0.9)]"
                                      >
                                        +
                                      </motion.span>
                                      <motion.span
                                        initial={{ y: 0, x: 0, opacity: 1, scale: 1 }}
                                        animate={{ y: -30, x: 2, opacity: 0, scale: 1.4 }}
                                        transition={{ duration: 0.95, ease: "easeOut" }}
                                        className="absolute text-emerald-300 font-black text-lg sm:text-xl drop-shadow-[0_0_10px_rgba(52,211,153,1)]"
                                      >
                                        +
                                      </motion.span>
                                      <motion.span
                                        initial={{ y: 0, x: 12, opacity: 1, scale: 0.7 }}
                                        animate={{ y: -18, x: 18, opacity: 0, scale: 1.2 }}
                                        transition={{ duration: 0.85, delay: 0.1, ease: "easeOut" }}
                                        className="absolute text-emerald-400 font-black text-sm sm:text-base drop-shadow-[0_0_8px_rgba(16,185,129,0.9)]"
                                      >
                                        +
                                      </motion.span>
                                    </div>
                                  </motion.div>
                                ))}

                              {/* Downed Overlay */}
                              {isFainted && (
                                <motion.div
                                  initial={{ scale: 0.7, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ duration: 0.25 }}
                                  className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
                                >
                                  <span className="px-2 py-0.5 rounded-md bg-gradient-to-r from-black/90 via-rose-950/90 to-black/90 border border-rose-500 text-rose-400 font-mono text-[8px] sm:text-[9px] font-black uppercase tracking-widest flex items-center space-x-1 shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse">
                                    <Skull className="w-3.5 h-3.5 text-rose-500" />
                                    <span>DOWNED</span>
                                  </span>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 5. BOTTOM HUD: HSR PARTY STATUS TRAY & RESERVE BENCH STRIP */}
                <div className="relative z-20 w-full mt-2 pt-2 border-t border-white/10 flex flex-col space-y-2">
                  {/* Party Resonator Status Modules (HSR Bottom Tray) */}
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-3 w-full">
                    {[0, 1, 2].map((slotIdx) => {
                      const pIndices = playerTrainer.activeIndices ?? [0, 1, 2].slice(0, playerTrainer.team.length);
                      const teamIdx = pIndices[slotIdx];
                      const pRes = teamIdx !== undefined ? playerTrainer.team[teamIdx] : undefined;
                      if (!pRes) {
                        return (
                          <div
                            key={`hud_empty_${slotIdx}`}
                            className="h-14 sm:h-16 rounded-xl border border-dashed border-white/10 bg-black/40 flex items-center justify-center text-gray-600 text-[10px] font-mono"
                          >
                            Empty
                          </div>
                        );
                      }

                      const isActing = isPlayerTurn && playerTrainer.activeIdx === teamIdx;
                      const isFainted = pRes.isFainted || pRes.hp <= 0;
                      const hasBurstReady = pRes.energy >= 100 && !isFainted;

                      return (
                        <div
                          key={`hud_p_${slotIdx}_${pRes.id}`}
                          onClick={() => {
                            if (!isFainted) {
                              soundEngine.playTabSwitch();
                              setSelectedAllySlot(slotIdx);
                              setActiveTargetType("ally");
                            }
                          }}
                          className={`relative rounded-xl p-1.5 sm:p-2 border transition-all flex items-center space-x-2 cursor-pointer ${
                            isFainted
                              ? "bg-black/50 border-white/5 opacity-40 cursor-not-allowed"
                              : isActing
                              ? "bg-[#0b172a]/95 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.4)] ring-1 ring-yellow-400/80"
                              : "bg-[#070c17]/85 border-white/10 hover:border-cyan-400/40"
                          }`}
                        >
                          {/* Circular Avatar Frame + Ultimate Burst Trigger */}
                          <div className="relative flex-shrink-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-black/60 border border-white/20 flex items-center justify-center">
                              <img src={pRes.spriteUrl} alt={pRes.name} className="w-full h-full object-cover" />
                            </div>

                            {/* Circular Ultimate Burst Button (Honkai: Star Rail Style) */}
                            {hasBurstReady ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTriggerUltimateInterrupt(slotIdx);
                                }}
                                className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-yellow-500 via-amber-400 to-yellow-300 text-black font-black flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.9)] border border-yellow-200 animate-pulse hover:scale-115 active:scale-95 transition-transform cursor-pointer z-30"
                                title="Interrupt Timeline with Ultimate!"
                              >
                                <Zap className="w-3.5 h-3.5 fill-black" />
                              </button>
                            ) : (
                              <div
                                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-black/80 border border-cyan-400/40 flex items-center justify-center text-[7px] font-mono text-cyan-300"
                                title={`Energy: ${pRes.energy}%`}
                              >
                                {pRes.energy}%
                              </div>
                            )}
                          </div>

                          {/* Info & Bars */}
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center justify-between text-[9px] sm:text-xs">
                              <span className="font-bold text-white truncate max-w-[60px] sm:max-w-[90px]">
                                {pRes.name}
                              </span>
                              <span className="text-[8px] sm:text-[9px] font-mono text-gray-400">
                                Lv.{pRes.level}
                              </span>
                            </div>

                            {/* HP Bar */}
                            <div className="w-full bg-black/60 rounded-full h-1.5 overflow-hidden border border-white/10">
                              <motion.div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.max(0, (pRes.hp / pRes.maxHp) * 100)}%`,
                                  backgroundColor:
                                    pRes.hp / pRes.maxHp > 0.5
                                      ? "#10b981"
                                      : pRes.hp / pRes.maxHp > 0.2
                                      ? "#f59e0b"
                                      : "#ef4444",
                                }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[7px] sm:text-[8px] font-mono text-gray-400">
                              <span>{pRes.hp}/{pRes.maxHp}</span>
                              <span className="text-cyan-400">{pRes.energy}% ⚡</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reserve Bench Strip */}
                  <div className="flex items-center justify-between text-[8px] sm:text-[9px] font-mono text-gray-400 px-1">
                    <div className="flex items-center space-x-1">
                      <Users className="w-3 h-3 text-cyan-400" />
                      <span className="font-bold text-gray-300">Reserves:</span>
                      <div className="flex items-center space-x-1 ml-1">
                        {playerTrainer.team
                          .map((benchRes, bIdx) => ({ benchRes, bIdx }))
                          .filter(({ bIdx }) => !(playerTrainer.activeIndices ?? [0, 1, 2]).includes(bIdx))
                          .map(({ benchRes, bIdx }) => (
                            <div
                              key={`bench_${benchRes.id}_${bIdx}`}
                              className={`flex items-center space-x-1 px-1.5 py-0.2 rounded border ${
                                benchRes.isFainted
                                  ? "bg-gray-800/40 border-gray-700 text-gray-500"
                                  : "bg-cyan-950/30 border-cyan-500/20 text-cyan-300"
                              }`}
                            >
                              <img src={benchRes.spriteUrl} alt={benchRes.name} className="w-3 h-3 object-contain" />
                              <span className="truncate max-w-[40px] sm:max-w-[60px]">{benchRes.name.split(" ")[0]}</span>
                              <span>{benchRes.isFainted ? "💀" : `${Math.round((benchRes.hp / benchRes.maxHp) * 100)}%`}</span>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 text-gray-500">
                      <span>Foe Reserves:</span>
                      <span className="text-gray-300 font-bold">
                        {opponentTrainer.team.filter((r, idx) => !(opponentTrainer.activeIndices ?? [0, 1, 2]).includes(idx) && !r.isFainted).length} alive
                      </span>
                    </div>
                  </div>
                </div>

                {/* Resonance Liberation Cinematic Cut-In inside the Arena Box */}
                {liberationCutIn && (
                  <LiberationCutIn
                    resonator={liberationCutIn.resonator}
                    move={liberationCutIn.move}
                    isPlayer={liberationCutIn.isPlayer}
                    onComplete={() => setLiberationCutIn(null)}
                  />
                )}
              </motion.div>

              {/* 5. COMBAT ACTION DOCK */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-shrink-0">
                {/* Left: Classic Deluge Narrative Combat Log */}
                <div className="h-28 sm:h-32 p-2.5 sm:p-3 rounded-xl bg-black/60 border border-white/10 flex flex-col justify-between overflow-hidden">
                  <div className="flex items-center justify-between border-b border-white/5 pb-1 mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold flex items-center space-x-1">
                      <Swords className="w-3 h-3 text-amber-400 inline" />
                      <span>Battle Log</span>
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-[9px] font-mono text-yellow-400 font-bold">
                        {isPlayerTurn
                          ? isOneMoreActive
                            ? "1 MORE ACTION!"
                            : `Turn: ${currentPActive?.name || "Player"}`
                          : `Turn: ${opponentTrainer?.team[opponentTrainer.activeIdx]?.name || "Opponent"}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-white/10 pr-1">
                    {battleLogs.map((log) => (
                      <p
                        key={log.id}
                        className={`text-xs font-mono leading-relaxed ${
                          log.type === "one_more"
                            ? "text-amber-300 font-black animate-pulse"
                            : log.type === "down"
                            ? "text-rose-300 font-bold"
                            : log.type === "guard"
                            ? "text-cyan-300 font-bold"
                            : log.type === "heal"
                            ? "text-emerald-300 font-bold"
                            : log.type === "status"
                            ? "text-yellow-300"
                            : log.type === "effective"
                            ? "text-yellow-300 font-bold"
                            : log.type === "liberation"
                            ? "text-cyan-300 font-black"
                            : log.type === "faint"
                            ? "text-rose-400 font-bold"
                            : log.type === "switch"
                            ? "text-purple-300"
                            : "text-gray-300"
                        }`}
                      >
                        {log.text}
                      </p>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </div>

                {/* Right: 4 Move Action Grid + Guard / Switch / Forfeit */}
                <div className="flex flex-col space-y-1.5 sm:space-y-2">
                  <div className="grid grid-cols-2 gap-1.5 flex-1">
                    {currentPActive?.moves.map((move) => {
                      const isLiberation = move.category === "liberation";
                      const canCastLiberation = isLiberation ? currentPActive.energy >= 100 : true;
                      const moveCd = currentPActive.moveCooldowns?.[move.id] || 0;
                      const onCooldown = moveCd > 0;

                      // Scope label & targeting restriction:
                      const scope = move.targetScope || "single";
                      const isAllyMove = scope === "ally_single" || scope === "ally_team" || scope === "self";
                      const isEnemyTargeted = activeTargetType === "enemy";
                      const isScopeBlocked = isEnemyTargeted ? isAllyMove : !isAllyMove;
                      const scopeBlockedText = isEnemyTargeted
                        ? (scope === "self" ? "Self Only" : "Allies Only")
                        : "Enemies Only";

                      const disabled = !isPlayerTurn || isBusy || !canCastLiberation || onCooldown || isScopeBlocked;

                      const scopeBadge =
                        scope === "blast"
                          ? "BLAST"
                          : scope === "aoe"
                          ? "AoE"
                          : scope === "ally_team"
                          ? "TEAM"
                          : scope === "ally_single"
                          ? "ALLY"
                          : scope === "self"
                          ? "SELF"
                          : "ST";

                      return (
                        <div key={move.id} className="relative group/move">
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => handlePlayerMove(move)}
                            className={`w-full h-full min-h-[46px] sm:min-h-[52px] p-2 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between active:scale-95 cursor-pointer ${
                              disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                            } ${
                              isLiberation && canCastLiberation && !isScopeBlocked
                                ? "bg-gradient-to-r from-yellow-500/30 via-amber-500/20 to-yellow-500/30 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)] animate-pulse"
                                : "bg-white/[0.04] hover:bg-white/[0.08] border-white/15 hover:border-white/30"
                            }`}
                          >
                            {/* Frosted Scope Restriction Overlay */}
                            {isScopeBlocked && !onCooldown && canCastLiberation && (
                              <div className="absolute inset-0 bg-black/85 backdrop-blur-[2px] rounded-xl flex items-center justify-center z-20 pointer-events-none border border-white/15 shadow-lg">
                                <span
                                  className={`px-2 py-0.5 rounded font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center space-x-1 shadow-md ${
                                    isEnemyTargeted
                                      ? "bg-amber-500/25 text-amber-300 border border-amber-400/50"
                                      : "bg-rose-500/25 text-rose-300 border border-rose-400/50"
                                  }`}
                                >
                                  {isEnemyTargeted ? (
                                    <Users className="w-3 h-3 text-amber-400" />
                                  ) : (
                                    <Swords className="w-3 h-3 text-rose-400" />
                                  )}
                                  <span>{scopeBlockedText}</span>
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between w-full">
                              <span className="text-xs font-bold text-white truncate max-w-[90px] sm:max-w-[120px]">
                                {move.name}
                              </span>
                              <div className="flex items-center space-x-1">
                                <span className="text-[7px] sm:text-[8px] font-mono uppercase px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  {scopeBadge}
                                </span>
                                <span
                                  className={`text-[7px] sm:text-[8px] font-mono uppercase px-1 rounded border ${
                                    ELEMENT_COLORS[move.element]?.bg || ""
                                  } ${ELEMENT_COLORS[move.element]?.text || ""} ${
                                    ELEMENT_COLORS[move.element]?.border || ""
                                  }`}
                                >
                                  {move.element}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-gray-400 mt-0.5">
                              <span>
                                {move.barrierPercent
                                  ? `SHIELD ${move.barrierPercent}%`
                                  : move.healPercent
                                  ? `HEAL ${move.healPercent}%`
                                  : `PWR ${move.power}`}
                              </span>
                              {onCooldown ? (
                                <span className="text-rose-400 font-bold">CD: {moveCd}T</span>
                              ) : isLiberation ? (
                                <span className={canCastLiberation ? "text-yellow-400 font-bold" : "text-amber-400 font-bold"}>
                                  {currentPActive.energy}/100 ⚡
                                </span>
                              ) : (
                                <span className="text-cyan-400 font-bold">+{move.energyGain || 20} Energy</span>
                              )}
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Utility Buttons: Guard / Switch / Forfeit */}
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      disabled={!isPlayerTurn || isBusy}
                      onClick={handlePlayerGuard}
                      className="py-1.5 px-3 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-400/40 text-cyan-200 text-xs font-mono font-bold uppercase transition-all flex items-center justify-center space-x-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Guard</span>
                    </button>

                    <button
                      type="button"
                      disabled={!isPlayerTurn || isBusy || playerSwitchCooldown > 0}
                      onClick={() => setIsSwitchMenuOpen((prev) => !prev)}
                      className="flex-1 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/35 border border-purple-400/40 text-purple-200 text-xs font-mono font-bold uppercase transition-all flex items-center justify-center space-x-1.5 disabled:opacity-40 cursor-pointer"
                      title={
                        playerSwitchCooldown > 0
                          ? `Switch locked for ${playerSwitchCooldown} more turn(s)`
                          : "Switch active unit with a bench unit (Consumes Turn)"
                      }
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Switch {playerSwitchCooldown > 0 ? `(${playerSwitchCooldown}T)` : ""}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setShowExitConfirm(true)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40 text-gray-400 hover:text-rose-300 text-xs font-mono font-bold uppercase transition-all cursor-pointer"
                      title="Forfeit Match"
                    >
                      Forfeit
                    </button>
                  </div>
                </div>
              </div>

              {/* Bench Switch Menu Modal (Manual Switch) */}
              <AnimatePresence>
                {isSwitchMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute inset-x-4 bottom-16 bg-[#0a0f1d] border border-white/20 rounded-xl p-3 shadow-2xl z-30 space-y-2"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-1">
                      <span className="text-xs font-mono uppercase font-bold text-yellow-400">
                        Select a Reserve Resonator to Switch In:
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsSwitchMenuOpen(false)}
                        className="text-gray-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {playerTrainer.team
                        .map((r, i) => ({ r, i }))
                        .filter(({ i }) => !playerTrainer.activeIndices?.includes(i))
                        .map(({ r, i }) => {
                          const fainted = r.isFainted || r.hp <= 0;
                          return (
                            <button
                              key={`bench_switch_${i}`}
                              type="button"
                              disabled={fainted}
                              onClick={() => handlePlayerSwitch(i)}
                              className={`p-2 rounded-lg border text-left flex items-center space-x-2 transition-all ${
                                fainted
                                  ? "opacity-30 border-white/10 bg-black/40 cursor-not-allowed"
                                  : "border-white/20 bg-white/5 hover:border-purple-400 hover:bg-purple-500/10 cursor-pointer"
                              }`}
                            >
                              <img src={r.spriteUrl} alt={r.name} className="w-8 h-8 object-contain" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-white truncate">{r.name}</p>
                                <p className="text-[9px] font-mono text-gray-400">
                                  {fainted ? "Downed" : `${r.hp}/${r.maxHp} HP`}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Downed Unit Bench Replacement Modal */}
              <AnimatePresence>
                {isFaintReplaceModalOpen && faintedSlotIndex !== null && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
                  >
                    <div className="w-full max-w-md bg-[#0d1322] border border-cyan-500/40 rounded-2xl p-4 shadow-2xl space-y-3">
                      <div className="flex items-center space-x-2 border-b border-white/10 pb-2">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                        <div>
                          <h4 className="text-sm font-bold text-white font-display">
                            Deploy Reinforcements!
                          </h4>
                          <p className="text-[10px] text-gray-400 font-mono">
                            Frontline Slot {faintedSlotIndex + 1} was downed. Choose a living reserve:
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                        {playerTrainer.team
                          .map((r, i) => ({ r, i }))
                          .filter(({ i, r }) => !playerTrainer.activeIndices?.includes(i) && !r.isFainted && r.hp > 0)
                          .map(({ r, i }) => (
                            <button
                              key={`faint_sub_${i}`}
                              type="button"
                              onClick={() => handleSelectBenchSubstitute(i)}
                              className="w-full p-2 rounded-xl border border-cyan-500/30 hover:border-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/40 text-left flex items-center justify-between transition-all cursor-pointer group"
                            >
                              <div className="flex items-center space-x-2.5">
                                <img
                                  src={r.spriteUrl}
                                  alt={r.name}
                                  className="w-10 h-10 object-contain group-hover:scale-105 transition-transform"
                                  style={{ imageRendering: "pixelated" }}
                                />
                                <div>
                                  <p className="text-xs font-bold text-white">{r.name}</p>
                                  <div className="flex items-center space-x-1.5 text-[9px] font-mono text-gray-400">
                                    <span
                                      className={`px-1 py-0.2 rounded uppercase border ${
                                        ELEMENT_COLORS[r.element]?.bg || ""
                                      } ${ELEMENT_COLORS[r.element]?.text || ""} ${
                                        ELEMENT_COLORS[r.element]?.border || ""
                                      }`}
                                    >
                                      {r.element}
                                    </span>
                                    <span>Lv.{r.level}</span>
                                    <span>{r.spd} SPD</span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="text-xs font-mono font-bold text-emerald-400">
                                  {r.hp}/{r.maxHp} HP
                                </span>
                                <div className="w-16 bg-black/60 rounded-full h-1.5 overflow-hidden border border-white/10 mt-1">
                                  <div
                                    className="h-full bg-emerald-400 rounded-full"
                                    style={{ width: `${Math.round((r.hp / r.maxHp) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. BATTLE RESULT SCREEN */}
          {/* ========================================================================= */}
          {screen === "result" && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-8 text-center">
              <div
                className={`p-4 rounded-full border shadow-2xl ${
                  battleWinner === "player"
                    ? "bg-gradient-to-b from-yellow-400/30 to-amber-500/10 border-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.5)] text-yellow-300"
                    : "bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.4)]"
                }`}
              >
                {battleWinner === "player" ? (
                  <Crown className="w-12 h-12" />
                ) : (
                  <Shield className="w-12 h-12" />
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-wider text-white">
                  {battleWinner === "player" ? "Victory!" : "Defeat"}
                </h3>
                <p className="text-xs sm:text-sm font-mono text-gray-400">
                  {battleWinner === "player"
                    ? `You defeated ${opponentTrainer?.username}!`
                    : "Your team was wiped out. Train your resonators and try again!"}
                </p>
              </div>

              {battleWinner === "player" ? (
                <div className="p-3 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center space-x-4 text-xs font-mono font-bold flex-wrap justify-center gap-y-2">
                  {currentGymChallenge ? (
                    (() => {
                      const stageInfo =
                        GYM_STAGES.find((s) => s.level === currentGymChallenge.stageLevel) ||
                        GYM_STAGES[0];
                      const wasAlreadyClaimed = isGymBossClaimedToday(
                        currentGymChallenge.boss.charId,
                        currentUserId
                      );
                      return (
                        <>
                          <div className="flex items-center space-x-1.5 text-yellow-300">
                            <AstriteIcon className="w-4 h-4" />
                            <span>
                              {wasAlreadyClaimed
                                ? `+${stageInfo.bounty} Astrite (Claimed Today)`
                                : `+${stageInfo.bounty} Astrite Bounty!`}
                            </span>
                          </div>
                          <span className="text-gray-500">|</span>
                          <div className="text-emerald-400 flex items-center space-x-1">
                            <Zap className="w-3.5 h-3.5" />
                            <span>+{stageInfo.exp} Combat EXP</span>
                          </div>
                        </>
                      );
                    })()
                  ) : currentTowerFloor ? (
                    <>
                      <div className="flex items-center space-x-1.5 text-yellow-300">
                        <AstriteIcon className="w-4 h-4" />
                        <span>+{currentTowerFloor.astriteReward} Astrite Floor Reward</span>
                      </div>
                      <span className="text-gray-500">|</span>
                      <div className="text-emerald-400 flex items-center space-x-1">
                        <Zap className="w-3.5 h-3.5" />
                        <span>+{currentTowerFloor.combatExpReward} Combat EXP</span>
                      </div>
                    </>
                  ) : isRealtimeMatch ? (
                    isEarlyForfeitMatch ? (
                      <div className="flex items-center space-x-2 text-amber-300">
                        <span className="text-sm">⚠️</span>
                        <span>
                          {selectedBet > 0
                            ? `Early Forfeit (< 3 turns): ${selectedBet} Bet Refunded (Net 0)`
                            : `Early Forfeit (< 3 turns): Victory Astrite & BP Withheld`}
                        </span>
                        <span className="text-gray-500">|</span>
                        <span className="text-gray-400">No Contest</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center space-x-1.5 text-yellow-300">
                          <AstriteIcon className="w-4 h-4" />
                          <span>
                            {selectedBet > 0
                              ? `+${selectedBet * 2} Astrite Pot Won! (+${selectedBet} Net)`
                              : "+160 Astrite (Victory)"}
                          </span>
                        </div>
                        <span className="text-gray-500">|</span>
                        <div className="text-amber-400 flex items-center space-x-1">
                          <Trophy className="w-3.5 h-3.5" />
                          <span>
                            +{battlePointsDelta?.delta || 15} BP
                            {battlePointsDelta?.isUnderdog ? " (Underdog!)" : ""}
                          </span>
                        </div>
                        <span className="text-gray-500">|</span>
                        <div className="text-orange-400 flex items-center space-x-1">
                          <Flame className="w-3.5 h-3.5" />
                          <span>Streak: {pvpStats.streak} 🔥</span>
                        </div>
                      </>
                    )
                  ) : (
                    <div className="text-gray-300">Practice Match Completed</div>
                  )}
                </div>
              ) : isRealtimeMatch ? (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-4 text-xs font-mono font-bold flex-wrap justify-center gap-y-2">
                  {selectedBet > 0 && (
                    <>
                      <div className="flex items-center space-x-1.5 text-rose-400">
                        <AstriteIcon className="w-4 h-4" />
                        <span>-{selectedBet} Astrite Bet Forfeited</span>
                      </div>
                      <span className="text-gray-500">|</span>
                    </>
                  )}
                  <div className="text-rose-400 flex items-center space-x-1">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>{battlePointsDelta?.delta || -10} BP</span>
                  </div>
                  <span className="text-gray-500">|</span>
                  <div className="text-gray-400">Streak Reset (0)</div>
                </div>
              ) : null}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setScreen("lobby");
                    setCurrentGymChallenge(null);
                    setCurrentTowerFloor(null);
                    setSelectedBet(0);
                    clearPlayerSearch();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Return to Lobby
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PvP Battle Guide Modal */}
        {/* PvP Guide Modal */}
        <AnimatePresence>
          {isPvPGuideOpen && (
            <div
              className="fixed inset-0 z-[85] flex flex-col items-center justify-center p-2 sm:p-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-black/85 backdrop-blur-md select-none overflow-y-auto"
              onClick={() => setIsPvPGuideOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl max-h-[85dvh] sm:max-h-[88dvh] bg-[#0b101d] border border-white/15 rounded-2xl shadow-2xl flex flex-col text-gray-200 overflow-hidden my-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-[#06080e] sticky top-0 z-30 flex-shrink-0">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold font-mono text-white uppercase tracking-wider">
                        PvP Battle Guide
                      </h3>
                      <p className="text-[11px] font-mono text-gray-400">
                        Speed order, 6-element matrix, combat actions &amp; stakes
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsPvPGuideOpen(false)}
                    className="group p-2 sm:p-2.5 rounded-xl bg-yellow-400/15 hover:bg-yellow-400/25 text-yellow-300 hover:text-white transition-all border border-yellow-400/40 hover:border-yellow-400/70 active:scale-95 cursor-pointer flex-shrink-0 min-w-[38px] min-h-[38px] flex items-center justify-center shadow-[0_0_12px_rgba(250,204,21,0.2)]"
                    title="Close Guide"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] text-yellow-300 group-hover:text-white group-hover:rotate-90 transition-transform duration-200" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex space-x-1 border-b border-white/10 px-4 sm:px-6 py-2 bg-black/40 flex-shrink-0 overflow-x-auto scrollbar-none">
                  {[
                    { id: "basics", label: "How to Play" },
                    { id: "elements", label: "Elements" },
                    { id: "mechanics", label: "Combat Rules" },
                    { id: "stakes", label: "Game Modes" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setGuideTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer active:scale-95 ${
                        guideTab === tab.id
                          ? "bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 shadow-sm"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 text-xs sm:text-sm font-sans leading-relaxed scrollbar-thin scrollbar-thumb-white/15">
                  {guideTab === "basics" && (
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-xl bg-yellow-950/20 border border-yellow-500/30 space-y-1.5">
                        <h4 className="font-bold text-yellow-300 font-mono flex items-center space-x-2 text-xs uppercase tracking-wider">
                          <Zap className="w-3.5 h-3.5 text-yellow-400" />
                          <span>1. Speed &amp; Turn Order</span>
                        </h4>
                        <p className="text-gray-300 text-xs leading-relaxed">
                          Whichever active Resonator has the higher <strong>SPD</strong> stat takes the first turn. The timeline bar at the top shows who acts next.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                        <h4 className="font-bold text-white font-mono flex items-center space-x-2 text-xs uppercase tracking-wider">
                          <Swords className="w-3.5 h-3.5 text-purple-400" />
                          <span>2. Four Combat Actions</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-300">
                          <div className="p-2 rounded-lg bg-black/30 border border-white/5 space-y-0.5">
                            <strong className="text-white block font-mono">Basic Attack</strong>
                            <span>Deals standard damage and generates <strong>+25 Energy</strong>.</span>
                          </div>
                          <div className="p-2 rounded-lg bg-black/30 border border-white/5 space-y-0.5">
                            <strong className="text-white block font-mono">Resonance Skill</strong>
                            <span>Stronger attack or team buff, generates <strong>+35 Energy</strong>.</span>
                          </div>
                          <div className="p-2 rounded-lg bg-black/30 border border-white/5 space-y-0.5">
                            <strong className="text-yellow-300 block font-mono">Liberation (Ultimate)</strong>
                            <span>Ready at <strong>100 Energy</strong> for massive damage or major buffs!</span>
                          </div>
                          <div className="p-2 rounded-lg bg-black/30 border border-white/5 space-y-0.5">
                            <strong className="text-cyan-300 block font-mono">Guard Stance</strong>
                            <span>Halves damage taken (50%) and blocks crits &amp; knockdowns.</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-1.5">
                        <h4 className="font-bold text-cyan-300 font-mono flex items-center space-x-2 text-xs uppercase tracking-wider">
                          <Users className="w-3.5 h-3.5 text-cyan-400" />
                          <span>3. Targeting &amp; Switching</span>
                        </h4>
                        <p className="text-gray-300 text-xs leading-relaxed">
                          • <strong>Targeting:</strong> Click any enemy to target them with attacks, or click an ally to target them with heals/shields.<br />
                          • <strong>Switching:</strong> Tap <strong>Switch</strong> to swap your active fighter with a benched reserve. Swapping uses your turn.
                        </p>
                      </div>
                    </div>
                  )}

                  {guideTab === "elements" && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-1">
                        <h4 className="font-bold text-purple-300 font-mono text-xs uppercase tracking-wider">
                          Simple Rule:
                        </h4>
                        <p className="text-xs text-gray-300 leading-relaxed">
                          • <strong>Super Effective:</strong> Deals <strong>+25% more damage</strong> (1.25x) and can knock enemies DOWN.<br />
                          • <strong>Resisted / Same Element:</strong> Deals <strong>-20% less damage</strong> (0.80x).
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 space-y-1">
                          <span className="font-bold text-cyan-300 text-xs font-mono">Glacio (Ice)</span>
                          <p className="text-[11px] text-gray-300">Strong against <strong>Fusion</strong> &amp; <strong>Aero</strong>. Weak to <strong>Fusion</strong> &amp; <strong>Electro</strong>.</p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-1">
                          <span className="font-bold text-rose-300 text-xs font-mono">Fusion (Fire)</span>
                          <p className="text-[11px] text-gray-300">Strong against <strong>Glacio</strong> &amp; <strong>Aero</strong>. Weak to <strong>Glacio</strong>.</p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-violet-950/30 border border-violet-500/30 space-y-1">
                          <span className="font-bold text-violet-300 text-xs font-mono">Electro (Lightning)</span>
                          <p className="text-[11px] text-gray-300">Strong against <strong>Glacio</strong> &amp; <strong>Aero</strong>. Weak to <strong>Spectro</strong> &amp; <strong>Havoc</strong>.</p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                          <span className="font-bold text-emerald-300 text-xs font-mono">Aero (Wind)</span>
                          <p className="text-[11px] text-gray-300">Strong against <strong>Havoc</strong> &amp; <strong>Spectro</strong>. Weak to <strong>Glacio</strong>, <strong>Fusion</strong> &amp; <strong>Electro</strong>.</p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1">
                          <span className="font-bold text-amber-300 text-xs font-mono">Spectro (Light)</span>
                          <p className="text-[11px] text-gray-300">Strong against <strong>Havoc</strong> &amp; <strong>Electro</strong>. Weak to <strong>Aero</strong> &amp; <strong>Havoc</strong>.</p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-1">
                          <span className="font-bold text-purple-300 text-xs font-mono">Havoc (Dark)</span>
                          <p className="text-[11px] text-gray-300">Strong against <strong>Spectro</strong> &amp; <strong>Electro</strong>. Weak to <strong>Aero</strong> &amp; <strong>Spectro</strong>.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {guideTab === "mechanics" && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                        <h4 className="font-bold text-amber-300 font-mono text-xs uppercase tracking-wider flex items-center space-x-1.5">
                          <Flame className="w-3.5 h-3.5 text-amber-400" />
                          <span>1 MORE! Bonus Turn</span>
                        </h4>
                        <p className="text-gray-300 text-xs leading-relaxed">
                          Landing a Critical Hit or Weakness strike has a chance to knock an enemy <strong>DOWN</strong>. When an enemy is knocked down, you immediately earn <strong>1 MORE!</strong> free bonus action.<br />
                          <span className="text-[11px] text-amber-200/80 italic">• Note: Bonus turns cannot chain — you get 1 bonus action maximum per attack.</span>
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1">
                        <h4 className="font-bold text-rose-300 font-mono text-xs uppercase tracking-wider flex items-center space-x-1.5">
                          <Skull className="w-3.5 h-3.5 text-rose-400" />
                          <span>Knockdown (DOWN!)</span>
                        </h4>
                        <p className="text-gray-300 text-xs leading-relaxed">
                          Downed enemies take <strong>+20% more damage</strong> and suffer a <strong>-20% accuracy penalty</strong> until their next turn.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-1">
                        <h4 className="font-bold text-cyan-300 font-mono text-xs uppercase tracking-wider flex items-center space-x-1.5">
                          <Shield className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Guard Stance &amp; Resonator Grit</span>
                        </h4>
                        <p className="text-gray-300 text-xs leading-relaxed">
                          • <strong>Guard:</strong> Cuts incoming damage by <strong>50%</strong>, grants status immunity, and completely prevents enemies from triggering 1 MORE.<br />
                          • <strong>Resonator Grit:</strong> Each fighter can survive one fatal blow with 1 HP per battle, preventing instant one-shots.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
                        <h4 className="font-bold text-yellow-300 font-mono text-xs uppercase tracking-wider">
                          Status Effects Quick Guide
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-gray-300">
                          <div><strong>Burn:</strong> Damage over time + -20% DEF</div>
                          <div><strong>Freeze:</strong> Skips turn; auto-crit when hit</div>
                          <div><strong>Shock:</strong> +25% crit vulnerability</div>
                          <div><strong>Stagnation:</strong> -25% hit accuracy</div>
                          <div><strong>Erosion:</strong> Drains HP &amp; Energy each turn</div>
                          <div><strong>Dizzy:</strong> 40% chance action fails</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {guideTab === "stakes" && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-yellow-400/10 border border-yellow-400/30 space-y-1">
                        <h4 className="font-bold text-yellow-300 font-mono text-xs uppercase tracking-wider flex items-center space-x-1.5">
                          <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                          <span>Gym Trials (Daily Bosses)</span>
                        </h4>
                        <p className="text-gray-300 text-xs leading-relaxed">
                          Fight AI Gym Leaders at various difficulty stages (Lv. 60–100). Clear each boss once per day to claim <strong>Astrite</strong> and <strong>Combat EXP</strong>. Resets daily at 00:00 (GMT+8).
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-1">
                        <h4 className="font-bold text-purple-300 font-mono text-xs uppercase tracking-wider flex items-center space-x-1.5">
                          <Crown className="w-3.5 h-3.5 text-purple-400" />
                          <span>Tower of Adversity (Endless Gauntlet)</span>
                        </h4>
                        <p className="text-gray-300 text-xs leading-relaxed">
                          Climb 5-floor brackets with <strong>persistent party HP</strong>. After each victory, draft 1 of 3 blessings to empower your team. Every 5 floors features a major <strong>BOSS</strong> and a 50% chance for a <strong>Mythic Revive</strong> blessing if allies have fallen.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                        <h4 className="font-bold text-emerald-300 font-mono text-xs uppercase tracking-wider flex items-center space-x-1.5">
                          <Radio className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Live 1v1 Rooms &amp; Player Challenge</span>
                        </h4>
                        <p className="text-gray-300 text-xs leading-relaxed">
                          • <strong>1v1 Room Battles:</strong> Host or join via room code to fight friends in real-time. Choose Casual (free) or wager Astrite (winner takes the pot).<br />
                          • <strong>Player Search:</strong> Look up any player by username to challenge their defense squad at Tournament Standard (Level 100).
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-end border-t border-white/10 px-4 sm:px-6 py-2.5 sm:py-3 bg-[#06080e] flex-shrink-0">
                  <button
                    onClick={() => setIsPvPGuideOpen(false)}
                    className="w-full sm:w-auto px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    Got It!
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Gym Challenge Prep Modal (Intel, Stage Selection, Team Editor & Level Up) */}
        <AnimatePresence>
          {isGymPrepOpen && selectedGymBoss && (
            <div
              className="fixed inset-0 z-[70] flex flex-col items-center justify-center p-2 sm:p-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-black/85 backdrop-blur-md select-none overflow-y-auto"
              onClick={() => setIsGymPrepOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-3xl max-h-[85dvh] sm:max-h-[90dvh] bg-[#0b101e] border border-yellow-400/30 rounded-2xl shadow-[0_0_50px_rgba(250,204,21,0.15)] flex flex-col text-gray-200 overflow-hidden my-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 flex-shrink-0 sticky top-0 z-30 bg-[#0b101e]">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/20 bg-black/50 flex-shrink-0">
                      <img
                        src={`/assets/inventory_portraits/${getPortraitFileName(selectedGymBoss.charId)}`}
                        alt={selectedGymBoss.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src =
                            SPRITE_MAP[selectedGymBoss.charId] ||
                            `/assets/characters/${selectedGymBoss.charId}_portrait.png`;
                        }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base sm:text-lg font-bold text-white font-display">
                          {selectedGymBoss.name}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            ELEMENT_COLORS[selectedGymBoss.element]
                              ? `${ELEMENT_COLORS[selectedGymBoss.element].bg} ${ELEMENT_COLORS[selectedGymBoss.element].text} ${ELEMENT_COLORS[selectedGymBoss.element].border}`
                              : "bg-gray-500/20 text-gray-300 border-gray-500/30"
                          }`}
                        >
                          {selectedGymBoss.element}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-yellow-400/80">
                        {selectedGymBoss.title}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsGymPrepOpen(false)}
                    className="group p-2 sm:p-2.5 rounded-xl bg-yellow-400/15 hover:bg-yellow-400/25 text-yellow-300 hover:text-white transition-all border border-yellow-400/40 hover:border-yellow-400/70 active:scale-95 cursor-pointer flex-shrink-0 min-w-[38px] min-h-[38px] flex items-center justify-center shadow-[0_0_12px_rgba(250,204,21,0.2)]"
                    title="Close Gym Challenge"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] text-yellow-300 group-hover:text-white group-hover:rotate-90 transition-transform duration-200" />
                  </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 pr-2">
                  {/* Intel & Weakness Strip */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span>
                        <strong className="text-white">Weakness Counter:</strong>{" "}
                        <span className="text-emerald-400 font-bold">
                          {selectedGymBoss.element === "Glacio" && "🔥 Fusion & ⚡ Electro (+25% DMG)"}
                          {selectedGymBoss.element === "Fusion" && "❄️ Glacio (+25% DMG)"}
                          {selectedGymBoss.element === "Electro" && "✨ Spectro & 💀 Havoc (+25% DMG)"}
                          {selectedGymBoss.element === "Aero" && "❄️ Glacio, 🔥 Fusion & ⚡ Electro (+25% DMG)"}
                          {selectedGymBoss.element === "Spectro" && "🌪️ Aero & 💀 Havoc (+25% DMG)"}
                          {selectedGymBoss.element === "Havoc" && "🌪️ Aero & ✨ Spectro (+25% DMG)"}
                        </span>
                      </span>
                    </div>
                    <div className="text-gray-400 text-[11px]">
                      Title: <span className="text-gray-200">{selectedGymBoss.title}</span>
                    </div>
                  </div>

                  {/* Stage Difficulty Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-300">
                        Select Difficulty Stage:
                      </span>
                      <span className="text-[11px] font-mono text-gray-400">
                        (Higher stage = larger bounty &amp; EXP)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {GYM_STAGES.map((stage) => {
                        const isSelected = selectedGymStageLevel === stage.level;
                        return (
                          <button
                            key={stage.level}
                            type="button"
                            onClick={() => setSelectedGymStageLevel(stage.level)}
                            className={`p-2.5 rounded-xl border text-left transition-all relative ${
                              isSelected
                                ? "bg-yellow-400/15 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.25)] ring-1 ring-yellow-400/50"
                                : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white font-mono">
                                Lv. {stage.level}
                              </span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-yellow-400" />
                              )}
                            </div>
                            <p className="text-[10px] font-mono text-yellow-400/80 mt-0.5">
                              {stage.title}
                            </p>
                            <div className="mt-2 space-y-0.5 text-[9px] font-mono">
                              <div className="text-amber-300 font-bold flex items-center space-x-1">
                                <span>+{stage.bounty} ✦</span>
                              </div>
                              <div className="text-emerald-400">
                                +{stage.exp} EXP
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Daily Cooldown Notice */}
                    {(() => {
                      const isClaimed = isGymBossClaimedToday(selectedGymBoss.charId, currentUserId);
                      return isClaimed ? (
                        <div className="p-2.5 rounded-xl bg-gray-500/10 border border-gray-500/30 flex items-center space-x-2 text-xs font-mono text-gray-300">
                          <RotateCcw className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                          <span>
                            <strong>Practice Mode:</strong> Today&apos;s Astrite bounty for {selectedGymBoss.name} has already been claimed. Victory will award Combat EXP! Daily reset at 00:00 GMT+8 (in {timeUntilReset}).
                          </span>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center space-x-2 text-xs font-mono text-amber-200">
                          <Sparkles className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                          <span>
                            <strong>Daily Bounty Available:</strong> Defeating ANY stage will claim today&apos;s bounty for {selectedGymBoss.name} (+{GYM_STAGES.find((s) => s.level === selectedGymStageLevel)?.bounty} ✦). Subsequent wins today will be Practice Mode.
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Battle Party & Level Up Section */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-300">
                          Your Battle Team ({selectedPartyIds.length}/6)
                        </span>
                        <span className="text-[11px] font-mono text-cyan-400">
                          (Combat EXP: {combatExp})
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsPartyPickerOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-1"
                      >
                        <Users className="w-3.5 h-3.5 text-yellow-400" />
                        <span>Edit Team</span>
                      </button>
                    </div>

                    {/* Team Members Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {selectedPartyIds.map((charId) => {
                        const invItem = (inventory || []).find((i) => i.character_id === charId);
                        const seq = Math.max(0, Math.min(6, (invItem?.count || 1) - 1));
                        const currentLvl = getResonatorLevel(charId, currentUserId);
                        const sprite = SPRITE_MAP[charId] || `/assets/characters/${charId}_portrait.png`;
                        const isMax = currentLvl >= 100;
                        const expCost = getUpgradeExpCost(currentLvl);
                        const astriteCost = getUpgradeAstriteCost(currentLvl);
                        const canAffordExp = combatExp >= expCost;
                        const canAffordAstrite = userAstrite >= astriteCost;

                        return (
                          <div
                            key={charId}
                            className="p-2.5 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-between space-x-2"
                          >
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                              <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/15 bg-black/40 flex-shrink-0">
                                <img
                                  src={sprite}
                                  alt={charId}
                                  className="w-full h-full object-contain"
                                  style={{ imageRendering: "pixelated" }}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center space-x-1">
                                  <p className="text-xs font-bold text-white truncate capitalize">
                                    {charId.replace(/_/g, " ")}
                                  </p>
                                  <span className="px-1 py-0.2 rounded bg-yellow-400/20 text-yellow-300 text-[8px] font-mono font-bold">
                                    S{seq}
                                  </span>
                                </div>
                                <p className="text-[10px] font-mono text-cyan-400">
                                  Lv. {currentLvl} / 100
                                </p>
                              </div>
                            </div>

                            {/* Upgrade Button */}
                            <div className="flex-shrink-0">
                              {isMax ? (
                                <span className="text-[9px] font-mono font-bold text-yellow-400 px-2 py-1 rounded bg-yellow-400/10 border border-yellow-400/30">
                                  MAX
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={!canAffordExp && !canAffordAstrite}
                                  onClick={() => handleUpgradeResonator(charId)}
                                  className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm active:scale-95 flex flex-col items-center"
                                  title={
                                    canAffordExp
                                      ? `Spend ${expCost} Combat EXP for +10 Levels`
                                      : canAffordAstrite
                                      ? `Spend ${astriteCost} Astrite for +10 Levels`
                                      : `Need ${expCost} Combat EXP or ${astriteCost} Astrite`
                                  }
                                >
                                  <span>+10 Lv</span>
                                  <span className="text-[8px] opacity-80">
                                    {canAffordExp ? `${expCost} EXP` : `${astriteCost} ✦`}
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between border-t border-white/10 pt-3 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsGymPrepOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    disabled={selectedPartyIds.length === 0}
                    onClick={() => handleStartGymBattle(selectedGymBoss, selectedGymStageLevel)}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-mono font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 flex items-center space-x-2"
                  >
                    <span>Commence Trial (Lv. {selectedGymStageLevel})</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Player Challenge Prep Modal (Opponent Showcase & Player Team Editor) */}
        <AnimatePresence>
          {isPlayerChallengePrepOpen && selectedChallengeOpponent && (
            <div
              className="fixed inset-0 z-[70] flex flex-col items-center justify-center p-2 sm:p-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-black/85 backdrop-blur-md select-none overflow-y-auto"
              onClick={() => setIsPlayerChallengePrepOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-3xl max-h-[85dvh] sm:max-h-[90dvh] bg-[#0b101e] border border-rose-500/30 rounded-2xl shadow-[0_0_50px_rgba(244,63,94,0.2)] flex flex-col text-gray-200 overflow-hidden my-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 flex-shrink-0 sticky top-0 z-30 bg-[#0b101e]">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-rose-500/50 bg-black/50 flex-shrink-0">
                      <img
                        src={`/assets/inventory_portraits/${getPortraitFileName(selectedChallengeOpponent.avatarId)}`}
                        alt={selectedChallengeOpponent.username}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base sm:text-lg font-bold text-white font-display">
                          Challenge @{selectedChallengeOpponent.username}
                        </h3>
                      </div>
                      <p className="text-xs font-mono text-rose-300">
                        {selectedChallengeOpponent.customTitle || "Resonator Champion"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsPlayerChallengePrepOpen(false)}
                    className="group p-2 sm:p-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-white transition-all border border-rose-400/40 hover:border-rose-400/70 active:scale-95 cursor-pointer flex-shrink-0 min-w-[38px] min-h-[38px] flex items-center justify-center shadow-[0_0_12px_rgba(244,63,94,0.2)]"
                    title="Close Player Challenge"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] text-rose-300 group-hover:text-white group-hover:rotate-90 transition-transform duration-200" />
                  </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 pr-2">
                  {/* Tournament Standard Banner */}
                  <div className="p-2.5 rounded-xl bg-gradient-to-r from-yellow-500/15 via-amber-500/10 to-yellow-500/15 border border-yellow-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <Crown className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      <span className="text-xs font-mono font-bold text-yellow-300">
                        TOURNAMENT STANDARD: FIXED LEVEL 100
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400">
                      Sequence (S0–S6) bonuses active
                    </span>
                  </div>

                  {/* Opponent's Showcase Team (Concealed Blind Pick) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400">
                        Opponent&apos;s Showcase Team ({selectedChallengeOpponent.team.length} Resonators):
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">
                        Blind Pick Selection Concealed
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {selectedChallengeOpponent.team.map((_, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl border border-rose-500/20 bg-rose-950/15 flex items-center space-x-2.5"
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-rose-400/30 bg-rose-950/40 flex-shrink-0 flex items-center justify-center font-mono font-black text-rose-400 text-base shadow-inner">
                            ?
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-200 truncate">
                              Classified Resonator #{idx + 1}
                            </p>
                            <p className="text-[9px] font-mono text-rose-400/70">
                              Lv. 100 • Blind Pick
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Your Battle Party (Editable) */}
                  <div className="space-y-2 pt-1 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-300">
                        Your Battle Team ({selectedPartyIds.length}/6):
                      </span>

                      <button
                        type="button"
                        onClick={() => setIsPartyPickerOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-1"
                      >
                        <Users className="w-3.5 h-3.5 text-yellow-400" />
                        <span>Edit Team</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {selectedPartyIds.map((charId) => {
                        const invItem = (inventory || []).find((i) => i.character_id === charId);
                        const seq = Math.max(0, Math.min(6, (invItem?.count || 1) - 1));
                        const sprite = SPRITE_MAP[charId] || `/assets/characters/${charId}_portrait.png`;

                        return (
                          <div
                            key={charId}
                            className="p-2 rounded-xl border border-white/10 bg-white/[0.03] flex items-center space-x-2"
                          >
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/15 bg-black/40 flex-shrink-0">
                              <img
                                src={sprite}
                                alt={charId}
                                className="w-full h-full object-contain"
                                style={{ imageRendering: "pixelated" }}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-1">
                                <p className="text-xs font-bold text-white truncate capitalize">
                                  {charId.replace(/_/g, " ")}
                                </p>
                                <span className="px-1 py-0.2 rounded bg-yellow-400/20 text-yellow-300 text-[8px] font-mono font-bold">
                                  S{seq}
                                </span>
                              </div>
                              <p className="text-[10px] font-mono text-yellow-400">
                                Lv. 100 (Tournament Standard)
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-white/10 pt-3 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsPlayerChallengePrepOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    disabled={selectedPartyIds.length === 0}
                    onClick={handleStartPlayerChallenge}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 flex items-center space-x-2"
                  >
                    <Swords className="w-4 h-4" />
                    <span>Ready &amp; Commence Battle</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Tower of Adversity: Floor Prep Modal */}
        <AnimatePresence>
          {isTowerPrepOpen && selectedTowerFloor && (
            <div
              className="fixed inset-0 z-[70] flex flex-col items-center justify-center p-2 sm:p-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-black/85 backdrop-blur-md select-none overflow-y-auto"
              onClick={() => setIsTowerPrepOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-3xl max-h-[85dvh] sm:max-h-[90dvh] bg-[#0b101e] border border-purple-500/40 rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.2)] flex flex-col text-gray-200 overflow-hidden my-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 flex-shrink-0 sticky top-0 z-30 bg-[#0b101e]">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-purple-500/40 bg-black/50 flex-shrink-0 flex items-center justify-center text-purple-400">
                      <Crown className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base sm:text-lg font-bold text-white font-display">
                          {selectedTowerFloor.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Lv. {selectedTowerFloor.recommendedLevel}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-purple-300/80">
                        {selectedTowerFloor.subtitle}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsTowerPrepOpen(false)}
                    className="group p-2 sm:p-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/35 text-purple-200 hover:text-white transition-all border border-purple-400/40 hover:border-purple-400/70 active:scale-95 cursor-pointer flex-shrink-0 min-w-[38px] min-h-[38px] flex items-center justify-center shadow-[0_0_12px_rgba(168,85,247,0.25)]"
                    title="Close Tower Floor"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] text-purple-200 group-hover:text-white group-hover:rotate-90 transition-transform duration-200" />
                  </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 pr-2">
                  {/* Rewards and Persistent HP Notice */}
                  <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span>
                        <strong className="text-white">Floor Rewards:</strong>{" "}
                        <span className="text-yellow-300 font-bold">+{selectedTowerFloor.astriteReward} Astrite</span>
                        {" • "}
                        <span className="text-emerald-400 font-bold">+{selectedTowerFloor.combatExpReward} Combat EXP</span>
                      </span>
                    </div>
                    <div className="text-gray-400 text-[11px]">
                      Persistent HP &amp; Draft 3 Blessings on clear
                    </div>
                  </div>

                  {/* Adversity Guardians (Concealed Enemy Lineup) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400">
                        Adversity Guardians ({selectedTowerFloor.enemyTeamIds.length} Enemies - Blind Encounter):
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">
                        Concealed Intel
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {selectedTowerFloor.enemyTeamIds.map((_, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl border border-purple-500/20 bg-purple-950/15 flex items-center space-x-2.5"
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-purple-400/30 bg-purple-950/40 flex-shrink-0 flex items-center justify-center font-mono font-black text-purple-400 text-base shadow-inner">
                            ?
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-200 truncate">
                              {idx === selectedTowerFloor.enemyTeamIds.length - 1 && selectedTowerFloor.isBossFloor
                                ? "Apex Guardian Boss"
                                : `Floor Guardian #${idx + 1}`}
                            </p>
                            <p className="text-[9px] font-mono text-purple-400/70">
                              Lv. {selectedTowerFloor.recommendedLevel} • Concealed
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active Blessings (if any) */}
                  {towerRunState.activeBlessings.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                        Active Gauntlet Blessings ({towerRunState.activeBlessings.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {towerRunState.activeBlessings.map((b, i) => (
                          <div
                            key={b.id + i}
                            className="px-2 py-0.5 rounded-lg border border-cyan-400/30 bg-cyan-950/20 text-cyan-300 text-[10px] font-mono flex items-center space-x-1"
                          >
                            <span className="font-bold">{b.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Your Battle Team (Editable or Locked with Persistent HP) */}
                  <div className="space-y-2 pt-1 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-yellow-300">
                        Your Battle Team ({
                          ((towerRunState.lockedPartyIds && towerRunState.lockedPartyIds.length > 0)
                            ? towerRunState.lockedPartyIds
                            : selectedPartyIds
                          ).length
                        }/6):
                      </span>

                      {towerRunState.lockedPartyIds && towerRunState.lockedPartyIds.length > 0 ? (
                        <div className="px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono font-bold text-xs uppercase tracking-wider flex items-center space-x-1">
                          <Lock className="w-3.5 h-3.5 text-purple-400" />
                          <span>Squad Locked</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsPartyPickerOpen(true)}
                          className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-1"
                        >
                          <Users className="w-3.5 h-3.5 text-yellow-400" />
                          <span>Edit Team</span>
                        </button>
                      )}
                    </div>

                    {towerRunState.isWipedOut && (
                      <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/50 flex items-center space-x-2 text-xs font-mono text-rose-300">
                        <Skull className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        <span><strong>SQUAD WIPED OUT:</strong> All 6 Resonators have fainted. Reset run below to climb again.</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {((towerRunState.lockedPartyIds && towerRunState.lockedPartyIds.length > 0)
                        ? towerRunState.lockedPartyIds
                        : selectedPartyIds
                      ).map((charId) => {
                        const invItem = (inventory || []).find((i) => i.character_id === charId);
                        const seq = Math.max(0, Math.min(6, (invItem?.count || 1) - 1));
                        const currentLvl = getResonatorLevel(charId, currentUserId);
                        const sprite = SPRITE_MAP[charId] || `/assets/characters/${charId}_portrait.png`;
                        const savedHp = towerRunState.partyHpMap[charId];
                        const isFainted = savedHp === 0;

                        return (
                          <div
                            key={charId}
                            className={`p-2 rounded-xl border flex items-center space-x-2 ${
                              isFainted
                                ? "bg-red-950/20 border-red-500/30 opacity-60"
                                : "bg-white/[0.02] border-white/10"
                            }`}
                          >
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/15 bg-black/40 flex-shrink-0">
                              <img
                                src={sprite}
                                alt={charId}
                                className="w-full h-full object-contain"
                                style={{ imageRendering: "pixelated" }}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-1">
                                <p className="text-xs font-bold text-white truncate capitalize">
                                  {charId.replace(/_/g, " ")}
                                </p>
                                <span className="px-1 py-0.2 rounded bg-yellow-400/20 text-yellow-300 text-[8px] font-mono font-bold">
                                  S{seq}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1 text-[9px] font-mono mt-0.5">
                                <span className="text-cyan-400">Lv. {currentLvl}</span>
                                {savedHp !== undefined && (
                                  <span className={isFainted ? "text-red-400 font-bold" : "text-emerald-400"}>
                                    • {isFainted ? "FAINTED" : `HP: ${savedHp}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {Array.from({
                        length: Math.max(
                          0,
                          6 -
                            ((towerRunState.lockedPartyIds && towerRunState.lockedPartyIds.length > 0)
                              ? towerRunState.lockedPartyIds
                              : selectedPartyIds
                            ).length
                        ),
                      }).map((_, idx) => {
                        const isLocked = Boolean(
                          towerRunState.lockedPartyIds && towerRunState.lockedPartyIds.length > 0
                        );
                        return (
                          <button
                            key={`empty-prep-${idx}`}
                            type="button"
                            disabled={isLocked}
                            onClick={() => {
                              if (!isLocked) {
                                setIsPartyPickerOpen(true);
                              }
                            }}
                            className={`p-2 rounded-xl border border-dashed flex items-center space-x-2 min-h-[58px] transition-all text-left ${
                              isLocked
                                ? "border-white/10 bg-white/[0.01] opacity-30 cursor-not-allowed"
                                : "border-purple-500/40 bg-purple-500/5 hover:bg-purple-500/15 hover:border-purple-400 cursor-pointer active:scale-98 group"
                            }`}
                          >
                            <div className="w-10 h-10 rounded-lg border border-dashed border-white/20 flex items-center justify-center text-white/40 group-hover:text-purple-300 group-hover:border-purple-400/60 bg-black/30 flex-shrink-0 transition-colors">
                              <Plus className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white/60 group-hover:text-purple-200 transition-colors">
                                Empty Slot
                              </p>
                              <p className="text-[9px] font-mono text-white/40 group-hover:text-purple-300/80">
                                {isLocked ? "Squad Locked" : "+ Add Resonator"}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between border-t border-white/10 pt-3 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsTowerPrepOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    Back
                  </button>

                  {towerRunState.isWipedOut ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleResetTowerRun();
                        setIsTowerPrepOpen(false);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 flex items-center space-x-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reset Tower Run (Squad Wiped Out)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={
                        ((towerRunState.lockedPartyIds && towerRunState.lockedPartyIds.length > 0)
                          ? towerRunState.lockedPartyIds
                          : selectedPartyIds
                        ).length === 0
                      }
                      onClick={() => {
                        setIsTowerPrepOpen(false);
                        handleStartTowerFloor(selectedTowerFloor);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 flex items-center space-x-2"
                    >
                      <Swords className="w-4 h-4" />
                      <span>Ready &amp; Deploy (Floor {selectedTowerFloor.floor})</span>
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Tower of Adversity: Blessing Draft Modal */}
        <AnimatePresence>
          {isDraftingBlessing && draftOptions.length > 0 && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md select-none overflow-y-auto">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="w-full max-w-2xl max-h-[85dvh] sm:max-h-[90dvh] bg-gradient-to-b from-[#120d24] via-[#090b16] to-[#060810] border border-purple-500/50 rounded-2xl shadow-[0_0_60px_rgba(168,85,247,0.3)] flex flex-col overflow-hidden text-gray-200"
              >
                {/* Header */}
                <div className="text-center space-y-1.5 p-4 sm:p-5 border-b border-white/10 bg-[#0c0919] flex-shrink-0">
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-mono font-bold uppercase tracking-wider">
                    <span>FLOOR CLEARED!</span>
                  </div>
                  <h3 className="text-xl sm:text-3xl font-black text-white font-display uppercase tracking-widest">
                    BLESSING
                  </h3>
                  <p className="text-xs font-mono text-gray-400">
                    {isRevivePickerOpen
                      ? "Select a fallen Resonator to revive with 70% Max HP."
                      : "Select 1 blessing to strengthen your party for the remaining floors."}
                  </p>
                </div>

                {/* Body: Revive Picker or Blessing Cards */}
                {isRevivePickerOpen ? (
                  <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto space-y-3">
                    <div className="text-xs font-mono font-bold text-rose-300 uppercase tracking-wider flex items-center justify-between">
                      <span>Fallen Resonators</span>
                      <span className="text-[11px] text-gray-400 font-normal">Restores 70% Max HP</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {((towerRunState.lockedPartyIds && towerRunState.lockedPartyIds.length > 0)
                        ? towerRunState.lockedPartyIds
                        : selectedPartyIds
                      )
                        .filter((charId) => (towerRunState.partyHpMap[charId] ?? 1) <= 0)
                        .map((charId) => {
                          const invItem = (inventory || []).find((i) => i.character_id === charId);
                          const seq = Math.max(0, Math.min(6, (invItem?.count || 1) - 1));
                          const currentLvl = getResonatorLevel(charId, currentUserId);
                          const maxHp = 1000 + currentLvl * 35;
                          const revivedHp = Math.round(maxHp * 0.7);
                          const sprite = SPRITE_MAP[charId] || `/assets/characters/${charId}_portrait.png`;

                          return (
                            <div
                              key={charId}
                              className="p-3 rounded-xl border border-rose-500/40 bg-rose-950/20 flex items-center justify-between space-x-3"
                            >
                              <div className="flex items-center space-x-3 min-w-0">
                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-rose-400/40 bg-black/50 flex-shrink-0">
                                  <img
                                    src={sprite}
                                    alt={charId}
                                    className="w-full h-full object-contain grayscale"
                                    style={{ imageRendering: "pixelated" }}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center space-x-1.5">
                                    <p className="text-sm font-bold text-white truncate capitalize">
                                      {charId.replace(/_/g, " ")}
                                    </p>
                                    <span className="px-1 py-0.2 rounded bg-yellow-400/20 text-yellow-300 text-[8px] font-mono font-bold">
                                      S{seq}
                                    </span>
                                  </div>
                                  <p className="text-[10px] font-mono text-rose-300 mt-0.5">
                                    Lv. {currentLvl} • Revives with {revivedHp} HP
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleConfirmReviveResonator(charId)}
                                className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex-shrink-0"
                              >
                                Revive
                              </button>
                            </div>
                          );
                        })}
                    </div>

                    <div className="pt-2 flex justify-start">
                      <button
                        type="button"
                        onClick={() => {
                          setIsRevivePickerOpen(false);
                          setSelectedReviveBlessing(null);
                        }}
                        className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-gray-300 transition-all"
                      >
                        Back to Blessings
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {draftOptions.map((bless) => {
                        const isMythic = bless.rarity === "mythic";
                        const isLegendary = bless.rarity === "legendary";
                        const isEpic = bless.rarity === "epic";

                        return (
                          <div
                            key={bless.id}
                            className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all relative overflow-hidden group min-h-[160px] ${
                              isMythic
                                ? "bg-rose-950/30 border-rose-500/70 shadow-[0_0_25px_rgba(244,63,94,0.25)] hover:border-rose-400"
                                : isLegendary
                                ? "bg-amber-950/20 border-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.15)] hover:border-amber-400"
                                : isEpic
                                ? "bg-purple-950/20 border-purple-400/60 shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:border-purple-400"
                                : "bg-cyan-950/20 border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.1)] hover:border-cyan-400"
                            }`}
                          >
                            {/* Rarity on top-left, no emojis */}
                            <div className="flex items-center justify-start">
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase tracking-wider ${
                                  isMythic
                                    ? "bg-gradient-to-r from-rose-600 to-red-500 text-white border border-rose-300 shadow-md"
                                    : isLegendary
                                    ? "bg-amber-400 text-black shadow-sm"
                                    : isEpic
                                    ? "bg-purple-500 text-white"
                                    : "bg-cyan-500 text-black"
                                }`}
                              >
                                {bless.rarity}
                              </span>
                            </div>

                            {/* Clean, simple stat taking 2 seconds to read */}
                            <div className="my-auto py-2 text-center">
                              <h4 className="text-xl sm:text-2xl font-black text-white font-display tracking-wide">
                                {bless.name}
                              </h4>
                              {bless.description && bless.description !== bless.name && (
                                <p className="text-[11px] font-mono text-gray-300 mt-1 leading-snug">
                                  {bless.description}
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSelectBlessing(bless)}
                              className={`w-full py-2.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center ${
                                isMythic
                                  ? "bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-black shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                                  : isLegendary
                                  ? "bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black font-black"
                                  : isEpic
                                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white"
                                  : "bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white"
                              }`}
                            >
                              <span>Choose</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="py-2.5 px-4 text-center border-t border-white/5 bg-black/20 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDraftingBlessing(false);
                      setDraftOptions([]);
                      setIsRevivePickerOpen(false);
                      setSelectedReviveBlessing(null);
                    }}
                    className="text-xs font-mono text-gray-500 hover:text-gray-300 underline transition-colors"
                  >
                    Skip Blessing
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Party Picker Modal */}
        <AnimatePresence>
          {isPartyPickerOpen && (
            <div
              className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-2 sm:p-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-black/85 backdrop-blur-md select-none overflow-y-auto"
              onClick={() => setIsPartyPickerOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl max-h-[85dvh] sm:max-h-[88dvh] bg-[#0c1220] border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden my-auto"
              >
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 flex-shrink-0 sticky top-0 z-30 bg-[#0c1220]">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-sm sm:text-base font-bold text-white uppercase font-display tracking-wider">
                      Choose 6 Resonators for Battle
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsPartyPickerOpen(false)}
                    className="group p-2 sm:p-2.5 rounded-xl bg-yellow-400/15 hover:bg-yellow-400/25 text-yellow-300 hover:text-white transition-all border border-yellow-400/40 hover:border-yellow-400/70 active:scale-95 cursor-pointer flex-shrink-0 min-w-[38px] min-h-[38px] flex items-center justify-center shadow-[0_0_12px_rgba(250,204,21,0.2)]"
                    title="Close Party Picker"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] text-yellow-300 group-hover:text-white group-hover:rotate-90 transition-transform duration-200" />
                  </button>
                </div>

                {/* Selected 6-slot strip */}
                <div className="px-4 sm:px-6 pt-3 sm:pt-4 space-y-1.5 flex-shrink-0">
                  <span className="text-xs font-mono text-gray-400">
                    Selected Team ({selectedPartyIds.length}/6):
                  </span>
                  <div className="grid grid-cols-6 gap-2">
                    {Array.from({ length: 6 }).map((_, idx) => {
                      const charId = selectedPartyIds[idx];
                      const sprite = charId ? SPRITE_MAP[charId] || `/assets/characters/${charId}_portrait.png` : null;
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (charId) {
                              handleRemoveFromParty(charId);
                            }
                          }}
                          className={`relative aspect-square rounded-xl border flex flex-col items-center justify-center p-1 cursor-pointer transition-all ${
                            charId
                              ? "bg-white/[0.05] border-yellow-400/50 hover:border-rose-500 hover:bg-rose-500/10 group"
                              : "bg-black/40 border-white/10 border-dashed"
                          }`}
                          title={charId ? `Click to remove ${charId}` : "Empty Slot"}
                        >
                          {charId && sprite ? (
                            <>
                              <img
                                src={sprite}
                                alt={charId}
                                loading="lazy"
                                decoding="async"
                                className="w-10 h-10 object-contain"
                                style={{ imageRendering: "pixelated" }}
                              />
                              <span className="text-[8px] font-mono text-gray-300 capitalize truncate max-w-full">
                                {charId.replace(/_/g, " ")}
                              </span>
                              <div className="absolute inset-0 bg-rose-600/80 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                <X className="w-4 h-4" />
                              </div>
                            </>
                          ) : (
                            <span className="text-[10px] font-mono text-gray-600">Empty</span>
                          )}
                          <span className="absolute top-0.5 left-1 text-[8px] font-mono text-gray-500 font-bold">
                            #{idx + 1}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Resonator Selection Grid */}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-2 space-y-2">
                  <span className="text-xs font-mono text-gray-400">Available Resonators (Click to Add):</span>
                  {allRosterCharacters.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02] my-4">
                      <AlertTriangle className="w-8 h-8 text-amber-400 mb-2 opacity-80" />
                      <p className="text-sm font-bold text-gray-200">No Resonators in Inventory</p>
                      <p className="text-xs text-gray-400 mt-1 max-w-sm">
                        You don&apos;t own any Resonators yet. Convene in the Gacha to recruit Resonators before battling!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {allRosterCharacters.map((char) => {
                        const isSelected = selectedPartyIds.includes(char.id);
                        const sprite = SPRITE_MAP[char.id] || `/assets/characters/${char.id}_portrait.png`;
                        return (
                          <div
                            key={char.id}
                            onClick={() => handleTogglePartyResonator(char.id)}
                            className={`p-2 rounded-xl border flex items-center space-x-2 cursor-pointer transition-all ${
                              isSelected
                                ? "bg-yellow-400/20 border-yellow-400 text-white ring-1 ring-yellow-400/50 shadow-md"
                                : "bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06] text-gray-300"
                            }`}
                          >
                            <div className="w-9 h-9 rounded-lg overflow-hidden border border-white/10 bg-black/40 flex-shrink-0">
                              <img
                                src={sprite}
                                alt={char.name}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-contain"
                                style={{ imageRendering: "pixelated" }}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold truncate">{char.name}</p>
                              <p className={`text-[9px] font-mono ${ELEMENT_COLORS[char.element as ResonatorElement]?.text || "text-gray-300"}`}>
                                {char.element}
                              </p>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-white/10 bg-[#0c1220] flex-shrink-0">
                  <p className="text-xs font-mono text-gray-400">
                    {selectedPartyIds.length === 0
                      ? "Select at least 1 resonator for battle"
                      : selectedPartyIds.length < 6 && allRosterCharacters.length > selectedPartyIds.length
                      ? `${selectedPartyIds.length}/6 selected (can add ${Math.min(6 - selectedPartyIds.length, allRosterCharacters.length - selectedPartyIds.length)} more)`
                      : `${selectedPartyIds.length} resonator${selectedPartyIds.length > 1 ? "s" : ""} selected`}
                  </p>
                  <button
                    onClick={() => {
                      if (selectedPartyIds.length > 0) {
                        handleSaveParty();
                        setIsPartyPickerOpen(false);
                      }
                    }}
                    disabled={selectedPartyIds.length === 0}
                    className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    Confirm Party
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Forfeit Confirmation Modal */}
        <AnimatePresence>
          {showExitConfirm && (
            <div
              className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowExitConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-[#0d121f] border border-rose-500/50 rounded-2xl p-5 shadow-[0_0_50px_rgba(244,63,94,0.3)] space-y-4"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-display uppercase tracking-wide">
                      Forfeit &amp; Leave Battle?
                    </h3>
                    <p className="text-xs font-mono text-gray-400">
                      Leaving now counts as an immediate defeat.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-gray-300 space-y-1.5">
                  {isRealtimeMatch && (
                    <p>
                      • Your PvP battle record will register{" "}
                      <span className="text-rose-400 font-bold">+1 Loss</span>.
                    </p>
                  )}
                  {isRealtimeMatch && selectedBet > 0 ? (
                    <p className="text-amber-300 font-semibold flex items-center space-x-1">
                      <span>• Your bet of</span>
                      <span className="font-bold text-yellow-400">{selectedBet} Astrite</span>
                      <span>will be surrendered to your opponent!</span>
                    </p>
                  ) : (
                    <p>• You will forfeit the match and earn 0 rewards.</p>
                  )}
                </div>

                <div className="flex space-x-3 pt-1">
                  <button
                    onClick={() => setShowExitConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    Keep Fighting
                  </button>
                  <button
                    onClick={() => {
                      setShowExitConfirm(false);
                      if (isRealtimeMatch) {
                        realtimeManagerRef.current?.sendAction({
                          type: "forfeit",
                          senderId: playerTrainer?.id || "",
                        });
                        realtimeManagerRef.current?.leaveRoom();
                      }
                      handleBattleEnd("opponent");
                      closeAllSubModals();
                      clearPlayerSearch();
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-600/30 transition-all"
                  >
                    Forfeit Match
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Resonator Downed: Replacement Picker Modal */}
        <AnimatePresence>
          {isFaintPickerOpen && playerTrainer && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="w-full max-w-xl bg-[#0b101c] border border-rose-500/50 rounded-2xl p-5 sm:p-6 shadow-[0_0_60px_rgba(244,63,94,0.35)] space-y-4"
              >
                <div className="flex items-center space-x-3 border-b border-white/10 pb-4">
                  <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <Skull className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white font-display uppercase tracking-wider">
                      Resonator Downed — Choose Replacement
                    </h3>
                    <p className="text-xs font-mono text-gray-400">
                      Your active resonator has fallen! Select your next combatant to enter the field.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {playerTrainer.team.map((res, idx) => {
                    const isDown = res.isFainted;
                    const hpPercent = Math.max(0, Math.min(100, Math.round((res.hp / res.maxHp) * 100)));
                    const elemColor = ELEMENT_COLORS[res.element] || {
                      bg: "bg-purple-500/20",
                      text: "text-purple-300",
                      border: "border-purple-500/40",
                      glow: "shadow-purple-500/20",
                    };

                    return (
                      <button
                        key={`${res.id}_${idx}`}
                        disabled={isDown}
                        onClick={() => handleSelectFaintReplacement(idx)}
                        className={`group relative p-3 rounded-xl border text-left flex items-center space-x-3 transition-all ${
                          isDown
                            ? "bg-black/40 border-white/5 opacity-40 cursor-not-allowed grayscale"
                            : "bg-white/[0.04] hover:bg-white/[0.08] border-white/15 hover:border-cyan-400/60 shadow-md hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] cursor-pointer active:scale-[0.98]"
                        }`}
                      >
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-black/60 border border-white/10 shrink-0">
                          <img
                            src={res.portraitUrl || `/assets/characters/${res.id}_portrait.png`}
                            alt={res.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/assets/characters/rover_portrait.png";
                            }}
                          />
                          {isDown && (
                            <div className="absolute inset-0 bg-red-950/80 flex items-center justify-center">
                              <span className="text-[9px] font-mono font-bold text-rose-300 uppercase">DOWN</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1.5 mb-1">
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border uppercase ${elemColor.bg} ${elemColor.text} ${elemColor.border}`}
                            >
                              {res.element}
                            </span>
                            <span className="text-xs font-bold text-white truncate font-display">{res.name}</span>
                          </div>

                          {/* HP Bar */}
                          <div className="w-full h-1.5 rounded-full bg-black/60 overflow-hidden border border-white/10 mb-1">
                            <div
                              className={`h-full transition-all duration-300 ${
                                hpPercent > 50 ? "bg-emerald-400" : hpPercent > 25 ? "bg-amber-400" : "bg-rose-500"
                              }`}
                              style={{ width: `${hpPercent}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                            <span>
                              HP: {res.hp}/{res.maxHp}
                            </span>
                            <span className="text-cyan-300 font-semibold">{hpPercent}%</span>
                          </div>
                        </div>

                        {!isDown && (
                          <div className="shrink-0 text-xs font-mono font-bold text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                            DEPLOY →
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Shorekeeper Team Sync: Assist Picker Modal */}
        <AnimatePresence>
          {isTeamSyncPickerOpen && playerTrainer && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="w-full max-w-xl bg-[#0b101c] border border-cyan-500/50 rounded-2xl p-5 sm:p-6 shadow-[0_0_60px_rgba(6,182,212,0.35)] space-y-4"
              >
                <div className="flex items-center space-x-3 border-b border-white/10 pb-4">
                  <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    <Sparkles className="w-6 h-6 animate-spin" style={{ animationDuration: "6s" }} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white font-display uppercase tracking-wider flex items-center space-x-2">
                      <span>{pendingTeamSyncMove?.teamSync?.title || "Team Sync Assist"}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-400/20 text-cyan-300 border border-cyan-400/40">
                        100% CRIT
                      </span>
                    </h3>
                    <p className="text-xs font-mono text-gray-400">
                      {pendingTeamSyncMove?.teamSync?.description || "Select a bench teammate to execute a Synchronized Critical Strike (80% ACC, 135 PWR)!"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {playerTrainer.team
                    .map((res, idx) => ({ res, idx }))
                    .filter(({ res, idx }) => idx !== playerTrainer.activeIdx && !res.isFainted)
                    .map(({ res }) => {
                      const elemColor = ELEMENT_COLORS[res.element] || {
                        bg: "bg-purple-500/20",
                        text: "text-purple-300",
                        border: "border-purple-500/40",
                        glow: "shadow-purple-500/20",
                      };
                      const hpPercent = Math.max(0, Math.min(100, Math.round((res.hp / res.maxHp) * 100)));

                      return (
                        <button
                          key={res.id}
                          onClick={() => handleExecuteTeamSync(res.id)}
                          className="group relative p-3 rounded-xl border bg-white/[0.04] hover:bg-cyan-950/30 border-white/15 hover:border-cyan-400/60 shadow-md hover:shadow-[0_0_20px_rgba(34,211,238,0.25)] text-left flex items-center space-x-3 transition-all cursor-pointer active:scale-[0.98]"
                        >
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-black/60 border border-white/10 shrink-0">
                            <img
                              src={res.portraitUrl || `/assets/characters/${res.id}_portrait.png`}
                              alt={res.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/assets/characters/rover_portrait.png";
                              }}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-1.5 mb-1">
                              <span
                                className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border uppercase ${elemColor.bg} ${elemColor.text} ${elemColor.border}`}
                              >
                                {res.element}
                              </span>
                              <span className="text-xs font-bold text-white truncate font-display">{res.name}</span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                              <span>ATK: {res.atk}</span>
                              <span className="text-cyan-300 font-semibold">{hpPercent}% HP</span>
                            </div>
                          </div>

                          <div className="shrink-0 text-xs font-mono font-bold text-cyan-400 group-hover:scale-110 transition-transform">
                            SYNC ⚡
                          </div>
                        </button>
                      );
                    })}
                </div>

                <div className="flex justify-end pt-2 border-t border-white/10">
                  <button
                    onClick={() => {
                      setIsTeamSyncPickerOpen(false);
                      if (pendingTeamSyncMove) {
                        const m = pendingTeamSyncMove;
                        setPendingTeamSyncMove(null);
                        // Fallback to regular solo move
                        const soloMove = { ...m, teamSync: undefined };
                        handlePlayerMove(soloMove);
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white font-mono text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Cancel (Solo Liberation)
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
