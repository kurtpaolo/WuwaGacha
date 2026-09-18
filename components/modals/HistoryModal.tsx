"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { soundEngine } from "@/lib/audio/soundEngine";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";
import {
  ClientHistoryItem,
  getClientHistory,
  get5StarHistory,
  get5050Stats,
  WinRateStats,
} from "@/lib/gacha/clientSim";
import { RESONATORS, WEAPONS } from "@/lib/data/items";

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
  isSandbox?: boolean;
}

type HistoryTab = "all" | "five_star";

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  userId,
  isSandbox,
}) => {
  const [activeTab, setActiveTab] = useState<HistoryTab>("all");
  const [logs, setLogs] = useState<ClientHistoryItem[]>([]);
  const [fiveStars, setFiveStars] = useState<ClientHistoryItem[]>([]);
  const [stats, setStats] = useState<WinRateStats>({
    total5050: 0,
    wins5050: 0,
    losses5050: 0,
    winRate: null,
    winRateFormatted: "N/A",
    total5Stars: 0,
    avgPity5Star: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchHistory = useCallback((p: number) => {
    setLoading(true);
    try {
      const data = getClientHistory(p, 5, userId, isSandbox);
      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);

      const fStars = get5StarHistory(userId, isSandbox);
      setFiveStars(fStars);

      const st = get5050Stats(userId, isSandbox);
      setStats(st);
    } catch (e) {
      console.error("Failed to fetch history:", e);
    } finally {
      setLoading(false);
    }
  }, [userId, isSandbox]);

  useEffect(() => {
    if (isOpen) {
      fetchHistory(page);
    }
  }, [isOpen, page, fetchHistory]);

  if (!isOpen) return null;

  // Helper for 5-star pity badge color
  // 1-59 pulls: green, 60-69 pulls: yellow, 70-80 pulls: red
  const getPityBadgeColor = (pity: number) => {
    if (pity < 60) {
      return "bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.8)] border border-emerald-300";
    }
    if (pity < 70) {
      return "bg-yellow-400 text-black shadow-[0_0_10px_rgba(250,204,21,0.8)] border border-yellow-200";
    }
    return "bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.8)] border border-red-300";
  };

  const getAvatarUrl = (item: ClientHistoryItem) => {
    if (item.item_type === "resonator") {
      const res = RESONATORS[item.item_id];
      return (
        res?.portraitUrl ||
        res?.stillUrl ||
        `/assets/characters/${item.item_id}_portrait.png`
      );
    }
    const wep = WEAPONS[item.item_id];
    return wep?.portraitUrl || (item.rarity === 4 ? "/assets/4starcat.png" : "/assets/3starcat.png");
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-8 bg-black/95 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl bg-[#0c0f16] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-8 py-3.5 sm:py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/30">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-black uppercase tracking-wider text-white">
                  Convene History
                </h2>
                <p className="text-[11px] sm:text-xs text-gray-400 tracking-wider font-mono">
                  Detailed Pull &amp; Pity Logs
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

          {/* 50/50 Winrate & Stat Bar (wuwatracker style) */}
          <div className="px-4 sm:px-8 py-2.5 bg-black/40 border-b border-white/10 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
            <div className="flex items-center space-x-3 sm:space-x-6 flex-wrap">
              {/* 50/50 Win Rate */}
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 uppercase text-[11px] font-bold">50/50 Win Rate:</span>
                <span
                  className={`font-black text-sm ${
                    stats.winRate !== null
                      ? stats.winRate >= 50
                        ? "text-emerald-400"
                        : "text-amber-400"
                      : "text-gray-400"
                  }`}
                >
                  {stats.winRateFormatted}
                </span>
                {stats.total5050 > 0 && (
                  <span className="text-gray-400 text-[11px]">
                    ({stats.wins5050}W / {stats.losses5050}L)
                  </span>
                )}
              </div>

              {/* Total 5-Stars */}
              <div className="flex items-center space-x-1.5">
                <span className="text-gray-400 uppercase text-[11px]">Total 5★:</span>
                <span className="text-yellow-400 font-bold">{stats.total5Stars}</span>
              </div>

              {/* Avg Pity */}
              {stats.total5Stars > 0 && (
                <div className="flex items-center space-x-1.5">
                  <span className="text-gray-400 uppercase text-[11px]">Avg Pity:</span>
                  <span className="text-amber-300 font-bold">{stats.avgPity5Star}</span>
                </div>
              )}
            </div>

            <div className="text-[11px] text-gray-500">
              Total Summons: <strong className="text-gray-300">{totalCount}</strong>
            </div>
          </div>

          {/* Tab Selector: "All" vs "5 ⭐" */}
          <div className="px-4 sm:px-8 pt-3 pb-2 border-b border-white/10 bg-white/[0.01] flex items-center space-x-3">
            <button
              onClick={() => {
                soundEngine.playClick();
                setActiveTab("all");
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === "all"
                  ? "bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.35)]"
                  : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10"
              }`}
            >
              All
            </button>

            <button
              onClick={() => {
                soundEngine.playClick();
                setActiveTab("five_star");
              }}
              className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === "five_star"
                  ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-[0_0_15px_rgba(250,204,21,0.35)]"
                  : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10"
              }`}
            >
              <span>5 ⭐</span>
              {fiveStars.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  activeTab === "five_star" ? "bg-black/30 text-black" : "bg-yellow-400/20 text-yellow-300"
                }`}>
                  {fiveStars.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8">
            {loading ? (
              <div className="py-24 text-center text-gray-400 font-mono animate-pulse">
                Loading history...
              </div>
            ) : activeTab === "all" ? (
              /* ========================================================================= */
              /* TAB 1: ALL PULLS TABLE (5 Rows per page) */
              /* ========================================================================= */
              logs.length === 0 ? (
                <div className="py-24 text-center text-gray-500 font-mono">
                  No convene records found yet. Pull on any banner to view history!
                </div>
              ) : (
                <div className="w-full border border-white/10 rounded-xl overflow-x-auto bg-black/30 shadow-inner">
                  <table className="w-full min-w-[620px] text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-gray-400 uppercase tracking-wider">
                        <th className="py-3 px-4">Item Name</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Rarity</th>
                        <th className="py-3 px-4">Pull Pity</th>
                        <th className="py-3 px-4">50/50 Status</th>
                        <th className="py-3 px-4">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {logs.map((log) => {
                        const isGold = log.rarity === 5;
                        const isPurple = log.rarity === 4;

                        return (
                          <tr
                            key={log.id}
                            className={`transition-colors ${
                              isGold
                                ? "bg-yellow-500/10 hover:bg-yellow-500/15"
                                : isPurple
                                ? "bg-purple-500/10 hover:bg-purple-500/15"
                                : "hover:bg-white/[0.03]"
                            }`}
                          >
                            <td className="py-3 px-4 font-bold text-sm">
                              <span
                                className={
                                  isGold
                                    ? "text-yellow-400 font-display"
                                    : isPurple
                                    ? "text-purple-300"
                                    : "text-gray-300"
                                }
                              >
                                {log.item_name === "The Shorekeeper" || log.item_name === "Shorekeeper"
                                  ? "Shorekeeper"
                                  : log.item_name === "Cat 3⭐"
                                  ? "Hapi Cat"
                                  : log.item_name === "Cat 4⭐"
                                  ? "Sleepy Cat"
                                  : log.item_name}
                              </span>
                            </td>
                            <td className="py-3 px-4 uppercase text-gray-400">
                              {log.item_type}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded font-bold ${
                                  isGold
                                    ? "bg-yellow-400 text-black shadow-[0_0_8px_rgba(250,204,21,0.5)]"
                                    : isPurple
                                    ? "bg-purple-500 text-white shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                                    : "bg-sky-500/20 text-sky-300"
                                }`}
                              >
                                {log.rarity}★
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`font-bold ${
                                  isGold
                                    ? "text-yellow-400"
                                    : isPurple
                                    ? "text-purple-300"
                                    : "text-gray-400"
                                }`}
                              >
                                Pull #{log.pity_count}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {isGold ? (
                                log.is_5050_win === true ? (
                                  <span className="inline-flex items-center space-x-1 text-emerald-400 font-bold">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>50/50 Won</span>
                                  </span>
                                ) : log.is_5050_win === false ? (
                                  <span className="inline-flex items-center space-x-1 text-red-400 font-bold">
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>50/50 Lost</span>
                                  </span>
                                ) : log.is_guaranteed ? (
                                  <span className="inline-flex items-center space-x-1 text-sky-400 font-bold">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>Guaranteed</span>
                                  </span>
                                ) : (
                                  <span className="text-gray-400">Standard</span>
                                )
                              ) : log.is_guaranteed ? (
                                <span className="inline-flex items-center space-x-1 text-emerald-400">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Guaranteed</span>
                                </span>
                              ) : (
                                <span className="text-gray-500">Standard</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-gray-400 whitespace-nowrap text-[11px]">
                              {log.created_at}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              /* ========================================================================= */
              /* TAB 2: 5-STAR SHOWCASE (wuwatracker.com style) */
              /* ========================================================================= */
              <div>
                {/* Section Title */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-white flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span>Recent Convenes</span>
                  </h3>
                </div>

                {/* 5-Stars Avatar Grid */}
                {fiveStars.length === 0 ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="mx-auto w-14 h-14 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-bold text-white uppercase">
                      No 5-Star Convenes Recorded Yet
                    </h4>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                      Pull 5★ resonators to see your pity and drop history here!
                    </p>
                  </div>
                ) : (
                  <div className="pt-6">
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                      {fiveStars.map((item, idx) => {
                        const avatarSrc = getAvatarUrl(item);
                        const cleanName =
                          item.item_name === "The Shorekeeper" || item.item_name === "Shorekeeper"
                            ? "Shorekeeper"
                            : item.item_name;

                        return (
                          <div
                            key={item.id || idx}
                            className="group relative flex flex-col items-center"
                          >
                            {/* Circular Profile Avatar with Bottom-Right Pity Badge */}
                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full p-0.5 bg-gradient-to-tr from-yellow-500 via-amber-300 to-yellow-600 shadow-[0_0_15px_rgba(250,204,21,0.3)] transition-transform duration-200 group-hover:scale-105">
                              <div className="w-full h-full rounded-full overflow-hidden bg-black/60 border border-black">
                                <img
                                  src={avatarSrc}
                                  alt={cleanName}
                                  className="w-full h-full object-cover object-top"
                                  loading="lazy"
                                />
                              </div>

                              {/* Colored Circular Pity Badge at Bottom Right (1-59 Green, 60-69 Yellow, 70-80 Red) */}
                              <div
                                className={`absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-mono font-black ${getPityBadgeColor(
                                  item.pity_count
                                )}`}
                                title={`${cleanName} pulled at pity ${item.pity_count}`}
                              >
                                {item.pity_count}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer: Pagination (for "All" Tab only) */}
          {activeTab === "all" && (
            <div className="px-4 sm:px-8 py-3 sm:py-4 border-t border-white/10 bg-white/[0.01] flex items-center justify-between">
              <span className="text-[11px] sm:text-xs text-gray-400 font-mono">
                Page {page} of {totalPages} ({totalCount} total entries • 5 rows/page)
              </span>

              <div className="flex items-center space-x-2">
                <button
                  disabled={page <= 1}
                  onClick={() => {
                    soundEngine.playClick();
                    setPage((p) => Math.max(1, p - 1));
                  }}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:pointer-events-none text-white transition-colors"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  disabled={page >= totalPages}
                  onClick={() => {
                    soundEngine.playClick();
                    setPage((p) => Math.min(totalPages, p + 1));
                  }}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:pointer-events-none text-white transition-colors"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
