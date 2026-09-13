"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { soundEngine } from "@/lib/audio/soundEngine";
import { X, BookOpen, Shield, Sparkles } from "lucide-react";

interface DetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bannerType?: string;
}

export const DetailsModal: React.FC<DetailsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-3xl bg-[#0c0f16]/95 border border-white/15 rounded-xl shadow-[0_0_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/30">
                <Shield className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider text-white">
                  Notice & Disclaimer
                </h2>
                <p className="text-xs text-yellow-400/80 tracking-wider">
                  Fan-Made Project Information
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

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 text-sm text-gray-300">
            {/* Primary Disclaimer Banner */}
            <div className="p-6 rounded-xl bg-gradient-to-br from-yellow-500/15 via-black/40 to-yellow-500/5 border border-yellow-400/40 space-y-3 shadow-[0_0_30px_rgba(250,204,21,0.1)]">
              <div className="flex items-center space-x-2.5 text-yellow-400 font-black text-lg sm:text-xl uppercase tracking-wider">
                <Sparkles className="w-5 h-5 text-yellow-400 shrink-0" />
                <span>THIS WEB IS JUST FANMADE OF SORT AND NO MONETARY WHATSOEVER</span>
              </div>
              <p className="text-sm text-gray-200 leading-relaxed">
                This website is an unofficial, non-profit, fan-made gacha simulator created solely for entertainment, research, and simulation purposes.
              </p>
            </div>

            {/* Terms & Intellectual Property */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-lg bg-white/[0.03] border border-white/10 space-y-2">
                <h3 className="font-bold uppercase tracking-wider text-white flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span>No Monetary Value / Free Forever</span>
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  There is <strong className="text-gray-200">NO real-world currency</strong>, no monetization, no payment gateway, no donations, and no microtransactions. All currency in this app (Astrites) is virtual and freely obtainable.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-white/[0.03] border border-white/10 space-y-2">
                <h3 className="font-bold uppercase tracking-wider text-white flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  <span>Copyright & Trademarks</span>
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  All character arts, splash illustrations, 3D animations, music, sound effects, and trademarks belong exclusively to <strong className="text-gray-200">Kuro Games</strong> (Guangzhou Kuro Technology Co., Ltd.). This site is not affiliated with or endorsed by Kuro Games.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-white/10 bg-white/[0.01] flex justify-end">
            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="px-6 py-2 rounded-sm bg-white/10 hover:bg-white/20 text-white font-display text-xs font-bold uppercase tracking-wider transition-all"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
