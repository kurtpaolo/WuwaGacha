import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { BattleTrainer, BattleResonator, ResonatorElement } from "./types";
import { createBattleResonator } from "./resonatorMoves";
import charactersData from "@/characters.json";

export interface PvpStats {
  wins: number;
  losses: number;
  streak: number;
  maxStreak: number;
  battlePoints: number;
}

export interface GymStageLevel {
  level: number;
  title: string;
  bounty: number; // Astrite awarded
  exp: number; // Combat EXP awarded
}

export const GYM_STAGES: GymStageLevel[] = [
  { level: 40, title: "Novice", bounty: 100, exp: 80 },
  { level: 55, title: "Adept", bounty: 160, exp: 140 },
  { level: 70, title: "Veteran", bounty: 240, exp: 220 },
  { level: 85, title: "Master", bounty: 320, exp: 350 },
  { level: 100, title: "Apex", bounty: 480, exp: 500 },
];

/**
 * Calculate Combat EXP required to level up a resonator by +10 levels.
 * Higher tiers require progressively more EXP, making Lv. 100 a prestigious milestone.
 */
export function getUpgradeExpCost(currentLvl: number): number {
  if (currentLvl >= 100) return 0;
  const step = Math.max(0, Math.floor((currentLvl - 40) / 10));
  // Lv 40->50: 400 | 50->60: 550 | 60->70: 700 | 70->80: 850 | 80->90: 1000 | 90->100: 1200
  return 400 + step * 150 + (step >= 5 ? 50 : 0);
}

export function getUpgradeAstriteCost(currentLvl: number): number {
  if (currentLvl >= 100) return 0;
  return 35;
}

export interface GymBoss {
  id: string;
  charId: string;
  name: string;
  title: string;
  element: ResonatorElement;
  avatarId: string;
  description: string;
  teamIds: string[];
}

// Generate an official Gym Boss for every playable resonator in the game
export function getAllGymBosses(): GymBoss[] {
  // Strictly use 5-star Limited Resonators with authentic pixel sprites
  const allChars: Array<{
    id: string;
    name: string;
    title?: string;
    element?: string;
    quote?: string;
    rarity?: number;
  }> = (charactersData.limitedResonators || []).filter((c: any) => c.rarity !== 4);

  // Deduplicate by ID
  const seen = new Set<string>();
  const uniqueChars = allChars.filter((c) => {
    if (!c.id || seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  const allCharIds = uniqueChars.map((c) => c.id);

  return uniqueChars.map((c) => {
    // Generate a 6-resonator synergistic team for the boss
    const sameElement = uniqueChars
      .filter((other) => other.element === c.element && other.id !== c.id)
      .map((other) => other.id);

    const otherElements = allCharIds.filter((id) => id !== c.id && !sameElement.includes(id));

    // Combine: Boss first, then same element allies, then other allies up to 6
    const teamIds = [c.id, ...sameElement, ...otherElements].slice(0, 6);

    return {
      id: `gym_boss_${c.id}`,
      charId: c.id,
      name: c.name,
      title: c.title || `${c.name} • Resonator Trial`,
      element: (c.element || "Spectro") as ResonatorElement,
      avatarId: c.id,
      description: c.quote || `Challenge ${c.name} in an intense elemental gym trial.`,
      teamIds,
    };
  });
}

export function createGymBossTrainer(boss: GymBoss, level: number): BattleTrainer {
  const team = boss.teamIds.map((id) => createBattleResonator(id, level, 0));

  return {
    id: boss.id,
    username: `${boss.name} (Boss)`,
    avatarId: boss.avatarId,
    customTitle: `${boss.title} • Lv. ${level}`,
    team,
    activeIdx: 0,
    activeIndices: [0, 1, 2].slice(0, team.length),
    isAi: true,
  };
}

// =========================================================================
// DAILY 00:00 GMT+8 RESET & COOLDOWN UTILITIES
// =========================================================================

/**
 * Returns YYYY-MM-DD representing the current calendar day in GMT+8 (UTC+8).
 * At 00:00 GMT+8, this string automatically rolls over to the next day.
 */
export function getGmt8DateKey(date: Date = new Date()): string {
  const gmt8Time = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const year = gmt8Time.getUTCFullYear();
  const month = String(gmt8Time.getUTCMonth() + 1).padStart(2, "0");
  const day = String(gmt8Time.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getClaimedGymBosses(userId?: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(`wuwa_gym_claimed_${userId || "guest"}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export function isGymBossClaimedToday(bossCharId: string, userId?: string): boolean {
  const claims = getClaimedGymBosses(userId);
  return claims[bossCharId] === getGmt8DateKey();
}

export function recordGymBossClaim(bossCharId: string, userId?: string): void {
  const claims = getClaimedGymBosses(userId);
  claims[bossCharId] = getGmt8DateKey();
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`wuwa_gym_claimed_${userId || "guest"}`, JSON.stringify(claims));
    } catch {}
  }
}

export const MAX_DAILY_PVP_CASUAL_WINS = 3; // Max 3 casual win rewards = 480 Astrite/day

export function getDailyPvpCasualWins(userId?: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const today = getGmt8DateKey();
    const raw = localStorage.getItem(`wuwa_pvp_daily_casual_wins_${userId || "guest"}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === today) return parsed.count || 0;
    }
  } catch {}
  return 0;
}

export function recordDailyPvpCasualWin(userId?: string): number {
  const current = getDailyPvpCasualWins(userId);
  const updated = current + 1;
  if (typeof window !== "undefined") {
    try {
      const today = getGmt8DateKey();
      localStorage.setItem(
        `wuwa_pvp_daily_casual_wins_${userId || "guest"}`,
        JSON.stringify({ date: today, count: updated })
      );
    } catch {}
  }
  return updated;
}

export function getTimeUntilGmt8Reset(): {
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
} {
  const now = new Date();
  const gmt8Now = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const nextResetUtc =
    Date.UTC(gmt8Now.getUTCFullYear(), gmt8Now.getUTCMonth(), gmt8Now.getUTCDate() + 1, 0, 0, 0) -
    8 * 60 * 60 * 1000;
  const diffMs = Math.max(0, nextResetUtc - now.getTime());
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  return {
    hours,
    minutes,
    seconds,
    formatted: `${hours}h ${minutes}m ${seconds}s`,
  };
}

// =========================================================================
// RESONATOR LEVELING & COMBAT EXP UTILITIES
// =========================================================================

export function getStoredResonatorLevels(userId?: string): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(`wuwa_resonator_levels_${userId || "guest"}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export function getResonatorLevel(charId: string, userId?: string): number {
  const levels = getStoredResonatorLevels(userId);
  return Math.min(100, levels[charId] || 50); // Default Lv 50, capped at 100
}

export function setResonatorLevel(charId: string, level: number, userId?: string): void {
  const levels = getStoredResonatorLevels(userId);
  levels[charId] = Math.min(100, Math.max(40, level));
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`wuwa_resonator_levels_${userId || "guest"}`, JSON.stringify(levels));
    } catch {}
  }
}

export function getCombatExp(userId?: string): number {
  if (typeof window === "undefined") return 250;
  try {
    const raw = localStorage.getItem(`wuwa_combat_exp_${userId || "guest"}`);
    if (raw !== null) return parseInt(raw, 10) || 0;
  } catch {}
  return 250; // Balanced starting Combat EXP
}

export function addCombatExp(amount: number, userId?: string): number {
  const current = getCombatExp(userId);
  const updated = current + amount;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`wuwa_combat_exp_${userId || "guest"}`, updated.toString());
    } catch {}
  }
  return updated;
}

export function spendCombatExp(amount: number, userId?: string): boolean {
  const current = getCombatExp(userId);
  if (current < amount) return false;
  const updated = current - amount;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`wuwa_combat_exp_${userId || "guest"}`, updated.toString());
    } catch {}
  }
  return true;
}

// =========================================================================
// PLAYER SEARCH & PVP STATS
// =========================================================================

export { type PlayerSearchResult } from "@/lib/supabase/auth";

export async function searchPvpPlayers(query: string): Promise<import("@/lib/supabase/auth").PlayerSearchResult[]> {
  try {
    const { searchPlayersList } = await import("@/lib/supabase/auth");
    const res = await searchPlayersList(query);
    return res.players || [];
  } catch {
    return [];
  }
}

export async function searchPlayerTrainer(username: string): Promise<BattleTrainer | null> {
  if (!username.trim()) return null;

  try {
    const { searchPlayerProfile } = await import("@/lib/supabase/auth");
    const { profile, error } = await searchPlayerProfile(username.trim());
    if (error || !profile) return null;

    const ownedSet = new Set((profile.inventory || []).map((i) => i.character_id.toLowerCase()));
    let teamIds: string[] = [];

    if (profile.showcase_ids && profile.showcase_ids.length > 0) {
      teamIds = profile.showcase_ids.filter(
        (id) => id && (ownedSet.size === 0 || ownedSet.has(id.toLowerCase()))
      );
    }
    if (teamIds.length === 0 && profile.inventory && profile.inventory.length > 0) {
      teamIds = profile.inventory.slice(0, 6).map((i) => i.character_id);
    }
    if (teamIds.length === 0) {
      teamIds = ["shorekeeper", "jiyan", "yinlin"];
    }

    // In PvP: all resonators are normalized to Level 100 tournament standard, with Sequence scaling from inventory
    const team = teamIds.map((id: string) => {
      const invItem = (profile.inventory || []).find(
        (i) => i.character_id.toLowerCase() === id.toLowerCase()
      );
      const seq = Math.max(0, Math.min(6, (invItem?.count || 1) - 1));
      return createBattleResonator(id, 100, seq);
    });

    return {
      id: profile.id,
      username: profile.username,
      avatarId: profile.avatar_id || "shorekeeper",
      customTitle: profile.custom_title || "Resonator Champion",
      team,
      activeIdx: 0,
      activeIndices: [0, 1, 2].slice(0, team.length),
      isAi: true,
    };
  } catch (err) {
    console.error("Error searching player for PvP:", err);
    return null;
  }
}

export function getStoredPvpStats(userId?: string): PvpStats {
  if (typeof window === "undefined") {
    return { wins: 0, losses: 0, streak: 0, maxStreak: 0, battlePoints: 0 };
  }
  const key = `wuwa_pvp_stats_${userId || "guest"}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { wins: 0, losses: 0, streak: 0, maxStreak: 0, battlePoints: 0 };
}

/**
 * Calculate competitive Team Power based on Sequences, Element coverage, and Holy Trinity synergy.
 */
export function calculateTeamPower(team?: BattleResonator[]): number {
  if (!team || team.length === 0) return 1000;

  // 1. Resonator Base & Sequence Power
  let totalPower = 0;
  const elements = new Set<string>();
  const archetypes = new Set<string>();

  team.forEach((res) => {
    const seq = res.sequence ?? 0;
    // Sequence weights: S0=1000, S1=1040, S2=1090, S3=1150, S4=1220, S5=1300, S6=1420
    const seqBonus = [0, 40, 90, 150, 220, 300, 420][Math.min(6, Math.max(0, seq))];
    totalPower += 1000 + seqBonus;

    if (res.element) elements.add(res.element);
    if (res.archetype) archetypes.add(res.archetype);
  });

  // 2. Elemental Diversity Bonus (Encourages multi-element strategy)
  const uniqueElemCount = elements.size;
  if (uniqueElemCount >= 6) totalPower += 220;
  else if (uniqueElemCount >= 5) totalPower += 140;
  else if (uniqueElemCount >= 4) totalPower += 80;

  // 3. Holy Trinity Synergy (DPS + Support + Sub-DPS)
  const hasDps = archetypes.has("dps");
  const hasSupport = archetypes.has("support");
  const hasSubDps = archetypes.has("sub_dps") || archetypes.has("hybrid");
  if (hasDps && hasSupport && hasSubDps) {
    totalPower += 160; // Cohesive competitive composition
  }

  return Math.round(totalPower);
}

export interface EloDeltaResult {
  delta: number;
  playerPower: number;
  opponentPower: number;
  isUnderdog: boolean;
}

/**
 * Calculate dynamic Elo / BP delta based on team composition power matchup.
 */
export function calculateEloPointsDelta(
  won: boolean,
  currentPoints: number,
  playerTeam?: BattleResonator[],
  opponentTeam?: BattleResonator[],
  streak: number = 0
): EloDeltaResult {
  const playerPower = calculateTeamPower(playerTeam);
  const opponentPower = calculateTeamPower(opponentTeam);
  const powerDiff = opponentPower - playerPower; // positive if opponent has stronger team (player is underdog)
  const isUnderdog = powerDiff > 120;

  // Expected win probability via logistic Elo formula
  const expectedWin = 1 / (1 + Math.pow(10, (opponentPower - playerPower) / 1200));

  let delta = 0;
  if (won) {
    // Underdog multiplier: if underdog beats stacked team, earn bonus BP
    const underdogBonus = isUnderdog ? Math.min(10, Math.round(powerDiff / 100)) : 0;
    const streakBonus = Math.min(8, Math.round(streak * 1.5));
    // Typical even match (expectedWin = 0.5): baseWin is 10 + 5 = 15 BP (halved from 30 BP)
    const baseWin = Math.round(10 + (1 - expectedWin) * 10); // 10 - 20 BP
    delta = Math.max(8, baseWin + underdogBonus + streakBonus);
  } else {
    // Underdog mercy: if underdog loses to favorite, lose fewer points (-3 to -5 BP)
    // Favorite upset: if favorite loses to underdog, lose more points (-12 to -20 BP)
    if (isUnderdog) {
      delta = -Math.max(3, Math.round(8 * expectedWin)); // -3 to -5 BP
    } else {
      const upsetPenalty = powerDiff < -120 ? Math.min(8, Math.round(Math.abs(powerDiff) / 120)) : 0;
      delta = -Math.max(6, Math.round(8 + (1 - expectedWin) * 8) + upsetPenalty); // -11 to -20 BP
    }
  }

  return { delta, playerPower, opponentPower, isUnderdog };
}

export interface RecordBattleResultOutput extends PvpStats {
  pointsDelta: number;
  isUnderdog: boolean;
}

export function recordBattleResult(
  won: boolean,
  userId?: string,
  playerTeam?: BattleResonator[],
  opponentTeam?: BattleResonator[]
): RecordBattleResultOutput {
  const current = getStoredPvpStats(userId);
  const { delta, isUnderdog } = calculateEloPointsDelta(
    won,
    current.battlePoints,
    playerTeam,
    opponentTeam,
    won ? current.streak : 0
  );

  if (won) {
    current.wins += 1;
    current.streak += 1;
    current.maxStreak = Math.max(current.maxStreak, current.streak);
    current.battlePoints += delta;
  } else {
    current.losses += 1;
    current.streak = 0; // STRICTLY reset streak to 0 on loss!
    current.battlePoints = Math.max(0, current.battlePoints + delta); // delta is negative
  }

  if (typeof window !== "undefined") {
    const key = `wuwa_pvp_stats_${userId || "guest"}`;
    try {
      localStorage.setItem(key, JSON.stringify(current));
    } catch {}
  }

  // Cloud sync to Supabase profiles (graceful fallback if columns don't exist yet)
  if (userId && !userId.startsWith("guest") && isSupabaseConfigured()) {
    Promise.resolve(
      supabase
        .from("profiles")
        .update({
          pvp_wins: current.wins,
          pvp_losses: current.losses,
          pvp_streak: current.streak,
          pvp_max_streak: current.maxStreak,
          pvp_points: current.battlePoints,
        })
        .eq("id", userId)
    )
      .then(({ error }) => {
        if (error) {
          console.debug("PvP stats cloud sync (local storage active):", error.message);
        }
      })
      .catch(() => {});
  }

  return { ...current, pointsDelta: delta, isUnderdog };
}

export interface PendingPvpNotice {
  winner: "player" | "opponent";
  opponentUsername: string;
  opponentAvatarId?: string;
  bet: number;
  isForfeit: boolean;
  isEarlyForfeit: boolean;
  reason?: string;
  timestamp: number;
}

export function savePendingPvpNotice(notice: PendingPvpNotice, userId?: string) {
  if (typeof window === "undefined") return;
  const key = `wuwa_pending_pvp_notice_${userId || "guest"}`;
  try {
    localStorage.setItem(key, JSON.stringify(notice));
  } catch {}
}

export function getPendingPvpNotice(userId?: string): PendingPvpNotice | null {
  if (typeof window === "undefined") return null;
  const key = `wuwa_pending_pvp_notice_${userId || "guest"}`;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingPvpNotice(userId?: string) {
  if (typeof window === "undefined") return;
  const key = `wuwa_pending_pvp_notice_${userId || "guest"}`;
  try {
    localStorage.removeItem(key);
  } catch {}
}
