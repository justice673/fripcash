"use client";

import { api } from "./client";

/* ── MinIO (KYC / excel / PDFs only) ─────────────────────────────── */

export async function presignMedia(body: {
  key: string;
  contentType: string;
  folder?: string;
  expiresInSeconds?: number;
}) {
  const { data } = await api.post<{
    uploadUrl: string;
    objectKey: string;
    expiresInSeconds?: number;
  }>("/media/presign", body);
  return data;
}

/** @deprecated Catalogue photos use Cloudinary — prefer uploadCatalogueImage. */
export async function uploadListingMedia(
  file: File,
  folder = "listings"
): Promise<string> {
  const { uploadUrl, objectKey } = await presignMedia({
    key: file.name,
    contentType: file.type || "application/octet-stream",
    folder,
  });
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Upload failed (${res.status})`);
  }
  return objectKey;
}

/* ── Cloudinary (category + listing catalogue images) ────────────── */

export type CloudinaryFolder = "listings" | "categories" | "promotions";

export type CloudinarySign = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  uploadUrl: string;
};

export type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
};

export async function cloudinarySign(folder: CloudinaryFolder) {
  const { data } = await api.post<CloudinarySign>("/media/cloudinary-sign", {
    folder,
  });
  return data;
}

/**
 * Sign → multipart upload to Cloudinary.
 * Returns secure_url + public_id for Nest attach/patch.
 */
export async function uploadCatalogueImage(
  file: File,
  folder: CloudinaryFolder
): Promise<CloudinaryUploadResult> {
  const sign = await cloudinarySign(folder);

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sign.apiKey);
  form.append("timestamp", String(sign.timestamp));
  form.append("signature", sign.signature);
  form.append("folder", sign.folder);

  const res = await fetch(sign.uploadUrl, { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`Cloudinary upload failed: ${res.status}`);
  }

  const uploaded = (await res.json()) as CloudinaryUploadResult;
  return {
    secure_url: uploaded.secure_url,
    public_id: uploaded.public_id,
  };
}
