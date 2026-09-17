import charactersData from "@/characters.json";

export const GMT8_OFFSET_MS = 8 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

// Filter playable 5-star limited characters (excluding coming soon or unavailable)
export const PLAYABLE_LIMITED_5STAR_IDS: string[] = charactersData.limitedResonators
  .filter((r: any) => r.rarity === 5 && !r.isComingSoon && !r.isUnavailable)
  .map((r: any) => r.id);

/**
 * Returns the deterministic index of the current hour in GMT+8.
 */
export function getCurrentGmt8HourIndex(nowMs: number = Date.now()): number {
  return Math.floor((nowMs + GMT8_OFFSET_MS) / ONE_HOUR_MS);
}

/**
 * Returns 3 deterministically chosen limited 5-star character IDs for the current GMT+8 hour.
 * All players globally see the exact same 3 featured banners simultaneously.
 */
export function getHourlyRotatedCharacters(nowMs: number = Date.now()): string[] {
  const hourIndex = getCurrentGmt8HourIndex(nowMs);
  const pool = PLAYABLE_LIMITED_5STAR_IDS;
  if (pool.length <= 3) return pool;

  const selected: string[] = [];
  let seed = hourIndex * 997 + 13;

  while (selected.length < 3) {
    // Linear congruential generator for uniform distribution
    seed = (seed * 9301 + 49297) % 233280;
    const idx = Math.floor((seed / 233280) * pool.length);
    const charId = pool[idx];
    if (!selected.includes(charId)) {
      selected.push(charId);
    }
  }

  return selected;
}

/**
 * Calculates time remaining until the next hourly rotation reset.
 * Returns { hours, minutes, seconds, formattedText }
 */
export function getTimeUntilNextRotation(nowMs: number = Date.now()): {
  hours: number;
  minutes: number;
  seconds: number;
  formattedText: string;
} {
  const nextHourMs = (Math.floor((nowMs + GMT8_OFFSET_MS) / ONE_HOUR_MS) + 1) * ONE_HOUR_MS - GMT8_OFFSET_MS;
  const diffMs = Math.max(0, nextHourMs - nowMs);

  const hours = Math.floor(diffMs / ONE_HOUR_MS);
  const minutes = Math.floor((diffMs % ONE_HOUR_MS) / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);

  const formattedText = `Banner Reset: ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;

  return { hours, minutes, seconds, formattedText };
}
