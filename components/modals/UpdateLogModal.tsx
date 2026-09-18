"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Briefcase,
  Clock,
  User,
  Coins,
  Gift,
  Rocket,
  Ban,
  Infinity,
  Award,
  Zap,
  Globe,
  ExternalLink,
  Flame,
  Smartphone,
  BookOpen,
  ShieldCheck,
  Star,
} from "lucide-react";
import { soundEngine } from "@/lib/audio/soundEngine";

interface UpdateLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername?: string;
}

type VersionTag = "2.0" | "1.5" | "1.0";

export const UpdateLogModal: React.FC<UpdateLogModalProps> = ({
  isOpen,
  onClose,
  currentUsername = "Player",
}) => {
  const [selectedVersion, setSelectedVersion] = useState<VersionTag>("2.0");
  const [suggestion, setSuggestion] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastSentTime, setLastSentTime] = useState<number>(0);

  if (!isOpen) return null;

  const handleSendSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = suggestion.trim();
    if (!trimmed || isSending) return;

    // 30-second client cooldown to prevent spam
    const now = Date.now();
    if (now - lastSentTime < 30000) {
      const waitSec = Math.ceil((30000 - (now - lastSentTime)) / 1000);
      setSendError(`Please wait ${waitSec}s before sending another suggestion.`);
      return;
    }

    soundEngine.playClick();
    setIsSending(true);
    setSendError(null);
    setSendSuccess(false);

    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUsername,
          message: trimmed,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to deliver suggestion.");
      }

      setSendSuccess(true);
      setSuggestion("");
      setLastSentTime(Date.now());
      setTimeout(() => setSendSuccess(false), 60000);
    } catch (err: any) {
      setSendError(err.message || "Failed to send suggestion.");
    } finally {
      setIsSending(false);
    }
  };

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
          className="relative w-full max-w-2xl bg-[#0d1017] border border-purple-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 sm:px-6 py-3 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-purple-500/20 border border-purple-400/30 text-purple-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                  Update Logs
                </h2>
                <p className="text-[11px] font-mono text-purple-300/80">
                  Viewing Patch v{selectedVersion}
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

          {/* Main Body: Left Content + Right Versions Sidebar */}
          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* Left: Scrollable Patch Content */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto max-h-[50vh] sm:max-h-[52vh] space-y-3 scrollbar-thin scrollbar-thumb-white/10">
              {selectedVersion === "2.0" ? (
                <>
                  {/* 20-Minute Banner Rotations & 160 Starter Pulls */}
                  <div className="p-3 rounded-xl bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-transparent border border-yellow-500/30 space-y-1">
                    <div className="flex items-center space-x-2 text-yellow-400">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                        20-Minute Banner Resets &amp; 160 Starter Pulls
                      </h3>
                    </div>
                    <p className="text-xs font-mono text-gray-300 leading-relaxed">
                      Featured banners now rotate every 20 minutes (at :00, :20, and :40). Plus, all new accounts start with 160 free pulls (25,600 Astrite).
                    </p>
                  </div>

                  {/* Resonator Detail & Resonance Chain */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="flex items-center space-x-2 text-yellow-400">
                      <Star className="w-3.5 h-3.5 flex-shrink-0 fill-yellow-400/40" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                        Resonator Detail &amp; Sequence Chain (S0–S6)
                      </h3>
                    </div>
                    <p className="text-xs font-mono text-gray-300 leading-relaxed">
                      Click any 5★ character in your Inventory to view their full splash art, element, weapon type, and Sequence nodes (S0–S6) that light up as you unlock duplicate wavebands.
                    </p>
                  </div>

                  {/* Fast Convene Mode */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="flex items-center space-x-2 text-amber-400">
                      <Zap className="w-3.5 h-3.5 flex-shrink-0" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                        Fast Convene Mode (Instant 10-Pull Skip)
                      </h3>
                    </div>
                    <p className="text-xs font-mono text-gray-300 leading-relaxed">
                      Toggle Fast Convene in Settings to skip directly to the 10-pull summary for 3★ and 4★ pulls, while keeping full animations for 5★ drops.
                    </p>
                  </div>

                  {/* PWA & Add to Home Screen */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="flex items-center space-x-2 text-cyan-400">
                      <Smartphone className="w-3.5 h-3.5 flex-shrink-0" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                        Progressive Web App (PWA) &amp; Home Screen
                      </h3>
                    </div>
                    <p className="text-xs font-mono text-gray-300 leading-relaxed">
                      Install the simulator as a standalone app on your phone or desktop home screen with zero ads and fast loading.
                    </p>
                  </div>

                  {/* How to Play Guide & Inventory Rules */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                        Beginner Guide Overhaul
                      </h3>
                    </div>
                    <p className="text-xs font-mono text-gray-300 leading-relaxed">
                      Updated the &quot;How to Play&quot; guide: clear breakdown of pity, 50/50 guarantees, idle Astrite battery streaks, and duplicate sequence rules.
                    </p>
                  </div>

                  {/* Legal Safeguards & Privacy Policy */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="flex items-center space-x-2 text-purple-400">
                      <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                        Disclaimer &amp; Privacy Policy
                      </h3>
                    </div>
                    <p className="text-xs font-mono text-gray-300 leading-relaxed">
                      Added clear fan project disclaimers, copyright terms, and a dedicated Privacy Policy modal confirming zero data sales and client-side privacy.
                    </p>
                  </div>

                  {/* Navigation & Profile Polish */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="flex items-center space-x-2 text-blue-400">
                      <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                        Profile &amp; Inventory Polish
                      </h3>
                    </div>
                    <p className="text-xs font-mono text-gray-300 leading-relaxed">
                      Simplified profile layout, added avatar picker inside Edit, and made jumping between profile and inventory smooth.
                    </p>
                  </div>
                </>
              ) : selectedVersion === "1.5" ? (
                <>
                  {/* Accounts */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="flex items-center space-x-2 text-cyan-400">
                      <UserCheck className="w-3.5 h-3.5 flex-shrink-0" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                        Added Accounts
                      </h3>
                    </div>
                    <p className="text-xs font-mono text-gray-300 leading-relaxed">
                      You can now create an account with a password and security question. Keeps all your pulls, Astrite balance, and collection saved safely across devices.
                    </p>
                  </div>

                  {/* Inventory */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="flex items-center space-x-2 text-blue-400">
                      <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                        Added Inventory System
                      </h3>
                    </div>
                    <p className="text-xs font-mono text-gray-300 leading-relaxed">
                      Check all the 5★ Resonators you have convened in one place, complete with duplicate counts (Wavebands) and total collection progress.
                    </p>
                  </div>

                  {/* Banner Reset (Hourly) */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="flex items-center space-x-2 text-yellow-400">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                        Added Banner Reset (Hourly)
                      </h3>
                    </div>
                    <p className="text-xs font-mono text-gray-300 leading-relaxed">
                      Featured banners now rotate every hour with 3 random 5★ Resonators. Pity count and 50/50 guarantees carry over between rotations!
                    </p>
                  </div>

                  {/* Profile (Showcase & Stats) */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="flex items-center space-x-2 text-purple-400">
                      <User className="w-3.5 h-3.5 flex-shrink-0" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                        Added Profile (Showcase & Stats)
                      </h3>
                    </div>
                    <p className="text-xs font-mono text-gray-300 leading-relaxed">
                      Personalize your player card, pick custom avatar portraits, showcase your favorite Resonators with their sequence levels (S0 to S6), and view pull stats and 50/50 win rate. You can also search for and inspect other players.
                    </p>
                  </div>

                  {/* Added Title System */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="flex items-center space-x-2 text-yellow-400">
                      <Award className="w-3.5 h-3.5 flex-shrink-0" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                        Added Title System & Custom Colors
                      </h3>
                    </div>
                    <p className="text-xs font-mono text-gray-300 leading-relaxed">
                        Added a new Title System where players can earn, unlock, and equip different titles to customize their profile.
                    </p>
                  </div>

                  {/* Daily Login Streaks & Tacet Field Battery */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="flex items-center space-x-2 text-amber-400">
                      <Flame className="w-3.5 h-3.5 flex-shrink-0" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                        Added Daily Login Streaks & 12h to 18h (24h VIP) Battery
                      </h3>
                    </div>
                    <p className="text-xs font-mono text-gray-300 leading-relaxed">
                      Streaks evaluate at 00:00 GMT+8 daily. Reaching 2, 5, 9, and 14 consecutive days permanently unlocks new titles and expands your Tacet Field idle battery from 12h (160 pulls) up to 18h (240 pulls). VIP accounts gain a +50% base bonus, scaling up to 24 hours (320 pulls / 51,200 Astrite)!
                    </p>
                  </div>

                  {/* Pure Black Backdrops & Performance */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="flex items-center space-x-2 text-blue-400">
                      <Zap className="w-3.5 h-3.5 flex-shrink-0" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                        Profile Visiting
                      </h3>
                    </div>
                    <p className="text-xs font-mono text-gray-300 leading-relaxed">
                      You can now visit other players and check out their collection, achievements, and stats so you can flex to them if yours is better!
                    </p>
                  </div>

                  {/* Removed Unlimited Replenish */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="flex items-center space-x-2 text-rose-400">
                      <Ban className="w-3.5 h-3.5 flex-shrink-0" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                        Removed Unlimited Astrite Replenish
                      </h3>
                    </div>
                    <p className="text-xs font-mono text-gray-300 leading-relaxed">
                      Unlimited Astrite refills have been removed so collecting feels rewarding instead of completing everything in one sitting. Earn Astrite through Free Astrite claims and 5★ milestone rebates!
                    </p>
                  </div>

                  {/* Idle Claim (Free Astrite) */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <Coins className="w-3.5 h-3.5 flex-shrink-0" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                        Added Idle Claim (Free Astrite)
                      </h3>
                    </div>
                    <p className="text-xs font-mono text-gray-300 leading-relaxed">
                      Passively earns 160 Free Astrite every 4.5 minutes, capping at 25,600 (160 pulls) every 12 hours (38,400 with VIP - 1.5x / 18h). Just hit the Claim button in the top header whenever you visit.
                    </p>
                  </div>

                  {/* 5★ Cash Back */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="flex items-center space-x-2 text-amber-400">
                      <Gift className="w-3.5 h-3.5 flex-shrink-0" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                        Added 5★ Cash Back (+5 Pulls per Copy)
                      </h3>
                    </div>
                    <p className="text-xs font-mono text-gray-300 leading-relaxed">
                      Every time you pull any copy of a featured 5★ Resonator, you get a bonus refund of 5 pulls (800 Astrite) credited straight to your balance.
                    </p>
                  </div>

                  {/* Revamped Sandbox Mode */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                    <div className="flex items-center space-x-2 text-teal-400">
                      <Infinity className="w-3.5 h-3.5 flex-shrink-0" />
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                        Revamped Sandbox Mode
                      </h3>
                    </div>
                    <p className="text-xs font-mono text-gray-300 leading-relaxed">
                      Want to just test pulls without an account? Click Sandbox Mode at the bottom right of the login screen. All banners are unlocked, pulls are free, and no data is saved.
                    </p>
                  </div>
                </>
              ) : (
                /* Version 1.0 Initial Launch */
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                  <div className="flex items-center space-x-2 text-yellow-400">
                    <Rocket className="w-4 h-4 flex-shrink-0" />
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                      Version 1.0 • Initial Launch
                    </h3>
                  </div>
                  <p className="text-xs font-mono text-gray-300 leading-relaxed">
                    A Wuthering Waves convene simulator built to test your gacha luck. Features authentic drop rates, 5-star pity, 50/50 win and loss mechanics, full summoning animations, and unlimited pulls.
                  </p>
                </div>
              )}
            </div>

            {/* Right: Versions Sidebar */}
            <div className="w-28 sm:w-36 border-l border-white/10 bg-white/[0.01] p-3 space-y-2 flex-shrink-0">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold block px-1">
                Versions
              </span>

              {/* Version 2.0 Tab */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setSelectedVersion("2.0");
                }}
                className={`w-full text-left px-2.5 py-2 rounded-xl border transition-all text-xs font-mono flex flex-col space-y-0.5 cursor-pointer ${
                  selectedVersion === "2.0"
                    ? "bg-yellow-400/20 border-yellow-400/60 text-yellow-200 shadow-sm"
                    : "bg-white/[0.02] hover:bg-white/[0.05] border-white/5 text-gray-400 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">v2.0</span>
                  <span className="text-[9px] px-1 rounded bg-yellow-400 text-black font-sans font-black">
                    Latest
                  </span>
                </div>
                <span className="text-[10px] opacity-75">Current</span>
              </button>

              {/* Version 1.5 Tab */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setSelectedVersion("1.5");
                }}
                className={`w-full text-left px-2.5 py-2 rounded-xl border transition-all text-xs font-mono flex flex-col space-y-0.5 cursor-pointer ${
                  selectedVersion === "1.5"
                    ? "bg-purple-500/20 border-purple-400 text-purple-200 shadow-sm"
                    : "bg-white/[0.02] hover:bg-white/[0.05] border-white/5 text-gray-400 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">v1.5</span>
                  <span className="text-[9px] px-1 rounded bg-purple-500/30 text-purple-300 font-sans font-medium">
                    Patch
                  </span>
                </div>
                <span className="text-[10px] opacity-75">Solaris-3</span>
              </button>

              {/* Version 1.0 Tab */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setSelectedVersion("1.0");
                }}
                className={`w-full text-left px-2.5 py-2 rounded-xl border transition-all text-xs font-mono flex flex-col space-y-0.5 ${
                  selectedVersion === "1.0"
                    ? "bg-purple-500/20 border-purple-400 text-purple-200 shadow-sm"
                    : "bg-white/[0.02] hover:bg-white/[0.05] border-white/5 text-gray-400 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">v1.0</span>
                  <span className="text-[9px] px-1 rounded bg-white/10 text-gray-300 font-sans font-medium">
                    Base
                  </span>
                </div>
                <span className="text-[10px] opacity-75">Initial Launch</span>
              </button>
            </div>
          </div>

          {/* Footer: Suggestion Box */}
          <div className="p-3 sm:p-4 border-t border-white/10 bg-black/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-gray-300 flex items-center space-x-1.5">
                <Send className="w-3.5 h-3.5 text-yellow-400" />
                <span>Suggestions</span>
              </span>
              <span className="text-[10px] font-mono text-gray-500">
                Direct to Discord Webhook
              </span>
            </div>

            <form onSubmit={handleSendSuggestion} className="space-y-2">
              <div className="relative">
                <textarea
                  rows={2}
                  maxLength={500}
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  placeholder="Have an idea or feedback? Type here..."
                  className="w-full px-3 py-1.5 rounded-xl bg-black/70 border border-white/15 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-all resize-none"
                />
                <span className="absolute right-2.5 bottom-2 text-[10px] font-mono text-gray-500 pointer-events-none">
                  {suggestion.length}/500
                </span>
              </div>

              {sendSuccess && (
                <div className="flex items-center space-x-1.5 text-xs font-mono text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Suggestion sent to Discord! Thank you for the feedback!</span>
                </div>
              )}

              {sendError && (
                <div className="flex items-center space-x-1.5 text-xs font-mono text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{sendError}</span>
                </div>
              )}

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSending || !suggestion.trim()}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black text-xs font-mono font-bold uppercase flex items-center space-x-1.5 transition-all disabled:opacity-40 active:scale-95"
                >
                  {isSending ? (
                    <>
                      <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3" />
                      <span>Send</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Creator Portfolio Footer Credit */}
          <div className="px-5 sm:px-7 py-2.5 bg-black/60 border-t border-white/10 flex items-center justify-between text-xs font-mono">
            <span className="text-[11px] text-gray-400">WuWa Gacha Simulator</span>
            <a
              href="https://portfolio-ni-schmuckey.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-[11px] text-gray-300 hover:text-white transition-all group active:scale-95 shadow-sm"
              title="Creator Portfolio (schmuckey)"
            >
              <Globe className="w-3.5 h-3.5 text-yellow-400 group-hover:scale-110 transition-transform" />
              <span>Created by <strong className="text-yellow-400 font-bold">schmuckey</strong></span>
              <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-yellow-400 transition-colors" />
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
