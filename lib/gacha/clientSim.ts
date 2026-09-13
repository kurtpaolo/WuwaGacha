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

export interface ClientRollResultItem {
  item: ItemData;
  rarity: ItemRarity;
  pityAtPull: number;
  isGuaranteed: boolean;
  isNew: boolean;
  afterglowCoralAwarded: number;
  oscillatedCoralAwarded: number;
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
    radiantTide: number;
    forgingTide: number;
    lustrousTide: number;
    afterglowCoral: number;
    oscillatedCoral: number;
    isSandbox: boolean;
  };
}

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
  created_at: string;
}

export interface ClientSimState {
  astrite: number;
  radiantTide: number;
  forgingTide: number;
  lustrousTide: number;
  afterglowCoral: number;
  oscillatedCoral: number;
  isSandbox: boolean;
  selectedLimitedChar: string;
  pity: {
    character_limited: {
      pity5Star: number;
      pity4Star: number;
      guaranteedLimited: boolean;
      guaranteedFeatured4: boolean;
    };
    weapon_limited: {
      pity5Star: number;
      pity4Star: number;
      guaranteedLimited: boolean;
      guaranteedFeatured4: boolean;
    };
    character_standard: {
      pity5Star: number;
      pity4Star: number;
      guaranteedLimited: boolean;
      guaranteedFeatured4: boolean;
    };
  };
  history: ClientHistoryItem[];
  inventory: Record<string, number>;
}

const STORAGE_KEY = "wuwa_convene_client_sim_v1";

const DEFAULT_STATE: ClientSimState = {
  astrite: 160000,
  radiantTide: 0,
  forgingTide: 0,
  lustrousTide: 0,
  afterglowCoral: 0,
  oscillatedCoral: 0,
  isSandbox: false,
  selectedLimitedChar: "shorekeeper",
  pity: {
    character_limited: {
      pity5Star: 0,
      pity4Star: 0,
      guaranteedLimited: false,
      guaranteedFeatured4: false,
    },
    weapon_limited: {
      pity5Star: 0,
      pity4Star: 0,
      guaranteedLimited: false,
      guaranteedFeatured4: false,
    },
    character_standard: {
      pity5Star: 0,
      pity4Star: 0,
      guaranteedLimited: false,
      guaranteedFeatured4: false,
    },
  },
  history: [],
  inventory: {},
};

// Standard 5-star characters for 50/50 losses
const STANDARD_5_STAR_RESONATORS = [
  "verina",
  "calcharo",
  "encore",
  "jianxin",
  "lingyang",
];

// Standard 5-star weapons
const STANDARD_5_STAR_WEAPONS = [
  "emerald_of_genesis",
  "lustrous_razor",
  "cosmic_ripples",
  "static_mist",
  "abyss_surges",
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

// 4-star & 3-star weapons
const ALL_4_STAR_WEAPONS = Object.keys(WEAPONS).filter((id) => WEAPONS[id].rarity === 4);
const ALL_3_STAR_WEAPONS = Object.keys(WEAPONS).filter((id) => WEAPONS[id].rarity === 3);

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
export function loadClientState(): ClientSimState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveClientState(DEFAULT_STATE);
      return DEFAULT_STATE;
    }
    const parsed = JSON.parse(raw);
    const selectedLimitedChar =
      parsed.selectedLimitedChar && parsed.selectedLimitedChar !== "jiyan"
        ? parsed.selectedLimitedChar
        : "shorekeeper";

    return {
      ...DEFAULT_STATE,
      ...parsed,
      selectedLimitedChar,
      pity: {
        ...DEFAULT_STATE.pity,
        ...(parsed.pity || {}),
      },
    };
  } catch (e) {
    console.error("Failed to load client sim state from localStorage:", e);
    return DEFAULT_STATE;
  }
}

export function saveClientState(state: ClientSimState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save client sim state to localStorage:", e);
  }
}

// Core Convene Execution Function
export function executeClientConvene(
  bannerMode: "character_limited" | "weapon_limited" | "character_standard",
  count: 1 | 10,
  selectedCharId: string
): ClientConveneResponse {
  const state = loadClientState();
  const currentChar = RESONATORS[selectedCharId] || RESONATORS["shorekeeper"];
  const currentPreset = LIMITED_BANNER_PRESETS[selectedCharId] || LIMITED_BANNER_PRESETS["shorekeeper"];

  if (bannerMode === "character_limited" && (currentChar?.isComingSoon || currentPreset?.isComingSoon || currentChar?.isUnavailable || currentPreset?.isUnavailable)) {
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

  // Active pity bucket
  const pityKey = bannerMode;
  const pityBucket = state.pity[pityKey] || {
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

    if (roll5 < p5Rate) {
      // 5-STAR
      rarity = 5;
      goldIndices.push(i);

      if (bannerMode === "character_limited") {
        if (guaranteedLimited || secureRandom() < 0.5) {
          pulledItem = currentChar;
          isGuaranteedRoll = guaranteedLimited;
          guaranteedLimited = false;
        } else {
          // Lost 50/50 to standard
          const stdId = getRandomItem(STANDARD_5_STAR_RESONATORS);
          pulledItem = RESONATORS[stdId] || RESONATORS["verina"];
          guaranteedLimited = true;
        }
      } else if (bannerMode === "weapon_limited") {
        const weaponId = currentPreset?.signatureWeaponId || "blazing_brilliance";
        pulledItem = WEAPONS[weaponId] || WEAPONS["verdant_summit"];
        isGuaranteedRoll = true;
      } else {
        const stdId = getRandomItem(STANDARD_5_STAR_RESONATORS);
        pulledItem = RESONATORS[stdId] || RESONATORS["verina"];
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
        afterglowCoralAwarded: isNew ? 0 : 15,
        oscillatedCoralAwarded: 0,
      });

      // Add to history
      state.history.unshift({
        id: `h_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
        banner_type: bannerMode,
        banner_id: selectedCharId,
        item_id: pulledItem.id,
        item_name: pulledItem.name,
        item_type: pulledItem.type,
        rarity: 5,
        pity_count: pullAtPity,
        is_guaranteed: isGuaranteedRoll ? 1 : 0,
        created_at: nowStr,
      });
    } else {
      const p4Rate = get4StarRate(pity4);
      const roll4 = secureRandom();

      if (roll4 < p4Rate) {
        // 4-STAR
        rarity = 4;
        purpleIndices.push(i);

        if (bannerMode === "character_limited") {
          if (guaranteedFeatured4 || secureRandom() < 0.5) {
            const featList = currentPreset.featured4StarIds && currentPreset.featured4StarIds.length > 0
              ? currentPreset.featured4StarIds
              : ["danjin", "chixia", "sanhua"];
            const chosen = getRandomItem(featList);
            pulledItem = RESONATORS[chosen] || RESONATORS["danjin"];
            isGuaranteedRoll = guaranteedFeatured4;
            guaranteedFeatured4 = false;
          } else {
            const isWeapon = secureRandom() < 0.5;
            if (isWeapon) {
              const wId = getRandomItem(ALL_4_STAR_WEAPONS) || "commando_of_conviction";
              pulledItem = WEAPONS[wId];
            } else {
              const rId = getRandomItem(ALL_4_STAR_RESONATORS) || "danjin";
              pulledItem = RESONATORS[rId];
            }
            guaranteedFeatured4 = true;
          }
        } else {
          const isWeapon = secureRandom() < 0.5;
          if (isWeapon) {
            const wId = getRandomItem(ALL_4_STAR_WEAPONS) || "commando_of_conviction";
            pulledItem = WEAPONS[wId];
          } else {
            const rId = getRandomItem(ALL_4_STAR_RESONATORS) || "danjin";
            pulledItem = RESONATORS[rId];
          }
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
          afterglowCoralAwarded: isNew ? 0 : 3,
          oscillatedCoralAwarded: 0,
        });

        state.history.unshift({
          id: `h_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
          banner_type: bannerMode,
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
        // 3-STAR WEAPON
        rarity = 3;
        const wId = getRandomItem(ALL_3_STAR_WEAPONS) || "sword_of_night";
        pulledItem = WEAPONS[wId] || {
          id: "sword_of_night",
          name: "Hapi Cat",
          title: "Hapi Cat",
          rarity: 3,
          type: "weapon",
          weaponType: "Sword",
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
          afterglowCoralAwarded: 0,
          oscillatedCoralAwarded: 15,
        });
      }
    }
  }

  // Update bucket back to state
  pityBucket.pity5Star = pity5;
  pityBucket.pity4Star = pity4;
  pityBucket.guaranteedLimited = guaranteedLimited;
  pityBucket.guaranteedFeatured4 = guaranteedFeatured4;
  state.pity[pityKey] = pityBucket;

  // Persist updated state
  saveClientState(state);

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
      radiantTide: state.radiantTide,
      forgingTide: state.forgingTide,
      lustrousTide: state.lustrousTide,
      afterglowCoral: state.afterglowCoral,
      oscillatedCoral: state.oscillatedCoral,
      isSandbox: state.isSandbox,
    },
  };
}

// Client helper functions for UI
export function getClientStateData() {
  const s = loadClientState();
  return {
    user: {
      id: "client_user",
      astrite: s.astrite,
      radiantTide: s.radiantTide,
      forgingTide: s.forgingTide,
      lustrousTide: s.lustrousTide,
      afterglowCoral: s.afterglowCoral,
      oscillatedCoral: s.oscillatedCoral,
      isSandbox: s.isSandbox,
      selectedLimitedChar: s.selectedLimitedChar,
    },
    pity: s.pity,
  };
}

export function updateClientCurrency(currency: string, newAmount: number) {
  const s = loadClientState();
  if (currency === "astrite") {
    s.astrite = newAmount;
  }
  saveClientState(s);
  return s;
}

export function grantClientCurrency(addAstrite: number) {
  const s = loadClientState();
  s.astrite = Math.max(0, (s.astrite || 0) + addAstrite);
  saveClientState(s);
  return s;
}

export function toggleClientSandbox(enabled: boolean) {
  const s = loadClientState();
  s.isSandbox = enabled;
  saveClientState(s);
  return s;
}

export function setClientSelectedChar(charId: string) {
  const s = loadClientState();
  s.selectedLimitedChar = charId;
  saveClientState(s);
}

export function resetClientSimState() {
  saveClientState(DEFAULT_STATE);
  return DEFAULT_STATE;
}

export function getClientHistory(page: number = 1, limit: number = 5) {
  const s = loadClientState();
  const total = s.history.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const validPage = Math.min(Math.max(1, page), totalPages);
  const offset = (validPage - 1) * limit;
  const logs = s.history.slice(offset, offset + limit);
  return { logs, total, totalPages, page: validPage };
}
