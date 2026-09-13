"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { soundEngine } from "@/lib/audio/soundEngine";
import { X, ChevronLeft, ChevronRight, Clock, ShieldCheck } from "lucide-react";
import { getClientHistory } from "@/lib/gacha/clientSim";

interface HistoryItem {
  id: string;
  banner_type: string;
  banner_id: string;
  item_id: string;
  item_name: string;
  item_type: "resonator" | "weapon";
  rarity: number;
  pity_count: number;
  is_guaranteed: number;
  created_at: string;
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchHistory = useCallback((p: number) => {
    setLoading(true);
    try {
      const data = getClientHistory(p, 5);
      setLogs(data.logs as any || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
    } catch (e) {
      console.error("Failed to fetch history:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchHistory(page);
    }
  }, [isOpen, page, fetchHistory]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl bg-[#0c0f16]/95 border border-white/15 rounded-xl shadow-[0_0_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[88vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/30">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider text-white">
                  Convene History
                </h2>
                <p className="text-xs text-gray-400 tracking-wider font-mono">
                  Solaris-3 Resonance Log Records • Total Summons Recorded: {totalCount}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Table of Records */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            {loading ? (
              <div className="py-24 text-center text-gray-400 font-mono animate-pulse">
                Querying Solaris-3 Resonance Database...
              </div>
            ) : logs.length === 0 ? (
              <div className="py-24 text-center text-gray-500 font-mono">
                No convene records found for this category yet.
              </div>
            ) : (
              <div className="w-full border border-white/10 rounded-lg overflow-hidden bg-black/30">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10 text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Item Name</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Rarity</th>
                      <th className="py-3 px-4">Pull Pity</th>
                      <th className="py-3 px-4">Status</th>
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
                          <td className="py-3.5 px-4 font-bold text-sm">
                            <span
                              className={
                                isGold
                                  ? "text-yellow-400"
                                  : isPurple
                                  ? "text-purple-300"
                                  : "text-gray-300"
                              }
                            >
                              {log.item_name === "Cat 3⭐"
                                ? "Hapi Cat"
                                : log.item_name === "Cat 4⭐"
                                ? "Sleepy Cat"
                                : log.item_name}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 uppercase text-gray-400">
                            {log.item_type}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`px-2 py-0.5 rounded font-bold ${
                                  isGold
                                    ? "bg-yellow-400 text-black"
                                    : isPurple
                                    ? "bg-purple-500 text-white"
                                    : "bg-sky-500/20 text-sky-300"
                                }`}
                              >
                                {log.rarity}★
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
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
                          <td className="py-3.5 px-4">
                            {log.is_guaranteed ? (
                              <span className="inline-flex items-center space-x-1 text-emerald-400">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Guaranteed</span>
                              </span>
                            ) : (
                              <span className="text-gray-500">Standard</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-gray-400 whitespace-nowrap">
                            {log.created_at}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer: Pagination */}
          <div className="px-8 py-4 border-t border-white/10 bg-white/[0.01] flex items-center justify-between">
            <span className="text-xs text-gray-400 font-mono">
              Page {page} of {totalPages} ({totalCount} total entries)
            </span>

            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => {
                  soundEngine.playClick();
                  setPage((p) => Math.max(1, p - 1));
                }}
                className="p-1.5 rounded bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:pointer-events-none text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                disabled={page >= totalPages}
                onClick={() => {
                  soundEngine.playClick();
                  setPage((p) => Math.min(totalPages, p + 1));
                }}
                className="p-1.5 rounded bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:pointer-events-none text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
