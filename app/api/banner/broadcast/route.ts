import { NextRequest, NextResponse } from "next/server";
import { dispatchBannerBroadcast } from "@/lib/discord/bannerBroadcast";
export const dynamic = "force-dynamic";

async function handleBroadcast(request: NextRequest) {
  try {
    // 1. Authorization check (supports both Vercel CRON_SECRET and custom BROADCAST_SECRET)
    const secret = process.env.CRON_SECRET || process.env.BROADCAST_SECRET;
    if (secret) {
      const authHeader =
        request.headers.get("x-broadcast-secret") ||
        request.headers.get("authorization");
      const urlSecret = new URL(request.url).searchParams.get("secret");

      const isAuthorized =
        authHeader === secret ||
        authHeader === `Bearer ${secret}` ||
        urlSecret === secret;

      if (!isAuthorized) {
        return NextResponse.json(
          { success: false, error: "Unauthorized: Invalid or missing broadcast secret" },
          { status: 401 }
        );
      }
    }

    // 2. Query param options (e.g. ?force=true for manual testing)
    const url = new URL(request.url);
    const force = url.searchParams.get("force") === "true";

    // 3. Dispatch broadcast with half-hourly cycle deduplication
    const result = await dispatchBannerBroadcast({ force });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("Banner broadcast handler error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to broadcast banner update" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleBroadcast(request);
}

export async function POST(request: NextRequest) {
  return handleBroadcast(request);
}
