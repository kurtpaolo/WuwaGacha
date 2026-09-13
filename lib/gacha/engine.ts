import crypto from "node:crypto";
import { RESONATORS, WEAPONS, LIMITED_BANNER_PRESETS, ItemData, ItemRarity } from "@/lib/data/items";
import { getDatabase } from "@/lib/db/sqlite";

export interface RollResultItem {
  item: ItemData;
  rarity: ItemRarity;
  pityAtPull: number;
  isGuaranteed: boolean;
  isNew: boolean;
  afterglowCoralAwarded: number;
  oscillatedCoralAwarded: number;
}

export interface ConveneResponse {
  results: RollResultItem[];
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

// Standard 5-star character pool for 50/50 losses
const STANDARD_5_STAR_RESONATORS = ["verina", "calcharo", "encore", "jianxin", "lingyang"];

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
  "danjin", "sanhua", "mortefi", "chixia", "yangyang",
  "baizhi", "taoqi", "aalto", "yuanwu", "youhu", "lumi"
];

// All 4-star weapons
const ALL_4_STAR_WEAPONS = Object.keys(WEAPONS).filter((id) => WEAPONS[id].rarity === 4);

// All 3-star weapons
const ALL_3_STAR_WEAPONS = Object.keys(WEAPONS).filter((id) => WEAPONS[id].rarity === 3);

// Secure random float between 0 and 1
function secureRandom(): number {
  return crypto.randomInt(0, 10000000) / 10000000;
}

// Calculate 5-star probability based on current pity
// Kuro Games official rates: Base 0.8%, soft pity starts at 66 (+4% per pull up to 100% at 80)
function get5StarRate(currentPity: number): number {
  if (currentPity >= 80) return 1.0;
  if (currentPity < 66) return 0.008; // 0.8% base rate
  // Ramp from pull 66 to 80 (+4% per pull up to 100% at 80)
  const pullsIntoSoftPity = currentPity - 65;
  const ramp = pullsIntoSoftPity * 0.04; // +4% per pull
  return Math.min(1.0, 0.008 + ramp);
}

// 4-star rate: base 6%, hard pity at 10
function get4StarRate(currentPity: number): number {
  if (currentPity >= 10) return 1.0;
  return 0.06;
}

export function executeConvene(
  userId: string,
  bannerType: "character_limited" | "weapon_limited" | "character_standard" | "weapon_standard" | "beginner",
  count: 1 | 10
): ConveneResponse {
  const db = getDatabase();

  // Run everything inside an immediate transaction for atomicity
  db.exec("BEGIN IMMEDIATE TRANSACTION;");

  try {
    // 1. Fetch user state
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    if (!user) {
      throw new Error("User not found");
    }

    const isSandbox = Boolean(user.is_sandbox);
    const selectedCharId = user.selected_limited_char || "shorekeeper";
    const bannerPreset = LIMITED_BANNER_PRESETS[selectedCharId] || LIMITED_BANNER_PRESETS["shorekeeper"];

    if (bannerType === "character_limited" && (bannerPreset?.isComingSoon || bannerPreset?.isUnavailable)) {
      throw new Error(bannerPreset?.isUnavailable ? "This banner is currently unavailable!" : "This character is yet to come!");
    }

    // 2. Verify and deduct Astrite (unless sandbox mode is active)
    const astriteCostPerPull = 160;
    const totalAstriteNeeded = count * astriteCostPerPull;

    if (!isSandbox) {
      const currentAstrite = user.astrite as number;
      if (currentAstrite < totalAstriteNeeded) {
        throw new Error("Insufficient Astrite for convene");
      }
      db.prepare("UPDATE users SET astrite = astrite - ? WHERE id = ?").run(
        totalAstriteNeeded,
        userId
      );
    }

    // 3. Fetch current pity state
    let pityRecord = db.prepare(
      "SELECT * FROM pity_state WHERE user_id = ? AND banner_type = ?"
    ).get(userId, bannerType) as any;

    if (!pityRecord) {
      db.prepare(`
        INSERT INTO pity_state (id, user_id, banner_type, pity_5_star, pity_4_star, guaranteed_limited, guaranteed_featured_4_star)
        VALUES (?, ?, ?, 0, 0, 0, 0)
      `).run(`${bannerType}_${userId}`, userId, bannerType);
      pityRecord = {
        pity_5_star: 0,
        pity_4_star: 0,
        guaranteed_limited: 0,
        guaranteed_featured_4_star: 0,
      };
    }

    let pity5 = pityRecord.pity_5_star as number;
    let pity4 = pityRecord.pity_4_star as number;
    let guaranteedLimited = Boolean(pityRecord.guaranteed_limited);
    let guaranteedFeatured4 = Boolean(pityRecord.guaranteed_featured_4_star);

    const rollResults: RollResultItem[] = [];
    const goldIndices: number[] = [];
    const purpleIndices: number[] = [];

    let totalAfterglowAwarded = 0;
    let totalOscillatedAwarded = 0;

    // 4. Perform pulls
    for (let i = 0; i < count; i++) {
      pity5++;
      pity4++;

      const p5Rate = get5StarRate(pity5);
      const rollValue = secureRandom();

      let pulledItem: ItemData;
      let rarity: ItemRarity;
      let isGuaranteedRoll = false;

      if (rollValue < p5Rate) {
        // --- 5-STAR PULLED ---
        rarity = 5;
        goldIndices.push(i);

        if (bannerType === "character_limited") {
          // 50/50 check or guaranteed
          if (guaranteedLimited || secureRandom() < 0.5) {
            // Won limited character!
            pulledItem = RESONATORS[selectedCharId] || RESONATORS["shorekeeper"];
            isGuaranteedRoll = guaranteedLimited;
            guaranteedLimited = false;
          } else {
            // Lost 50/50 to standard 5-star
            const standardId = STANDARD_5_STAR_RESONATORS[crypto.randomInt(0, STANDARD_5_STAR_RESONATORS.length)];
            pulledItem = RESONATORS[standardId];
            guaranteedLimited = true; // Next 5-star guaranteed
          }
        } else if (bannerType === "weapon_limited") {
          // 100% guarantee for featured signature weapon
          const weaponId = bannerPreset.signatureWeaponId || "blazing_brilliance";
          pulledItem = WEAPONS[weaponId] || WEAPONS["blazing_brilliance"];
          isGuaranteedRoll = true;
        } else if (bannerType === "character_standard") {
          const standardId = STANDARD_5_STAR_RESONATORS[crypto.randomInt(0, STANDARD_5_STAR_RESONATORS.length)];
          pulledItem = RESONATORS[standardId];
        } else if (bannerType === "weapon_standard") {
          const weaponId = STANDARD_5_STAR_WEAPONS[crypto.randomInt(0, STANDARD_5_STAR_WEAPONS.length)];
          pulledItem = WEAPONS[weaponId];
        } else {
          // Beginner banner
          const standardId = STANDARD_5_STAR_RESONATORS[crypto.randomInt(0, STANDARD_5_STAR_RESONATORS.length)];
          pulledItem = RESONATORS[standardId];
        }

        // Reset 5-star pity
        const pullAtPity = pity5;
        pity5 = 0;

        // Check inventory for duplicate and compute coral rebates
        const inv = db.prepare("SELECT count FROM inventory WHERE user_id = ? AND item_id = ?").get(
          userId,
          pulledItem.id
        ) as any;
        const isNew = !inv;
        const afterglow = isNew ? 0 : 15; // 15 afterglow corals for duplicate 5-star
        totalAfterglowAwarded += afterglow;

        rollResults.push({
          item: pulledItem,
          rarity: 5,
          pityAtPull: pullAtPity,
          isGuaranteed: isGuaranteedRoll,
          isNew,
          afterglowCoralAwarded: 0,
          oscillatedCoralAwarded: 0,
        });
      } else {
        const p4Rate = get4StarRate(pity4);
        const rollValue4 = secureRandom();

        if (rollValue4 < p4Rate) {
          // --- 4-STAR PULLED ---
          rarity = 4;
          purpleIndices.push(i);

          if (bannerType === "character_limited") {
            // 50% rate-up for featured 4-star resonators
            if (guaranteedFeatured4 || secureRandom() < 0.5) {
              const featList = bannerPreset.featured4StarIds;
              const chosen = featList[crypto.randomInt(0, featList.length)];
              pulledItem = RESONATORS[chosen] || RESONATORS["danjin"];
              isGuaranteedRoll = guaranteedFeatured4;
              guaranteedFeatured4 = false;
            } else {
              // 4-star weapon or off-banner resonator
              const isWeapon = secureRandom() < 0.5;
              if (isWeapon) {
                const wId = ALL_4_STAR_WEAPONS[crypto.randomInt(0, ALL_4_STAR_WEAPONS.length)];
                pulledItem = WEAPONS[wId];
              } else {
                const rId = ALL_4_STAR_RESONATORS[crypto.randomInt(0, ALL_4_STAR_RESONATORS.length)];
                pulledItem = RESONATORS[rId];
              }
              guaranteedFeatured4 = true;
            }
          } else {
            // Standard / Weapon banners
            const isWeapon = secureRandom() < 0.6;
            if (isWeapon) {
              const wId = ALL_4_STAR_WEAPONS[crypto.randomInt(0, ALL_4_STAR_WEAPONS.length)];
              pulledItem = WEAPONS[wId];
            } else {
              const rId = ALL_4_STAR_RESONATORS[crypto.randomInt(0, ALL_4_STAR_RESONATORS.length)];
              pulledItem = RESONATORS[rId];
            }
          }

          const pullAtPity = pity4;
          pity4 = 0; // Reset 4-star pity

          const inv = db.prepare("SELECT count FROM inventory WHERE user_id = ? AND item_id = ?").get(
            userId,
            pulledItem.id
          ) as any;
          const isNew = !inv;
          const afterglow = isNew ? 0 : 3; // 3 afterglow corals for duplicate 4-star
          totalAfterglowAwarded += afterglow;

          rollResults.push({
            item: pulledItem,
            rarity: 4,
            pityAtPull: pullAtPity,
            isGuaranteed: isGuaranteedRoll,
            isNew,
            afterglowCoralAwarded: 0,
            oscillatedCoralAwarded: 0,
          });
        } else {
          // --- 3-STAR WEAPON ---
          rarity = 3;
          const wId = ALL_3_STAR_WEAPONS[crypto.randomInt(0, ALL_3_STAR_WEAPONS.length)];
          pulledItem = WEAPONS[wId];

          rollResults.push({
            item: pulledItem,
            rarity: 3,
            pityAtPull: pity4,
            isGuaranteed: false,
            isNew: false,
            afterglowCoralAwarded: 0,
            oscillatedCoralAwarded: 0,
          });
        }
      }

      // Record to history and inventory
      const historyId = `hist_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      db.prepare(`
        INSERT INTO history (id, user_id, banner_type, banner_id, item_id, item_name, item_type, rarity, pity_count, is_guaranteed, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        historyId,
        userId,
        bannerType,
        selectedCharId,
        pulledItem.id,
        pulledItem.name,
        pulledItem.type,
        rarity,
        rarity === 5 ? rollResults[rollResults.length - 1].pityAtPull : pity4,
        isGuaranteedRoll ? 1 : 0
      );

      // Upsert inventory
      db.prepare(`
        INSERT INTO inventory (user_id, item_id, count, first_obtained_at)
        VALUES (?, ?, 1, datetime('now'))
        ON CONFLICT(user_id, item_id) DO UPDATE SET count = count + 1
      `).run(userId, pulledItem.id);
    }

    // 5. Update pity_state in DB
    db.prepare(`
      UPDATE pity_state
      SET pity_5_star = ?, pity_4_star = ?, guaranteed_limited = ?, guaranteed_featured_4_star = ?
      WHERE user_id = ? AND banner_type = ?
    `).run(pity5, pity4, guaranteedLimited ? 1 : 0, guaranteedFeatured4 ? 1 : 0, userId, bannerType);

    // Commit transaction
    db.exec("COMMIT;");

    // Fetch updated user state
    const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;

    const highestRarity: ItemRarity = goldIndices.length > 0 ? 5 : purpleIndices.length > 0 ? 4 : 3;

    return {
      results: rollResults,
      highestRarity,
      goldIndices,
      purpleIndices,
      newPity5: pity5,
      newPity4: pity4,
      guaranteedLimited,
      userState: {
        astrite: updatedUser.astrite,
        radiantTide: updatedUser.radiant_tide,
        forgingTide: updatedUser.forging_tide,
        lustrousTide: updatedUser.lustrous_tide,
        afterglowCoral: updatedUser.afterglow_coral,
        oscillatedCoral: updatedUser.oscillated_coral,
        isSandbox: Boolean(updatedUser.is_sandbox),
      },
    };
  } catch (error) {
    db.exec("ROLLBACK;");
    throw error;
  }
}
