import { ResonatorElement, TypeMatchup } from "./types";

export const ELEMENT_COLORS: Record<ResonatorElement, { bg: string; text: string; border: string; glow: string }> = {
  Spectro: {
    bg: "bg-amber-400/20",
    text: "text-amber-300",
    border: "border-amber-400/40",
    glow: "shadow-[0_0_12px_rgba(251,191,36,0.4)]",
  },
  Havoc: {
    bg: "bg-purple-950/40",
    text: "text-purple-400",
    border: "border-purple-500/40",
    glow: "shadow-[0_0_12px_rgba(168,85,247,0.4)]",
  },
  Fusion: {
    bg: "bg-rose-950/40",
    text: "text-rose-400",
    border: "border-rose-500/40",
    glow: "shadow-[0_0_12px_rgba(244,63,94,0.4)]",
  },
  Glacio: {
    bg: "bg-cyan-950/40",
    text: "text-cyan-300",
    border: "border-cyan-400/40",
    glow: "shadow-[0_0_12px_rgba(34,211,238,0.4)]",
  },
  Electro: {
    bg: "bg-violet-950/40",
    text: "text-violet-300",
    border: "border-violet-400/40",
    glow: "shadow-[0_0_12px_rgba(139,92,246,0.4)]",
  },
  Aero: {
    bg: "bg-emerald-950/40",
    text: "text-emerald-300",
    border: "border-emerald-400/40",
    glow: "shadow-[0_0_12px_rgba(52,211,153,0.4)]",
  },
};

export function getTypeMatchup(
  attackerElement: ResonatorElement,
  defenderElement: ResonatorElement
): TypeMatchup {
  // Same element resistance: 0.8x (fair tactical defense, not debilitating)
  if (attackerElement === defenderElement) {
    return { multiplier: 0.8, text: "resisted" };
  }

  // 1. Glacio (Ice / Frost)
  // Super effective against Fusion (douses flames) and Aero (freezes wings & flying currents)
  if (attackerElement === "Glacio" && (defenderElement === "Fusion" || defenderElement === "Aero")) {
    return { multiplier: 1.25, text: "super" };
  }
  // Resisted by Electro (dispels ice through conductive voltage)
  if (attackerElement === "Glacio" && defenderElement === "Electro") {
    return { multiplier: 0.8, text: "resisted" };
  }

  // 2. Fusion (Fire / Thermal)
  // Super effective against Aero (fire consumes wind) and Glacio (melts frost)
  if (attackerElement === "Fusion" && (defenderElement === "Aero" || defenderElement === "Glacio")) {
    return { multiplier: 1.25, text: "super" };
  }
  // Resisted by Spectro (radiant illumination dissipates thermal haze)
  if (attackerElement === "Fusion" && defenderElement === "Spectro") {
    return { multiplier: 0.8, text: "resisted" };
  }

  // 3. Electro (Lightning / Voltage)
  // Super effective against Glacio (conducts through moisture) and Aero (strikes airborne targets)
  if (attackerElement === "Electro" && (defenderElement === "Glacio" || defenderElement === "Aero")) {
    return { multiplier: 1.25, text: "super" };
  }
  // Resisted by Havoc (abyssal grounding absorbs electrical discharge)
  if (attackerElement === "Electro" && defenderElement === "Havoc") {
    return { multiplier: 0.8, text: "resisted" };
  }

  // 4. Aero (Wind / Atmosphere)
  // Super effective against Havoc (purifying gales disperse dark miasma) and Spectro (turbulence scatters prismatic rays)
  if (attackerElement === "Aero" && (defenderElement === "Havoc" || defenderElement === "Spectro")) {
    return { multiplier: 1.25, text: "super" };
  }
  // Resisted by Electro (charge cuts through wind) and Fusion (fuels fire)
  if (attackerElement === "Aero" && (defenderElement === "Electro" || defenderElement === "Fusion")) {
    return { multiplier: 0.8, text: "resisted" };
  }

  // 5. Spectro (Light / Order)
  // Super effective against Havoc (light pierces darkness) and Electro (radiance grounds chaotic conductivity)
  if (attackerElement === "Spectro" && (defenderElement === "Havoc" || defenderElement === "Electro")) {
    return { multiplier: 1.25, text: "super" };
  }
  // Resisted by Aero (atmospheric turbulence scatters light)
  if (attackerElement === "Spectro" && defenderElement === "Aero") {
    return { multiplier: 0.8, text: "resisted" };
  }

  // 6. Havoc (Darkness / Void)
  // Super effective against Spectro (void swallows light) and Electro (grounding voids electrical circuit)
  if (attackerElement === "Havoc" && (defenderElement === "Spectro" || defenderElement === "Electro")) {
    return { multiplier: 1.25, text: "super" };
  }
  // Resisted by Aero (void cannot anchor to swirling gales)
  if (attackerElement === "Havoc" && defenderElement === "Aero") {
    return { multiplier: 0.8, text: "resisted" };
  }

  return { multiplier: 1.0, text: "neutral" };
}
