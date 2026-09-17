"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Sparkles, ShieldAlert } from "lucide-react";
import { AstriteIcon } from "@/components/ui/GameIcons";
import { MAX_ASTRITE_LIMIT } from "@/lib/supabase/profile";

interface ReplenishModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencyType?: string;
  currentBalances: {
    astrite: number;
  };
  onUpdateCurrency: (currency: string, newAmount: number) => Promise<void>;
}

export const ReplenishModal: React.FC<ReplenishModalProps> = ({
  isOpen,
  onClose,
  currencyType = "astrite",
  currentBalances,
  onUpdateCurrency,
}) => {
  const [customAmount, setCustomAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentAstrite = currentBalances.astrite || 0;
  const presets = [1600, 8000, 16000, 48000, 80000];

  const handleApplyPreset = async (amt: number) => {
    setSubmitting(true);
    try {
      const nextTotal = Math.min(MAX_ASTRITE_LIMIT, currentAstrite + amt);
      await onUpdateCurrency(currencyType, nextTotal);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleFillMax = async () => {
    setSubmitting(true);
    try {
      await onUpdateCurrency(currencyType, MAX_ASTRITE_LIMIT);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetExact = async () => {
    const val = parseInt(customAmount, 10);
    if (isNaN(val) || val < 0) return;
    setSubmitting(true);
    try {
      const clamped = Math.min(MAX_ASTRITE_LIMIT, Math.max(0, val));
      await onUpdateCurrency(currencyType, clamped);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-[#0e121a] border border-white/15 rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/30">
                <AstriteIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-wider text-white">
                  Replenish Astrite
                </h3>
                <p className="text-xs font-mono text-gray-400">
                  Current:{" "}
                  <strong className="text-yellow-400">
                    {currentAstrite.toLocaleString()}
                  </strong>{" "}
                  / {MAX_ASTRITE_LIMIT.toLocaleString()}
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
          <div className="p-6 space-y-5">
            {/* Quick Add Presets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono uppercase text-gray-400 font-bold">
                  Quick Add Presets:
                </label>
                <button
                  disabled={submitting || currentAstrite >= MAX_ASTRITE_LIMIT}
                  onClick={handleFillMax}
                  className="text-[11px] font-mono font-bold text-yellow-400 hover:text-yellow-300 underline disabled:opacity-40"
                >
                  Fill to Max (160k)
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {presets.map((amt) => {
                  const wouldExceed = currentAstrite + amt > MAX_ASTRITE_LIMIT;
                  return (
                    <button
                      key={amt}
                      disabled={submitting || currentAstrite >= MAX_ASTRITE_LIMIT}
                      onClick={() => handleApplyPreset(amt)}
                      className="flex items-center justify-center space-x-1 py-2 px-2 rounded bg-white/5 hover:bg-white/15 border border-white/10 hover:border-yellow-400/40 text-xs font-mono font-bold text-gray-200 hover:text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5 text-yellow-400" />
                      <span>+{amt >= 1000 ? `${amt / 1000}k` : amt}</span>
                    </button>
                  );
                })}
                <button
                  disabled={submitting || currentAstrite >= MAX_ASTRITE_LIMIT}
                  onClick={handleFillMax}
                  className="flex items-center justify-center space-x-1 py-2 px-2 rounded bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/40 text-xs font-mono font-bold text-yellow-400 transition-all hover:scale-105 active:scale-95 disabled:opacity-40 col-span-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Max Out</span>
                </button>
              </div>
            </div>

            {/* Custom Exact Balance Input */}
            <div>
              <label className="block text-xs font-mono uppercase text-gray-400 mb-2 font-bold">
                Set Exact Balance (Max 160,000):
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  min="0"
                  max={MAX_ASTRITE_LIMIT}
                  placeholder={`e.g. 16000`}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="flex-1 px-3 py-2 rounded bg-black/60 border border-white/15 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400"
                />
                <button
                  disabled={submitting || !customAmount}
                  onClick={handleSetExact}
                  className="px-4 py-2 rounded bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-display font-black uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  Set
                </button>
              </div>
            </div>

            {/* Info notice */}
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono text-gray-400 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              <span>Balance is capped at 160,000 Astrite (1,000 pulls) for optimal database efficiency.</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
