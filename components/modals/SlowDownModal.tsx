"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, X } from "lucide-react";
import { soundEngine } from "@/lib/audio/soundEngine";

export interface SlowDownDetail {
  description: string;
}

/**
 * Triggers the global 'Slow Down!' confirmation modal from anywhere in the app.
 */
export function triggerSlowDownModal(description: string = "Too many attempts!") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<SlowDownDetail>("wuwa_slow_down_modal", {
        detail: { description },
      })
    );
  }
}

export const SlowDownModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [description, setDescription] = useState<string>("Too many attempts!");

  // Listen for rate limit events
  useEffect(() => {
    const handleSlowDownEvent = (e: Event) => {
      const customEvent = e as CustomEvent<SlowDownDetail>;
      if (customEvent.detail && customEvent.detail.description) {
        setDescription(customEvent.detail.description);
      }
      try {
        soundEngine.playClick();
      } catch {}
      setIsOpen(true);
    };

    window.addEventListener("wuwa_slow_down_modal", handleSlowDownEvent);
    return () => window.removeEventListener("wuwa_slow_down_modal", handleSlowDownEvent);
  }, []);

  const handleClose = useCallback(() => {
    try {
      soundEngine.playClick();
    } catch {}
    setIsOpen(false);
  }, []);

  // Keyboard Escape handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/95 select-none"
        style={{ backgroundColor: "#000000f2" }}
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-[#0b0e14] border border-yellow-400/40 rounded-2xl p-5 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden"
        >
          {/* Top subtle glow accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-80" />

          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-3.5 right-3.5 p-1.5 sm:p-2 rounded-xl bg-gradient-to-br from-rose-500/25 to-pink-600/30 hover:from-rose-500/40 hover:to-pink-600/50 border border-rose-500/50 text-rose-300 hover:text-white transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] active:scale-95 group flex-shrink-0 cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
          </button>

          {/* Icon & Heading */}
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.25)] flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-mono font-black uppercase tracking-wider text-white">
                Slow Down!
              </h2>
              <p className="text-[11px] font-mono text-gray-400">Rate limit</p>
            </div>
          </div>

          {/* Main prompt text */}
          <div className="mt-3 mb-5 space-y-2">
            <div className="p-3 sm:p-3.5 rounded-xl bg-black/60 border border-yellow-400/20 flex items-center justify-center text-center">
              <span className="text-sm sm:text-base font-mono text-yellow-300 font-bold tracking-wide">
                {description}
              </span>
            </div>
            <p className="text-xs font-sans text-gray-400 text-center leading-relaxed">
              Please wait a moment before trying again.
            </p>
          </div>

          {/* Action button: Okay */}
          <div className="flex items-center justify-end pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={handleClose}
              className="w-full sm:w-auto px-6 py-2 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 hover:from-yellow-300 hover:to-yellow-200 text-black font-mono font-black text-xs uppercase tracking-wider shadow-[0_0_16px_rgba(250,204,21,0.5)] transition-all active:scale-95 cursor-pointer flex items-center justify-center"
            >
              Okay
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
