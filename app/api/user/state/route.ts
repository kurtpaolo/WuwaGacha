import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/sqlite";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const db = getDatabase();
    const userId = "default_rover";

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const pities = db.prepare("SELECT * FROM pity_state WHERE user_id = ?").all(userId) as any[];
    const pityMap: Record<string, any> = {};
    for (const p of pities) {
      pityMap[p.banner_type] = {
        pity5Star: p.pity_5_star,
        pity4Star: p.pity_4_star,
        guaranteedLimited: Boolean(p.guaranteed_limited),
        guaranteedFeatured4Star: Boolean(p.guaranteed_featured_4_star),
      };
    }

    return NextResponse.json({
      user: {
        id: user.id,
        astrite: user.astrite,
        radiantTide: user.radiant_tide,
        forgingTide: user.forging_tide,
        lustrousTide: user.lustrous_tide,
        afterglowCoral: user.afterglow_coral,
        oscillatedCoral: user.oscillated_coral,
        isSandbox: Boolean(user.is_sandbox),
        selectedLimitedChar: user.selected_limited_char || "changli",
      },
      pity: pityMap,
    });
  } catch (error: any) {
    console.error("GET /api/user/state error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, selectedChar, isSandbox, addAstrite, addTides, updates } = body;
    const db = getDatabase();
    const userId = "default_rover";

    if (action === "select_character" && selectedChar) {
      db.prepare("UPDATE users SET selected_limited_char = ? WHERE id = ?").run(selectedChar, userId);
    } else if (action === "toggle_sandbox") {
      db.prepare("UPDATE users SET is_sandbox = ? WHERE id = ?").run(isSandbox ? 1 : 0, userId);
    } else if (action === "grant_currency") {
      db.prepare(`
        UPDATE users
        SET astrite = astrite + ?,
            radiant_tide = radiant_tide + ?,
            forging_tide = forging_tide + ?,
            lustrous_tide = lustrous_tide + ?
        WHERE id = ?
      `).run(addAstrite || 0, addTides || 0, addTides || 0, addTides || 0, userId);
    } else if (action === "set_currency" && updates) {
      const allowedCols = ["astrite", "radiant_tide", "forging_tide", "lustrous_tide", "afterglow_coral", "oscillated_coral"];
      for (const [key, val] of Object.entries(updates)) {
        if (allowedCols.includes(key) && typeof val === "number") {
          db.prepare(`UPDATE users SET ${key} = ? WHERE id = ?`).run(Math.max(0, val), userId);
        }
      }
    } else if (action === "reset_wallet") {
      db.prepare(`
        UPDATE users
        SET astrite = 16000,
            radiant_tide = 20,
            forging_tide = 20,
            lustrous_tide = 20,
            afterglow_coral = 45,
            oscillated_coral = 320
        WHERE id = ?
      `).run(userId);
    }

    // Return updated state
    return GET(request);
  } catch (error: any) {
    console.error("POST /api/user/state error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
