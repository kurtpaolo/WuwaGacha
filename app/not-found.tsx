"use client";

import React from "react";
import Link from "next/link";
import { Radio, ArrowLeft } from "lucide-react";
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

      {/* Top Telemetry Header */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between text-xs tracking-widest text-wuwa-textDim font-mono border-b border-white/10 pb-3 pointer-events-none">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="text-wuwa-gold font-bold">SOLARIS-3 // TERMINAL COMM</span>
          <span className="hidden sm:inline text-white/30">|</span>
          <span className="hidden sm:inline">PROTOCOL: HUANGLONG_NET_v2.4</span>
        </div>
        <div className="flex items-center space-x-2 text-white/40">
          <Radio className="w-3.5 h-3.5 text-amber-400/80" />
          <span>FREQ: 0x404_LOST</span>
        </div>
      </div>

      {/* Center Tactical Card */}
      <div className="relative z-10 w-full max-w-md bg-wuwa-card/90 backdrop-blur-md border border-wuwa-cardBorder rounded-2xl p-8 sm:p-10 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col items-center text-center">
        {/* Decorative corner brackets */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-wuwa-gold/80 rounded-tl-lg pointer-events-none" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-wuwa-gold/80 rounded-tr-lg pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-wuwa-gold/80 rounded-bl-lg pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-wuwa-gold/80 rounded-br-lg pointer-events-none" />

        {/* 404 Error Number */}
        <h1 className="text-8xl sm:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-200 to-amber-400/80 drop-shadow-[0_0_25px_rgba(255,209,92,0.35)]">
          404
        </h1>

        {/* Error Text */}
        <p className="text-base sm:text-lg font-mono font-bold uppercase tracking-wider text-gray-300 mt-2 mb-8">
          Page Not Found
        </p>

        {/* Return to Convene Button */}
        <Link
          href="/"
          onClick={handlePlayClick}
          className="w-full inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(250,204,21,0.4)] hover:shadow-[0_0_30px_rgba(250,204,21,0.6)] transition-all transform active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-black stroke-[2.5]" />
          <span>RETURN TO CONVENE</span>
        </Link>
      </div>

      {/* Bottom Status Footer */}
      <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-[11px] tracking-wider text-wuwa-textDim font-mono pointer-events-none">
        <span>WUWA CONVENE SIMULATOR // SYS_STATE: STANDBY</span>
        <span className="hidden sm:inline">SOLARIS-3 ORBITAL TELEMETRY ACTIVE</span>
      </div>
    </main>
  );
}
