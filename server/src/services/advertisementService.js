import mongoose from "mongoose";
import Advertisement from "../models/Advertisement.js";
import Media from "../models/Media.js";
import AdminAuditLog from "../models/AdminAuditLog.js";
import { getActiveAdMongoFilter, isAdvertisementVisible } from "../utils/advertisementVisibility.js";
import notificationService from "./notificationService.js";

export const advertisementService = {
  /**
   * Create a new advertisement campaign
   */
  async createAdvertisement(data, adminId, req = null) {
    // 1. Verify that referenced media asset exists and is active/accessible
    const mediaExists = await Media.findOne({
      _id: data.media,
      status: { $in: ["active", "archived"] }
    });

    if (!mediaExists) {
      const error = new Error("Selected media asset does not exist or has been deleted.");
      error.statusCode = 404;
      throw error;
    }

    // 2. Instantiate and persist advertisement
    const advertisement = await Advertisement.create({
      ...data,
      createdBy: adminId,
      updatedBy: adminId,
      status: data.status || "draft"
    });

    // 3. Record Audit Log
    if (adminId) {
      await AdminAuditLog.record({
        adminId,
        action: "advertisement:created",
        targetType: "advertisement",
        targetId: advertisement._id,
        details: {
          campaignName: advertisement.campaignName,
          placement: advertisement.placement,
          status: advertisement.status
        },
        req
      });
    }

    return await this.getAdvertisementById(advertisement._id);
  },

  /**
   * Update an existing advertisement
   */
  async updateAdvertisement(id, data, adminId, req = null) {
    const advertisement = await Advertisement.findById(id);
    if (!advertisement) {
      const error = new Error("Advertisement campaign not found.");
      error.statusCode = 404;
      throw error;
    }

    if (advertisement.status === "archived" && data.status !== "draft") {
      const error = new Error("Archived campaigns must be restored before modification.");
      error.statusCode = 400;
      throw error;
    }

    // If media asset is being changed, verify target media
    if (data.media && data.media.toString() !== advertisement.media.toString()) {
      const mediaExists = await Media.findOne({
        _id: data.media,
        status: { $in: ["active", "archived"] }
      });
      if (!mediaExists) {
        const error = new Error("Selected media asset does not exist.");
        error.statusCode = 404;
        throw error;
      }
    }

    // Assign updates
    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined) {
        advertisement[key] = data[key];
      }
    });

    advertisement.updatedBy = adminId;
    await advertisement.save();

    if (adminId) {
      await AdminAuditLog.record({
        adminId,
        action: "advertisement:updated",
        targetType: "advertisement",
        targetId: advertisement._id,
        details: {
          campaignName: advertisement.campaignName,
          placement: advertisement.placement,
          status: advertisement.status
        },
        req
      });
    }

    return await this.getAdvertisementById(advertisement._id);
  },

  /**
   * Get single advertisement by ID
   */
  async getAdvertisementById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid advertisement ID format.");
      error.statusCode = 400;
      throw error;
    }

    const advertisement = await Advertisement.findById(id)
      .populate("media", "_id name url thumbnailUrl altText width height mimeType")
      .populate("createdBy", "_id name email role")
      .populate("updatedBy", "_id name email role");

    if (!advertisement) {
      const error = new Error("Advertisement not found.");
      error.statusCode = 404;
      throw error;
    }

    return advertisement;
  },

  /**
   * Get paginated and filtered advertisements list for admin dashboard
   */
  async getAdvertisements(params = {}) {
    const {
      search,
      placement,
      status,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = params;

    const query = {};

    if (placement && placement !== "All") {
      query.placement = placement;
    }

    if (status && status !== "All") {
      query.status = status.toLowerCase();
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { campaignName: regex },
        { advertiserName: regex },
        { headline: regex },
        { description: regex }
      ];
    }

    const sortDirection = sortOrder === "asc" ? 1 : -1;
    const sort = { [sortBy]: sortDirection };

    const pageNumber = Math.max(1, parseInt(page, 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNumber - 1) * pageSize;

    const [items, total] = await Promise.all([
      Advertisement.find(query)
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .populate("media", "_id name url thumbnailUrl altText")
        .populate("createdBy", "_id name email")
        .lean(),
      Advertisement.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      items,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1
      }
    };
  },

  /**
   * Activate an advertisement
   */
  async activateAdvertisement(id, adminId, req = null) {
    const advertisement = await this.getAdvertisementById(id);

    if (advertisement.status === "archived") {
      const error = new Error("Cannot directly activate an archived advertisement. Please restore it first.");
      error.statusCode = 400;
      throw error;
    }

    advertisement.status = "active";
    advertisement.updatedBy = adminId;
    await advertisement.save();

    if (adminId) {
      await AdminAuditLog.record({
        adminId,
        action: "advertisement:activated",
        targetType: "advertisement",
        targetId: advertisement._id,
        details: { campaignName: advertisement.campaignName, placement: advertisement.placement },
        req
      });
    }

    // Notify other super admins about campaign activation
    try {
      await notificationService.notifyRoles({
        roles: ["super_admin"],
        excludeAdminIds: adminId ? [adminId] : [],
        actorId: adminId || null,
        type: notificationService.NOTIFICATION_TYPES.ADVERTISEMENT_UPDATED,
        title: "Advertisement Campaign Activated",
        message: `Campaign "${advertisement.campaignName}" is now active in placement "${advertisement.placement}".`,
        entityType: "advertisement",
        entityId: advertisement._id,
        actionUrl: "/admin/advertisements",
        metadata: {
          campaignName: advertisement.campaignName,
          placement: advertisement.placement
        },
        eventKeyPrefix: `ad:${advertisement._id}:activated`
      });
    } catch (notifErr) {
      console.error("[AdNotification] Failed to dispatch ad activation alert:", notifErr.message);
    }

    return advertisement;
  },

  /**
   * Pause an advertisement
   */
  async pauseAdvertisement(id, adminId, req = null) {
    const advertisement = await this.getAdvertisementById(id);

    advertisement.status = "paused";
    advertisement.updatedBy = adminId;
    await advertisement.save();

    if (adminId) {
      await AdminAuditLog.record({
        adminId,
        action: "advertisement:paused",
        targetType: "advertisement",
        targetId: advertisement._id,
        details: { campaignName: advertisement.campaignName, placement: advertisement.placement },
        req
      });
    }

    return advertisement;
  },

  /**
   * Soft-delete / archive an advertisement
   */
  async archiveAdvertisement(id, adminId, req = null) {
    const advertisement = await this.getAdvertisementById(id);

    advertisement.status = "archived";
    advertisement.archivedAt = new Date();
    advertisement.updatedBy = adminId;
    await advertisement.save();

    if (adminId) {
      await AdminAuditLog.record({
        adminId,
        action: "advertisement:archived",
        targetType: "advertisement",
        targetId: advertisement._id,
        details: { campaignName: advertisement.campaignName },
        req
      });
    }

    return advertisement;
  },

  /**
   * Restore an archived advertisement to draft
   */
  async restoreAdvertisement(id, adminId, req = null) {
    const advertisement = await this.getAdvertisementById(id);

    if (advertisement.status !== "archived") {
      const error = new Error("Only archived advertisements can be restored.");
      error.statusCode = 400;
      throw error;
    }

    advertisement.status = "draft";
    advertisement.archivedAt = null;
    advertisement.updatedBy = adminId;
    await advertisement.save();

    if (adminId) {
      await AdminAuditLog.record({
        adminId,
        action: "advertisement:restored",
        targetType: "advertisement",
        targetId: advertisement._id,
        details: { campaignName: advertisement.campaignName, restoredTo: "draft" },
        req
      });
    }

    return advertisement;
  },

  /**
   * Calculate real campaign metrics
   */
  async getAdvertisementStats() {
    const now = new Date();
    const allAds = await Advertisement.find().lean();

    let total = allAds.length;
    let active = 0;
    let draft = 0;
    let paused = 0;
    let scheduled = 0;
    let completed = 0;
    let archived = 0;

    for (const ad of allAds) {
      if (ad.status === "archived") {
        archived++;
        continue;
      }
      if (ad.status === "draft") {
        draft++;
        continue;
      }
      if (ad.status === "paused") {
        paused++;
        continue;
      }
      if (ad.status === "completed") {
        completed++;
        continue;
      }
      if (ad.status === "active") {
        if (ad.startDate && new Date(ad.startDate) > now) {
          scheduled++;
        } else if (ad.endDate && new Date(ad.endDate) < now) {
          completed++;
        } else {
          active++;
        }
      }
    }

    return {
      total,
      active,
      scheduled,
      draft,
      paused,
      completed,
      archived
    };
  },

  /**
   * Retrieve active, scheduled advertisement for a public placement
   * Deterministic priority resolution: highest priority first, then most recently created.
   * Excludes internal metadata and returns clean, public-ready campaign payload.
   */
  async getPublicAdvertisement(placement) {
    const now = new Date();
    const filter = getActiveAdMongoFilter(placement, now);

    const ad = await Advertisement.findOne(filter)
      .sort({ priority: -1, createdAt: -1 })
      .populate("media", "url altText width height")
      .lean();

    if (!ad) {
      return null;
    }

    // Double verify visibility check
    if (!isAdvertisementVisible(ad, now)) {
      return null;
    }

    return {
      id: ad._id,
      campaignName: ad.campaignName,
      advertiserName: ad.advertiserName || "Commercial Partner",
      headline: ad.headline,
      description: ad.description,
      buttonText: ad.buttonText || "Learn More",
      destinationUrl: ad.destinationUrl,
      placement: ad.placement,
      media: ad.media
        ? {
            url: ad.media.url,
            altText: ad.media.altText || ad.headline
          }
        : null
    };
  }
};

export default advertisementService;
