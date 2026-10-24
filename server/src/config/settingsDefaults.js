export const settingsDefaults = {
  general: {
    siteName: "Nsemfoa News", tagline: "Stories That Matter.", description: "Independent journalism from Ghana, Africa and beyond.",
    contactEmail: "", contactPhone: "", address: "", timezone: "Africa/Accra", dateFormat: "MMMM D, YYYY"
  },
  branding: {
    primaryColor: "#0B1B3A", brandBlue: "#2563EB",
    // Media Library images; fallback to default PWA brand assets
    logoUrl: "/app-logo.png", logoMediaId: "", logoIncludesName: true,
    faviconUrl: "/favicon.png", faviconMediaId: ""
  },
  publishing: { requireEditorialApproval: true, allowScheduledArticles: true, articlesPerPage: 10, enableComments: true, moderateCommentsByDefault: true },
  seo: { defaultMetaTitle: "Nsemfoa News | Stories That Matter.", defaultMetaDescription: "Independent news, reporting and analysis.", twitterHandle: "" },
  social: { twitter: "", facebook: "", linkedin: "", youtube: "", instagram: "" }
};
