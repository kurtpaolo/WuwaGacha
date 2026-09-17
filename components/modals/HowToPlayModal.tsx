"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  HelpCircle,
  Coins,
  Gift,
  Clock,
  Briefcase,
  User,
  Infinity,
  Sparkles,
  Flame,
  CheckCircle2,
  Award,
  Crown,
} from "lucide-react";
import { soundEngine } from "@/lib/audio/soundEngine";

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="relative w-full max-w-2xl bg-[#0d1017] border border-yellow-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 sm:px-6 py-3.5 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-yellow-500/20 border border-yellow-400/30 text-yellow-300">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                  How the Game Works
                </h2>
                <p className="text-[11px] font-mono text-yellow-300/80">
                  Game Loop, Free Astrite, Banners & Collections
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body: Scrollable Cards */}
          <div className="p-4 sm:p-6 overflow-y-auto max-h-[68vh] space-y-3.5 scrollbar-thin scrollbar-thumb-white/10">
            {/* 1. Free Astrite (Waveplate System) */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-transparent border border-yellow-500/30 space-y-1.5">
              <div className="flex items-center space-x-2 text-yellow-400">
                <Coins className="w-4 h-4 flex-shrink-0" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                  1. Free Astrite (Works Like Waveplates!)
                </h3>
              </div>
              <p className="text-xs font-mono text-gray-300 leading-relaxed">
                Astrite recharges automatically similar to how Waveplates in Wuthering Waves:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] font-mono">
                <div className="p-2 rounded-lg bg-black/40 border border-white/5 space-y-0.5">
                  <span className="text-yellow-300 font-bold block">Rate:</span>
                  <span className="text-gray-300">
                    <strong>160 Astrite every 4.5 mins</strong> (1 pull every 4m 30s).
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-black/40 border border-white/5 space-y-0.5">
                  <span className="text-amber-300 font-bold block">12h to 18h (24h VIP) Cap:</span>
                  <span className="text-gray-300">
                    Base <strong>25,600 (160 pulls / 12h)</strong>. Scales permanently up to <strong>38,400 (240 pulls / 18h)</strong> via Login Streaks! VIP grants +50% base (+80 pulls / +6h) reaching up to <strong>51,200 (320 pulls / 24h)</strong>.
                  </span>
                </div>
              </div>
              <p className="text-[11px] font-mono text-yellow-200/90 pt-1 flex items-center space-x-1.5">
                <Flame className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                <span>
                  <strong>Daily Streak Resets:</strong> Streaks evaluate at <strong>00:00 GMT+8</strong> daily. Reaching 2, 5, 9, and 14 days permanently expands your battery by +1.5h (+20 pulls) each milestone!
                </span>
              </p>
            </div>

            {/* 2. Player Profile, Titles & Showcase */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400">
                <User className="w-4 h-4 flex-shrink-0" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                  2. Player Profile, Titles & Showcase
                </h3>
              </div>
              <p className="text-xs font-mono text-gray-300 leading-relaxed">
                Personalize your public profile with custom avatar portraits, your 6-Resonator showcase, and live stats (5★ count, pity, and 50/50 win rate). Anyone can search your username to inspect your achievements!
              </p>
              <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/25 space-y-1">
                <div className="flex items-center space-x-1.5 text-yellow-300 font-bold text-xs font-mono">
                  <Award className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                  <span>Collect Titles to Flex to Others!</span>
                </div>
                <p className="text-[11px] font-mono text-gray-300 leading-relaxed">
                  Unlock cool titles across various rarities through convenes, lucky winning streaks, milestones, and achieving S6 on specific 5★ Resonators. Claim each title to earn bonus Astrite and equip them to showcase your profile to others!
                </p>
              </div>
            </div>

            {/* 3. 5★ Cash Back */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
              <div className="flex items-center space-x-2 text-amber-400">
                <Gift className="w-4 h-4 flex-shrink-0" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                  3. 5★ Cash Back (+5 Pulls per Copy)
                </h3>
              </div>
              <p className="text-xs font-mono text-gray-300 leading-relaxed">
                Every copy of a featured 5★ Resonator you convene gives you an automatic refund of <strong>5 pulls (800 Astrite)</strong> credited straight to your balance.
              </p>
            </div>

            {/* 4. Hourly Banner Reset (GMT+8) */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
              <div className="flex items-center space-x-2 text-cyan-400">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                  4. Hourly 3-Character Banner Rotation
                </h3>
              </div>
              <p className="text-xs font-mono text-gray-300 leading-relaxed">
                Featured banners rotate every hour (xx:00 GMT+8) with <strong>3 random 5★ limited Resonators</strong>. All players see the exact same 3 characters. Your 5★ pity (guaranteed at 80) and 50/50 guarantees carry over between rotations!
              </p>
            </div>

            {/* 5. Resonator Collection & Inventory */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
              <div className="flex items-center space-x-2 text-purple-400">
                <Briefcase className="w-4 h-4 flex-shrink-0" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                  5. Resonator Inventory & Wavebands
                </h3>
              </div>
              <p className="text-xs font-mono text-gray-300 leading-relaxed">
                Click the <strong>Inventory</strong> suitcase in the top header or at the bottom of your screen to inspect your 5★ Resonators, duplicate waveband sequences (S0 to S6), and total collection progress.
              </p>
            </div>

            {/* 6. Accounts vs Sandbox Mode */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
              <div className="flex items-center space-x-2 text-teal-400">
                <Infinity className="w-4 h-4 flex-shrink-0" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                  6. Accounts vs Sandbox Mode
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded-lg bg-black/40 border border-white/5 space-y-0.5">
                  <span className="text-white font-bold block">Cloud Account (Recommended):</span>
                  <span className="text-gray-300">
                    Saves your pulls, inventory, and Astrite permanently across devices.
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-black/40 border border-white/5 space-y-0.5">
                  <span className="text-teal-300 font-bold block">Sandbox Mode:</span>
                  <span className="text-gray-300">
                    Accessible from the bottom right of the login screen. Free pulls with all banners open (no saves).
                  </span>
                </div>
              </div>
            </div>

            {/* 7. VIP Status (Purely Non-Monetary) */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/30 space-y-1.5">
              <div className="flex items-center space-x-2 text-amber-400">
                <Crown className="w-4 h-4 flex-shrink-0 animate-pulse" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                  7. VIP Status (Not For Sale)
                </h3>
              </div>
              <p className="text-xs font-mono text-gray-300 leading-relaxed">
                VIP status is <strong>strictly non-monetary and not for sale</strong>. This simulator is 100% free and non-commercial. VIP is a fun honorary perk hand-granted specifically to the creator&apos;s closest friends and people close to them (unlocking 1.5x Tacet Field Astrite storage and the mythic VIP title).
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3.5 sm:p-4 border-t border-white/10 bg-black/60 flex items-center justify-between">
            <span className="text-[11px] font-mono text-gray-400">
              Good luck on your convenes, Rover!
            </span>
            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="px-4 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-mono font-bold uppercase transition-all shadow-[0_0_15px_rgba(250,204,21,0.3)] active:scale-95"
            >
              Got It!
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
