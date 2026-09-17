"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Star,
  Sparkles,
  Briefcase,
  User,
  Check,
  AlertCircle,
  RotateCcw,
  Plus,
  ArrowRight,
  ArrowLeft,
  Eye,
  SlidersHorizontal,
  Users,
  Award,
  Pencil,
  Settings,
  Flame,
} from "lucide-react";
import { soundEngine } from "@/lib/audio/soundEngine";
import { RESONATORS } from "@/lib/data/items";
import {
  getPortraitFileName,
  getResonatorTitle,
  DEFAULT_AVATAR_ID,
  INVENTORY_PORTRAITS,
} from "@/lib/data/portraits";
import {
  searchPlayerProfile,
  searchPlayersList,
  PlayerSearchResult,
  updateShowcaseResonatorIds,
  getStoredShowcaseResonatorIds,
  PlayerPublicProfile,
} from "@/lib/supabase/auth";
import {
  UserInventoryItem,
  MAX_WAVEBAND_COUNT,
  STANDARD_5_STAR_LOSSES,
} from "@/lib/supabase/inventory";
import { TitlePickerModal } from "@/components/modals/TitlePickerModal";
import {
  PlayerTitle,
  getStoredUserTitle,
  updateUserTitle,
  buildTitleContext,
  findTitleByName,
  getStoredClaimedTitles,
  claimTitleReward,
} from "@/lib/data/titles";
import { getClientHistory, get5050Stats } from "@/lib/gacha/clientSim";

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  currentUsername: string;
  currentAvatarId: string;
  initialShowcaseIds?: string[];
  initialCustomTitle?: string;
  astrite?: number;
  pity5Star?: number;
  inventory: UserInventoryItem[];
  winRateFormatted?: string;
  totalPulls?: number;
  onInspectInventory: (
    targetInventory: UserInventoryItem[],
    targetUsername: string,
    isReadOnly: boolean
  ) => void;
  onOpenAccountModal?: () => void;
  visitedProfile?: PlayerPublicProfile | null;
  onVisitedProfileChange?: (profile: PlayerPublicProfile | null) => void;
  onAstriteClaimed?: (amount: number) => void;
  isVip?: boolean;
  loginStreak?: number;
  maxLoginStreak?: number;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  currentUsername,
  currentAvatarId,
  initialShowcaseIds,
  initialCustomTitle,
  astrite = 0,
  pity5Star = 0,
  inventory,
  winRateFormatted = "N/A",
  totalPulls = 0,
  onInspectInventory,
  onOpenAccountModal,
  visitedProfile: externalVisitedProfile,
  onVisitedProfileChange,
  onAstriteClaimed,
  isVip = false,
  loginStreak = 1,
  maxLoginStreak = 1,
}) => {
  // Modal View Tab: 'profile' (viewing a profile) or 'visit' (searching other players)
  const [activeTab, setActiveTab] = useState<"profile" | "visit">("profile");
  const [navSource, setNavSource] = useState<"profile" | "visit">("profile");

  // Search State
  const [searchInput, setSearchInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Search Results List
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([]);
  const [isSearchListOpen, setIsSearchListOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [visitingPlayerId, setVisitingPlayerId] = useState<string | null>(null);

  // Active viewed profile state (controlled by parent if passed, or internal state)
  const [internalVisitedProfile, setInternalVisitedProfile] = useState<PlayerPublicProfile | null>(null);
  const visitedProfile = externalVisitedProfile !== undefined ? externalVisitedProfile : internalVisitedProfile;
  const setVisitedProfile = (p: PlayerPublicProfile | null) => {
    setInternalVisitedProfile(p);
    if (onVisitedProfileChange) onVisitedProfileChange(p);
  };

  // Own Showcase Resonator IDs (up to 6)
  const [ownShowcaseIds, setOwnShowcaseIds] = useState<string[]>([]);
  const [isShowcasePickerOpen, setIsShowcasePickerOpen] = useState(false);
  const [tempShowcaseIds, setTempShowcaseIds] = useState<string[]>([]);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerElementFilter, setPickerElementFilter] = useState("ALL");
  const [isSavingShowcase, setIsSavingShowcase] = useState(false);

  // Own Favorites from LocalStorage
  const [ownFavorites, setOwnFavorites] = useState<Set<string>>(new Set());

  // Dedicated Player Title State (decoupled from avatar portrait, strictly per-user)
  const [ownTitle, setOwnTitle] = useState<string>(() => {
    return initialCustomTitle || getStoredUserTitle(currentUserId);
  });
  const [isTitlePickerOpen, setIsTitlePickerOpen] = useState<boolean>(false);
  const [claimedTitles, setClaimedTitles] = useState<string[]>(() => {
    return getStoredClaimedTitles(currentUserId);
  });

  // Sync own title and claimed titles on open / userId / initialCustomTitle change
  useEffect(() => {
    if (isOpen) {
      setOwnTitle(initialCustomTitle || getStoredUserTitle(currentUserId));
      setClaimedTitles(getStoredClaimedTitles(currentUserId));
    }
  }, [currentUserId, initialCustomTitle, isOpen]);

  // Load own favorites on mount / username change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storageKey = `wuwa_inventory_favorites_${currentUsername}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setOwnFavorites(new Set(JSON.parse(saved)));
      }
    } catch {}
  }, [currentUsername, isOpen]);

  // Load own showcase IDs on open & synchronize immediately to Supabase
  useEffect(() => {
    if (!isOpen) {
      setActiveTab("profile");
      setSearchInput("");
      setSearchError(null);
      setSearchResults([]);
      setIsSearchListOpen(false);
      setHasSearched(false);
      setIsShowcasePickerOpen(false);
      return;
    }

    const ownedIds = new Set((inventory || []).map((i) => i.character_id.toLowerCase()));

    const sanitizeList = (ids: (string | undefined | null)[]): string[] => {
      const result: string[] = [];
      for (const id of ids) {
        if (!id || typeof id !== "string") continue;
        const lower = id.toLowerCase();
        if (ownedIds.has(lower) && !result.some((r) => r.toLowerCase() === lower)) {
          const actual =
            (inventory || []).find((i) => i.character_id.toLowerCase() === lower)
              ?.character_id || id;
          result.push(actual);
          if (result.length >= 6) break;
        }
      }
      return result;
    };

    let determined: string[] = [];

    // 1. If passed from profile (directly from Supabase profiles table), sanitize against owned inventory
    if (initialShowcaseIds && Array.isArray(initialShowcaseIds) && initialShowcaseIds.length > 0) {
      determined = sanitizeList(initialShowcaseIds);
    }

    // 2. Try saved showcase IDs in localStorage (sanitized)
    if (determined.length === 0) {
      const stored = getStoredShowcaseResonatorIds(currentUserId);
      if (stored && stored.length > 0) {
        determined = sanitizeList(stored);
      }
    }

    // 3. Default: take favorited resonators from inventory (sanitized)
    if (determined.length === 0) {
      const favIds: string[] = [];
      try {
        const storageKey = `wuwa_inventory_favorites_${currentUsername}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            favIds.push(...parsed);
          }
        }
      } catch {}

      determined = sanitizeList(favIds);
    }

    // 4. Fallback: if player hasn't favorited or customized, default to owned inventory resonators (up to 6)
    if (determined.length === 0) {
      determined = (inventory || []).map((item) => item.character_id).slice(0, 6);
    }

    setOwnShowcaseIds(determined);

    // CRITICAL: Synchronize clean determined list to localStorage and Supabase profiles table, purging phantom IDs
    if (currentUserId) {
      updateShowcaseResonatorIds(currentUserId, determined).catch(() => {});
    }
  }, [isOpen, currentUserId, currentUsername, inventory, initialShowcaseIds]);

  // Debounced live search when typing in searchInput
  useEffect(() => {
    const cleanQuery = searchInput.trim().replace(/^@+/, "");
    if (!cleanQuery) {
      setSearchResults([]);
      setIsSearchListOpen(false);
      setHasSearched(false);
      setSearchError(null);
      return;
    }

    // Free-tier optimization: If query is less than 2 characters, do NOT query Supabase!
    if (cleanQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setHasSearched(true);
      setIsSearchListOpen(true);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      setHasSearched(true);
      setIsSearchListOpen(true);

      try {
        const res = await searchPlayersList(cleanQuery);
        if (res.error) {
          setSearchError(res.error);
          setSearchResults([]);
        } else {
          setSearchResults(res.players);
        }
      } catch (err: any) {
        setSearchError(err.message || "Failed to search players.");
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Handle Search submit: immediate search on Enter or button click
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = searchInput.trim().replace(/^@+/, "");
    if (!cleanQuery) return;

    if (cleanQuery.length < 2) {
      setSearchError("Please enter at least 2 characters to search.");
      return;
    }

    soundEngine.playClick();
    setSearchError(null);
    setIsSearching(true);
    setHasSearched(true);
    setIsSearchListOpen(true);

    try {
      const res = await searchPlayersList(cleanQuery);
      if (res.error) {
        setSearchError(res.error);
        setSearchResults([]);
      } else {
        setSearchResults(res.players);
      }
    } catch (err: any) {
      setSearchError(err.message || "Failed to search players.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Visit a player profile from the search list
  const handleVisitPlayer = async (targetPlayer: PlayerSearchResult) => {
    soundEngine.playClick();
    setVisitingPlayerId(targetPlayer.id);
    setIsSearching(true);
    setSearchError(null);

    // If visiting self, return to own profile
    if (targetPlayer.username.toLowerCase() === currentUsername.toLowerCase()) {
      setVisitedProfile(null);
      setActiveTab("profile");
      setIsSearchListOpen(false);
      setIsSearching(false);
      setVisitingPlayerId(null);
      return;
    }

    try {
      const res = await searchPlayerProfile(targetPlayer.username);
      if (res.error) {
        setSearchError(res.error);
      } else if (res.profile) {
        setVisitedProfile(res.profile);
        setNavSource("visit");
        setActiveTab("profile");
        setIsSearchListOpen(false);
        setSearchError(null);
      }
    } catch (err: any) {
      setSearchError(err.message || "Failed to load player profile.");
    } finally {
      setIsSearching(false);
      setVisitingPlayerId(null);
    }
  };

  // Close modal and clear visited session
  const handleClose = () => {
    soundEngine.playClick();
    setVisitedProfile(null);
    setActiveTab("profile");
    setNavSource("profile");
    onClose();
  };

  // Reset back to own profile
  const handleResetToSelf = () => {
    soundEngine.playClick();
    setVisitedProfile(null);
    setActiveTab("profile");
    setNavSource("profile");
    setSearchInput("");
    setSearchError(null);
    setIsSearchListOpen(false);
    setSearchResults([]);
    setHasSearched(false);
  };

  // Active profile being rendered
  const isViewingSelf = !visitedProfile;
  const activeUsername = visitedProfile ? visitedProfile.username : currentUsername;
  const activeAvatarId = visitedProfile ? visitedProfile.avatar_id : currentAvatarId;
  const activeInventory = visitedProfile ? visitedProfile.inventory : inventory;
  const activeAstrites = visitedProfile ? visitedProfile.astrite : astrite;
  const activePity = visitedProfile ? visitedProfile.pity_5star : pity5Star;

  // Equipped player title (decoupled from avatar portrait)
  const activeEquippedTitle = useMemo(() => {
    if (isViewingSelf) {
      return ownTitle || getStoredUserTitle(currentUserId);
    }
    return visitedProfile?.custom_title || getResonatorTitle(activeAvatarId);
  }, [isViewingSelf, ownTitle, currentUserId, visitedProfile, activeAvatarId]);

  // Equip title handler
  const handleEquipTitle = async (titleName: string) => {
    setOwnTitle(titleName);
    if (currentUserId) {
      await updateUserTitle(currentUserId, titleName);
    }
    setIsTitlePickerOpen(false);
  };

  // Claim title reward handler
  const handleClaimTitle = async (title: PlayerTitle) => {
    soundEngine.playGoldStinger();
    const res = await claimTitleReward(currentUserId, title);
    if (res.success) {
      setClaimedTitles(res.claimedTitles);
      if (res.rewardAstrite > 0 && onAstriteClaimed) {
        onAstriteClaimed(res.rewardAstrite);
      }
    }
  };

  // Build title context for TitlePickerModal
  const clientHistory = useMemo(() => {
    if (typeof window === "undefined") return [];
    return getClientHistory(1, 1000).logs || [];
  }, [isOpen]);

  const titleContext = useMemo(() => {
    const stats = get5050Stats();
    return buildTitleContext(
      inventory,
      totalPulls,
      clientHistory,
      stats.wins5050,
      stats.total5050,
      claimedTitles,
      isVip,
      loginStreak,
      maxLoginStreak
    );
  }, [inventory, totalPulls, clientHistory, claimedTitles, isVip, loginStreak, maxLoginStreak]);

  // Active showcase IDs (strictly sanitized against activeInventory)
  const activeShowcaseIds: string[] = useMemo(() => {
    const ownedSet = new Set((activeInventory || []).map((item) => item.character_id.toLowerCase()));

    if (visitedProfile) {
      if (Array.isArray(visitedProfile.showcase_ids) && visitedProfile.showcase_ids.length > 0) {
        const valid = visitedProfile.showcase_ids.filter((id) => id && ownedSet.has(id.toLowerCase()));
        if (valid.length > 0) return valid.slice(0, 6);
      }
      // Visited player hasn't manually customized showcase: show their owned inventory resonators (up to 6)
      return (visitedProfile.inventory || []).map((item) => item.character_id).slice(0, 6);
    }
    if (ownShowcaseIds && ownShowcaseIds.length > 0) {
      const valid = ownShowcaseIds.filter((id) => id && ownedSet.has(id.toLowerCase()));
      if (valid.length > 0) return valid.slice(0, 6);
    }
    return (inventory || []).map((item) => item.character_id).slice(0, 6);
  }, [visitedProfile, ownShowcaseIds, activeInventory, inventory]);

  // 1. Total 5 star Resonators
  const total5StarResonators = activeInventory.length;

  // 2. Total S6 Resonators (THOSE RESONATORS THAT ARE MAXED)
  const totalS6Resonators = useMemo(() => {
    return activeInventory.filter((item) => item.count >= MAX_WAVEBAND_COUNT).length;
  }, [activeInventory]);

  // 3 & 4. Total Pulled Used & Total Astrite Used
  const calculatedPullsUsed = useMemo(() => {
    if (isViewingSelf) {
      return totalPulls;
    }
    return visitedProfile?.total_pulls ?? 0;
  }, [isViewingSelf, totalPulls, visitedProfile]);

  const calculatedAstriteUsed = useMemo(() => {
    return calculatedPullsUsed * 160;
  }, [calculatedPullsUsed]);

  // 5. 50/50 Winrate
  const calculatedWinRate = useMemo(() => {
    if (isViewingSelf) {
      return winRateFormatted || "N/A";
    }
    const wins5050 = visitedProfile?.wins_5050 ?? 0;
    const total5050 = visitedProfile?.total_5050 ?? 0;
    if (total5050 === 0) return "N/A";
    return `${((wins5050 / total5050) * 100).toFixed(1)}%`;
  }, [isViewingSelf, winRateFormatted, visitedProfile]);

  // Open Showcase Editor
  const handleOpenShowcasePicker = () => {
    soundEngine.playClick();
    setTempShowcaseIds([...ownShowcaseIds]);
    setPickerSearch("");
    setPickerElementFilter("ALL");
    setIsShowcasePickerOpen(true);
  };

  // Toggle unit in showcase picker
  const handleTogglePickerUnit = (characterId: string) => {
    soundEngine.playClick();
    setTempShowcaseIds((prev) => {
      if (prev.includes(characterId)) {
        return prev.filter((id) => id !== characterId);
      }
      if (prev.length >= 6) {
        return prev;
      }
      return [...prev, characterId];
    });
  };

  // Save showcase
  const handleSaveShowcase = async () => {
    soundEngine.playClick();
    setIsSavingShowcase(true);
    try {
      const ownedSet = new Set((inventory || []).map((i) => i.character_id.toLowerCase()));
      const sanitized = tempShowcaseIds.filter((id) => ownedSet.has(id.toLowerCase()));

      if (currentUserId) {
        await updateShowcaseResonatorIds(currentUserId, sanitized);
      }
      setOwnShowcaseIds(sanitized);
      setIsShowcasePickerOpen(false);
    } catch (err) {
      console.error("Failed to save showcase IDs:", err);
    } finally {
      setIsSavingShowcase(false);
    }
  };

  // Auto-fill showcase with favorites ONLY
  const handleAutoFillFavorites = () => {
    soundEngine.playClick();
    const favArray = Array.from(ownFavorites);
    const chosen: string[] = [];

    for (const favId of favArray) {
      if (inventory.some((i) => i.character_id === favId) && !chosen.includes(favId)) {
        chosen.push(favId);
        if (chosen.length === 6) break;
      }
    }

    setTempShowcaseIds(chosen);
  };

  // Filtered resonators for showcase picker
  const filteredPickerItems = useMemo(() => {
    return inventory.filter((item) => {
      const res = RESONATORS[item.character_id];
      const name = res?.name || item.character_name || item.character_id;
      const element = res?.element || "Spectro";

      const matchesSearch = name.toLowerCase().includes(pickerSearch.toLowerCase().trim());
      const matchesElem =
        pickerElementFilter === "ALL"
          ? true
          : pickerElementFilter === "FAVORITES"
          ? ownFavorites.has(item.character_id)
          : element === pickerElementFilter;

      return matchesSearch && matchesElem;
    });
  }, [inventory, pickerSearch, pickerElementFilter, ownFavorites]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/95 select-none overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-4xl max-h-[92dvh] bg-[#0a0d14] border-2 border-purple-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ========================================================================= */}
          {/* Top Bar: Visit Other Players / Back to Profile + Stylized Exit Button     */}
          {/* ========================================================================= */}
          <div className="px-4 sm:px-6 py-3 border-b border-purple-500/20 bg-black/70 flex items-center justify-between gap-3 flex-shrink-0">
            {activeTab === "profile" ? (
              /* Profile Mode Header: Visit Other Players Button (+ Back / My Profile button if inspecting) */
              <div className="flex items-center space-x-2 min-w-0">
                {!isViewingSelf && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      if (navSource === "visit") {
                        setVisitedProfile(null);
                        setActiveTab("visit");
                      } else {
                        handleResetToSelf();
                      }
                    }}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-yellow-400/20 hover:bg-yellow-400/30 border border-yellow-400/50 text-yellow-300 hover:text-yellow-100 text-xs font-mono font-bold flex items-center space-x-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                    title={navSource === "visit" ? "Back to Search" : "Return to My Profile"}
                  >
                    <ArrowLeft className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                    <span>{navSource === "visit" ? "Back to Search" : "My Profile"}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveTab("visit");
                  }}
                  className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-purple-600/25 hover:bg-purple-600/40 border border-purple-400/40 text-purple-200 hover:text-white text-xs font-mono font-bold flex items-center space-x-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="Search and Visit Other Players"
                >
                  <Users className="w-3.5 h-3.5 text-purple-300 flex-shrink-0" />
                  <span>Visit Other Players</span>
                </button>
              </div>
            ) : (
              /* Visit Mode Header: Back to Profile Button + Title */
              <div className="flex items-center space-x-3 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveTab("profile");
                  }}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-mono font-bold flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer"
                  title="Back to Profile"
                >
                  <ArrowLeft className="w-4 h-4 text-gray-200 flex-shrink-0" />
                  <span>Back</span>
                </button>
                <div className="flex items-center space-x-1.5 text-xs font-mono font-bold text-purple-300">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span className="hidden sm:inline">Visit Other Players</span>
                </div>
              </div>
            )}

            {/* Right: Anime Vanguards Stylized Exit Button */}
            <button
              onClick={handleClose}
              className="relative p-2 rounded-xl bg-gradient-to-br from-rose-500/25 to-pink-600/30 hover:from-rose-500/40 hover:to-pink-600/50 border border-rose-500/50 text-rose-300 hover:text-white transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] active:scale-95 group flex-shrink-0"
              title="Close Profile"
            >
              <X className="w-5 h-5 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: VISIT OTHERS (Dedicated Player Search View)                        */}
          {/* ========================================================================= */}
          {activeTab === "visit" ? (
            <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-4 bg-[#0a0d14]/90">
              {/* Search Bar Input Form */}
              <form onSubmit={handleSearch} className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by player username (e.g. schmuckey)..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    autoFocus
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-black/80 border border-purple-500/40 text-xs sm:text-sm font-mono text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30 transition-all shadow-inner"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput("");
                        setIsSearchListOpen(false);
                        setSearchResults([]);
                        setHasSearched(false);
                        setSearchError(null);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSearching || !searchInput.trim()}
                  className="px-4 sm:px-5 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 text-purple-200 hover:text-white text-xs sm:text-sm font-mono font-bold flex items-center space-x-1.5 transition-all disabled:opacity-40 cursor-pointer shadow-sm active:scale-95 flex-shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isSearching ? "Searching..." : "Search"}</span>
                </button>
              </form>

              {/* Search Error Alert */}
              {searchError && (
                <div className="px-4 py-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-between text-xs font-mono text-rose-300 animate-fadeIn">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>{searchError}</span>
                  </div>
                  <button onClick={() => setSearchError(null)} className="text-rose-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Results / Empty States */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {isSearching ? (
                  <div className="space-y-2.5 py-2">
                    {[1, 2, 3, 4].map((n) => (
                      <div
                        key={n}
                        className="flex items-center justify-between p-3 rounded-2xl bg-black/50 border border-purple-500/20 animate-pulse"
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="w-12 h-12 rounded-xl bg-purple-900/30 border border-purple-500/20" />
                          <div className="space-y-2">
                            <div className="w-32 h-4 bg-purple-800/30 rounded" />
                            <div className="w-24 h-3 bg-purple-900/30 rounded" />
                          </div>
                        </div>
                        <div className="w-24 h-8 bg-purple-900/25 rounded-xl" />
                      </div>
                    ))}
                  </div>
                ) : !hasSearched && !searchInput.trim() ? (
                  <div className="py-12 sm:py-16 px-4 text-center flex flex-col items-center justify-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-purple-950/50 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                      <Users className="w-7 h-7" />
                    </div>
                    <div className="space-y-1 max-w-sm">
                      <h3 className="text-sm sm:text-base font-bold text-white font-mono">
                        Looking for who?
                      </h3>
                      <p className="text-xs font-mono text-gray-400">
                        Search for another Rover by username to view their profile, showcase, and achievements.
                      </p>
                    </div>
                  </div>
                ) : searchInput.trim().replace(/^@+/, "").length < 2 ? (
                  <div className="py-8 text-center text-xs font-mono text-purple-300/80 flex items-center justify-center space-x-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Type at least 2 characters to search players...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="py-12 text-center text-xs sm:text-sm font-mono text-gray-400 space-y-2">
                    <p>No players found matching &ldquo;{searchInput}&rdquo;.</p>
                    <p className="text-[11px] text-gray-500">Make sure the username is spelled correctly.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between pb-1 px-1">
                      <span className="text-xs font-mono font-bold text-gray-300 flex items-center space-x-1.5">
                        <Users className="w-3.5 h-3.5 text-purple-400" />
                        <span>Matching Players ({searchResults.length})</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {searchResults.map((player) => {
                        const isSelf = player.username.toLowerCase() === currentUsername.toLowerCase();
                        const title = player.custom_title || getResonatorTitle(player.avatar_id);
                        const isVisitingThis = visitingPlayerId === player.id;
                        const tObj = findTitleByName(title);

                        return (
                          <div
                            key={player.id}
                            className="flex items-center justify-between p-3 rounded-2xl bg-black/60 hover:bg-purple-950/30 border border-purple-500/20 hover:border-purple-400/50 transition-all gap-3"
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-fuchsia-500/70 bg-black/50 flex-shrink-0">
                                <img
                                  src={`/assets/inventory_portraits/${getPortraitFileName(player.avatar_id)}`}
                                  alt={player.username}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const t = e.currentTarget;
                                    if (!t.src.endsWith(".jpg")) {
                                      t.src = `/assets/inventory_portraits/${player.avatar_id}.jpg`;
                                    }
                                  }}
                                />
                              </div>
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center space-x-2">
                                  <p className="text-sm font-black font-sans text-white truncate">
                                    @{player.username}
                                  </p>
                                  {isSelf && (
                                    <span className="px-1.5 py-0.2 rounded bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 text-[9px] font-mono font-bold uppercase">
                                      You
                                    </span>
                                  )}
                                  {player.is_vip && (
                                    <span className="text-[9px] font-mono font-black text-amber-300 bg-amber-400/20 px-1.5 py-0.2 rounded border border-amber-400/40 shadow-[0_0_8px_rgba(251,191,36,0.3)]">
                                      VIP
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                  <p
                                    className="text-[11px] font-mono font-bold truncate"
                                    style={{
                                      color: tObj?.customColor || "#e879f9",
                                      textShadow: tObj?.customColor ? `0 0 8px ${tObj.customColor}66` : undefined,
                                    }}
                                  >
                                    [{title}]
                                  </p>
                                  {player.pity_5star !== undefined && (
                                    <span className="text-[9.5px] font-mono text-yellow-400/90 bg-yellow-400/10 px-1.5 py-0.2 rounded border border-yellow-400/20">
                                      5★ Pity: {player.pity_5star}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={isSearching}
                              onClick={() => handleVisitPlayer(player)}
                              className="px-3.5 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/60 border border-purple-400/60 text-white text-xs font-mono font-bold flex items-center space-x-1.5 transition-all shadow-[0_0_12px_rgba(168,85,247,0.3)] flex-shrink-0 active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                              <span>{isVisitingThis ? "Opening..." : isSelf ? "View You" : "Visit"}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* TAB 2: PROFILE VIEW (Hero Card + Showcase + Stats)                        */
            /* ========================================================================= */
            <>
              {/* Spectator / Visiting Mode Notice Banner */}
              {!isViewingSelf && (
                <div className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-blue-950/90 via-indigo-950/80 to-blue-950/90 border-b border-blue-500/40 flex items-center justify-between gap-3 animate-fadeIn flex-shrink-0">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-blue-500/20 border border-blue-400/40 text-blue-300 flex-shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-mono font-bold text-blue-200 truncate">
                        Currently inspecting <span className="text-white font-black">@{activeUsername}</span>&apos;s profile
                      </p>
                      <p className="text-[10px] sm:text-[11px] font-mono text-blue-400/80">
                        Spectator Mode &bull; Read-only data
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetToSelf}
                    className="px-3 sm:px-4 py-1.5 rounded-xl bg-blue-500/25 hover:bg-blue-500/40 border border-blue-400/60 hover:border-blue-300 text-blue-200 hover:text-white text-xs font-mono font-black uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] flex-shrink-0 active:scale-95 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Return to My Profile</span>
                  </button>
                </div>
              )}

              {/* Upper Hero Banner (Anime Vanguards Duel Style - Resonator Title Under Name)*/}
              <div className="relative px-4 sm:px-8 py-5 sm:py-6 min-h-[96px] sm:min-h-[110px] overflow-hidden border-b border-purple-500/20 bg-gradient-to-r from-purple-950/70 via-slate-950/90 to-purple-950/70 flex flex-col justify-center flex-shrink-0">
                {/* Dynamic Background Neon Artwork Lighting */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(217,70,239,0.22),transparent_60%)] pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.18),transparent_60%)] pointer-events-none" />

                <div className="relative flex flex-row items-center justify-between gap-3 sm:gap-4 w-full">
                  {/* Avatar + Username + Resonator Title Under Name */}
                  <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                    {/* Avatar with Neon Magenta Glowing Border */}
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.6)] bg-black/60 flex-shrink-0">
                      <img
                        src={`/assets/inventory_portraits/${getPortraitFileName(activeAvatarId)}`}
                        alt={activeUsername}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const t = e.currentTarget;
                          if (!t.src.endsWith(".jpg")) {
                            t.src = `/assets/inventory_portraits/${activeAvatarId}.jpg`;
                          }
                        }}
                      />
                    </div>

                    {/* Username & Avatar Resonator Title */}
                    <div className="flex flex-col justify-center space-y-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-black font-sans tracking-wide text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] truncate">
                          {activeUsername}
                        </h1>
                        {isViewingSelf ? (
                          <span className="px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 text-[9.5px] sm:text-[10px] font-mono font-bold uppercase tracking-wider flex-shrink-0">
                            You
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[9.5px] sm:text-[10px] font-mono font-bold uppercase tracking-wider flex-shrink-0">
                            Visiting
                          </span>
                        )}
                        {(isViewingSelf ? isVip : visitedProfile?.is_vip) && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-400/25 text-amber-300 border border-amber-400/50 text-[9.5px] sm:text-[10px] font-mono font-black uppercase tracking-wider shadow-[0_0_12px_rgba(251,191,36,0.4)] flex-shrink-0">
                            VIP
                          </span>
                        )}
                      </div>

                      {/* Equipped Player Title (Decoupled from Avatar) */}
                      <div className="flex items-center space-x-2 pt-0.5">
                        {(() => {
                          const tObj = findTitleByName(activeEquippedTitle);
                          return (
                            <span
                              className="text-xs sm:text-sm font-mono font-black tracking-wide truncate"
                              style={{
                                color: tObj?.customColor || "#e879f9",
                                textShadow: tObj?.customColor
                                  ? `0 0 10px ${tObj.customColor}80`
                                  : "0 0 8px rgba(217,70,239,0.85)",
                              }}
                            >
                              [{activeEquippedTitle}]
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons for Own Profile - Square Icon Buttons */}
                  {isViewingSelf && (
                    <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={handleOpenShowcasePicker}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-600/25 hover:bg-purple-600/45 border border-purple-400/40 text-purple-200 hover:text-white flex items-center justify-center transition-all shadow-sm active:scale-95 cursor-pointer"
                        title="Edit Showcase Resonators"
                      >
                        <Pencil className="w-4 h-4 text-purple-300 flex-shrink-0" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setIsTitlePickerOpen(true);
                        }}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-yellow-400/15 hover:bg-yellow-400/30 border border-yellow-400/50 text-yellow-300 hover:text-yellow-100 flex items-center justify-center transition-all shadow-sm active:scale-95 cursor-pointer"
                        title="Change Equipped Title"
                      >
                        <Award className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      </button>

                      {onOpenAccountModal && (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            onOpenAccountModal();
                          }}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                          title="Account Settings"
                        >
                          <Settings className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
          {/* ========================================================================= */}
          <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 bg-[#0a0d14]/90 overflow-y-auto flex-1">
            {/* --------------------------------------------------------------------- */}
            {/* Left: 2x3 Showcase Cards (6 Units)                                    */}
            {/* --------------------------------------------------------------------- */}
            <div className="lg:col-span-7 flex flex-col space-y-2">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 flex items-center space-x-1.5">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  <span>Showcase Resonators ({activeShowcaseIds.length}/6)</span>
                </span>
                {isViewingSelf && (
                  <button
                    onClick={handleOpenShowcasePicker}
                    className="text-[11px] font-mono text-purple-400 hover:text-purple-300 underline underline-offset-2"
                  >
                    Change
                  </button>
                )}
              </div>

              {/* 2 Rows x 3 Columns Grid */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                {Array.from({ length: 6 }).map((_, idx) => {
                  const charId = activeShowcaseIds[idx];
                  const resData = charId
                    ? RESONATORS[charId] || RESONATORS[charId.toLowerCase()]
                    : null;
                  const invItem = charId
                    ? activeInventory.find(
                        (i) => i.character_id.toLowerCase() === charId.toLowerCase()
                      )
                    : null;
                  const wavebandCount = invItem?.count || 1;
                  const wavebandsUnlocked = Math.max(0, Math.min(6, wavebandCount - 1));
                  const isS6 = wavebandCount >= MAX_WAVEBAND_COUNT;
                  const element = resData?.element || "Spectro";
                  const displayName = resData?.name || invItem?.character_name || charId;

                  if (charId && invItem) {
                    return (
                      <div
                        key={`${charId}-${idx}`}
                        onClick={() => {
                          if (isViewingSelf) handleOpenShowcasePicker();
                        }}
                        className={`group relative aspect-[4/5] rounded-xl overflow-hidden border-2 border-fuchsia-500/80 hover:border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.3)] bg-gradient-to-b from-[#141a26] to-[#0a0d14] flex flex-col justify-between transition-all duration-150 ${
                          isViewingSelf ? "cursor-pointer hover:scale-[1.02]" : ""
                        }`}
                        title={`${displayName} • ${isS6 ? "Sequence S6 (MAX)" : wavebandsUnlocked > 0 ? "Sequence S" + wavebandsUnlocked : "Sequence S0"} (${element})${!isViewingSelf ? ` • Owned by @${activeUsername}` : ""}`}
                      >
                        {/* Unit Portrait */}
                        <img
                          src={`/assets/inventory_portraits/${getPortraitFileName(charId)}`}
                          alt={displayName}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            const t = e.currentTarget;
                            if (!t.src.endsWith(".jpg")) {
                              t.src = `/assets/inventory_portraits/${charId}.jpg`;
                            }
                          }}
                        />

                        {/* Top Overlay: Element Top Left, Balanced Waveband (S1/S6) Top Right */}
                        <div className="relative z-10 p-1.5 sm:p-2 flex items-center justify-between pointer-events-none">
                          {/* Element Symbol (Top-Left) */}
                          <div
                            className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-full p-0.5 sm:p-1 bg-black/85 border border-white/20 shadow-md flex items-center justify-center"
                            title={element}
                          >
                            <img
                              src={`/assets/elements/${element.toLowerCase()}.png`}
                              alt={element}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                              }}
                            />
                          </div>

                          {/* Yellow Star with Sequence Number / S6 (Top-Right, Balanced Size) */}
                          <div
                            className={`relative w-7.5 h-7.5 sm:w-8 sm:h-8 flex items-center justify-center ${
                              isS6
                                ? "drop-shadow-[0_0_10px_rgba(250,204,21,0.85)]"
                                : "drop-shadow-[0_0_6px_rgba(250,204,21,0.55)]"
                            }`}
                            title={isS6 ? "Sequence S6 (MAX)" : `Sequence S${wavebandsUnlocked}`}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="w-full h-full text-yellow-400 fill-yellow-400 overflow-visible"
                            >
                              <path
                                d="M12 1.5C12 7.5 16.5 12 22.5 12C16.5 12 12 16.5 12 22.5C12 16.5 7.5 12 1.5 12C7.5 12 12 7.5 12 1.5Z"
                                stroke="rgba(255, 255, 255, 0.45)"
                                strokeWidth="0.65"
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-black font-black font-mono text-[9.5px] sm:text-[10px] leading-none select-none tracking-tight">
                              {isS6 ? "S6" : wavebandsUnlocked > 0 ? `S${wavebandsUnlocked}` : "S0"}
                            </span>
                          </div>
                        </div>

                        {/* Bottom Name Banner (like Graceful Pilot in AV) */}
                        <div className="relative z-10 px-1.5 py-1.5 bg-gradient-to-t from-black via-black/80 to-transparent">
                          <p className="text-[11px] font-black font-sans uppercase tracking-tight text-white truncate text-center drop-shadow-sm">
                            {displayName}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  // Empty Slot (renders when slot is not edited or favorited)
                  return (
                    <div
                      key={`empty-${idx}`}
                      onClick={() => {
                        if (isViewingSelf) handleOpenShowcasePicker();
                      }}
                      className={`aspect-[4/5] rounded-xl border-2 border-dashed ${
                        isViewingSelf
                          ? "border-white/15 bg-white/[0.02] text-gray-500 hover:text-gray-300 hover:border-purple-400/50 cursor-pointer"
                          : "border-white/10 bg-black/30 text-gray-600 cursor-default"
                      } flex flex-col items-center justify-center transition-all`}
                    >
                      {isViewingSelf ? (
                        <>
                          <Plus className="w-5 h-5 mb-1 stroke-1" />
                          <span className="text-[10px] font-mono uppercase tracking-wider">
                            Empty Slot
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 rounded-full bg-white/20 mb-1.5" />
                          <span className="text-[9.5px] font-mono uppercase tracking-wider text-gray-500">
                            Unassigned
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* --------------------------------------------------------------------- */}
            {/* Right: Anime Vanguards Stats Panel (5 User-Specified Stats)           */}
            {/* --------------------------------------------------------------------- */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              {/* Stats Box */}
              <div className="bg-black/60 border border-purple-500/20 rounded-2xl p-3.5 sm:p-4 flex flex-col space-y-2.5">
                {/* 1. Total 5 star Resonators */}
                <div className="bg-black/80 border border-white/10 rounded-xl px-3.5 py-2 flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-gray-200">
                    Total 5 star Resonators
                  </span>
                  <div className="bg-[#050e09] border border-[#00ff66]/30 px-3 py-0.5 rounded-lg shadow-[0_0_10px_rgba(0,255,102,0.25)]">
                    <span className="text-xs sm:text-sm font-mono font-black text-[#00ff66]">
                      {total5StarResonators}
                    </span>
                  </div>
                </div>

                {/* 2. Total S6 Resonators (THOSE RESONATORS THAT ARE MAXED) */}
                <div className="bg-black/80 border border-white/10 rounded-xl px-3.5 py-2 flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-gray-200">
                    Total S6 Resonators
                  </span>
                  <div className="bg-[#050e09] border border-[#00ff66]/30 px-3 py-0.5 rounded-lg shadow-[0_0_10px_rgba(0,255,102,0.25)]">
                    <span className="text-xs sm:text-sm font-mono font-black text-[#00ff66]">
                      {totalS6Resonators}
                    </span>
                  </div>
                </div>

                {/* 3. Total Astrite Used */}
                <div className="bg-black/80 border border-white/10 rounded-xl px-3.5 py-2 flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-gray-200">
                    Total Astrite Used
                  </span>
                  <div className="bg-[#050e09] border border-[#00ff66]/30 px-3 py-0.5 rounded-lg shadow-[0_0_10px_rgba(0,255,102,0.25)]">
                    <span className="text-xs sm:text-sm font-mono font-black text-[#00ff66]">
                      {calculatedAstriteUsed.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 4. Total Pulled Used */}
                <div className="bg-black/80 border border-white/10 rounded-xl px-3.5 py-2 flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-gray-200">
                    Total Pulled Used
                  </span>
                  <div className="bg-[#050e09] border border-[#00ff66]/30 px-3 py-0.5 rounded-lg shadow-[0_0_10px_rgba(0,255,102,0.25)]">
                    <span className="text-xs sm:text-sm font-mono font-black text-[#00ff66]">
                      {calculatedPullsUsed.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 5. 50/50 Winrate */}
                <div className="bg-black/80 border border-white/10 rounded-xl px-3.5 py-2 flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-gray-200">
                    50/50 Winrate
                  </span>
                  <div className="bg-[#050e09] border border-[#00ff66]/30 px-3 py-0.5 rounded-lg shadow-[0_0_10px_rgba(0,255,102,0.25)]">
                    <span className="text-xs sm:text-sm font-mono font-black text-[#00ff66]">
                      {calculatedWinRate}
                    </span>
                  </div>
                </div>

                {/* 6. Daily Login Streak */}
                <div className="bg-black/80 border border-white/10 rounded-xl px-3.5 py-2 flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-gray-200">
                    Daily Login Streak
                  </span>
                  <div className="bg-[#1a0f05] border border-amber-500/40 px-3 py-0.5 rounded-lg shadow-[0_0_10px_rgba(245,158,11,0.25)] flex items-center space-x-1">
                    <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30 animate-pulse" />
                    <span className="text-xs sm:text-sm font-mono font-black text-amber-400">
                      {isViewingSelf ? loginStreak : (visitedProfile?.login_streak ?? 1)}d
                    </span>
                    {((isViewingSelf ? maxLoginStreak : (visitedProfile?.max_login_streak ?? 1)) > (isViewingSelf ? loginStreak : (visitedProfile?.login_streak ?? 1))) && (
                      <span className="text-[10px] font-mono text-gray-400">
                        (best {isViewingSelf ? maxLoginStreak : (visitedProfile?.max_login_streak ?? 1)}d)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button: CHECK PLAYER'S INVENTORY */}
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onInspectInventory(
                    activeInventory,
                    activeUsername,
                    !isViewingSelf // if viewing other player, isReadOnly = true
                  );
                }}
                className="w-full py-3 sm:py-3.5 px-4 rounded-2xl bg-gradient-to-r from-yellow-500/20 via-yellow-400/25 to-yellow-500/20 hover:from-yellow-400/35 hover:to-yellow-400/35 border-2 border-yellow-400/60 hover:border-yellow-400 text-yellow-300 hover:text-white font-mono font-black text-xs sm:text-sm tracking-widest uppercase transition-all shadow-[0_0_25px_rgba(250,204,21,0.25)] flex items-center justify-center space-x-2.5 active:scale-98"
              >
                <Briefcase className="w-4 h-4 text-yellow-400 stroke-[2.5]" />
                <span>
                  {isViewingSelf ? "CHECK MY INVENTORY" : "CHECK PLAYER'S INVENTORY"}
                </span>
                <ArrowRight className="w-4 h-4 text-yellow-400" />
              </button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  </div>

      {/* ========================================================================= */}
      {/* Showcase Resonator Customizer Modal (When user clicks Edit Showcase)      */}
      {/* ========================================================================= */}
      {isShowcasePickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/95 select-none"
          onClick={() => setIsShowcasePickerOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-2xl bg-[#0c1017] border border-purple-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-black uppercase tracking-wider text-white">
                  Customize 6 Showcase Resonators
                </h3>
              </div>
              <button
                onClick={() => setIsShowcasePickerOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current 6 Selected Slots */}
            <div className="p-4 border-b border-white/10 bg-black/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-gray-300">
                  Selected Slots ({tempShowcaseIds.length}/6)
                </span>
                <button
                  onClick={handleAutoFillFavorites}
                  className="text-xs font-mono font-bold text-yellow-400 hover:text-yellow-300 flex items-center space-x-1"
                >
                  <Star className="w-3 h-3 fill-yellow-400" />
                  <span>Use Favorites</span>
                </button>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: 6 }).map((_, idx) => {
                  const id = tempShowcaseIds[idx];
                  const res = id ? RESONATORS[id] : null;

                  if (id && res) {
                    return (
                      <div
                        key={`sel-${id}-${idx}`}
                        className="relative aspect-square rounded-xl overflow-hidden border border-purple-500/60 bg-black/50 group"
                      >
                        <img
                          src={`/assets/inventory_portraits/${getPortraitFileName(id)}`}
                          alt={res.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleTogglePickerUnit(id)}
                          className="absolute inset-0 bg-red-600/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                          title="Remove from showcase"
                        >
                          <X className="w-4 h-4 stroke-[3]" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`empty-sel-${idx}`}
                      className="aspect-square rounded-xl border border-dashed border-white/20 bg-white/[0.02] flex items-center justify-center text-gray-600"
                    >
                      <Plus className="w-4 h-4" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filter & Search Bar inside picker */}
            <div className="px-4 py-2.5 border-b border-white/10 bg-black/30 flex items-center justify-between gap-2">
              <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none pb-0.5">
                {["ALL", "FAVORITES", "Spectro", "Havoc", "Fusion", "Aero", "Electro", "Glacio"].map(
                  (elem) => {
                    const isSelected = pickerElementFilter === elem;
                    return (
                      <button
                        key={elem}
                        onClick={() => {
                          soundEngine.playClick();
                          setPickerElementFilter(elem);
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all whitespace-nowrap ${
                          isSelected
                            ? "bg-purple-600 text-white"
                            : "bg-white/5 text-gray-400 hover:text-white"
                        }`}
                      >
                        {elem}
                      </button>
                    );
                  }
                )}
              </div>

              <input
                type="text"
                placeholder="Search..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="w-32 sm:w-40 px-2 py-1 rounded-lg bg-black/70 border border-white/15 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
              />
            </div>

            {/* Owned Units List */}
            <div className="p-4 overflow-y-auto flex-1 min-h-[220px]">
              {filteredPickerItems.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 text-xs font-mono">
                  No matching resonators found in inventory.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                  {filteredPickerItems.map((item) => {
                    const res = RESONATORS[item.character_id];
                    const isChosen = tempShowcaseIds.includes(item.character_id);
                    const isFav = ownFavorites.has(item.character_id);

                    return (
                      <div
                        key={item.character_id}
                        onClick={() => handleTogglePickerUnit(item.character_id)}
                        className={`group relative aspect-[4/5] rounded-xl overflow-hidden border cursor-pointer transition-all ${
                          isChosen
                            ? "border-purple-500 ring-2 ring-purple-500/50 scale-[0.98]"
                            : "border-white/15 hover:border-white/40"
                        }`}
                      >
                        <img
                          src={`/assets/inventory_portraits/${getPortraitFileName(
                            item.character_id
                          )}`}
                          alt={res?.name || item.character_name}
                          className="w-full h-full object-cover"
                        />

                        {/* Top indicators */}
                        <div className="absolute top-1 right-1 flex items-center space-x-1 z-10">
                          {isFav && (
                            <div className="p-1 rounded bg-black/70">
                              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            </div>
                          )}
                          {isChosen && (
                            <div className="p-1 rounded bg-purple-600 text-white shadow-md">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        {/* Bottom Name */}
                        <div className="absolute inset-x-0 bottom-0 py-1 bg-black/80 text-center">
                          <span className="text-[10px] font-mono font-bold text-white truncate block px-1">
                            {res?.name || item.character_name}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="px-5 py-3 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsShowcasePickerOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono font-bold text-gray-300 hover:text-white"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSavingShowcase}
                onClick={handleSaveShowcase}
                className="px-5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-mono font-black text-xs uppercase tracking-wider flex items-center space-x-1.5 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isSavingShowcase ? "Saving..." : "Save Showcase"}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Dedicated Player Title Picker Modal */}
      {isTitlePickerOpen && (
        <TitlePickerModal
          isOpen={isTitlePickerOpen}
          onClose={() => setIsTitlePickerOpen(false)}
          equippedTitle={ownTitle}
          onEquipTitle={handleEquipTitle}
          titleContext={titleContext}
          claimedTitleIds={claimedTitles}
          onClaimTitle={handleClaimTitle}
        />
      )}
    </AnimatePresence>
  );
};
