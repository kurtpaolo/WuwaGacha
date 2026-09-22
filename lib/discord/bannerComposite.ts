import sharp, { OverlayOptions } from "sharp";
import fs from "fs";
import path from "path";
import { getHourlyRotatedCharacters } from "@/lib/gacha/bannerRotation";
import charactersData from "@/characters.json";
import { getPortraitFileName } from "@/lib/data/portraits";

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

export async function generateBannerCompositeImage(nowMs: number = Date.now()): Promise<Buffer> {
  const rotatedIds = getHourlyRotatedCharacters(nowMs);

  const CARD_WIDTH = 360;
  const CARD_HEIGHT = 360;
  const CARD_GAP = 20;
  const PAD_X = 24;
  const PAD_Y = 24;

  const TOTAL_WIDTH = PAD_X * 2 + CARD_WIDTH * 3 + CARD_GAP * 2; // 1172
  const TOTAL_HEIGHT = PAD_Y * 2 + CARD_HEIGHT; // 408

  // Rounded corner mask for individual card
  const roundedMaskSvg = Buffer.from(`
    <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}">
      <rect x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="20" ry="20" fill="#fff" />
    </svg>
  `);

  const cardComposites: OverlayOptions[] = [];

  for (let i = 0; i < rotatedIds.length; i++) {
    const id = rotatedIds[i];
    const char =
      charactersData.limitedResonators.find((c: any) => c.id === id) ||
      (charactersData as any).fallbackResonators?.find((c: any) => c.id === id) || {
        id,
        name: id.toUpperCase(),
        bannerTitle: "Featured Banner",
      };

    const portraitFile = getPortraitFileName(char.id);
    const portraitPath = path.join(process.cwd(), "public/assets/inventory_portraits", portraitFile);

    const bannerTitle = escapeXml((char.bannerTitle || "Featured Banner").toUpperCase());
    const charName = escapeXml(char.name);

    // Overlay SVG for gradient, text, and border
    const overlaySvg = Buffer.from(`
      <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad_${i}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="rgba(0,0,0,0.1)"/>
            <stop offset="40%" stop-color="rgba(0,0,0,0.25)"/>
            <stop offset="70%" stop-color="rgba(0,0,0,0.7)"/>
            <stop offset="100%" stop-color="rgba(0,0,0,0.95)"/>
          </linearGradient>
        </defs>
        
        <!-- Gradient Overlay -->
        <rect x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="20" ry="20" fill="url(#grad_${i})" />
        
        <!-- Card Border -->
        <rect x="1" y="1" width="${CARD_WIDTH - 2}" height="${CARD_HEIGHT - 2}" rx="19" ry="19" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2" />

        <!-- Text Block at Bottom -->
        <text x="20" y="${CARD_HEIGHT - 54}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="13" font-weight="800" fill="#facc15" letter-spacing="1">${bannerTitle}</text>
        <text x="20" y="${CARD_HEIGHT - 22}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="24" font-weight="900" fill="#ffffff">${charName}</text>
      </svg>
    `);

    // Prepare portrait image or placeholder
    let portraitBuffer: Buffer;
    if (fs.existsSync(portraitPath)) {
      portraitBuffer = await sharp(portraitPath)
        .resize(CARD_WIDTH, CARD_HEIGHT, { fit: "cover", position: "top" })
        .composite([
          { input: roundedMaskSvg, blend: "dest-in" },
          { input: overlaySvg, blend: "over" },
        ])
        .png()
        .toBuffer();
    } else {
      portraitBuffer = await sharp({
        create: {
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          channels: 4,
          background: { r: 17, g: 20, b: 28, alpha: 1 },
        },
      })
        .composite([
          { input: roundedMaskSvg, blend: "dest-in" },
          { input: overlaySvg, blend: "over" },
        ])
        .png()
        .toBuffer();
    }

    const posX = PAD_X + i * (CARD_WIDTH + CARD_GAP);
    const posY = PAD_Y;

    cardComposites.push({
      input: portraitBuffer,
      left: posX,
      top: posY,
    });
  }

  // Create composite banner on a dark background
  const finalImage = await sharp({
    create: {
      width: TOTAL_WIDTH,
      height: TOTAL_HEIGHT,
      channels: 4,
      background: { r: 7, g: 9, b: 14, alpha: 1 }, // #07090e dark sci-fi background
    },
  })
    .composite(cardComposites)
    .png()
    .toBuffer();

  return finalImage;
}
