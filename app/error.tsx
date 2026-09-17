"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { soundEngine } from "@/lib/audio/soundEngine";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log unexpected resonance errors to console for telemetry
    console.error("[Solaris-3 Telemetry] Uncaught resonance exception:", error);
  }, [error]);

  const handlePlayClick = () => {
    try {
      soundEngine.playClick();
    } catch {}
  };

  return (
    <main className="relative w-full h-[100dvh] min-h-[100dvh] bg-[#07090e] text-wuwa-textMain overflow-hidden flex items-center justify-center select-none px-4">
      {/* Ambient anomaly glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-red-600/10 via-amber-500/10 to-transparent rounded-full blur-3xl opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(#26181b_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#07090e]/50 to-[#07090e]" />
      </div>

      {/* Top Telemetry Header */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between text-xs tracking-widest text-wuwa-textDim font-mono border-b border-red-500/20 pb-3 pointer-events-none">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="text-red-400 font-bold">SOLARIS-3 // CORE BREACH INTERCEPT</span>
          <span className="hidden sm:inline text-white/30">|</span>
          <span className="hidden sm:inline">SAFETY_CONTAINMENT_ACTIVE</span>
        </div>
        <div className="flex items-center space-x-2 text-red-400/70">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>STATUS: ANOMALOUS_WAVE</span>
        </div>
      </div>

      {/* Tactical Center Card */}
      <div className="relative z-10 w-full max-w-md bg-wuwa-card/90 backdrop-blur-md border border-red-500/30 rounded-2xl p-8 sm:p-10 shadow-[0_0_50px_rgba(239,68,68,0.2)] flex flex-col items-center text-center">
        {/* Tactical Corner Accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-red-500/80 rounded-tl-lg pointer-events-none" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-red-500/80 rounded-tr-lg pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-red-500/80 rounded-bl-lg pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-red-500/80 rounded-br-lg pointer-events-none" />

        {/* 500 Error Number */}
        <h1 className="text-8xl sm:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-200 to-red-400/90 drop-shadow-[0_0_25px_rgba(239,68,68,0.4)]">
          500
        </h1>

        {/* Error Text */}
        <p className="text-base sm:text-lg font-mono font-bold uppercase tracking-wider text-red-300/90 mt-2 mb-8">
          Internal Server Error
        </p>

        {/* Return to Convene Button */}
        <Link
          href="/"
          onClick={handlePlayClick}
          className="w-full inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] transition-all transform active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-white stroke-[2.5]" />
          <span>RETURN TO CONVENE</span>
        </Link>
      </div>

      {/* Bottom Status Footer */}
      <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-[11px] tracking-wider text-wuwa-textDim font-mono pointer-events-none">
        <span>WUWA CONVENE SIMULATOR // FAIL-SAFE ENGAGED</span>
        <span className="hidden sm:inline">KRO-ISOLATION-V2 // PROTOCOL ACTIVE</span>
      </div>
    </main>
  );
}
