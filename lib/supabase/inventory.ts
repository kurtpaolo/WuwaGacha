import { supabase, isSupabaseConfigured } from "./client";

export const STANDARD_5_STAR_LOSSES = [
  "verina",
  "calcharo",
  "encore",
  "jianxin",
  "lingyang",
] as const;

export const MAX_WAVEBAND_COUNT = 7; // 1 base (S0) + 6 duplicate wavebands = S6 max

export interface UserInventoryItem {
  id: string;
  character_id: string;
  character_name: string;
  count: number; // 1 to 7
  first_pulled_at: string;
  last_pulled_at: string;
}

export function formatWavebandLabel(count: number): string {
  const wavebands = Math.max(0, Math.min(6, count - 1));
  if (wavebands === 0) return "S0";
  if (wavebands >= 6) return "S6 MAX";
  return `S${wavebands}`;
}

/**
 * Fetch a user's inventory of featured 5-star resonators.
 */
export async function fetchUserInventory(userId: string): Promise<UserInventoryItem[]> {
  if (!isSupabaseConfigured() || !userId) return [];

  try {
    const { data, error } = await supabase
      .from("user_inventory")
      .select("*")
      .eq("user_id", userId)
      .order("last_pulled_at", { ascending: false });

    if (error) {
      console.error("Error fetching user inventory:", error);
      return [];
    }

    return (data || []) as UserInventoryItem[];
  } catch (err) {
    console.error("Exception fetching inventory:", err);
    return [];
  }
}

/**
 * Saves or updates a featured 5-star resonator pull in Supabase.
 * Strictly enforces:
 * - NO weapons
 * - NO standard 5-star loss characters (Verina, Calcharo, Encore, Jianxin, Lingyang)
 * - NO records beyond S6 (count capped at 7). Any pull beyond S6 is discarded.
 */
export async function saveFeaturedResonatorPull(
  userId: string,
  characterId: string,
  characterName: string,
  addCopies: number = 1
): Promise<{ saved: boolean; count: number; cappedAtS6: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !userId) {
    return { saved: false, count: 0, cappedAtS6: false };
  }

  // Safety check 1: Reject standard 5-star loss resonators
  if (STANDARD_5_STAR_LOSSES.includes(characterId.toLowerCase() as any)) {
    return { saved: false, count: 0, cappedAtS6: false, error: "50/50 loss excluded" };
  }

  try {
    // 1. Check existing record
    const { data: existing, error: selectErr } = await supabase
      .from("user_inventory")
      .select("id, count")
      .eq("user_id", userId)
      .eq("character_id", characterId)
      .maybeSingle();

    if (selectErr && selectErr.code !== "PGRST116") {
      console.error("Error checking inventory count:", selectErr);
    }

    // 2. If already S6 (count >= 7), do NOT save or increment further
    if (existing && existing.count >= MAX_WAVEBAND_COUNT) {
      return { saved: false, count: MAX_WAVEBAND_COUNT, cappedAtS6: true };
    }

    const currentCount = existing ? existing.count : 0;
    const nextCount = Math.min(MAX_WAVEBAND_COUNT, currentCount + addCopies);

    // 3. Direct update by ID if existing, or insert if new
    if (existing && existing.id) {
      const { error: updateErr } = await supabase
        .from("user_inventory")
        .update({
          count: nextCount,
          last_pulled_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await supabase
        .from("user_inventory")
        .insert({
          user_id: userId,
          character_id: characterId,
          character_name: characterName,
          count: nextCount,
          last_pulled_at: new Date().toISOString(),
        });

      if (insertErr) {
        // Fallback to upsert if concurrent insert collided
        const { error: upsertErr } = await supabase
          .from("user_inventory")
          .upsert(
            {
              user_id: userId,
              character_id: characterId,
              character_name: characterName,
              count: nextCount,
              last_pulled_at: new Date().toISOString(),
            },
            { onConflict: "user_id,character_id" }
          );
        if (upsertErr) throw upsertErr;
      }
    }

    return { saved: true, count: nextCount, cappedAtS6: nextCount >= MAX_WAVEBAND_COUNT };
  } catch (err: any) {
    console.error("Failed to save resonator to Supabase inventory:", err);
    return { saved: false, count: 0, cappedAtS6: false, error: err.message };
  }
}

/**
 * HARD DELETES specified resonator records from a user's inventory in Supabase.
 * Completely clears rows matching user_id and character_id from the database.
 */
export async function deleteUserInventoryItems(
  userId: string,
  characterIds: string[]
): Promise<boolean> {
  if (!isSupabaseConfigured() || !userId || characterIds.length === 0) return true;

  try {
    const { data, error } = await supabase
      .from("user_inventory")
      .delete()
      .eq("user_id", userId)
      .in("character_id", characterIds)
      .select();

    if (error) {
      console.error("Error hard deleting user inventory items from database:", error);
      return false;
    }

    console.log("Successfully hard-deleted items from database:", data);
    return true;
  } catch (err) {
    console.error("Exception hard deleting inventory items from database:", err);
    return false;
  }
}

/**
 * HARD DELETES ALL resonator records for a user from Supabase.
 * Completely clears all inventory rows for the user from the database.
 */
export async function clearAllUserInventory(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !userId) return true;

  try {
    const { data, error } = await supabase
      .from("user_inventory")
      .delete()
      .eq("user_id", userId)
      .select();

    if (error) {
      console.error("Error hard clearing all user inventory from database:", error);
      return false;
    }

    console.log("Successfully hard cleared all inventory from database:", data);
    return true;
  } catch (err) {
    console.error("Exception hard clearing user inventory from database:", err);
    return false;
  }
}

