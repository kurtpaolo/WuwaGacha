// Tacet Field Idle Astrite Accumulator
// Generates 160 Astrite (1 pull) every 4.5 minutes (4m 30s).
// Base Cap: 25,600 Astrite (160 pulls / 12.0 hours).
// Streak Tiers (+20 pulls / +3,200 ✦ / +1.5h each):
//   - Tier 1 (2 Days):  28,800 ✦ (180 pulls / 13.5h)
//   - Tier 2 (5 Days):  32,000 ✦ (200 pulls / 15.0h)
//   - Tier 3 (9 Days):  35,200 ✦ (220 pulls / 16.5h)
//   - Tier 4 (14 Days): 38,400 ✦ (240 pulls / 18.0h - Regular Max)
// VIP Bonus: +50% of base (+80 pulls / +12,800 ✦ / +6.0h).
// VIP + Tier 4 (14 Days): 51,200 ✦ (320 pulls / 24.0h - Exactly 2x Double Cap!)
// Supports offline earnings so players can claim accumulated Astrite upon return.

import { getStoredUserIsVip } from "@/lib/supabase/profile";
import { getStoredLoginStreak } from "./loginStreak";

export const TICK_INTERVAL_MS = 4.5 * 60 * 1000; // 4.5 minutes (4m 30s)
export const ASTRITE_PER_TICK = 160;

export const BASE_MAX_TACET_ASTRITE = 25600; // 160 ticks = 160 pulls = 12.0 hours
export const STREAK_TIER_ASTRITE_BONUS = 3200; // +20 pulls = +1.5 hours per tier
export const VIP_ASTRITE_BONUS = 12800; // +80 pulls = +6.0 hours (+50% of base cap)

// Legacy backwards-compatibility exports
export const MAX_TACET_ASTRITE = BASE_MAX_TACET_ASTRITE;
export const VIP_MAX_TACET_ASTRITE = BASE_MAX_TACET_ASTRITE + (STREAK_TIER_ASTRITE_BONUS * 4) + VIP_ASTRITE_BONUS; // 51,200

/**
 * Calculates additional Astrite and duration gained from login streak milestones (Option 3: 2, 5, 9, 14 days).
 */
export function getTacetStreakBonus(maxLoginStreak: number = 0): {
  bonusAstrite: number;
  bonusPulls: number;
  bonusHours: number;
  unlockedTiers: number;
} {
  let bonusAstrite = 0;
  let unlockedTiers = 0;

  if (maxLoginStreak >= 2) {
    bonusAstrite += STREAK_TIER_ASTRITE_BONUS;
    unlockedTiers++;
  }
  if (maxLoginStreak >= 5) {
    bonusAstrite += STREAK_TIER_ASTRITE_BONUS;
    unlockedTiers++;
  }
  if (maxLoginStreak >= 9) {
    bonusAstrite += STREAK_TIER_ASTRITE_BONUS;
    unlockedTiers++;
  }
  if (maxLoginStreak >= 14) {
    bonusAstrite += STREAK_TIER_ASTRITE_BONUS;
    unlockedTiers++;
  }

  const bonusPulls = bonusAstrite / ASTRITE_PER_TICK;
  const bonusHours = (bonusPulls * 4.5) / 60;
  return { bonusAstrite, bonusPulls, bonusHours, unlockedTiers };
}

/**
 * Calculates true maximum Astrite capacity based on permanent maxLoginStreak and VIP status.
 */
export function calculateMaxTacetAstrite(
  maxLoginStreak: number = 0,
  isVip: boolean = false
): number {
  const { bonusAstrite } = getTacetStreakBonus(maxLoginStreak);
  const vipBonus = isVip ? VIP_ASTRITE_BONUS : 0;
  return BASE_MAX_TACET_ASTRITE + bonusAstrite + vipBonus;
}

/**
 * Returns battery storage duration in hours (e.g., 12.0h up to 24.0h).
 */
export function getTacetBatteryHours(
  maxLoginStreak: number = 0,
  isVip: boolean = false
): number {
  const cap = calculateMaxTacetAstrite(maxLoginStreak, isVip);
  const pulls = cap / ASTRITE_PER_TICK;
  return Number(((pulls * 4.5) / 60).toFixed(1));
}

interface TacetFieldState {
  lastClaimedAt: number;
}

function getTacetStorageKey(userId?: string | null, isSandbox?: boolean): string {
  if (isSandbox) return "wuwa_tacet_field_sandbox";
  if (userId) return `wuwa_tacet_field_${userId}`;
  return "wuwa_tacet_field_guest";
}

function loadTacetState(userId?: string | null, isSandbox?: boolean): TacetFieldState {
  if (typeof window === "undefined") {
    return { lastClaimedAt: Date.now() };
  }
  const key = getTacetStorageKey(userId, isSandbox);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.lastClaimedAt === "number") {
        return parsed;
      }
    }
  } catch {}

  // If first time logging in as an authenticated user on this device,
  // inherit any guest accumulator timestamp so offline time isn't lost.
  if (userId && !isSandbox) {
    try {
      const guestRaw = localStorage.getItem("wuwa_tacet_field_guest");
      if (guestRaw) {
        const guestParsed = JSON.parse(guestRaw);
        if (typeof guestParsed.lastClaimedAt === "number") {
          const inherited = { lastClaimedAt: guestParsed.lastClaimedAt };
          localStorage.setItem(key, JSON.stringify(inherited));
          return inherited;
        }
      }
    } catch {}
  }

  // If first time, start from now so it starts accumulating
  const initial = { lastClaimedAt: Date.now() };
  try {
    localStorage.setItem(key, JSON.stringify(initial));
    localStorage.removeItem("wuwa_tacet_field_state_v1");
  } catch {}
  return initial;
}

function saveTacetState(state: TacetFieldState, userId?: string | null, isSandbox?: boolean) {
  if (typeof window === "undefined") return;
  const key = getTacetStorageKey(userId, isSandbox);
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {}
}

export interface TacetFieldStatus {
  accumulated: number;
  isMaxed: boolean;
  maxCap: number;
  secondsUntilNextTick: number;
  isVip: boolean;
  batteryHours: number;
  unlockedStreakTiers: number;
}

/**
 * Calculates current accumulated Astrite in the Tacet Field for the active user.
 * Dynamically factors in permanent maxLoginStreak and VIP (+50% bonus).
 */
export function getTacetFieldStatus(
  userId?: string | null,
  isSandbox?: boolean,
  nowMs: number = Date.now(),
  isVip?: boolean,
  maxLoginStreak?: number
): TacetFieldStatus {
  const effectiveIsVip = Boolean(
    isVip ?? (userId ? getStoredUserIsVip(userId) : false)
  );

  const effectiveMaxStreak =
    maxLoginStreak ?? (userId ? getStoredLoginStreak(userId).maxStreak : 1);

  const effectiveCap = calculateMaxTacetAstrite(effectiveMaxStreak, effectiveIsVip);
  const batteryHours = getTacetBatteryHours(effectiveMaxStreak, effectiveIsVip);
  const { unlockedTiers } = getTacetStreakBonus(effectiveMaxStreak);

  const state = loadTacetState(userId, isSandbox);
  const diffMs = Math.max(0, nowMs - state.lastClaimedAt);
  const ticks = Math.floor(diffMs / TICK_INTERVAL_MS);
  const accumulated = Math.min(effectiveCap, ticks * ASTRITE_PER_TICK);
  const isMaxed = accumulated >= effectiveCap;

  const msIntoCurrentTick = diffMs % TICK_INTERVAL_MS;
  const msUntilNext = isMaxed ? 0 : TICK_INTERVAL_MS - msIntoCurrentTick;
  const secondsUntilNextTick = Math.ceil(msUntilNext / 1000);

  return {
    accumulated,
    isMaxed,
    maxCap: effectiveCap,
    secondsUntilNextTick,
    isVip: effectiveIsVip,
    batteryHours,
    unlockedStreakTiers: unlockedTiers,
  };
}

/**
 * Claims the accumulated Astrite, resetting the accumulator timer to start generating again.
 * Preserves remainder minutes towards the next tick if not maxed out.
 * Returns the amount claimed.
 */
export function claimTacetField(
  userId?: string | null,
  isSandbox?: boolean,
  nowMs: number = Date.now(),
  isVip?: boolean,
  maxLoginStreak?: number
): number {
  const status = getTacetFieldStatus(userId, isSandbox, nowMs, isVip, maxLoginStreak);
  if (status.accumulated <= 0) return 0;

  const claimed = status.accumulated;
  const state = loadTacetState(userId, isSandbox);
  const diffMs = Math.max(0, nowMs - state.lastClaimedAt);
  // If maxed, start fresh from nowMs; otherwise retain progress into the next tick
  const remainderMs = status.isMaxed ? 0 : diffMs % TICK_INTERVAL_MS;
  saveTacetState({ lastClaimedAt: nowMs - remainderMs }, userId, isSandbox);
  return claimed;
}

/**
 * Synchronizes local Tacet Field timer with cloud timestamp from Supabase profile.
 */
export function syncTacetCloudTimestamp(userId?: string | null, cloudTimestampIso?: string): void {
  if (typeof window === "undefined" || !userId || !cloudTimestampIso) return;
  const cloudMs = new Date(cloudTimestampIso).getTime();
  if (isNaN(cloudMs) || cloudMs <= 0) return;

  const key = getTacetStorageKey(userId, false);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify({ lastClaimedAt: cloudMs }));
      return;
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed.lastClaimedAt === "number") {
      if (cloudMs > parsed.lastClaimedAt) {
        localStorage.setItem(key, JSON.stringify({ lastClaimedAt: cloudMs }));
      }
    } else {
      localStorage.setItem(key, JSON.stringify({ lastClaimedAt: cloudMs }));
    }
  } catch {}
}
