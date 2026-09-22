import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/client";
import { DISCORD_WEBHOOK_REGEX } from "@/lib/discord/discordEmbeds";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("discord_webhooks")
      .select("id, url, name, is_active, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message, webhooks: [] }, { status: 200 });
    }

    return NextResponse.json({ success: true, webhooks: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, webhooks: [] }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, name } = body;

    const cleanUrl = typeof url === "string" ? url.trim().replace(/\/+$/, "") : "";

    if (!cleanUrl || !DISCORD_WEBHOOK_REGEX.test(cleanUrl)) {
      return NextResponse.json(
        { success: false, error: "Invalid Discord Webhook URL. It must start with https://discord.com/api/webhooks/..." },
        { status: 400 }
      );
    }

    const cleanName = (name && typeof name === "string" ? name.trim() : "") || "Discord Channel";

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("discord_webhooks")
      .insert([{ url: cleanUrl, name: cleanName, is_active: true }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, webhook: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, is_active } = body;

    if (!id || typeof is_active !== "boolean") {
      return NextResponse.json({ success: false, error: "Missing id or is_active" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("discord_webhooks")
      .update({ is_active })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, webhook: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing id parameter" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from("discord_webhooks")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
