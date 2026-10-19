/**
 * Centralized Administrative Permission Definitions and Role Mappings
 * for the Nsemra News Newsroom CMS
 */

export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: "dashboard:view",

  // Profile Management
  PROFILE_READ: "profile:read",
  PROFILE_UPDATE: "profile:update",

  // Staff & Team Management (Super Admin only)
  STAFF_VIEW: "staff:view",
  STAFF_CREATE: "staff:create",
  STAFF_UPDATE: "staff:update",
  STAFF_DISABLE: "staff:disable",
  STAFF_MANAGE_ROLES: "staff:manage_roles",

  // Article Management (Content Permissions)
  ARTICLES_READ: "articles:read",
  ARTICLES_CREATE: "articles:create",
  ARTICLES_UPDATE_OWN: "articles:update_own",
  ARTICLES_UPDATE_ANY: "articles:update_any",
  ARTICLES_PUBLISH: "articles:publish",

  // Editorial Workflow
  EDITORIAL_REVIEW: "editorial:review",
  EDITORIAL_QUEUE_VIEW: "editorial:queue_view",
  EDITORIAL_CLAIM: "editorial:claim",
  EDITORIAL_ASSIGN: "editorial:assign",
  EDITORIAL_APPROVE: "editorial:approve",
  EDITORIAL_REQUEST_CHANGES: "editorial:request_changes",
  EDITORIAL_REJECT: "editorial:reject",
  EDITORIAL_HISTORY_VIEW: "editorial:history_view",

  // Taxonomy & Assets
  CATEGORIES_READ: "categories:read",
  CATEGORIES_MANAGE: "categories:manage",
  TAGS_READ: "tags:read",
  TAGS_MANAGE: "tags:manage",
  MEDIA_MANAGE: "media:manage",

  // Reader Engagement
  COMMENTS_MODERATE: "comments:moderate",

  // Commercial & Static Pages
  ADS_VIEW: "ads:view",
  ADS_CREATE: "ads:create",
  ADS_UPDATE: "ads:update",
  ADS_MANAGE: "ads:manage",

  PAGES_VIEW: "pages:view",
  PAGES_UPDATE: "pages:update",
  PAGES_PREVIEW: "pages:preview",
  PAGES_PUBLISH: "pages:publish",
  PAGES_RESTORE: "pages:restore",
  PAGES_MANAGE: "pages:manage",

  // System & Analytics
  ANALYTICS_VIEW: "analytics:view",
  SETTINGS_MANAGE: "settings:manage"
};

/**
 * Role-to-Permissions Mapping
 */
export const ROLE_PERMISSIONS = {
  super_admin: Object.values(PERMISSIONS),

  editor: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.PROFILE_READ,
    PERMISSIONS.PROFILE_UPDATE,
    PERMISSIONS.ARTICLES_READ,
    PERMISSIONS.ARTICLES_CREATE,
    PERMISSIONS.ARTICLES_UPDATE_ANY,
    PERMISSIONS.ARTICLES_PUBLISH,
    PERMISSIONS.EDITORIAL_REVIEW,
    PERMISSIONS.EDITORIAL_QUEUE_VIEW,
    PERMISSIONS.EDITORIAL_CLAIM,
    PERMISSIONS.EDITORIAL_ASSIGN,
    PERMISSIONS.EDITORIAL_APPROVE,
    PERMISSIONS.EDITORIAL_REQUEST_CHANGES,
    PERMISSIONS.EDITORIAL_REJECT,
    PERMISSIONS.EDITORIAL_HISTORY_VIEW,
    PERMISSIONS.CATEGORIES_READ,
    PERMISSIONS.CATEGORIES_MANAGE,
    PERMISSIONS.TAGS_READ,
    PERMISSIONS.TAGS_MANAGE,
    PERMISSIONS.MEDIA_MANAGE,
    PERMISSIONS.COMMENTS_MODERATE,
    PERMISSIONS.PAGES_VIEW,
    PERMISSIONS.PAGES_UPDATE,
    PERMISSIONS.PAGES_PREVIEW,
    PERMISSIONS.ANALYTICS_VIEW
  ],

  author: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.PROFILE_READ,
    PERMISSIONS.PROFILE_UPDATE,
    PERMISSIONS.ARTICLES_READ,
    PERMISSIONS.ARTICLES_CREATE,
    PERMISSIONS.ARTICLES_UPDATE_OWN,
    PERMISSIONS.CATEGORIES_READ,
    PERMISSIONS.TAGS_READ,
    PERMISSIONS.MEDIA_MANAGE
  ]
};

/**
 * Check if a given role possesses a required permission
 * @param {string} role - 'super_admin' | 'editor' | 'author'
 * @param {string} permission - One of PERMISSIONS
 * @returns {boolean}
 */
export const hasPermission = (role, permission) => {
  if (!role || !permission) return false;
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
};

export default {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission
};
