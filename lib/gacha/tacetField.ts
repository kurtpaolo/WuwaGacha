// Free Astrites Idle Accumulator
// Generates 160 Astrite (1 pull) every 6.0 minutes (6m 00s).
// Base Cap: 19,200 Astrite (120 pulls / 12.0 hours).
// VIP Bonus: +50% of base (+60 pulls / +9,600 ✦ / +6.0h).
// VIP Total Cap: 28,800 ✦ (180 pulls / 18.0h).
// Supports offline earnings so players can claim accumulated Astrite upon return.

import { getStoredUserIsVip } from "@/lib/supabase/profile";
import { getStoredLoginStreak } from "./loginStreak";

export const TICK_INTERVAL_MS = 6 * 60 * 1000; // 6.0 minutes (360,000 ms)
export const ASTRITE_PER_TICK = 160;

export const BASE_MAX_TACET_ASTRITE = 19200; // 120 ticks = 120 pulls = 12.0 hours
export const VIP_ASTRITE_BONUS = 9600; // +60 pulls = +6.0 hours (+50% of base cap)

// Legacy backwards-compatibility exports
export const MAX_TACET_ASTRITE = BASE_MAX_TACET_ASTRITE;
export const VIP_MAX_TACET_ASTRITE = BASE_MAX_TACET_ASTRITE + VIP_ASTRITE_BONUS; // 28,800

/**
 * Streak bonuses have been removed; titles and streaks no longer increase the bank.
 * Kept for backwards compatibility returning 0 bonus.
 */
export function getTacetStreakBonus(_maxLoginStreak: number = 0): {
  bonusAstrite: number;
  bonusPulls: number;
  bonusHours: number;
  unlockedTiers: number;
} {
  return { bonusAstrite: 0, bonusPulls: 0, bonusHours: 0, unlockedTiers: 0 };
}

/**
 * Calculates maximum Astrite capacity. Only VIP increases capacity.
 */
export function calculateMaxTacetAstrite(
  _maxLoginStreak: number = 0,
  isVip: boolean = false
): number {
  return isVip ? BASE_MAX_TACET_ASTRITE + VIP_ASTRITE_BONUS : BASE_MAX_TACET_ASTRITE;
}

/**
 * Returns battery storage duration in hours (e.g., 12.0h or 18.0h for VIP).
 */
export function getTacetBatteryHours(
  _maxLoginStreak: number = 0,
  isVip: boolean = false
): number {
  const cap = calculateMaxTacetAstrite(0, isVip);
  const pulls = cap / ASTRITE_PER_TICK;
  return Number(((pulls * 6.0) / 60).toFixed(1));
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
 * Calculates current accumulated Astrite in the Free Astrites bank for the active user.
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
 * Synchronizes local Free Astrites timer with cloud timestamp from Supabase profile.
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
