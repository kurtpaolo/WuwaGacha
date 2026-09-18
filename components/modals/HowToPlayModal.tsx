"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  HelpCircle,
  Clock,
  Gift,
  User,
  Sparkles,
  Flame,
  CheckCircle2,
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
                  Quick Player Guide
                </h2>
                <p className="text-[11px] font-mono text-yellow-300/80">
                  Everything you need to know in under 60 seconds
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

          {/* Body: Scrollable Cards in Logical Sequence */}
          <div className="p-4 sm:p-6 overflow-y-auto max-h-[68vh] space-y-3.5 scrollbar-thin scrollbar-thumb-white/10">
            {/* 1. Welcome & 160 Free Starter Pulls */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-transparent border border-yellow-500/30 space-y-2">
              <div className="flex items-center space-x-2 text-yellow-400">
                <Sparkles className="w-4 h-4 flex-shrink-0" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                  1. Welcome! 160 Free Starter Pulls
                </h3>
              </div>
              <p className="text-xs font-mono text-gray-300 leading-relaxed">
                This is an unofficial fan-made convenes simulator. Zero real money, zero ads. Every new account immediately gets <strong>160 Free Pulls (25,600 Astrite)</strong> right off the bat to build your dream collection!
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                  <span className="text-yellow-300 font-bold block">1 Pull:</span>
                  <span className="text-gray-300">160 Astrite</span>
                </div>
                <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                  <span className="text-yellow-300 font-bold block">10 Pulls:</span>
                  <span className="text-gray-300">1,600 Astrite</span>
                </div>
              </div>
            </div>

            {/* 2. Convene & Pity Rules */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="flex items-center space-x-2 text-cyan-400">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                  2. Pity &amp; The 50/50 Guarantee
                </h3>
              </div>
              <p className="text-xs font-mono text-gray-300 leading-relaxed">
                You never have to worry about getting unlucky. The safety net is built in:
              </p>
              <div className="space-y-1.5 text-[11px] font-mono text-gray-300">
                <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                  <span className="text-yellow-400 font-bold">80-Pull Hard Pity: </span>
                  <span>If you don&apos;t get a 5★ earlier, your 80th pull is <strong>100% guaranteed</strong> to drop a 5★ Resonator.</span>
                </div>
                <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                  <span className="text-cyan-400 font-bold">The 50/50 Rule: </span>
                  <span>When a 5★ drops, there&apos;s a 50% chance it&apos;s the featured banner unit. If you lose, your <strong>next 5★ is 100% guaranteed</strong> to be featured!</span>
                </div>
                <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                  <span className="text-emerald-400 font-bold">Persistent Pity: </span>
                  <span>Your pity count and guarantees carry over across all banner rotations forever.</span>
                </div>
              </div>
            </div>

            {/* 3. 20-Minute Banner Rotations (:00, :20, :40) */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="flex items-center space-x-2 text-yellow-300">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                  3. 20-Minute Banner Rotations (:00, :20, :40)
                </h3>
              </div>
              <p className="text-xs font-mono text-gray-300 leading-relaxed">
                Featured banners rotate every <strong>20 minutes</strong> globally at <strong>xx:00, xx:20, and xx:40</strong> with 3 featured limited 5★ Resonators. Click any character avatar on the banner rail to roll for whoever you want!
              </p>
            </div>

            {/* 4. Duplicates, Sequences & Cashback */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="flex items-center space-x-2 text-purple-400">
                <Gift className="w-4 h-4 flex-shrink-0" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                  4. Duplicate Sequences (S0 to S6) &amp; Cashback
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1">
                  <span className="text-purple-300 font-bold block">Resonance Chain (S0–S6):</span>
                  <p className="text-gray-300">
                    Your 1st copy unlocks the unit (S0). Each duplicate unlocks a Sequence node up to <strong>S6 max</strong> with crowned artwork!
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1">
                  <span className="text-yellow-300 font-bold block">5-Pull Cash Back:</span>
                  <p className="text-gray-300">
                    Every featured 5★ you pull instantly refunds <strong>5 free pulls (800 Astrite)</strong> straight back to your wallet.
                  </p>
                </div>
              </div>
              <p className="text-[11px] font-mono text-gray-400">
                Note: 3★/4★ weapons and standard 50/50 losses are simulator fodder and aren&apos;t saved, keeping your collection fast and clean.
              </p>
            </div>

            {/* 5. Free Astrite Battery & Daily Streaks */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="flex items-center space-x-2 text-amber-400">
                <Flame className="w-4 h-4 flex-shrink-0" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                  5. Free Astrite Battery &amp; Login Streaks
                </h3>
              </div>
              <p className="text-xs font-mono text-gray-300 leading-relaxed">
                Ran out of pulls? The battery generates free Astrite automatically, even while offline:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                  <span className="text-yellow-300 font-bold block">Recharge Rate:</span>
                  <span className="text-gray-300"><strong>1 pull (160 Astrite) every 4.5 minutes</strong></span>
                </div>
                <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                  <span className="text-amber-300 font-bold block">Starting Tank:</span>
                  <span className="text-gray-300">Holds up to <strong>12 hours (160 pulls)</strong></span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] font-mono text-amber-200/90">
                🔥 <strong>Daily Streaks (00:00 GMT+8 reset):</strong> Check in daily to permanently expand your battery capacity at 2, 5, 9, and 14 days, up to <strong>18 hours (240 pulls)</strong>!
              </div>
            </div>

            {/* 6. Profile, Edit Tab & Cloud Saves */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400">
                <User className="w-4 h-4 flex-shrink-0" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                  6. Profile, Showcase &amp; Cloud Saves
                </h3>
              </div>
              <p className="text-xs font-mono text-gray-300 leading-relaxed">
                Open your <strong>Profile</strong> and click <strong>Edit</strong> to manage your 6-unit Showcase team or change your profile picture anytime.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                  <span className="text-emerald-300 font-bold block">Titles &amp; Rewards:</span>
                  <span className="text-gray-300">Unlock titles to flex on your profile and claim bonus Astrite rewards.</span>
                </div>
                <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                  <span className="text-cyan-300 font-bold block">Permanent Cloud Save:</span>
                  <span className="text-gray-300">Your resonators, sequences, pity, and streaks are safely tied to your account across all devices.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3.5 sm:p-4 border-t border-white/10 bg-black/60 flex items-center justify-between">
            <span className="text-[11px] font-mono text-gray-400">
              Good luck on your pulls, Rover!
            </span>
            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="px-4 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-mono font-bold uppercase transition-all shadow-[0_0_15px_rgba(250,204,21,0.3)] active:scale-95 cursor-pointer"
            >
              Got It!
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
