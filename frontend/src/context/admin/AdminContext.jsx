import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import categoryService from "../../services/admin/categoryService";
import articleService from "../../services/admin/articleService";
import { analyticsService } from "../../services/admin/analyticsService";
import staffService from "../../services/admin/staffService";
import sitePageService from "../../services/admin/sitePageService";

const AdminContext = createContext();

const STATUS_LABELS = {
  published: "Published",
  pending_review: "Pending Review",
  scheduled: "Scheduled",
  archived: "Archived",
  draft: "Draft"
};

const toListArticle = (art) => ({
  _id: art._id,
  title: art.title,
  subTitle: art.subTitle || "",
  slug: art.slug,
  excerpt: art.excerpt || "",
  description: art.content || art.excerpt || "",
  content: art.content || art.excerpt || "",
  category: art.category?.name || "Uncategorized",
  author: art.author?.name || "",
  status: STATUS_LABELS[art.status] || "Draft",
  image: art.featuredImage?.url || "",
  featuredImage: art.featuredImage,
  isPublished: art.status === "published",
  isFeatured: art.isFeatured || false,
  isBreaking: art.isBreakingNews || false,
  views: art.views || 0,
  date: art.createdAt
    ? new Date(art.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "",
  tags: (art.tags || []).map((t) => (typeof t === "object" ? t.name : t))
});

// Pure fetchers: they never throw and resolve to the value to store.
const fetchRecentArticles = () =>
  articleService
    .getArticles({ limit: 20 })
    .then((res) => (res?.success && Array.isArray(res.data) ? res.data.map(toListArticle) : []))
    .catch(() => []);
const fetchOverview = () =>
  analyticsService
    .getOverview()
    .then((res) => (res?.success && res.data ? res.data : null))
    .catch(() => null);

/**
 * Shared admin shell state. Every collection here is read from the Express API;
 * there is no session-only or sample data. Mutations go through the API and are
 * followed by a refresh.
 */
export const AdminProvider = ({ children }) => {
  const { admin: authAdmin } = useAuth();

  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [pages, setPages] = useState([]);
  // Real, role-scoped counts from /admin/analytics/overview; null until loaded or if unavailable
  const [overview, setOverview] = useState(null);

  const currentAdminUser = authAdmin
    ? {
        id: authAdmin._id,
        name: authAdmin.name || "",
        email: authAdmin.email,
        role: authAdmin.role === "super_admin" ? "Super Admin" : authAdmin.role === "editor" ? "Editor" : "Author",
        avatar: authAdmin.avatar || "",
        bio: authAdmin.bio || "",
        phone: authAdmin.phone || ""
      }
    : { id: "", name: "", email: "", role: "", avatar: "", bio: "", phone: "" };

  const refreshOverview = useCallback(() => fetchOverview().then(setOverview), []);

  const refreshAdminData = useCallback(
    () => Promise.all([fetchRecentArticles().then(setArticles), fetchOverview().then(setOverview)]),
    []
  );

  // The provider lives inside the authenticated admin layout and unmounts on logout,
  // so there is no previous session's data to clear here.
  useEffect(() => {
    if (!authAdmin?._id) return;

    fetchRecentArticles().then(setArticles);
    fetchOverview().then(setOverview);

    categoryService
      .getActiveCategories()
      .then((res) =>
        setCategories(
          res?.success && Array.isArray(res.data)
            ? res.data.map((c) => ({ id: c._id, name: c.name, slug: c.slug, description: c.description, color: c.color }))
            : []
        )
      )
      .catch(() => setCategories([]));

    if (authAdmin?.role === "super_admin") {
      staffService
        .getStaff({ limit: 100 })
        .then((res) =>
          setAuthors(
            Array.isArray(res?.data)
              ? res.data.map((s) => ({ id: s._id, name: s.name, email: s.email, role: s.role }))
              : []
          )
        )
        .catch(() => setAuthors([]));
    }

    if (["super_admin", "editor"].includes(authAdmin?.role)) {
      sitePageService
        .getPages()
        .then((res) =>
          setPages(
            Array.isArray(res?.data)
              ? res.data.map((p) => ({ id: p._id || p.pageKey, title: p.title, slug: p.slug || p.pageKey, status: p.status || (p.publishedRevision ? "Published" : "Draft") }))
              : []
          )
        )
        .catch(() => setPages([]));
    }
  }, [authAdmin?._id, authAdmin?.role]);

  // Keep counts current when the admin returns to the tab
  useEffect(() => {
    if (!authAdmin) return;
    window.addEventListener("focus", refreshOverview);
    return () => window.removeEventListener("focus", refreshOverview);
  }, [authAdmin?._id, refreshOverview]);

  /** Archive (soft delete) an article in MongoDB, then refresh lists and counts. */
  const deleteArticle = async (id) => {
    const res = await articleService.deleteArticle(id);
    await refreshAdminData();
    return res;
  };

  // UI States
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Keyboard shortcut listener for Ctrl+K / Cmd+K global search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const value = {
    articles,
    categories,
    authors,
    pages,
    overview,
    currentAdminUser,
    refreshAdminData,
    deleteArticle,

    isSidebarCollapsed,
    setIsSidebarCollapsed,
    toggleSidebarCollapsed: () => setIsSidebarCollapsed((prev) => !prev),
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    openMobileSidebar: () => setIsMobileSidebarOpen(true),
    closeMobileSidebar: () => setIsMobileSidebarOpen(false),
    isSearchOpen,
    setIsSearchOpen,
    openSearch: () => setIsSearchOpen(true),
    closeSearch: () => setIsSearchOpen(false)
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
};
