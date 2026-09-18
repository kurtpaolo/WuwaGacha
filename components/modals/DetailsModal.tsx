"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { soundEngine } from "@/lib/audio/soundEngine";
import { X, Shield, Sparkles, Scale, HeartHandshake, AlertCircle, Ban, Globe, ExternalLink } from "lucide-react";

interface DetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DetailsModal: React.FC<DetailsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/95 select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-3xl bg-[#0c0f16] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                <Shield className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                  Disclaimer
                </h2>
                <p className="text-xs font-mono text-yellow-400/80 tracking-wider">
                  Unofficial Fan Project & Legal Disclaimer
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

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-5 text-xs sm:text-sm text-gray-300 leading-relaxed font-sans overscroll-contain">
            {/* 1. Primary Highlight Banner: Unofficial Fan Project */}
            <div className="p-5 sm:p-6 rounded-xl bg-gradient-to-br from-yellow-500/15 via-black/50 to-amber-500/5 border border-yellow-400/40 space-y-3 shadow-[0_0_25px_rgba(250,204,21,0.08)]">
              <div className="flex items-center space-x-2.5 text-yellow-400 font-black text-base sm:text-lg uppercase tracking-wider font-display">
                <Sparkles className="w-5 h-5 text-yellow-400 shrink-0" />
                <span>Unofficial Fan Project</span>
              </div>
              <p className="text-gray-200 font-medium leading-relaxed">
                This is a free, non-commercial Wuthering Waves gacha simulator made by a fan for entertainment purposes. It is not affiliated with, endorsed by, sponsored by, or authorized by Kuro Games or Wuthering Waves.
              </p>
            </div>

            {/* 2. Intellectual Property Ownership */}
            <div className="p-4 sm:p-5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center space-x-2 text-white font-bold uppercase tracking-wide text-xs sm:text-sm">
                <Scale className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Intellectual Property Ownership</span>
              </div>
              <p className="text-gray-300 text-xs sm:text-[13px] leading-relaxed">
                I do not claim ownership of any Wuthering Waves-related characters, names, artwork, illustrations, videos, cutscenes, music, sound effects, voice recordings, logos, trademarks, or other intellectual property used in this project. These materials belong to <strong className="text-white">Kuro Games</strong> and/or their respective rights holders. The simulator itself, including its code and original implementation, is independently created.
              </p>
            </div>

            {/* 3. Third-Party & Community Artwork */}
            <div className="p-4 sm:p-5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center space-x-2 text-white font-bold uppercase tracking-wide text-xs sm:text-sm">
                <HeartHandshake className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Third-Party & Community Artwork</span>
              </div>
              <p className="text-gray-300 text-xs sm:text-[13px] leading-relaxed">
                The website may also include artwork or other creative works from third-party artists. I do not claim ownership of these works, and some original artists or sources may not be identifiable. When the creator or source is known, I will make reasonable efforts to provide credit.
              </p>
            </div>

            {/* 4. Non-Commercial / Zero Monetization */}
            <div className="p-4 sm:p-5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center space-x-2 text-white font-bold uppercase tracking-wide text-xs sm:text-sm">
                <Ban className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero Income & No Monetization</span>
              </div>
              <p className="text-gray-300 text-xs sm:text-[13px] leading-relaxed">
                This project generates zero income and has no advertisements, donations, paid features, subscriptions, sponsorships, merchandise, or other forms of monetization. It is provided completely free of charge.
              </p>
            </div>

            {/* 5. Content Removal & Takedown Requests */}
            <div className="p-4 sm:p-5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center space-x-2 text-white font-bold uppercase tracking-wide text-xs sm:text-sm">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Copyright & Removal Requests</span>
              </div>
              <p className="text-gray-300 text-xs sm:text-[13px] leading-relaxed">
                I respect the rights of all copyright and intellectual-property owners. If you are the creator or authorized rights holder of any material used on this website and would like it credited, replaced, or removed, please contact me. I am willing to review legitimate requests and take down the relevant content when requested by the appropriate rights holder.
              </p>
            </div>

            {/* 6. Non-Competition & Fair Use */}
            <div className="p-4 sm:p-5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <p className="text-gray-400 text-xs leading-relaxed">
                Nothing on this website is intended to imply official ownership, partnership, endorsement, or authorization. This project is simply an unofficial fan-made creation and is not intended to replace or compete with any official Wuthering Waves service.
              </p>
              <p className="text-yellow-400/90 font-mono text-[11px] uppercase tracking-wider pt-1">
                All rights to third-party content remain with their respective owners.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 sm:px-8 py-3.5 border-t border-white/10 bg-white/[0.01] flex items-center justify-between gap-3">
            <a
              href="https://portfolio-ni-schmuckey.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-mono text-gray-300 hover:text-white transition-all group active:scale-95 shadow-sm"
              title="Creator Portfolio (schmuckey)"
            >
              <Globe className="w-3.5 h-3.5 text-yellow-400 group-hover:scale-110 transition-transform" />
              <span>Created by <strong className="text-yellow-400 font-bold">schmuckey</strong></span>
              <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-yellow-400 transition-colors" />
            </a>

            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="px-5 sm:px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all"
            >
              Understood
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
