"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, AlertTriangle, RefreshCw } from "lucide-react";
import { soundEngine } from "@/lib/audio/soundEngine";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Uncaught application exception:", error);
  }, [error]);

  const handlePlayClick = () => {
    try {
      soundEngine.playClick();
    } catch {}
  };

  return (
    <main className="relative w-full h-[100dvh] min-h-[100dvh] bg-[#07090e] text-wuwa-textMain overflow-hidden flex items-center justify-center select-none px-4">
      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-rose-600/15 via-amber-500/10 to-transparent rounded-full blur-3xl opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(#26181b_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#07090e]/50 to-[#07090e]" />
      </div>

      {/* Center Dialog Card matching ExternalRedirectModal / Confirmation style */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="relative w-full max-w-md bg-[#0b0e14] border border-rose-500/40 rounded-2xl p-5 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden z-10"
      >
        {/* Top subtle glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-80" />

        {/* Icon & Heading */}
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.25)] flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-mono font-black uppercase tracking-wider text-white">
              500 • Something Went Wrong
            </h1>
            <p className="text-[11px] font-mono text-gray-400">Unexpected error</p>
          </div>
        </div>

        {/* Description */}
        <div className="mt-3 mb-5 space-y-2.5">
          <p className="text-xs sm:text-sm font-sans text-gray-300 leading-relaxed">
            An unexpected error occurred. You can try again or head back to the convene stage.
          </p>
        </div>

        {/* Action Buttons: Try Again / Return to Convene */}
        <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={() => {
              handlePlayClick();
              reset();
            }}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 hover:text-white font-mono font-bold text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer flex items-center space-x-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            onClick={handlePlayClick}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 hover:from-yellow-300 hover:to-yellow-200 text-black font-mono font-black text-xs uppercase tracking-wider shadow-[0_0_16px_rgba(250,204,21,0.5)] transition-all active:scale-95 cursor-pointer flex items-center space-x-1.5"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Return to Convene</span>
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
