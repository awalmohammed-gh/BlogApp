import sitePageService from "../services/sitePageService.js";

/**
 * GET /api/site/pages/:pageKey
 * Public endpoint returning published CMS content for a given page key.
 */
export const getPublicPage = async (req, res, next) => {
  try {
    const page = await sitePageService.getPublicPage(req.params.pageKey);

    // Cache control: allow brief cache (e.g. 60 seconds) with revalidation
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=120");

    res.status(200).json({
      success: true,
      data: page
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getPublicPage
};
