import ArticleRevision from "../models/ArticleRevision.js";
import Article from "../models/Article.js";
import AdminAuditLog from "../models/AdminAuditLog.js";

/**
 * Create an immutable ArticleRevision snapshot from the current working state of an article
 */
export const createRevisionSnapshot = async ({
  article,
  adminId,
  changeSummary = "Submitted for editorial review",
  submissionId = null
}) => {
  // Determine next atomic version number for this article
  const latestRevision = await ArticleRevision.findOne({ articleId: article._id })
    .sort({ version: -1 })
    .select("version")
    .lean();

  const nextVersion = latestRevision ? latestRevision.version + 1 : 1;

  const revision = await ArticleRevision.create({
    articleId: article._id,
    version: nextVersion,
    title: article.title,
    subTitle: article.subTitle || "",
    slug: article.slug,
    excerpt: article.excerpt || "",
    content: article.content || "",
    featuredImage: {
      media: article.featuredImage?.media || null,
      fileId: article.featuredImage?.fileId || "",
      url: article.featuredImage?.url || "",
      name: article.featuredImage?.name || "",
      width: article.featuredImage?.width || null,
      height: article.featuredImage?.height || null,
      alt: article.featuredImage?.alt || ""
    },
    contentMedia: article.contentMedia || [],
    category: article.category || null,
    tags: article.tags || [],
    seo: article.seo || {},
    createdBy: adminId,
    changeSummary: changeSummary || `Revision v${nextVersion}`,
    submissionId: submissionId || null
  });

  return revision;
};

/**
 * Retrieve all immutable revisions of an article
 */
export const getArticleRevisions = async (articleId) => {
  return await ArticleRevision.find({ articleId })
    .populate("createdBy", "name email role avatar")
    .populate("category", "name slug color")
    .populate("tags", "name slug")
    .sort({ version: -1 })
    .lean();
};

/**
 * Retrieve a single revision by its ID
 */
export const getRevisionById = async (revisionId) => {
  return await ArticleRevision.findById(revisionId)
    .populate("createdBy", "name email role avatar")
    .populate("category", "name slug color")
    .populate("tags", "name slug")
    .lean();
};

/**
 * Restore an earlier historical revision into the active working state of an article
 * NOTE: This does NOT mutate the live published version. It updates the working draft
 * so the editor or author can review/modify and resubmit for editorial approval.
 */
export const restoreRevision = async ({ articleId, revisionId, adminId }) => {
  const [article, revision] = await Promise.all([
    Article.findById(articleId),
    ArticleRevision.findById(revisionId)
  ]);

  if (!article) {
    const error = new Error("Article not found");
    error.status = 404;
    throw error;
  }

  if (!revision || revision.articleId.toString() !== articleId.toString()) {
    const error = new Error("Revision not found or does not belong to this article");
    error.status = 404;
    throw error;
  }

  // Restore fields from snapshot into article working fields
  article.title = revision.title;
  article.subTitle = revision.subTitle || "";
  article.excerpt = revision.excerpt || "";
  article.content = revision.content || "";
  article.featuredImage = revision.featuredImage || {};
  article.contentMedia = revision.contentMedia || [];
  article.category = revision.category || null;
  article.tags = revision.tags || [];
  article.seo = revision.seo || {};
  article.updatedBy = adminId;

  // If the article was rejected or changes requested, set back to draft for working
  if (["changes_requested", "rejected"].includes(article.editorialStatus)) {
    article.editorialStatus = "none";
    if (article.status !== "published") {
      article.status = "draft";
    }
  }

  await article.save();

  await AdminAuditLog.record({
    actorId: adminId,
    action: "ARTICLE_REVISION_RESTORED",
    metadata: {
      articleId: article._id,
      restoredRevisionId: revision._id,
      restoredVersion: revision.version
    }
  });

  return { article, restoredVersion: revision.version };
};

export default {
  createRevisionSnapshot,
  getArticleRevisions,
  getRevisionById,
  restoreRevision
};
