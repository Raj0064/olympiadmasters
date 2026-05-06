/**
 * ─────────────────────────────────────────────────────
 *  CLOUDINARY SETUP — do this once
 * ─────────────────────────────────────────────────────
 *
 *  1. Create a free account at https://cloudinary.com
 *
 *  2. In Cloudinary Dashboard → Settings → Upload Presets
 *     → Add Upload Preset
 *       • Signing mode: Unsigned          ← required for client-side upload
 *       • Folder: olympiad                ← optional, organises your media
 *       • Save → copy the Preset name
 *
 *  3. Your Cloud Name is on the Dashboard home page (top-left).
 *
 *  4. Add to your .env file at project root:
 *       VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *       VITE_CLOUDINARY_UPLOAD_PRESET=your_preset_name
 *
 *  5. Restart dev server (`npm run dev`) after editing .env
 *
 * ─────────────────────────────────────────────────────
 *  USAGE
 * ─────────────────────────────────────────────────────
 *  import { uploadImage } from '../lib/cloudinary';
 *
 *  // file comes from an <input type="file"> change event
 *  const url = await uploadImage(file, 'questions');   // returns secure_url
 *  const url = await uploadImage(file, 'explanations');
 *
 * ─────────────────────────────────────────────────────
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * Upload a file to Cloudinary (unsigned preset).
 * @param {File}   file    - File object from input[type=file]
 * @param {string} folder  - Sub-folder inside your preset folder
 * @returns {Promise<string>} Cloudinary secure_url
 */
export async function uploadImage(file, folder = "general") {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary not configured. Add VITE_CLOUDINARY_CLOUD_NAME and " +
        "VITE_CLOUDINARY_UPLOAD_PRESET to your .env file."
    );
  }

  const MAX_MB = 5;
  if (file.size > MAX_MB * 1024 * 1024) {
    throw new Error(`Image must be under ${MAX_MB} MB.`);
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", UPLOAD_PRESET);
  form.append("folder", `olympiad/${folder}`);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: form }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Cloudinary upload failed.");
  }

  const data = await res.json();
  return data.secure_url; // persistent HTTPS URL — store this in Firestore
}
