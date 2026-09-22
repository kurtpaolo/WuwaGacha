"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, X, ArrowLeft, Radio, AlertTriangle } from "lucide-react";
import { PendingPvpNotice } from "@/lib/battle/pvpService";
import { soundEngine } from "@/lib/audio/soundEngine";

interface PvpDisconnectNoticeModalProps {
  notice: PendingPvpNotice | null;
  onAcknowledge: () => void;
}

export const PvpDisconnectNoticeModal: React.FC<PvpDisconnectNoticeModalProps> = ({
  notice,
  onAcknowledge,
}) => {
  if (!notice) return null;

  const handleClose = () => {
    soundEngine.playClick();
    onAcknowledge();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-lg bg-[#090d16] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Top Bar matching Battle Results modal */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-black/40">
            <div className="flex items-center space-x-2.5">
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all border border-white/10"
                title="Back"
              >
                <ArrowLeft className="w-4 h-4 text-yellow-400" />
              </button>
              <div className="p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400">
                <Radio className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white font-display">
                Battle Results
              </h2>
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/10"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Center Content */}
          <div className="flex flex-col items-center justify-center p-6 sm:p-8 space-y-4 text-center">
            <div className="p-4 rounded-full border bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-[0_0_40px_rgba(244,63,94,0.4)]">
              <Shield className="w-12 h-12" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-2xl sm:text-3xl font-black font-display uppercase tracking-wider text-white">
                {notice.isForfeit ? "Match Forfeited" : "Defeat"}
              </h3>
              <p className="text-xs sm:text-sm font-mono text-gray-400 max-w-sm mx-auto">
                You were disconnected from your PvP match against{" "}
                <span className="text-white font-bold">
                  @{notice.opponentUsername || "Opponent"}
                </span>
                .
              </p>
            </div>

            {/* Alert Banner matching PvP Battle Results */}
            <div className="w-full p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center space-x-2 text-xs font-mono font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {notice.isEarlyForfeit
                  ? `Early Forfeit (< 3 turns): ${notice.bet} Bet Refunded (Net 0) | No Contest`
                  : notice.bet > 0
                  ? `Match Forfeited: ${notice.bet} Astrite Bet Deducted`
                  : "Match Forfeited: Disconnected while battle was in progress"}
              </span>
            </div>

            {/* Return to Lobby Button (NO REMATCH) */}
            <div className="pt-3 w-full flex justify-center">
              <button
                onClick={handleClose}
                className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                Return to Lobby
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
