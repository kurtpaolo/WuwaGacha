/**
 * Video preloading & persistent caching manager for Convene Summoning Animations and Cutscenes.
 * Uses browser CacheStorage (persistent across reloads) and in-memory Blob URLs for instant 0ms playback.
 */

import {
  buildCutscenesManifest,
  getR2CutsceneUrl,
  getR2BaseUrl,
  getSummoningVideoUrl,
  getSummoningVideosToPreload,
} from "./cutscenesConfig";

export const SUMMONING_VIDEOS = [
  getSummoningVideoUrl(5),
  getSummoningVideoUrl(4),
];

const CACHE_NAME = "wuwa-video-cache-v1";

// Cache of object URLs created from fetched video Blobs
const blobUrlCache = new Map<string, string>();
// Retained HTMLVideoElements so browser media buffer stays active and GC does not abort buffering
const preloadedElements = new Map<string, HTMLVideoElement>();
// In-memory cutscenes manifest cache pre-populated with Cloudflare R2 endpoints
let cutscenesManifest: Record<string, string> = buildCutscenesManifest();

let isPreloadingStarted = false;

/**
 * Returns a cached Blob URL for instant zero-latency playback if ready,
 * otherwise returns the original streaming URL.
 */
export function getPreloadedVideoUrl(originalUrl: string): string {
  if (blobUrlCache.has(originalUrl)) {
    return blobUrlCache.get(originalUrl)!;
  }
  // If not yet in memory blob cache, ensure background caching is initiated
  if (typeof window !== "undefined" && originalUrl) {
    cacheVideoFile(originalUrl).catch(() => {});
  }
  return originalUrl;
}

/**
 * Caches a video file using browser CacheStorage and memory Blob URL.
 * Checks CacheStorage first to avoid re-downloading videos if previously cached.
 */
export async function cacheVideoFile(url: string): Promise<string> {
  if (typeof window === "undefined" || !url) return url;

  if (blobUrlCache.has(url)) {
    return blobUrlCache.get(url)!;
  }

  // 1. Check persistent CacheStorage
  if ("caches" in window) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const matched = await cache.match(url);
      if (matched) {
        const blob = await matched.blob();
        const objectUrl = URL.createObjectURL(blob);
        blobUrlCache.set(url, objectUrl);
        return objectUrl;
      }

      // 2. Fetch and store in CacheStorage if not present
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response.clone());
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        blobUrlCache.set(url, objectUrl);
        return objectUrl;
      }
    } catch (err) {
      console.debug("CacheStorage failed/unavailable, falling back:", err);
    }
  }

  // 3. Fallback standard fetch if CacheStorage is unavailable
  try {
    const res = await fetch(url);
    if (res.ok) {
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      blobUrlCache.set(url, objectUrl);
      return objectUrl;
    }
  } catch (err) {
    console.debug("Fallback fetch failed for video:", err);
  }

  return url;
}

/**
 * Preloads a single video file using both HTML5 Video element buffering
 * and persistent CacheStorage + Blob caching.
 */
export function preloadSingleVideo(url: string) {
  if (typeof window === "undefined" || !url) return;

  // 1. Buffer via HTMLVideoElement (held in module-level Map so GC cannot abort it)
  if (!preloadedElements.has(url)) {
    try {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.src = url;
      video.load();
      preloadedElements.set(url, video);
    } catch (e) {
      console.warn("Video element preload failed for:", url, e);
    }
  }

  // 2. Store in persistent CacheStorage and memory Blob URL
  cacheVideoFile(url).then((objectUrl) => {
    const el = preloadedElements.get(url);
    if (el && objectUrl && objectUrl.startsWith("blob:")) {
      el.src = objectUrl;
      el.load();
    }
  }).catch(() => {});
}

/**
 * Fetches and caches the cutscenes index manifest from /api/cutscenes.
 */
export async function fetchCutscenesManifest(): Promise<Record<string, string>> {
  try {
    const res = await fetch("/api/cutscenes");
    const data = await res.json();
    if (data.available) {
      cutscenesManifest = { ...cutscenesManifest, ...data.available };
      return cutscenesManifest;
    }
  } catch (e) {
    console.debug("Using preloaded Cloudflare R2 cutscenes manifest:", e);
  }
  return cutscenesManifest;
}

/**
 * Returns synchronously the cached cutscenes manifest if already loaded.
 */
export function getCachedCutscenesManifest(): Record<string, string> {
  return cutscenesManifest;
}

/**
 * Helper to resolve the cutscene URL for a resonator character ID.
 */
export function getCutsceneUrlForResonator(charId: string, manifest?: Record<string, string>): string | null {
  if (!charId) return null;
  const dict = manifest && Object.keys(manifest).length > 0 ? manifest : cutscenesManifest;
  const normalized = charId.toLowerCase().replace(/[\s_-]+/g, "");
  const exact = charId.toLowerCase();
  if (dict[normalized]) return dict[normalized];
  if (dict[exact]) return dict[exact];

  // Direct Cloudflare R2 resolution
  const r2Url = getR2CutsceneUrl(charId);
  if (r2Url) return r2Url;

  return `/api/video?path=${encodeURIComponent(`cutscenes/${exact}.mp4`)}`;
}

/**
 * Initiates preloading of the summoning animation videos and cutscenes manifest immediately upon website entry.
 */
export function preloadSummoningVideos() {
  if (typeof window === "undefined") return;
  if (isPreloadingStarted) return;
  isPreloadingStarted = true;

  // 1. Fetch cutscenes manifest in background
  fetchCutscenesManifest().catch(() => {});

  // 2. Queue summoning animations into CacheStorage and memory
  SUMMONING_VIDEOS.forEach((url) => {
    preloadSingleVideo(url);
  });
}
