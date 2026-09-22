import { NextRequest, NextResponse } from "next/server";
import {
  sendDiscordBannerNotification,
  DISCORD_WEBHOOK_REGEX,
} from "@/lib/discord/discordEmbeds";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ status: "ok", endpoint: "discord_webhook_test" });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    const cleanUrl = typeof url === "string" ? url.trim().replace(/\/+$/, "") : "";

    if (!cleanUrl || !DISCORD_WEBHOOK_REGEX.test(cleanUrl)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Discord Webhook URL. It must start with https://discord.com/api/webhooks/...",
        },
        { status: 400 }
      );
    }

    // Send the test embed with attached banner image
    const discordRes = await sendDiscordBannerNotification(cleanUrl);

    if (!discordRes.ok) {
      const errorText = await discordRes.text();
      let errorJson: any = null;
      try {
        errorJson = JSON.parse(errorText);
      } catch {}

      const message =
        errorJson?.message ||
        `Discord returned status ${discordRes.status}: ${errorText.slice(0, 100)}`;

      return NextResponse.json(
        {
          success: false,
          error: `Discord Webhook delivery failed: ${message}`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Test notification successfully sent to Discord!",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || "An unexpected error occurred while testing the webhook.",
      },
      { status: 500 }
    );
  }
}
