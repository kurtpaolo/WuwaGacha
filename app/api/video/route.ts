import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { streamVideoFile } from "@/lib/video/streamResponse";
import { getR2BaseUrl } from "@/lib/video/cutscenesConfig";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reqPath = searchParams.get("path");
    if (!reqPath) {
      return new NextResponse("Missing path parameter", { status: 400 });
    }

    // Sanitize path to prevent directory traversal
    let cleanPath = reqPath.replace(/^\/+/, "").replace(/\\+/g, "/").replace(/\.\./g, "");
    if (cleanPath.startsWith("public/")) {
      cleanPath = cleanPath.slice("public/".length);
    }

    const publicDir = path.resolve(process.cwd(), "public");
    const fullPath = path.resolve(publicDir, cleanPath);

    // Verify target path is within public directory and exists
    if (!fullPath.startsWith(publicDir) || !fs.existsSync(fullPath)) {
      const fileName = path.basename(cleanPath);
      const r2Base = getR2BaseUrl();
      if (r2Base) {
        return NextResponse.redirect(`${r2Base}/${fileName}`, 307);
      }
      return new NextResponse(`File not found: ${cleanPath}`, { status: 404 });
    }

    return streamVideoFile(request, fullPath);
  } catch (err: any) {
    console.error("Video stream error:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
