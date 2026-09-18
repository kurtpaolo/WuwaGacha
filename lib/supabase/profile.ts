import { supabase, isSupabaseConfigured } from "./client";
import { getHourlyRotatedCharacters } from "@/lib/gacha/bannerRotation";


export interface UserProfile {
  id: string;
  username: string;
  astrite: number;
  pity_5star: number;
  pity_4star: number;
  guaranteed_limited: boolean;
  guaranteed_featured_4: boolean;
  selected_char_id: string;
  avatar_id?: string;
  custom_title?: string;
  claimed_title_ids?: string[];
  showcase_ids?: string[];
  total_pulls?: number;
  wins_5050?: number;
  total_5050?: number;
  last_tacet_claim?: string;
  is_vip?: boolean;
  login_streak?: number;
  max_login_streak?: number;
  last_login_date?: string;
}

export const DEFAULT_PROFILE: UserProfile = {
  id: "",
  username: "Player",
  astrite: 25600, // 160 pulls newbie starting bonus (160 * 160)
  pity_5star: 0,
  pity_4star: 0,
  guaranteed_limited: false,
  guaranteed_featured_4: false,
  selected_char_id: getHourlyRotatedCharacters()[0] || "shorekeeper",
  avatar_id: "shorekeeper",
  custom_title: "The Rover",
  claimed_title_ids: ["the_rover"],
  showcase_ids: [],
  total_pulls: 0,
  wins_5050: 0,
  total_5050: 0,
  last_tacet_claim: new Date().toISOString(),
  is_vip: false,
  login_streak: 1,
  max_login_streak: 1,
  last_login_date: "",
};

/**
 * Fetch a user's cloud profile (Astrite, Pity, Guarantees, Showcase, Avatar, Title).
 * If profile doesn't exist yet, creates it.
 */
export async function fetchUserProfile(
  userId: string,
  fallbackUsername: string = "Player"
): Promise<UserProfile | null> {
  if (!isSupabaseConfigured() || !userId) return null;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching user profile:", error);
    }

    if (data) {
      const customTitle = data.custom_title || "The Rover";
      const avatarId = data.avatar_id || "shorekeeper";
      const claimedTitleIds: string[] = Array.isArray(data.claimed_title_ids)
        ? [...data.claimed_title_ids]
        : ["the_rover"];
      if (!claimedTitleIds.includes("the_rover")) {
        claimedTitleIds.push("the_rover");
      }

      const isVip = Boolean(data.is_vip);

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`wuwa_title_${userId}`, customTitle);
          localStorage.setItem(`wuwa_avatar_${userId}`, avatarId);
          localStorage.setItem(`wuwa_claimed_titles_${userId}`, JSON.stringify(claimedTitleIds));
          localStorage.setItem(`wuwa_is_vip_${userId}`, String(isVip));
          // Purge dangerous shared cross-account keys if present
          localStorage.removeItem("wuwa_active_title");
          localStorage.removeItem("wuwa_active_avatar");
        } catch {}
      }

      return {
        id: data.id,
        username: data.username || fallbackUsername,
        astrite: Math.max(0, data.astrite ?? 25600),
        pity_5star: Math.min(80, Math.max(0, data.pity_5star ?? 0)),
        pity_4star: Math.min(10, Math.max(0, data.pity_4star ?? 0)),
        guaranteed_limited: Boolean(data.guaranteed_limited),
        guaranteed_featured_4: Boolean(data.guaranteed_featured_4),
        selected_char_id: data.selected_char_id || "shorekeeper",
        avatar_id: avatarId,
        custom_title: customTitle,
        claimed_title_ids: claimedTitleIds,
        showcase_ids: Array.isArray(data.showcase_ids) ? data.showcase_ids : [],
        total_pulls: data.total_pulls ?? 0,
        wins_5050: data.wins_5050 ?? 0,
        total_5050: data.total_5050 ?? 0,
        last_tacet_claim: data.last_tacet_claim || new Date().toISOString(),
        is_vip: isVip,
      };
    }

    // If not found, create new profile with 160 pulls (25,600 Astrite)
    const newProfile = {
      id: userId,
      username: fallbackUsername,
      astrite: 25600,
      pity_5star: 0,
      pity_4star: 0,
      guaranteed_limited: false,
      guaranteed_featured_4: false,
      selected_char_id: "shorekeeper",
      avatar_id: "shorekeeper",
      custom_title: "The Rover",
      claimed_title_ids: ["the_rover"],
      total_pulls: 0,
      wins_5050: 0,
      total_5050: 0,
      last_tacet_claim: new Date().toISOString(),
    };

    const { error: insertErr } = await supabase.from("profiles").upsert(newProfile);
    if (insertErr) {
      console.error("Error creating initial profile:", insertErr);
    }

    return newProfile;
  } catch (err) {
    console.error("Exception fetching profile:", err);
    return null;
  }
}

const getPendingSyncKey = (userId: string) => `wuwa_pending_profile_sync_${userId}`;

interface PendingProfileSync {
  userId: string;
  updates: Partial<UserProfile>;
  timestamp: number;
}

/**
 * Queues a failed or offline profile update to localStorage for auto-retry upon reconnection.
 */
export function queuePendingProfileSync(userId: string, updates: Partial<UserProfile>): void {
  if (typeof window === "undefined" || !userId) return;
  const key = getPendingSyncKey(userId);
  try {
    const existingRaw = localStorage.getItem(key);
    let queue: PendingProfileSync = {
      userId,
      updates: {},
      timestamp: Date.now(),
    };
    if (existingRaw) {
      try {
        const parsed = JSON.parse(existingRaw);
        if (parsed && parsed.userId === userId && parsed.updates) {
          queue = parsed;
        }
      } catch {}
    }
    // Merge latest updates into queue
    queue.updates = { ...queue.updates, ...updates };
    queue.timestamp = Date.now();
    localStorage.setItem(key, JSON.stringify(queue));
    // Purge legacy shared queue
    localStorage.removeItem("wuwa_pending_profile_sync_v1");
  } catch (e) {
    console.debug("Failed to queue pending profile sync:", e);
  }
}

/**
 * Flushes any pending profile updates from localStorage to Supabase.
 */
export async function flushPendingProfileSync(userId: string): Promise<boolean> {
  if (typeof window === "undefined" || !userId || !isSupabaseConfigured()) return false;
  const key = getPendingSyncKey(userId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const parsed: PendingProfileSync = JSON.parse(raw);
    if (!parsed || parsed.userId !== userId || !parsed.updates) return false;

    // Clear queue before executing to prevent cyclic retries
    localStorage.removeItem(key);
    await updateUserProfile(userId, parsed.updates, true);
    return true;
  } catch (e) {
    console.debug("Failed to flush pending profile sync:", e);
    return false;
  }
}

/**
 * Updates a user's cloud profile with strict Astrite capping.
 * Automatically queues failed/offline updates for resilient auto-retry.
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>,
  isFlush: boolean = false
): Promise<void> {
  if (!isSupabaseConfigured() || !userId) return;

  try {
    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.astrite !== undefined) {
      payload.astrite = Math.max(0, updates.astrite);
    }
    if (updates.pity_5star !== undefined) {
      payload.pity_5star = Math.min(80, Math.max(0, updates.pity_5star));
    }
    if (updates.pity_4star !== undefined) {
      payload.pity_4star = Math.min(10, Math.max(0, updates.pity_4star));
    }
    if (updates.guaranteed_limited !== undefined) {
      payload.guaranteed_limited = updates.guaranteed_limited;
    }
    if (updates.guaranteed_featured_4 !== undefined) {
      payload.guaranteed_featured_4 = updates.guaranteed_featured_4;
    }
    if (updates.selected_char_id !== undefined) {
      payload.selected_char_id = updates.selected_char_id;
    }
    if (updates.total_pulls !== undefined) {
      payload.total_pulls = Math.max(0, updates.total_pulls);
    }
    if (updates.wins_5050 !== undefined) {
      payload.wins_5050 = Math.max(0, updates.wins_5050);
    }
    if (updates.total_5050 !== undefined) {
      payload.total_5050 = Math.max(0, updates.total_5050);
    }
    if (updates.custom_title !== undefined) {
      payload.custom_title = updates.custom_title;
    }
    if (updates.avatar_id !== undefined) {
      payload.avatar_id = updates.avatar_id;
    }
    if (updates.claimed_title_ids !== undefined) {
      payload.claimed_title_ids = updates.claimed_title_ids;
    }
    if (updates.last_tacet_claim !== undefined) {
      payload.last_tacet_claim = updates.last_tacet_claim;
    }
    if (updates.login_streak !== undefined) {
      payload.login_streak = Math.max(1, updates.login_streak);
    }
    if (updates.max_login_streak !== undefined) {
      payload.max_login_streak = Math.max(1, updates.max_login_streak);
    }
    if (updates.last_login_date !== undefined) {
      payload.last_login_date = updates.last_login_date;
    }

    const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
    if (error) {
      console.error("Error updating user profile:", error);
      if (!isFlush) {
        queuePendingProfileSync(userId, updates);
      }
    }
  } catch (err) {
    console.error("Exception updating profile:", err);
    if (!isFlush) {
      queuePendingProfileSync(userId, updates);
    }
  }
}

/**
 * Retrieves the cached VIP status for a given user ID from localStorage.
 */
export function getStoredUserIsVip(userId?: string | null): boolean {
  if (typeof window === "undefined" || !userId) return false;
  try {
    return localStorage.getItem(`wuwa_is_vip_${userId}`) === "true";
  } catch {}
  return false;
}

/**
 * Retrieves the cached maximum login streak for a given user ID from localStorage.
 */
export function getStoredUserMaxStreak(userId?: string | null): number {
  if (typeof window === "undefined" || !userId) return 1;
  try {
    const raw = localStorage.getItem(`wuwa_login_streak_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.maxStreak === "number") return Math.max(1, parsed.maxStreak);
      if (typeof parsed.streak === "number") return Math.max(1, parsed.streak);
    }
  } catch {}
  return 1;
}
