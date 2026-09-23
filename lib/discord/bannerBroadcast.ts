import { getSupabase } from "@/lib/supabase/client";
import { sendDiscordBannerNotification } from "@/lib/discord/discordEmbeds";
import { getCurrentRotationIndex } from "@/lib/gacha/bannerRotation";

// Global cycle debounce to prevent rapid duplicate broadcasts across chunks or processes
const globalBroadcast = globalThis as unknown as {
  __lastBroadcastCycle?: number;
  __lastBroadcastTimestamp?: number;
};

export interface BroadcastResult {
  success: boolean;
  message: string;
  dispatched: number;
  failed: number;
  total: number;
  skipped: boolean;
  currentCycle: number;
}

/**
 * Dispatches the current 3-card banner composite image to all active Discord webhooks.
 * Features automated half-hourly cycle deduplication:
 * - Checks if the current cycle (xx:00 or xx:30 GMT+8) was already broadcasted.
 * - If not forced, skips already-notified webhooks to prevent duplicate spam.
 */
export async function dispatchBannerBroadcast(options?: {
  force?: boolean;
}): Promise<BroadcastResult> {
  const nowMs = Date.now();
  const currentCycle = getCurrentRotationIndex(nowMs);
  const force = options?.force ?? false;

  const lastCycle = globalBroadcast.__lastBroadcastCycle ?? -1;
  const lastTime = globalBroadcast.__lastBroadcastTimestamp ?? 0;
  const isWithinCooldown = nowMs - lastTime < 15 * 60 * 1000;

  // Global cycle debounce: skip if already sent for this cycle within 15 minutes unless forced
  if (!force && (lastCycle === currentCycle || (isWithinCooldown && lastTime > 0))) {
    return {
      success: true,
      message: `Broadcast already completed for cycle ${currentCycle} (last sent ${Math.round((nowMs - lastTime) / 1000)}s ago).`,
      dispatched: 0,
      failed: 0,
      total: 0,
      skipped: true,
      currentCycle,
    };
  }

  const supabase = getSupabase();

  // Try to query with last_broadcast_cycle column if it exists in Supabase
  let hasCycleCol = true;
  let webhooks: any[] = [];
  const { data: hooksWithCycle, error: dbError } = await supabase
    .from("discord_webhooks")
    .select("id, url, name, is_active, last_broadcast_cycle, last_broadcast_at")
    .eq("is_active", true);

  if (dbError) {
    if (dbError.code === "42703" || dbError.message?.includes("last_broadcast_cycle")) {
      // Column does not exist in DB yet, query without it
      hasCycleCol = false;
      const { data: fallbackHooks, error: fallbackErr } = await supabase
        .from("discord_webhooks")
        .select("id, url, name, is_active, last_broadcast_at")
        .eq("is_active", true);
      if (fallbackErr) {
        throw new Error(`Database error: ${fallbackErr.message}`);
      }
      webhooks = fallbackHooks || [];
    } else {
      throw new Error(`Database error: ${dbError.message}`);
    }
  } else {
    webhooks = hooksWithCycle || [];
  }

  if (webhooks.length === 0) {
    return {
      success: true,
      message: "No active Discord webhooks configured.",
      dispatched: 0,
      failed: 0,
      total: 0,
      skipped: false,
      currentCycle,
    };
  }

  // Check persistent DB state across all serverless instances
  if (!force) {
    const alreadyBroadcasted = webhooks.some((h) => {
      const matchCycle = hasCycleCol && (h.last_broadcast_cycle ?? -1) === currentCycle;
      const recentSend = h.last_broadcast_at && (nowMs - new Date(h.last_broadcast_at).getTime() < 20 * 60 * 1000);
      return matchCycle || recentSend;
    });

    if (alreadyBroadcasted) {
      globalBroadcast.__lastBroadcastCycle = currentCycle;
      globalBroadcast.__lastBroadcastTimestamp = nowMs;
      return {
        success: true,
        message: `Cycle ${currentCycle} was already broadcasted. Skipping duplicate send.`,
        dispatched: 0,
        failed: 0,
        total: webhooks.length,
        skipped: true,
        currentCycle,
      };
    }
  }

  // Pre-lock in DB to prevent concurrent lambda race conditions
  try {
    const updatePayload: Record<string, any> = {
      last_broadcast_at: new Date(nowMs).toISOString(),
    };
    if (hasCycleCol) {
      updatePayload.last_broadcast_cycle = currentCycle;
    }
    await supabase
      .from("discord_webhooks")
      .update(updatePayload)
      .in("id", webhooks.map((h: any) => h.id));
  } catch (err) {
    console.warn("Failed to pre-lock broadcast cycle in DB:", err);
  }

  const hooksToNotify = webhooks;

  // Dispatch notifications concurrently
  const dispatchPromises = hooksToNotify.map(async (hook) => {
    const res = await sendDiscordBannerNotification(hook.url, nowMs);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Webhook ${hook.name} (${hook.id}) failed with status ${res.status}: ${text.slice(0, 100)}`
      );
    }
    return { id: hook.id, name: hook.name, status: res.status };
  });

  const results = await Promise.allSettled(dispatchPromises);
  const successfulHooks = results
    .map((r, i) => (r.status === "fulfilled" ? hooksToNotify[i] : null))
    .filter(Boolean);

  // Update DB records for successful hooks if column exists
  if (hasCycleCol && successfulHooks.length > 0) {
    try {
      const successfulIds = successfulHooks.map((h: any) => h.id);
      await supabase
        .from("discord_webhooks")
        .update({
          last_broadcast_cycle: currentCycle,
          last_broadcast_at: new Date(nowMs).toISOString(),
        })
        .in("id", successfulIds);
    } catch (err) {
      console.warn("Failed to update last_broadcast_cycle in DB:", err);
    }
  }

  globalBroadcast.__lastBroadcastCycle = currentCycle;
  globalBroadcast.__lastBroadcastTimestamp = nowMs;

  const successful = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return {
    success: true,
    message: `Broadcast finished: ${successful} succeeded, ${failed} failed.`,
    dispatched: successful,
    failed,
    total: webhooks.length,
    skipped: false,
    currentCycle,
  };
}
