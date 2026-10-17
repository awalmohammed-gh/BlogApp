export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard:view",
  PROFILE_READ: "profile:read",
  PROFILE_UPDATE: "profile:update",
  STAFF_VIEW: "staff:view",
  STAFF_CREATE: "staff:create",
  STAFF_UPDATE: "staff:update",
  STAFF_DISABLE: "staff:disable",
  STAFF_MANAGE_ROLES: "staff:manage_roles",
  ARTICLES_READ: "articles:read",
  ARTICLES_CREATE: "articles:create",
  ARTICLES_UPDATE_OWN: "articles:update_own",
  ARTICLES_UPDATE_ANY: "articles:update_any",
  ARTICLES_PUBLISH: "articles:publish",
  EDITORIAL_REVIEW: "editorial:review",
  CATEGORIES_MANAGE: "categories:manage",
  TAGS_MANAGE: "tags:manage",
  MEDIA_MANAGE: "media:manage",
  COMMENTS_MODERATE: "comments:moderate",
  ADS_MANAGE: "ads:manage",
  PAGES_MANAGE: "pages:manage",
  ANALYTICS_VIEW: "analytics:view",
  SETTINGS_MANAGE: "settings:manage"
};

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
    PERMISSIONS.CATEGORIES_MANAGE,
    PERMISSIONS.TAGS_MANAGE,
    PERMISSIONS.MEDIA_MANAGE,
    PERMISSIONS.COMMENTS_MODERATE,
    PERMISSIONS.ANALYTICS_VIEW
  ],

  author: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.PROFILE_READ,
    PERMISSIONS.PROFILE_UPDATE,
    PERMISSIONS.ARTICLES_READ,
    PERMISSIONS.ARTICLES_CREATE,
    PERMISSIONS.ARTICLES_UPDATE_OWN,
    PERMISSIONS.MEDIA_MANAGE
  ]
};

export const hasPermission = (role, permission) => {
  if (!role || !permission) return false;
  const perms = ROLE_PERMISSIONS[role];
  return perms ? perms.includes(permission) : false;
};

export default {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission
};
