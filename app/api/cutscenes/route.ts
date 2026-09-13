import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cutsceneDirs = [
      path.join(process.cwd(), "public", "cutscenes"),
      path.join(process.cwd(), "public", "assets", "cutscenes"),
    ];

    const available: Record<string, string> = {};

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
          }
        }
      }
    }

    return NextResponse.json({ available });
  } catch (error) {
    console.error("Error scanning cutscenes:", error);
    return NextResponse.json({ available: {} });
  }
}
