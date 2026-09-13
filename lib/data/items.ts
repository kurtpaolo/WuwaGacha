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
  signatureWeaponId: string;
  signatureWeaponName: string;
  signatureWeaponTitle: string;
  accentColor: string;
  portraitUrl: string;
  splashUrl: string;
  stillUrl: string;
  drawUrl: string;
  isComingSoon?: boolean;
  isUnavailable?: boolean;
  unavailableBannerTitle?: string;
  unavailableNoticeTitle?: string;
  unavailableNoticeText?: string;
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
      drawUrl: `/assets/characters/${r.id}_draw.png`,
    };
  }
});

// Ordered list of all limited characters from 1.0 to 3.7
export const LIMITED_CHARACTERS_LIST = charactersData.limitedResonators.map((r: any) => r.id);

// 4. Weapons Registry
export const WEAPONS: Record<string, ItemData> = {
  // 5-Star Limited Signature Weapons (Patches 1.0 - 3.7)
  verdant_summit: { id: "verdant_summit", name: "Verdant Summit", title: "Jiyan's Signature Broadblade", rarity: 5, type: "weapon", weaponType: "Broadblade", isLimited: true },
  stringmaster: { id: "stringmaster", name: "Stringmaster", title: "Yinlin's Signature Rectifier", rarity: 5, type: "weapon", weaponType: "Rectifier", isLimited: true },
  ages_of_harvest: { id: "ages_of_harvest", name: "Ages of Harvest", title: "Jinhsi's Signature Broadblade", rarity: 5, type: "weapon", weaponType: "Broadblade", isLimited: true },
  blazing_brilliance: { id: "blazing_brilliance", name: "Blazing Brilliance", title: "Changli's Signature Sword", rarity: 5, type: "weapon", weaponType: "Sword", isLimited: true },
  rime_draped_sprouts: { id: "rime_draped_sprouts", name: "Rime-Draped Sprouts", title: "Zhezhi's Signature Rectifier", rarity: 5, type: "weapon", weaponType: "Rectifier", isLimited: true },
  veritys_fall: { id: "veritys_fall", name: "Verity's Fall", title: "Xiangli Yao's Signature Gauntlets", rarity: 5, type: "weapon", weaponType: "Gauntlets", isLimited: true },
  stellar_symphony: { id: "stellar_symphony", name: "Stellar Symphony", title: "The Shorekeeper's Signature Rectifier", rarity: 5, type: "weapon", weaponType: "Rectifier", isLimited: true },
  red_spring: { id: "red_spring", name: "Red Spring", title: "Camellya's Signature Sword", rarity: 5, type: "weapon", weaponType: "Sword", isLimited: true },
  cryo_concerto: { id: "cryo_concerto", name: "Cryo Concerto", title: "Carlotta's Signature Pistols", rarity: 5, type: "weapon", weaponType: "Pistols", isLimited: true },
  eclipse_crest: { id: "eclipse_crest", name: "Eclipse Crest", title: "Roccia's Signature Gauntlets", rarity: 5, type: "weapon", weaponType: "Gauntlets", isLimited: true },
  sunlit_hymn: { id: "sunlit_hymn", name: "Sunlit Hymn", title: "Phoebe's Signature Rectifier", rarity: 5, type: "weapon", weaponType: "Rectifier", isLimited: true },
  blazing_justice: { id: "blazing_justice", name: "Blazing Justice", title: "Brant's Signature Sword", rarity: 5, type: "weapon", weaponType: "Sword", isLimited: true },
  glint_of_clouds: { id: "glint_of_clouds", name: "Glint of Clouds", title: "Cartethyia's Signature Broadblade", rarity: 5, type: "weapon", weaponType: "Broadblade", isLimited: true },
  waltz_in_masquerade: { id: "waltz_in_masquerade", name: "Waltz in Masquerade", title: "Ciaccona's Signature Pistols", rarity: 5, type: "weapon", weaponType: "Pistols", isLimited: true },
  whispers_of_sirens: { id: "whispers_of_sirens", name: "Whispers of Sirens", title: "Cantarella's Signature Rectifier", rarity: 5, type: "weapon", weaponType: "Rectifier", isLimited: true },
  tragicomedy: { id: "tragicomedy", name: "Tragicomedy", title: "Phrolova's Signature Rectifier", rarity: 5, type: "weapon", weaponType: "Rectifier", isLimited: true },
  wildfire_mark: { id: "wildfire_mark", name: "Wildfire Mark", title: "Lupa's Signature Broadblade", rarity: 5, type: "weapon", weaponType: "Broadblade", isLimited: true },
  thunderflare_dominion: { id: "thunderflare_dominion", name: "Thunderflare Dominion", title: "Luuk Herssen's Signature Sword", rarity: 5, type: "weapon", weaponType: "Sword", isLimited: true },
  aureate_zenith: { id: "aureate_zenith", name: "Aureate Zenith", title: "Augusta's Signature Gauntlets", rarity: 5, type: "weapon", weaponType: "Gauntlets", isLimited: true },
  stellar_trigger: { id: "stellar_trigger", name: "Stellar Trigger", title: "Denia's Signature Pistols", rarity: 5, type: "weapon", weaponType: "Pistols", isLimited: true },
  solar_flame: { id: "solar_flame", name: "Solar Flame", title: "Galbrena's Signature Broadblade", rarity: 5, type: "weapon", weaponType: "Broadblade", isLimited: true },
  radiant_dawn: { id: "radiant_dawn", name: "Radiant Dawn", title: "Iuno's Signature Sword", rarity: 5, type: "weapon", weaponType: "Sword", isLimited: true },
  woodland_aria: { id: "woodland_aria", name: "Woodland Aria", title: "Chisa's Signature Rectifier", rarity: 5, type: "weapon", weaponType: "Rectifier", isLimited: true },
  freeze_frame: { id: "freeze_frame", name: "Freeze Frame", title: "Mornye's Signature Pistols", rarity: 5, type: "weapon", weaponType: "Pistols", isLimited: true },
  feather_edge: { id: "feather_edge", name: "Feather Edge", title: "Qiuyuan's Signature Sword", rarity: 5, type: "weapon", weaponType: "Sword", isLimited: true },
  unflickering_valor: { id: "unflickering_valor", name: "Unflickering Valor", title: "Lucilla's Signature Broadblade", rarity: 5, type: "weapon", weaponType: "Broadblade", isLimited: true },
  boson_astrolabe: { id: "boson_astrolabe", name: "Boson Astrolabe", title: "Sigrika's Signature Rectifier", rarity: 5, type: "weapon", weaponType: "Rectifier", isLimited: true },
  fusion_accretion: { id: "fusion_accretion", name: "Fusion Accretion", title: "Qingxiao's Signature Gauntlets", rarity: 5, type: "weapon", weaponType: "Gauntlets", isLimited: true },
  endless_collapse: { id: "endless_collapse", name: "Endless Collapse", title: "Jingran's Signature Broadblade", rarity: 5, type: "weapon", weaponType: "Broadblade", isLimited: true },
  defiers_thorn: { id: "defiers_thorn", name: "Defier's Thorn", title: "Aemeath's Signature Sword", rarity: 5, type: "weapon", weaponType: "Sword", isLimited: true },
  frostburn: { id: "frostburn", name: "Frostburn", title: "Lynae's Signature Broadblade", rarity: 5, type: "weapon", weaponType: "Broadblade", isLimited: true },
  spectrum_blaster: { id: "spectrum_blaster", name: "Spectrum Blaster", title: "Lucy's Signature Pistols", rarity: 5, type: "weapon", weaponType: "Pistols", isLimited: true },
  thousandfold_deliverance: { id: "thousandfold_deliverance", name: "Thousandfold Deliverance", title: "Suoming's Signature Rectifier", rarity: 5, type: "weapon", weaponType: "Rectifier", isLimited: true },

  // 5-Star Standard Weapons
  emerald_of_genesis: { id: "emerald_of_genesis", name: "Emerald of Genesis", title: "Standard 5-Star Sword", rarity: 5, type: "weapon", weaponType: "Sword", isLimited: false },
  lustrous_razor: { id: "lustrous_razor", name: "Lustrous Razor", title: "Standard 5-Star Broadblade", rarity: 5, type: "weapon", weaponType: "Broadblade", isLimited: false },
  cosmic_ripples: { id: "cosmic_ripples", name: "Cosmic Ripples", title: "Standard 5-Star Rectifier", rarity: 5, type: "weapon", weaponType: "Rectifier", isLimited: false },
  static_mist: { id: "static_mist", name: "Static Mist", title: "Standard 5-Star Pistols", rarity: 5, type: "weapon", weaponType: "Pistols", isLimited: false },
  abyss_surges: { id: "abyss_surges", name: "Abyss Surges", title: "Standard 5-Star Gauntlets", rarity: 5, type: "weapon", weaponType: "Gauntlets", isLimited: false },

  // 4-Star Weapons: Sleepy Cat
  commando_of_conviction: { id: "commando_of_conviction", name: "Sleepy Cat", title: "Sleepy Cat", rarity: 4, type: "weapon", weaponType: "Sword", portraitUrl: "/assets/4starcat.png", splashUrl: "/assets/4starcat.png", stillUrl: "/assets/4starcat.png", drawUrl: "/assets/4starcat.png" },
  lunar_cutter: { id: "lunar_cutter", name: "Sleepy Cat", title: "Sleepy Cat", rarity: 4, type: "weapon", weaponType: "Sword", portraitUrl: "/assets/4starcat.png", splashUrl: "/assets/4starcat.png", stillUrl: "/assets/4starcat.png", drawUrl: "/assets/4starcat.png" },
  dauntless_evernight: { id: "dauntless_evernight", name: "Sleepy Cat", title: "Sleepy Cat", rarity: 4, type: "weapon", weaponType: "Broadblade", portraitUrl: "/assets/4starcat.png", splashUrl: "/assets/4starcat.png", stillUrl: "/assets/4starcat.png", drawUrl: "/assets/4starcat.png" },
  helios_cleaver: { id: "helios_cleaver", name: "Sleepy Cat", title: "Sleepy Cat", rarity: 4, type: "weapon", weaponType: "Broadblade", portraitUrl: "/assets/4starcat.png", splashUrl: "/assets/4starcat.png", stillUrl: "/assets/4starcat.png", drawUrl: "/assets/4starcat.png" },
  novaburst: { id: "novaburst", name: "Sleepy Cat", title: "Sleepy Cat", rarity: 4, type: "weapon", weaponType: "Pistols", portraitUrl: "/assets/4starcat.png", splashUrl: "/assets/4starcat.png", stillUrl: "/assets/4starcat.png", drawUrl: "/assets/4starcat.png" },
  cadenza: { id: "cadenza", name: "Sleepy Cat", title: "Sleepy Cat", rarity: 4, type: "weapon", weaponType: "Pistols", portraitUrl: "/assets/4starcat.png", splashUrl: "/assets/4starcat.png", stillUrl: "/assets/4starcat.png", drawUrl: "/assets/4starcat.png" },
  jinzhou_keeper: { id: "jinzhou_keeper", name: "Sleepy Cat", title: "Sleepy Cat", rarity: 4, type: "weapon", weaponType: "Rectifier", portraitUrl: "/assets/4starcat.png", splashUrl: "/assets/4starcat.png", stillUrl: "/assets/4starcat.png", drawUrl: "/assets/4starcat.png" },
  augment: { id: "augment", name: "Sleepy Cat", title: "Sleepy Cat", rarity: 4, type: "weapon", weaponType: "Rectifier", portraitUrl: "/assets/4starcat.png", splashUrl: "/assets/4starcat.png", stillUrl: "/assets/4starcat.png", drawUrl: "/assets/4starcat.png" },
  amity_accord: { id: "amity_accord", name: "Sleepy Cat", title: "Sleepy Cat", rarity: 4, type: "weapon", weaponType: "Gauntlets", portraitUrl: "/assets/4starcat.png", splashUrl: "/assets/4starcat.png", stillUrl: "/assets/4starcat.png", drawUrl: "/assets/4starcat.png" },
  hollow_mirage: { id: "hollow_mirage", name: "Sleepy Cat", title: "Sleepy Cat", rarity: 4, type: "weapon", weaponType: "Gauntlets", portraitUrl: "/assets/4starcat.png", splashUrl: "/assets/4starcat.png", stillUrl: "/assets/4starcat.png", drawUrl: "/assets/4starcat.png" },
  discord: { id: "discord", name: "Sleepy Cat", title: "Sleepy Cat", rarity: 4, type: "weapon", weaponType: "Broadblade", portraitUrl: "/assets/4starcat.png", splashUrl: "/assets/4starcat.png", stillUrl: "/assets/4starcat.png", drawUrl: "/assets/4starcat.png" },

  // 3-Star Weapons: Hapi Cat
  sword_of_night: { id: "sword_of_night", name: "Hapi Cat", title: "Hapi Cat", rarity: 3, type: "weapon", weaponType: "Sword", portraitUrl: "/assets/3starcat.png", splashUrl: "/assets/3starcat.png", stillUrl: "/assets/3starcat.png", drawUrl: "/assets/3starcat.png" },
  guardian_sword: { id: "guardian_sword", name: "Hapi Cat", title: "Hapi Cat", rarity: 3, type: "weapon", weaponType: "Sword", portraitUrl: "/assets/3starcat.png", splashUrl: "/assets/3starcat.png", stillUrl: "/assets/3starcat.png", drawUrl: "/assets/3starcat.png" },
  broadblade_of_night: { id: "broadblade_of_night", name: "Hapi Cat", title: "Hapi Cat", rarity: 3, type: "weapon", weaponType: "Broadblade", portraitUrl: "/assets/3starcat.png", splashUrl: "/assets/3starcat.png", stillUrl: "/assets/3starcat.png", drawUrl: "/assets/3starcat.png" },
  guardian_broadblade: { id: "guardian_broadblade", name: "Hapi Cat", title: "Hapi Cat", rarity: 3, type: "weapon", weaponType: "Broadblade", portraitUrl: "/assets/3starcat.png", splashUrl: "/assets/3starcat.png", stillUrl: "/assets/3starcat.png", drawUrl: "/assets/3starcat.png" },
  pistols_of_night: { id: "pistols_of_night", name: "Hapi Cat", title: "Hapi Cat", rarity: 3, type: "weapon", weaponType: "Pistols", portraitUrl: "/assets/3starcat.png", splashUrl: "/assets/3starcat.png", stillUrl: "/assets/3starcat.png", drawUrl: "/assets/3starcat.png" },
  guardian_pistols: { id: "guardian_pistols", name: "Hapi Cat", title: "Hapi Cat", rarity: 3, type: "weapon", weaponType: "Pistols", portraitUrl: "/assets/3starcat.png", splashUrl: "/assets/3starcat.png", stillUrl: "/assets/3starcat.png", drawUrl: "/assets/3starcat.png" },
  rectifier_of_night: { id: "rectifier_of_night", name: "Hapi Cat", title: "Hapi Cat", rarity: 3, type: "weapon", weaponType: "Rectifier", portraitUrl: "/assets/3starcat.png", splashUrl: "/assets/3starcat.png", stillUrl: "/assets/3starcat.png", drawUrl: "/assets/3starcat.png" },
  guardian_rectifier: { id: "guardian_rectifier", name: "Hapi Cat", title: "Hapi Cat", rarity: 3, type: "weapon", weaponType: "Rectifier", portraitUrl: "/assets/3starcat.png", splashUrl: "/assets/3starcat.png", stillUrl: "/assets/3starcat.png", drawUrl: "/assets/3starcat.png" },
  gauntlets_of_night: { id: "gauntlets_of_night", name: "Hapi Cat", title: "Hapi Cat", rarity: 3, type: "weapon", weaponType: "Gauntlets", portraitUrl: "/assets/3starcat.png", splashUrl: "/assets/3starcat.png", stillUrl: "/assets/3starcat.png", drawUrl: "/assets/3starcat.png" },
  guardian_gauntlets: { id: "guardian_gauntlets", name: "Hapi Cat", title: "Hapi Cat", rarity: 3, type: "weapon", weaponType: "Gauntlets", portraitUrl: "/assets/3starcat.png", splashUrl: "/assets/3starcat.png", stillUrl: "/assets/3starcat.png", drawUrl: "/assets/3starcat.png" },
};
