// Comprehensive Items & Banners Registry for Wuthering Waves (Patches 1.0 - 3.7)
import charactersData from "@/characters.json";

export type ElementType = "Spectro" | "Havoc" | "Fusion" | "Aero" | "Electro" | "Glacio";
export type WeaponType = "Sword" | "Broadblade" | "Pistols" | "Gauntlets" | "Rectifier";
export type ItemRarity = 3 | 4 | 5;
export type ItemType = "resonator" | "weapon";

export interface ItemData {
  id: string;
  name: string;
  title?: string;
  patch?: string;
  rarity: ItemRarity;
  type: ItemType;
  element?: ElementType;
  weaponType: WeaponType;
  quote?: string;
  isLimited?: boolean;
  isComingSoon?: boolean;
  isUnavailable?: boolean;
  unavailableBannerTitle?: string;
  unavailableNoticeTitle?: string;
  unavailableNoticeText?: string;
  signatureWeaponId?: string;
  splashUrl?: string;
  drawUrl?: string;
  stillUrl?: string;
  portraitUrl?: string;
  iconUrl?: string;
  artist?: string;
  artistUrl?: string;
}

export interface LimitedBannerPreset {
  id: string;
  name: string;
  patch: string;
  title: string;
  subtitle: string;
  element: ElementType;
  weaponType: WeaponType;
  quote: string;
  featured4StarIds: string[];
  signatureWeaponId?: string;
  signatureWeaponName?: string;
  signatureWeaponTitle?: string;
  accentColor: string;
  portraitUrl: string;
  splashUrl: string;
  stillUrl: string;
  drawUrl: string;
  artist?: string;
  artistUrl?: string;
  isComingSoon?: boolean;
  isUnavailable?: boolean;
  unavailableBannerTitle?: string;
  unavailableNoticeTitle?: string;
  unavailableNoticeText?: string;
}

export interface ResonatorArtistInfo {
  name: string;
  url?: string;
}

export const RESONATOR_ARTISTS: Record<string, ResonatorArtistInfo> = {
  shorekeeper: {
    name: "Ui_Uiiiiiiiii",
    url: "https://x.com/Ui_Uiiiiiiiii",
  },
  suoming: {
    name: "RegisKaizel",
    url: "https://x.com/RegisKaizel",
  },
  souming: {
    name: "RegisKaizel",
    url: "https://x.com/RegisKaizel",
  },
  qiuyuan: {
    name: "renjianshilian0",
    url: "https://x.com/renjianshilian0",
  },
  zani: {
    name: "ichigo_amo",
    url: "https://x.com/ichigo_amo",
  },
};

export function getResonatorArtist(charId: string): ResonatorArtistInfo {
  const normId = (charId || "").toLowerCase();
  if (RESONATOR_ARTISTS[normId]) {
    return RESONATOR_ARTISTS[normId];
  }
  return {
    name: "Kuro Games",
    url: "https://wutheringwaves.kurogames.com",
  };
}

export const RESONATORS: Record<string, ItemData> = {};
export const LIMITED_BANNER_PRESETS: Record<string, LimitedBannerPreset> = {};

// 1. Populate limited resonators
charactersData.limitedResonators.forEach((r: any) => {
  RESONATORS[r.id] = {
    id: r.id,
    name: r.name,
    title: r.title,
    patch: r.patch,
    rarity: r.rarity as ItemRarity,
    type: "resonator",
    element: r.element as ElementType,
    weaponType: r.weaponType as WeaponType,
    quote: r.quote,
    isLimited: true,
    isComingSoon: Boolean(r.isComingSoon),
    isUnavailable: Boolean(r.isUnavailable),
    unavailableBannerTitle: r.unavailableBannerTitle,
    unavailableNoticeTitle: r.unavailableNoticeTitle,
    unavailableNoticeText: r.unavailableNoticeText,
    signatureWeaponId: r.signatureWeapon?.id,
    portraitUrl: r.portraitUrl,
    splashUrl: r.splashUrl,
    stillUrl: r.stillUrl,
    drawUrl: r.drawUrl,
    artist: r.artist || RESONATOR_ARTISTS[r.id]?.name || undefined,
    artistUrl: r.artistUrl || RESONATOR_ARTISTS[r.id]?.url || undefined,
  };

  LIMITED_BANNER_PRESETS[r.id] = {
    id: r.id,
    name: r.name,
    patch: r.patch,
    title: r.bannerTitle,
    subtitle: r.bannerSubtitle,
    element: r.element as ElementType,
    weaponType: r.weaponType as WeaponType,
    quote: r.quote,
    featured4StarIds: r.featured4StarIds,
    signatureWeaponId: r.signatureWeapon?.id || "blazing_brilliance",
    signatureWeaponName: r.signatureWeapon?.name || "Signature Weapon",
    signatureWeaponTitle: r.signatureWeapon?.title || "Signature Resonance",
    accentColor: r.accentColor,
    portraitUrl: r.portraitUrl,
    splashUrl: r.splashUrl,
    stillUrl: r.stillUrl,
    drawUrl: r.drawUrl,
    artist: r.artist || RESONATOR_ARTISTS[r.id]?.name || undefined,
    artistUrl: r.artistUrl || RESONATOR_ARTISTS[r.id]?.url || undefined,
    isComingSoon: Boolean(r.isComingSoon),
    isUnavailable: Boolean(r.isUnavailable),
    unavailableBannerTitle: r.unavailableBannerTitle,
    unavailableNoticeTitle: r.unavailableNoticeTitle,
    unavailableNoticeText: r.unavailableNoticeText,
  };
});

// 1.5 Populate fallback resonators
if ((charactersData as any).fallbackResonators) {
  (charactersData as any).fallbackResonators.forEach((r: any) => {
    if (!RESONATORS[r.id]) {
      RESONATORS[r.id] = {
        id: r.id,
        name: r.name,
        title: r.title,
        patch: r.patch,
        rarity: r.rarity as ItemRarity,
        type: "resonator",
        element: r.element as ElementType,
        weaponType: r.weaponType as WeaponType,
        quote: r.quote,
        isLimited: true,
        isComingSoon: Boolean(r.isComingSoon),
        signatureWeaponId: r.signatureWeapon?.id,
        portraitUrl: r.portraitUrl,
        splashUrl: r.splashUrl,
        stillUrl: r.stillUrl,
        drawUrl: r.drawUrl,
      };
      LIMITED_BANNER_PRESETS[r.id] = {
        id: r.id,
        name: r.name,
        patch: r.patch,
        title: r.bannerTitle,
        subtitle: r.bannerSubtitle,
        element: r.element as ElementType,
        weaponType: r.weaponType as WeaponType,
        quote: r.quote,
        featured4StarIds: r.featured4StarIds,
        signatureWeaponId: r.signatureWeapon?.id || "blazing_brilliance",
        signatureWeaponName: r.signatureWeapon?.name || "Signature Weapon",
        signatureWeaponTitle: r.signatureWeapon?.title || "Signature Resonance",
        accentColor: r.accentColor,
        portraitUrl: r.portraitUrl,
        splashUrl: r.splashUrl,
        stillUrl: r.stillUrl,
        drawUrl: r.drawUrl,
        isComingSoon: Boolean(r.isComingSoon),
      };
    }
  });
}

// 2. Populate standard 5-star resonators (for 50/50 system)
charactersData.standard5StarResonators.forEach((r: any) => {
  RESONATORS[r.id] = {
    id: r.id,
    name: r.name,
    title: r.title,
    rarity: 5,
    type: "resonator",
    element: r.element as ElementType,
    weaponType: r.weaponType as WeaponType,
    quote: r.quote,
    isLimited: false,
    portraitUrl: r.portraitUrl,
    splashUrl: r.splashUrl,
    stillUrl: r.stillUrl,
    drawUrl: r.drawUrl,
  };
});

// 3. Populate 4-star resonators
charactersData.featured4StarResonators.forEach((r: any) => {
  if (!RESONATORS[r.id]) {
    RESONATORS[r.id] = {
      id: r.id,
      name: r.name,
      rarity: 4,
      type: "resonator",
      element: r.element as ElementType,
      weaponType: r.weaponType as WeaponType,
      portraitUrl: r.portraitUrl,
      drawUrl: r.id === "yangyang" ? "/assets/characters/yangyang_draw.png" : r.portraitUrl,
    };
  }
});

// Ordered list of all limited characters from 1.0 to 3.7
export const LIMITED_CHARACTERS_LIST = charactersData.limitedResonators.map((r: any) => r.id);

// 4. Cat Placeholder Weapons (Placeholders for 3-star trash pulls and 4-star cat placeholders)
export const WEAPONS: Record<string, ItemData> = {
  // Canonical Cat Placeholders
  hapi_cat: { id: "hapi_cat", name: "Hapi Cat", title: "Hapi Cat", rarity: 3, type: "weapon", weaponType: "Sword", portraitUrl: "/assets/3starcat.png", splashUrl: "/assets/3starcat.png", stillUrl: "/assets/3starcat.png", drawUrl: "/assets/3starcat.png" },
  sleepy_cat: { id: "sleepy_cat", name: "Sleepy Cat", title: "Sleepy Cat", rarity: 4, type: "weapon", weaponType: "Sword", portraitUrl: "/assets/4starcat.png", splashUrl: "/assets/4starcat.png", stillUrl: "/assets/4starcat.png", drawUrl: "/assets/4starcat.png" },

  // Backward-compatibility aliases for 4-star Sleepy Cat
  commando_of_conviction: { id: "sleepy_cat", name: "Sleepy Cat", title: "Sleepy Cat", rarity: 4, type: "weapon", weaponType: "Sword", portraitUrl: "/assets/4starcat.png", splashUrl: "/assets/4starcat.png", stillUrl: "/assets/4starcat.png", drawUrl: "/assets/4starcat.png" },
  lunar_cutter: { id: "sleepy_cat", name: "Sleepy Cat", title: "Sleepy Cat", rarity: 4, type: "weapon", weaponType: "Sword", portraitUrl: "/assets/4starcat.png", splashUrl: "/assets/4starcat.png", stillUrl: "/assets/4starcat.png", drawUrl: "/assets/4starcat.png" },
  dauntless_evernight: { id: "sleepy_cat", name: "Sleepy Cat", title: "Sleepy Cat", rarity: 4, type: "weapon", weaponType: "Broadblade", portraitUrl: "/assets/4starcat.png", splashUrl: "/assets/4starcat.png", stillUrl: "/assets/4starcat.png", drawUrl: "/assets/4starcat.png" },
  helios_cleaver: { id: "sleepy_cat", name: "Sleepy Cat", title: "Sleepy Cat", rarity: 4, type: "weapon", weaponType: "Broadblade", portraitUrl: "/assets/4starcat.png", splashUrl: "/assets/4starcat.png", stillUrl: "/assets/4starcat.png", drawUrl: "/assets/4starcat.png" },
  novaburst: { id: "sleepy_cat", name: "Sleepy Cat", title: "Sleepy Cat", rarity: 4, type: "weapon", weaponType: "Pistols", portraitUrl: "/assets/4starcat.png", splashUrl: "/assets/4starcat.png", stillUrl: "/assets/4starcat.png", drawUrl: "/assets/4starcat.png" },
  cadenza: { id: "sleepy_cat", name: "Sleepy Cat", title: "Sleepy Cat", rarity: 4, type: "weapon", weaponType: "Pistols", portraitUrl: "/assets/4starcat.png", splashUrl: "/assets/4starcat.png", stillUrl: "/assets/4starcat.png", drawUrl: "/assets/4starcat.png" },
  jinzhou_keeper: { id: "sleepy_cat", name: "Sleepy Cat", title: "Sleepy Cat", rarity: 4, type: "weapon", weaponType: "Rectifier", portraitUrl: "/assets/4starcat.png", splashUrl: "/assets/4starcat.png", stillUrl: "/assets/4starcat.png", drawUrl: "/assets/4starcat.png" },
  augment: { id: "sleepy_cat", name: "Sleepy Cat", title: "Sleepy Cat", rarity: 4, type: "weapon", weaponType: "Rectifier", portraitUrl: "/assets/4starcat.png", splashUrl: "/assets/4starcat.png", stillUrl: "/assets/4starcat.png", drawUrl: "/assets/4starcat.png" },
  amity_accord: { id: "sleepy_cat", name: "Sleepy Cat", title: "Sleepy Cat", rarity: 4, type: "weapon", weaponType: "Gauntlets", portraitUrl: "/assets/4starcat.png", splashUrl: "/assets/4starcat.png", stillUrl: "/assets/4starcat.png", drawUrl: "/assets/4starcat.png" },
  hollow_mirage: { id: "sleepy_cat", name: "Sleepy Cat", title: "Sleepy Cat", rarity: 4, type: "weapon", weaponType: "Gauntlets", portraitUrl: "/assets/4starcat.png", splashUrl: "/assets/4starcat.png", stillUrl: "/assets/4starcat.png", drawUrl: "/assets/4starcat.png" },
  discord: { id: "sleepy_cat", name: "Sleepy Cat", title: "Sleepy Cat", rarity: 4, type: "weapon", weaponType: "Broadblade", portraitUrl: "/assets/4starcat.png", splashUrl: "/assets/4starcat.png", stillUrl: "/assets/4starcat.png", drawUrl: "/assets/4starcat.png" },

  // Backward-compatibility aliases for 3-star Hapi Cat
  sword_of_night: { id: "hapi_cat", name: "Hapi Cat", title: "Hapi Cat", rarity: 3, type: "weapon", weaponType: "Sword", portraitUrl: "/assets/3starcat.png", splashUrl: "/assets/3starcat.png", stillUrl: "/assets/3starcat.png", drawUrl: "/assets/3starcat.png" },
  guardian_sword: { id: "hapi_cat", name: "Hapi Cat", title: "Hapi Cat", rarity: 3, type: "weapon", weaponType: "Sword", portraitUrl: "/assets/3starcat.png", splashUrl: "/assets/3starcat.png", stillUrl: "/assets/3starcat.png", drawUrl: "/assets/3starcat.png" },
  broadblade_of_night: { id: "hapi_cat", name: "Hapi Cat", title: "Hapi Cat", rarity: 3, type: "weapon", weaponType: "Broadblade", portraitUrl: "/assets/3starcat.png", splashUrl: "/assets/3starcat.png", stillUrl: "/assets/3starcat.png", drawUrl: "/assets/3starcat.png" },
  guardian_broadblade: { id: "hapi_cat", name: "Hapi Cat", title: "Hapi Cat", rarity: 3, type: "weapon", weaponType: "Broadblade", portraitUrl: "/assets/3starcat.png", splashUrl: "/assets/3starcat.png", stillUrl: "/assets/3starcat.png", drawUrl: "/assets/3starcat.png" },
  pistols_of_night: { id: "hapi_cat", name: "Hapi Cat", title: "Hapi Cat", rarity: 3, type: "weapon", weaponType: "Pistols", portraitUrl: "/assets/3starcat.png", splashUrl: "/assets/3starcat.png", stillUrl: "/assets/3starcat.png", drawUrl: "/assets/3starcat.png" },
  guardian_pistols: { id: "hapi_cat", name: "Hapi Cat", title: "Hapi Cat", rarity: 3, type: "weapon", weaponType: "Pistols", portraitUrl: "/assets/3starcat.png", splashUrl: "/assets/3starcat.png", stillUrl: "/assets/3starcat.png", drawUrl: "/assets/3starcat.png" },
  rectifier_of_night: { id: "hapi_cat", name: "Hapi Cat", title: "Hapi Cat", rarity: 3, type: "weapon", weaponType: "Rectifier", portraitUrl: "/assets/3starcat.png", splashUrl: "/assets/3starcat.png", stillUrl: "/assets/3starcat.png", drawUrl: "/assets/3starcat.png" },
  guardian_rectifier: { id: "hapi_cat", name: "Hapi Cat", title: "Hapi Cat", rarity: 3, type: "weapon", weaponType: "Rectifier", portraitUrl: "/assets/3starcat.png", splashUrl: "/assets/3starcat.png", stillUrl: "/assets/3starcat.png", drawUrl: "/assets/3starcat.png" },
  gauntlets_of_night: { id: "hapi_cat", name: "Hapi Cat", title: "Hapi Cat", rarity: 3, type: "weapon", weaponType: "Gauntlets", portraitUrl: "/assets/3starcat.png", splashUrl: "/assets/3starcat.png", stillUrl: "/assets/3starcat.png", drawUrl: "/assets/3starcat.png" },
  guardian_gauntlets: { id: "hapi_cat", name: "Hapi Cat", title: "Hapi Cat", rarity: 3, type: "weapon", weaponType: "Gauntlets", portraitUrl: "/assets/3starcat.png", splashUrl: "/assets/3starcat.png", stillUrl: "/assets/3starcat.png", drawUrl: "/assets/3starcat.png" },
};

export interface ResonatorOption {
  id: string;
  name: string;
  rarity?: ItemRarity;
  element?: ElementType;
}

/**
 * Curated list of all unique resonators sorted alphabetically by display name.
 * Used for security questions, profile showcase, and character selectors.
 */
export const ALL_RESONATORS_LIST: ResonatorOption[] = (() => {
  const map = new Map<string, ResonatorOption>();
  Object.values(RESONATORS).forEach((r) => {
    if (!map.has(r.name)) {
      map.set(r.name, {
        id: r.id,
        name: r.name,
        rarity: r.rarity,
        element: r.element,
      });
    }
  });

  // Include Rover as an option so players can choose their protagonist
  if (!map.has("Rover")) {
    map.set("Rover", {
      id: "rover",
      name: "Rover",
      rarity: 5,
      element: "Spectro",
    });
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
})();
