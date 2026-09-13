import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

/**
 * Returns the MIME Content-Type corresponding to the video file extension.
 */
export function getVideoContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".mov":
      return "video/quicktime";
    case ".mkv":
      return "video/x-matroska";
    case ".ogg":
    case ".ogv":
      return "video/ogg";
    case ".m4v":
      return "video/x-m4v";
    default:
      return "video/mp4";
  }
}

/**
 * Converts a Node.js ReadStream into a standard Web ReadableStream
 * with backpressure and clean cancellation handling.
 */
export function nodeStreamToWebStream(nodeStream: fs.ReadStream): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer | string) => {
        const bytes = Buffer.isBuffer(chunk)
          ? new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength)
          : new TextEncoder().encode(chunk);
        controller.enqueue(bytes);
        if (controller.desiredSize !== null && controller.desiredSize <= 0) {
          nodeStream.pause();
        }
      });
      nodeStream.on("end", () => {
        try {
          controller.close();
        } catch {}
      });
      nodeStream.on("error", (err) => {
        try {
          controller.error(err);
        } catch {}
      });
    },
    pull() {
      nodeStream.resume();
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

/**
 * Streams a video file supporting HTTP 206 Partial Content, RFC 7233 byte-range parsing,
 * out-of-range 416 responses, and non-blocking streaming.
 */
export function streamVideoFile(request: NextRequest, fullPath: string): NextResponse {
  if (!fs.existsSync(fullPath)) {
    return new NextResponse(`File not found: ${path.basename(fullPath)}`, { status: 404 });
  }

  const stat = fs.statSync(fullPath);
  if (!stat.isFile()) {
    return new NextResponse("Not a valid file", { status: 400 });
  }

  const totalSize = stat.size;
  const contentType = getVideoContentType(fullPath);
  const rangeHeader = request.headers.get("range");

  // If no Range header is provided, stream the entire file with 200 OK (RFC 7233)
  if (!rangeHeader || !rangeHeader.startsWith("bytes=")) {
    const nodeStream = fs.createReadStream(fullPath);
    const webStream = nodeStreamToWebStream(nodeStream);

    return new NextResponse(webStream as any, {
      status: 200,
      headers: {
        "Content-Length": totalSize.toString(),
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  // Parse HTTP Range header (RFC 7233)
  // Formats: bytes=start-end, bytes=start-, bytes=-suffix
  const rangeSpec = rangeHeader.replace(/^bytes=/, "").trim();
  const firstRange = rangeSpec.split(",")[0].trim();
  const parts = firstRange.split("-");

  let start: number;
  let end: number;

  if (parts[0] !== "" && parts[1] !== "") {
    // bytes=start-end
    start = parseInt(parts[0], 10);
    end = parseInt(parts[1], 10);
  } else if (parts[0] !== "" && parts[1] === "") {
    // bytes=start-
    start = parseInt(parts[0], 10);
    end = totalSize - 1;
  } else if (parts[0] === "" && parts[1] !== "") {
    // bytes=-suffix (last N bytes)
    const suffixLength = parseInt(parts[1], 10);
    start = Math.max(0, totalSize - suffixLength);
    end = totalSize - 1;
  } else {
    // Malformed range
    return new NextResponse(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${totalSize}`,
        "Accept-Ranges": "bytes",
      },
    });
  }

  // Validate Range bounds against total file size
  if (
    isNaN(start) ||
    isNaN(end) ||
    start < 0 ||
    start >= totalSize ||
    start > end
  ) {
    return new NextResponse(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${totalSize}`,
        "Accept-Ranges": "bytes",
      },
    });
  }

  // Clamp end to totalSize - 1
  end = Math.min(end, totalSize - 1);
  const chunkSize = end - start + 1;

  const nodeStream = fs.createReadStream(fullPath, { start, end });
  const webStream = nodeStreamToWebStream(nodeStream);

  return new NextResponse(webStream as any, {
    status: 206,
    headers: {
      "Content-Range": `bytes ${start}-${end}/${totalSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize.toString(),
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
