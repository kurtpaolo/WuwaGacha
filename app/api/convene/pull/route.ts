import { NextResponse } from "next/server";
import { executeConvene } from "@/lib/gacha/engine";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bannerType = "character_limited", count = 10 } = body;

    if (count !== 1 && count !== 10) {
      return NextResponse.json({ error: "Count must be 1 or 10" }, { status: 400 });
    }

    const validBannerTypes = [
      "character_limited",
      "weapon_limited",
      "character_standard",
      "weapon_standard",
      "beginner",
    ];

    if (!validBannerTypes.includes(bannerType)) {
      return NextResponse.json({ error: "Invalid banner type" }, { status: 400 });
    }

    const userId = "default_rover";
    const conveneResult = executeConvene(userId, bannerType, count);

    return NextResponse.json(conveneResult);
  } catch (error: any) {
    console.error("POST /api/convene/pull error:", error);
    return NextResponse.json({ error: error.message || "Convene failed" }, { status: 400 });
  }
}
