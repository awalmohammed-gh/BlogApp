import sitePageService from "../services/sitePageService.js";
import {
  updatePageDraftSchema,
  publishPageSchema,
  restoreRevisionSchema
} from "../validations/sitePageValidation.js";

/**
 * GET /api/admin/pages
 */
export const getPages = async (req, res, next) => {
  try {
    const pages = await sitePageService.getPages();
    res.status(200).json({
      success: true,
      data: pages
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/pages/:pageKey
 */
export const getPageByKey = async (req, res, next) => {
  try {
    const page = await sitePageService.getPageByKey(req.params.pageKey);
    res.status(200).json({
      success: true,
      data: page
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/pages/:pageKey/draft
 */
export const saveDraft = async (req, res, next) => {
  try {
    const validation = updatePageDraftSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed for page content draft.",
        errors: validation.error.flatten().fieldErrors
      });
    }

    const updated = await sitePageService.saveDraft(
      req.params.pageKey,
      validation.data,
      req.admin._id,
      req
    );

    res.status(200).json({
      success: true,
      message: "Page draft saved successfully. Changes remain unpublished.",
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/pages/:pageKey/preview
 */
export const previewDraft = async (req, res, next) => {
  try {
    const preview = await sitePageService.previewDraft(req.params.pageKey);
    res.status(200).json({
      success: true,
      data: preview
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/pages/:pageKey/publish
 */
export const publishPage = async (req, res, next) => {
  try {
    const validation = publishPageSchema.safeParse(req.body || {});
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed for page publication.",
        errors: validation.error.flatten().fieldErrors
      });
    }

    const published = await sitePageService.publishPage(
      req.params.pageKey,
      validation.data,
      req.admin._id,
      req
    );

    res.status(200).json({
      success: true,
      message: "Page content published successfully. Visitors now see updated content.",
      data: published
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/pages/:pageKey/revisions
 */
export const getRevisions = async (req, res, next) => {
  try {
    const revisions = await sitePageService.getRevisions(req.params.pageKey);
    res.status(200).json({
      success: true,
      data: revisions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/pages/:pageKey/restore
 */
export const restoreRevision = async (req, res, next) => {
  try {
    const validation = restoreRevisionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid revision version specified.",
        errors: validation.error.flatten().fieldErrors
      });
    }

    const restored = await sitePageService.restoreRevision(
      req.params.pageKey,
      validation.data.version,
      req.admin._id,
      req
    );

    res.status(200).json({
      success: true,
      message: `Revision version ${validation.data.version} restored as new working draft. Review and publish when ready.`,
      data: restored
    });
  } catch (error) {
    next(error);
  }
};
