// Pure Client-Side Gacha Simulation Engine for Wuthering Waves
// Runs 100% in the browser with localStorage persistence, instant zero-latency rolls,
// authentic 50/50 soft/hard pity math, and offline capability.

import {
  RESONATORS,
  WEAPONS,
  LIMITED_BANNER_PRESETS,
  ItemData,
  ItemRarity,
} from "@/lib/data/items";
import { getHourlyRotatedCharacters } from "@/lib/gacha/bannerRotation";

export interface ClientRollResultItem {
  item: ItemData;
  rarity: ItemRarity;
  pityAtPull: number;
  isGuaranteed: boolean;
  isNew: boolean;
  isFeaturedWon?: boolean;
}

export interface ClientConveneResponse {
  results: ClientRollResultItem[];
  highestRarity: ItemRarity;
  goldIndices: number[];
  purpleIndices: number[];
  newPity5: number;
  newPity4: number;
  guaranteedLimited: boolean;
  userState: {
    astrite: number;
    isSandbox: boolean;
  };
}

export type RollResultItem = ClientRollResultItem;
export type ConveneResponse = ClientConveneResponse;

export interface ClientHistoryItem {
  id: string;
  banner_type: string;
  banner_id: string;
  item_id: string;
  item_name: string;
  item_type: "resonator" | "weapon";
  rarity: number;
  pity_count: number;
  is_guaranteed: number;
  is_5050_win?: boolean | null;
  created_at: string;
}

export interface ClientSimState {
  astrite: number;
  isSandbox: boolean;
  selectedLimitedChar: string;
  pity: {
    character_limited: {
      pity5Star: number;
      pity4Star: number;
      guaranteedLimited: boolean;
      guaranteedFeatured4: boolean;
    };
  };
  history: ClientHistoryItem[];
  inventory: Record<string, number>;
}

// Active session context
let activeUserId: string | null = null;
let activeIsSandbox: boolean = false;

export function setClientSimContext(userId: string | null, isSandbox: boolean = false): void {
  activeUserId = userId;
  activeIsSandbox = isSandbox;
}

export function getClientSimContext(): { userId: string | null; isSandbox: boolean } {
  return { userId: activeUserId, isSandbox: activeIsSandbox };
}

export function getStorageKey(userId?: string | null, isSandbox?: boolean): string {
  const sandbox = isSandbox !== undefined ? isSandbox : activeIsSandbox;
  const uid = userId !== undefined ? userId : activeUserId;
  if (sandbox) {
    return "wuwa_convene_sandbox";
  }
  if (uid) {
    return `wuwa_convene_user_${uid}`;
  }
  return "wuwa_convene_guest";
}

function getDefaultRotatedChar(): string {
  try {
    const chars = getHourlyRotatedCharacters();
    return chars[0] || "shorekeeper";
  } catch {
    return "shorekeeper";
  }
}

const DEFAULT_STATE: ClientSimState = {
  astrite: 25600, // 160 pulls newbie starting bonus (160 * 160)
  isSandbox: false,
  selectedLimitedChar: getDefaultRotatedChar(),
  pity: {
    character_limited: {
      pity5Star: 0,
      pity4Star: 0,
      guaranteedLimited: false,
      guaranteedFeatured4: false,
    },
  },
  history: [],
  inventory: {},
};

const DEFAULT_SANDBOX_STATE: ClientSimState = {
  astrite: 999999,
  isSandbox: true,
  selectedLimitedChar: getDefaultRotatedChar(),
  pity: {
    character_limited: {
      pity5Star: 0,
      pity4Star: 0,
      guaranteedLimited: false,
      guaranteedFeatured4: false,
    },
  },
  history: [],
  inventory: {},
};

// Standard 5-star characters for 50/50 losses on Featured Banners
const STANDARD_5_STAR_RESONATORS = [
  "verina",
  "calcharo",
  "encore",
  "jianxin",
  "lingyang",
];

// All 4-star resonators
const ALL_4_STAR_RESONATORS = [
  "danjin",
  "sanhua",
  "mortefi",
  "chixia",
  "yangyang",
  "baizhi",
  "taoqi",
  "aalto",
  "yuanwu",
  "youhu",
  "lumi",
];

// Cat placeholder weapons
const ALL_4_STAR_WEAPONS = ["sleepy_cat"];
const ALL_3_STAR_WEAPONS = ["hapi_cat"];

// Random float generator [0, 1) using crypto when available
function secureRandom(): number {
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return arr[0] / (0xffffffff + 1);
  }
  return Math.random();
}

function getRandomItem<T>(arr: T[]): T {
  const idx = Math.floor(secureRandom() * arr.length);
  return arr[idx];
}

// 5-Star probability based on official Kuro Games soft/hard pity
// Base: 0.8%, Soft pity starts at 66 (+4% per pull up to 100% at pull 80)
function get5StarRate(currentPity: number): number {
  if (currentPity >= 80) return 1.0;
  if (currentPity < 66) return 0.008;
  const pullsIntoSoftPity = currentPity - 65;
  return Math.min(1.0, 0.008 + pullsIntoSoftPity * 0.04);
}

// 4-Star probability: base 6%, hard pity at 10
function get4StarRate(currentPity: number): number {
  if (currentPity >= 10) return 1.0;
  return 0.06;
}

// Storage helpers
export function loadClientState(userId?: string | null, isSandbox?: boolean): ClientSimState {
  const key = getStorageKey(userId, isSandbox);
  const sandbox = isSandbox !== undefined ? isSandbox : activeIsSandbox;
  const def = sandbox ? DEFAULT_SANDBOX_STATE : DEFAULT_STATE;

  if (typeof window === "undefined") return { ...def };
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      saveClientState(def, userId, isSandbox);
      return { ...def };
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.history) && parsed.history.length > 500) {
      parsed.history = parsed.history.slice(0, 500);
    }
    const activeHourly = getHourlyRotatedCharacters();
    let selectedLimitedChar = parsed.selectedLimitedChar;
    if (!sandbox) {
      if (!selectedLimitedChar || !activeHourly.includes(selectedLimitedChar)) {
        selectedLimitedChar = activeHourly[0] || "shorekeeper";
      }
    } else {
      if (!selectedLimitedChar) {
        selectedLimitedChar = activeHourly[0] || "shorekeeper";
      }
    }

    return {
      ...def,
      ...parsed,
      isSandbox: sandbox,
      selectedLimitedChar,
      pity: {
        character_limited: {
          ...def.pity.character_limited,
          ...(parsed.pity?.character_limited || {}),
        },
      },
    };
  } catch (e) {
    console.error("Failed to load client sim state from localStorage:", e);
    return { ...def };
  }
}

export function saveClientState(
  state: ClientSimState,
  userId?: string | null,
  isSandbox?: boolean
): void {
  if (typeof window === "undefined") return;
  const key = getStorageKey(userId, isSandbox);
  try {
    localStorage.setItem(key, JSON.stringify(state));
    // Purge legacy shared key to prevent cross-account contamination
    localStorage.removeItem("wuwa_convene_client_sim_v1");
  } catch (e) {
    console.error("Failed to save client sim state to localStorage:", e);
  }
}

// Core Convene Execution Function (Featured Resonator Banner)
export function executeClientConvene(
  bannerMode: "character_limited" = "character_limited",
  count: 1 | 10,
  selectedCharId: string,
  userId?: string | null,
  isSandbox?: boolean
): ClientConveneResponse {
  const state = loadClientState(userId, isSandbox);
  const currentChar = RESONATORS[selectedCharId] || RESONATORS["shorekeeper"];
  const currentPreset = LIMITED_BANNER_PRESETS[selectedCharId] || LIMITED_BANNER_PRESETS["shorekeeper"];

  if (currentChar?.isComingSoon || currentPreset?.isComingSoon || currentChar?.isUnavailable || currentPreset?.isUnavailable) {
    throw new Error(currentChar?.isUnavailable ? "This banner is currently unavailable!" : "This character is yet to come!");
  }

  const costPerPull = 160;
  const totalCost = count * costPerPull;

  if (!state.isSandbox && state.astrite < totalCost) {
    throw new Error("Insufficient Astrite for convene");
  }

  if (!state.isSandbox) {
    state.astrite -= totalCost;
  }

  // Active pity bucket (Character Limited)
  const pityBucket = state.pity.character_limited || {
    pity5Star: 0,
    pity4Star: 0,
    guaranteedLimited: false,
    guaranteedFeatured4: false,
  };

  let pity5 = pityBucket.pity5Star;
  let pity4 = pityBucket.pity4Star;
  let guaranteedLimited = Boolean(pityBucket.guaranteedLimited);
  let guaranteedFeatured4 = Boolean(pityBucket.guaranteedFeatured4);

  const results: ClientRollResultItem[] = [];
  const goldIndices: number[] = [];
  const purpleIndices: number[] = [];

  const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);

  for (let i = 0; i < count; i++) {
    pity5++;
    pity4++;

    const p5Rate = get5StarRate(pity5);
    const roll5 = secureRandom();

    let pulledItem: ItemData;
    let rarity: ItemRarity;
    let isGuaranteedRoll = false;
    let is5050Win: boolean | null = null;

    if (roll5 < p5Rate) {
      // 5-STAR (Featured Resonator or Standard Resonator 50/50 loss)
      rarity = 5;
      goldIndices.push(i);

      if (guaranteedLimited) {
        pulledItem = currentChar;
        isGuaranteedRoll = true;
        guaranteedLimited = false;
        is5050Win = null; // Guaranteed pull from prior loss
      } else if (secureRandom() < 0.5) {
        pulledItem = currentChar;
        isGuaranteedRoll = false;
        guaranteedLimited = false;
        is5050Win = true; // Won 50/50
      } else {
        // Lost 50/50 to standard resonator
        const stdId = getRandomItem(STANDARD_5_STAR_RESONATORS);
        pulledItem = RESONATORS[stdId] || RESONATORS["verina"];
        isGuaranteedRoll = false;
        guaranteedLimited = true;
        is5050Win = false; // Lost 50/50
      }

      const pullAtPity = pity5;
      pity5 = 0;

      const currentInv = state.inventory[pulledItem.id] || 0;
      const isNew = currentInv === 0;
      state.inventory[pulledItem.id] = currentInv + 1;

      results.push({
        item: pulledItem,
        rarity: 5,
        pityAtPull: pullAtPity,
        isGuaranteed: isGuaranteedRoll,
        isNew,
        isFeaturedWon: pulledItem.id === currentChar.id,
      });

      // Add to history
      state.history.unshift({
        id: `h_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
        banner_type: "character_limited",
        banner_id: selectedCharId,
        item_id: pulledItem.id,
        item_name: pulledItem.name,
        item_type: pulledItem.type,
        rarity: 5,
        pity_count: pullAtPity,
        is_guaranteed: isGuaranteedRoll ? 1 : 0,
        is_5050_win: is5050Win,
        created_at: nowStr,
      });
    } else {
      const p4Rate = get4StarRate(pity4);
      const roll4 = secureRandom();

      if (roll4 < p4Rate) {
        // 4-STAR (Featured 4★ Resonator or Standard 4★ / Sleepy Cat placeholder)
        rarity = 4;
        purpleIndices.push(i);

        if (guaranteedFeatured4 || secureRandom() < 0.5) {
          const featList = currentPreset.featured4StarIds && currentPreset.featured4StarIds.length > 0
            ? currentPreset.featured4StarIds
            : ["danjin", "chixia", "sanhua"];
          const chosen = getRandomItem(featList);
          pulledItem = RESONATORS[chosen] || RESONATORS["danjin"];
          isGuaranteedRoll = guaranteedFeatured4;
          guaranteedFeatured4 = false;
        } else {
          const isCat = secureRandom() < 0.5;
          if (isCat) {
            pulledItem = WEAPONS["sleepy_cat"] || {
              id: "sleepy_cat",
              name: "Sleepy Cat",
              title: "Sleepy Cat",
              rarity: 4,
              type: "weapon",
              weaponType: "Sword",
              portraitUrl: "/assets/4starcat.png",
              splashUrl: "/assets/4starcat.png",
              stillUrl: "/assets/4starcat.png",
              drawUrl: "/assets/4starcat.png",
            };
          } else {
            const rId = getRandomItem(ALL_4_STAR_RESONATORS) || "danjin";
            pulledItem = RESONATORS[rId];
          }
          guaranteedFeatured4 = true;
        }

        const pullAtPity = pity4;
        pity4 = 0;

        const currentInv = state.inventory[pulledItem.id] || 0;
        const isNew = currentInv === 0;
        state.inventory[pulledItem.id] = currentInv + 1;

        results.push({
          item: pulledItem,
          rarity: 4,
          pityAtPull: pullAtPity,
          isGuaranteed: isGuaranteedRoll,
          isNew,
          isFeaturedWon: false,
        });

        state.history.unshift({
          id: `h_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
          banner_type: "character_limited",
          banner_id: selectedCharId,
          item_id: pulledItem.id,
          item_name: pulledItem.name,
          item_type: pulledItem.type,
          rarity: 4,
          pity_count: pullAtPity,
          is_guaranteed: isGuaranteedRoll ? 1 : 0,
          created_at: nowStr,
        });
      } else {
        // 3-STAR (Hapi Cat placeholder)
        rarity = 3;
        pulledItem = WEAPONS["hapi_cat"] || {
          id: "hapi_cat",
          name: "Hapi Cat",
          title: "Hapi Cat",
          rarity: 3,
          type: "weapon",
          weaponType: "Sword",
          portraitUrl: "/assets/3starcat.png",
          splashUrl: "/assets/3starcat.png",
          stillUrl: "/assets/3starcat.png",
          drawUrl: "/assets/3starcat.png",
        };

        const currentInv = state.inventory[pulledItem.id] || 0;
        const isNew = currentInv === 0;
        state.inventory[pulledItem.id] = currentInv + 1;

        results.push({
          item: pulledItem,
          rarity: 3,
          pityAtPull: pity4,
          isGuaranteed: false,
          isNew,
          isFeaturedWon: false,
        });

        // Record 3-star pull to history so ALL pulls are logged
        state.history.unshift({
          id: `h_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
          banner_type: "character_limited",
          banner_id: selectedCharId,
          item_id: pulledItem.id,
          item_name: pulledItem.name,
          item_type: pulledItem.type,
          rarity: 3,
          pity_count: pity5,
          is_guaranteed: 0,
          is_5050_win: null,
          created_at: nowStr,
        });
      }
    }
  }

  // Update bucket back to state
  pityBucket.pity5Star = pity5;
  pityBucket.pity4Star = pity4;
  pityBucket.guaranteedLimited = guaranteedLimited;
  pityBucket.guaranteedFeatured4 = guaranteedFeatured4;
  state.pity.character_limited = pityBucket;

  // Prevent unbounded growth of localStorage by capping pull history to the most recent 500 entries
  if (state.history.length > 500) {
    state.history = state.history.slice(0, 500);
  }

  // Persist updated state
  saveClientState(state, userId, isSandbox);

  const highestRarity: ItemRarity = goldIndices.length > 0 ? 5 : purpleIndices.length > 0 ? 4 : 3;

  return {
    results,
    highestRarity,
    goldIndices,
    purpleIndices,
    newPity5: pity5,
    newPity4: pity4,
    guaranteedLimited,
    userState: {
      astrite: state.astrite,
      isSandbox: state.isSandbox,
    },
  };
}

// Client helper functions for UI
export function getClientStateData(userId?: string | null, isSandbox?: boolean) {
  const s = loadClientState(userId, isSandbox);
  return {
    user: {
      id: s.isSandbox ? "sandbox_user" : (userId || activeUserId || "client_user"),
      astrite: s.astrite,
      isSandbox: s.isSandbox,
      selectedLimitedChar: s.selectedLimitedChar,
    },
    pity: s.pity,
  };
}

export function applyCloudProfileToClientState(
  profile: {
    astrite: number;
    pity_5star: number;
    pity_4star: number;
    guaranteed_limited: boolean;
    guaranteed_featured_4?: boolean;
    selected_char_id?: string;
    total_pulls?: number;
  },
  userId?: string
): ClientSimState {
  const targetUserId = userId || activeUserId;
  const s = loadClientState(targetUserId, false);

  // Cloud database is the absolute source of truth for pity and balances
  s.astrite = Math.max(0, profile.astrite);
  s.pity.character_limited.pity5Star = Math.min(80, Math.max(0, profile.pity_5star ?? 0));
  s.pity.character_limited.pity4Star = Math.min(10, Math.max(0, profile.pity_4star ?? 0));
  s.pity.character_limited.guaranteedLimited = Boolean(profile.guaranteed_limited);
  if (profile.guaranteed_featured_4 !== undefined) {
    s.pity.character_limited.guaranteedFeatured4 = Boolean(profile.guaranteed_featured_4);
  }

  if (profile.selected_char_id) {
    const activeHourly = getHourlyRotatedCharacters();
    s.selectedLimitedChar = activeHourly.includes(profile.selected_char_id)
      ? profile.selected_char_id
      : activeHourly[0] || profile.selected_char_id;
  }
  saveClientState(s, targetUserId, false);
  return s;
}

export function updateClientCurrency(
  currency: string,
  newAmount: number,
  userId?: string | null,
  isSandbox?: boolean
) {
  const s = loadClientState(userId, isSandbox);
  if (currency === "astrite") {
    s.astrite = Math.max(0, newAmount);
  }
  saveClientState(s, userId, isSandbox);
  return s;
}

export function grantClientCurrency(
  addAstrite: number,
  userId?: string | null,
  isSandbox?: boolean
) {
  const s = loadClientState(userId, isSandbox);
  s.astrite = Math.max(0, (s.astrite || 0) + addAstrite);
  saveClientState(s, userId, isSandbox);
  return s;
}

export function toggleClientSandbox(enabled: boolean) {
  if (enabled) {
    setClientSimContext(null, true);
    const s = loadClientState(null, true);
    s.isSandbox = true;
    saveClientState(s, null, true);
    return s;
  } else {
    setClientSimContext(activeUserId, false);
    const s = loadClientState(activeUserId, false);
    s.isSandbox = false;
    saveClientState(s, activeUserId, false);
    return s;
  }
}

export function setClientSelectedChar(
  charId: string,
  userId?: string | null,
  isSandbox?: boolean
) {
  const s = loadClientState(userId, isSandbox);
  s.selectedLimitedChar = charId;
  saveClientState(s, userId, isSandbox);
}

export function resetClientSimState(userId?: string | null, isSandbox?: boolean) {
  const sandbox = isSandbox !== undefined ? isSandbox : activeIsSandbox;
  const def = sandbox ? DEFAULT_SANDBOX_STATE : DEFAULT_STATE;
  saveClientState(def, userId, sandbox);
  return def;
}

export function getClientHistory(
  page: number = 1,
  limit: number = 5,
  userId?: string | null,
  isSandbox?: boolean
) {
  const s = loadClientState(userId, isSandbox);
  const total = s.history.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const validPage = Math.min(Math.max(1, page), totalPages);
  const offset = (validPage - 1) * limit;
  const logs = s.history.slice(offset, offset + limit);
  return { logs, total, totalPages, page: validPage };
}

export function get5StarHistory(userId?: string | null, isSandbox?: boolean): ClientHistoryItem[] {
  const s = loadClientState(userId, isSandbox);
  return s.history.filter((item) => item.rarity === 5);
}

export interface WinRateStats {
  total5050: number;
  wins5050: number;
  losses5050: number;
  winRate: number | null;
  winRateFormatted: string;
  total5Stars: number;
  avgPity5Star: number;
}

export function get5050Stats(userId?: string | null, isSandbox?: boolean): WinRateStats {
  const s = loadClientState(userId, isSandbox);
  const fiveStars = s.history.filter((item) => item.rarity === 5);
  let total5050 = 0;
  let wins5050 = 0;
  let losses5050 = 0;
  let totalPitySum = 0;

  fiveStars.forEach((item) => {
    totalPitySum += item.pity_count;
    if (item.banner_type === "character_limited") {
      if (item.is_5050_win === true) {
        wins5050++;
        total5050++;
      } else if (item.is_5050_win === false) {
        losses5050++;
        total5050++;
      } else if (item.is_guaranteed === 0) {
        // Fallback detection for records created before is_5050_win flag
        const isStandard = STANDARD_5_STAR_RESONATORS.includes(item.item_id);
        if (isStandard) {
          losses5050++;
          total5050++;
        } else {
          wins5050++;
          total5050++;
        }
      }
    }
  });

  const winRate = total5050 > 0 ? (wins5050 / total5050) * 100 : null;
  const avgPity = fiveStars.length > 0 ? Math.round((totalPitySum / fiveStars.length) * 10) / 10 : 0;

  return {
    total5050,
    wins5050,
    losses5050,
    winRate,
    winRateFormatted: winRate !== null ? `${winRate.toFixed(1)}%` : "N/A",
    total5Stars: fiveStars.length,
    avgPity5Star: avgPity,
  };
}

export function getTotalPullsCount(userId?: string | null, isSandbox?: boolean): number {
  if (typeof window === "undefined") return 0;
  const s = loadClientState(userId, isSandbox);
  return s.history ? s.history.length : 0;
}
