"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, X } from "lucide-react";
import { soundEngine } from "@/lib/audio/soundEngine";

interface ExternalRedirectDetail {
  url: string;
  title?: string;
}

export function requestExternalRedirect(url: string, title?: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<ExternalRedirectDetail>("wuwa_request_redirect", {
        detail: { url, title },
      })
    );
  }
}

export const ExternalRedirectModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState("");

  // 1. Listen for explicit programmatic redirect requests
  useEffect(() => {
    const handleRedirectEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ExternalRedirectDetail>;
      if (customEvent.detail && customEvent.detail.url) {
        soundEngine.playClick();
        setTargetUrl(customEvent.detail.url);
        setIsOpen(true);
      }
    };

    window.addEventListener("wuwa_request_redirect", handleRedirectEvent);
    return () => window.removeEventListener("wuwa_request_redirect", handleRedirectEvent);
  }, []);

  // 2. Global capture-phase click listener for any external <a> links across the entire app
  useEffect(() => {
    const handleGlobalAnchorClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Check if external link (http:// or https://)
      if (/^https?:\/\//i.test(href)) {
        try {
          const urlObj = new URL(href, window.location.origin);
          if (urlObj.origin !== window.location.origin) {
            // It's an external link! Intercept and prompt confirmation.
            e.preventDefault();
            e.stopPropagation();
            soundEngine.playClick();

            setTargetUrl(href);
            setIsOpen(true);
          }
        } catch {
          // Invalid URL, do nothing
        }
      }
    };

    document.addEventListener("click", handleGlobalAnchorClick, true);
    return () => document.removeEventListener("click", handleGlobalAnchorClick, true);
  }, []);

  // Keyboard escape handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleConfirm = () => {
    soundEngine.playClick();
    if (targetUrl) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    soundEngine.playClick();
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 select-none"
        style={{ backgroundColor: "#000000f2" }}
        onClick={handleCancel}
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
            onClick={handleCancel}
            className="absolute top-3.5 right-3.5 p-1.5 sm:p-2 rounded-xl bg-gradient-to-br from-rose-500/25 to-pink-600/30 hover:from-rose-500/40 hover:to-pink-600/50 border border-rose-500/50 text-rose-300 hover:text-white transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] active:scale-95 group flex-shrink-0 cursor-pointer"
            title="Cancel"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
          </button>

          {/* Icon & Heading */}
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.25)] flex-shrink-0">
              <ExternalLink className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-mono font-black uppercase tracking-wider text-white">
                External Link
              </h2>
              <p className="text-[11px] font-mono text-gray-400">Leaving simulator</p>
            </div>
          </div>

          {/* Main prompt text */}
          <div className="mt-3 mb-4 space-y-2.5">
            <p className="text-xs sm:text-sm font-sans text-gray-300 leading-relaxed">
              You're about to visit:
            </p>

            <div className="p-2.5 sm:p-3 rounded-xl bg-black/60 border border-white/15 flex items-start space-x-2">
              <span className="text-yellow-400 font-mono text-xs break-all font-semibold select-all">
                {targetUrl}
              </span>
            </div>

            <p className="text-[11px] font-sans text-gray-400 leading-relaxed">
              This will open an external website in a new tab. Do you want to proceed?
            </p>
          </div>

          {/* Action buttons: Cancel / Yes */}
          <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 hover:text-white font-mono font-bold text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 hover:from-yellow-300 hover:to-yellow-200 text-black font-mono font-black text-xs uppercase tracking-wider shadow-[0_0_16px_rgba(250,204,21,0.5)] transition-all active:scale-95 cursor-pointer"
            >
              Yes
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
