import { NextRequest, NextResponse } from "next/server";

const DISCORD_WEBHOOK_URL =
  process.env.DISCORD_WEBHOOK_URL ||
  "https://discord.com/api/webhooks/1550122077158117509/GSe2mUiwqM_xSW1W8Jks50YAu6WHm-yUgnCME9MjWwYXCLGha0SSWxX2gT0mo4sZi6jc";

// Basic in-memory IP rate limiter (1 suggestion per 30s per IP)
const rateLimitMap = new Map<string, number>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const last = rateLimitMap.get(ip);
  if (last && now - last < 30000) {
    return true;
  }
  rateLimitMap.set(ip, now);
  if (rateLimitMap.size > 1000) {
    rateLimitMap.forEach((t, k) => {
      if (now - t > 60000) rateLimitMap.delete(k);
    });
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many suggestions submitted. Please wait 30 seconds before sending another." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { username, message } = body;

    const trimmedMsg = (message || "").trim();
    if (!trimmedMsg) {
      return NextResponse.json(
        { error: "Please enter a message before sending." },
        { status: 400 }
      );
    }

    if (trimmedMsg.length > 1000) {
      return NextResponse.json(
        { error: "Message is too long (maximum 1000 characters)." },
        { status: 400 }
      );
    }

    const cleanUsername = (username || "Guest").trim().replace(/^@+/, "");
    const gmt8Time = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Singapore",
      dateStyle: "medium",
      timeStyle: "medium",
    });

    const payload = {
      username: "WuWa Gacha Feedback",
      avatar_url: "https://raw.githubusercontent.com/kurtpaolo/WuwaGacha/main/public/assets/3starcat.png",
      embeds: [
        {
          title: "📬 New Player Suggestion",
          description: trimmedMsg,
          color: 0xfacc15, // Golden yellow
          fields: [
            {
              name: "Player",
              value: `@${cleanUsername}`,
              inline: true,
            },
            {
              name: "Time (GMT+8)",
              value: gmt8Time,
              inline: true,
            },
          ],
          footer: {
            text: "WuWa Convene System • Suggestion Box",
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const res = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Discord webhook error:", res.status, errText);
      return NextResponse.json(
        { error: "Failed to deliver suggestion to Discord." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Exception sending suggestion to Discord:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error." },
      { status: 500 }
    );
  }
}
