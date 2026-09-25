"use client";

import React, { useState, useRef, useCallback } from "react";
import { Compass } from "lucide-react";

export interface JoystickVector {
  x: number; // -1 to 1 (cosine of angle * intensity)
  y: number; // -1 to 1 (sine of angle * intensity)
  angle: number; // 0 to 360 degrees
  intensity: number; // 0 to 1
}

interface PlazaJoystickProps {
  onMove?: (vector: JoystickVector) => void;
  onStop?: () => void;
  onDirectionDown?: (dir: "UP" | "DOWN" | "LEFT" | "RIGHT") => void;
  onDirectionUp?: (dir: "UP" | "DOWN" | "LEFT" | "RIGHT") => void;
  avatarUrl?: string;
}

const MAX_RADIUS = 38; // Maximum knob distance from center in px

export const PlazaJoystick: React.FC<PlazaJoystickProps> = ({
  onMove,
  onStop,
  onDirectionDown,
  onDirectionUp,
  avatarUrl,
}) => {
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const baseRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const lastDirRef = useRef<"UP" | "DOWN" | "LEFT" | "RIGHT" | null>(null);

  const updateJoystickFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!baseRef.current) return;
      const rect = baseRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist === 0) {
        setKnobPos({ x: 0, y: 0 });
        onStop?.();
        return;
      }

      const clampedDist = Math.min(dist, MAX_RADIUS);
      const intensity = Math.min(1, dist / MAX_RADIUS);
      const angleRad = Math.atan2(dy, dx);
      let angleDeg = (angleRad * 180) / Math.PI;
      if (angleDeg < 0) angleDeg += 360;

      const knobX = Math.cos(angleRad) * clampedDist;
      const knobY = Math.sin(angleRad) * clampedDist;

      setKnobPos({ x: knobX, y: knobY });

      // Normalized direction vector scaled by intensity
      const vecX = (knobX / MAX_RADIUS) * intensity;
      const vecY = (knobY / MAX_RADIUS) * intensity;

      onMove?.({
        x: vecX,
        y: vecY,
        angle: angleDeg,
        intensity,
      });

      // Backward compatibility direction triggers
      let primaryDir: "UP" | "DOWN" | "LEFT" | "RIGHT" | null = null;
      if (intensity > 0.25) {
        if (angleDeg >= 45 && angleDeg < 135) primaryDir = "DOWN";
        else if (angleDeg >= 135 && angleDeg < 225) primaryDir = "LEFT";
        else if (angleDeg >= 225 && angleDeg < 315) primaryDir = "UP";
        else primaryDir = "RIGHT";
      }

      if (primaryDir !== lastDirRef.current) {
        if (lastDirRef.current && onDirectionUp) {
          onDirectionUp(lastDirRef.current);
        }
        if (primaryDir && onDirectionDown) {
          onDirectionDown(primaryDir);
        }
        lastDirRef.current = primaryDir;
      }
    },
    [onMove, onStop, onDirectionDown, onDirectionUp]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    activePointerIdRef.current = e.pointerId;

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    updateJoystickFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || activePointerIdRef.current !== e.pointerId) return;
    updateJoystickFromPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current === e.pointerId) {
      try {
        if ((e.target as HTMLElement).hasPointerCapture(e.pointerId)) {
          (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        }
      } catch {}

      activePointerIdRef.current = null;
      setIsDragging(false);
      setKnobPos({ x: 0, y: 0 });

      if (lastDirRef.current && onDirectionUp) {
        onDirectionUp(lastDirRef.current);
        lastDirRef.current = null;
      }

      onStop?.();
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`select-none pointer-events-auto touch-none transition-opacity duration-200 ${
        isDragging ? "opacity-100" : "opacity-40 hover:opacity-85"
      }`}
      title="Analog Touch/Drag Joystick (360° Movement)"
    >
      {/* Outer Joystick Base Ring */}
      <div
        ref={baseRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-black/45 backdrop-blur-md border-2 border-yellow-400/35 shadow-[0_0_20px_rgba(0,0,0,0.7),inset_0_0_15px_rgba(250,204,21,0.15)] flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        {/* Cardinal Direction Notches */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-yellow-400/50 pointer-events-none" />
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-yellow-400/50 pointer-events-none" />
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-yellow-400/50 pointer-events-none" />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-yellow-400/50 pointer-events-none" />

        {/* Inner concentric guide circle */}
        <div className="w-16 h-16 rounded-full border border-dashed border-white/15 pointer-events-none" />

        {/* Floating Thumb Knob */}
        <div
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            transition: isDragging ? "none" : "transform 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          }}
          className="absolute w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#1b2438] via-[#0d1322] to-[#070b14] border-2 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)] flex items-center justify-center pointer-events-none"
        >
          {avatarUrl ? (
            <div className="w-8 h-8 rounded-full overflow-hidden border border-yellow-400/60 bg-black/60">
              <img
                src={avatarUrl}
                alt="Joystick Head"
                className="w-full h-full object-cover [image-rendering:pixelated]"
              />
            </div>
          ) : (
            <div className="w-4 h-4 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.9)] flex items-center justify-center">
              <Compass className="w-3 h-3 text-black stroke-[3]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
