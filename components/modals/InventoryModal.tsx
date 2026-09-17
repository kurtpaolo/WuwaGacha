"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { soundEngine } from "@/lib/audio/soundEngine";
import { UserInventoryItem, MAX_WAVEBAND_COUNT } from "@/lib/supabase/inventory";
import { updateShowcaseResonatorIds } from "@/lib/supabase/auth";
import { RESONATORS, getResonatorArtist, RESONATOR_ARTISTS } from "@/lib/data/items";
import { RarityStars } from "@/components/ui/GameIcons";
import {
  X,
  Sparkles,
  Briefcase,
  Search,
  Trash2,
  Check,
  AlertTriangle,
  Palette,
  Star,
  ArrowUpDown,
  ChevronDown,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { getPortraitFileName } from "@/lib/data/portraits";

interface ResonatorInventoryCardProps {
  item: UserInventoryItem;
  isFav: boolean;
  isSelected: boolean;
  isDeleteMode: boolean;
  isReadOnly: boolean;
  onToggleCardSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

const ResonatorInventoryCard: React.FC<ResonatorInventoryCardProps> = React.memo(({
  item,
  isFav,
  isSelected,
  isDeleteMode,
  isReadOnly,
  onToggleCardSelect,
  onToggleFavorite,
}) => {
  const res = RESONATORS[item.character_id];
  const artistInfo = getResonatorArtist(item.character_id);
  const hasCustomArtist = Boolean(RESONATOR_ARTISTS[item.character_id.toLowerCase()]);
  const element = res?.element || "Spectro";
  const isS6 = item.count >= MAX_WAVEBAND_COUNT;
  const wavebandsUnlocked = Math.max(0, Math.min(6, item.count - 1));
  const portraitFileName = getPortraitFileName(item.character_id);

  return (
    <div
      onClick={() => {
        if (!isReadOnly && isDeleteMode) onToggleCardSelect(item.character_id);
      }}
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "280px",
      }}
      className={`group relative flex flex-col rounded-xl overflow-hidden bg-gradient-to-b from-[#141a26] to-[#0a0d14] border transition-transform duration-100 ${
        isDeleteMode
          ? isSelected
            ? "border-red-500 ring-2 ring-red-500/50 cursor-pointer scale-[0.98]"
            : "border-white/20 hover:border-white/50 cursor-pointer"
          : isFav
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

        {/* Top Overlay: Element Symbol & Yellow Star with Number Inside */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          {/* Element Symbol (no text) */}
          <div
            className="w-6 h-6 rounded-full p-1 bg-black/85 border border-white/20 shadow-md flex items-center justify-center"
            title={element}
          >
            <img
              src={`/assets/elements/${element.toLowerCase()}.png`}
              alt={element}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
          </div>

          {/* Yellow Star with Sequence Number Inside */}
          <div
            className={`relative w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center ${
              isS6 ? "drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]" : ""
            }`}
            title={`Sequence S${wavebandsUnlocked}`}
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
            <span className="absolute inset-0 flex items-center justify-center text-black font-black font-mono text-[11px] sm:text-xs leading-none select-none">
              {wavebandsUnlocked}
            </span>
          </div>
        </div>

        {/* Circle option at the bottom right of each card when in delete mode */}
        {!isReadOnly && isDeleteMode && (
          <div className="absolute bottom-2 right-2 z-20 pointer-events-auto">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                isSelected
                  ? "bg-red-500 border border-red-300 text-white shadow-[0_0_10px_rgba(239,68,68,0.7)]"
                  : "bg-black/80 border border-white/50 hover:border-white text-transparent"
              }`}
            >
              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>
        )}

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
                  window.open(artistInfo.url, "_blank", "noopener,noreferrer");
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
  onDeleteItems?: (characterIds: string[]) => Promise<void> | void;
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
  onDeleteItems,
  isLoading,
  isReadOnly = false,
}) => {
  const [selectedElement, setSelectedElement] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortMode, setSortMode] = useState<"A-Z" | "Z-A" | "Recent">("A-Z");
  const [isSortOpen, setIsSortOpen] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isDeleteMode, setIsDeleteMode] = useState<boolean>(false);
  const [selectedToDelete, setSelectedToDelete] = useState<Set<string>>(new Set());
  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [internalLoading, setInternalLoading] = useState<boolean>(true);

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
      setIsDeleteMode(false);
      setSelectedToDelete(new Set());
      setShowConfirmDelete(false);
      setIsDeleting(false);
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

  const toggleSelectCard = useCallback((characterId: string) => {
    soundEngine.playClick();
    setSelectedToDelete((prev) => {
      const next = new Set(prev);
      if (next.has(characterId)) {
        next.delete(characterId);
      } else {
        next.add(characterId);
      }
      return next;
    });
  }, []);

  const handleConfirmDelete = async () => {
    soundEngine.playClick();
    const idsToDelete = Array.from(selectedToDelete);
    if (onDeleteItems && idsToDelete.length > 0) {
      setIsDeleting(true);
      try {
        await onDeleteItems(idsToDelete);
        setFavorites((prev) => {
          const next = new Set(prev);
          const lowerDeleted = new Set(idsToDelete.map((id) => id.toLowerCase()));
          prev.forEach((fav) => {
            if (lowerDeleted.has(fav.toLowerCase())) {
              next.delete(fav);
            }
          });
          try {
            const storageKey = `wuwa_inventory_favorites_${username}`;
            localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
          } catch {}
          return next;
        });
      } catch (err) {
        console.error("Failed to hard delete inventory items:", err);
      } finally {
        setIsDeleting(false);
      }
    }
    setSelectedToDelete(new Set());
    setIsDeleteMode(false);
    setShowConfirmDelete(false);
  };

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
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-colors self-end sm:self-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter, Sorter & Search Bar */}
          <div className="px-5 sm:px-8 py-3 border-b border-white/10 bg-black/40 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Category / Element Filter Pills with dedicated Favorites section */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
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

              {/* Delete Trigger Button (Hidden in Read-Only mode) */}
              {!isReadOnly && (
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    if (isDeleteMode) {
                      setIsDeleteMode(false);
                      setSelectedToDelete(new Set());
                    } else {
                      setIsDeleteMode(true);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 transition-all flex-shrink-0 ${
                    isDeleteMode
                      ? "bg-red-500/20 text-red-300 border border-red-500/50 hover:bg-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.25)]"
                      : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-red-400 border border-white/10"
                  }`}
                  title={isDeleteMode ? "Cancel delete" : "Delete resonators from database"}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleteMode ? "Cancel" : "Delete"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Delete Selection Mode Action Banner */}
          {!isReadOnly && isDeleteMode && (
            <div className="px-5 sm:px-8 py-2.5 bg-red-950/40 border-b border-red-500/30 flex items-center justify-between gap-3 text-xs font-mono animate-fadeIn">
              <div className="flex items-center space-x-3 text-red-200">
                <span>
                  Selected: <strong className="text-white font-bold">{selectedToDelete.size}</strong> of {filteredItems.length}
                </span>
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    if (selectedToDelete.size === filteredItems.length) {
                      setSelectedToDelete(new Set());
                    } else {
                      setSelectedToDelete(new Set(filteredItems.map((i) => i.character_id)));
                    }
                  }}
                  className="text-gray-400 hover:text-white underline underline-offset-2 transition-colors"
                >
                  {selectedToDelete.size === filteredItems.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              <button
                disabled={selectedToDelete.size === 0}
                onClick={() => {
                  soundEngine.playClick();
                  setShowConfirmDelete(true);
                }}
                className="px-3.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white font-bold flex items-center space-x-1.5 shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedToDelete.size})</span>
              </button>
            </div>
          )}

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
                        Retrieving Resonator Wavebands...
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
                          isSelected={selectedToDelete.has(item.character_id)}
                          isDeleteMode={isDeleteMode}
                          isReadOnly={isReadOnly}
                          onToggleCardSelect={toggleSelectCard}
                          onToggleFavorite={toggleFavorite}
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
                            ? "Click the star icon on any resonator card to add them to your favorites for instant access!"
                            : inventory.length === 0
                            ? "Convene on limited banners to win featured 5★ resonators. They will automatically be recorded here!"
                            : "No resonators found matching your current filter criteria."}
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Delete Confirmation Warning Modal */}
        <AnimatePresence>
          {showConfirmDelete && (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 select-none"
              onClick={() => !isDeleting && setShowConfirmDelete(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 15 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="relative max-w-sm w-full bg-[#0d111a] border border-red-500/40 rounded-2xl p-6 text-center shadow-[0_0_60px_rgba(239,68,68,0.3)] space-y-5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mx-auto w-14 h-14 rounded-full bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                  <AlertTriangle className="w-7 h-7" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-black uppercase tracking-wider text-white">
                    Confirm Deletion
                  </h3>
                  <p className="text-xs text-gray-300 leading-relaxed font-mono">
                    Are you sure you want to permanently delete{" "}
                    <strong className="text-red-400 font-bold">{selectedToDelete.size}</strong>{" "}
                    resonator(s) from your database inventory?
                  </p>
                  <p className="text-[11px] text-red-400/90 font-mono bg-red-950/40 p-2 rounded-lg border border-red-500/20">
                    ⚠️ Warning: Permanently clears the selected data from the database. This action cannot be undone.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    disabled={isDeleting}
                    onClick={() => {
                      soundEngine.playClick();
                      setShowConfirmDelete(false);
                    }}
                    className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 hover:text-white font-bold uppercase text-xs tracking-wider transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isDeleting}
                    onClick={handleConfirmDelete}
                    className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black uppercase text-xs tracking-wider transition-all shadow-[0_0_20px_rgba(239,68,68,0.5)] active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {isDeleting ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
};
