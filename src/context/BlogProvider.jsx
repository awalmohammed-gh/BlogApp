import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { publicArticleService } from "../services/public/publicArticleService";

const BlogContext = createContext();

export const BlogProvider = ({ children }) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPublishedArticles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await publicArticleService.getArticles({ limit: 50 });
      if (res?.success && Array.isArray(res.data)) {
        const formatted = res.data.map((art) => ({
          _id: art._id,
          title: art.title,
          subTitle: art.subTitle || "",
          slug: art.slug,
          category: art.category?.name || "General News",
          categorySlug: art.category?.slug || "",
          description: art.excerpt || "",
          content: art.content || art.excerpt || "",
          image: art.featuredImage?.url?.trim() ? art.featuredImage.url : "/heroBg.jpg",
          featuredImage: art.featuredImage,
          isPublished: art.status ? art.status === "published" : true,
          isFeatured: art.isFeatured || false,
          isBreaking: art.isBreakingNews || false,
          date: art.publishedAt
            ? new Date(art.publishedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric"
              })
            : "Recently",
          author: art.author?.name || "NewsFront Desk",
          authorRole: art.author?.title || "Accredited Correspondent",
          authorAvatar: art.author?.avatar,
          tags: (art.tags || []).map((t) => (typeof t === "object" ? t.name : t)),
          views: art.views || 0
        }));

        setArticles(formatted);
      } else {
        setArticles([]);
      }
    } catch (err) {
      console.error("[BlogProvider] Error fetching published articles:", err.message);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPublishedArticles();
  }, [fetchPublishedArticles]);

  const blogValue = {
    articles,
    loading,
    refreshArticles: fetchPublishedArticles
  };

  return <BlogContext.Provider value={blogValue}>{children}</BlogContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useBlog = () => useContext(BlogContext);

export default BlogProvider;