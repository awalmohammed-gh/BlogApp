import advertisementService from "../services/advertisementService.js";
import {
  createAdvertisementSchema,
  updateAdvertisementSchema,
  advertisementQuerySchema
} from "../validations/advertisementValidation.js";

/**
 * GET /api/admin/advertisements
 */
export const getAdvertisements = async (req, res, next) => {
  try {
    const validation = advertisementQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters.",
        errors: validation.error.flatten().fieldErrors
      });
    }

    const result = await advertisementService.getAdvertisements(validation.data);
    res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/advertisements/stats
 */
export const getAdvertisementStats = async (req, res, next) => {
  try {
    const stats = await advertisementService.getAdvertisementStats();
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/advertisements/:id
 */
export const getAdvertisementById = async (req, res, next) => {
  try {
    const ad = await advertisementService.getAdvertisementById(req.params.id);
    res.status(200).json({
      success: true,
      data: ad
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/advertisements
 */
export const createAdvertisement = async (req, res, next) => {
  try {
    const validation = createAdvertisementSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed for advertisement creation.",
        errors: validation.error.flatten().fieldErrors
      });
    }

    const created = await advertisementService.createAdvertisement(
      validation.data,
      req.admin._id,
      req
    );

    res.status(201).json({
      success: true,
      message: "Advertisement campaign created successfully.",
      data: created
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/advertisements/:id
 */
export const updateAdvertisement = async (req, res, next) => {
  try {
    const validation = updateAdvertisementSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed for advertisement update.",
        errors: validation.error.flatten().fieldErrors
      });
    }

    const updated = await advertisementService.updateAdvertisement(
      req.params.id,
      validation.data,
      req.admin._id,
      req
    );

    res.status(200).json({
      success: true,
      message: "Advertisement updated successfully.",
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/advertisements/:id/activate
 */
export const activateAdvertisement = async (req, res, next) => {
  try {
    const activated = await advertisementService.activateAdvertisement(
      req.params.id,
      req.admin._id,
      req
    );

    res.status(200).json({
      success: true,
      message: "Advertisement activated successfully.",
      data: activated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/advertisements/:id/pause
 */
export const pauseAdvertisement = async (req, res, next) => {
  try {
    const paused = await advertisementService.pauseAdvertisement(
      req.params.id,
      req.admin._id,
      req
    );

    res.status(200).json({
      success: true,
      message: "Advertisement paused successfully.",
      data: paused
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/advertisements/:id/archive
 */
export const archiveAdvertisement = async (req, res, next) => {
  try {
    const archived = await advertisementService.archiveAdvertisement(
      req.params.id,
      req.admin._id,
      req
    );

    res.status(200).json({
      success: true,
      message: "Advertisement archived successfully.",
      data: archived
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/advertisements/:id/restore
 */
export const restoreAdvertisement = async (req, res, next) => {
  try {
    const restored = await advertisementService.restoreAdvertisement(
      req.params.id,
      req.admin._id,
      req
    );

    res.status(200).json({
      success: true,
      message: "Advertisement restored to draft successfully.",
      data: restored
    });
  } catch (error) {
    next(error);
  }
};
