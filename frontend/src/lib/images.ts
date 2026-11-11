/**
 * Photos uploaded through the app are served by the authenticated API proxy, which the Next.js image optimiser
 * (a separate server-side fetch, without the user's cookie) can't reach. Render those as-is.
 */
export function isUpload(src: string): boolean {
  return src.startsWith("/api/");
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
/** Phone cameras produce 3–12 MB photos; anything far beyond that is not a photo worth decoding. */
const MAX_INPUT_BYTES = 25 * 1024 * 1024;
/** The API's limit. A resized photo is normally 100–300 KB, far below it. */
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const QUALITY = 0.82;

/** Scales width × height down (never up) so the longer side is at most maxSide. */
export function fitWithin(width: number, height: number, maxSide: number): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export type PreparedImage = { ok: true; file: File } | { ok: false; error: string };

/**
 * Shrinks a photo in the browser before upload, so the API stores (and phones download) a small image instead of
 * the camera original. It keeps the photo's orientation and re-encodes as WebP (JPEG where the browser can't
 * write WebP). Re-encoding every image also drops embedded metadata such as the GPS location a phone records.
 */
export async function prepareImage(file: File, maxSide = 1600): Promise<PreparedImage> {
  if (!ACCEPTED.includes(file.type)) return { ok: false, error: "Use a JPG, PNG or WebP image" };
  if (file.size > MAX_INPUT_BYTES) return { ok: false, error: "That photo is too large. Use one under 25 MB." };

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return { ok: false, error: "That file isn't a valid image" };
  }

  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return fallback(file);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);

    let blob = await toBlob(canvas, "image/webp");
    if (blob?.type !== "image/webp") {
      // JPEG has no transparency: put cut-out product shots on white (painted behind), not black.
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
      blob = await toBlob(canvas, "image/jpeg");
    }
    if (!blob) return fallback(file);
    if (blob.size > MAX_UPLOAD_BYTES) return { ok: false, error: "Couldn't make that photo small enough. Try another one." };

    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    const name = `${file.name.replace(/\.[^.]+$/, "") || "photo"}.${ext}`;
    return { ok: true, file: new File([blob], name, { type: blob.type }) };
  } finally {
    bitmap.close();
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/** Without a usable canvas, send the original if the API would accept it. */
function fallback(file: File): PreparedImage {
  return file.size <= MAX_UPLOAD_BYTES ? { ok: true, file } : { ok: false, error: "Images must be 2 MB or smaller" };
}
