import React from "react";
import { ElementType } from "@/lib/data/items";

interface IconProps {
  className?: string;
  size?: number;
}

// 1. Astrite Currency Icon
export const AstriteIcon: React.FC<IconProps> = React.memo(({ className = "w-5 h-5", size }) => (
  <img
    src="/assets/astrite.webp"
    alt="Astrite"
    loading="lazy"
    decoding="async"
    width={size || 20}
    height={size || 20}
    className={`object-contain inline-block ${className}`}
    style={size ? { width: size, height: size } : {}}
  />
));
AstriteIcon.displayName = "AstriteIcon";

// 2. Element Badge
export const ElementBadge: React.FC<{ element?: ElementType; className?: string; size?: number }> = React.memo(({
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
        loading="lazy"
        decoding="async"
        className="w-full h-full object-contain p-0.5"
        onError={(e) => {
          (e.target as HTMLElement).style.display = "none";
        }}
      />
    </div>
  );
});
ElementBadge.displayName = "ElementBadge";

// 3. Rarity Stars
export const RarityStars: React.FC<{ rarity: number; size?: number; className?: string }> = React.memo(({
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
});
RarityStars.displayName = "RarityStars";
