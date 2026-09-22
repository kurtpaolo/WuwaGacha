import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentBannerInfo,
  buildDiscordBannerPayload,
} from "@/lib/discord/discordEmbeds";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const host = request.headers.get("host") || "";
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const baseUrl = host ? `${proto}://${host}` : undefined;

    const bannerInfo = getCurrentBannerInfo(Date.now(), baseUrl);
    const discordPayload = buildDiscordBannerPayload(Date.now(), baseUrl);

    return NextResponse.json(
      {
        success: true,
        ...bannerInfo,
        discordPayload,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error: any) {
    console.error("Failed to generate banner rotation payload:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
