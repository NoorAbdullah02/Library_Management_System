import "server-only";
import crypto from "node:crypto";

import { env, features } from "@/lib/env";

/**
 * Cloudinary uploads via the REST API (no SDK).
 *
 * Two modes:
 *  - `uploadImage(file)` performs a server-side signed upload.
 *  - `getSignature()` returns a signature so the browser can upload directly
 *    to Cloudinary (keeps large files off our server). Both are env-gated.
 */

const CLOUD = env.CLOUDINARY_CLOUD_NAME;

export function isStorageConfigured() {
  return features.uploads;
}

function sign(params: Record<string, string | number>) {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto
    .createHash("sha1")
    .update(toSign + env.CLOUDINARY_API_SECRET)
    .digest("hex");
}

export type UploadResult =
  | { ok: true; url: string; publicId: string; width?: number; height?: number }
  | { ok: false; error: string };

/** Server-side signed upload of a File/Blob (e.g. from a server action). */
export async function uploadImage(
  file: File,
  folder = "lumina/covers",
): Promise<UploadResult> {
  if (!features.uploads) {
    return { ok: false, error: "Cloudinary is not configured." };
  }

  const timestamp = Math.round(Date.now() / 1000);
  const signature = sign({ folder, timestamp });

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", env.CLOUDINARY_API_KEY);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("signature", signature);

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`,
      { method: "POST", body: form },
    );
    if (!res.ok) {
      return { ok: false, error: `Cloudinary responded ${res.status}` };
    }
    const data = (await res.json()) as {
      secure_url: string;
      public_id: string;
      width?: number;
      height?: number;
    };
    return {
      ok: true,
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
    };
  } catch (err) {
    console.error("[cloudinary] upload error", err);
    return { ok: false, error: "Upload failed" };
  }
}

/** Params for a browser-side direct upload widget. */
export function getDirectUploadParams(folder = "lumina/covers") {
  if (!features.uploads) return null;
  const timestamp = Math.round(Date.now() / 1000);
  const signature = sign({ folder, timestamp });
  return {
    cloudName: CLOUD,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    folder,
    signature,
    uploadUrl: `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`,
  };
}
