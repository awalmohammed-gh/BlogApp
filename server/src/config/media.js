/**
 * Media Library configuration: approved logical folders, accepted formats, and upload limits.
 *
 * Folder keys are the only values accepted from clients. Each key maps to a fixed,
 * server-controlled ImageKit path, so clients can never submit arbitrary storage paths.
 */

import "./env.js";

const toPositiveInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const MEDIA_FOLDERS = [
  {
    key: "articles-featured",
    label: "Articles / Featured",
    path: "/newsfront/articles/featured",
    uploadable: true
  },
  {
    key: "articles-content",
    label: "Articles / Content",
    path: "/newsfront/articles/content",
    uploadable: true
  },
  {
    // Legacy Phase 4 location for article images uploaded before the Media Library existed
    key: "articles",
    label: "Articles",
    path: "/newsfront/articles",
    uploadable: true
  },
  {
    key: "general",
    label: "General",
    path: "/newsfront/general",
    uploadable: true
  },
  // Site logo and favicon (Settings -> Branding)
  { key: "branding", label: "Branding", path: "/newsfront/branding", uploadable: true },
  // Reserved for future phases. Visible for organisation, but uploads are not enabled yet.
  { key: "advertisements", label: "Advertisements", path: "/newsfront/advertisements", uploadable: false },
  { key: "authors", label: "Profile Photos", path: "/newsfront/authors", uploadable: true }
];

export const MEDIA_FOLDER_KEYS = MEDIA_FOLDERS.map((f) => f.key);
export const UPLOADABLE_FOLDER_KEYS = MEDIA_FOLDERS.filter((f) => f.uploadable).map((f) => f.key);

export const getFolderByKey = (key) => MEDIA_FOLDERS.find((f) => f.key === key) || null;

/**
 * Accepted image formats. SVG is intentionally excluded (requires dedicated sanitisation).
 */
export const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

export const MEDIA_LIMITS = {
  maxFileSizeBytes: toPositiveInt(process.env.MEDIA_MAX_FILE_SIZE_MB, 5) * 1024 * 1024,
  maxFilesPerBatch: toPositiveInt(process.env.MEDIA_MAX_FILES_PER_BATCH, 10),
  uploadConcurrency: toPositiveInt(process.env.MEDIA_UPLOAD_CONCURRENCY, 3),
  maxDimension: 12000 // pixels on either side
};

export default {
  MEDIA_FOLDERS,
  MEDIA_FOLDER_KEYS,
  UPLOADABLE_FOLDER_KEYS,
  ALLOWED_IMAGE_TYPES,
  MEDIA_LIMITS,
  getFolderByKey
};
