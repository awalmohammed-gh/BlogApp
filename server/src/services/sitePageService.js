import mongoose from "mongoose";
import SitePage, { ALLOWED_PAGE_KEYS } from "../models/SitePage.js";
import SitePageRevision from "../models/SitePageRevision.js";
import AdminAuditLog from "../models/AdminAuditLog.js";
import notificationService from "./notificationService.js";

// Canonical initial page content reflecting verified public site copy
export const DEFAULT_PAGE_DEFINITIONS = [
  {
    pageKey: "home",
    title: "Homepage Editorial Content",
    slug: "/",
    sections: [
      {
        id: "home-hero",
        type: "hero",
        order: 1,
        enabled: true,
        data: {
          kicker: "The Digital Frontline of African & Global Journalism",
          title: "Stories That Matter.",
          description:
            "Delivering independent, fact-checked reporting, investigative inquiries, and breaking developments from Accra, the West African corridor, and key capitals across the world.",
          buttonText: "Browse Stories",
          buttonUrl: "#articles-section",
          secondaryButtonText: "Latest News Wire",
          secondaryButtonUrl: "/blog",
          bgImage: "/heroBg.jpg"
        }
      },
      {
        id: "home-promo",
        type: "promotional",
        order: 2,
        enabled: true,
        data: {
          tag: "Commercial Partner Feature",
          title: "Connect Your Brand with Over 500,000 Discerning Decision-Makers Across Africa",
          description:
            "From executive briefings to bespoke industry reports, Nsemra News offers high-impact commercial partnerships that deliver your message directly to corporate leaders, policymakers, and forward-thinking consumers.",
          buttonText: "Explore Partnership Options",
          buttonUrl: "/contact"
        }
      },
      {
        id: "home-newsletter",
        type: "newsletter",
        order: 3,
        enabled: true,
        data: {
          title: "The Nsemra News Daily Briefing",
          description:
            "Curated morning intelligence on Pan-African politics, business, markets, and investigative exclusives delivered straight to your inbox.",
          buttonText: "Subscribe Now"
        }
      }
    ]
  },
  {
    pageKey: "all-stories",
    title: "All Stories & Editorial Archive",
    slug: "/blog",
    sections: [
      {
        id: "all-stories-hero",
        type: "hero",
        order: 1,
        enabled: true,
        data: {
          kicker: "Editorial Archive & Real-time Wire",
          title: "Explore the Full Nsemra News Archive",
          description:
            "Search thousands of verified reports categorized across our specialized news desks. Every article reflects Nsemra News's strict verification standards.",
          bgImage:
            "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1200&auto=format&fit=crop&q=80",
          buttonText: "Browse Categories",
          buttonUrl: "/category"
        }
      }
    ]
  },
  {
    pageKey: "about",
    title: "About Nsemra News Bureau",
    slug: "/about",
    sections: [
      {
        id: "about-hero",
        type: "hero",
        order: 1,
        enabled: true,
        data: {
          kicker: "Nsemra News Editorial Bureau & Press House",
          title: "Independent, Fact-Checked Journalism",
          description:
            "Ghana's premier modern digital news platform delivering fearless investigative reporting, economic analysis, and cultural coverage across Africa and the world.",
          bgImage:
            "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&auto=format&fit=crop&q=80"
        }
      },
      {
        id: "about-mission",
        type: "text_content",
        order: 2,
        enabled: true,
        data: {
          tag: "Our Purpose",
          title: "Informing the public, fostering accountability, and celebrating progress.",
          body: "Founded with the vision to bridge local grassroots realities with continental and global perspectives, Nsemra News delivers clear, credible, and context-rich coverage. Whether tracking legislative bills in Parliament, examining technological breakthroughs, or following sports championships, we put truth first."
        }
      },
      {
        id: "about-charter",
        type: "custom_editorial",
        order: 3,
        enabled: true,
        data: {
          title: "Our Editorial Charter",
          charterText:
            '"To report without fear or favor, to amplify overlooked voices, and to illuminate complex events through fair, evidence-backed inquiry that empowers citizens and leaders alike."',
          adoptedIn: "Adopted in Accra, Ghana",
          board: "Nsemra News Editorial Board"
        }
      }
    ]
  },
  {
    pageKey: "contact",
    title: "Contact & Bureau Inquiries",
    slug: "/contact",
    sections: [
      {
        id: "contact-hero",
        type: "hero",
        order: 1,
        enabled: true,
        data: {
          title: "Connect With Our Global Newsroom",
          description:
            "Submit confidential news tips, reach bureau correspondents, propose editorial corrections, or discuss advertising partnerships."
        }
      },
      {
        id: "contact-info",
        type: "contact_info",
        order: 2,
        enabled: true,
        data: {
          primaryEmail: "",
          secondaryEmail: "",
          primaryPhone: "",
          secondaryPhone: "",
          address: "",
          hours: ""
        }
      }
    ]
  },
  {
    pageKey: "editorial-standards",
    title: "Editorial Guidelines & Ethics Code",
    slug: "/editorial-standards",
    sections: [
      {
        id: "standards-hero",
        type: "hero",
        order: 1,
        enabled: true,
        data: {
          title: "The Nsemra News Standards of Practice",
          description:
            "Our binding commitment to fairness, rigorous source verification, and independent fact-checking."
        }
      }
    ]
  }
];

export const sitePageService = {
  /**
   * Idempotent initialization of supported website pages with default approved copy
   */
  async initializePages(adminId = null) {
    const initialized = [];
    for (const def of DEFAULT_PAGE_DEFINITIONS) {
      let page = await SitePage.findOne({ pageKey: def.pageKey });
      if (!page) {
        page = new SitePage({
          pageKey: def.pageKey,
          title: def.title,
          slug: def.slug,
          sections: def.sections,
          status: "published",
          publishedAt: new Date(),
          publishedBy: adminId,
          createdBy: adminId,
          updatedBy: adminId
        });
        await page.save();

        // Create initial immutable Revision 1
        const initialRevision = await SitePageRevision.create({
          pageId: page._id,
          pageKey: page.pageKey,
          version: 1,
          sections: def.sections,
          changeSummary: "Initial approved website copy initialization",
          createdBy: adminId
        });

        page.publishedRevision = initialRevision._id;
        page.workingRevision = initialRevision._id;
        await page.save();

        initialized.push(page.pageKey);
      }
    }
    return initialized;
  },

  /**
   * List all editable site pages with revision state
   */
  async getPages() {
    await this.initializePages();

    const pages = await SitePage.find()
      .populate("publishedRevision", "version changeSummary createdAt")
      .populate("workingRevision", "version changeSummary createdAt")
      .populate("publishedBy", "_id name email")
      .populate("updatedBy", "_id name email")
      .sort({ createdAt: 1 })
      .lean();

    return pages.map((p) => ({
      _id: p._id,
      pageKey: p.pageKey,
      title: p.title,
      slug: p.slug,
      status: p.status,
      sectionsCount: (p.sections || []).length,
      publishedVersion: p.publishedRevision?.version || 1,
      workingVersion: p.workingRevision?.version || 1,
      hasUnpublishedDraft:
        p.workingRevision &&
        p.publishedRevision &&
        p.workingRevision._id.toString() !== p.publishedRevision._id.toString(),
      publishedAt: p.publishedAt,
      publishedBy: p.publishedBy,
      updatedAt: p.updatedAt,
      updatedBy: p.updatedBy
    }));
  },

  /**
   * Get single page details for admin editor
   */
  async getPageByKey(pageKey) {
    if (!ALLOWED_PAGE_KEYS.includes(pageKey)) {
      const error = new Error(`Page key '${pageKey}' is not a recognized site page.`);
      error.statusCode = 404;
      throw error;
    }

    await this.initializePages();

    const page = await SitePage.findOne({ pageKey })
      .populate("publishedRevision")
      .populate("workingRevision")
      .populate("publishedBy", "_id name email")
      .populate("updatedBy", "_id name email");

    if (!page) {
      const error = new Error(`Page '${pageKey}' not found.`);
      error.statusCode = 404;
      throw error;
    }

    // Determine current editable draft sections
    let currentWorkingSections = page.sections;
    if (page.workingRevision && page.workingRevision.sections) {
      currentWorkingSections = page.workingRevision.sections;
    }

    return {
      _id: page._id,
      pageKey: page.pageKey,
      title: page.title,
      slug: page.slug,
      status: page.status,
      sections: currentWorkingSections,
      publishedSections: page.publishedRevision?.sections || page.sections,
      publishedVersion: page.publishedRevision?.version || 1,
      workingVersion: page.workingRevision?.version || 1,
      hasUnpublishedDraft:
        page.workingRevision &&
        page.publishedRevision &&
        page.workingRevision._id.toString() !== page.publishedRevision._id.toString(),
      publishedAt: page.publishedAt,
      publishedBy: page.publishedBy,
      updatedAt: page.updatedAt,
      updatedBy: page.updatedBy
    };
  },

  /**
   * Save draft content without touching published revision
   */
  async saveDraft(pageKey, updateData, adminId, req = null) {
    const { title, sections, changeSummary, expectedVersion } = updateData;

    await this.initializePages(adminId);

    const page = await SitePage.findOne({ pageKey })
      .populate("workingRevision")
      .populate("publishedRevision");

    if (!page) {
      const error = new Error(`Page '${pageKey}' not found.`);
      error.statusCode = 404;
      throw error;
    }

    // Optimistic concurrency check
    if (expectedVersion && page.workingRevision?.version) {
      if (expectedVersion !== page.workingRevision.version) {
        const error = new Error(
          "Conflict: This page draft has been modified by another administrator. Please refresh before saving."
        );
        error.statusCode = 409;
        throw error;
      }
    }

    if (title) {
      page.title = title;
    }

    // Determine next draft version
    const latestRevision = await SitePageRevision.findOne({ pageId: page._id }).sort({ version: -1 });
    const nextVersion = (latestRevision ? latestRevision.version : 0) + 1;

    // Create a new working draft revision
    const newDraftRevision = await SitePageRevision.create({
      pageId: page._id,
      pageKey: page.pageKey,
      version: nextVersion,
      sections: sections || page.sections,
      changeSummary: changeSummary || "Draft update",
      createdBy: adminId
    });

    page.workingRevision = newDraftRevision._id;
    page.updatedBy = adminId;
    await page.save();

    if (adminId) {
      await AdminAuditLog.record({
        adminId,
        action: "page:draft_saved",
        targetType: "page",
        targetId: page._id,
        details: {
          pageKey: page.pageKey,
          version: nextVersion,
          changeSummary
        },
        req
      });
    }

    return await this.getPageByKey(pageKey);
  },

  /**
   * Preview draft content (authorized admin only)
   */
  async previewDraft(pageKey) {
    const pageData = await this.getPageByKey(pageKey);
    return {
      pageKey: pageData.pageKey,
      title: pageData.title,
      slug: pageData.slug,
      sections: pageData.sections,
      version: pageData.workingVersion,
      isPreview: true
    };
  },

  /**
   * Publish content to public live website
   * Atomically points publishedRevision to the validated revision
   */
  async publishPage(pageKey, publishData = {}, adminId, req = null) {
    await this.initializePages(adminId);

    const page = await SitePage.findOne({ pageKey }).populate("workingRevision");
    if (!page) {
      const error = new Error(`Page '${pageKey}' not found.`);
      error.statusCode = 404;
      throw error;
    }

    const sectionsToPublish =
      publishData.sections || (page.workingRevision ? page.workingRevision.sections : page.sections);

    const latestRevision = await SitePageRevision.findOne({ pageId: page._id }).sort({ version: -1 });
    const publishVersion = (latestRevision ? latestRevision.version : 0) + 1;

    const publishedRevision = await SitePageRevision.create({
      pageId: page._id,
      pageKey: page.pageKey,
      version: publishVersion,
      sections: sectionsToPublish,
      changeSummary: publishData.changeSummary || `Published version ${publishVersion}`,
      createdBy: adminId
    });

    // Update SitePage atomically
    page.publishedRevision = publishedRevision._id;
    page.workingRevision = publishedRevision._id;
    page.sections = sectionsToPublish;
    page.status = "published";
    page.publishedAt = new Date();
    page.publishedBy = adminId;
    page.updatedBy = adminId;
    await page.save();

    if (adminId) {
      await AdminAuditLog.record({
        adminId,
        action: "page:published",
        targetType: "page",
        targetId: page._id,
        details: {
          pageKey: page.pageKey,
          version: publishVersion,
          sectionsCount: sectionsToPublish.length
        },
        req
      });
    }

    // Notify active Editors and Super Admins about page publication
    try {
      await notificationService.notifyRoles({
        roles: ["super_admin", "editor"],
        excludeAdminIds: adminId ? [adminId] : [],
        actorId: adminId || null,
        type: notificationService.NOTIFICATION_TYPES.CMS_PAGE_PUBLISHED,
        title: "Website Content Published",
        message: `Page "${page.title}" has been published to live version v${publishVersion}.`,
        entityType: "site_page",
        entityId: page._id,
        actionUrl: "/admin/pages",
        metadata: {
          pageKey: page.pageKey,
          version: publishVersion
        },
        eventKeyPrefix: `page:${page.pageKey}:published:v${publishVersion}`
      });
    } catch (notifErr) {
      console.error("[CMSNotification] Failed to dispatch page publication alert:", notifErr.message);
    }

    return await this.getPageByKey(pageKey);
  },

  /**
   * Get revision history for a page
   */
  async getRevisions(pageKey) {
    const page = await SitePage.findOne({ pageKey });
    if (!page) {
      const error = new Error(`Page '${pageKey}' not found.`);
      error.statusCode = 404;
      throw error;
    }

    const revisions = await SitePageRevision.find({ pageId: page._id })
      .sort({ version: -1 })
      .populate("createdBy", "_id name email")
      .lean();

    return revisions.map((rev) => ({
      _id: rev._id,
      version: rev.version,
      changeSummary: rev.changeSummary,
      sectionsCount: (rev.sections || []).length,
      isCurrentlyPublished: page.publishedRevision?.toString() === rev._id.toString(),
      isCurrentWorkingDraft: page.workingRevision?.toString() === rev._id.toString(),
      createdAt: rev.createdAt,
      createdBy: rev.createdBy
    }));
  },

  /**
   * Restore a historical revision into a new working draft
   */
  async restoreRevision(pageKey, version, adminId, req = null) {
    const page = await SitePage.findOne({ pageKey });
    if (!page) {
      const error = new Error(`Page '${pageKey}' not found.`);
      error.statusCode = 404;
      throw error;
    }

    const revisionToRestore = await SitePageRevision.findOne({
      pageId: page._id,
      version
    });

    if (!revisionToRestore) {
      const error = new Error(`Revision version ${version} not found for page '${pageKey}'.`);
      error.statusCode = 404;
      throw error;
    }

    // Determine next draft version
    const latestRevision = await SitePageRevision.findOne({ pageId: page._id }).sort({ version: -1 });
    const nextVersion = (latestRevision ? latestRevision.version : 0) + 1;

    // Create new working revision based on the restored sections
    const newWorkingDraft = await SitePageRevision.create({
      pageId: page._id,
      pageKey: page.pageKey,
      version: nextVersion,
      sections: revisionToRestore.sections,
      changeSummary: `Restored from version ${version}`,
      createdBy: adminId
    });

    page.workingRevision = newWorkingDraft._id;
    page.updatedBy = adminId;
    await page.save();

    if (adminId) {
      await AdminAuditLog.record({
        adminId,
        action: "page:revision_restored",
        targetType: "page",
        targetId: page._id,
        details: {
          pageKey: page.pageKey,
          restoredFromVersion: version,
          newWorkingVersion: nextVersion
        },
        req
      });
    }

    return await this.getPageByKey(pageKey);
  },

  /**
   * Public Read-Only Endpoint
   * Returns ONLY published content sections. Excludes draft revisions and internal metadata.
   */
  async getPublicPage(pageKey) {
    if (!ALLOWED_PAGE_KEYS.includes(pageKey)) {
      const error = new Error(`Page '${pageKey}' is not recognized.`);
      error.statusCode = 404;
      throw error;
    }

    await this.initializePages();

    const page = await SitePage.findOne({ pageKey, status: "published" })
      .populate("publishedRevision")
      .lean();

    if (!page) {
      const error = new Error(`Page '${pageKey}' has no published content available.`);
      error.statusCode = 404;
      throw error;
    }

    const sections = page.publishedRevision?.sections || page.sections || [];

    // Filter to only enabled sections and format clean data
    const publicSections = sections
      .filter((s) => s.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((s) => ({
        id: s.id,
        type: s.type,
        order: s.order,
        data: s.data
      }));

    return {
      pageKey: page.pageKey,
      title: page.title,
      slug: page.slug,
      sections: publicSections,
      publishedAt: page.publishedAt
    };
  }
};

export default sitePageService;
