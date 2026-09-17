"use client";

import React from "react";

interface CharacterRailItemProps {
  charId: string;
  name: string;
  portraitUrl: string;
  title: string;
  isSelected: boolean;
  isUnavailable?: boolean;
  isComingSoon?: boolean;
  onSelect: (charId: string) => void;
}

export const CharacterRailItem: React.FC<CharacterRailItemProps> = React.memo(({
  charId,
  name,
  portraitUrl,
  title,
  isSelected,
  isUnavailable,
  isComingSoon,
  onSelect,
}) => {
  return (
    <button
      onClick={() => onSelect(charId)}
      className={`group relative flex items-center transition-all flex-1 md:w-full landscape:w-full space-x-1.5 sm:space-x-2 md:space-x-2.5 p-1 sm:p-1.5 rounded-lg border text-left ${
        isSelected
          ? "bg-gradient-to-r from-yellow-500/20 to-yellow-500/5 border-yellow-400/80 shadow-[0_0_15px_rgba(250,204,21,0.25)]"
          : "bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.05]"
      }`}
      style={{ willChange: "transform, opacity" }}
    >
      {/* Active Indicator Bar: Left on sidebar, Bottom on top bar */}
      {isSelected && (
        <>
          {/* Sidebar Left Bar (md or landscape) */}
          <div className="hidden md:block landscape:block absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-yellow-400 rounded-r shadow-[0_0_8px_#ffd15c]" />
          {/* Top Bar Bottom Glow (portrait mobile) */}
          <div className="block md:hidden landscape:hidden absolute bottom-0 left-2 right-2 h-0.5 bg-yellow-400 rounded-full shadow-[0_0_8px_#ffd15c]" />
        </>
      )}

      {/* Character Avatar Thumbnail */}
      <div className="relative w-7 h-7 sm:w-8 sm:h-8 md:w-11 md:h-11 rounded-md overflow-hidden bg-black/40 border border-white/10 flex-shrink-0 flex items-center justify-center">
        <img
          src={portraitUrl}
          alt={name}
          width={44}
          height={44}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-200"
        />
      </div>

      {/* Name details */}
      <div className="flex flex-col flex-1 min-w-0 md:flex landscape:hidden landscape:md:flex">
        <span
          className={`text-[10px] sm:text-xs font-bold truncate ${
            isSelected ? "text-yellow-300 font-display" : "text-gray-200 group-hover:text-white"
          }`}
        >
          {name}
        </span>
        <span
          className={`text-[9px] sm:text-[10px] font-mono truncate hidden sm:block ${
            isUnavailable
              ? "text-rose-400 font-bold"
              : isComingSoon
              ? "text-amber-400 font-bold"
              : "text-gray-400"
          }`}
        >
          {isUnavailable ? "Unavailable" : isComingSoon ? "Coming Soon" : title}
        </span>
      </div>
    </button>
  );
}, (prev, next) => {
  return (
    prev.charId === next.charId &&
    prev.isSelected === next.isSelected &&
    prev.name === next.name &&
    prev.portraitUrl === next.portraitUrl &&
    prev.title === next.title &&
    prev.isUnavailable === next.isUnavailable &&
    prev.isComingSoon === next.isComingSoon
  );
});

CharacterRailItem.displayName = "CharacterRailItem";
