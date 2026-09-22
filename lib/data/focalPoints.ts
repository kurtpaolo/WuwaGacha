export interface FocalPoint {
  x: number; // horizontal percentage (0-100)
  y: number; // vertical percentage (0-100)
}

/**
 * Calibrated face & upper torso focal coordinates for all Resonators
 * Optimized for mobile portrait (9:16 / 9:19.5 aspect ratios) so characters
 * positioned off-center or lying down remain naturally framed without being cut off.
 */
export const CHARACTER_FOCAL_POINTS: Record<string, FocalPoint> = {
  // Limited 5-Stars
  aemeath: { x: 55, y: 38 },
  augusta: { x: 36, y: 26 },
  brant: { x: 30, y: 28 },
  camellya: { x: 28, y: 40 }, // Lying on couch playing games with controller
  cantarella: { x: 47, y: 28 },
  carlotta: { x: 48, y: 32 }, // Standing with raised pistol against crystal prism
  cartethyia: { x: 62, y: 35 },
  changli: { x: 27, y: 25 },
  chisa: { x: 44, y: 25 },
  ciaccona: { x: 58, y: 30 },
  denia: { x: 53, y: 24 },
  galbrena: { x: 60, y: 26 },
  hiyuki: { x: 65, y: 35 },
  hsin: { x: 62, y: 35 },
  iuno: { x: 44, y: 25 },
  jingran: { x: 65, y: 48 }, // Lying down on right side of desk
  jinhsi: { x: 62, y: 35 },
  jiyan: { x: 60, y: 30 },
  lucilla: { x: 42, y: 30 },
  lucy: { x: 53, y: 25 },
  lupa: { x: 55, y: 28 },
  luuk_herssen: { x: 33, y: 30 },
  luuk: { x: 33, y: 30 },
  lynae: { x: 48, y: 28 },
  mornye: { x: 57, y: 28 },
  phoebe: { x: 63, y: 30 },
  phrolova: { x: 38, y: 32 },
  qingxiao: { x: 28, y: 22 },
  qiuyuan: { x: 10, y: 35 },
  rebecca: { x: 49, y: 25 },
  roccia: { x: 35, y: 26 },
  shorekeeper: { x: 55, y: 30 },
  sigrika: { x: 52, y: 30 },
  suisui: { x: 55, y: 26 },
  suoming: { x: 61, y: 35 },
  souming: { x: 61, y: 35 },
  xiangli_yao: { x: 44, y: 25 },
  xiangliyao: { x: 44, y: 25 },
  yangyang_xuanling: { x: 46, y: 24 },
  yangyang_xl: { x: 46, y: 24 },
  yangyang: { x: 46, y: 24 },
  yinlin: { x: 52, y: 26 },
  zani: { x: 50, y: 22 },
  zhezhi: { x: 72, y: 50 }, // Lying down on right side of canvas

  // Standard 5-Stars
  calcharo: { x: 50, y: 30 },
  encore: { x: 50, y: 30 },
  jianxin: { x: 50, y: 30 },
  lingyang: { x: 50, y: 30 },
  verina: { x: 50, y: 30 },
  rover: { x: 50, y: 30 },
};

export function getCharacterFocalPoint(charId?: string): FocalPoint | null {
  if (!charId) return null;
  const lower = charId.toLowerCase();
  return CHARACTER_FOCAL_POINTS[lower] || { x: 50, y: 30 };
}

/**
 * Calibrated horizontal focal points (percentages from left 0-100) for Resonator cutscene videos.
 * Derived from user-calibrated marked frames for mobile portrait viewports (9:16 / 9:19.5),
 * ensuring the character's key action/face remains perfectly centered when 16:9 widescreen
 * cutscenes are cropped to portrait mode.
 */
export const VIDEO_FOCAL_POINTS: Record<string, number> = {
  aemeath: 57.1,
  augusta: 68.4,
  brant: 62.4,
  calcharo: 57.7,
  camellya: 59.7,
  cantarella: 66.8,
  carlotta: 63.1,
  cartethyia: 68.5,
  changli: 51.4,
  chisa: 64.2,
  ciaccona: 57.5,
  denia: 59.5,
  encore: 64.3,
  galbrena: 69.0,
  iuno: 50.3,
  jianxin: 50.4,
  jingran: 64.3,
  jinhsi: 50.7,
  jiyan: 61.3,
  lingyang: 75.6,
  lucilla: 62.5,
  lucy: 69.0,
  lupa: 69.8,
  luuk_herssen: 62.3,
  luuk: 62.3,
  lynae: 65.5,
  mornye: 68.3,
  phoebe: 67.5,
  phrolova: 67.1,
  qingxiao: 59.3,
  qiuyuan: 62.8,
  rebecca: 61.5,
  roccia: 68.3,
  shorekeeper: 65.9,
  sigrika: 53.1,
  suisui: 57.0,
  verina: 58.4,
  xiangli_yao: 62.7,
  xiangliyao: 62.7,
  yangyang_xuanling: 66.8,
  yangyang_xl: 66.8,
  yangyang: 66.8,
  yinlin: 80.2,
  zani: 58.6,
  zhezhi: 51.5,
};

export function getVideoFocalPoint(charId?: string, cutsceneUrl?: string): number {
  if (charId) {
    const exact = charId.toLowerCase();
    const normalized = exact.replace(/[\s_-]+/g, "");
    if (VIDEO_FOCAL_POINTS[exact] !== undefined) return VIDEO_FOCAL_POINTS[exact];
    if (VIDEO_FOCAL_POINTS[normalized] !== undefined) return VIDEO_FOCAL_POINTS[normalized];
  }

  if (cutsceneUrl) {
    // Try to extract character identifier from url (e.g. ".../cutscenes/changli.mp4" or "https://.../changli.mp4")
    const cleanUrl = cutsceneUrl.split("?")[0];
    const match = cleanUrl.match(/\/([a-zA-Z0-9_\s-]+)\.(?:mp4|webm)/i);
    if (match && match[1]) {
      const extracted = match[1].toLowerCase();
      const normalized = extracted.replace(/[\s_-]+/g, "");
      if (VIDEO_FOCAL_POINTS[extracted] !== undefined) return VIDEO_FOCAL_POINTS[extracted];
      if (VIDEO_FOCAL_POINTS[normalized] !== undefined) return VIDEO_FOCAL_POINTS[normalized];
    }
  }

  return 50;
}

