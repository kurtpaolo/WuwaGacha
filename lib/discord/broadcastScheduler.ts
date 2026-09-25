import { dispatchBannerBroadcast } from "./bannerBroadcast";
import { getTimeUntilNextRotation } from "@/lib/gacha/bannerRotation";

const globalState = globalThis as unknown as {
  __broadcastSchedulerTimeout?: NodeJS.Timeout | null;
  __broadcastSchedulerRunning?: boolean;
};

/**
 * Starts a precise half-hourly timer that triggers exactly at :00:01 and :30:01 (GMT+8).
 * Ensures that long-running Next.js / Node.js server processes automatically broadcast
 * banner updates without needing external cron requests.
 */
export function startBroadcastScheduler() {
  // On Vercel serverless environments, background timers freeze and thaw unpredictably during requests.
  // Half-hourly broadcasts in production are handled by GitHub Actions cron (.github/workflows/banner_broadcast.yml).
  if (process.env.VERCEL) {
    return;
  }

  if (globalState.__broadcastSchedulerRunning) return;
  globalState.__broadcastSchedulerRunning = true;

  function scheduleNextTick() {
    if (globalState.__broadcastSchedulerTimeout) {
      clearTimeout(globalState.__broadcastSchedulerTimeout);
      globalState.__broadcastSchedulerTimeout = null;
    }

    const { minutes, seconds } = getTimeUntilNextRotation();
    // Wait until 1 second after rotation (:00:01 or :30:01) to ensure the deterministic cycle has flipped
    const msUntilNext = Math.max(1000, (minutes * 60 + seconds + 1) * 1000);

    console.log(
      `[BroadcastScheduler] Next half-hourly banner rotation scheduled in ${minutes}m ${seconds}s (${Math.round(
        msUntilNext / 1000
      )}s).`
    );

    globalState.__broadcastSchedulerTimeout = setTimeout(async () => {
      try {
        console.log(`[BroadcastScheduler] Half-hourly tick reached! Dispatching banner broadcast...`);
        const res = await dispatchBannerBroadcast();
        console.log(`[BroadcastScheduler] Result: ${res.message} (Dispatched: ${res.dispatched}, Skipped: ${res.skipped})`);
      } catch (err) {
        console.error(`[BroadcastScheduler] Failed during auto-broadcast:`, err);
      } finally {
        scheduleNextTick();
      }
    }, msUntilNext);
  }

  scheduleNextTick();
}

export function stopBroadcastScheduler() {
  if (globalState.__broadcastSchedulerTimeout) {
    clearTimeout(globalState.__broadcastSchedulerTimeout);
    globalState.__broadcastSchedulerTimeout = null;
  }
  globalState.__broadcastSchedulerRunning = false;
}
