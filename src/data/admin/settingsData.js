export const initialSettings = {
  general: {
    siteName: "NewsFront",
    tagline: "Accurate, In-Depth, and Fearless Pan-African Journalism",
    description: "The digital newsroom dedicated to unbiased investigative reporting, breaking news, corporate analysis, and cultural storytelling across Africa and the global diaspora.",
    contactEmail: "editorial@newsfront.com",
    contactPhone: "+233 24 555 0192",
    address: "Press Center Suite 402, Independence Avenue, Ridge, Accra, Ghana",
    timezone: "Africa/Accra (GMT+0)",
    dateFormat: "MMMM D, YYYY"
  },
  branding: {
    primaryColor: "#0B1B3A",
    brandBlue: "#2563EB",
    accentColor: "#F59E0B",
    logoText: "NewsFront",
    logoSubtitle: "Newsroom Workspace",
    faviconUrl: "/favicon.ico"
  },
  publishing: {
    defaultStatus: "Draft",
    requireEditorialApproval: true,
    allowScheduledArticles: true,
    defaultAuthor: "Mohammed Awal",
    articlesPerPage: 10,
    defaultCategory: "Local News",
    enableComments: true,
    moderateCommentsByDefault: true
  },
  seo: {
    defaultMetaTitle: "NewsFront - Ghana & Pan-African Breaking News, Business & Analysis",
    defaultMetaDescription: "NewsFront delivers unbiased investigative journalism, breaking news, continental market intelligence, and cultural stories.",
    ogImage: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&auto=format&fit=crop&q=80",
    twitterHandle: "@NewsFrontOnline"
  },
  social: {
    twitter: "https://twitter.com/NewsFrontOnline",
    facebook: "https://facebook.com/NewsFrontLive",
    linkedin: "https://linkedin.com/company/newsfront-media",
    youtube: "https://youtube.com/@NewsFrontMedia",
    instagram: "https://instagram.com/newsfront_official"
  },
  notifications: {
    emailOnSubmission: true,
    emailOnApproval: true,
    emailOnComment: true,
    slackWebhookEnabled: false,
    dailyDigest: true,
    breakingNewsAlerts: true
  },
  security: {
    twoFactorAvailable: false,
    notice: "Security controls (password changes, active session invalidation, and 2FA keys) are managed by future server authentication and are currently disabled in this frontend prototype."
  }
};
