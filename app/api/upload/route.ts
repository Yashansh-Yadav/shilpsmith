import type { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { getToken } from "next-auth/jwt";

import { ok, handle } from "../../../lib/apiResponse";
import { rateLimit } from "../../../lib/middleware/rateLimit";
import { AuthError, ValidationError } from "../../../lib/errors";

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

// This route cannot live behind the /api/admin middleware matcher: the public
// storefront needs it for customer customization images (see
// components/shop/DynamicCustomizationForm.tsx). So it stays reachable, but
// every write is rate-limited and the expensive 25 MB model path is
// admin-only — anonymous callers get images at 5 MB or nothing.
export const POST = handle(async (request: NextRequest) => {
  rateLimit(request, { windowMs: 60_000, max: 5, namespace: "upload" });

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
    // Only admins upload 3D models, and they're 5x the size cap — don't let an
    // anonymous caller loop 25 MB writes into the Blob account.
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token) {
      throw new AuthError("Authentication required to upload 3D models");
    }

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

  // Never pass the browser-supplied type straight through. Images are already
  // constrained to the allowlist above, but a model only has to satisfy the
  // .glb/.gltf extension check — so a file named x.glb carrying "text/html"
  // would be served back as a live page from our own blob domain. Pin models to
  // a fixed, inert type instead.
  const contentType =
    kind === "model"
      ? file.name.toLowerCase().endsWith(".gltf")
        ? "model/gltf+json"
        : "model/gltf-binary"
      : file.type;

  const blob = await put(file.name, file, {
    access: "public",
    addRandomSuffix: true,
    contentType,
  });

  return ok({ url: blob.url, kind });
});
