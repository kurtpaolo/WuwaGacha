"use client";

import React, { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
} from "lucide-react";

interface PlazaJoystickProps {
  onDirectionDown: (dir: "UP" | "DOWN" | "LEFT" | "RIGHT") => void;
  onDirectionUp: (dir: "UP" | "DOWN" | "LEFT" | "RIGHT") => void;
  avatarUrl?: string;
}

export const PlazaJoystick: React.FC<PlazaJoystickProps> = ({
  onDirectionDown,
  onDirectionUp,
  avatarUrl,
}) => {
  const [activeDirs, setActiveDirs] = useState<Set<string>>(new Set());
  const [isPressed, setIsPressed] = useState(false);

  const handlePointerDown = (
    e: React.PointerEvent,
    dir: "UP" | "DOWN" | "LEFT" | "RIGHT"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPressed(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveDirs((prev) => new Set(prev).add(dir));
    onDirectionDown(dir);
  };

  const handlePointerUp = (
    e: React.PointerEvent,
    dir: "UP" | "DOWN" | "LEFT" | "RIGHT"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if ((e.target as HTMLElement).hasPointerCapture(e.pointerId)) {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch {
      // safe fallback
    }
    setActiveDirs((prev) => {
      const next = new Set(prev);
      next.delete(dir);
      if (next.size === 0) {
        setIsPressed(false);
      }
      return next;
    });
    onDirectionUp(dir);
  };

  const handlePointerCancel = (
    e: React.PointerEvent,
    dir: "UP" | "DOWN" | "LEFT" | "RIGHT"
  ) => {
    handlePointerUp(e, dir);
  };

  const isTapped = activeDirs.size > 0 || isPressed;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => {
        if (activeDirs.size === 0) setIsPressed(false);
      }}
      onPointerCancel={() => {
        if (activeDirs.size === 0) setIsPressed(false);
      }}
      className={`select-none pointer-events-auto transition-all duration-200 ${
        isTapped
          ? "opacity-100"
          : "opacity-20 hover:opacity-70"
      }`}
      title="On-Screen D-Pad Controller"
    >
      {/* 3x3 D-Pad Grid without Outer Box */}
      <div className="grid grid-cols-3 grid-rows-3 gap-1.5 w-28 h-28 sm:w-32 sm:h-32">
        {/* Top-Left Empty */}
        <div />

        {/* UP */}
        <button
          type="button"
          onPointerDown={(e) => handlePointerDown(e, "UP")}
          onPointerUp={(e) => handlePointerUp(e, "UP")}
          onPointerCancel={(e) => handlePointerCancel(e, "UP")}
          className={`flex items-center justify-center rounded-xl border backdrop-blur-xs transition-all cursor-pointer touch-none ${
            activeDirs.has("UP")
              ? "bg-yellow-400 border-yellow-400 text-black scale-95 shadow-[0_0_12px_rgba(250,204,21,0.8)]"
              : "bg-black/50 border-white/20 hover:bg-black/70 text-gray-200 active:scale-95"
          }`}
          aria-label="Move Up"
        >
          <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
        </button>

        {/* Top-Right Empty */}
        <div />

        {/* LEFT */}
        <button
          type="button"
          onPointerDown={(e) => handlePointerDown(e, "LEFT")}
          onPointerUp={(e) => handlePointerUp(e, "LEFT")}
          onPointerCancel={(e) => handlePointerCancel(e, "LEFT")}
          className={`flex items-center justify-center rounded-xl border backdrop-blur-xs transition-all cursor-pointer touch-none ${
            activeDirs.has("LEFT")
              ? "bg-yellow-400 border-yellow-400 text-black scale-95 shadow-[0_0_12px_rgba(250,204,21,0.8)]"
              : "bg-black/50 border-white/20 hover:bg-black/70 text-gray-200 active:scale-95"
          }`}
          aria-label="Move Left"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
        </button>

        {/* CENTER ICON / AVATAR */}
        <div
          className="flex items-center justify-center rounded-xl bg-black/50 border border-white/20 overflow-hidden p-1 transition-all pointer-events-none"
          title="Rover"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Rover"
              className="w-full h-full object-contain filter drop-shadow [image-rendering:pixelated]"
            />
          ) : (
            <Compass className="w-5 h-5 text-yellow-400" />
          )}
        </div>

        {/* RIGHT */}
        <button
          type="button"
          onPointerDown={(e) => handlePointerDown(e, "RIGHT")}
          onPointerUp={(e) => handlePointerUp(e, "RIGHT")}
          onPointerCancel={(e) => handlePointerCancel(e, "RIGHT")}
          className={`flex items-center justify-center rounded-xl border backdrop-blur-xs transition-all cursor-pointer touch-none ${
            activeDirs.has("RIGHT")
              ? "bg-yellow-400 border-yellow-400 text-black scale-95 shadow-[0_0_12px_rgba(250,204,21,0.8)]"
              : "bg-black/50 border-white/20 hover:bg-black/70 text-gray-200 active:scale-95"
          }`}
          aria-label="Move Right"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
        </button>

        {/* Bottom-Left Empty */}
        <div />

        {/* DOWN */}
        <button
          type="button"
          onPointerDown={(e) => handlePointerDown(e, "DOWN")}
          onPointerUp={(e) => handlePointerUp(e, "DOWN")}
          onPointerCancel={(e) => handlePointerCancel(e, "DOWN")}
          className={`flex items-center justify-center rounded-xl border backdrop-blur-xs transition-all cursor-pointer touch-none ${
            activeDirs.has("DOWN")
              ? "bg-yellow-400 border-yellow-400 text-black scale-95 shadow-[0_0_12px_rgba(250,204,21,0.8)]"
              : "bg-black/50 border-white/20 hover:bg-black/70 text-gray-200 active:scale-95"
          }`}
          aria-label="Move Down"
        >
          <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
        </button>

        {/* Bottom-Right Empty */}
        <div />
      </div>
    </div>
  );
};
