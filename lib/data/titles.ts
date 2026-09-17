// Dedicated Player Title System for Wuthering Waves Gacha Simulator
// Decoupled from Avatar portraits - unlocked via milestones, 50/50 luck, Astrite spent, and Resonator ownership.

import { UserInventoryItem, MAX_WAVEBAND_COUNT } from "@/lib/supabase/inventory";
import { ClientHistoryItem } from "@/lib/gacha/clientSim";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { INVENTORY_PORTRAITS, getResonatorTitle } from "./portraits";
import { PLAYABLE_LIMITED_5STAR_IDS } from "@/lib/gacha/bannerRotation";

export type TitleCategory = "all" | "owned" | "special" | "luck" | "astrite" | "collection" | "resonator";
export type TitleRarity = "legendary" | "epic" | "rare" | "mythic";

export interface TitleContext {
  inventory: UserInventoryItem[];
  totalPulls: number;
  astriteUsed: number;
  total5StarCount: number;
  totalS6Count: number;
  s6LimitedCount: number;
  totalPlayableLimitedCount: number;
  wins5050: number;
  total5050: number;
  consecutive5050Wins: number;
  highestPity5Star: number;
  lostAny5050: boolean;
  ownedResonatorIds: Set<string>;
  claimedTitleIds?: string[];
  isVip?: boolean;
  loginStreak: number;
  maxLoginStreak: number;
}

export interface PlayerTitle {
  id: string;
  name: string;
  category: TitleCategory;
  description: string;
  rarity: TitleRarity;
  badgeColorClass: string;
  customColor?: string; // Exact hex color code for resonator or themed titles
  isUnlocked: (ctx: TitleContext) => boolean;
  getProgress?: (ctx: TitleContext) => { current: number; target: number; label: string };
}

// Strict Rarity Color Standard:
// rare = blue | epic = purple | legendary = yellow | mythic = red
export const RARITY_BADGE_CLASSES: Record<TitleRarity, string> = {
  rare: "border-blue-500/80 text-blue-300 bg-blue-500/15 shadow-[0_0_10px_rgba(59,130,246,0.25)]",
  epic: "border-purple-500/80 text-purple-300 bg-purple-500/15 shadow-[0_0_10px_rgba(168,85,247,0.25)]",
  legendary: "border-yellow-400/80 text-yellow-300 bg-yellow-500/20 shadow-[0_0_12px_rgba(250,204,21,0.3)]",
  mythic: "border-red-500/80 text-red-300 bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.35)]",
};

// Resonator Main Character Colors (Exact hex definitions provided by user)
export const RESONATOR_COLORS: Record<string, string> = {
  aalto: "#4CC9C0",
  aemeath: "#E98BB8",
  augusta: "#D99A3D",
  baizhi: "#A8D8E8",
  brant: "#B83A3A",
  buling: "#A98FD1",
  calcharo: "#3E426F",
  camellya: "#C93A4B",
  cantarella: "#D58BAA",
  carlotta: "#9CCFE8",
  cartethyia: "#E8D9A8",
  changli: "#D9573F",
  chisa: "#5B456E",
  chixia: "#F07832",
  ciaccona: "#54B9C5",
  danjin: "#A52E3D",
  denia: "#9A5BA5",
  encore: "#C43C4A",
  galbrena: "#9E303A",
  hiyuki: "#D94B61",
  hsin: "#9A5BA5",
  iuno: "#8266B5",
  jianxin: "#67A88C",
  jingran: "#E6C76A",
  jinhsi: "#E6C76A",
  jiyan: "#3E9B83",
  lingyang: "#55BBD1",
  lucilla: "#8EC7E8",
  lucy: "#D95A72",
  lumi: "#E5B94C",
  lupa: "#D85A32",
  luuk_herssen: "#58AFC7",
  lynae: "#C879B4",
  mornye: "#6576B8",
  mortefi: "#873B45",
  phoebe: "#E9DDAF",
  phrolova: "#68436F",
  qingxiao: "#6864B8",
  qiuyuan: "#4B9B8C",
  rebecca: "#D65B67",
  roccia: "#C8783E",
  sanhua: "#8CC9E5",
  shorekeeper: "#91A9D9",
  sigrika: "#6CA88E",
  suisui: "#8CC9E5",
  suoming: "#B83A3A",
  taoqi: "#76558F",
  verina: "#A6C66B",
  xiangli_yao: "#6864B8",
  yangyang: "#68B8C8",
  yangyang_xuanling: "#4B9B8C",
  yinlin: "#8A4FA3",
  youhu: "#8BC7D6",
  yuanwu: "#B58A45",
  zani: "#D99A43",
  zhezhi: "#A7C8E8",
};

// Standard 5-stars for fallback loss detection
const STANDARD_5_STAR_IDS = ["verina", "calcharo", "encore", "jianxin", "lingyang"];

// Total unique 5-star resonators available across the simulator (38 limited 5-stars)
export const TOTAL_5_STAR_RESONATORS_COUNT = 38;

/**
 * Computes 50/50 streaks and pity metrics from raw roll history.
 */
export function calculate5050Streaks(history: ClientHistoryItem[]): {
  consecutiveWins: number;
  highestPity: number;
  hasLost5050: boolean;
} {
  if (!history || history.length === 0) {
    return { consecutiveWins: 0, highestPity: 0, hasLost5050: false };
  }

  // Reverse newest-first history to chronological (oldest to newest)
  const chronological = [...history].reverse();

  let currentStreak = 0;
  let maxStreak = 0;
  let highestPity = 0;
  let hasLost5050 = false;

  for (const item of chronological) {
    if (item.rarity === 5) {
      if (item.pity_count > highestPity) {
        highestPity = item.pity_count;
      }

      if (item.banner_type === "character_limited") {
        if (item.is_5050_win === true) {
          currentStreak++;
          if (currentStreak > maxStreak) maxStreak = currentStreak;
        } else if (item.is_5050_win === false) {
          hasLost5050 = true;
          currentStreak = 0;
        } else if (item.is_guaranteed === 0) {
          const isStd = STANDARD_5_STAR_IDS.includes(item.item_id);
          if (isStd) {
            hasLost5050 = true;
            currentStreak = 0;
          } else {
            currentStreak++;
            if (currentStreak > maxStreak) maxStreak = currentStreak;
          }
        }
      }
    }
  }

  return {
    consecutiveWins: maxStreak,
    highestPity,
    hasLost5050,
  };
}

/**
 * Builds a TitleContext object from current player state.
 */
export function buildTitleContext(
  inventory: UserInventoryItem[],
  totalPulls: number,
  history: ClientHistoryItem[],
  wins5050: number,
  total5050: number,
  claimedTitleIds?: string[],
  isVip?: boolean,
  loginStreak: number = 1,
  maxLoginStreak: number = 1
): TitleContext {
  const streaks = calculate5050Streaks(history);
  const ownedResonatorIds = new Set<string>();
  const limitedSet = new Set(PLAYABLE_LIMITED_5STAR_IDS.map((id) => id.toLowerCase()));
  let totalS6Count = 0;
  let s6LimitedCount = 0;

  inventory.forEach((item) => {
    const lowerId = item.character_id.toLowerCase();
    ownedResonatorIds.add(lowerId);
    if (item.count >= MAX_WAVEBAND_COUNT) {
      totalS6Count++;
      if (limitedSet.has(lowerId)) {
        s6LimitedCount++;
      }
    }
  });

  return {
    inventory,
    totalPulls,
    astriteUsed: totalPulls * 160,
    total5StarCount: inventory.length,
    totalS6Count,
    s6LimitedCount,
    totalPlayableLimitedCount: PLAYABLE_LIMITED_5STAR_IDS.length,
    wins5050,
    total5050,
    consecutive5050Wins: streaks.consecutiveWins,
    highestPity5Star: streaks.highestPity,
    lostAny5050: streaks.hasLost5050,
    ownedResonatorIds,
    claimedTitleIds,
    isVip,
    loginStreak: Math.max(1, loginStreak),
    maxLoginStreak: Math.max(loginStreak, maxLoginStreak),
  };
}

// =========================================================================
// Milestone Titles Catalog
// =========================================================================

export const MILESTONE_TITLES: PlayerTitle[] = [
  // --- Starter / Special ---
  {
    id: "vip",
    name: "VIP",
    category: "special",
    description: "The chosen one. Unlocks +50% Tacet Field storage (+80 pulls / +6.0h). Combines with full login streaks for 24-hour capacity (51,200 Astrite / 320 pulls).",
    rarity: "mythic",
    badgeColorClass: "border-amber-400 text-amber-300 bg-amber-400/20 shadow-[0_0_15px_rgba(251,191,36,0.4)]",
    customColor: "#FFD700",
    isUnlocked: (ctx) => Boolean(ctx.isVip || (ctx.claimedTitleIds && ctx.claimedTitleIds.includes("vip"))),
    getProgress: (ctx) => {
      const isVip = Boolean(ctx.isVip || (ctx.claimedTitleIds && ctx.claimedTitleIds.includes("vip")));
      return {
        current: isVip ? 1 : 0,
        target: 1,
        label: isVip ? "Granted" : "Exclusive (Granted by Admin)",
      };
    },
  },
  // --- Daily Login Streak Titles (00:00 GMT+8 Resets, Permanent Unlocks) ---
  {
    id: "daily_attendant",
    name: "Daily Attendant",
    category: "special",
    description: "Maintain a 2-day convene login streak. Permanently increases Tacet Field storage by +20 pulls (+1.5h).",
    rarity: "rare",
    badgeColorClass: RARITY_BADGE_CLASSES.rare,
    isUnlocked: (ctx) => ctx.maxLoginStreak >= 2,
    getProgress: (ctx) => ({
      current: Math.min(2, ctx.loginStreak),
      target: 2,
      label: "Days Streak",
    }),
  },
  {
    id: "solaris_regular",
    name: "Solaris Regular",
    category: "special",
    description: "Maintain a 5-day convene login streak. Permanently increases Tacet Field storage by +20 pulls (+1.5h).",
    rarity: "epic",
    badgeColorClass: RARITY_BADGE_CLASSES.epic,
    isUnlocked: (ctx) => ctx.maxLoginStreak >= 5,
    getProgress: (ctx) => ({
      current: Math.min(5, ctx.loginStreak),
      target: 5,
      label: "Days Streak",
    }),
  },
  {
    id: "devoted_traveler",
    name: "Devoted Traveler",
    category: "special",
    description: "Maintain a 9-day convene login streak. Permanently increases Tacet Field storage by +20 pulls (+1.5h).",
    rarity: "legendary",
    badgeColorClass: RARITY_BADGE_CLASSES.legendary,
    isUnlocked: (ctx) => ctx.maxLoginStreak >= 9,
    getProgress: (ctx) => ({
      current: Math.min(9, ctx.loginStreak),
      target: 9,
      label: "Days Streak",
    }),
  },
  {
    id: "timeless_rover",
    name: "Timeless Rover",
    category: "special",
    description: "Maintain a 14-day convene login streak. Permanently increases Tacet Field storage by +20 pulls (+1.5h).",
    rarity: "mythic",
    badgeColorClass: RARITY_BADGE_CLASSES.mythic,
    isUnlocked: (ctx) => ctx.maxLoginStreak >= 14,
    getProgress: (ctx) => ({
      current: Math.min(14, ctx.loginStreak),
      target: 14,
      label: "Days Streak",
    }),
  },
  {
    id: "the_rover",
    name: "The Rover",
    category: "special",
    description: "Awakened traveler exploring the mysteries and echoes of Solaris-3.",
    rarity: "epic",
    badgeColorClass: RARITY_BADGE_CLASSES.epic,
    isUnlocked: () => true,
    getProgress: () => ({ current: 1, target: 1, label: "Awakened" }),
  },
  {
    id: "nub",
    name: "Nub",
    category: "special",
    description: "Perform your very first convene in the simulator.",
    rarity: "rare",
    badgeColorClass: RARITY_BADGE_CLASSES.rare,
    isUnlocked: (ctx) => ctx.totalPulls >= 1,
    getProgress: (ctx) => ({
      current: Math.min(1, ctx.totalPulls),
      target: 1,
      label: "Pulls",
    }),
  },
  {
    id: "certified_gacha_addict",
    name: "Certified Gacha Addict",
    category: "special",
    description: "Acquire Sequence 6 (S6) for every limited 5-star Resonator.",
    rarity: "mythic",
    badgeColorClass: RARITY_BADGE_CLASSES.mythic,
    isUnlocked: (ctx) =>
      ctx.totalPlayableLimitedCount > 0 &&
      ctx.s6LimitedCount >= ctx.totalPlayableLimitedCount,
    getProgress: (ctx) => ({
      current: ctx.s6LimitedCount,
      target: ctx.totalPlayableLimitedCount,
      label: "S6 Limited",
    }),
  },

  // --- Luck & Fortune (50/50) ---
  {
    id: "fate_sovereign",
    name: "Fate's Sovereign",
    category: "luck",
    description: "Win 10 consecutive 50/50 rolls on featured character banners without losing.",
    rarity: "mythic",
    badgeColorClass: RARITY_BADGE_CLASSES.mythic,
    isUnlocked: (ctx) => ctx.consecutive5050Wins >= 10,
    getProgress: (ctx) => ({
      current: Math.min(10, ctx.consecutive5050Wins),
      target: 10,
      label: "50/50 Streak",
    }),
  },
  {
    id: "unstoppable_fortune",
    name: "Unstoppable Luck",
    category: "luck",
    description: "Win 5 consecutive 50/50 rolls on featured character banners without losing.",
    rarity: "legendary",
    badgeColorClass: RARITY_BADGE_CLASSES.legendary,
    isUnlocked: (ctx) => ctx.consecutive5050Wins >= 5,
    getProgress: (ctx) => ({
      current: Math.min(5, ctx.consecutive5050Wins),
      target: 5,
      label: "50/50 Streak",
    }),
  },
  {
    id: "lucky_star",
    name: "Favored by the Stars",
    category: "luck",
    description: "Win at least 5 total 50/50 rolls on featured character banners.",
    rarity: "epic",
    badgeColorClass: RARITY_BADGE_CLASSES.epic,
    isUnlocked: (ctx) => ctx.wins5050 >= 5,
    getProgress: (ctx) => ({
      current: Math.min(5, ctx.wins5050),
      target: 5,
      label: "50/50 Wins",
    }),
  },
  {
    id: "hard_pity_survivor",
    name: "Hard Pity Survivor",
    category: "luck",
    description: "Climb to 70+ pity before acquiring a 5-star Resonator.",
    rarity: "epic",
    badgeColorClass: RARITY_BADGE_CLASSES.epic,
    isUnlocked: (ctx) => ctx.highestPity5Star >= 70,
    getProgress: (ctx) => ({
      current: Math.min(70, ctx.highestPity5Star),
      target: 70,
      label: "Pity Count",
    }),
  },
  {
    id: "unlucky_soul",
    name: "Unlucky Soul",
    category: "luck",
    description: "Lose a 50/50 to a standard Resonator on a featured banner.",
    rarity: "rare",
    badgeColorClass: RARITY_BADGE_CLASSES.rare,
    isUnlocked: (ctx) => ctx.lostAny5050,
    getProgress: (ctx) => ({
      current: ctx.lostAny5050 ? 1 : 0,
      target: 1,
      label: "50/50 Lost",
    }),
  },

  // --- Astrite Spent ---
  {
    id: "casual_roller",
    name: "Casual Roller",
    category: "astrite",
    description: "Spend 8,000 Astrites (50 convenes).",
    rarity: "rare",
    badgeColorClass: RARITY_BADGE_CLASSES.rare,
    isUnlocked: (ctx) => ctx.astriteUsed >= 8000,
    getProgress: (ctx) => ({
      current: Math.min(8000, ctx.astriteUsed),
      target: 8000,
      label: "Astrite",
    }),
  },
  {
    id: "astrite_spender",
    name: "Astrite Spender",
    category: "astrite",
    description: "Spend 16,000 Astrites (100 convenes).",
    rarity: "rare",
    badgeColorClass: RARITY_BADGE_CLASSES.rare,
    isUnlocked: (ctx) => ctx.astriteUsed >= 16000,
    getProgress: (ctx) => ({
      current: Math.min(16000, ctx.astriteUsed),
      target: 16000,
      label: "Astrite",
    }),
  },
  {
    id: "devoted_summoner",
    name: "Devoted Summoner",
    category: "astrite",
    description: "Spend 40,000 Astrites (250 convenes).",
    rarity: "epic",
    badgeColorClass: RARITY_BADGE_CLASSES.epic,
    isUnlocked: (ctx) => ctx.astriteUsed >= 40000,
    getProgress: (ctx) => ({
      current: Math.min(40000, ctx.astriteUsed),
      target: 40000,
      label: "Astrite",
    }),
  },
  {
    id: "high_roller",
    name: "High Roller",
    category: "astrite",
    description: "Spend 80,000 Astrites (500 convenes).",
    rarity: "legendary",
    badgeColorClass: RARITY_BADGE_CLASSES.legendary,
    isUnlocked: (ctx) => ctx.astriteUsed >= 80000,
    getProgress: (ctx) => ({
      current: Math.min(80000, ctx.astriteUsed),
      target: 80000,
      label: "Astrite",
    }),
  },
  {
    id: "whale_of_huanglong",
    name: "Whale of Huanglong",
    category: "astrite",
    description: "Spend 160,000 Astrites (1,000 convenes).",
    rarity: "mythic",
    badgeColorClass: RARITY_BADGE_CLASSES.mythic,
    isUnlocked: (ctx) => ctx.astriteUsed >= 160000,
    getProgress: (ctx) => ({
      current: Math.min(160000, ctx.astriteUsed),
      target: 160000,
      label: "Astrite",
    }),
  },

  // --- Resonator Collections ---
  {
    id: "rookie_collector",
    name: "Rookie Collector",
    category: "collection",
    description: "Own at least 3 unique 5-star Resonators.",
    rarity: "rare",
    badgeColorClass: RARITY_BADGE_CLASSES.rare,
    isUnlocked: (ctx) => ctx.total5StarCount >= 3,
    getProgress: (ctx) => ({
      current: Math.min(3, ctx.total5StarCount),
      target: 3,
      label: "5★ Resonators",
    }),
  },
  {
    id: "avid_collector",
    name: "Avid Collector",
    category: "collection",
    description: "Own at least 10 unique 5-star Resonators.",
    rarity: "epic",
    badgeColorClass: RARITY_BADGE_CLASSES.epic,
    isUnlocked: (ctx) => ctx.total5StarCount >= 10,
    getProgress: (ctx) => ({
      current: Math.min(10, ctx.total5StarCount),
      target: 10,
      label: "5★ Resonators",
    }),
  },
  {
    id: "elite_collector",
    name: "Elite Collector",
    category: "collection",
    description: "Own at least 20 unique 5-star Resonators.",
    rarity: "legendary",
    badgeColorClass: RARITY_BADGE_CLASSES.legendary,
    isUnlocked: (ctx) => ctx.total5StarCount >= 20,
    getProgress: (ctx) => ({
      current: Math.min(20, ctx.total5StarCount),
      target: 20,
      label: "5★ Resonators",
    }),
  },
  {
    id: "grand_collector",
    name: "The Grand Collector",
    category: "collection",
    description: "Own at least 30 unique 5-star Resonators.",
    rarity: "mythic",
    badgeColorClass: RARITY_BADGE_CLASSES.mythic,
    isUnlocked: (ctx) => ctx.total5StarCount >= 30,
    getProgress: (ctx) => ({
      current: Math.min(30, ctx.total5StarCount),
      target: 30,
      label: "5★ Resonators",
    }),
  },
  {
    id: "omnipresent",
    name: "Omnipresent",
    category: "collection",
    description: "Unlock every single 5-star Resonator in the game.",
    rarity: "mythic",
    badgeColorClass: RARITY_BADGE_CLASSES.mythic,
    isUnlocked: (ctx) => ctx.total5StarCount >= TOTAL_5_STAR_RESONATORS_COUNT,
    getProgress: (ctx) => ({
      current: Math.min(TOTAL_5_STAR_RESONATORS_COUNT, ctx.total5StarCount),
      target: TOTAL_5_STAR_RESONATORS_COUNT,
      label: "5★ Resonators",
    }),
  },
  {
    id: "sequence_architect",
    name: "Sequence Architect",
    category: "collection",
    description: "Unlock Sequence S6 (maximum dupes) for any Resonator.",
    rarity: "legendary",
    badgeColorClass: RARITY_BADGE_CLASSES.legendary,
    isUnlocked: (ctx) => ctx.totalS6Count >= 1,
    getProgress: (ctx) => ({
      current: Math.min(1, ctx.totalS6Count),
      target: 1,
      label: "S6 Resonator",
    }),
  },
];

// =========================================================================
// Dynamic Character-Specific Titles (Generated from portraits registry)
// Unlocked ONLY when reaching Sequence S6 (MAX) - 7 copies total!
// Styled in the Resonator's exact character hex color.
// Filtered to genuine 5-star limited resonators collected in inventory.
// =========================================================================

export const CHARACTER_TITLES: PlayerTitle[] = INVENTORY_PORTRAITS
  .filter((p) => p.id.toLowerCase() !== "yangyang" && p.id.toLowerCase() !== "yangyang_xuanling")
  .map((p) => {
    const titleName = getResonatorTitle(p.id);
    const color = RESONATOR_COLORS[p.id.toLowerCase()] || "#E6C76A";

    return {
      id: `char_${p.id}`,
      name: titleName,
      category: "resonator",
      description: `Achieve Sequence S6 (MAX) on ${p.name}.`,
      rarity: "legendary",
      badgeColorClass: RARITY_BADGE_CLASSES.legendary,
      customColor: color,
      isUnlocked: (ctx: TitleContext) => {
        const invItem = ctx.inventory.find(
          (i) => i.character_id.toLowerCase() === p.id.toLowerCase()
        );
        return (invItem?.count ?? 0) >= 7;
      },
      getProgress: (ctx: TitleContext) => {
        const invItem = ctx.inventory.find(
          (i) => i.character_id.toLowerCase() === p.id.toLowerCase()
        );
        const count = invItem?.count ?? 0;
        return {
          current: Math.min(7, count),
          target: 7,
          label: "Copies (S6)",
        };
      },
    };
  });

// Full Master Title List
export const ALL_PLAYER_TITLES: PlayerTitle[] = [
  ...MILESTONE_TITLES,
  ...CHARACTER_TITLES,
];

// Helper to find title by name (case-insensitive)
export function findTitleByName(titleName?: string): PlayerTitle | undefined {
  if (!titleName) return undefined;
  const lower = titleName.trim().toLowerCase();
  if (
    lower === "you're one gacha addict" ||
    lower === "you are one gacha addict" ||
    lower === "starter gambler"
  ) {
    return ALL_PLAYER_TITLES.find((t) => t.id === "nub");
  }
  return ALL_PLAYER_TITLES.find((t) => t.name.toLowerCase() === lower);
}

// Title Claim Rewards by Rarity
// 1 pull for rare (160), 2 for epic (320), 5 for legendary (800), 10 for mythic (1,600)
export const TITLE_RARITY_REWARDS: Record<TitleRarity, { pulls: number; astrite: number }> = {
  rare: { pulls: 1, astrite: 160 },
  epic: { pulls: 2, astrite: 320 },
  legendary: { pulls: 5, astrite: 800 },
  mythic: { pulls: 10, astrite: 1600 },
};

// =========================================================================
// Storage & Synchronization Helpers
// =========================================================================

export const DEFAULT_PLAYER_TITLE = "The Rover";

/**
 * Retrieves stored title for a user ID.
 */
export function getStoredUserTitle(userId?: string): string {
  if (typeof window === "undefined" || !userId) return DEFAULT_PLAYER_TITLE;
  try {
    const local = localStorage.getItem(`wuwa_title_${userId}`);
    if (local) {
      if (
        local === "You're One Gacha Addict" ||
        local === "Starter Gambler"
      ) {
        return "Nub";
      }
      return local;
    }
  } catch {}
  return DEFAULT_PLAYER_TITLE;
}

/**
 * Saves and syncs the equipped title strictly for this user ID to localStorage and Supabase.
 */
export async function updateUserTitle(userId: string, titleName: string): Promise<void> {
  if (!userId) return;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`wuwa_title_${userId}`, titleName);
      // Remove any lingering shared key to prevent cross-account bleeding
      localStorage.removeItem("wuwa_active_title");
    } catch {}
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.updateUser({
        data: { custom_title: titleName },
      });
    } catch (e) {
      console.warn("Could not sync title to user metadata:", e);
    }

    // 1. Try dedicated RPC (security definer, bypasses RLS)
    try {
      const { error: rpcErr } = await supabase.rpc("save_player_title", {
        p_user_id: userId,
        p_custom_title: titleName,
      });
      if (!rpcErr) return;
    } catch {}

    // 2. Direct table update fallback
    try {
      await supabase
        .from("profiles")
        .update({ custom_title: titleName })
        .eq("id", userId);
    } catch {
      // Handled gracefully
    }
  }
}

/**
 * Retrieves claimed title IDs for a user ID from localStorage.
 */
export function getStoredClaimedTitles(userId?: string): string[] {
  if (typeof window === "undefined" || !userId) return ["the_rover"];
  try {
    const raw = localStorage.getItem(`wuwa_claimed_titles_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        if (!parsed.includes("the_rover")) parsed.push("the_rover");
        return parsed;
      }
    }
  } catch {}
  return ["the_rover"];
}

/**
 * Saves claimed title IDs for a user ID to localStorage.
 */
export function saveStoredClaimedTitles(userId: string, claimedIds: string[]): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    if (!claimedIds.includes("the_rover")) claimedIds.push("the_rover");
    localStorage.setItem(`wuwa_claimed_titles_${userId}`, JSON.stringify(claimedIds));
  } catch {}
}

/**
 * Claims the Astrite reward for an unlocked title in Supabase and localStorage.
 */
export async function claimTitleReward(
  userId: string | undefined,
  title: PlayerTitle
): Promise<{ success: boolean; claimedTitles: string[]; newAstrite?: number; rewardAstrite: number; error?: string }> {
  const reward = TITLE_RARITY_REWARDS[title.rarity] || { pulls: 1, astrite: 160 };
  const currentClaimed = getStoredClaimedTitles(userId);

  if (
    currentClaimed.includes(title.id) ||
    (title.id === "nub" &&
      (currentClaimed.includes("gacha_addict") || currentClaimed.includes("starter_gambler")))
  ) {
    return { success: false, claimedTitles: currentClaimed, rewardAstrite: 0, error: "Title already claimed" };
  }

  const updatedClaimed = [...currentClaimed, title.id];
  if (userId) {
    saveStoredClaimedTitles(userId, updatedClaimed);
  }

  if (isSupabaseConfigured() && userId) {
    try {
      const { data, error } = await supabase.rpc("claim_player_title", {
        p_user_id: userId,
        p_title_id: title.id,
        p_reward_astrite: reward.astrite,
      });

      if (!error && data && data.success) {
        return {
          success: true,
          claimedTitles: Array.isArray(data.claimed_titles) ? data.claimed_titles : updatedClaimed,
          newAstrite: data.new_astrite,
          rewardAstrite: reward.astrite,
        };
      }
    } catch (e) {
      console.warn("RPC claim_player_title failed, falling back to direct table update:", e);
    }

    // Direct table fallback
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("claimed_title_ids, astrite")
        .eq("id", userId)
        .maybeSingle();

      const existingCloudClaimed: string[] = Array.isArray(profile?.claimed_title_ids)
        ? profile.claimed_title_ids
        : [];
      if (!existingCloudClaimed.includes(title.id)) {
        existingCloudClaimed.push(title.id);
      }
      const newAstrite = (profile?.astrite || 0) + reward.astrite;

      await supabase
        .from("profiles")
        .update({
          claimed_title_ids: existingCloudClaimed,
          astrite: newAstrite,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      return { success: true, claimedTitles: existingCloudClaimed, newAstrite, rewardAstrite: reward.astrite };
    } catch (err: any) {
      console.error("Direct profile update fallback failed:", err);
    }
  }

  return { success: true, claimedTitles: updatedClaimed, rewardAstrite: reward.astrite };
}
