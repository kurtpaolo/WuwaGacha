import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/sqlite";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const bannerType = searchParams.get("bannerType");
    const offset = (page - 1) * limit;

    const db = getDatabase();
    const userId = "default_rover";

    let countQuery = "SELECT COUNT(*) as total FROM history WHERE user_id = ?";
    let dataQuery = "SELECT * FROM history WHERE user_id = ?";
    const params: any[] = [userId];

    if (bannerType && bannerType !== "all") {
      countQuery += " AND banner_type = ?";
      dataQuery += " AND banner_type = ?";
      params.push(bannerType);
    }

    const totalRes = db.prepare(countQuery).get(...params) as any;
    const total = totalRes?.total || 0;

    dataQuery += " ORDER BY created_at DESC, rowid DESC LIMIT ? OFFSET ?";
    const logs = db.prepare(dataQuery).all(...params, limit, offset);

    return NextResponse.json({
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error: any) {
    console.error("GET /api/history error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
