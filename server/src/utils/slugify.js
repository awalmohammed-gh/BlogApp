/**
 * Slugify and Unique Slug Generation Utilities for Nsemra News CMS
 */

/**
 * Convert string into a URL-friendly lowercase slug
 * @param {string} text
 * @returns {string}
 */
export const slugify = (text) => {
  if (!text || typeof text !== "string") return "";

  return text
    .toString()
    .normalize("NFD") // Split accented characters into letter + diacritic
    .replace(/[\u0300-\u036f]/g, "") // Strip diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove unsupported characters
    .replace(/[\s_]+/g, "-") // Replace spaces and underscores with hyphen
    .replace(/-+/g, "-") // Collapse consecutive hyphens
    .replace(/^-+|-+$/g, ""); // Trim leading and trailing hyphens
};

/**
 * Ensure slug uniqueness within a Mongoose model collection
 * @param {import("mongoose").Model} Model
 * @param {string} text
 * @param {string|null} currentId - Document ID to exclude if updating
 * @returns {Promise<string>}
 */
export const generateUniqueSlug = async (Model, text, currentId = null) => {
  const baseSlug = slugify(text) || "item";
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug };
    if (currentId) {
      query._id = { $ne: currentId };
    }

    const exists = await Model.findOne(query).select("_id");
    if (!exists) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
};

export default {
  slugify,
  generateUniqueSlug
};
