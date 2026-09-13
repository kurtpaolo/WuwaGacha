import React from "react";
import { ElementType, WeaponType } from "@/lib/data/items";

interface IconProps {
  className?: string;
  size?: number;
}

// 1. Currencies
export const AstriteIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <img
    src="/assets/astrite.webp"
    alt="Astrite"
    className={`object-contain inline-block ${className}`}
    style={size ? { width: size, height: size } : {}}
  />
);

export const RadiantTideIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : {}}
  >
    <circle cx="16" cy="16" r="13" fill="url(#radiantGrad)" stroke="#facc15" strokeWidth="1.5" />
    <circle cx="16" cy="16" r="9" stroke="#fff" strokeWidth="1" strokeDasharray="3 2" />
    <path d="M16 5V27M5 16H27" stroke="#fff" strokeWidth="1" strokeOpacity="0.5" />
    <circle cx="16" cy="16" r="4" fill="#fff" />
    <defs>
      <radialGradient id="radiantGrad" cx="16" cy="16" r="14" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#78350f" />
      </radialGradient>
    </defs>
  </svg>
);

export const ForgingTideIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : {}}
  >
    <circle cx="16" cy="16" r="13" fill="url(#forgingGrad)" stroke="#38bdf8" strokeWidth="1.5" />
    <path d="M11 16L16 11L21 16L16 21L11 16Z" stroke="#fff" strokeWidth="1.5" />
    <circle cx="16" cy="16" r="3" fill="#fff" />
    <defs>
      <radialGradient id="forgingGrad" cx="16" cy="16" r="14" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#bae6fd" />
        <stop offset="50%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#082f49" />
      </radialGradient>
    </defs>
  </svg>
);

export const LustrousTideIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : {}}
  >
    <circle cx="16" cy="16" r="13" fill="url(#lustrousGrad)" stroke="#e2e8f0" strokeWidth="1.5" />
    <circle cx="16" cy="16" r="7" stroke="#94a3b8" strokeWidth="1" />
    <circle cx="16" cy="16" r="3" fill="#fff" />
    <defs>
      <radialGradient id="lustrousGrad" cx="16" cy="16" r="14" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="60%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#334155" />
      </radialGradient>
    </defs>
  </svg>
);

export const AfterglowCoralIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : {}}
  >
    <path
      d="M16 28V12M16 12C16 12 12 8 8 10M16 16C16 16 22 13 24 15M16 12C16 12 20 6 23 7"
      stroke="#f59e0b"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
    <circle cx="8" cy="10" r="2.5" fill="#fde047" />
    <circle cx="24" cy="15" r="2.5" fill="#fde047" />
    <circle cx="23" cy="7" r="2.5" fill="#fde047" />
  </svg>
);

export const OscillatedCoralIcon: React.FC<IconProps> = ({ className = "w-5 h-5", size }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : {}}
  >
    <path
      d="M16 28V12M16 14C16 14 10 9 7 12M16 18C16 18 21 16 23 18M16 12C16 12 18 6 21 6"
      stroke="#c084fc"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
    <circle cx="7" cy="12" r="2.5" fill="#e9d5ff" />
    <circle cx="23" cy="18" r="2.5" fill="#e9d5ff" />
    <circle cx="21" cy="6" r="2.5" fill="#e9d5ff" />
  </svg>
);

// 2. Elements
export const ElementBadge: React.FC<{ element?: ElementType; className?: string; size?: number }> = ({
  element = "Spectro",
  className = "w-6 h-6",
  size,
}) => {
  const colorMap: Record<ElementType, string> = {
    Spectro: "#facc15",
    Havoc: "#e879f9",
    Fusion: "#fb923c",
    Aero: "#2dd4bf",
    Electro: "#818cf8",
    Glacio: "#38bdf8",
  };

  const strokeColor = colorMap[element] || "#ffd15c";

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full p-0.5 border shadow-sm relative overflow-hidden ${className}`}
      style={{
        borderColor: strokeColor,
        background: `radial-gradient(circle, ${strokeColor}33 0%, rgba(15,18,24,0.85) 100%)`,
        width: size ? size : undefined,
        height: size ? size : undefined,
      }}
      title={element}
    >
      <img
        src={`/assets/elements/${element.toLowerCase()}.png`}
        alt={element}
        className="w-full h-full object-contain p-0.5"
        onError={(e) => {
          (e.target as HTMLElement).style.display = "none";
        }}
      />
    </div>
  );
};

// 3. Weapon Category Icons
export const WeaponBadge: React.FC<{ type?: WeaponType; className?: string }> = ({
  type = "Sword",
  className = "w-5 h-5",
}) => {
  return (
    <span className={`inline-flex items-center text-xs font-mono px-1.5 py-0.5 rounded bg-white/10 text-gray-200 border border-white/20 uppercase ${className}`}>
      {type}
    </span>
  );
};

// 4. Rarity Stars
export const RarityStars: React.FC<{ rarity: number; size?: number; className?: string }> = ({
  rarity,
  size = 14,
  className = "",
}) => {
  const stars = Array.from({ length: rarity });
  const starColor = rarity === 5 ? "#ffd15c" : rarity === 4 ? "#c084fc" : "#38bdf8";

  return (
    <div className={`flex items-center space-x-0.5 ${className}`}>
      {stars.map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          fill={starColor}
          style={{ width: size, height: size }}
          className="drop-shadow-[0_0_4px_rgba(255,209,92,0.8)]"
        >
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
      ))}
    </div>
  );
};
