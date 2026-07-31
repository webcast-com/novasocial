import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { hitRateLimit, rateLimitResponse } from "@/lib/ratelimit";

export const runtime = "nodejs";

const MIME_TYPES: Record<string, { extension: string; mediaType: "image" | "video" }> = {
  "image/jpeg": { extension: "jpg", mediaType: "image" },
  "image/png": { extension: "png", mediaType: "image" },
  "image/webp": { extension: "webp", mediaType: "image" },
  "image/gif": { extension: "gif", mediaType: "image" },
  "video/mp4": { extension: "mp4", mediaType: "video" },
  "video/webm": { extension: "webm", mediaType: "video" },
  "video/quicktime": { extension: "mov", mediaType: "video" },
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 45 * 1024 * 1024;

/**
 * Local development upload endpoint. The generated files are ignored by git;
 * deployers can point UPLOAD_DIR at a mounted volume. For horizontally-scaled
 * production deployments, replace this adapter with S3/R2/GCS signed uploads.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const limit = hitRateLimit(`upload:${auth.id}`, 20, 60 * 60 * 1000);
    if (!limit.allowed) return rateLimitResponse(limit);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Choose an image or video file to upload." }, { status: 400 });
    }

    const details = MIME_TYPES[file.type];
    if (!details) {
      return NextResponse.json(
        { success: false, error: "Supported uploads: JPG, PNG, WebP, GIF, MP4, WebM, and MOV." },
        { status: 415 }
      );
    }
    if (file.size === 0 || file.size > (details.mediaType === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES)) {
      const limitLabel = details.mediaType === "image" ? "10 MB" : "45 MB";
      return NextResponse.json({ success: false, error: `This ${details.mediaType} must be smaller than ${limitLabel}.` }, { status: 413 });
    }

    const directory = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
    await mkdir(directory, { recursive: true });
    const fileName = `${auth.id}-${Date.now()}-${randomUUID()}.${details.extension}`;
    await writeFile(path.join(directory, fileName), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({
      success: true,
      url: `/uploads/${fileName}`,
      mediaType: details.mediaType,
      name: file.name,
      size: file.size,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
