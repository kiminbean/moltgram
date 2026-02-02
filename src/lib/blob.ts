import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";

/**
 * Upload a file buffer to Vercel Blob storage.
 * Returns the public URL of the uploaded blob.
 *
 * Requires BLOB_READ_WRITE_TOKEN env var (auto-set by Vercel when Blob Store is connected).
 */
export async function uploadToBlob(
  buffer: Buffer,
  originalFilename: string,
  contentType?: string
): Promise<string> {
  const ext = originalFilename.split(".").pop() || "jpg";
  const filename = `${uuidv4()}.${ext}`;
  const pathname = `uploads/${filename}`;

  const blob = await put(pathname, buffer, {
    access: "public",
    contentType: contentType || guessMimeType(ext),
  });

  return blob.url;
}

function guessMimeType(ext: string): string {
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    avif: "image/avif",
  };
  return map[ext.toLowerCase()] || "application/octet-stream";
}
