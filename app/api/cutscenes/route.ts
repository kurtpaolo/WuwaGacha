import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { streamVideoFile } from "@/lib/video/streamResponse";
import { buildCutscenesManifest, getR2CutsceneUrl } from "@/lib/video/cutscenesConfig";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cutsceneParam = searchParams.get("path") || searchParams.get("name") || searchParams.get("file");

    const cutsceneDirs = [
      path.join(process.cwd(), "public", "cutscenes"),
      path.join(process.cwd(), "public", "assets", "cutscenes"),
    ];

    // If a specific cutscene is requested, check local files first then redirect to R2
    if (cutsceneParam) {
      let clean = cutsceneParam.replace(/^\/+/, "").replace(/\\+/g, "/").replace(/\.\./g, "");
      if (clean.startsWith("public/")) {
        clean = clean.slice("public/".length);
      }

      const publicDir = path.resolve(process.cwd(), "public");
      const directPath = path.resolve(publicDir, clean);

      if (directPath.startsWith(publicDir) && fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
        return streamVideoFile(request, directPath);
      }

      // Search cutscene directories for matching character or filename
      const targetBase = path.basename(clean, path.extname(clean)).toLowerCase().replace(/[\s_-]+/g, "");
      for (const dir of cutsceneDirs) {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            const raw = path.basename(file, ext).toLowerCase().replace(/[\s_-]+/g, "");
            if (raw === targetBase || file.toLowerCase() === clean.toLowerCase()) {
              return streamVideoFile(request, path.join(dir, file));
            }
          }
        }
      }

      // Fallback: Redirect to Cloudflare R2 edge CDN
      const r2Url = getR2CutsceneUrl(targetBase || clean);
      if (r2Url) {
        return NextResponse.redirect(r2Url, 307);
      }

      return new NextResponse(`Cutscene not found: ${cutsceneParam}`, { status: 404 });
    }

    // Default: Return Cloudflare R2 manifest, overlaid with any local files if present
    const available: Record<string, string> = {
      ...buildCutscenesManifest(),
    };

    // If local cutscene directory has files, allow local overrides if desired
    for (const dir of cutsceneDirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const ext = path.extname(file).toLowerCase();
          if ([".mp4", ".webm", ".mkv", ".mov"].includes(ext)) {
            const rawName = path.basename(file, ext).toLowerCase().replace(/[\s_-]+/g, "");
            const exactBase = path.basename(file, ext).toLowerCase();
            const relPath = dir.includes("assets")
              ? `assets/cutscenes/${file}`
              : `cutscenes/${file}`;
            const urlPath = `/api/video?path=${encodeURIComponent(relPath)}`;
            available[rawName] = urlPath;
            available[exactBase] = urlPath;
            available[file.toLowerCase()] = urlPath;
          }
        }
      }
    }

    return NextResponse.json({ available });
  } catch (error) {
    console.error("Error in cutscenes route:", error);
    return NextResponse.json({ available: buildCutscenesManifest() });
  }
}
