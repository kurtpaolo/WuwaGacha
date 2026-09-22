import charactersData from "@/characters.json";
import {
  getHourlyRotatedCharacters,
  getCurrentRotationIndex,
  getTimeUntilNextRotation,
  GMT8_OFFSET_MS,
  ROTATION_INTERVAL_MS,
} from "@/lib/gacha/bannerRotation";

export const DISCORD_WEBHOOK_REGEX =
  /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+(?:\?.*)?$/;

// Standard 4★ Resonator name map
const NAME_LOOKUP: Record<string, string> = {
  danjin: "Danjin",
  chixia: "Chixia",
  baizhi: "Baizhi",
  yangyang: "Yangyang",
  sanhua: "Sanhua",
  taoqi: "Taoqi",
  aalto: "Aalto",
  yuanwu: "Yuanwu",
  youhu: "Youhu",
  lumi: "Lumi",
  zani: "Zani",
  buling: "Buling",
  hiyuki: "Hiyuki",
  hsin: "Hsin",
  suisui: "Suisui",
  rebecca: "Rebecca",
  mortefi: "Mortefi",
};

// Element emojis & decimal colors for Discord embeds
const ELEMENT_META: Record<string, { emoji: string; color: number }> = {
  Spectro: { emoji: "✨", color: 0xfacc15 },
  Havoc: { emoji: "🌑", color: 0xa855f7 },
  Aero: { emoji: "🍃", color: 0x2dd4bf },
  Electro: { emoji: "⚡", color: 0xc084fc },
  Fusion: { emoji: "🔥", color: 0xf87171 },
  Glacio: { emoji: "❄️", color: 0x38bdf8 },
};

export interface BannerCharacterInfo {
  id: string;
  name: string;
  title: string;
  element: string;
  weaponType: string;
  bannerTitle: string;
  bannerSubtitle: string;
  quote: string;
  signatureWeapon: {
    name: string;
    title: string;
    weaponType: string;
  } | null;
  featured4Stars: string[];
  accentColor: string;
  imageUrl: string;
}

export function getCurrentBannerInfo(nowMs: number = Date.now(), baseUrl?: string) {
  const cycleIndex = getCurrentRotationIndex(nowMs);
  const rotatedIds = getHourlyRotatedCharacters(nowMs);
  const timeRemaining = getTimeUntilNextRotation(nowMs);

  const nextRotationMs =
    (Math.floor((nowMs + GMT8_OFFSET_MS) / ROTATION_INTERVAL_MS) + 1) *
      ROTATION_INTERVAL_MS -
    GMT8_OFFSET_MS;
  const nextResetIso = new Date(nextRotationMs).toISOString();

  const domain =
    baseUrl ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://wuwa-gacha.vercel.app");

  const characters: BannerCharacterInfo[] = rotatedIds.map((id) => {
    const char =
      charactersData.limitedResonators.find((c: any) => c.id === id) ||
      (charactersData as any).fallbackResonators?.find((c: any) => c.id === id) || {
        id,
        name: id.toUpperCase(),
        title: "Resonator",
        element: "Spectro",
        weaponType: "Sword",
        bannerTitle: "Featured Banner",
        featured4StarIds: [],
        splashUrl: "/assets/characters/changli_splash_v2.jpeg",
      };

    const feat4Names = (char.featured4StarIds || []).map(
      (fId: string) => NAME_LOOKUP[fId.toLowerCase()] || fId
    );

    // Resolve absolute image URL for Discord
    let rawImage = char.splashUrl || char.portraitUrl || "";
    let fullImageUrl = rawImage;
    if (rawImage.startsWith("/")) {
      fullImageUrl = `${domain.replace(/\/+$/, "")}${rawImage}`;
    }

    return {
      id: char.id,
      name: char.name,
      title: char.title || "",
      element: char.element || "Spectro",
      weaponType: char.weaponType || "Sword",
      bannerTitle: char.bannerTitle || char.name,
      bannerSubtitle: char.bannerSubtitle || "",
      quote: char.quote || "",
      signatureWeapon: char.signatureWeapon
        ? {
            name: char.signatureWeapon.name,
            title: char.signatureWeapon.title,
            weaponType: char.signatureWeapon.weaponType,
          }
        : null,
      featured4Stars: feat4Names,
      accentColor: char.accentColor || "#f59e0b",
      imageUrl: fullImageUrl,
    };
  });

  return {
    cycleIndex,
    timeRemaining: timeRemaining.formattedText,
    nextReset: nextResetIso,
    characters,
  };
}

/**
 * Builds the rich Discord Webhook payload featuring 3 character cards with artwork.
 */
export function buildDiscordBannerPayload(nowMs: number = Date.now(), baseUrl?: string) {
  const { cycleIndex, nextReset, characters } = getCurrentBannerInfo(nowMs, baseUrl);

  // 1. Overview header embed
  const overviewEmbed = {
    title: "A new half-hourly banner is now active!",
    description: `The following **3 limited 5★ resonators** are currently featured:`,
    color: 0xf59e0b, // Gold
    footer: {
      text: `Cycle #${cycleIndex} • Resets every 30m (:00, :30)`,
    },
    timestamp: nextReset,
  };

  // 2. Individual character card embeds (matching the banner cards from the game)
  const characterEmbeds = characters.map((char, idx) => {
    const meta = ELEMENT_META[char.element] || { emoji: "⭐", color: 0xf59e0b };
    const weaponText = char.signatureWeapon
      ? `${char.signatureWeapon.name} (${char.signatureWeapon.weaponType})`
      : char.weaponType;
    const feat4Text =
      char.featured4Stars.length > 0
        ? char.featured4Stars.join(" • ")
        : "Standard Rate-Up";

    return {
      title: `${meta.emoji} ${char.bannerTitle.toUpperCase()} — ${char.name}`,
      description: char.quote ? `*“${char.quote}”*` : undefined,
      color: meta.color,
      fields: [
        {
          name: "Resonator",
          value: `**Element:** ${meta.emoji} ${char.element}\n**Weapon:** ${char.weaponType}`,
          inline: true,
        },
        {
          name: "Signature 5★ Weapon",
          value: `✦ ${weaponText}`,
          inline: true,
        },
        {
          name: "Rate-Up 4★ Resonators",
          value: feat4Text,
          inline: false,
        },
      ],
      image: char.imageUrl ? { url: char.imageUrl } : undefined,
      footer: idx === characters.length - 1 ? {
        text: "Wuthering Waves Convene Simulator • Next Reset",
      } : undefined,
      timestamp: idx === characters.length - 1 ? nextReset : undefined,
    };
  });

  return {
    username: "WuWa Convene Broadcast",
    avatar_url: "https://raw.githubusercontent.com/kurtpaoloredondo14.workers.dev/icon.webp",
    embeds: [overviewEmbed, ...characterEmbeds],
  };
}

import { generateBannerCompositeImage } from "./bannerComposite";

/**
 * Sends the composite 3-card banner showcase notification to a Discord webhook with
 * the generated image attached directly to the post.
 */
export async function sendDiscordBannerNotification(webhookUrl: string, nowMs: number = Date.now()) {
  // Banner info and image use the current active banner (no offset)
  const { characters } = getCurrentBannerInfo(nowMs);
  const imageBuffer = await generateBannerCompositeImage(nowMs);

  // Displayed timestamp is offset by -30 minutes from the next reset
  const nextRotationMs =
    (Math.floor((nowMs + GMT8_OFFSET_MS) / ROTATION_INTERVAL_MS) + 1) *
      ROTATION_INTERVAL_MS -
    GMT8_OFFSET_MS;
  const displayedTimestamp = new Date(nextRotationMs - 30 * 60 * 1000).toISOString();

  // Only display resonator names without title/element text
  const charList = characters
    .map((c) => `✦ **${c.name}**`)
    .join("\n");

  const payloadJson = {
    username: "WuWa Convene Broadcast",
    avatar_url: "https://wuwa-sim.vercel.app/assets/icons/convene_icon.png",
    embeds: [
      {
        title: "A new half-hourly banner is now active!",
        description: `**Featured 5★ Limited Resonators:**\n${charList}`,
        color: 0xfacc15,
        image: {
          url: "attachment://banner.png",
        },
        timestamp: displayedTimestamp,
      },
    ],
  };

  const formData = new FormData();
  formData.append("payload_json", JSON.stringify(payloadJson));
  formData.append(
    "files[0]",
    new Blob([new Uint8Array(imageBuffer)], { type: "image/png" }),
    "banner.png"
  );

  const res = await fetch(webhookUrl, {
    method: "POST",
    body: formData,
  });

  return res;
}
