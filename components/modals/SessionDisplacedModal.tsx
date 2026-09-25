"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MonitorSmartphone, ShieldAlert, Sparkles, ArrowRight } from "lucide-react";
import { soundEngine } from "@/lib/audio/soundEngine";

interface SessionDisplacedModalProps {
  isOpen: boolean;
  onPreferThisSession: () => void;
  username?: string;
}

export const SessionDisplacedModal: React.FC<SessionDisplacedModalProps> = ({
  isOpen,
  onPreferThisSession,
  username = "Rover",
}) => {
  if (!isOpen) return null;

  const handlePreferClick = () => {
    try {
      soundEngine.playClick();
    } catch {}
    onPreferThisSession();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-md bg-gradient-to-b from-[#111726] to-[#0a0e18] border border-amber-500/40 rounded-2xl shadow-[0_0_60px_rgba(245,158,11,0.25)] p-6 text-center overflow-hidden"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Icon Badge */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.3)] mb-4">
            <MonitorSmartphone className="w-8 h-8" />
          </div>

          {/* Header */}
          <div className="space-y-1.5 mb-4">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[10px] font-mono font-bold uppercase tracking-wider">
              <ShieldAlert className="w-3 h-3" />
              <span>Session Displaced</span>
            </div>
            <h3 className="text-xl font-black font-display text-white tracking-wide">
              Account Logged In Elsewhere
            </h3>
            <p className="text-xs font-mono text-gray-300 leading-relaxed px-2">
              Hello <span className="text-amber-300 font-bold">@{username}</span>. This account was recently opened in another browser tab or device.
            </p>
          </div>
          {/* Primary Action Button */}
          <button
            type="button"
            onClick={handlePreferClick}
            className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-mono font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.4)] active:scale-98 transition-all flex items-center justify-center space-x-2 group"
          >
            <Sparkles className="w-4 h-4 text-black" />
            <span>Prefer to Use This Session</span>
            <ArrowRight className="w-4 h-4 text-black group-hover:translate-x-1 transition-transform" />
          </button>

          <p className="text-[10px] font-mono text-gray-500 mt-3">
            Clicking this will activate this tab and pause the other tab.
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
