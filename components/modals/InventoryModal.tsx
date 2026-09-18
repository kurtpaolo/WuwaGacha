"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { soundEngine } from "@/lib/audio/soundEngine";
import { UserInventoryItem } from "@/lib/supabase/inventory";
import { updateShowcaseResonatorIds } from "@/lib/supabase/auth";
import { RESONATORS, getResonatorArtist, RESONATOR_ARTISTS } from "@/lib/data/items";
import { RarityStars } from "@/components/ui/GameIcons";
import { requestExternalRedirect } from "@/components/modals/ExternalRedirectModal";
import {
  X,
  Sparkles,
  Briefcase,
  Search,
  Check,
  Palette,
  Star,
  ArrowUpDown,
  ChevronDown,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { getPortraitFileName } from "@/lib/data/portraits";
import { ResonatorDetailModal } from "@/components/modals/ResonatorDetailModal";

interface ResonatorInventoryCardProps {
  item: UserInventoryItem;
  isFav: boolean;
  isReadOnly: boolean;
  onToggleFavorite: (id: string) => void;
  onInspectCard: (item: UserInventoryItem) => void;
}

const ResonatorInventoryCard: React.FC<ResonatorInventoryCardProps> = React.memo(({
  item,
  isFav,
  isReadOnly,
  onToggleFavorite,
  onInspectCard,
}) => {
  const res = RESONATORS[item.character_id];
  const artistInfo = getResonatorArtist(item.character_id);
  const hasCustomArtist = Boolean(RESONATOR_ARTISTS[item.character_id.toLowerCase()]);
  const element = res?.element || "Spectro";
  const maxWavebands = Math.max(0, Math.min(6, item.count - 1));
  const [activeSeq, setActiveSeq] = useState<number>(() => {
    if (typeof window === "undefined") return maxWavebands;
    if (localStorage.getItem("wuwa_auto_activate_sequences") === "true") return maxWavebands;
    const saved = localStorage.getItem(`wuwa_seq_activated_${item.character_id}`);
    return saved !== null ? Math.min(maxWavebands, Math.max(0, parseInt(saved, 10) || 0)) : 0;
  });

  useEffect(() => {
    const updateActive = () => {
      if (typeof window === "undefined") return;
      if (localStorage.getItem("wuwa_auto_activate_sequences") === "true") {
        setActiveSeq(maxWavebands);
        return;
      }
      const saved = localStorage.getItem(`wuwa_seq_activated_${item.character_id}`);
      setActiveSeq(saved !== null ? Math.min(maxWavebands, Math.max(0, parseInt(saved, 10) || 0)) : 0);
    };
    window.addEventListener("wuwa_sequence_activated", updateActive);
    window.addEventListener("wuwa_auto_activate_changed", updateActive);
    return () => {
      window.removeEventListener("wuwa_sequence_activated", updateActive);
      window.removeEventListener("wuwa_auto_activate_changed", updateActive);
    };
  }, [item.character_id, maxWavebands]);

  const wavebandsUnlocked = activeSeq;
  const isS6 = wavebandsUnlocked >= 6;
  const portraitFileName = getPortraitFileName(item.character_id);

  return (
    <div
      onClick={() => {
        if (onInspectCard) {
          soundEngine.playClick();
          onInspectCard(item);
        }
      }}
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "280px",
      }}
      className={`group relative flex flex-col rounded-xl overflow-hidden bg-gradient-to-b from-[#141a26] to-[#0a0d14] border transition-transform duration-100 cursor-pointer ${
        isFav
          ? "border-yellow-400/70 shadow-[0_0_12px_rgba(250,204,21,0.2)] ring-1 ring-yellow-400/40 hover:scale-[1.02]"
          : isS6
          ? "border-yellow-400/50 shadow-[0_0_8px_rgba(250,204,21,0.15)] ring-1 ring-yellow-400/20 hover:scale-[1.02]"
          : "border-white/15 hover:border-yellow-400/40 hover:scale-[1.02]"
      }`}
    >
      {/* Character Card Visual Area */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-black/40">
        <img
          src={`/assets/inventory_portraits/${portraitFileName}`}
          alt={item.character_name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover object-center transition-transform duration-200 group-hover:scale-105"
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            const fallback = res?.portraitUrl || `/assets/characters/${item.character_id}_portrait.png`;
            if (target.src !== fallback) {
              target.src = fallback;
            }
          }}
        />

        {/* Top Overlay: Element Symbol Top Left, Sequence Wavebands Counter Top Right */}
        <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
          {/* Element Badge */}
          <div
            className="w-7 h-7 rounded-full p-1 bg-black/80 border border-white/20 shadow-md flex items-center justify-center backdrop-blur-sm"
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

          {/* Sequence Wavebands Badge (Diamond Star) */}
          <div
            className={`relative w-8 h-8 flex items-center justify-center ${
              isS6
                ? "drop-shadow-[0_0_8px_rgba(250,204,21,0.9)]"
                : "drop-shadow-[0_0_4px_rgba(250,204,21,0.5)]"
            }`}
            title={`Sequence Node S${wavebandsUnlocked}`}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-full h-full text-yellow-400 fill-yellow-400"
            >
              <path
                d="M12 1.5C12 7.5 16.5 12 22.5 12C16.5 12 12 16.5 12 22.5C12 16.5 7.5 12 1.5 12C7.5 12 12 7.5 12 1.5Z"
                stroke="rgba(255, 255, 255, 0.4)"
                strokeWidth="0.65"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-black font-black font-mono text-[11px] sm:text-xs leading-none select-none">
              {wavebandsUnlocked}
            </span>
          </div>
        </div>

        {/* Bottom Art Gradient */}
        <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#0a0d14] to-transparent pointer-events-none" />
      </div>

      {/* Info Details Section */}
      <div className="px-2.5 sm:px-3 pt-2 pb-3 flex items-center justify-between bg-[#0a0d14] gap-1.5 relative">
        <div className="flex-1 min-w-0 flex flex-col justify-center space-y-0.5">
          <h4
            className="font-black text-xs sm:text-sm uppercase tracking-wide text-white truncate drop-shadow-sm"
            title={res?.name || item.character_name}
          >
            {res?.name || item.character_name}
          </h4>
          <RarityStars rarity={5} size={11} className="mt-0.5" />
        </div>

        {/* Action Buttons: Favorite + Artist Credit */}
        <div className="flex items-center space-x-1 flex-shrink-0">
          {!isReadOnly && (
            <div className="relative group/fav" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={(e) => {
                  (e.currentTarget as HTMLElement).blur();
                  onToggleFavorite(item.character_id);
                }}
                className={`w-6 h-6 rounded-md flex items-center justify-center transition-all duration-150 active:scale-95 shadow-sm ${
                  isFav
                    ? "bg-yellow-400/20 text-yellow-400 border border-yellow-400/60 shadow-[0_0_8px_rgba(250,204,21,0.3)]"
                    : "bg-white/[0.04] hover:bg-yellow-400/15 text-gray-400 hover:text-yellow-400 border border-white/10 hover:border-yellow-400/40"
                }`}
                aria-label="Favorite resonator"
              >
                <Star
                  className={`w-3.5 h-3.5 transition-all ${
                    isFav ? "fill-yellow-400 text-yellow-400 scale-105" : ""
                  }`}
                />
              </button>

              <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/fav:flex flex-col items-end z-50 pointer-events-none whitespace-nowrap">
                <div className="px-2.5 py-1 rounded-lg bg-[#0c1017] border border-yellow-400/50 shadow-lg">
                  <span className="text-[10px] font-mono font-bold text-yellow-400 tracking-wide">
                    {isFav ? "Favorited" : "Favorite"}
                  </span>
                </div>
                <div className="w-2 h-2 bg-[#0c1017] border-r border-b border-yellow-400/50 rotate-45 mr-2 -mt-1" />
              </div>
            </div>
          )}

          {/* Artist Credit */}
          <div className="relative group/owner" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={(e) => {
                (e.currentTarget as HTMLElement).blur();
                soundEngine.playClick();
                if (artistInfo?.url) {
                  requestExternalRedirect(artistInfo.url, artistInfo.name);
                }
              }}
              className="w-6 h-6 rounded-md bg-white/[0.04] hover:bg-yellow-400/20 text-gray-400 hover:text-yellow-400 border border-white/10 hover:border-yellow-400/40 flex items-center justify-center transition-all duration-150 active:scale-95 shadow-sm group-hover/owner:scale-105"
              aria-label="Artwork credit"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>

            <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover/owner:flex flex-col items-end z-50 pointer-events-none whitespace-nowrap">
              <div className="px-2.5 py-1.5 rounded-lg bg-[#0c1017] border border-yellow-400/50 shadow-lg space-y-0.5">
                <div className="flex items-center space-x-1 text-[10px] font-mono font-bold text-yellow-400 tracking-wide">
                  <span>
                    {hasCustomArtist ? `Artist: @${artistInfo.name}` : `Owner: ${artistInfo.name}`}
                  </span>
                  <ExternalLink className="w-2.5 h-2.5 ml-1 text-yellow-400/80" />
                </div>
                <p className="text-[9px] font-mono text-gray-400">
                  {hasCustomArtist ? "Click to open artist profile ↗" : "Official Kuro Games Asset ↗"}
                </p>
              </div>
              <div className="w-2 h-2 bg-[#0c1017] border-r border-b border-yellow-400/50 rotate-45 mr-2 -mt-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ResonatorInventoryCard.displayName = "ResonatorInventoryCard";

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  inventory: UserInventoryItem[];
  username?: string;
  currentUserId?: string;
  isLoading?: boolean;
  isReadOnly?: boolean;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  onBack,
  inventory,
  username = "Resonator",
  currentUserId,
  isLoading,
  isReadOnly = false,
}) => {
  const [selectedElement, setSelectedElement] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortMode, setSortMode] = useState<"A-Z" | "Z-A" | "Recent">("A-Z");
  const [isSortOpen, setIsSortOpen] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [internalLoading, setInternalLoading] = useState<boolean>(true);
  const [inspectedItem, setInspectedItem] = useState<UserInventoryItem | null>(null);

  const sortDropdownRef = useRef<HTMLDivElement | null>(null);

  // Load favorites from localStorage for persistent user preferences
  useEffect(() => {
    try {
      const storageKey = `wuwa_inventory_favorites_${username}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setFavorites(new Set(JSON.parse(saved)));
      }
    } catch (e) {
      console.error("Failed to load favorites from localStorage:", e);
    }
  }, [username]);

  // Close sort popover on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    }
    if (isSortOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isSortOpen]);

  // Trigger brief, polished opening load animation strictly inside the inventory component
  useEffect(() => {
    if (isOpen) {
      setInternalLoading(true);
      const timer = setTimeout(() => {
        setInternalLoading(false);
      }, 700);
      return () => clearTimeout(timer);
    } else {
      setIsSortOpen(false);
    }
  }, [isOpen]);

  const effectiveLoading = isLoading !== undefined ? (isLoading || internalLoading) : internalLoading;

  const totalCopies = useMemo(() => {
    return inventory.reduce((sum, item) => sum + (item.count || 1), 0);
  }, [inventory]);

  const toggleFavorite = useCallback((characterId: string) => {
    soundEngine.playClick();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(characterId)) {
        next.delete(characterId);
      } else {
        next.add(characterId);
      }
      const favList = Array.from(next);
      try {
        const storageKey = `wuwa_inventory_favorites_${username}`;
        localStorage.setItem(storageKey, JSON.stringify(favList));
      } catch (e) {
        console.error("Failed to save favorites to localStorage:", e);
      }

      // Automatically sync favorite resonators to Supabase profile showcase (up to 6)
      if (!isReadOnly && currentUserId) {
        const ownedFavList = favList.filter((id) =>
          inventory.some((i) => i.character_id.toLowerCase() === id.toLowerCase())
        );
        updateShowcaseResonatorIds(currentUserId, ownedFavList.slice(0, 6));
      }

      return next;
    });
  }, [username, isReadOnly, currentUserId]);

  const filteredItems = useMemo(() => {
    return inventory
      .filter((item) => {
        const res = RESONATORS[item.character_id];
        const name = res?.name || item.character_name || item.character_id;
        const element = res?.element || "";

        const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase().trim());
        const matchesCategory =
          selectedElement === "ALL"
            ? true
            : selectedElement === "FAVORITES"
            ? favorites.has(item.character_id)
            : element === selectedElement;

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        // 1. Favorited items always take top priority
        const isFavA = favorites.has(a.character_id);
        const isFavB = favorites.has(b.character_id);
        if (isFavA !== isFavB) {
          return isFavA ? -1 : 1;
        }

        // 2. Sorter: A-Z (Default), Z-A, or Recent
        const nameA = RESONATORS[a.character_id]?.name || a.character_name || a.character_id;
        const nameB = RESONATORS[b.character_id]?.name || b.character_name || b.character_id;

        if (sortMode === "A-Z") {
          return nameA.localeCompare(nameB);
        } else if (sortMode === "Z-A") {
          return nameB.localeCompare(nameA);
        } else if (sortMode === "Recent") {
          const timeA = new Date(a.last_pulled_at || 0).getTime();
          const timeB = new Date(b.last_pulled_at || 0).getTime();
          return timeB - timeA;
        }
        return 0;
      });
  }, [inventory, searchQuery, selectedElement, sortMode, favorites]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/95 select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="relative w-full max-w-6xl xl:max-w-7xl bg-[#0c1017]/95 border border-white/15 rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 sm:px-8 py-4 border-b border-white/10 bg-white/[0.02] gap-3">
            <div className="flex items-center space-x-3">
              {onBack && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    onBack();
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/15 text-gray-300 hover:text-white flex items-center space-x-1.5 text-xs font-mono font-bold transition-all mr-1 active:scale-95"
                  title="Back to Profile"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back</span>
                </button>
              )}
              <div className="p-2.5 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white flex items-center space-x-2">
                  <span>{isReadOnly ? `${username}'s Inventory` : "Inventory"}</span>
                  {isReadOnly && (
                    <span className="text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                      Read-Only
                    </span>
                  )}
                </h2>
                <p className="text-xs font-mono text-gray-400">
                  Account: <strong className="text-white">@{username}</strong> • Total Owned:{" "}
                  <strong className="text-yellow-400">{inventory.length}</strong> Resonators (
                  <strong className="text-yellow-400">{totalCopies}</strong> total copies)
                  {!isReadOnly && favorites.size > 0 && (
                    <>
                      {" "}• Favorited: <strong className="text-yellow-400 font-bold">{favorites.size}</strong>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="relative p-2 rounded-xl bg-gradient-to-br from-rose-500/25 to-pink-600/30 hover:from-rose-500/40 hover:to-pink-600/50 border border-rose-500/50 text-rose-300 hover:text-white transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] active:scale-95 group flex-shrink-0 cursor-pointer self-end sm:self-center"
              title="Close"
            >
              <X className="w-5 h-5 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
            </button>
          </div>

          {/* Inventory Distinction Notice Bar */}
          <div className="px-5 sm:px-8 py-2 bg-yellow-500/10 border-b border-yellow-500/20 flex items-center justify-between text-[11px] font-mono text-yellow-300/90 flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
              <span>
                <strong>Featured 5★ Resonator Vault:</strong> Only featured limited 5★ characters (S0–S6) are saved permanently. 3★/4★ weapons, 4★ characters, and 50/50 standard losses are not stored.
              </span>
            </div>
          </div>

          {/* Filter, Sorter & Search Bar */}
          <div className="px-5 sm:px-8 py-3 border-b border-white/10 bg-black/40 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Category / Element Filter Pills with dedicated Favorites section (Smooth side-by-side scrollable on all devices) */}
            <div className="flex-1 min-w-0 flex items-center space-x-1.5 overflow-x-auto overscroll-x-contain touch-pan-x flex-nowrap scroll-smooth scrollbar-none py-1 -my-1">
              {["ALL", "FAVORITES", "Spectro", "Havoc", "Fusion", "Aero", "Electro", "Glacio"].map((elem) => {
                const isFavSection = elem === "FAVORITES";
                const isSelected = selectedElement === elem;

                return (
                  <button
                    key={elem}
                    onClick={() => {
                      soundEngine.playClick();
                      setSelectedElement(elem);
                    }}
                    className={`px-3 py-1 rounded-lg text-[11px] font-mono font-bold uppercase transition-all flex-shrink-0 flex items-center space-x-1.5 ${
                      isSelected
                        ? "bg-yellow-400 text-black shadow-[0_0_12px_rgba(250,204,21,0.4)]"
                        : isFavSection
                        ? "bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-400/90 border border-yellow-400/30"
                        : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10"
                    }`}
                  >
                    {isFavSection && (
                      <Star
                        className={`w-3 h-3 ${
                          isSelected ? "fill-black text-black" : "fill-yellow-400 text-yellow-400"
                        }`}
                      />
                    )}
                    <span>{isFavSection ? `Favorites (${favorites.size})` : elem}</span>
                  </button>
                );
              })}
            </div>

            {/* Sorter, Search Input & Delete Button */}
            <div className="flex items-center space-x-2">
              {/* Sorter Dropdown Button (Located directly at the left of search) */}
              <div className="relative flex-shrink-0" ref={sortDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setIsSortOpen((prev) => !prev);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 hover:border-yellow-400/40 transition-all shadow-sm"
                  title={`Sort by: ${sortMode}`}
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-yellow-400 font-bold">{sortMode}</span>
                  <ChevronDown
                    className={`w-3 h-3 text-gray-400 transition-transform duration-150 ${
                      isSortOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Sorter Dropdown Popover */}
                {isSortOpen && (
                  <div className="absolute left-0 mt-1.5 w-36 rounded-xl bg-[#0c1017] border border-white/15 shadow-[0_10px_35px_rgba(0,0,0,0.95)] py-1.5 z-50 animate-fadeIn">
                    {(["A-Z", "Z-A", "Recent"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          soundEngine.playClick();
                          setSortMode(mode);
                          setIsSortOpen(false);
                        }}
                        className={`w-full px-3 py-1.5 text-xs font-mono flex items-center justify-between transition-colors ${
                          sortMode === mode
                            ? "bg-yellow-400/15 text-yellow-400 font-bold"
                            : "text-gray-300 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <span>{mode === "Recent" ? "Recent Pull" : mode}</span>
                        {sortMode === mode && <Check className="w-3.5 h-3.5 text-yellow-400 stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Search Input */}
              <div className="relative flex items-center min-w-[170px] sm:min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search resonator..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-black/60 border border-white/15 focus:border-yellow-400/60 rounded-lg text-xs font-mono text-white placeholder-gray-500 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Resonators Grid Body OR Polished Inventory Loading State */}
          <div className="p-5 sm:p-8 overflow-y-auto flex-1 min-h-[360px] overscroll-contain relative">
            <AnimatePresence mode="wait">
              {effectiveLoading ? (
                /* Sleek loading state strictly inside the inventory modal */
                <motion.div
                  key="inventory-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="w-full h-full min-h-[320px] flex flex-col items-center justify-center py-16 text-center select-none"
                >
                  <div className="flex flex-col items-center space-y-4 max-w-sm">
                    <div className="relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20">
                      <div className="absolute inset-0 rounded-full bg-yellow-400/20 animate-ping pointer-events-none" />
                      <div className="relative p-4 sm:p-5 rounded-2xl bg-[#10141d] border border-yellow-400/50 text-yellow-400 shadow-[0_0_35px_rgba(250,204,21,0.3)]">
                        <Sparkles className="w-8 h-8 animate-spin" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-base sm:text-lg font-black uppercase tracking-widest text-white font-display">
                        Loading Inventory
                      </h3>
                      <p className="text-xs font-mono text-yellow-400/80 tracking-wider">
                        Loading resonators...
                      </p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={`${selectedElement}-${sortMode}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="w-full"
                >
                  {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                      {filteredItems.map((item) => (
                        <ResonatorInventoryCard
                          key={item.character_id}
                          item={item}
                          isFav={favorites.has(item.character_id)}
                          isReadOnly={isReadOnly}
                          onToggleFavorite={toggleFavorite}
                          onInspectCard={setInspectedItem}
                        />
                      ))}
                    </div>
                  ) : (
                    /* Empty State */
                    <div className="h-full flex flex-col items-center justify-center py-16 text-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
                        {selectedElement === "FAVORITES" ? (
                          <Star className="w-8 h-8 text-yellow-400/60" />
                        ) : (
                          <Sparkles className="w-8 h-8" />
                        )}
                      </div>
                      <div className="space-y-1 max-w-sm">
                        <h3 className="text-base font-bold text-white uppercase tracking-wider">
                          {selectedElement === "FAVORITES"
                            ? "No Favorite Resonators Yet"
                            : inventory.length === 0
                            ? "No Featured 5★ Resonators Yet"
                            : "No Matching Resonators"}
                        </h3>
                        <p className="text-xs text-gray-400 leading-relaxed font-mono">
                          {selectedElement === "FAVORITES"
                            ? "Click the star on any resonator to add them to your favorites."
                            : inventory.length === 0
                            ? "Pull on featured banners to obtain 5★ resonators. They will appear here!"
                            : "No resonators match your filter."}
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Resonator Detail & Resonance Chain (S0-S6) Modal */}
        <ResonatorDetailModal
          isOpen={Boolean(inspectedItem)}
          item={inspectedItem}
          onClose={() => setInspectedItem(null)}
          onBack={() => setInspectedItem(null)}
        />
      </div>
    </AnimatePresence>
  );
};
