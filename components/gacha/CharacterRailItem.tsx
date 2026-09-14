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
      className={`group relative w-full flex items-center space-x-2.5 p-1.5 rounded-lg border text-left transition-all ${
        isSelected
          ? "bg-gradient-to-r from-yellow-500/20 to-yellow-500/5 border-yellow-400/80 shadow-[0_0_15px_rgba(250,204,21,0.25)]"
          : "bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.05]"
      }`}
      style={{ willChange: "transform, opacity" }}
    >
      {/* Active Indicator Bar */}
      {isSelected && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-yellow-400 rounded-r shadow-[0_0_8px_#ffd15c]" />
      )}

      {/* Character Avatar Thumbnail */}
      <div className="relative w-9 h-9 md:w-11 md:h-11 rounded-md overflow-hidden bg-black/40 border border-white/10 flex-shrink-0 flex items-center justify-center">
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

      {/* Name details (Desktop) */}
      <div className="hidden md:flex flex-col flex-1 min-w-0">
        <span
          className={`text-xs font-bold truncate ${
            isSelected ? "text-yellow-300 font-display" : "text-gray-200 group-hover:text-white"
          }`}
        >
          {name}
        </span>
        <span
          className={`text-[10px] font-mono truncate ${
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
