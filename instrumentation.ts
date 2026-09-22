export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startBroadcastScheduler } = await import("./lib/discord/broadcastScheduler");
    startBroadcastScheduler();
  }
}
