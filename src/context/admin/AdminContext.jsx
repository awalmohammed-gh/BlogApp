import { createContext, useContext, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext";

import { slugify as generateSlug } from "../../utils/slugify";
import { initialSettings } from "../../data/admin/settingsData";
import categoryService from "../../services/admin/categoryService";
import tagService from "../../services/admin/tagService";
import articleService from "../../services/admin/articleService";

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const { admin: authAdmin } = useAuth();

  // Clean real database state (NO mock data fallbacks)
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [comments, setComments] = useState([]);
  const [advertisements, setAdvertisements] = useState([]);
  const [pages, setPages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [media, setMedia] = useState([]);
  const [settings, setSettings] = useState(initialSettings);

  // Active Admin User profile
  const [currentAdminUser, setCurrentAdminUser] = useState({
    id: "",
    name: "NewsFront Staff",
    email: "",
    role: "Staff",
    avatar: "/favicon.ico",
    bio: "",
    phone: "",
    title: "",
    location: ""
  });

  // Sync with real authenticated admin when loaded
  useEffect(() => {
    if (authAdmin) {
      setCurrentAdminUser({
        id: authAdmin._id,
        name: authAdmin.name || "Administrator",
        email: authAdmin.email,
        role:
          authAdmin.role === "super_admin"
            ? "Super Admin"
            : authAdmin.role === "editor"
            ? "Editor"
            : "Author",
        avatar: authAdmin.avatar || "/favicon.ico",
        bio: authAdmin.bio || "",
        phone: authAdmin.phone || "",
        title: authAdmin.title || "",
        location: authAdmin.location || ""
      });
    }
  }, [authAdmin]);

  // Synchronize active categories and tags from MongoDB for article drafting
  useEffect(() => {
    if (authAdmin) {
      categoryService
        .getActiveCategories()
        .then((res) => {
          if (res?.success && Array.isArray(res.data)) {
            setCategories(
              res.data.map((c) => ({
                id: c._id,
                name: c.name,
                slug: c.slug,
                description: c.description,
                color: c.color,
                status: "Active",
                displayOrder: c.displayOrder,
                articleCount: 0
              }))
            );
          } else {
            setCategories([]);
          }
        })
        .catch(() => setCategories([]));

      tagService
        .getActiveTags()
        .then((res) => {
          if (res?.success && Array.isArray(res.data)) {
            setTags(
              res.data.map((t) => ({
                id: t._id,
                name: t.name,
                slug: t.slug,
                description: t.description,
                articleCount: 0
              }))
            );
          } else {
            setTags([]);
          }
        })
        .catch(() => setTags([]));

      // Synchronize real MongoDB articles for dashboard overview
      articleService
        .getArticles({ limit: 20 })
        .then((res) => {
          if (res?.success && Array.isArray(res.data)) {
            setArticles(
              res.data.map((art) => ({
                _id: art._id,
                title: art.title,
                subTitle: art.subTitle || "",
                slug: art.slug,
                excerpt: art.excerpt || "",
                description: art.content || art.excerpt || "",
                content: art.content || art.excerpt || "",
                category: art.category?.name || "General",
                author: art.author?.name || "Staff",
                status:
                  art.status === "published"
                    ? "Published"
                    : art.status === "pending_review"
                    ? "Pending Review"
                    : art.status === "scheduled"
                    ? "Scheduled"
                    : art.status === "archived"
                    ? "Archived"
                    : "Draft",
                image: art.featuredImage?.url || art.image || "",
                featuredImage: art.featuredImage,
                isPublished: art.status === "published",
                isFeatured: art.isFeatured || false,
                isBreaking: art.isBreakingNews || false,
                views: art.views || 0,
                date: art.createdAt
                  ? new Date(art.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric"
                    })
                  : "Recently",
                tags: (art.tags || []).map((t) => (typeof t === "object" ? t.name : t))
              }))
            );
          } else {
            setArticles([]);
          }
        })
        .catch(() => setArticles([]));
    }
  }, [authAdmin]);


  // Simulated role preview for testing RBAC views (Super Admin | Editor | Author)
  const [rolePreview, setRolePreview] = useState("Super Admin");

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

  // Sync category article counts based on active articles
  useEffect(() => {
    setCategories((prevCategories) =>
      prevCategories.map((cat) => {
        const count = articles.filter(
          (a) => a.category?.toLowerCase() === cat.name?.toLowerCase()
        ).length;
        return { ...cat, articleCount: count };
      })
    );
  }, [articles]);

  // Sync tag counts
  useEffect(() => {
    setTags((prevTags) =>
      prevTags.map((tag) => {
        const count = articles.filter(
          (a) => a.tags && a.tags.some((t) => t.toLowerCase() === tag.name.toLowerCase())
        ).length;
        return { ...tag, articleCount: count };
      })
    );
  }, [articles]);

  // Sync author article counts
  useEffect(() => {
    setAuthors((prevAuthors) =>
      prevAuthors.map((auth) => {
        const count = articles.filter(
          (a) => a.author?.toLowerCase() === auth.name?.toLowerCase()
        ).length;
        return { ...auth, articlesCount: count };
      })
    );
  }, [articles]);

  // ==========================================
  // ARTICLE OPERATIONS
  // ==========================================

  const createArticle = (articleData) => {
    const newId = "art-" + Date.now();
    const finalSlug = articleData.slug?.trim()
      ? generateSlug(articleData.slug)
      : generateSlug(articleData.title);

    const isPublished = articleData.status === "Published";

    const newArticle = {
      ...articleData,
      _id: newId,
      slug: finalSlug,
      views: 0,
      date: articleData.date || new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      isPublished: isPublished,
      editorialNotes: articleData.status === "Pending Review"
        ? [{
            id: `note-${Date.now()}`,
            date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
            reviewer: currentAdminUser.name,
            note: "Submitted for editorial review.",
            status: "Under Review"
          }]
        : []
    };

    setArticles((prev) => [newArticle, ...prev]);

    // Push simulated notification
    if (newArticle.status === "Pending Review") {
      addNotification({
        title: "New Article Submitted for Review",
        message: `${newArticle.author} submitted '${newArticle.title}' for editorial approval.`,
        type: "submission",
        targetUrl: "/admin/editorial"
      });
    }

    toast.success("Article created successfully (Session State)");
    return newArticle;
  };

  const updateArticle = (id, updatedFields) => {
    let statusChanged = false;
    let newStatus = "";

    setArticles((prev) =>
      prev.map((art) => {
        if (art._id === id) {
          if (updatedFields.status && updatedFields.status !== art.status) {
            statusChanged = true;
            newStatus = updatedFields.status;
          }
          const isPublished = (updatedFields.status || art.status) === "Published";
          return {
            ...art,
            ...updatedFields,
            isPublished
          };
        }
        return art;
      })
    );

    if (statusChanged && newStatus === "Published") {
      addNotification({
        title: "Article Published",
        message: `Article #${id} was moved to Published state.`,
        type: "approval",
        targetUrl: "/admin/articles"
      });
    }

    toast.success("Article updated successfully");
  };

  const deleteArticle = (id) => {
    setArticles((prev) => prev.filter((art) => art._id !== id));
    toast.success("Article deleted");
  };

  const bulkDeleteArticles = (ids) => {
    setArticles((prev) => prev.filter((art) => !ids.includes(art._id)));
    toast.success(`${ids.length} articles deleted`);
  };

  const bulkUpdateArticleStatus = (ids, status) => {
    const isPublished = status === "Published";
    setArticles((prev) =>
      prev.map((art) => (ids.includes(art._id) ? { ...art, status, isPublished } : art))
    );
    toast.success(`${ids.length} articles updated to ${status}`);
  };

  const duplicateArticle = (id) => {
    const target = articles.find((a) => a._id === id);
    if (!target) return;

    const cloned = {
      ...target,
      _id: "art-copy-" + Date.now(),
      title: `${target.title} (Draft Copy)`,
      slug: `${target.slug}-copy`,
      status: "Draft",
      isPublished: false,
      views: 0,
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      editorialNotes: []
    };

    setArticles((prev) => [cloned, ...prev]);
    toast.success("Article duplicated as draft");
  };

  const publishArticle = (id) => {
    updateArticle(id, { status: "Published", isPublished: true });
  };

  const unpublishArticle = (id) => {
    updateArticle(id, { status: "Draft", isPublished: false });
  };

  const submitForReview = (id) => {
    updateArticle(id, { status: "Pending Review", isPublished: false });
  };

  // Editorial workflow updates
  const updateEditorialStatus = (id, newStatus, reviewerNote, reviewerName = currentAdminUser.name) => {
    setArticles((prev) =>
      prev.map((art) => {
        if (art._id === id) {
          const newNote = {
            id: `note-${Date.now()}`,
            date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
            reviewer: reviewerName,
            note: reviewerNote || `Editorial status updated to ${newStatus}.`,
            status: newStatus
          };

          return {
            ...art,
            status: newStatus,
            isPublished: newStatus === "Published",
            editorialNotes: [newNote, ...(art.editorialNotes || [])]
          };
        }
        return art;
      })
    );

    addNotification({
      title: `Editorial Decision: ${newStatus}`,
      message: `${reviewerName} updated editorial status to ${newStatus}.`,
      type: newStatus === "Published" ? "approval" : newStatus === "Rejected" ? "rejection" : "revision",
      targetUrl: "/admin/editorial"
    });

    toast.success(`Article status updated to ${newStatus}`);
  };

  // ==========================================
  // CATEGORIES OPERATIONS
  // ==========================================

  const createCategory = (data) => {
    const newCat = {
      ...data,
      id: "cat-" + generateSlug(data.name),
      slug: generateSlug(data.slug || data.name),
      articleCount: 0,
      status: data.status || "Active",
      displayOrder: categories.length + 1
    };
    setCategories((prev) => [...prev, newCat]);
    toast.success("Category created");
    return newCat;
  };

  const updateCategory = (id, data) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data, slug: generateSlug(data.slug || data.name) } : c))
    );
    toast.success("Category updated");
  };

  const deleteCategory = (id) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;

    const referencingArticles = articles.filter(
      (a) => a.category?.toLowerCase() === cat.name?.toLowerCase()
    );

    if (referencingArticles.length > 0) {
      toast.error(
        `Cannot delete: ${referencingArticles.length} articles are currently assigned to ${cat.name}. Reassign them first.`
      );
      return false;
    }

    setCategories((prev) => prev.filter((c) => c.id !== id));
    toast.success("Category deleted");
    return true;
  };

  // ==========================================
  // TAGS OPERATIONS
  // ==========================================

  const createTag = (data) => {
    const newTag = {
      ...data,
      id: "tag-" + Date.now(),
      slug: generateSlug(data.slug || data.name),
      articleCount: 0
    };
    setTags((prev) => [...prev, newTag]);
    toast.success("Tag created");
    return newTag;
  };

  const updateTag = (id, data) => {
    setTags((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...data, slug: generateSlug(data.slug || data.name) } : t))
    );
    toast.success("Tag updated");
  };

  const deleteTag = (id) => {
    setTags((prev) => prev.filter((t) => t.id !== id));
    toast.success("Tag deleted");
  };

  // ==========================================
  // MEDIA LIBRARY OPERATIONS
  // ==========================================

  const addMediaItem = (fileObj) => {
    const newMedia = {
      id: "med-" + Date.now(),
      name: fileObj.name,
      url: fileObj.url,
      size: fileObj.size || "150 KB",
      dimensions: fileObj.dimensions || "1920 x 1080",
      format: fileObj.format || "JPEG",
      uploadedAt: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      uploader: currentAdminUser.name,
      altText: fileObj.altText || fileObj.name
    };
    setMedia((prev) => [newMedia, ...prev]);
    toast.success("Media file added to library");
    return newMedia;
  };

  const deleteMediaItem = (id) => {
    setMedia((prev) => prev.filter((m) => m.id !== id));
    toast.success("Media item removed");
  };

  // ==========================================
  // COMMENTS OPERATIONS
  // ==========================================

  const approveComment = (id) => {
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "Approved" } : c))
    );
    toast.success("Comment approved");
  };

  const rejectComment = (id) => {
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "Rejected" } : c))
    );
    toast.success("Comment rejected");
  };

  const spamComment = (id) => {
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "Spam" } : c))
    );
    toast.success("Marked as spam");
  };

  const deleteComment = (id) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
    toast.success("Comment deleted");
  };

  // ==========================================
  // AUTHORS & TEAM OPERATIONS
  // ==========================================

  const addAuthor = (data) => {
    const newAuthor = {
      ...data,
      id: "auth-" + Date.now(),
      articlesCount: 0,
      status: data.status || "Active",
      joinedDate: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    };
    setAuthors((prev) => [...prev, newAuthor]);
    toast.success("Team member added");
    return newAuthor;
  };

  const updateAuthor = (id, data) => {
    setAuthors((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
    toast.success("Team member updated");
  };

  const deleteAuthor = (id) => {
    setAuthors((prev) => prev.filter((a) => a.id !== id));
    toast.success("Team member removed");
  };

  // ==========================================
  // ADVERTISEMENTS OPERATIONS
  // ==========================================

  const createAdvertisement = (data) => {
    const newAd = {
      ...data,
      id: "ad-" + Date.now(),
      impressions: 0,
      clicks: 0
    };
    setAdvertisements((prev) => [newAd, ...prev]);
    toast.success("Commercial ad campaign created");
    return newAd;
  };

  const updateAdvertisement = (id, data) => {
    setAdvertisements((prev) =>
      prev.map((ad) => (ad.id === id ? { ...ad, ...data } : ad))
    );
    toast.success("Campaign updated");
  };

  const deleteAdvertisement = (id) => {
    setAdvertisements((prev) => prev.filter((ad) => ad.id !== id));
    toast.success("Campaign deleted");
  };

  // ==========================================
  // PAGES & CONTENT OPERATIONS
  // ==========================================

  const updatePage = (id, data) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              ...data,
              lastUpdated: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
            }
          : p
      )
    );
    toast.success("Website page content updated");
  };

  // ==========================================
  // NOTIFICATIONS OPERATIONS
  // ==========================================

  const addNotification = (notif) => {
    const newNotif = {
      id: "notif-" + Date.now(),
      timestamp: "Just now",
      read: false,
      ...notif
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markNotificationAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  };

  const deleteNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast.success("Notification dismissed");
  };

  // ==========================================
  // SETTINGS & PROFILE OPERATIONS
  // ==========================================

  const updateSettings = (section, data) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...data
      }
    }));
    toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} settings updated`);
  };

  const updateAdminProfile = (data) => {
    setCurrentAdminUser((prev) => ({
      ...prev,
      ...data
    }));
    toast.success("Admin profile updated");
  };

  // Aggregated live statistics for the overview dashboard
  const stats = {
    totalArticles: articles.length,
    publishedArticles: articles.filter((a) => a.status === "Published").length,
    draftArticles: articles.filter((a) => a.status === "Draft").length,
    pendingReviews: articles.filter((a) => a.status === "Pending Review").length,
    scheduledArticles: articles.filter((a) => a.status === "Scheduled").length,
    rejectedArticles: articles.filter((a) => a.status === "Rejected").length,
    totalViews: articles.reduce((sum, a) => sum + (Number(a.views) || 0), 0),
    totalComments: comments.length,
    pendingComments: comments.filter((c) => c.status === "Pending").length,
    unreadNotifications: notifications.filter((n) => !n.read).length,
    activeAds: advertisements.filter((a) => a.status === "Active").length
  };

  const value = {
    // Data collections
    articles,
    categories,
    tags,
    authors,
    comments,
    advertisements,
    pages,
    notifications,
    media,
    settings,
    currentAdminUser,
    rolePreview,
    stats,

    // UI state
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
    closeSearch: () => setIsSearchOpen(false),

    // Article actions
    createArticle,
    updateArticle,
    deleteArticle,
    bulkDeleteArticles,
    bulkUpdateArticleStatus,
    duplicateArticle,
    publishArticle,
    unpublishArticle,
    submitForReview,
    updateEditorialStatus,

    // Category actions
    createCategory,
    updateCategory,
    deleteCategory,

    // Tag actions
    createTag,
    updateTag,
    deleteTag,

    // Media actions
    addMediaItem,
    deleteMediaItem,

    // Comment actions
    approveComment,
    rejectComment,
    spamComment,
    deleteComment,

    // Author actions
    addAuthor,
    updateAuthor,
    deleteAuthor,

    // Advertisement actions
    createAdvertisement,
    updateAdvertisement,
    deleteAdvertisement,

    // Pages actions
    updatePage,

    // Notification actions
    addNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,

    // Settings & profile
    updateSettings,
    updateAdminProfile,
    setRolePreview
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
