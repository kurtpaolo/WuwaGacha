"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Award,
  Search,
  Check,
  Lock,
  Sparkles,
  Flame,
  Coins,
  Users,
  CheckCircle2,
  Crown,
} from "lucide-react";
import { soundEngine } from "@/lib/audio/soundEngine";
import {
  PlayerTitle,
  TitleCategory,
  TitleContext,
  ALL_PLAYER_TITLES,
  TITLE_RARITY_REWARDS,
} from "@/lib/data/titles";

interface TitlePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  equippedTitle: string;
  onEquipTitle: (titleName: string) => void;
  onClaimTitle?: (title: PlayerTitle) => Promise<void>;
  claimedTitleIds?: string[];
  titleContext: TitleContext;
}

const CATEGORIES: { key: TitleCategory; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: "all", label: "All", icon: Sparkles },
  { key: "owned", label: "Owned", icon: CheckCircle2 },
  { key: "special", label: "Special", icon: Crown },
  { key: "luck", label: "Luck", icon: Flame },
  { key: "astrite", label: "Astrite", icon: Coins },
  { key: "collection", label: "Collection", icon: Users },
  { key: "resonator", label: "Resonators", icon: Award },
];

export const TitlePickerModal: React.FC<TitlePickerModalProps> = ({
  isOpen,
  onClose,
  equippedTitle,
  onEquipTitle,
  onClaimTitle,
  claimedTitleIds = ["the_rover"],
  titleContext,
}) => {
  const [activeCategory, setActiveCategory] = useState<TitleCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isClaimingId, setIsClaimingId] = useState<string | null>(null);

  const filteredTitles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ALL_PLAYER_TITLES.filter((title) => {
      const isUnlocked = title.isUnlocked(titleContext);
      if (activeCategory === "owned" && !isUnlocked) {
        return false;
      }
      const matchesCat =
        activeCategory === "all" || activeCategory === "owned"
          ? true
          : title.category === activeCategory;
      const matchesSearch =
        !q ||
        title.name.toLowerCase().includes(q) ||
        title.description.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [activeCategory, searchQuery, titleContext]);

  const statsCount = useMemo(() => {
    let unlocked = 0;
    ALL_PLAYER_TITLES.forEach((t) => {
      if (t.isUnlocked(titleContext)) unlocked++;
    });
    return { unlocked, total: ALL_PLAYER_TITLES.length };
  }, [titleContext]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/95 select-none overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[92dvh] bg-[#0c1017] border-0 sm:border-2 border-yellow-500/40 rounded-none sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar */}
          <div className="px-4 sm:px-6 py-3.5 border-b border-white/10 bg-[#0c1017] flex items-center justify-between gap-3 flex-shrink-0 sticky top-0 z-30 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-3.5">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-yellow-400/15 border border-yellow-400/40 text-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.3)]">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black font-sans uppercase tracking-wider text-white">
                  Title Customizer
                </h2>
                <p className="text-[11px] font-mono text-gray-400">
                  Unlocked: <span className="text-yellow-400 font-bold">{statsCount.unlocked}</span> / {statsCount.total}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="relative p-2 rounded-xl bg-gradient-to-br from-rose-500/25 to-pink-600/30 hover:from-rose-500/40 hover:to-pink-600/50 border border-rose-500/50 text-rose-300 hover:text-white transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] active:scale-95 group flex-shrink-0 cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
            </button>
          </div>

          {/* Currently Equipped Banner */}
          <div className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-yellow-950/60 via-amber-950/40 to-yellow-950/60 border-b border-yellow-500/20 flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-yellow-300/90 font-bold">
              Equipped Title:
            </span>
            <span className="px-3 py-1 rounded-xl bg-yellow-400/15 border border-yellow-400/50 text-yellow-300 font-mono font-black text-xs sm:text-sm tracking-wide shadow-[0_0_15px_rgba(250,204,21,0.3)]">
              [{equippedTitle}]
            </span>
          </div>

          {/* Controls: Search & Category Tabs */}
          <div className="p-3 sm:p-4 border-b border-white/10 bg-black/40 space-y-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search titles or unlock conditions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-black/60 border border-white/10 focus:border-yellow-400/80 rounded-xl text-xs sm:text-sm font-mono text-white placeholder-gray-500 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills (Smooth side-by-side scrollable on mobile) */}
            <div className="flex items-center overflow-x-auto overscroll-x-contain touch-pan-x flex-nowrap scrollbar-none sm:flex-wrap gap-1.5 sm:gap-2 py-1 -my-1 min-w-0">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setActiveCategory(cat.key);
                    }}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center space-x-1.5 transition-all whitespace-nowrap active:scale-95 cursor-pointer ${
                      isActive
                        ? "bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.35)]"
                        : "bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-black" : "text-gray-400"}`} />
                    <span>{cat.key === "owned" ? `${cat.label} (${statsCount.unlocked})` : cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Titles List */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 max-h-[50vh] sm:max-h-[55vh] scrollbar-thin scrollbar-thumb-white/10 overscroll-contain">
            {filteredTitles.length === 0 ? (
              <div className="py-12 text-center text-xs font-mono text-gray-500">
                No titles found matching &quot;{searchQuery}&quot;.
              </div>
            ) : (
              filteredTitles.map((title) => {
                const unlocked = title.isUnlocked(titleContext);
                const isClaimed = (claimedTitleIds || []).includes(title.id) || title.id === "the_rover";
                const isEquipped = equippedTitle.toLowerCase() === title.name.toLowerCase();
                const reward = TITLE_RARITY_REWARDS[title.rarity] || { pulls: 1, astrite: 160 };
                const progress = title.getProgress ? title.getProgress(titleContext) : null;
                const progressPercent = progress
                  ? Math.min(100, Math.round((progress.current / progress.target) * 100))
                  : unlocked
                  ? 100
                  : 0;

                return (
                  <div
                    key={title.id}
                    style={{ contentVisibility: "auto", containIntrinsicSize: "84px" }}
                    className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isEquipped
                        ? "bg-yellow-500/10 border-yellow-400/70 shadow-[0_0_20px_rgba(250,204,21,0.2)]"
                        : unlocked && !isClaimed
                        ? "bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-transparent border-yellow-400/60 shadow-[0_0_15px_rgba(250,204,21,0.15)]"
                        : unlocked
                        ? "bg-black/60 hover:bg-white/[0.04] border-white/15 hover:border-yellow-400/40"
                        : "bg-black/30 border-white/5 opacity-70"
                    }`}
                  >
                    {/* Left: Title info & progress */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span
                          className="font-sans font-black text-sm sm:text-base tracking-wide truncate"
                          style={{
                            color: title.customColor || "#FFFFFF",
                            textShadow: title.customColor ? `0 0 10px ${title.customColor}66` : undefined,
                          }}
                        >
                          {title.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-black uppercase tracking-wider border ${title.badgeColorClass}`}
                        >
                          {title.rarity}
                        </span>
                        {isEquipped && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[9px] font-mono font-black uppercase">
                            Equipped
                          </span>
                        )}
                        {unlocked && !isClaimed && (
                          <span className="px-2 py-0.5 rounded-md bg-yellow-400/20 text-yellow-300 border border-yellow-400/50 text-[9px] font-mono font-black uppercase animate-pulse">
                            +{reward.astrite} Astrite Ready
                          </span>
                        )}
                        {unlocked && isClaimed && !isEquipped && (
                          <span className="px-2 py-0.5 rounded-md bg-white/10 text-gray-300 border border-white/20 text-[9px] font-mono font-black uppercase">
                            Claimed
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-mono text-gray-300 leading-relaxed">
                        {title.description}
                      </p>

                      {/* Progress Bar (if not unlocked and progress available) */}
                      {!unlocked && progress && (
                        <div className="space-y-1 pt-1 max-w-sm">
                          <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                            <span>Requirement</span>
                            <span className="text-yellow-400/90 font-bold">
                              {progress.current.toLocaleString()} / {progress.target.toLocaleString()}{" "}
                              {progress.label}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 transition-all duration-300"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Action Button */}
                    <div className="flex-shrink-0 self-end sm:self-center">
                      {isEquipped ? (
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-mono font-bold flex items-center space-x-1.5 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>ACTIVE</span>
                        </div>
                      ) : unlocked && !isClaimed ? (
                        <button
                          type="button"
                          disabled={isClaimingId === title.id}
                          onClick={async () => {
                            soundEngine.playClick();
                            setIsClaimingId(title.id);
                            try {
                              if (onClaimTitle) await onClaimTitle(title);
                            } finally {
                              setIsClaimingId(null);
                            }
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-black font-mono font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_18px_rgba(250,204,21,0.5)] active:scale-95 flex items-center space-x-1.5 cursor-pointer animate-pulse disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-black" />
                          <span>{isClaimingId === title.id ? "CLAIMING..." : `CLAIM (+${reward.astrite})`}</span>
                        </button>
                      ) : unlocked && isClaimed ? (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick();
                            onEquipTitle(title.name);
                          }}
                          className="px-4 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-mono font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(250,204,21,0.35)] active:scale-95 cursor-pointer"
                        >
                          EQUIP
                        </button>
                      ) : (
                        <div className="flex flex-col items-end space-y-1">
                          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-500 text-xs font-mono font-bold flex items-center space-x-1.5 cursor-not-allowed">
                            <Lock className="w-3.5 h-3.5" />
                            <span>LOCKED</span>
                          </div>
                          <span className="text-[10px] font-mono text-yellow-400/70 font-semibold">
                            +{reward.astrite} ✦ on Unlock
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
