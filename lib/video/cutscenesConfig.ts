/**
 * Cloudflare R2 Cutscenes Configuration & Static Manifest
 *
 * Keeps cutscene video assets hosted on Cloudflare R2 edge CDN with $0 egress bandwidth,
 * avoiding Vercel serverless function limits and storage quotas.
 * Supports automatic fallback to local video streaming if offline or during local development.
 */

export const DEFAULT_R2_BASE_URL = "https://pub-abcdd91baa4c4547bd65f9408d7b541e.r2.dev";

export function getR2BaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || DEFAULT_R2_BASE_URL;
  if (
    !envUrl ||
    envUrl.trim() === "local" ||
    envUrl.trim() === ""
  ) {
    return "";
  }
  return envUrl.trim().replace(/\/+$/, "");
}

/**
 * Complete list of character cutscene video files stored in Cloudflare R2.
 */
export const CUTSCENE_FILES = [
  "aalto.mp4",
  "aemeath.mp4",
  "augusta.mp4",
  "baizhi.mp4",
  "brant.mp4",
  "buling.mp4",
  "calcharo.mp4",
  "camellya.mp4",
  "cantarella.mp4",
  "carlotta.mp4",
  "cartethyia.mp4",
  "changli.mp4",
  "chisa.mp4",
  "chixia.mp4",
  "ciaccona.mp4",
  "danjin.mp4",
  "denia.mp4",
  "encore.mp4",
  "galbrena.mp4",
  "hiyuki.mp4",
  "iuno.mp4",
  "jianxin.mp4",
  "jingran.mp4",
  "jinhsi.mp4",
  "jiyan.mp4",
  "lingyang.mp4",
  "lucilla.mp4",
  "lucy.mp4",
  "lumi.mp4",
  "lupa.mp4",
  "luuk_herssen.mp4",
  "lynae.mp4",
  "mornye.mp4",
  "mortefi.mp4",
  "phoebe.mp4",
  "phrolova.mp4",
  "qingxiao.mp4",
  "qiuyuan.mp4",
  "rebecca.mp4",
  "roccia.mp4",
  "sanhua.mp4",
  "shorekeeper.mp4",
  "sigrika.mp4",
  "suisui.mp4",
  "taoqi.mp4",
  "verina.mp4",
  "xiangli_yao.mp4",
  "yangyang.mp4",
  "yangyang_xuanling.mp4",
  "yinlin.mp4",
  "youhu.mp4",
  "yuanwu.mp4",
  "zani.mp4",
  "zhezhi.mp4",
] as const;

export type CutsceneFileName = typeof CUTSCENE_FILES[number];

/**
 * Builds a lookup manifest mapping character IDs / file keys to their full Cloudflare R2 streaming URLs,
 * or local /api/video endpoints if local mode is active.
 */
export function buildCutscenesManifest(customBaseUrl?: string): Record<string, string> {
  const base = customBaseUrl !== undefined ? customBaseUrl : getR2BaseUrl();
  const manifest: Record<string, string> = {};

  for (const file of CUTSCENE_FILES) {
    const baseName = file.substring(0, file.lastIndexOf(".")).toLowerCase();
    const normalized = baseName.replace(/[\s_-]+/g, "");
    const fullUrl = base
      ? `${base.replace(/\/+$/, "")}/${file}`
      : `/api/video?path=${encodeURIComponent(`cutscenes/${file}`)}`;

    manifest[baseName] = fullUrl;
    manifest[normalized] = fullUrl;
    manifest[file.toLowerCase()] = fullUrl;
  }

  return manifest;
}

/**
 * Resolves a character ID to its Cloudflare R2 cutscene video URL or local /api/video fallback.
 */
export function getR2CutsceneUrl(charId: string, customBaseUrl?: string): string | null {
  if (!charId) return null;
  const base = customBaseUrl !== undefined ? customBaseUrl : getR2BaseUrl();
  const exact = charId.toLowerCase();
  const normalized = exact.replace(/[\s_-]+/g, "");

  // Match against known cutscenes list
  for (const file of CUTSCENE_FILES) {
    const baseName = file.substring(0, file.lastIndexOf(".")).toLowerCase();
    const normFile = baseName.replace(/[\s_-]+/g, "");
    if (baseName === exact || normFile === normalized) {
      return base
        ? `${base.replace(/\/+$/, "")}/${file}`
        : `/api/video?path=${encodeURIComponent(`cutscenes/${file}`)}`;
    }
  }

  return base
    ? `${base.replace(/\/+$/, "")}/${exact}.mp4`
    : `/api/video?path=${encodeURIComponent(`cutscenes/${exact}.mp4`)}`;
}

/**
 * Resolves the Convene summoning meteor animation video URL (5-star gold or 4-star purple).
 */
export function getSummoningVideoUrl(rarity: number): string {
  const base = getR2BaseUrl();
  const filename = rarity === 5 ? "gacha_gold_5star.mp4" : "gacha_purple_4star.mp4";
  if (base) {
    return `${base}/${filename}`;
  }
  return `/api/video?path=${encodeURIComponent(`assets/videos/${filename}`)}`;
}

/**
 * Fallback local path for summoning meteor animation video.
 */
export function getLocalSummoningVideoFallback(rarity: number): string {
  const filename = rarity === 5 ? "gacha_gold_5star.mp4" : "gacha_purple_4star.mp4";
  return `/api/video?path=${encodeURIComponent(`assets/videos/${filename}`)}`;
}

/**
 * List of summoning animations to preload.
 */
export function getSummoningVideosToPreload(): string[] {
  return [
    getSummoningVideoUrl(5),
    getSummoningVideoUrl(4),
  ];
}

