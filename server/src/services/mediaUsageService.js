import mongoose from "mongoose";
import Article from "../models/Article.js";
import Media from "../models/Media.js";
import Advertisement from "../models/Advertisement.js";
import SitePage from "../models/SitePage.js";
import SiteSettings from "../models/SiteSettings.js";
import Admin from "../models/Admin.js";

/** Site logo / favicon references from Settings -> Branding. */
const brandingUsage = async () => {
  const doc = await SiteSettings.findOne({ key: "global" }).select("values.branding").lean();
  const b = doc?.values?.branding || {};
  return [
    { usageType: "site_logo", title: "Site logo", mediaId: b.logoMediaId || "", url: b.logoUrl || "" },
    { usageType: "site_favicon", title: "Site favicon", mediaId: b.faviconMediaId || "", url: b.faviconUrl || "" }
  ].filter((u) => u.mediaId || u.url);
};

/**
 * Service to inspect, aggregate, and report usage of Media documents across articles,
 * advertisements, and website content sections.
 */
export const mediaUsageService = {
  /**
   * Find all articles, advertisements, and site pages referencing a specific Media item.
   *
   * @param {Object} mediaDoc - The Media document or plain object with _id, fileId, url
   * @param {Object} [options] - Authorization filter
   * @returns {Promise<{ usageCount: number, articles: Array<any>, advertisements: Array<any>, pages: Array<any> }>}
   */
  async getMediaUsage(mediaDoc, options = {}) {
    const mediaId = mediaDoc._id;
    const fileId = mediaDoc.fileId;
    const url = mediaDoc.url;

    const baseConditions = [];

    if (mediaId) {
      baseConditions.push({ "featuredImage.media": mediaId });
      baseConditions.push({ contentMedia: mediaId });
    }

    if (fileId) {
      baseConditions.push({ "featuredImage.fileId": fileId });
    }

    if (url) {
      baseConditions.push({ "featuredImage.url": url });
      // Regex search in content HTML string
      const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      baseConditions.push({ content: { $regex: escapedUrl } });
    }

    // 1. Articles Query
    let formattedArticles = [];
    if (baseConditions.length > 0) {
      const query = {
        $or: baseConditions,
        status: { $ne: "archived" }
      };

      if (options.authorId) {
        query.author = options.authorId;
      }

      const articles = await Article.find(query)
        .select("title slug status featuredImage content contentMedia author createdAt")
        .populate("author", "name email role")
        .lean();

      formattedArticles = articles.map((art) => {
        let isFeatured = false;
        let isContent = false;

        if (
          (mediaId && art.featuredImage?.media?.toString() === mediaId.toString()) ||
          (fileId && art.featuredImage?.fileId === fileId) ||
          (url && art.featuredImage?.url === url)
        ) {
          isFeatured = true;
        }

        if (
          (mediaId && art.contentMedia?.some((m) => m.toString() === mediaId.toString())) ||
          (url && art.content && art.content.includes(url))
        ) {
          isContent = true;
        }

        let usageType = "article_referenced";
        if (isFeatured && isContent) {
          usageType = "featured_and_content";
        } else if (isFeatured) {
          usageType = "article_featured";
        } else if (isContent) {
          usageType = "article_content";
        }

        return {
          _id: art._id,
          title: art.title,
          slug: art.slug,
          status: art.status,
          usageType,
          author: art.author,
          createdAt: art.createdAt
        };
      });
    }

    // 2. Advertisements Query
    let formattedAds = [];
    if (mediaId) {
      const ads = await Advertisement.find({
        media: mediaId,
        status: { $ne: "archived" }
      })
        .select("campaignName placement status startDate endDate")
        .lean();

      formattedAds = ads.map((ad) => ({
        _id: ad._id,
        title: ad.campaignName,
        placement: ad.placement,
        status: ad.status,
        usageType: "advertisement_asset"
      }));
    }

    // 3. Website Content Pages Query
    let formattedPages = [];
    if (url || mediaId) {
      const allPages = await SitePage.find({ status: { $ne: "archived" } })
        .select("pageKey title slug sections")
        .lean();

      for (const p of allPages) {
        const sectionsStr = JSON.stringify(p.sections || []);
        if ((url && sectionsStr.includes(url)) || (mediaId && sectionsStr.includes(mediaId.toString()))) {
          formattedPages.push({
            _id: p._id,
            title: p.title,
            pageKey: p.pageKey,
            slug: p.slug,
            usageType: "page_section_content"
          });
        }
      }
    }

    // 4. Site branding (logo / favicon)
    const formattedSettings = (await brandingUsage())
      .filter((u) => (mediaId && u.mediaId === mediaId.toString()) || (url && u.url === url))
      .map(({ usageType, title }) => ({ usageType, title }));

    const profileConditions = [];
    if (mediaId) profileConditions.push({ avatarMedia: mediaId });
    if (url) profileConditions.push({ avatar: url });
    const profiles = profileConditions.length ? await Admin.find({ $or: profileConditions }).select("_id name").lean() : [];
    const formattedProfiles = profiles.map((profile) => ({ _id: profile._id, title: profile.name, usageType: "profile_photo" }));
    const totalUsage = formattedArticles.length + formattedAds.length + formattedPages.length + formattedSettings.length + formattedProfiles.length;

    return {
      usageCount: totalUsage,
      articles: formattedArticles,
      advertisements: formattedAds,
      pages: formattedPages,
      settings: formattedSettings,
      profiles: formattedProfiles
    };
  },

  /**
   * Batch check which media IDs in an array are currently referenced.
   * Returns a Map or object of mediaId -> usageCount.
   * @param {Array<Object>} mediaDocs
   */
  async getBatchUsageCounts(mediaDocs) {
    if (!mediaDocs || mediaDocs.length === 0) return {};

    const mediaIdMap = new Map();
    const urlMap = new Map();
    const fileIdMap = new Map();

    mediaDocs.forEach((m) => {
      const idStr = m._id.toString();
      mediaIdMap.set(idStr, 0);
      if (m.url) urlMap.set(m.url, idStr);
      if (m.fileId) fileIdMap.set(m.fileId, idStr);
    });

    const ids = Array.from(mediaIdMap.keys()).map((id) => new mongoose.Types.ObjectId(id));
    const urls = Array.from(urlMap.keys());
    const fileIds = Array.from(fileIdMap.keys());

    // Single aggregation / query to find articles referencing any of these
    const [articles, ads, pages, profiles] = await Promise.all([
      Article.find({
        $or: [
          { "featuredImage.media": { $in: ids } },
          { "featuredImage.fileId": { $in: fileIds } },
          { "featuredImage.url": { $in: urls } },
          { contentMedia: { $in: ids } }
        ]
      })
        .select("featuredImage contentMedia")
        .lean(),

      Advertisement.find({
        media: { $in: ids },
        status: { $ne: "archived" }
      })
        .select("media")
        .lean(),

      SitePage.find({ status: { $ne: "archived" } })
        .select("sections")
        .lean(),
      Admin.find({ $or: [{ avatarMedia: { $in: ids } }, { avatar: { $in: urls } }] }).select("avatar avatarMedia").lean()
    ]);

    const referencedMediaIds = new Map();

    // Process article references
    articles.forEach((art) => {
      const distinctInArticle = new Set();

      if (art.featuredImage?.media) {
        const idStr = art.featuredImage.media.toString();
        if (mediaIdMap.has(idStr)) distinctInArticle.add(idStr);
      }
      if (art.featuredImage?.fileId && fileIdMap.has(art.featuredImage.fileId)) {
        distinctInArticle.add(fileIdMap.get(art.featuredImage.fileId));
      }
      if (art.featuredImage?.url && urlMap.has(art.featuredImage.url)) {
        distinctInArticle.add(urlMap.get(art.featuredImage.url));
      }
      if (Array.isArray(art.contentMedia)) {
        art.contentMedia.forEach((cm) => {
          const idStr = cm.toString();
          if (mediaIdMap.has(idStr)) distinctInArticle.add(idStr);
        });
      }

      distinctInArticle.forEach((mId) => {
        referencedMediaIds.set(mId, (referencedMediaIds.get(mId) || 0) + 1);
      });
    });

    // Process ad references
    ads.forEach((ad) => {
      if (ad.media) {
        const idStr = ad.media.toString();
        if (mediaIdMap.has(idStr)) {
          referencedMediaIds.set(idStr, (referencedMediaIds.get(idStr) || 0) + 1);
        }
      }
    });

    // Process page references
    pages.forEach((p) => {
      const secStr = JSON.stringify(p.sections || []);
      urls.forEach((u) => {
        if (secStr.includes(u)) {
          const mId = urlMap.get(u);
          if (mId) {
            referencedMediaIds.set(mId, (referencedMediaIds.get(mId) || 0) + 1);
          }
        }
      });
    });

    // Process site branding references
    (await brandingUsage()).forEach((u) => {
      const mId = (u.mediaId && mediaIdMap.has(u.mediaId) && u.mediaId) || (u.url && urlMap.get(u.url));
      if (mId) referencedMediaIds.set(mId, (referencedMediaIds.get(mId) || 0) + 1);
    });

    profiles.forEach((profile) => {
      const id = (profile.avatarMedia && mediaIdMap.has(String(profile.avatarMedia)) && String(profile.avatarMedia)) || urlMap.get(profile.avatar);
      if (id) referencedMediaIds.set(id, (referencedMediaIds.get(id) || 0) + 1);
    });

    const result = {};
    mediaDocs.forEach((m) => {
      const idStr = m._id.toString();
      result[idStr] = referencedMediaIds.get(idStr) || 0;
    });

    return result;
  }
};

export default mediaUsageService;
