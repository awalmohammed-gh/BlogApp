import ImageKit from "imagekit";
import env from "./env.js";

/**
 * Centralised ImageKit integration for Nsemra News.
 *
 * Every component that talks to ImageKit (Media Library, article image uploads, migration
 * scripts) goes through this module. The private key is only ever read here, server-side.
 *
 * The storage adapter can be replaced in automated tests so that destructive operations are
 * exercised against a mock instead of the production ImageKit account.
 */

let imagekitInstance = null;
let storageAdapterOverride = null;

export const isImageKitConfigured = () =>
  Boolean(env.IMAGE_KIT_PUBLIC_KEY && env.IMAGE_KIT_PRIVATE_KEY && env.IMAGE_KIT_URL_ENDPOINT);

/**
 * Called during server start-up. Logs a warning (never the credential values) when misconfigured.
 */
export const validateImageKitConfig = () => {
  const missing = [];
  if (!env.IMAGE_KIT_PUBLIC_KEY) missing.push("IMAGE_KIT_PUBLIC_KEY");
  if (!env.IMAGE_KIT_PRIVATE_KEY) missing.push("IMAGE_KIT_PRIVATE_KEY");
  if (!env.IMAGE_KIT_URL_ENDPOINT) missing.push("URL_ENDPOINT / IMAGE_KIT_URL_ENDPOINT");
  if (missing.length) {
    console.warn(`[ImageKit] Media uploads are disabled. Missing configuration: ${missing.join(", ")}`);
    return false;
  }
  return true;
};

export const getImageKitClient = () => {
  if (!imagekitInstance) {
    if (!isImageKitConfigured()) {
      console.warn("[ImageKit] Warning: ImageKit credentials are not fully configured in environment.");
    }

    imagekitInstance = new ImageKit({
      publicKey: env.IMAGE_KIT_PUBLIC_KEY,
      privateKey: env.IMAGE_KIT_PRIVATE_KEY,
      urlEndpoint: env.IMAGE_KIT_URL_ENDPOINT
    });
  }
  return imagekitInstance;
};

/**
 * Error raised for any failed ImageKit operation. Never carries credentials.
 */
export class StorageError extends Error {
  constructor(message, { statusCode = 502, providerStatus = null, notFound = false } = {}) {
    super(message);
    this.name = "StorageError";
    this.statusCode = statusCode;
    this.providerStatus = providerStatus;
    this.notFound = notFound;
  }
}

const toStorageError = (err, fallbackMessage) => {
  if (err instanceof StorageError) return err;
  const providerStatus = err?.$ResponseMetadata?.statusCode || err?.statusCode || err?.status || null;
  const notFound = providerStatus === 404 || /not\s*(be\s*)?found|does not exist/i.test(err?.message || "");
  return new StorageError(fallbackMessage, { providerStatus, notFound, statusCode: notFound ? 404 : 502 });
};

/**
 * Default adapter backed by the real ImageKit SDK (v6 methods only).
 */
const imagekitAdapter = {
  async upload({ buffer, fileName, folderPath, tags }) {
    const res = await getImageKitClient().upload({
      file: buffer,
      fileName,
      folder: folderPath,
      tags,
      useUniqueFileName: true,
      overwriteFile: false
    });
    return {
      fileId: res.fileId,
      url: res.url,
      filePath: res.filePath,
      name: res.name,
      size: res.size,
      width: res.width || null,
      height: res.height || null,
      fileType: res.fileType,
      thumbnailUrl: res.thumbnailUrl || ""
    };
  },
  async getFileDetails(fileId) {
    return getImageKitClient().getFileDetails(fileId);
  },
  async deleteFile(fileId) {
    return getImageKitClient().deleteFile(fileId);
  },
  async listFiles(options) {
    return getImageKitClient().listFiles(options);
  }
};

const adapter = () => storageAdapterOverride || imagekitAdapter;

/**
 * Test hook: replace the storage adapter (pass null to restore the real ImageKit adapter).
 */
export const __setStorageAdapterForTests = (mockAdapter) => {
  storageAdapterOverride = mockAdapter;
};

/**
 * Upload an image buffer to ImageKit.
 * @returns {Promise<{ fileId, url, filePath, name, size, width, height, fileType, thumbnailUrl }>}
 */
export const uploadImage = async ({ buffer, fileName, folderPath, tags = [] }) => {
  if (!storageAdapterOverride && !isImageKitConfigured()) {
    throw new StorageError("Image storage is not configured on the server.", { statusCode: 503 });
  }
  try {
    const result = await adapter().upload({ buffer, fileName, folderPath, tags });
    if (!result?.fileId || !result?.url) {
      throw new StorageError("Image storage returned an incomplete response.");
    }
    return result;
  } catch (err) {
    console.error("[ImageKit] Upload failed:", err?.message || err);
    throw toStorageError(err, "Failed to upload the image to ImageKit.");
  }
};

/**
 * Fetch file details from ImageKit. Throws StorageError with notFound=true when missing.
 */
export const getImageDetails = async (fileId) => {
  try {
    return await adapter().getFileDetails(fileId);
  } catch (err) {
    const mapped = toStorageError(err, "Failed to retrieve image details from ImageKit.");
    if (!mapped.notFound) console.error("[ImageKit] getFileDetails failed:", err?.message || err);
    throw mapped;
  }
};

/**
 * Permanently delete a file from ImageKit.
 * Resolves { alreadyMissing: true } when the file no longer exists remotely.
 */
export const deleteImage = async (fileId) => {
  try {
    await adapter().deleteFile(fileId);
    return { deleted: true, alreadyMissing: false };
  } catch (err) {
    const mapped = toStorageError(err, "Failed to delete the image from ImageKit.");
    if (mapped.notFound) return { deleted: false, alreadyMissing: true };
    console.error("[ImageKit] deleteFile failed:", err?.message || err);
    throw mapped;
  }
};

export const listImages = async (options = {}) => {
  try {
    return await adapter().listFiles(options);
  } catch (err) {
    console.error("[ImageKit] listFiles failed:", err?.message || err);
    throw toStorageError(err, "Failed to list files from ImageKit.");
  }
};

/**
 * Returns true when the URL is served from the configured ImageKit endpoint.
 */
export const isImageKitUrl = (url) => {
  if (!url || !env.IMAGE_KIT_URL_ENDPOINT) return false;
  const endpoint = env.IMAGE_KIT_URL_ENDPOINT.replace(/\/+$/, "");
  return url.startsWith(endpoint + "/");
};

/**
 * Derive the ImageKit file path ("/newsfront/articles/x.jpg") from a delivery URL.
 */
export const filePathFromUrl = (url) => {
  if (!isImageKitUrl(url)) return null;
  const endpoint = env.IMAGE_KIT_URL_ENDPOINT.replace(/\/+$/, "");
  let path = url.slice(endpoint.length).split("?")[0].split("#")[0];
  // Strip path-style transformations such as /tr:w-400/
  path = path.replace(/^\/tr:[^/]+/, "");
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
};

/**
 * Build a transformed delivery URL without altering the original asset.
 * Non-ImageKit URLs are returned unchanged.
 */
export const getImageUrl = (url, { width, height, quality = 80, crop = "at_max" } = {}) => {
  if (!isImageKitUrl(url)) return url;
  const parts = [];
  if (width) parts.push(`w-${Math.round(width)}`);
  if (height) parts.push(`h-${Math.round(height)}`);
  if (crop && (width || height)) parts.push(`c-${crop}`);
  if (quality) parts.push(`q-${quality}`);
  if (!parts.length) return url;
  const base = url.split("?")[0];
  return `${base}?tr=${parts.join(",")}`;
};

export const generateThumbnailUrl = (url) => getImageUrl(url, { width: 480, height: 360, quality: 75 });

/**
 * Backwards-compatible helper retained for existing callers.
 */
export const uploadImageToImageKit = async (fileBuffer, fileName, folder = "/newsfront/articles", tags = ["article"]) => {
  const res = await uploadImage({ buffer: fileBuffer, fileName, folderPath: folder, tags });
  return {
    fileId: res.fileId,
    url: res.url,
    name: res.name,
    width: res.width,
    height: res.height,
    thumbnailUrl: res.thumbnailUrl || res.url
  };
};

/**
 * Generate client-side upload authentication parameters if needed
 */
export const getAuthenticationParameters = () => {
  const client = getImageKitClient();
  return client.getAuthenticationParameters();
};

export default {
  getImageKitClient,
  isImageKitConfigured,
  validateImageKitConfig,
  uploadImage,
  getImageDetails,
  deleteImage,
  listImages,
  getImageUrl,
  generateThumbnailUrl,
  isImageKitUrl,
  filePathFromUrl,
  uploadImageToImageKit,
  getAuthenticationParameters
};
