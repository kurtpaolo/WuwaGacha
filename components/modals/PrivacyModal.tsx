"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { soundEngine } from "@/lib/audio/soundEngine";
import { X, Lock, ShieldCheck, Database, Ban, Trash2, Globe, ExternalLink } from "lucide-react";

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
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
          className="relative w-full max-w-2xl bg-[#0c0f16] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.2)]">
                <Lock className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white">
                  Privacy Policy
                </h2>
                <p className="text-xs font-mono text-emerald-400/80 tracking-wider">
                  Transparent, Zero-Tracking Fan Project
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-4 text-xs sm:text-sm text-gray-300 leading-relaxed font-sans overscroll-contain">
            {/* 1. Zero Personal Data */}
            <div className="p-4 sm:p-5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center space-x-2 text-white font-bold uppercase tracking-wide text-xs sm:text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>1. Zero Personal Data Collected</span>
              </div>
              <p className="text-gray-300 text-xs leading-relaxed">
                We do not collect, request, or store your real name, email address, phone number, physical address, or payment details. Registration requires only an anonymous username and password of your choice.
              </p>
            </div>

            {/* 2. Cryptographic Security */}
            <div className="p-4 sm:p-5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center space-x-2 text-white font-bold uppercase tracking-wide text-xs sm:text-sm">
                <Lock className="w-4 h-4 text-yellow-400 shrink-0" />
                <span>2. Cryptographic Password Hashing</span>
              </div>
              <p className="text-gray-300 text-xs leading-relaxed">
                All passwords and security question answers are cryptographically hashed using standard SHA-256 and Blowfish encryption algorithms before being stored. Plaintext passwords are never saved or accessible.
              </p>
            </div>

            {/* 3. Limited Purpose */}
            <div className="p-4 sm:p-5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center space-x-2 text-white font-bold uppercase tracking-wide text-xs sm:text-sm">
                <Database className="w-4 h-4 text-sky-400 shrink-0" />
                <span>3. Operational Data Storage</span>
              </div>
              <p className="text-gray-300 text-xs leading-relaxed">
                Cloud database records (stored in Supabase) are strictly limited to your game simulation state: your Astrites, pity counter, pulled 5-star characters, equipped title, and daily login streak. LocalStorage is used to remember your volume preferences and active banner.
              </p>
            </div>

            {/* 4. Zero Advertising & Tracking */}
            <div className="p-4 sm:p-5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center space-x-2 text-white font-bold uppercase tracking-wide text-xs sm:text-sm">
                <Ban className="w-4 h-4 text-rose-400 shrink-0" />
                <span>4. Zero Advertising, Tracking & Data Sales</span>
              </div>
              <p className="text-gray-300 text-xs leading-relaxed">
                This website does not run third-party advertising, tracking pixels, or marketing analytics. We will never sell, rent, or trade your simulator data to any third party.
              </p>
            </div>

            {/* 5. Account Deletion */}
            <div className="p-4 sm:p-5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center space-x-2 text-white font-bold uppercase tracking-wide text-xs sm:text-sm">
                <Trash2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>5. Data Deletion & Privacy Inquiries</span>
              </div>
              <p className="text-gray-300 text-xs leading-relaxed">
                You have the right to request deletion of your account and associated simulation data at any time. For privacy inquiries or account wipe requests, please reach out via the creator portfolio link in the footer.
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
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
