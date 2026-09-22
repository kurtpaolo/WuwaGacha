import { BattleTrainer, TowerBlessing, TowerRunState } from "./types";
import { createBattleResonator } from "./resonatorMoves";
import { saveUserTowerState } from "@/lib/supabase/profile";

export type { TowerBlessing, TowerRunState } from "./types";

export interface TowerFloorInfo {
  floor: number;
  name: string;
  subtitle: string;
  recommendedLevel: number;
  enemyTeamIds: string[];
  bossCharId: string;
  astriteReward: number;
  combatExpReward: number;
  isBossFloor: boolean;
  dodgeRate?: number;
}

/**
 * Level scaling: increases by +5 levels per floor until hard-capped at Lv. 100.
 * Floor 1: Lv. 40
 * Floor 2: Lv. 45
 * Floor 3: Lv. 50
 * ...
 * Floor 13: Lv. 100
 * Floor 14+: Lv. 100 (Capped)
 */
export function getTowerFloorLevel(floorNumber: number): number {
  return Math.min(100, 40 + Math.max(0, floorNumber - 1) * 5);
}

/**
 * Dodge Rate scaling: enemies become increasingly evasive and annoying on higher floors.
 * Floors 1–5: 0%
 * Floors 6–10: 5%–10%
 * Floors 11–13: 12%–15%
 * Floors 14+ (past Lv. 100 cap): +1.5% per floor up to 40% (45% for Bosses).
 */
export function getTowerFloorDodgeRate(floorNumber: number, isBoss: boolean = false): number {
  let dodge = 0;
  if (floorNumber <= 5) {
    dodge = 0;
  } else if (floorNumber <= 13) {
    dodge = Math.round((floorNumber - 5) * 1.8); // 2% to 15%
  } else {
    dodge = 15 + Math.min(25, Math.round((floorNumber - 13) * 1.5)); // 15% to 40%
  }
  if (isBoss) dodge += 5;
  return Math.min(45, dodge);
}

// Handcrafted baseline for Floors 1–10 (Strictly 5-Star Limited Resonators with authentic pixel sprites)
export const TOWER_FLOORS: TowerFloorInfo[] = [
  {
    floor: 1,
    name: "Floor 1: Echoing Threshold",
    subtitle: "Aero Bard Trial",
    recommendedLevel: 40,
    enemyTeamIds: ["qiuyuan", "jiyan", "ciaccona"],
    bossCharId: "ciaccona",
    astriteReward: 60,
    combatExpReward: 120,
    isBossFloor: false,
    dodgeRate: 0,
  },
  {
    floor: 2,
    name: "Floor 2: Glacial Crevasse",
    subtitle: "Frostbite Test",
    recommendedLevel: 45,
    enemyTeamIds: ["mornye", "carlotta", "sigrika"],
    bossCharId: "sigrika",
    astriteReward: 70,
    combatExpReward: 160,
    isBossFloor: false,
    dodgeRate: 0,
  },
  {
    floor: 3,
    name: "Floor 3: Thunderous Ridge",
    subtitle: "Electro Surge",
    recommendedLevel: 50,
    enemyTeamIds: ["jingran", "xiangli_yao", "yinlin"],
    bossCharId: "yinlin",
    astriteReward: 80,
    combatExpReward: 200,
    isBossFloor: false,
    dodgeRate: 0,
  },
  {
    floor: 4,
    name: "Floor 4: Scorched Basin",
    subtitle: "Infernal Crucible",
    recommendedLevel: 55,
    enemyTeamIds: ["brant", "lupa", "changli"],
    bossCharId: "changli",
    astriteReward: 90,
    combatExpReward: 250,
    isBossFloor: false,
    dodgeRate: 0,
  },
  {
    floor: 5,
    name: "Floor 5: Mid-Tower Sanctuary",
    subtitle: "Abyssal Gatekeeper [BOSS]",
    recommendedLevel: 60,
    enemyTeamIds: ["roccia", "chisa", "phrolova"],
    bossCharId: "phrolova",
    astriteReward: 150,
    combatExpReward: 400,
    isBossFloor: true,
    dodgeRate: 5,
  },
  {
    floor: 6,
    name: "Floor 6: Windswept Spire",
    subtitle: "Aero Tempest",
    recommendedLevel: 65,
    enemyTeamIds: ["yangyang_xuanling", "jiyan"],
    bossCharId: "jiyan",
    astriteReward: 110,
    combatExpReward: 320,
    isBossFloor: false,
    dodgeRate: 5,
  },
  {
    floor: 7,
    name: "Floor 7: Stellar Sanctum",
    subtitle: "Spectro Radiance",
    recommendedLevel: 70,
    enemyTeamIds: ["phoebe", "augusta"],
    bossCharId: "augusta",
    astriteReward: 120,
    combatExpReward: 380,
    isBossFloor: false,
    dodgeRate: 7,
  },
  {
    floor: 8,
    name: "Floor 8: Shadow Hollow",
    subtitle: "Havoc Infiltration",
    recommendedLevel: 75,
    enemyTeamIds: ["rebecca", "camellya"],
    bossCharId: "camellya",
    astriteReward: 130,
    combatExpReward: 450,
    isBossFloor: false,
    dodgeRate: 9,
  },
  {
    floor: 9,
    name: "Floor 9: Penultimate Vanguard",
    subtitle: "Champion Gatekeepers",
    recommendedLevel: 80,
    enemyTeamIds: ["luuk_herssen", "xiangli_yao"],
    bossCharId: "xiangli_yao",
    astriteReward: 140,
    combatExpReward: 520,
    isBossFloor: false,
    dodgeRate: 11,
  },
  {
    floor: 10,
    name: "Floor 10: Apex Pinnacle",
    subtitle: "Sovereign of Light [BOSS]",
    recommendedLevel: 85,
    enemyTeamIds: ["shorekeeper", "jinhsi", "carlotta"],
    bossCharId: "jinhsi",
    astriteReward: 200,
    combatExpReward: 650,
    isBossFloor: true,
    dodgeRate: 14,
  },
];

const THEMED_SQUADS = [
  { name: "Glacial Tempest", subtitle: "Cryo Sovereign", boss: "carlotta", team: ["mornye", "sigrika", "carlotta"] },
  { name: "Infernal Crucible", subtitle: "Scorching Vanguard", boss: "changli", team: ["brant", "aemeath", "changli"] },
  { name: "Thunderous Overdrive", subtitle: "Volt Apex", boss: "yinlin", team: ["jingran", "luuk_herssen", "yinlin"] },
  { name: "Gale Vortex", subtitle: "Aero Champion", boss: "jiyan", team: ["qiuyuan", "yangyang_xuanling", "jiyan"] },
  { name: "Abyssal Shadow", subtitle: "Havoc Eclipse", boss: "camellya", team: ["chisa", "roccia", "camellya"] },
  { name: "Astral Radiance", subtitle: "Spectro Divinity", boss: "shorekeeper", team: ["phoebe", "augusta", "shorekeeper"] },
  { name: "Chronos Pinnacle", subtitle: "Apex Matrix", boss: "xiangli_yao", team: ["iuno", "carlotta", "xiangli_yao"] },
  { name: "Solaris Chimera", subtitle: "Apex Sovereign", boss: "jinhsi", team: ["changli", "camellya", "jinhsi"] },
];

/**
 * Get dynamic or handcrafted info for ANY floor number (infinite).
 */
export function getTowerFloorInfo(floorNumber: number): TowerFloorInfo {
  if (floorNumber >= 1 && floorNumber <= 10) {
    return TOWER_FLOORS[floorNumber - 1];
  }

  const isBossFloor = floorNumber % 5 === 0;
  const squad = THEMED_SQUADS[(floorNumber - 11) % THEMED_SQUADS.length];
  const level = getTowerFloorLevel(floorNumber);
  const dodgeRate = getTowerFloorDodgeRate(floorNumber, isBossFloor);

  return {
    floor: floorNumber,
    name: isBossFloor ? `Floor ${floorNumber}: ${squad.name} [BOSS]` : `Floor ${floorNumber}: ${squad.name}`,
    subtitle: isBossFloor ? `${squad.subtitle} (Apex Encounter)` : squad.subtitle,
    recommendedLevel: level,
    enemyTeamIds: isBossFloor ? squad.team : squad.team.slice(0, 3),
    bossCharId: squad.boss,
    astriteReward: isBossFloor
      ? 150 + Math.min(200, Math.floor(floorNumber / 5) * 10)
      : 80 + Math.min(120, Math.floor(floorNumber / 2) * 3),
    combatExpReward: 200 + Math.min(600, floorNumber * 25),
    isBossFloor,
    dodgeRate,
  };
}

/**
 * Get the floors belonging to a specific page block (default 5 floors per page).
 * Page 0 -> Floors 1 to 5
 * Page 1 -> Floors 6 to 10
 * Page 2 -> Floors 11 to 15, etc.
 */
export function getTowerFloorsForPage(pageBlock: number, pageSize = 5): TowerFloorInfo[] {
  const safePage = Math.max(0, pageBlock);
  const start = safePage * pageSize + 1;
  const floors: TowerFloorInfo[] = [];
  for (let f = start; f < start + pageSize; f++) {
    floors.push(getTowerFloorInfo(f));
  }
  return floors;
}

export const BLESSING_POOL: TowerBlessing[] = [
  // Damage Boosts (scaled down 25x)
  {
    id: "blessing_dmg_04",
    name: "Damage +0.4%",
    description: "+0.4% damage dealt by all party members.",
    rarity: "common",
    effectType: "damage",
    value: 0.4,
  },
  {
    id: "blessing_dmg_06",
    name: "Damage +0.6%",
    description: "+0.6% damage dealt by all party members.",
    rarity: "rare",
    effectType: "damage",
    value: 0.6,
  },
  {
    id: "blessing_dmg_08",
    name: "Damage +0.8%",
    description: "+0.8% damage dealt by all party members.",
    rarity: "epic",
    effectType: "damage",
    value: 0.8,
  },
  {
    id: "blessing_dmg_12",
    name: "Damage +1.2%",
    description: "+1.2% damage dealt by all party members.",
    rarity: "legendary",
    effectType: "damage",
    value: 1.2,
  },

  // Heal Restorations (scaled down 25x)
  {
    id: "blessing_heal_06",
    name: "Heal +0.6%",
    description: "Instantly restores 0.6% Max HP to all party members.",
    rarity: "common",
    effectType: "heal",
    value: 0.6,
  },
  {
    id: "blessing_heal_10",
    name: "Heal +1%",
    description: "Instantly restores 1% Max HP to all party members.",
    rarity: "rare",
    effectType: "heal",
    value: 1,
  },
  {
    id: "blessing_heal_14",
    name: "Heal +1.4%",
    description: "Instantly restores 1.4% Max HP to all party members.",
    rarity: "epic",
    effectType: "heal",
    value: 1.4,
  },
  {
    id: "blessing_heal_20",
    name: "Heal +2%",
    description: "Instantly restores 2% Max HP to all party members.",
    rarity: "legendary",
    effectType: "heal",
    value: 2,
  },

  // Barrier Shields (scaled down 25x)
  {
    id: "blessing_barrier_04",
    name: "Barrier +0.4%",
    description: "Frontline resonators begin battle with +0.4% Max HP barrier.",
    rarity: "common",
    effectType: "barrier",
    value: 0.4,
  },
  {
    id: "blessing_barrier_06",
    name: "Barrier +0.6%",
    description: "Frontline resonators begin battle with +0.6% Max HP barrier.",
    rarity: "rare",
    effectType: "barrier",
    value: 0.6,
  },
  {
    id: "blessing_barrier_08",
    name: "Barrier +0.8%",
    description: "Frontline resonators begin battle with +0.8% Max HP barrier.",
    rarity: "epic",
    effectType: "barrier",
    value: 0.8,
  },
  {
    id: "blessing_barrier_12",
    name: "Barrier +1.2%",
    description: "Frontline resonators begin battle with +1.2% Max HP barrier.",
    rarity: "legendary",
    effectType: "barrier",
    value: 1.2,
  },

  // Damage Reduction (scaled down 25x)
  {
    id: "blessing_reduc_04",
    name: "Damage Reduction +0.4%",
    description: "Reduces all incoming damage taken by 0.4%.",
    rarity: "common",
    effectType: "damage_reduction",
    value: 0.4,
  },
  {
    id: "blessing_reduc_06",
    name: "Damage Reduction +0.6%",
    description: "Reduces all incoming damage taken by 0.6%.",
    rarity: "rare",
    effectType: "damage_reduction",
    value: 0.6,
  },
  {
    id: "blessing_reduc_08",
    name: "Damage Reduction +0.8%",
    description: "Reduces all incoming damage taken by 0.8%.",
    rarity: "epic",
    effectType: "damage_reduction",
    value: 0.8,
  },
  {
    id: "blessing_reduc_10",
    name: "Damage Reduction +1%",
    description: "Reduces all incoming damage taken by 1%.",
    rarity: "legendary",
    effectType: "damage_reduction",
    value: 1,
  },

  // Crit Rate Boosts (scaled down 25x: 1% for legendary)
  {
    id: "blessing_crit_04",
    name: "Crit Rate +0.4%",
    description: "Increases Critical Hit Rate by +0.4%.",
    rarity: "rare",
    effectType: "crit",
    value: 0.4,
  },
  {
    id: "blessing_crit_06",
    name: "Crit Rate +0.6%",
    description: "Increases Critical Hit Rate by +0.6%.",
    rarity: "epic",
    effectType: "crit",
    value: 0.6,
  },
  {
    id: "blessing_crit_10",
    name: "Crit Rate +1%",
    description: "Increases Critical Hit Rate by +1%.",
    rarity: "legendary",
    effectType: "crit",
    value: 1,
  },

  // Energy Acceleration (scaled down 25x)
  {
    id: "blessing_energy_06",
    name: "Energy +0.6%",
    description: "Gain +0.6% more Resonance Energy from all actions.",
    rarity: "rare",
    effectType: "energy",
    value: 0.6,
  },
  {
    id: "blessing_energy_10",
    name: "Energy +1%",
    description: "Gain +1% more Resonance Energy from all actions.",
    rarity: "epic",
    effectType: "energy",
    value: 1,
  },
  {
    id: "blessing_energy_14",
    name: "Energy +1.4%",
    description: "Gain +1.4% more Resonance Energy from all actions.",
    rarity: "legendary",
    effectType: "energy",
    value: 1.4,
  },

  // Speed Boosts (scaled down 25x)
  {
    id: "blessing_speed_04",
    name: "Speed +0.4%",
    description: "Increases Speed of all party members by +0.4%.",
    rarity: "rare",
    effectType: "speed",
    value: 0.4,
  },
  {
    id: "blessing_speed_06",
    name: "Speed +0.6%",
    description: "Increases Speed of all party members by +0.6%.",
    rarity: "epic",
    effectType: "speed",
    value: 0.6,
  },
  {
    id: "blessing_speed_10",
    name: "Speed +1%",
    description: "Increases Speed of all party members by +1%.",
    rarity: "legendary",
    effectType: "speed",
    value: 1,
  },
];

export const MYTHIC_REVIVE_BLESSING: TowerBlessing = {
  id: "bless_revive_mythic",
  name: "Revive",
  description: "Revive 1 fallen ally with 70% Max HP.",
  rarity: "mythic",
  effectType: "revive",
  value: 70,
};

export interface BlessingDraftContext {
  clearedFloor?: number;
  hasFaintedResonators?: boolean;
}

/**
 * Generate 3 random, distinct blessings for draft selection.
 * Every 5 floors (Floor 5, 10, 15, etc.), if there are fainted resonators,
 * there is a 50/50% chance to offer the Mythic "Revive" blessing.
 */
export function generateBlessingDraft(
  activeBlessingIds: string[],
  count = 3,
  context?: BlessingDraftContext
): TowerBlessing[] {
  const canOfferRevive = Boolean(
    context?.clearedFloor &&
    context.clearedFloor > 0 &&
    context.clearedFloor % 5 === 0 &&
    context.hasFaintedResonators &&
    Math.random() < 0.5
  );

  const available = BLESSING_POOL.filter((b) => !activeBlessingIds.includes(b.id));
  const pool = available.length >= count ? available : BLESSING_POOL;
  const shuffled = [...pool].sort(() => 0.5 - Math.random());

  if (canOfferRevive) {
    const regularPicks = shuffled.slice(0, count - 1);
    const combined = [MYTHIC_REVIVE_BLESSING, ...regularPicks];
    return combined.sort(() => 0.5 - Math.random());
  }

  return shuffled.slice(0, count);
}

/**
 * Storage helpers for Tower of Adversity run state with Supabase cloud persistence.
 */
export function getTowerRunState(userId?: string): TowerRunState {
  if (typeof window === "undefined") {
    return {
      currentFloor: 1,
      activeBlessings: [],
      partyHpMap: {},
      isCompleted: false,
      highestFloorCleared: 0,
      allTimeRecordFloor: 0,
      lockedPartyIds: undefined,
      isWipedOut: false,
    };
  }

  const key = `wuwa_tower_state_${userId || "guest"}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      const parsedHighest = parsed.highestFloorCleared || 0;
      const allTime = typeof parsed.allTimeRecordFloor === "number"
        ? parsed.allTimeRecordFloor
        : parsedHighest;

      return {
        currentFloor: parsed.currentFloor || 1,
        activeBlessings: parsed.activeBlessings || [],
        partyHpMap: parsed.partyHpMap || {},
        isCompleted: Boolean(parsed.isCompleted),
        highestFloorCleared: parsedHighest,
        allTimeRecordFloor: allTime,
        lockedPartyIds: parsed.lockedPartyIds,
        isWipedOut: Boolean(parsed.isWipedOut),
      };
    }
  } catch {}

  return {
    currentFloor: 1,
    activeBlessings: [],
    partyHpMap: {},
    isCompleted: false,
    highestFloorCleared: 0,
    allTimeRecordFloor: 0,
    lockedPartyIds: undefined,
    isWipedOut: false,
  };
}

export function saveTowerRunState(state: TowerRunState, userId?: string): void {
  if (typeof window === "undefined") return;
  const key = `wuwa_tower_state_${userId || "guest"}`;
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {}

  // Asynchronously persist to Supabase cloud if logged in
  if (userId && userId !== "guest" && userId !== "guest_player") {
    saveUserTowerState(userId, state).catch(() => {});
  }
}

export function resetTowerRunState(userId?: string): TowerRunState {
  const prev = getTowerRunState(userId);
  const bestRecord = Math.max(prev.allTimeRecordFloor || 0, prev.highestFloorCleared || 0);
  const fresh: TowerRunState = {
    currentFloor: 1,
    activeBlessings: [],
    partyHpMap: {},
    isCompleted: false,
    highestFloorCleared: 0, // Reset active run cleared count so Floor 1 is the fresh active challenge!
    allTimeRecordFloor: bestRecord, // Preserve lifetime high score record!
    lockedPartyIds: undefined, // Free squad lock so user can edit team if desired
    isWipedOut: false,
  };
  saveTowerRunState(fresh, userId);
  return fresh;
}

/**
 * Create opponent trainer for a specific Tower Floor with dynamic scaling.
 */
export function createTowerFloorTrainer(floorNumber: number): BattleTrainer {
  const floorInfo = getTowerFloorInfo(floorNumber);
  const dodgeRate = floorInfo.dodgeRate || 0;

  const team = floorInfo.enemyTeamIds.map((charId) => {
    const isApex = floorInfo.isBossFloor && charId === floorInfo.bossCharId;
    const resonator = createBattleResonator(charId, floorInfo.recommendedLevel, isApex ? 6 : 2);

    // Apply scaling dodge rate to the enemy resonator
    resonator.dodgeRate = dodgeRate;

    // Give Bosses extra HP and Overdrive eligibility
    if (isApex) {
      resonator.maxHp = Math.round(resonator.maxHp * 1.5);
      resonator.hp = resonator.maxHp;
    }
    return resonator;
  });

  return {
    id: `tower_floor_${floorNumber}`,
    username: floorInfo.name,
    avatarId: floorInfo.bossCharId,
    customTitle: floorInfo.subtitle,
    team,
    activeIdx: 0,
    activeIndices: [0, 1, 2].slice(0, team.length),
    isAi: true,
  };
}
