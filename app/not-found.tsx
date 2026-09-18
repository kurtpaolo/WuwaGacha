"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { soundEngine } from "@/lib/audio/soundEngine";

export default function NotFound() {
  const handlePlayClick = () => {
    try {
      soundEngine.playClick();
    } catch {}
  };

  return (
    <main className="relative w-full h-[100dvh] min-h-[100dvh] bg-[#07090e] text-wuwa-textMain overflow-hidden flex items-center justify-center select-none px-4">
      {/* Background ambient glow & grid effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-amber-500/10 via-yellow-500/5 to-transparent rounded-full blur-3xl opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#07090e]/40 to-[#07090e]" />
      </div>

      {/* Center Dialog Card matching ExternalRedirectModal / Confirmation style */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="relative w-full max-w-md bg-[#0b0e14] border border-yellow-400/40 rounded-2xl p-5 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden z-10"
      >
        {/* Top subtle glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-80" />

        {/* Icon & Heading */}
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.25)] flex-shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-mono font-black uppercase tracking-wider text-white">
              404 • Page Not Found
            </h1>
            <p className="text-[11px] font-mono text-gray-400">Lost Signal</p>
          </div>
        </div>

        {/* Description */}
        <div className="mt-3 mb-5 space-y-2.5">
          <p className="text-xs sm:text-sm font-sans text-gray-300 leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end pt-3 border-t border-white/10">
          <Link
            href="/"
            onClick={handlePlayClick}
            className="w-full inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 hover:from-yellow-300 hover:to-yellow-200 text-black font-mono font-black text-xs uppercase tracking-wider shadow-[0_0_16px_rgba(250,204,21,0.5)] transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Return to Convene</span>
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
