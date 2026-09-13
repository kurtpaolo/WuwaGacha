import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/sqlite";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const db = getDatabase();
    const userId = "default_rover";

    db.exec("BEGIN IMMEDIATE TRANSACTION;");
    // Clear history and inventory
    db.prepare("DELETE FROM history WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM inventory WHERE user_id = ?").run(userId);

    // Reset pity counters
    db.prepare(`
      UPDATE pity_state
      SET pity_5_star = 0, pity_4_star = 0, guaranteed_limited = 0, guaranteed_featured_4_star = 0
      WHERE user_id = ?
    `).run(userId);

    // Reset balances
    db.prepare(`
      UPDATE users
      SET astrite = 16000,
          radiant_tide = 20,
          forging_tide = 20,
          lustrous_tide = 20,
          afterglow_coral = 45,
          oscillated_coral = 320,
          is_sandbox = 0
      WHERE id = ?
    `).run(userId);

    db.exec("COMMIT;");

    return NextResponse.json({ success: true, message: "System state reset successfully" });
  } catch (error: any) {
    console.error("POST /api/user/reset error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
