"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus } from "lucide-react";
import { AstriteIcon } from "@/components/ui/GameIcons";

interface ReplenishModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencyType?: string;
  currentBalances: {
    astrite: number;
    radiantTide?: number;
    forgingTide?: number;
    lustrousTide?: number;
    afterglowCoral?: number;
    oscillatedCoral?: number;
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

  const currencyConfig = {
    name: "Astrite",
    icon: <AstriteIcon className="w-6 h-6" />,
    current: currentBalances.astrite || 0,
    presets: [67, 670, 6700, 67000, 676767],
    color: "text-yellow-400",
    borderColor: "border-yellow-400/40",
  };

  const handleApplyPreset = async (amt: number) => {
    setSubmitting(true);
    try {
      await onUpdateCurrency(currencyType, currencyConfig.current + amt);
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
      await onUpdateCurrency(currencyType, val);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-[#0e121a] border border-white/15 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                {currencyConfig.icon}
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-wider text-white">
                  Replenish {currencyConfig.name}
                </h3>
                <p className="text-xs font-mono text-gray-400">
                  Current Balance:{" "}
                  <strong className={currencyConfig.color}>
                    {currencyConfig.current.toLocaleString()}
                  </strong>
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
              <label className="block text-xs font-mono uppercase text-gray-400 mb-2 font-bold">
                Quick Add Presets:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {currencyConfig.presets.map((amt) => (
                  <button
                    key={amt}
                    disabled={submitting}
                    onClick={() => handleApplyPreset(amt)}
                    className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded bg-white/5 hover:bg-white/15 border border-white/10 hover:border-yellow-400/40 text-xs font-mono font-bold text-gray-200 hover:text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5 text-yellow-400" />
                    <span>+{amt.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Exact Balance Input */}
            <div>
              <label className="block text-xs font-mono uppercase text-gray-400 mb-2 font-bold">
                Set Exact Quantity:
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  min="0"
                  placeholder={`e.g. 50000`}
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
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
