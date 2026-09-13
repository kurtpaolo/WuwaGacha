"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wrench, Infinity, PlusCircle, RotateCcw } from "lucide-react";
import { AstriteIcon } from "@/components/ui/GameIcons";

interface DevSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSandbox: boolean;
  onToggleSandbox: (enabled: boolean) => void;
  onGrantCurrency: (astrite: number, tides: number) => void;
  onResetState: () => void;
}

export const DevSettingsModal: React.FC<DevSettingsModalProps> = ({
  isOpen,
  onClose,
  isSandbox,
  onToggleSandbox,
  onGrantCurrency,
  onResetState,
}) => {
  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-[#0e1119]/95 border border-white/15 rounded-xl shadow-[0_0_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/30">
                <Wrench className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-wider text-white font-display">
                  Developer & Sandbox Controls
                </h2>
                <p className="text-xs text-gray-400 tracking-wider font-mono">
                  Modify Balances, Infinite Tides & State Reset
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 text-sm">
            {/* 1. Sandbox Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] border border-white/10">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Infinity className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white uppercase text-xs tracking-wider">
                    Infinite Currency (Sandbox Mode)
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  When enabled, pulls do not deduct Astrites or Tides.
                </p>
              </div>

              <button
                onClick={() => onToggleSandbox(!isSandbox)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isSandbox ? "bg-emerald-500" : "bg-white/20"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isSandbox ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* 2. Quick Grant Currency */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 font-mono">
                Grant Player Resources
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => onGrantCurrency(16000, 0)}
                  className="flex items-center justify-center space-x-2 py-2 px-3 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-200 transition-all hover:scale-102"
                >
                  <AstriteIcon className="w-4 h-4" />
                  <span>+16,000 Astrite</span>
                </button>

                <button
                  onClick={() => onGrantCurrency(80000, 0)}
                  className="flex items-center justify-center space-x-2 py-2 px-3 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-200 transition-all hover:scale-102"
                >
                  <AstriteIcon className="w-4 h-4" />
                  <span>+80,000 Astrite</span>
                </button>

                <button
                  onClick={() => onGrantCurrency(160000, 0)}
                  className="col-span-2 flex items-center justify-center space-x-2 py-2.5 px-3 rounded bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-400/40 text-xs font-bold font-mono text-yellow-300 transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Mega Pack: +160,000 Astrite (1,000 Pulls)</span>
                </button>
              </div>
            </div>

            {/* 3. Reset State */}
            <div className="pt-2 border-t border-white/10 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-red-400/90 font-mono">
                System Reset
              </span>

              {confirmReset ? (
                <div className="p-3 rounded bg-red-950/40 border border-red-500/40 space-y-2">
                  <p className="text-xs text-red-300">
                    Are you sure? This will wipe all summon history, reset all pity counters to 0, and restore default wallet balances.
                  </p>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        onResetState();
                        setConfirmReset(false);
                      }}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                      Confirm Reset
                    </button>
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-gray-300 rounded text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmReset(true)}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-mono text-red-400 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset All Pity, History & Balances</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
