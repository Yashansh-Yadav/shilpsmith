import type { NextRequest } from "next/server";
import { put } from "@vercel/blob";

import { ok, handle } from "../../../lib/apiResponse";
import { ValidationError } from "../../../lib/errors";

const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

// 3D model MIME types (browser-provided types vary; we also fall back to
// extension matching for .glb / .gltf since some browsers report empty).
const MODEL_TYPES = new Set([
  "model/gltf-binary",
  "model/gltf+json",
  "application/octet-stream",
]);
const MODEL_EXTENSIONS = [".glb", ".gltf"];

const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const MODEL_MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export const POST = handle(async (request: NextRequest) => {
  const kind =
    new URL(request.url).searchParams.get("kind") === "model"
      ? "model"
      : "image";

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new ValidationError("No file uploaded");
  }

  if (kind === "model") {
    if (file.size > MODEL_MAX_BYTES) {
      throw new ValidationError("Model exceeds 25 MB limit");
    }
    const lower = file.name.toLowerCase();
    const extOk = MODEL_EXTENSIONS.some((ext) => lower.endsWith(ext));
    if (!extOk && !MODEL_TYPES.has(file.type)) {
      throw new ValidationError(
        `Unsupported model type: ${file.type || "unknown"} (expected .glb or .gltf)`
      );
    }
  } else {
    if (file.size > IMAGE_MAX_BYTES) {
      throw new ValidationError("Image exceeds 5 MB limit");
    }
    if (!IMAGE_TYPES.has(file.type)) {
      throw new ValidationError(
        `Unsupported file type: ${file.type || "unknown"}`
      );
    }
  }

  const blob = await put(file.name, file, {
    access: "public",
    addRandomSuffix: true,
    // Models served from blob storage need permissive caching; default is fine
    // but explicit helps observability.
    contentType: file.type || undefined,
  });

  return ok({ url: blob.url, kind });
});
