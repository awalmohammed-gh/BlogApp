import mongoose from "mongoose";
import dns from "node:dns";
import connectDatabase, { disconnectDatabase } from "../config/database.js";
import Article from "../models/Article.js";
import Media from "../models/Media.js";
import { isImageKitUrl, filePathFromUrl, getImageDetails, generateThumbnailUrl } from "../config/imagekit.js";

// Ensure DNS works for Atlas SRV
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Ignore
}

/**
 * Migration & Reconciliation Script:
 * Scans Article documents for ImageKit URLs that do not yet have a record in the Media collection,
 * verifies them against ImageKit if credentials allow, and safely creates Media records.
 *
 * Supports --dry-run
 */
export const reconcileMediaAssets = async ({ dryRun = false } = {}) => {
  console.log("=================================================");
  console.log(`   NSEMRA NEWS MEDIA ASSET RECONCILIATION${dryRun ? " (DRY RUN)" : ""}    `);
  console.log("=================================================\n");

  await connectDatabase();

  const articles = await Article.find({}).lean();
  console.log(`[Reconcile] Inspecting ${articles.length} total articles...`);

  let registeredCount = 0;
  let alreadyExistCount = 0;
  let skippedExternalCount = 0;
  let errorsCount = 0;

  for (const article of articles) {
    const urlsToInspect = [];

    if (article.featuredImage?.url) {
      urlsToInspect.push({
        url: article.featuredImage.url,
        fileId: article.featuredImage.fileId || null,
        alt: article.featuredImage.alt || article.title,
        folder: "articles-featured",
        name: article.featuredImage.name || article.title
      });
    }

    // Inspect content for inline images
    if (article.content) {
      const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
      let match;
      while ((match = imgRegex.exec(article.content)) !== null) {
        const foundUrl = match[1];
        if (foundUrl && !urlsToInspect.some((u) => u.url === foundUrl)) {
          urlsToInspect.push({
            url: foundUrl,
            fileId: null,
            alt: `${article.title} inline`,
            folder: "articles-content",
            name: `${article.title} inline`
          });
        }
      }
    }

    for (const item of urlsToInspect) {
      // Check if already in Media collection by URL or fileId
      const query = [];
      if (item.url) query.push({ url: item.url });
      if (item.fileId) query.push({ fileId: item.fileId });

      const existingMedia = await Media.findOne({ $or: query });
      if (existingMedia) {
        alreadyExistCount++;
        // If article featuredImage doesn't reference this media ID yet, link it
        if (!dryRun && article.featuredImage?.url === item.url && !article.featuredImage?.media) {
          await Article.findByIdAndUpdate(article._id, {
            "featuredImage.media": existingMedia._id
          });
        }
        continue;
      }

      if (!isImageKitUrl(item.url)) {
        skippedExternalCount++;
        continue;
      }

      // It is an ImageKit URL not yet in Media collection
      console.log(`[Reconcile] Discovered unregistered ImageKit asset: ${item.url}`);

      const derivedPath = filePathFromUrl(item.url) || "/newsfront/articles/legacy";
      const fileName = derivedPath.split("/").pop() || "legacy-image.webp";
      const ext = fileName.split(".").pop()?.toLowerCase() || "webp";
      const mimeType = ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/webp";

      let width = null;
      let height = null;
      let size = 0;
      let verifiedFileId = item.fileId;

      if (verifiedFileId) {
        try {
          const remoteDetails = await getImageDetails(verifiedFileId);
          if (remoteDetails) {
            width = remoteDetails.width || null;
            height = remoteDetails.height || null;
            size = remoteDetails.size || 0;
          }
        } catch (e) {
          console.warn(`[Reconcile] Could not fetch remote details for ${verifiedFileId}:`, e.message);
        }
      } else {
        // Safe synthetic fileId for legacy record
        verifiedFileId = `legacy_${Buffer.from(item.url).toString("base64").slice(0, 24)}`;
      }

      if (dryRun) {
        console.log(`  [DRY RUN] Would create Media: ${fileName} (${item.folder})`);
        registeredCount++;
      } else {
        try {
          const newMedia = await Media.create({
            fileId: verifiedFileId,
            url: item.url,
            thumbnailUrl: generateThumbnailUrl(item.url),
            filePath: derivedPath,
            originalName: fileName,
            name: item.name.slice(0, 150),
            mimeType,
            extension: ext,
            size,
            width,
            height,
            altText: item.alt.slice(0, 300),
            folder: item.folder,
            source: "migration",
            uploadedBy: article.author || null,
            status: "active"
          });

          // Link to article
          if (article.featuredImage?.url === item.url) {
            await Article.findByIdAndUpdate(article._id, {
              "featuredImage.media": newMedia._id,
              "featuredImage.fileId": verifiedFileId
            });
          }

          console.log(`  ✓ Successfully registered: ${newMedia._id} (${fileName})`);
          registeredCount++;
        } catch (err) {
          console.error(`  ✗ Failed to register ${item.url}:`, err.message);
          errorsCount++;
        }
      }
    }
  }

  console.log("\n=================================================");
  console.log("   RECONCILIATION SUMMARY");
  console.log("=================================================");
  console.log(`  Registered / Reconciled: ${registeredCount}`);
  console.log(`  Already in Media Model:  ${alreadyExistCount}`);
  console.log(`  External (Non-ImageKit): ${skippedExternalCount}`);
  console.log(`  Errors:                  ${errorsCount}`);
  console.log("=================================================\n");

  await disconnectDatabase();
};

if (process.argv[1]?.endsWith("reconcileMediaAssets.js")) {
  const isDryRun = process.argv.includes("--dry-run");
  reconcileMediaAssets({ dryRun: isDryRun }).catch((err) => {
    console.error("Reconciliation failed:", err);
    process.exit(1);
  });
}

export default reconcileMediaAssets;
