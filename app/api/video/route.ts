import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reqPath = searchParams.get("path");
    if (!reqPath) {
      return new NextResponse("Missing path parameter", { status: 400 });
    }

    // Sanitize path to prevent directory traversal
    const cleanPath = reqPath.replace(/^\/+/, "").replace(/\.\./g, "");
    const fullPath = path.join(process.cwd(), "public", cleanPath);

    if (!fs.existsSync(fullPath)) {
      return new NextResponse(`File not found: ${cleanPath}`, { status: 404 });
    }

    const stat = fs.statSync(fullPath);
    const fileSize = stat.size;
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = ext === ".webm" ? "video/webm" : ext === ".mov" ? "video/quicktime" : "video/mp4";

    const range = request.headers.get("range");

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;

      const nodeStream = fs.createReadStream(fullPath, { start, end });
      const webStream = new ReadableStream({
        start(controller) {
          nodeStream.on("data", (chunk) => controller.enqueue(chunk));
          nodeStream.on("end", () => controller.close());
          nodeStream.on("error", (err) => controller.error(err));
        },
        cancel() {
          nodeStream.destroy();
        },
      });

      return new NextResponse(webStream as any, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize.toString(),
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
        },
      });
    } else {
      const nodeStream = fs.createReadStream(fullPath);
      const webStream = new ReadableStream({
        start(controller) {
          nodeStream.on("data", (chunk) => controller.enqueue(chunk));
          nodeStream.on("end", () => controller.close());
          nodeStream.on("error", (err) => controller.error(err));
        },
        cancel() {
          nodeStream.destroy();
        },
      });

      return new NextResponse(webStream as any, {
        status: 200,
        headers: {
          "Content-Length": fileSize.toString(),
          "Content-Type": contentType,
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
  } catch (err: any) {
    console.error("Video stream error:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
