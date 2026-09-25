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

  // Try to query with last_broadcast_cycle & last_broadcast_at columns if they exist in Supabase
  let hasCycleCol = true;
  let webhooks: any[] = [];
  const { data: hooksWithCycle, error: dbError } = await supabase
    .from("discord_webhooks")
    .select("id, url, name, is_active, last_broadcast_cycle, last_broadcast_at")
    .eq("is_active", true);

  if (dbError) {
    if (
      dbError.code === "42703" ||
      dbError.message?.includes("last_broadcast_cycle") ||
      dbError.message?.includes("last_broadcast_at")
    ) {
      // Columns do not exist in DB yet, query without them
      hasCycleCol = false;
      const { data: fallbackHooks, error: fallbackErr } = await supabase
        .from("discord_webhooks")
        .select("id, url, name, is_active")
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

  // Deduplicate active webhooks by URL to ensure each distinct webhook destination is only called once
  const uniqueWebhooksMap = new Map<string, any>();
  for (const h of webhooks) {
    const normUrl = (h.url || "").trim().toLowerCase();
    if (normUrl && !uniqueWebhooksMap.has(normUrl)) {
      uniqueWebhooksMap.set(normUrl, h);
    }
  }
  const uniqueWebhooks = Array.from(uniqueWebhooksMap.values());

  if (uniqueWebhooks.length === 0) {
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

  // Filter only webhooks that have NOT yet received a broadcast for this cycle
  const hooksToNotify = force
    ? uniqueWebhooks
    : uniqueWebhooks.filter((hook) => {
        const matchCycle = hasCycleCol && (hook.last_broadcast_cycle ?? -1) === currentCycle;
        const recentSend =
          hook.last_broadcast_at &&
          nowMs - new Date(hook.last_broadcast_at).getTime() < 15 * 60 * 1000;
        return !matchCycle && !recentSend;
      });

  if (hooksToNotify.length === 0) {
    globalBroadcast.__lastBroadcastCycle = currentCycle;
    globalBroadcast.__lastBroadcastTimestamp = nowMs;
    return {
      success: true,
      message: `All ${uniqueWebhooks.length} webhook(s) have already received broadcast for cycle ${currentCycle}. Skipping duplicate send.`,
      dispatched: 0,
      failed: 0,
      total: uniqueWebhooks.length,
      skipped: true,
      currentCycle,
    };
  }

  // Pre-lock in DB to prevent concurrent lambda race conditions (only if columns exist)
  if (hasCycleCol && hooksToNotify.length > 0) {
    try {
      await supabase
        .from("discord_webhooks")
        .update({
          last_broadcast_cycle: currentCycle,
          last_broadcast_at: new Date(nowMs).toISOString(),
        })
        .in("id", hooksToNotify.map((h: any) => h.id));
    } catch (err) {
      console.warn("Failed to pre-lock broadcast cycle in DB:", err);
    }
  }

  // Dispatch notifications concurrently to unique un-notified webhooks
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
    total: uniqueWebhooks.length,
    skipped: false,
    currentCycle,
  };
}
